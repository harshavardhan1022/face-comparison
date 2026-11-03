import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = forgotPasswordSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const { email } = result.data;
    const cleanEmail = email.trim().toLowerCase();

    const supabase = await createClient();

    // Determine application origin for secure recovery callback redirect
    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const redirectTo = `${origin}/reset-password`;

    // Trigger Supabase Auth password recovery workflow (PKCE & secure link)
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo,
    });

    if (resetError) {
      console.warn('Supabase resetPasswordForEmail notice:', resetError.message);
    }

    // Security practice: Always return generic success to prevent email enumeration
    try {
      const adminClient = createAdminClient();
      await adminClient.from('audit_logs').insert({
        action: 'PASSWORD_RESET_REQUESTED',
        event_type: 'AUTH',
        severity: 'INFO',
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1',
        user_agent: req.headers.get('user-agent') || 'Browser',
        metadata: { email: cleanEmail },
      });
    } catch (e) {
      // non-blocking
    }

    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email address, a password reset link has been dispatched.',
    });
  } catch (err: any) {
    console.error('Forgot password API Error:', err);
    return NextResponse.json(
      { success: false, message: 'An unexpected error occurred while initiating password reset.' },
      { status: 500 }
    );
  }
}
