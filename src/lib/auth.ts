import NextAuth from "next-auth";
import { headers as nextHeaders, cookies as nextCookies } from 'next/headers';
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import { authConfig } from "./auth.config";
import {
  authenticateWithEmailPassword,
  authenticateWithLoginCode,
  enforceLoginRateLimit,
  readMobileSessionFromAuthorizationHeader,
  verifyMobileAuthToken,
} from './mobile-auth';

const nextAuth = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        loginCode: { label: "Login Code", type: "text" },
      },
      async authorize(credentials, req) {
        try {
          const allowed = await enforceLoginRateLimit(req?.headers);
          if (!allowed) {
            return null;
          }

          if (credentials?.loginCode) {
            const user = await authenticateWithLoginCode(String(credentials.loginCode));
            if (!user) {
              return null;
            }

            return {
              id: user.id,
              name: user.name,
              email: user.email,
              image: user.image,
              role: user.role,
            };
          }

          if (!credentials?.email) {
            return null;
          }

          const rawInput = String(credentials.email).trim();
          const cleanCode = rawInput.replace(/[\s\-_]/g, '').toUpperCase();

          // If the user entered an 8-character access code in the email field
          if (cleanCode.length === 8) {
            const codeUser = await authenticateWithLoginCode(cleanCode);
            if (codeUser) {
              return {
                id: codeUser.id,
                name: codeUser.name,
                email: codeUser.email,
                image: codeUser.image,
                role: codeUser.role,
              };
            }
          }

          if (!credentials.password) {
            return null;
          }

          const user = await authenticateWithEmailPassword(rawInput, String(credentials.password));
          if (!user) {
            return null;
          }

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
            role: user.role,
          };
        } catch (err) {
          console.error("Credentials authorize error:", err);
          return null;
        }
      },
    }),
  ],
});

const nextAuthAuth = nextAuth.auth;

export const {
  handlers: { GET, POST },
  signIn,
  signOut,
} = nextAuth;

async function getAuthorizationHeader(args: unknown[]): Promise<string | null> {
  const requestLike = args[0] as { headers?: Headers | { get?: (key: string) => string | null } | Record<string, unknown> } | undefined;

  if (requestLike?.headers) {
    if (requestLike.headers instanceof Headers) {
      return requestLike.headers.get('authorization');
    }

    if (typeof requestLike.headers.get === 'function') {
      return requestLike.headers.get('authorization') ?? null;
    }

    const direct = (requestLike.headers as Record<string, unknown>).authorization;
    return typeof direct === 'string' ? direct : null;
  }

  try {
    const headerStore = await nextHeaders();
    return headerStore.get('authorization');
  } catch {
    return null;
  }
}

async function getSessionTokenFromCookies(args: unknown[]): Promise<string | null> {
  const requestLike = args[0] as {
    cookies?: { get?: (key: string) => { value?: string } | string | undefined };
  } | undefined;

  if (requestLike?.cookies && typeof requestLike.cookies.get === 'function') {
    const cookie = requestLike.cookies.get('jacxi_session_token');
    const val = typeof cookie === 'string' ? cookie : cookie?.value;
    if (val) return val;
  }

  try {
    const cookieStore = await nextCookies();
    const cookie = cookieStore.get('jacxi_session_token');
    return cookie?.value ?? null;
  } catch {
    return null;
  }
}

export const auth = (async (...args: Parameters<typeof nextAuthAuth>) => {
  const authorizationHeader = await getAuthorizationHeader(args);
  const mobileSession = await readMobileSessionFromAuthorizationHeader(authorizationHeader);

  if (mobileSession) {
    return mobileSession as unknown as Awaited<ReturnType<typeof nextAuthAuth>>;
  }

  const cookieToken = await getSessionTokenFromCookies(args);
  if (cookieToken) {
    const cookieSession = await verifyMobileAuthToken(cookieToken);
    if (cookieSession) {
      return cookieSession as unknown as Awaited<ReturnType<typeof nextAuthAuth>>;
    }
  }

  return nextAuthAuth(...args);
}) as unknown as typeof nextAuthAuth;
