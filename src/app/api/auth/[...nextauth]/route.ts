import { NextRequest, NextResponse } from "next/server";
import { GET as nextAuthGET, POST as nextAuthPOST } from "@/lib/auth";
import { verifyMobileAuthToken, readMobileSessionFromAuthorizationHeader } from "@/lib/mobile-auth";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);

  // If this is a request to /api/auth/session, bridge with Telegram and Mobile sessions
  if (url.pathname.endsWith('/session')) {
    const nextAuthRes = await nextAuthGET(request);
    try {
      const data = await nextAuthRes.clone().json();
      if (data && data.user && (data.user.id || data.user.email)) {
        return nextAuthRes;
      }
    } catch {
      // Fallback if NextAuth session response is empty or unauthenticated
    }

    // 1. Check Authorization Bearer header
    const authHeader = request.headers.get('authorization');
    const mobileSession = await readMobileSessionFromAuthorizationHeader(authHeader);
    if (mobileSession) {
      return NextResponse.json(mobileSession);
    }

    // 2. Check jacxi_session_token cookie from Telegram or Mobile WebApp
    const cookieToken = request.cookies.get('jacxi_session_token')?.value;
    if (cookieToken) {
      const cookieSession = await verifyMobileAuthToken(cookieToken);
      if (cookieSession) {
        return NextResponse.json(cookieSession);
      }
    }

    return nextAuthRes;
  }

  return nextAuthGET(request);
}

export const POST = nextAuthPOST;
