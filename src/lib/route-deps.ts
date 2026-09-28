import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasAnyPermission, hasPermission } from '@/lib/rbac';
import { recalculateCompanyLedgerBalances } from '@/lib/company-ledger';
import { recalculateUserLedgerBalances } from '@/lib/user-ledger';
import { logger } from '@/lib/logger';
import { createNotifications } from '@/lib/notifications';

export const routeDeps = {
  auth,
  prisma,
  hasPermission,
  hasAnyPermission,
  recalculateCompanyLedgerBalances,
  recalculateUserLedgerBalances,
  logger,
  createNotifications,
};