import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getRemoteAiServiceUrl } from '@/lib/face-engine/runner';
import { engineHealth } from '@/lib/face-engine';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { data: roleRow } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['admin', 'super_admin'])
      .maybeSingle();

    if (!roleRow) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const adminClient = createAdminClient();

    // Query real Supabase statistics
    const [
      { count: totalUsers },
      { count: activeUsers },
      { count: suspendedUsers },
      { count: totalComparisons },
      { count: completedComparisons },
      { count: failedComparisons },
      { count: totalJobs },
      { count: queuedJobs },
    ] = await Promise.all([
      adminClient.from('profiles').select('*', { count: 'exact', head: true }),
      adminClient.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      adminClient.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'suspended'),
      adminClient.from('comparisons').select('*', { count: 'exact', head: true }),
      adminClient.from('comparisons').select('*', { count: 'exact', head: true }).eq('processing_status', 'completed'),
      adminClient.from('comparisons').select('*', { count: 'exact', head: true }).eq('processing_status', 'failed'),
      adminClient.from('inference_jobs').select('*', { count: 'exact', head: true }),
      adminClient.from('inference_jobs').select('*', { count: 'exact', head: true }).eq('job_status', 'queued'),
    ]);

    // Check AI microservice health
    let aiServiceStatus = 'operational';
    let aiServiceLatencyMs = 0;
    try {
      const start = Date.now();
      const remoteUrl = getRemoteAiServiceUrl();
      if (remoteUrl) {
        const aiRes = await fetch(`${remoteUrl}/api/v1/health`, { signal: AbortSignal.timeout(2000) });
        if (!aiRes.ok) aiServiceStatus = 'degraded';
      } else {
        // Built-in engine: verify the ONNX models load.
        const health = await engineHealth();
        if (!health.ok) aiServiceStatus = 'offline';
      }
      aiServiceLatencyMs = Date.now() - start;
    } catch {
      aiServiceStatus = 'offline';
    }

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        inactiveUsers: (totalUsers || 0) - (activeUsers || 0),
        suspendedUsers: suspendedUsers || 0,
        totalComparisons: totalComparisons || 0,
        successfulComparisons: completedComparisons || 0,
        failedComparisons: failedComparisons || 0,
        totalJobs: totalJobs || 0,
        pendingJobs: queuedJobs || 0,
        aiService: {
          status: aiServiceStatus,
          latencyMs: aiServiceLatencyMs,
        },
      },
    });
  } catch (err: any) {
    console.error('Admin stats API error:', err);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
