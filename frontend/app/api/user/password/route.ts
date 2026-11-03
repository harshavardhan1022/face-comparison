import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession, verifyPassword, hashPassword, signToken, setAuthCookie } from '@/lib/auth';

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
      return NextResponse.json(
        { success: false, message: 'New password must be at least 8 characters and current password is required.' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.id },
    });

    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    // Verify current password
    const isCurrentValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      return NextResponse.json(
        { success: false, message: 'Incorrect current password. Please try again.' },
        { status: 400 }
      );
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    await prisma.user.update({
      where: { id: session.id },
      data: { passwordHash: newPasswordHash },
    });

    // Record audit log
    await prisma.auditLog.create({
      data: {
        userId: session.id,
        action: 'USER_PASSWORD_CHANGED',
        eventType: 'SECURITY',
        severity: 'INFO',
        ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
        userAgent: req.headers.get('user-agent') || 'Unknown',
        details: JSON.stringify({ email: user.email }),
      },
    });

    // Rotate session token
    const newToken = signToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as any,
    });
    await setAuthCookie(newToken, true);

    return NextResponse.json({
      success: true,
      message: 'Your password has been changed successfully.',
    });
  } catch (error) {
    console.error('Password change error:', error);
    return NextResponse.json({ success: false, message: 'Failed to update password' }, { status: 500 });
  }
}

