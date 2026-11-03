import { NextResponse } from 'next/server';
import os from 'os';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ success: false, message: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const tStart = performance.now();
    // Verify database responsiveness
    let dbStatus = 'ONLINE';
    let dbLatencyMs = 0;
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbLatencyMs = Math.round((performance.now() - tStart) * 10) / 10;
    } catch (dbErr) {
      dbStatus = 'DEGRADED';
    }

    // Server Memory & CPU
    const totalMemBytes = os.totalmem();
    const freeMemBytes = os.freemem();
    const usedMemBytes = totalMemBytes - freeMemBytes;
    const memUsagePct = Math.round((usedMemBytes / totalMemBytes) * 100);

    const cpus = os.cpus();
    const cpuCount = cpus.length;
    const cpuModel = cpus[0]?.model || 'Generic CPU';

    // Node.js process memory
    const procMem = process.memoryUsage();

    // Query AI service health
    let aiServiceStatus = 'OFFLINE';
    let aiEngine = 'Unavailable';
    let aiQueue = { active_workers: 0, queue_depth: 0, pending: 0 };
    try {
      const aiRes = await fetch('http://127.0.0.1:8000/api/v1/health', {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
      if (aiRes.ok) {
        const aiData = await aiRes.json();
        aiServiceStatus = aiData.status || 'HEALTHY';
        aiEngine = aiData.ai_engine || 'OpenCV YuNet + SFace';
        if (aiData.queue) {
          aiQueue = aiData.queue;
        }
      }
    } catch (e) {
      aiServiceStatus = 'OFFLINE';
    }

    return NextResponse.json({
      success: true,
      telemetry: {
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.floor(process.uptime()),
        database: {
          status: dbStatus,
          latencyMs: dbLatencyMs,
          engine: 'PostgreSQL / Prisma ORM',
          connectionPool: 'Active (Optimized)',
        },
        aiInference: {
          status: aiServiceStatus,
          engine: aiEngine,
          queue: aiQueue,
          runtime: 'Python 3.12 / ONNX Runtime',
        },
        hostSystem: {
          platform: os.platform(),
          release: os.release(),
          cpuCount,
          cpuModel,
          totalMemoryGB: (totalMemBytes / (1024 ** 3)).toFixed(1),
          usedMemoryGB: (usedMemBytes / (1024 ** 3)).toFixed(1),
          memoryUsagePct: memUsagePct,
        },
        process: {
          heapUsedMB: Math.round(procMem.heapUsed / (1024 * 1024)),
          heapTotalMB: Math.round(procMem.heapTotal / (1024 * 1024)),
          rssMB: Math.round(procMem.rss / (1024 * 1024)),
        },
      },
    });
  } catch (error) {
    console.error('System telemetry error:', error);
    return NextResponse.json({ success: false, message: 'Failed to retrieve telemetry' }, { status: 500 });
  }
}

