import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

const updatePasswordSchema = z.object({
  currentPassword: z.string().optional().or(z.literal('')),
  newPassword: z.string().min(8, 'New password must be at least 8 characters long').max(128),
  confirmPassword: z.string().min(8).max(128),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const payload = updatePasswordSchema.parse(await request.json());

    if (payload.newPassword !== payload.confirmPassword) {
      return NextResponse.json({ message: 'New password and confirmation do not match' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        role: true,
        passwordHash: true,
      },
    });

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const trimmedCurrentPassword = payload.currentPassword?.trim() || '';

    if (trimmedCurrentPassword) {
      if (!user.passwordHash) {
        return NextResponse.json({ message: 'Current password is not available for this account' }, { status: 400 });
      }

      const isCurrentPasswordValid = await bcrypt.compare(trimmedCurrentPassword, user.passwordHash);
      if (!isCurrentPasswordValid) {
        return NextResponse.json({ message: 'Current password is incorrect' }, { status: 400 });
      }
    } else if (user.role !== 'user') {
      return NextResponse.json({ message: 'Current password is required for this account' }, { status: 400 });
    }

    const nextPasswordHash = await bcrypt.hash(payload.newPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: nextPasswordHash },
    });

    return NextResponse.json({ message: 'Password updated successfully' }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.issues[0]?.message || 'Invalid request' }, { status: 400 });
    }

    console.error('Error updating password:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}