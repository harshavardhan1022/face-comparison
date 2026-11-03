import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
});

export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const result = profileSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const { name } = result.data;

    // Update Supabase profiles table
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ full_name: name.trim() })
      .eq('id', user.id);

    if (profileError) {
      return NextResponse.json(
        { success: false, message: profileError.message },
        { status: 500 }
      );
    }

    // Also update Supabase Auth user metadata
    await supabase.auth.updateUser({
      data: { full_name: name.trim() },
    });

    // Audit log
    try {
      const adminClient = createAdminClient();
      await adminClient.from('audit_logs').insert({
        actor_id: user.id,
        action: 'PROFILE_UPDATED',
        event_type: 'AUTH',
        severity: 'INFO',
        metadata: { new_name: name.trim() },
      });
    } catch (e) {
      // non-blocking
    }

    return NextResponse.json({
      success: true,
      message: 'Profile name updated successfully.',
      user: {
        id: user.id,
        email: user.email,
        name: name.trim(),
      },
    });
  } catch (err: any) {
    console.error('Update profile API error:', err);
    return NextResponse.json(
      { success: false, message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
