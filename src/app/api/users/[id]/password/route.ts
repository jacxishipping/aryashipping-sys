import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';

const resetPasswordSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters long').max(128),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id: userId } = await params;
    if (!userId) {
      return NextResponse.json({ message: 'User ID required' }, { status: 400 });
    }

    const canManage =
      session.user?.role === 'admin' ||
      hasPermission(session.user?.role, 'users:manage') ||
      hasPermission(session.user?.role, 'customers:manage');

    if (!canManage) {
      return NextResponse.json({ message: 'Forbidden: Insufficient permissions to reset user password' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = resetPasswordSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const passwordHash = await bcrypt.hash(validatedData.password.trim(), 12);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return NextResponse.json({
      success: true,
      message: `Password for ${user.name || user.email} updated successfully`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: error.issues[0]?.message || 'Invalid password data' },
        { status: 400 }
      );
    }
    console.error('Error resetting user password:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
