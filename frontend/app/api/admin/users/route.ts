import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const { data: roleRow } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['admin', 'super_admin'])
      .maybeSingle();

    if (!roleRow) return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });

    const adminClient = createAdminClient();

    // Fetch auth users from Supabase Auth
    const { data: authUsers, error: authUsersErr } = await adminClient.auth.admin.listUsers();
    if (authUsersErr) throw authUsersErr;

    // Fetch profiles and user_roles
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      adminClient.from('profiles').select('*'),
      adminClient.from('user_roles').select('*'),
    ]);

    const profileMap = new Map((profiles || []).map((p) => [p.id, p]));
    const roleMap = new Map((roles || []).map((r) => [r.user_id, r.role]));

    const users = (authUsers.users || []).map((u) => {
      const p = profileMap.get(u.id);
      const r = roleMap.get(u.id) || 'user';
      return {
        id: u.id,
        email: u.email,
        name: p?.full_name || u.user_metadata?.full_name || u.email?.split('@')[0],
        role: r.toUpperCase(),
        status: (p?.status || 'active').toUpperCase(),
        emailVerified: Boolean(u.email_confirmed_at),
        createdAt: u.created_at,
        lastSignInAt: u.last_sign_in_at,
      };
    });

    return NextResponse.json({ success: true, users });
  } catch (err: any) {
    console.error('Admin users API error:', err);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}

const updateStatusSchema = z.object({
  userId: z.string().uuid(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']),
  role: z.enum(['USER', 'ADMIN', 'SUPER_ADMIN']).optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const { data: callerRoleRow } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['admin', 'super_admin'])
      .maybeSingle();

    if (!callerRoleRow) return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const result = updateStatusSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ success: false, message: result.error.errors[0].message }, { status: 400 });
    }

    const { userId, status, role } = result.data;

    // Self-suspension or demotion prevention
    if (userId === user.id && status === 'SUSPENDED') {
      return NextResponse.json({ success: false, message: 'Cannot suspend your own account.' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Update profile status in Supabase
    await adminClient
      .from('profiles')
      .update({ status: status.toLowerCase() as any })
      .eq('id', userId);

    // Update role if requested
    if (role) {
      if (callerRoleRow.role !== 'super_admin' && role === 'SUPER_ADMIN') {
        return NextResponse.json({ success: false, message: 'Only super administrators can assign SUPER_ADMIN.' }, { status: 403 });
      }

      await adminClient
        .from('user_roles')
        .upsert({
          user_id: userId,
          role: role.toLowerCase() as any,
          assigned_by: user.id,
        });
    }

    // Audit log
    await adminClient.from('audit_logs').insert({
      actor_id: user.id,
      action: 'ADMIN_USER_UPDATED',
      event_type: 'ADMIN',
      severity: 'WARNING',
      target_reference: userId,
      metadata: { new_status: status, new_role: role },
    });

    return NextResponse.json({ success: true, message: 'User updated successfully.' });
  } catch (err: any) {
    console.error('Update user API error:', err);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
