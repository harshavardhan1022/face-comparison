import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.role)) {
    return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
  }

  const admin = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
      lastLoginAt: true,
    },
  });

  return NextResponse.json({ success: true, admin });
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.role)) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const { name } = await req.json();

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json(
        { success: false, message: 'Administrator name must be at least 2 characters.' },
        { status: 400 }
      );
    }

    const updated = await prisma.user.update({
      where: { id: session.id },
      data: { name: name.trim() },
      select: { id: true, name: true, email: true, role: true },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.id,
        action: 'ADMIN_PROFILE_UPDATED',
        eventType: 'ADMIN',
        details: JSON.stringify({ updatedName: updated.name }),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Administrator profile has been updated.',
      admin: updated,
    });
  } catch (error) {
    console.error('Admin profile update error:', error);
    return NextResponse.json({ success: false, message: 'Failed to update admin profile' }, { status: 500 });
  }
}

