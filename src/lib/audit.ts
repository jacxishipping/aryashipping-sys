import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

// Helper function to create audit log (to be used by API routes)
export async function createAuditLog(
  entityType: string,
  entityId: string,
  action: 'CREATE' | 'UPDATE' | 'DELETE',
  performedBy: string,
  changes?: Record<string, unknown>,
  request?: NextRequest
) {
  try {
    const ipAddress = request?.headers.get('x-forwarded-for') || request?.headers.get('x-real-ip') || null;
    const userAgent = request?.headers.get('user-agent') || null;

    await prisma.auditLog.create({
      data: {
        entityType,
        entityId,
        action,
        performedBy,
        changes: changes as never,
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    console.error('Error creating audit log:', error);
    // Don't throw error - audit logging should not break main operations
  }
}
