import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession, verifyPassword, hashPassword, signToken, setAuthCookie } from '@/lib/auth';

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.role)) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
      return NextResponse.json(
        { success: false, message: 'New password must be at least 8 characters with current password provided.' },
        { status: 400 }
      );
    }

    const admin = await prisma.user.findUnique({
      where: { id: session.id },
    });

    if (!admin) {
      return NextResponse.json({ success: false, message: 'Administrator not found' }, { status: 404 });
    }

    const isValid = await verifyPassword(currentPassword, admin.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { success: false, message: 'Incorrect current password.' },
        { status: 400 }
      );
    }

    const newHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: session.id },
      data: { passwordHash: newHash },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.id,
        action: 'ADMIN_PASSWORD_CHANGED',
        eventType: 'SECURITY',
        severity: 'WARNING',
        ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
        userAgent: req.headers.get('user-agent') || 'Unknown',
        details: JSON.stringify({ email: admin.email, role: admin.role }),
      },
    });

    const newToken = signToken({
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role as any,
    });
    await setAuthCookie(newToken, false);

    return NextResponse.json({
      success: true,
      message: 'Administrator password has been successfully updated.',
    });
  } catch (error) {
    console.error('Admin password change error:', error);
    return NextResponse.json({ success: false, message: 'Failed to update admin password' }, { status: 500 });
  }
}

