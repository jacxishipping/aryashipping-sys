import '@/lib/env-bootstrap';
import { PrismaClient } from '@prisma/client';

// The client is generated with the standard engine, so it connects directly to
// Postgres via a `postgres://` URL. An Accelerate URL (`prisma://` /
// `prisma+postgres://`) is also accepted if one is configured. Prefer the first
// direct Postgres URL, then fall back to any Accelerate URL, then legacy order.
const candidateUrls = [
  process.env.DATABASE_URL,
  process.env.jacxi_DATABASE_URL,
  process.env.jacxi_POSTGRES_URL,
  process.env.jacxi_PRISMA_DATABASE_URL,
];

const isPostgresUrl = (url: string | undefined): url is string =>
  !!url && (url.startsWith('postgres://') || url.startsWith('postgresql://'));

const isAccelerateUrl = (url: string | undefined): url is string =>
  !!url && (url.startsWith('prisma://') || url.startsWith('prisma+postgres://'));

const databaseUrl =
  candidateUrls.find(isPostgresUrl) ??
  candidateUrls.find(isAccelerateUrl) ??
  process.env.DATABASE_URL ??
  process.env.jacxi_PRISMA_DATABASE_URL ??
  process.env.jacxi_DATABASE_URL ??
  process.env.jacxi_POSTGRES_URL;

