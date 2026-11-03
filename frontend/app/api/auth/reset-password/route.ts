import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const resetPasswordSchema = z.object({
  password: z.string().min(8, 'New password must be at least 8 characters long'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = resetPasswordSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const { password } = result.data;

    const supabase = await createClient();

    // Verify session established by Supabase recovery callback
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired password reset link. Please request a new one.' },
        { status: 401 }
      );
    }

    // Update password in Supabase Auth
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      return NextResponse.json(
        { success: false, message: updateError.message },
        { status: 400 }
      );
    }

    // Audit log
    try {
      const adminClient = createAdminClient();
      await adminClient.from('audit_logs').insert({
        actor_id: user.id,
        action: 'PASSWORD_RESET_COMPLETED',
        event_type: 'AUTH',
        severity: 'INFO',
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1',
        user_agent: req.headers.get('user-agent') || 'Browser',
        metadata: { email: user.email },
      });
    } catch (e) {
      // non-blocking
    }

    return NextResponse.json({
      success: true,
      message: 'Your password has been reset successfully. You may now log in.',
    });
  } catch (err: any) {
    console.error('Reset Password API Error:', err);
    return NextResponse.json(
      { success: false, message: 'An unexpected error occurred while resetting your password.' },
      { status: 500 }
    );
  }
}
