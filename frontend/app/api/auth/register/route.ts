import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const registerSchema = z.object({
  name: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  termsAccepted: z.boolean().refine((val) => val === true, {
    message: 'You must accept the terms of service and biometric privacy policy',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = registerSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const { name, email, password } = result.data;
    const cleanEmail = email.trim().toLowerCase();

    const supabase = await createClient();

    // 1. Sign up through Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          full_name: name.trim(),
        },
      },
    });

    if (authError) {
      return NextResponse.json(
        { success: false, message: authError.message },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { success: false, message: 'Registration failed. Please try again.' },
        { status: 500 }
      );
    }

    const userId = authData.user.id;

    // 2. Ensure profile and default 'user' role exist via admin client (if triggers didn't run)
    try {
      const adminClient = createAdminClient();
      await adminClient.from('profiles').upsert({
        id: userId,
        full_name: name.trim(),
        status: 'active',
      });

      await adminClient.from('user_roles').upsert({
        user_id: userId,
        role: 'user',
      });

      await adminClient.from('audit_logs').insert({
        actor_id: userId,
        action: 'USER_REGISTRATION',
        event_type: 'AUTH',
        severity: 'INFO',
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1',
        user_agent: req.headers.get('user-agent') || 'Browser',
        metadata: {
          email: cleanEmail,
          name: name.trim(),
        },
      });
    } catch (dbErr) {
      console.warn('Profile/role sync note:', dbErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Account created successfully! Please check your email if confirmation is required.',
      user: {
        id: userId,
        email: cleanEmail,
        name: name.trim(),
        role: 'USER',
        status: 'ACTIVE',
      },
      redirectTo: '/dashboard',
    });
  } catch (err: any) {
    console.error('Supabase Registration API Error:', err);
    return NextResponse.json(
      { success: false, message: 'An unexpected error occurred during registration.' },
      { status: 500 }
    );
  }
}
