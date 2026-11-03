import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// In-memory / dynamic security settings state with defaults
let securityConfig = {
  sessionTimeoutHours: 24,
  auditLogRetentionDays: 90,
  strictAiScreening: true,
  maxConcurrentInferences: 8,
  requireConsentForPhotoRetention: true,
};

export async function GET() {
  const session = await getSession();
  if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.role)) {
    return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({
    success: true,
    settings: securityConfig,
  });
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.role)) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { sessionTimeoutHours, auditLogRetentionDays, strictAiScreening, maxConcurrentInferences } = body;

    if (sessionTimeoutHours !== undefined) {
      securityConfig.sessionTimeoutHours = Math.max(1, Math.min(720, Number(sessionTimeoutHours)));
    }
    if (auditLogRetentionDays !== undefined) {
      securityConfig.auditLogRetentionDays = Math.max(7, Math.min(365, Number(auditLogRetentionDays)));
    }
    if (strictAiScreening !== undefined) {
      securityConfig.strictAiScreening = Boolean(strictAiScreening);
    }
    if (maxConcurrentInferences !== undefined) {
      securityConfig.maxConcurrentInferences = Math.max(1, Math.min(64, Number(maxConcurrentInferences)));
    }

    await prisma.auditLog.create({
      data: {
        userId: session.id,
        action: 'SECURITY_SETTINGS_UPDATED',
        eventType: 'ADMIN',
        severity: 'WARN',
        details: JSON.stringify(securityConfig),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Security settings updated successfully.',
      settings: securityConfig,
    });
  } catch (error) {
    console.error('Security settings update error:', error);
    return NextResponse.json({ success: false, message: 'Failed to update settings' }, { status: 500 });
  }
}

