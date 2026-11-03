import { NextRequest, NextResponse } from 'next/server';
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

    const { searchParams } = new URL(req.url);
    const eventType = searchParams.get('eventType');
    const severity = searchParams.get('severity');
    const search = searchParams.get('search');
    const format = searchParams.get('format');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const offset = (page - 1) * limit;

    const adminClient = createAdminClient();
    let query = adminClient
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (eventType && eventType !== 'ALL') {
      query = query.eq('event_type', eventType);
    }
    if (severity && severity !== 'ALL') {
      query = query.eq('severity', severity);
    }
    if (search) {
      query = query.or(`action.ilike.%${search}%,target_reference.ilike.%${search}%`);
    }

    if (format === 'csv') {
      const { data: allLogs } = await query.limit(1000);
      const csvHeader = 'ID,ActorID,Action,EventType,Severity,IPAddress,UserAgent,CreatedAt\n';
      const csvRows = (allLogs || [])
        .map((l) =>
          `"${l.id}","${l.actor_id || ''}","${l.action}","${l.event_type}","${l.severity}","${l.ip_address || ''}","${(l.user_agent || '').replace(/"/g, '""')}","${l.created_at}"`
        )
        .join('\n');

      return new NextResponse(csvHeader + csvRows, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="audit_logs_${Date.now()}.csv"`,
        },
      });
    }

    const { data: logs, count, error } = await query.range(offset, offset + limit - 1);
    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: logs || [],
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (err: any) {
    console.error('Audit logs API error:', err);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
