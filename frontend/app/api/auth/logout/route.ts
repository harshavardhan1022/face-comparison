import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      try {
        const adminClient = createAdminClient();
        await adminClient.from('audit_logs').insert({
          actor_id: user.id,
          action: 'USER_LOGOUT',
          event_type: 'AUTH',
          severity: 'INFO',
          ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1',
          user_agent: req.headers.get('user-agent') || 'Browser',
          metadata: {
            email: user.email,
          },
        });
      } catch (e) {
        // non-blocking
      }
    }

    // Sign out from Supabase and clear session cookies
    await supabase.auth.signOut();

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully.',
    });
  } catch (err: any) {
    console.error('Supabase Logout API Error:', err);
    return NextResponse.json(
      { success: false, message: 'Failed to process logout cleanly.' },
      { status: 500 }
    );
  }
}
