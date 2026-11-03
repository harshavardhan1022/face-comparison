import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { sendPasswordResetEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Please provide a valid email address.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    // Neutral message preventing account enumeration
    const neutralResponse = {
      success: true,
      message: 'If an account exists for this email, a password-reset link has been dispatched.',
    };

    if (!user) {
      return NextResponse.json(neutralResponse);
    }

    // Invalidate existing unused tokens for this user
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id, usedAt: null },
    });

    // Generate 32-byte cryptographically secure random token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiration

    // Store hash in DB
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    // Dispatch email
    const appBaseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const resetLink = `${appBaseUrl}/reset-password?token=${rawToken}`;

    await sendPasswordResetEmail({
      toEmail: user.email,
      userName: user.name,
      resetLink,
    });

    // Record audit log
    try {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'PASSWORD_RESET_REQUESTED',
          eventType: 'SECURITY',
          severity: 'INFO',
          ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
          userAgent: req.headers.get('user-agent') || 'Unknown',
          details: JSON.stringify({ email: user.email }),
        },
      });
    } catch (e) {
      // Non-blocking
    }

    return NextResponse.json(neutralResponse);
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { success: false, message: 'An internal error occurred while processing your request.' },
      { status: 500 }
    );
  }
}

