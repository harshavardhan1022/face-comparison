import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ success: false, message: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim() || '';
    const eventType = searchParams.get('eventType');
    const severity = searchParams.get('severity');
    const format = searchParams.get('format');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(5, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { action: { contains: search } },
        { eventType: { contains: search } },
        { details: { contains: search } },
        { user: { email: { contains: search } } },
      ];
    }

    if (eventType && eventType !== 'ALL') {
      where.eventType = eventType;
    }

    if (severity && severity !== 'ALL') {
      where.severity = severity;
    }

    // If CSV export is requested, retrieve up to 1000 records without pagination
    if (format === 'csv') {
      const logs = await prisma.auditLog.findMany({
        where,
        take: 1000,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { email: true, name: true } } },
      });

      const csvRows = [
        ['Timestamp', 'Action', 'Event Type', 'Severity', 'User Email', 'IP Address', 'Details'].join(','),
      ];

      for (const log of logs) {
        const cleanDetails = (log.details || '').replace(/"/g, '""');
        csvRows.push([
          `"${new Date(log.createdAt).toISOString()}"`,
          `"${log.action}"`,
          `"${log.eventType}"`,
          `"${log.severity}"`,
          `"${log.user?.email || 'SYSTEM'}"`,
          `"${log.ipAddress || '127.0.0.1'}"`,
          `"${cleanDetails}"`,
        ].join(','));
      }

      const csvData = csvRows.join('\n');
      return new NextResponse(csvData, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="audit_logs_${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    const [logs, totalCount] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        take: limit,
        skip,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { email: true, name: true } } },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      logs,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('Audit logs query error:', error);
    return NextResponse.json({ success: false, message: 'Failed to retrieve audit logs' }, { status: 500 });
  }
}

