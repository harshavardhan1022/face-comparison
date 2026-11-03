import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ success: false, message: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const [
      totalUsers,
      activeUsers,
      inactiveUsers,
      suspendedUsers,
      totalComparisons,
      consentCount,
      aiDetectedCount,
      recentComparisons,
      recentAuditLogs,
      modelEvaluations,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: 'ACTIVE' } }),
      prisma.user.count({ where: { status: 'INACTIVE' } }),
      prisma.user.count({ where: { status: 'SUSPENDED' } }),
      prisma.comparison.count(),
      prisma.comparison.count({ where: { consentGiven: true } }),
      prisma.comparison.count({ where: { aiDetectionStatus: 'AI_DETECTED' } }),
      prisma.comparison.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { email: true, name: true } } },
      }),
      prisma.auditLog.findMany({
        take: 15,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { email: true } } },
      }),
      prisma.modelEvaluation.findMany({
        take: 5,
        orderBy: { evaluationDate: 'desc' },
      }),
    ]);

    // Average similarity calculation
    const avgScoreResult = await prisma.comparison.aggregate({
      _avg: { similarityScore: true },
    });
    const averageSimilarityScore = avgScoreResult._avg.similarityScore || 0;

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        inactiveUsers,
        suspendedUsers,
        totalComparisons,
        consentCount,
        aiDetectedCount,
        averageSimilarityScore: Math.round(averageSimilarityScore * 10) / 10,
      },
      recentComparisons,
      recentAuditLogs,
      modelEvaluations,
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch admin statistics' }, { status: 500 });
  }
}
