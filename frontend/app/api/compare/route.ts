import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const AI_SERVICE_URL = process.env.AI_SERVICE_INTERNAL_URL || process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';

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

    // Forward to Python AI microservice
    const aiFormData = new FormData();
    aiFormData.append('image1', image1, image1.name || 'photo1.jpg');
    aiFormData.append('image2', image2, image2.name || 'photo2.jpg');
    if (bypassAiScreen) {
      aiFormData.append('bypass_ai_screen', 'true');
    }

    let aiResponse;
    try {
      aiResponse = await fetch(`${AI_SERVICE_URL}/api/v1/compare`, {
        method: 'POST',
        body: aiFormData,
      });
    } catch (networkErr: any) {
      console.error('Failed to reach AI inference service:', networkErr);
      return NextResponse.json(
        {
          success: false,
          message: 'The AI inference microservice is currently unreachable. Please ensure the Python service is running on port 8000.',
        },
        { status: 503 }
      );
    }

    const aiResult = await aiResponse.json();

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
            code: 'AI_GENERATED_DETECTED',
            flaggedImage: errorPayload.flagged_slot || errorPayload.flagged_image || 'image1',
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

    // 1. Insert comparison record into Supabase PostgreSQL
    const { data: comparison, error: compInsertError } = await supabase
      .from('comparisons')
      .insert({
        user_id: user.id,
        similarity_score: aiResult.similarity_score,
        raw_cosine_score: aiResult.raw_cosine_score ?? null,
        similarity_category: aiResult.similarity_category,
        model_version: aiResult.model_version || 'ArcFace-SFace-r100-v2.4',
        processing_status: 'completed',
        image_retention_consent: consentGiven,
        image_quality_status: `${aiResult.image1?.quality?.sharpness > 50 ? 'Optimal' : 'Acceptable'} / ${aiResult.image2?.quality?.sharpness > 50 ? 'Optimal' : 'Acceptable'}`,
        metadata: {
          landmarks: {
            image1: aiResult.image1?.landmarks,
            image2: aiResult.image2?.landmarks,
          },
          bounding_boxes: {
            image1: aiResult.image1?.bounding_box,
            image2: aiResult.image2?.bounding_box,
          },
          inference_time_ms: aiResult.inference_time_ms,
          explanation: aiResult.explanation,
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
        const buffer1 = Buffer.from(await image1.arrayBuffer());
        const buffer2 = Buffer.from(await image2.arrayBuffer());

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

    return NextResponse.json({
      success: true,
      comparisonId: comparison?.id || 'demo_comp_' + Date.now(),
      similarityScore: aiResult.similarity_score,
      rawCosineScore: aiResult.raw_cosine_score,
      similarityCategory: aiResult.similarity_category,
      modelVersion: aiResult.model_version,
      imageQuality: comparison?.image_quality_status || 'Optimal / Optimal',
      explanation: aiResult.explanation,
      inferenceTimeMs: aiResult.inference_time_ms,
      hasRetainedImages: consentGiven && Boolean(photo1SignedUrl || photo2SignedUrl),
      photo1Url: photo1SignedUrl,
      photo2Url: photo2SignedUrl,
    });
  } catch (err: any) {
    console.error('Compare route handler error:', err);
    return NextResponse.json(
      { success: false, message: 'An unexpected internal error occurred during comparison.' },
      { status: 500 }
    );
  }
}
