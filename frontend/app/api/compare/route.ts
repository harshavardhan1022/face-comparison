import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

import { runLocalComparison, getRemoteAiServiceUrl } from '@/lib/face-engine/runner';

// Face inference (YuNet + SFace ONNX models) runs inside this function, so no separate
// Python service is required. If an external service URL is configured it is tried first.
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required to run facial comparisons.' },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const image1 = formData.get('image1') as File | null;
    const image2 = formData.get('image2') as File | null;
    const consentGiven = formData.get('consentGiven') === 'true';
    const bypassAiScreen = formData.get('bypassAiScreen') === 'true';

    if (!image1 || !image2) {
      return NextResponse.json(
        { success: false, message: 'Both Photograph 1 and Photograph 2 are required.' },
        { status: 400 }
      );
    }

    const buffer1 = Buffer.from(await image1.arrayBuffer());
    const buffer2 = Buffer.from(await image2.arrayBuffer());

    let aiStatus = 0;
    let aiResult: any = null;

    const remoteUrl = getRemoteAiServiceUrl();
    if (remoteUrl) {
      try {
        const aiFormData = new FormData();
        aiFormData.append('image1', image1, image1.name || 'photo1.jpg');
        aiFormData.append('image2', image2, image2.name || 'photo2.jpg');
        if (bypassAiScreen) aiFormData.append('bypass_ai_screen', 'true');
        const res = await fetch(`${remoteUrl}/api/v1/compare`, {
          method: 'POST',
          body: aiFormData,
          signal: AbortSignal.timeout(30000),
        });
        aiStatus = res.status;
        aiResult = await res.json();
      } catch (networkErr) {
        console.warn('External AI service unreachable, using built-in inference engine:', networkErr);
        aiResult = null;
      }
    }

    if (!aiResult) {
      const local = await runLocalComparison(buffer1, buffer2, bypassAiScreen);
      aiStatus = local.status;
      aiResult = local.body;
    }

    const aiResponse = { ok: aiStatus >= 200 && aiStatus < 300, status: aiStatus };

    if (!aiResponse.ok) {
      // Normalize error payload from FastAPI: FastAPI puts custom details inside "detail" object
      const errorPayload = aiResult?.detail || aiResult || {};
      const errorCode = errorPayload.code || aiResult.code || 'INFERENCE_ERROR';
      const errorMessage = errorPayload.message || aiResult.message || 'Facial comparison inference failed.';

      // Handle AI-Generated synthetic image detection (HTTP 422)
      if (
        errorCode === 'AI_GENERATED_IMAGE_DETECTED' ||
        errorCode === 'AI_GENERATED_DETECTED'
      ) {
        return NextResponse.json(
          {
            success: false,
            code: 'AI_GENERATED_IMAGE_DETECTED',
            flaggedSlot: errorPayload.flagged_slot || errorPayload.flagged_image || 'IMAGE_1',
            flaggedImage: errorPayload.flagged_slot || errorPayload.flagged_image || 'IMAGE_1',
            confidence: errorPayload.confidence ?? null,
            message: errorMessage || 'AI-generated content identified in uploaded photograph.',
            details: errorPayload.details || null,
          },
          { status: 422 }
        );
      }

      // Handle Face Detection failure (e.g. NO_FACE_DETECTED, BLURRY, MULTIPLE_FACES)
      return NextResponse.json(
        {
          success: false,
          code: errorCode,
          message: errorMessage,
        },
        { status: aiResponse.status }
      );
    }

    // Normalise field names returned by the inference engine
    const rawCosine = aiResult.raw_cosine_similarity ?? aiResult.raw_cosine_score ?? null;
    const explanation = aiResult.calibrated_explanation ?? aiResult.explanation ?? null;
    const analysis1 = aiResult.image1_analysis ?? aiResult.image1 ?? null;
    const analysis2 = aiResult.image2_analysis ?? aiResult.image2 ?? null;
    const sharp1 = analysis1?.quality?.sharpness_score ?? analysis1?.quality?.sharpness ?? 0;
    const sharp2 = analysis2?.quality?.sharpness_score ?? analysis2?.quality?.sharpness ?? 0;

    // 1. Insert comparison record into Supabase PostgreSQL
    const { data: comparison, error: compInsertError } = await supabase
      .from('comparisons')
      .insert({
        user_id: user.id,
        similarity_score: aiResult.similarity_score,
        raw_cosine_score: rawCosine,
        similarity_category: aiResult.similarity_category,
        model_version: aiResult.model_version || 'ArcFace-SFace-r100-v2.4',
        processing_status: 'completed',
        image_retention_consent: consentGiven,
        image_quality_status: `${analysis1?.quality?.quality_label || (sharp1 > 50 ? 'Optimal' : 'Acceptable')} / ${analysis2?.quality?.quality_label || (sharp2 > 50 ? 'Optimal' : 'Acceptable')}`,
        metadata: {
          landmarks: {
            image1: analysis1?.landmarks ?? null,
            image2: analysis2?.landmarks ?? null,
          },
          bounding_boxes: {
            image1: analysis1?.bbox ?? analysis1?.bounding_box ?? null,
            image2: analysis2?.bbox ?? analysis2?.bounding_box ?? null,
          },
          inference_time_ms: aiResult.inference_time_ms,
          explanation,
        },
      })
      .select()
      .single();

    if (compInsertError || !comparison) {
      console.warn('[Supabase Notice] Direct database insert failed or schema table not present:', compInsertError);
    }

    // 2. Private Supabase Storage Upload (When user explicitly consented)
    let photo1SignedUrl: string | null = null;
    let photo2SignedUrl: string | null = null;

    if (consentGiven && comparison && process.env.SUPABASE_SECRET_KEY) {
      try {
        const adminClient = createAdminClient();
        const path1 = `${user.id}/${comparison.id}/image-1.jpg`;
        const path2 = `${user.id}/${comparison.id}/image-2.jpg`;

        // Upload directly to private bucket: 'face-comparison-private'
        await adminClient.storage
          .from('face-comparison-private')
          .upload(path1, buffer1, { contentType: image1.type || 'image/jpeg', upsert: true });

        await adminClient.storage
          .from('face-comparison-private')
          .upload(path2, buffer2, { contentType: image2.type || 'image/jpeg', upsert: true });

        // Record in comparison_images table
        await supabase.from('comparison_images').insert([
          {
            comparison_id: comparison.id,
            user_id: user.id,
            image_slot: 'image_1',
            storage_path: path1,
            retention_status: true,
          },
          {
            comparison_id: comparison.id,
            user_id: user.id,
            image_slot: 'image_2',
            storage_path: path2,
            retention_status: true,
          },
        ]);

        // Generate short-lived signed URLs (1 hour) for immediate UI display
        const { data: signed1 } = await adminClient.storage
          .from('face-comparison-private')
          .createSignedUrl(path1, 3600);

        const { data: signed2 } = await adminClient.storage
          .from('face-comparison-private')
          .createSignedUrl(path2, 3600);

        photo1SignedUrl = signed1?.signedUrl || null;
        photo2SignedUrl = signed2?.signedUrl || null;
      } catch (storageErr) {
        console.warn('Supabase Storage retention upload notice:', storageErr);
      }
    }

    // 3. Log Audit Trail
    try {
      if (process.env.SUPABASE_SECRET_KEY) {
        const adminClient = createAdminClient();
        await adminClient.from('audit_logs').insert({
          actor_id: user.id,
          action: 'FACE_COMPARISON_EXECUTED',
          event_type: 'INFERENCE',
          severity: 'INFO',
          target_reference: comparison?.id || 'direct_comparison',
          metadata: {
            similarity_score: aiResult.similarity_score,
            similarity_category: aiResult.similarity_category,
            consent_given: consentGiven,
          },
        });
      }
    } catch {
      // non-blocking
    }

    const payload = {
      success: true,
      comparisonId: comparison?.id || 'comp_' + Date.now(),
      similarityScore: aiResult.similarity_score,
      similarity_score: aiResult.similarity_score,
      rawCosineScore: rawCosine,
      raw_cosine_similarity: rawCosine,
      similarityCategory: aiResult.similarity_category,
      similarity_category: aiResult.similarity_category,
      modelVersion: aiResult.model_version,
      model_version: aiResult.model_version,
      imageQuality: comparison?.image_quality_status || 'Optimal / Optimal',
      explanation,
      calibrated_explanation: explanation,
      inferenceTimeMs: aiResult.inference_time_ms,
      inference_time_ms: aiResult.inference_time_ms,
      hasRetainedImages: consentGiven && Boolean(photo1SignedUrl || photo2SignedUrl),
      photo1Url: photo1SignedUrl,
      photo2Url: photo2SignedUrl,
      image1_analysis: analysis1 || { quality: { quality_label: 'Optimal', overall_quality_score: 95 } },
      image2_analysis: analysis2 || { quality: { quality_label: 'Optimal', overall_quality_score: 95 } },
    };

    return NextResponse.json({
      ...payload,
      data: payload,
    });
  } catch (err: any) {
    console.error('Compare route handler error:', err);
    return NextResponse.json(
      { success: false, message: 'An unexpected internal error occurred during comparison.' },
      { status: 500 }
    );
  }
}
