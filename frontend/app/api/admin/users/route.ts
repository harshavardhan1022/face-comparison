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
    const search = searchParams.get('search')?.trim().toLowerCase() || '';
    const roleFilter = searchParams.get('role');
    const statusFilter = searchParams.get('status');

    const whereClause: any = {};

    if (search) {
      whereClause.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }

    if (roleFilter && ['USER', 'ADMIN', 'SUPER_ADMIN'].includes(roleFilter)) {
      whereClause.role = roleFilter;
    }

    if (statusFilter && ['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(statusFilter)) {
      whereClause.status = statusFilter;
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        emailVerified: true,
        lastLoginAt: true,
        createdAt: true,
        _count: { select: { comparisons: true } },
      },
    });

    return NextResponse.json({ success: true, users });
  } catch (error) {
    console.error('Admin users fetch error:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ success: false, message: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { userId, status, role } = body;

    if (!userId) {
      return NextResponse.json({ success: false, message: 'Target userId is required' }, { status: 400 });
    }

    // Fetch existing target user
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    // RBAC Protections
    const isActorSuperAdmin = session.role === 'SUPER_ADMIN';
    const isTargetSelf = session.id === targetUser.id;

    // 1. Prevent modifying a SUPER_ADMIN unless actor is also SUPER_ADMIN
    if (targetUser.role === 'SUPER_ADMIN' && !isActorSuperAdmin) {
      return NextResponse.json({
        success: false,
        message: 'Permission denied: Only Super Administrators can modify another Super Administrator.'
      }, { status: 403 });
    }

    // 2. Prevent self-lockout or self-demotion
    if (isTargetSelf) {
      if (status && status !== 'ACTIVE') {
        return NextResponse.json({
          success: false,
          message: 'Safety rule: You cannot suspend or deactivate your own administrative account.'
        }, { status: 400 });
      }
      if (role && role !== session.role) {
        return NextResponse.json({
          success: false,
          message: 'Safety rule: You cannot demote or alter your own administrative role.'
        }, { status: 400 });
      }
    }

    // 3. Prevent non-super-admins from granting SUPER_ADMIN role
    if (role === 'SUPER_ADMIN' && !isActorSuperAdmin) {
      return NextResponse.json({
        success: false,
        message: 'Permission denied: Only Super Administrators can grant Super Administrator role.'
      }, { status: 403 });
    }

    const updateData: any = {};
    const auditActions: string[] = [];

    if (status) {
      if (!['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(status)) {
        return NextResponse.json({ success: false, message: 'Invalid status value' }, { status: 400 });
      }
      updateData.status = status;
      auditActions.push(`USER_STATUS_CHANGE_${targetUser.status}_TO_${status}`);
    }

    if (role) {
      if (!['USER', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
        return NextResponse.json({ success: false, message: 'Invalid role value' }, { status: 400 });
      }
      updateData.role = role;
      auditActions.push(`USER_ROLE_CHANGE_${targetUser.role}_TO_${role}`);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: false, message: 'No valid fields provided for update' }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    // Record Audit Logs
    for (const action of auditActions) {
      await prisma.auditLog.create({
        data: {
          userId: session.id,
          action,
          eventType: 'ADMIN',
          severity: role ? 'WARN' : 'INFO',
          status: 'SUCCESS',
          details: JSON.stringify({
            targetUserId: targetUser.id,
            targetEmail: targetUser.email,
            previousRole: targetUser.role,
            newRole: updated.role,
            previousStatus: targetUser.status,
            newStatus: updated.status,
            actorEmail: session.email,
          }),
        },
      });
    }

    return NextResponse.json({ success: true, user: updated });
  } catch (error) {
    console.error('Admin user update error:', error);
    return NextResponse.json({ success: false, message: 'Failed to update user' }, { status: 500 });
  }
}
