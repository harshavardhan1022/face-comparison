import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const resendSchema = z.object({
  email: z.string().email('Please provide a valid email address'),
});

// In-memory rate-limiter: store last email request timestamp per IP/email
const rateLimitMap = new Map<string, number>();
const COOLDOWN_SECONDS = 120; // 2 minutes — stays well under Supabase's 2/hr free tier limit

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = resendSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const { email } = result.data;
    const cleanEmail = email.trim().toLowerCase();
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
    const rateLimitKey = `${clientIp}_${cleanEmail}`;

    const now = Date.now();
    const lastRequest = rateLimitMap.get(rateLimitKey);

    if (lastRequest && (now - lastRequest) < COOLDOWN_SECONDS * 1000) {
      const remainingSeconds = Math.ceil((COOLDOWN_SECONDS * 1000 - (now - lastRequest)) / 1000);
      return NextResponse.json(
        {
          success: false,
          code: 'RATE_LIMIT_COOLDOWN',
          message: `Please wait ${remainingSeconds} seconds before requesting another verification email.`,
          remainingSeconds,
        },
        { status: 429 }
      );
    }

    // Record request time
    rateLimitMap.set(rateLimitKey, now);

    const supabase = await createClient();

    // Call Supabase resend verification email
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email: cleanEmail,
      options: {
        emailRedirectTo: `${req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login`,
      },
    });

    if (resendError) {
      console.warn('[Supabase Resend Notice]:', resendError.message);
      if (
        resendError.message.toLowerCase().includes('rate limit') ||
        resendError.message.toLowerCase().includes('too many') ||
        resendError.message.toLowerCase().includes('over_email_send_rate_limit')
      ) {
        // Mark a long cooldown so the UI doesn't let them retry immediately
        rateLimitMap.set(rateLimitKey, Date.now() + 1000 * 60 * 58); // block for ~58 more minutes
        return NextResponse.json(
          {
            success: false,
            code: 'SUPABASE_RATE_LIMIT',
            message:
              'Email sending limit reached for this hour. This is a Supabase free-tier limit (2 emails/hr). Please wait 1 hour, or ask support to disable email confirmation so you can sign in immediately.',
            remainingSeconds: 3540, // ~59 min
          },
          { status: 429 }
        );
      }
      return NextResponse.json(
        { success: false, message: resendError.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Verification email resent successfully. Please check your inbox and spam folder.',
      cooldownSeconds: COOLDOWN_SECONDS,
    });
  } catch (err: any) {
    console.error('Resend verification API error:', err);
    return NextResponse.json(
      { success: false, message: 'An unexpected error occurred while resending email.' },
      { status: 500 }
    );
  }
}

