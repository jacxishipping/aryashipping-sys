import { randomUUID } from 'crypto';
import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { routeDeps } from '@/lib/route-deps';
import {
  canManagePartnerPortals,
  canManagePortalMemberships,
  getPartnerPortalMembership,
  getPartnerPortalOrThrow,
} from '@/lib/partner-portals';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_LOGO_SIZE = 2 * 1024 * 1024;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ portalId: string }> },
) {
  try {
    const session = await routeDeps.auth();
    const { portalId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const membership = await getPartnerPortalMembership(portalId, session.user.id);
    const isInternalManager = canManagePartnerPortals(session.user.role);

    if (!isInternalManager && !canManagePortalMemberships(membership?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const portal = await getPartnerPortalOrThrow(portalId);
    if (!portal) {
      return NextResponse.json({ error: 'Partner portal not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No logo file provided' }, { status: 400 });
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Only JPG, PNG, and WebP logos are allowed' }, { status: 400 });
    }

    if (file.size > MAX_LOGO_SIZE) {
      return NextResponse.json({ error: 'Logo file size exceeds the 2MB limit' }, { status: 400 });
    }

    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    if (!blobToken) {
      routeDeps.logger.error('BLOB_READ_WRITE_TOKEN is not configured');
      return NextResponse.json({ error: 'Blob storage is not configured' }, { status: 500 });
    }

    const sanitizedBaseName = file.name?.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9.\-_]/g, '') || 'portal-logo.png';
    const objectKey = `partner-portals/${portalId}/logos/${Date.now()}-${randomUUID()}-${sanitizedBaseName}`;

    const blob = await put(objectKey, file, {
      access: 'public',
      token: blobToken,
      contentType: file.type,
    });

    return NextResponse.json({
      url: blob.url,
      filename: blob.pathname,
    });
  } catch (error) {
    routeDeps.logger.error('Failed to upload portal logo', error);
    return NextResponse.json({ error: 'Failed to upload portal logo' }, { status: 500 });
  }
}