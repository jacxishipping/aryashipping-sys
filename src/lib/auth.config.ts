import "./env-bootstrap";
import type { NextAuthConfig } from "next-auth";
import { NextResponse } from "next/server";

function getPortalIdFromPath(pathname: string) {
  const match = pathname.match(/^\/portal\/([^/?#]+)/);
  return match?.[1] || null;
}

export const authConfig = {
  pages: {
    signIn: "/auth/signin",
    error: "/auth/signin",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');
      const isOnPortal = nextUrl.pathname.startsWith('/portal');
      const isOnProtected = nextUrl.pathname.startsWith('/api/protected');

      if (isOnPortal) {
        if (isLoggedIn) return true;

        const portalId = getPortalIdFromPath(nextUrl.pathname);
        if (!portalId) {
          return false;
        }

        const signInUrl = new URL('/auth/simple-login', nextUrl);
        signInUrl.searchParams.set('portalId', portalId);
        signInUrl.searchParams.set('callbackUrl', `${nextUrl.pathname}${nextUrl.search}`);
        return NextResponse.redirect(signInUrl);
      }

      if (isOnDashboard || isOnProtected) {
        if (isLoggedIn) return true;
        return false; // Redirect unauthenticated users to login page
      }

      // Allow access to other routes
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        if (user.id) {
          token.id = user.id;
        }
        if (user.role) {
          token.role = String(user.role).trim().toLowerCase();
        }
        if (user.image !== undefined) {
          token.image = user.image;
        }
      }
      // Extend token expiry on each request to keep session alive
      if (trigger === 'update') {
        token.iat = Math.floor(Date.now() / 1000);
        if (typeof session?.image === 'string') {
          token.image = session.image;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        if (typeof token.id === "string") {
          session.user.id = token.id;
        }
        if (typeof token.role === "string") {
          session.user.role = token.role.trim().toLowerCase();
        }
        if (typeof token.image === 'string') {
          session.user.image = token.image;
        }
      }
      return session;
    },
  },
  providers: [],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // Update session every 24 hours
  },
  cookies: {
    sessionToken: {
      name: `${process.env.NODE_ENV === 'production' ? '__Secure-' : ''}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60, // 30 days
      },
    },
  },
  secret: process.env.NEXTAUTH_SECRET ?? process.env.NEXTAUTH_SECRET_2,
} satisfies NextAuthConfig;
