import { NextRequest, NextResponse } from 'next/server';

const EXPO_LOCAL_ORIGIN_PATTERN = /^http:\/\/(?:localhost|127\.0\.0\.1):(?:808\d|19006)$/;

function isAllowedApiOrigin(origin: string) {
  return EXPO_LOCAL_ORIGIN_PATTERN.test(origin);
}

function buildCorsHeaders(origin: string) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Credentials': 'true',
    Vary: 'Origin',
  };
}

export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (!origin || !isAllowedApiOrigin(origin)) {
    return NextResponse.next();
  }

  const headers = buildCorsHeaders(origin);

  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers,
    });
  }

  const response = NextResponse.next();
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }

  return response;
}

export const config = {
  matcher: ['/api/:path*'],
};