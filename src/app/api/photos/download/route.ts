import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import JSZip from 'jszip';

const ALLOWED_HOSTS = [
  'public.blob.vercel-storage.com',
  'images.pexels.com',
  'images.unsplash.com'
];

function isValidPhotoUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;

    // Check if hostname is exactly in allowed hosts or is a subdomain of vercel-storage
    return ALLOWED_HOSTS.includes(parsed.hostname) || parsed.hostname.endsWith('.public.blob.vercel-storage.com');
  } catch (error) {
    return false;
  }
}

// POST: Download multiple photos as zip
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { photos, filename } = await request.json();

    if (!photos || !Array.isArray(photos) || photos.length === 0) {
      return NextResponse.json(
        { message: 'Photos array is required' },
        { status: 400 }
      );
    }

    const zip = new JSZip();
    const folder = zip.folder(filename || 'photos');

    // Download and add each photo to zip
    for (let i = 0; i < photos.length; i++) {
      try {
        const photoUrl = photos[i];

        // SECURITY FIX: Prevent SSRF by validating the URL
        if (!isValidPhotoUrl(photoUrl)) {
          console.warn(`Skipping invalid photo URL: ${photoUrl}`);
          continue;
        }

        const response = await fetch(photoUrl);
        
        if (response.ok) {
          const blob = await response.blob();
          const arrayBuffer = await blob.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          
          // Extract filename from URL or use index
          const urlParts = photoUrl.split('/');
          const photoFilename = urlParts[urlParts.length - 1] || `photo-${i + 1}.jpg`;
          
          folder?.file(photoFilename, buffer);
        }
      } catch (error) {
        console.error(`Error downloading photo ${i}:`, error);
        // Continue with other photos
      }
    }

    // Generate zip
    const zipContent = await zip.generateAsync({ type: 'arraybuffer' });

    // Return zip file
    return new NextResponse(new Uint8Array(zipContent), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename || 'photos'}.zip"`,
      },
    });
  } catch (error) {
    console.error('Error creating photo zip:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET: Download single photo
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const photoUrl = searchParams.get('url');

    if (!photoUrl) {
      return NextResponse.json(
        { message: 'Photo URL is required' },
        { status: 400 }
      );
    }

    // SECURITY FIX: Prevent SSRF by validating the URL
    if (!isValidPhotoUrl(photoUrl)) {
      return NextResponse.json(
        { message: 'Invalid photo URL domain' },
        { status: 400 }
      );
    }

    // Fetch the photo
    const response = await fetch(photoUrl);
    
    if (!response.ok) {
      return NextResponse.json(
        { message: 'Failed to fetch photo' },
        { status: 404 }
      );
    }

    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract filename
    const urlParts = photoUrl.split('/');
    const filename = urlParts[urlParts.length - 1] || 'photo.jpg';

    // Return photo file
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': response.headers.get('content-type') || 'image/jpeg',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error downloading photo:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

