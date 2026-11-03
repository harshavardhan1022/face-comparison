import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const loginSchema = z.object({
  email: z.string().email('Please provide a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean().optional().default(true),
  isAdminPortal: z.boolean().optional().default(false),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = loginSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const { email, password, isAdminPortal } = result.data;
    const cleanEmail = email.trim().toLowerCase();

    // Check configuration upfront
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
      console.error('[Supabase Auth] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
      return NextResponse.json(
        {
          success: false,
          message: 'Authentication service configuration is missing. Please verify Supabase environment variables.',
        },
        { status: 500 }
      );
    }

    let supabase;
    try {
      supabase = await createClient();
    } catch (clientErr: any) {
      console.error('[Supabase Auth] Client creation error:', clientErr.message);
      return NextResponse.json(
        { success: false, message: clientErr.message || 'Unable to connect to authentication service.' },
        { status: 500 }
      );
    }

    // Authenticate with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (authError || !authData.user) {
      let friendlyMessage = 'Invalid email or password combination.';
      if (authError) {
        if (authError.message.toLowerCase().includes('email not confirmed')) {
          friendlyMessage = 'Please verify your email address before logging in.';
        } else if (authError.message.toLowerCase().includes('invalid login credentials')) {
          friendlyMessage = 'Invalid email or password combination.';
        } else if (authError.message.toLowerCase().includes('rate limit')) {
          friendlyMessage = 'Too many failed login attempts. Please wait a few moments and try again.';
        } else {
          friendlyMessage = authError.message;
        }
      }

      return NextResponse.json(
        { success: false, message: friendlyMessage },
        { status: 401 }
      );
    }

    const userId = authData.user.id;

    // Fetch user profile and roles from Supabase database
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (profile && profile.status === 'suspended') {
      await supabase.auth.signOut();
      return NextResponse.json(
        { success: false, message: 'Your account has been suspended. Please contact an administrator.' },
        { status: 403 }
      );
    }

    // Check user roles
    const { data: roleRow } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    const role = roleRow?.role || 'user';

    // Role check for admin login route
    if (isAdminPortal && role !== 'admin' && role !== 'super_admin') {
      await supabase.auth.signOut();
      return NextResponse.json(
        { success: false, message: 'Access denied: You do not have administrative privileges.' },
        { status: 403 }
      );
    }

    // Log login audit event using admin client (graceful fallback)
    try {
      if (process.env.SUPABASE_SECRET_KEY) {
        const adminClient = createAdminClient();
        await adminClient.from('audit_logs').insert({
          actor_id: userId,
          action: isAdminPortal ? 'ADMIN_LOGIN' : 'USER_LOGIN',
          event_type: 'AUTH',
          severity: 'INFO',
          ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1',
          user_agent: req.headers.get('user-agent') || 'Browser',
          metadata: {
            email: cleanEmail,
            role,
            portal: isAdminPortal ? 'admin' : 'user',
          },
        });
      }
    } catch (auditErr) {
      console.warn('[Supabase Auth] Non-fatal audit log notice:', auditErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Login successful.',
      user: {
        id: userId,
        email: cleanEmail,
        name: profile?.full_name || authData.user.user_metadata?.full_name || cleanEmail.split('@')[0],
        role: role.toUpperCase(),
        status: (profile?.status || 'active').toUpperCase(),
      },
      redirectTo: isAdminPortal ? '/admin/dashboard' : '/dashboard',
    });
  } catch (err: any) {
    console.error('Supabase Login API Error:', err);
    return NextResponse.json(
      { success: false, message: err.message || 'An unexpected authentication error occurred.' },
      { status: 500 }
    );
  }
}
