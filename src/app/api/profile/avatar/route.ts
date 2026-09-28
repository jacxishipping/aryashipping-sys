import { randomUUID } from 'crypto';
import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_AVATAR_SIZE = 2 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ message: 'Select an image file' }, { status: 400 });
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json({ message: 'Only JPG, PNG, and WebP images are allowed' }, { status: 400 });
    }

    if (file.size > MAX_AVATAR_SIZE) {
      return NextResponse.json({ message: 'Profile image must be 2MB or smaller' }, { status: 400 });
    }

    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    if (!blobToken) {
      return NextResponse.json({ message: 'Image storage is not configured' }, { status: 500 });
    }

    const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const blob = await put(`profiles/${session.user.id}/avatars/${Date.now()}-${randomUUID()}.${extension}`, file, {
      access: 'public',
      token: blobToken,
      contentType: file.type,
    });

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: { image: blob.url },
      select: { id: true, image: true },
    });

    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    console.error('Error uploading profile image:', error);
    return NextResponse.json({ message: 'Failed to upload profile image' }, { status: 500 });
  }
}