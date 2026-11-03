import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { verifyPassword, signToken, setAuthCookie } from '@/lib/auth';

const loginSchema = z.object({
  email: z.string().email('Please provide a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean().optional().default(true),
  isAdminPortal: z.boolean().optional().default(false),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = loginSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const { email, password, rememberMe, isAdminPortal } = result.data;

    // Normalize email
    const cleanEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid email or password combination.' },
        { status: 401 }
      );
    }

    if (user.status !== 'ACTIVE') {
      return NextResponse.json(
        { success: false, message: 'Your account is suspended. Please contact an administrator.' },
        { status: 403 }
      );
    }

    // Role check for admin login route
    if (isAdminPortal && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Access denied: Administrative privileges required.' },
        { status: 403 }
      );
    }

    const passwordValid = await verifyPassword(password, user.passwordHash);
    if (!passwordValid) {
      return NextResponse.json(
        { success: false, message: 'Invalid email or password combination.' },
        { status: 401 }
      );
    }

    // Update lastLoginAt
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
    } catch (e) {
      // Non-blocking
    }

    // Generate JWT
    const token = signToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as 'USER' | 'ADMIN' | 'SUPER_ADMIN',
    }, rememberMe ? '30d' : '1d');

    // Set HTTP-only Cookie
    await setAuthCookie(token, rememberMe);

    // Record Audit Log
    try {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: isAdminPortal ? 'ADMIN_LOGIN' : 'USER_LOGIN',
          eventType: 'AUTH',
          ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
          userAgent: req.headers.get('user-agent') || 'Unknown',
          details: JSON.stringify({ email: user.email, role: user.role }),
        },
      });
    } catch (auditErr) {
      console.warn('Audit log creation error:', auditErr);
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: 'An internal server error occurred during login.' },
      { status: 500 }
    );
  }
}