const prismaClientSingleton = () => {
  return new PrismaClient({
    datasourceUrl: databaseUrl,
  });
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;


const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Database utility class with static methods
export class DB {
  // Use the singleton instance
  private static prisma = prisma;

  // User operations
  static async getUserById(id: string) {
    return await prisma.user.findUnique({
      where: { id },
      include: {
        shipments: true,
        ledgerEntries: true,
      },
    });
  }

  static async getUserByEmail(email: string) {
    return await prisma.user.findUnique({
      where: { email },
    });
  }

  static async createUser(data: {
    email: string;
    name?: string;
  }) {
    return await prisma.user.create({
      data: {
        email: data.email,
        name: data.name || '',
        role: 'user',
      },
    });
  }

  static async updateUser(id: string, data: {
    name?: string;
    email?: string;
    phone?: string;
  }) {
    return await prisma.user.update({
      where: { id },
      data,
    });
  }

  // Shipment operations
  // trackingNumber field no longer exists on Shipment model
  // This method is deprecated
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static async getShipmentByTrackingNumber(_trackingNumber: string) {
    return null;
  }

  static async getShipmentsByUserId(userId: string) {
    return await prisma.shipment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async createShipment(data: Record<string, unknown>) {
    return await prisma.shipment.create({
      data: data as never,
    });
  }

  static async updateShipment(id: string, data: Record<string, unknown>) {
    return await prisma.shipment.update({
      where: { id },
      data: data as never,
    });
  }

  static async deleteShipment(id: string) {
    return await prisma.shipment.delete({
      where: { id },
    });
  }

  // Container operations
  static async getContainerById(id: string) {
    return await prisma.container.findUnique({
      where: { id },
      include: {
        shipments: true,
        invoices: true,
        documents: true,
        expenses: true,
      },
    });
  }

  static async getContainersByUserId(userId: string) {
    return await prisma.container.findMany({
      where: {
        shipments: {
          some: {
            userId,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async createContainer(data: Record<string, unknown>) {
    return await prisma.container.create({
      data: data as never,
    });
  }

  static async updateContainer(id: string, data: Record<string, unknown>) {
    return await prisma.container.update({
      where: { id },
      data: data as never,
    });
  }

  static async deleteContainer(id: string) {
    return await prisma.container.delete({
      where: { id },
    });
  }

  // Ledger operations
  static async getLedgerEntriesByUserId(userId: string) {
    return await prisma.ledgerEntry.findMany({
      where: { userId },
      orderBy: { transactionDate: 'desc' },
    });
  }

  static async createLedgerEntry(data: Record<string, unknown>) {
    return await prisma.ledgerEntry.create({
      data: data as never,
    });
  }

  static async updateLedgerEntry(id: string, data: Record<string, unknown>) {
    return await prisma.ledgerEntry.update({
      where: { id },
      data: data as never,
    });
  }

  static async deleteLedgerEntry(id: string) {
    return await prisma.ledgerEntry.delete({
      where: { id },
    });
  }

  // Audit log operations
  static async createAuditLog(data: Record<string, unknown>) {
    return await prisma.auditLog.create({
      data: data as never,
    });
  }

  static async getAuditLogs(filters: {
    userId?: string;
    entityType?: string;
    action?: string;
    limit?: number;
  }) {
    return await prisma.auditLog.findMany({
      where: {
        performedBy: filters.userId,
        entityType: filters.entityType,
        action: filters.action as never,
      },
      orderBy: { performedAt: 'desc' },
      take: filters.limit || 100,
    });
  }

  // Quote operations
  static async createQuote(data: Record<string, unknown>) {
    return await prisma.quote.create({
      data: data as never,
    });
  }

  static async getQuotesByUserId(userId: string) {
    return await prisma.quote.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Document operations
  static async createDocument(data: Record<string, unknown>) {
    return await prisma.containerDocument.create({
      data: data as never,
    });
  }

  static async getDocumentsByContainerId(containerId: string) {
    return await prisma.containerDocument.findMany({
      where: { containerId },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  static async deleteDocument(id: string) {
    return await prisma.containerDocument.delete({
      where: { id },
    });
  }

  // Expense operations
  static async createExpense(data: Record<string, unknown>) {
    return await prisma.containerExpense.create({
      data: data as never,
    });
  }

  static async getExpensesByContainerId(containerId: string) {
    return await prisma.containerExpense.findMany({
      where: { containerId },
      orderBy: { date: 'desc' },
    });
  }

  static async deleteExpense(id: string) {
    return await prisma.containerExpense.delete({
      where: { id },
    });
  }

  // Invoice operations
  static async createInvoice(data: Record<string, unknown>) {
    return await prisma.containerInvoice.create({
      data: data as never,
    });
  }

  static async getInvoicesByContainerId(containerId: string) {
    return await prisma.containerInvoice.findMany({
      where: { containerId },
      orderBy: { date: 'desc' },
    });
  }

  static async updateInvoice(id: string, data: Record<string, unknown>) {
    return await prisma.containerInvoice.update({
      where: { id },
      data: data as never,
    });
  }

  static async deleteInvoice(id: string) {
    return await prisma.containerInvoice.delete({
      where: { id },
    });
  }

  // Tracking event operations
  static async createTrackingEvent(data: Record<string, unknown>) {
    return await prisma.containerTrackingEvent.create({
      data: data as never,
    });
  }

  static async getTrackingEventsByContainerId(containerId: string) {
    return await prisma.containerTrackingEvent.findMany({
      where: { containerId },
      orderBy: { eventDate: 'desc' },
    });
  }

  // General statistics
  static async getUserStats(userId: string) {
    const [shipmentCount, containerCount, totalExpenses] = await Promise.all([
      prisma.shipment.count({ where: { userId } }),
      prisma.container.count({
        where: {
          shipments: {
            some: { userId },
          },
        },
      }),
      prisma.ledgerEntry.aggregate({
        where: {
          userId,
          type: 'DEBIT',
        },
        _sum: {
          amount: true,
        },
      }),
    ]);

    return {
      shipmentCount,
      containerCount,
      totalExpenses: totalExpenses._sum.amount || 0,
    };
  }

  static async getAdminStats() {
    const [userCount, shipmentCount, containerCount, revenueData] =
      await Promise.all([
        prisma.user.count(),
        prisma.shipment.count(),
        prisma.container.count(),
        prisma.ledgerEntry.aggregate({
          where: {
            type: 'CREDIT',
          },
          _sum: {
            amount: true,
          },
        }),
      ]);

    return {
      userCount,
      shipmentCount,
      containerCount,
      totalRevenue: revenueData._sum.amount || 0,
    };
  }
}
