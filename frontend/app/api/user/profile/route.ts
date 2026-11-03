import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      emailVerified: true,
      createdAt: true,
      _count: { select: { comparisons: true } },
    },
  });

  if (!user) {
    return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, user });
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { name } = await req.json();

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json(
        { success: false, message: 'Name must be at least 2 characters.' },
        { status: 400 }
      );
    }

    const updated = await prisma.user.update({
      where: { id: session.id },
      data: { name: name.trim() },
      select: { id: true, name: true, email: true, role: true },
    });

    // Record audit log
    await prisma.auditLog.create({
      data: {
        userId: session.id,
        action: 'USER_PROFILE_UPDATED',
        eventType: 'AUTH',
        details: JSON.stringify({ updatedName: updated.name }),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Your personal details have been updated.',
      user: updated,
    });
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json({ success: false, message: 'Failed to update profile' }, { status: 500 });
  }
}

