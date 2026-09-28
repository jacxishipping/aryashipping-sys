import { canMoveWorkflow, canOverrideClosedStages, canPostExpenses } from '@/lib/rbac';

export function ensureWorkflowMoveAllowed(role: string | null | undefined) {
  return canMoveWorkflow(role) || canOverrideClosedStages(role);
}

export function ensureExpensePostingAllowed(role: string | null | undefined) {
  return canPostExpenses(role) || canOverrideClosedStages(role);
}

export function isClosedStageOverrideAllowed(role: string | null | undefined) {
  return canOverrideClosedStages(role);
}