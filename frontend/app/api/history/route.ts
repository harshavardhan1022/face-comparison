import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10')));
    const offset = (page - 1) * limit;

    // Fetch user comparisons
    const { data: comparisons, count, error: countError } = await supabase
      .from('comparisons')
      .select('*, comparison_images(*)', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (countError) {
      console.error('Supabase history fetch error:', countError);
      return NextResponse.json(
        { success: false, message: 'Failed to retrieve comparison history.' },
        { status: 500 }
      );
    }

    // Generate signed URLs for retained images
    const adminClient = createAdminClient();
    const formattedList = await Promise.all(
      (comparisons || []).map(async (c: any) => {
        let photo1Url: string | null = null;
        let photo2Url: string | null = null;

        if (c.image_retention_consent && c.comparison_images) {
          const img1 = c.comparison_images.find((i: any) => i.image_slot === 'image_1');
          const img2 = c.comparison_images.find((i: any) => i.image_slot === 'image_2');

          if (img1?.storage_path) {
            const { data } = await adminClient.storage
              .from('face-comparison-private')
              .createSignedUrl(img1.storage_path, 3600);
            photo1Url = data?.signedUrl || null;
          }
          if (img2?.storage_path) {
            const { data } = await adminClient.storage
              .from('face-comparison-private')
              .createSignedUrl(img2.storage_path, 3600);
            photo2Url = data?.signedUrl || null;
          }
        }

        return {
          id: c.id,
          similarityScore: c.similarity_score,
          rawCosineScore: c.raw_cosine_score,
          similarityCategory: c.similarity_category,
          modelVersion: c.model_version,
          imageQuality: c.image_quality_status,
          processingStatus: c.processing_status,
          consentGiven: c.image_retention_consent,
          hasRetainedImages: c.image_retention_consent && Boolean(photo1Url || photo2Url),
          photo1Url,
          photo2Url,
          createdAt: c.created_at,
          metadata: c.metadata,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: formattedList,
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (err: any) {
    console.error('History API error:', err);
    return NextResponse.json(
      { success: false, message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const comparisonId = searchParams.get('id');

    if (!comparisonId) {
      return NextResponse.json(
        { success: false, message: 'Comparison ID is required.' },
        { status: 400 }
      );
    }

    // Retrieve images to delete from Supabase storage
    const { data: images } = await supabase
      .from('comparison_images')
      .select('storage_path')
      .eq('comparison_id', comparisonId)
      .eq('user_id', user.id);

    if (images && images.length > 0) {
      const adminClient = createAdminClient();
      const paths = images.map((img) => img.storage_path);
      await adminClient.storage.from('face-comparison-private').remove(paths);
    }

    // Delete comparison record (cascade will remove comparison_images rows)
    const { error: deleteError } = await supabase
      .from('comparisons')
      .delete()
      .eq('id', comparisonId)
      .eq('user_id', user.id);

    if (deleteError) {
      return NextResponse.json(
        { success: false, message: deleteError.message },
        { status: 500 }
      );
    }

    // Audit log
    try {
      const adminClient = createAdminClient();
      await adminClient.from('audit_logs').insert({
        actor_id: user.id,
        action: 'COMPARISON_DELETED',
        event_type: 'SECURITY',
        severity: 'INFO',
        target_reference: comparisonId,
      });
    } catch (e) {
      // non-blocking
    }

    return NextResponse.json({
      success: true,
      message: 'Comparison record and stored photographs deleted successfully.',
    });
  } catch (err: any) {
    console.error('Delete history API error:', err);
    return NextResponse.json(
      { success: false, message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
