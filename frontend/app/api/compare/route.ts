import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

const AI_SERVICE_URL = process.env.AI_SERVICE_INTERNAL_URL || 'http://127.0.0.1:8000';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
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

    // Prepare multipart forward to Python AI service
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

    const aiData = await aiResponse.json();

    // Check for AI-Generated image detection flag
    if (!aiResponse.ok) {
      const detail = aiData.detail;
      if (detail?.code === 'AI_GENERATED_IMAGE_DETECTED') {
        // Log synthetic image event
        await prisma.auditLog.create({
          data: {
            userId: session.id,
            action: 'AI_DETECTION_FLAG',
            eventType: 'INFERENCE',
            severity: 'WARNING',
            status: 'FAILURE',
            details: JSON.stringify({
              flaggedSlot: detail.flagged_slot,
              confidence: detail.confidence,
              note: detail.details,
            }),
          },
        });

        return NextResponse.json(
          {
            success: false,
            code: 'AI_GENERATED_IMAGE_DETECTED',
            message: detail.message,
            flaggedSlot: detail.flagged_slot,
            confidence: detail.confidence,
            details: detail.details,
          },
          { status: 422 }
        );
      }

      const errMsg = detail?.message || aiData.message || 'AI inference failed to process photographs.';
      return NextResponse.json(
        { success: false, message: errMsg, code: detail?.code },
        { status: aiResponse.status || 422 }
      );
    }

    // Quality summary
    const q1 = aiData.image1_analysis?.quality?.quality_label || 'Good';
    const q2 = aiData.image2_analysis?.quality?.quality_label || 'Good';
    const compositeQuality = `${q1} / ${q2}`;

    // Read bytes for optional consent-based private retention
    let photo1DataUrl: string | null = null;
    let photo2DataUrl: string | null = null;

    if (consentGiven) {
      const buffer1 = Buffer.from(await image1.arrayBuffer());
      const buffer2 = Buffer.from(await image2.arrayBuffer());
      photo1DataUrl = `data:${image1.type || 'image/jpeg'};base64,${buffer1.toString('base64')}`;
      photo2DataUrl = `data:${image2.type || 'image/jpeg'};base64,${buffer2.toString('base64')}`;
    }

    // Record comparison in database with Prisma
    const comparisonRecord = await prisma.comparison.create({
      data: {
        userId: session.id,
        similarityScore: aiData.similarity_score,
        rawCosineScore: aiData.raw_cosine_similarity,
        similarityCategory: aiData.similarity_category,
        modelVersion: aiData.model_version,
        imageQuality: compositeQuality,
        processingStatus: 'COMPLETED',
        consentGiven: consentGiven,
        hasRetainedImages: consentGiven,
        aiDetectionStatus: 'AUTHENTIC',
        metadataJson: JSON.stringify({
          image1_analysis: aiData.image1_analysis,
          image2_analysis: aiData.image2_analysis,
          inference_time_ms: aiData.inference_time_ms,
          calibrated_explanation: aiData.calibrated_explanation,
        }),
      },
    });

    // Store private retained images if user opted in
    if (consentGiven && photo1DataUrl && photo2DataUrl) {
      await prisma.comparisonImage.createMany({
        data: [
          {
            comparisonId: comparisonRecord.id,
            userId: session.id,
            slot: 'IMAGE_1',
            storageKey: photo1DataUrl,
            mimeType: image1.type || 'image/jpeg',
          },
          {
            comparisonId: comparisonRecord.id,
            userId: session.id,
            slot: 'IMAGE_2',
            storageKey: photo2DataUrl,
            mimeType: image2.type || 'image/jpeg',
          },
        ],
      });
    }

    // Record audit log
    try {
      await prisma.auditLog.create({
        data: {
          userId: session.id,
          action: 'FACE_COMPARISON',
          eventType: 'INFERENCE',
          severity: 'INFO',
          status: 'SUCCESS',
          ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
          userAgent: req.headers.get('user-agent') || 'Unknown',
          details: JSON.stringify({
            comparisonId: comparisonRecord.id,
            score: aiData.similarity_score,
            category: aiData.similarity_category,
            retained: consentGiven,
            latency_ms: aiData.inference_time_ms,
          }),
        },
      });
    } catch (auditErr) {
      console.warn('Failed to record comparison audit log:', auditErr);
    }

    return NextResponse.json({
      success: true,
      comparisonId: comparisonRecord.id,
      data: {
        ...aiData,
        id: comparisonRecord.id,
        createdAt: comparisonRecord.createdAt,
        consentGiven,
        hasRetainedImages: consentGiven,
        photo1DataUrl: consentGiven ? photo1DataUrl : null,
        photo2DataUrl: consentGiven ? photo2DataUrl : null,
      },
    });
  } catch (error: any) {
    console.error('Comparison API error:', error);
    return NextResponse.json(
      { success: false, message: `An unexpected server error occurred: ${error.message}` },
      { status: 500 }
    );
  }
}
