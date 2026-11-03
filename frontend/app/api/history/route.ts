import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const history = await prisma.comparison.findMany({
      where: { userId: session.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        retainedImages: {
          select: {
            id: true,
            slot: true,
            storageKey: true,
            mimeType: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      history,
    });
  } catch (error) {
    console.error('History fetch error:', error);
    return NextResponse.json({ success: false, message: 'Failed to retrieve history' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const comparisonId = searchParams.get('id');

    if (comparisonId) {
      // Delete single comparison owned by user
      const record = await prisma.comparison.findFirst({
        where: { id: comparisonId, userId: session.id },
      });

      if (!record) {
        return NextResponse.json({ success: false, message: 'Record not found or not owned by user' }, { status: 404 });
      }

      await prisma.comparison.delete({
        where: { id: comparisonId },
      });

      await prisma.auditLog.create({
        data: {
          userId: session.id,
          action: 'COMPARISON_DELETED',
          eventType: 'INFERENCE',
          details: JSON.stringify({ comparisonId }),
        },
      });

      return NextResponse.json({ success: true, message: 'Comparison record and retained images deleted.' });
    } else {
      // Clear entire history for user
      await prisma.comparison.deleteMany({
        where: { userId: session.id },
      });

      await prisma.auditLog.create({
        data: {
          userId: session.id,
          action: 'HISTORY_CLEARED',
          eventType: 'INFERENCE',
          details: JSON.stringify({ userId: session.id }),
        },
      });

      return NextResponse.json({ success: true, message: 'All comparison history cleared.' });
    }
  } catch (error) {
    console.error('History delete error:', error);
    return NextResponse.json({ success: false, message: 'Failed to delete comparison record' }, { status: 500 });
  }
}
