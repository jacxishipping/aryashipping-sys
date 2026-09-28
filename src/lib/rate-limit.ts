import { prisma as defaultPrisma } from "./db";

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;

export async function checkRateLimit(
  identifier: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prisma: any = defaultPrisma
): Promise<{ success: boolean; remaining: number }> {
  try {
    return await prisma.$transaction(async (tx: any) => {
      const now = new Date();

      const existing = await tx.rateLimit.findUnique({
        where: { identifier },
      });

      // If no record exists or the window has expired, start a new window
      if (!existing || existing.expiresAt < now) {
        const newData = {
          count: 1,
          expiresAt: new Date(now.getTime() + RATE_LIMIT_WINDOW_MS),
        };

        await tx.rateLimit.upsert({
          where: { identifier },
          create: {
            identifier,
            ...newData
          },
          update: newData,
        });

        return { success: true, remaining: MAX_ATTEMPTS - 1 };
      }

      // If existing and valid, atomic increment
      const updated = await tx.rateLimit.update({
        where: { identifier },
        data: {
          count: { increment: 1 }
        },
      });

      if (updated.count > MAX_ATTEMPTS) {
        return { success: false, remaining: 0 };
      }

      return { success: true, remaining: MAX_ATTEMPTS - updated.count };
    });
  } catch (error) {
    // If the database is unreachable or any other error occurs, fail open so
    // that a DB outage does not falsely trigger "rate limit exceeded" and block
    // all login attempts (authentication itself also requires the DB).
    console.error("Rate limit error:", error);
    return { success: true, remaining: MAX_ATTEMPTS };
  }
}
