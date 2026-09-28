import type { ContainerExpense, Shipment } from '@prisma/client';

export type AllocationMethod = 'EQUAL' | 'BY_VALUE' | 'BY_WEIGHT' | 'CUSTOM';
type AllocatableShipment = Pick<Shipment, 'id'> & Partial<Pick<Shipment, 'insuranceValue' | 'weight' | 'vehicleYear' | 'vehicleMake' | 'vehicleModel'>>;
type AllocatableExpense = Pick<ContainerExpense, 'amount'>;

/**
 * Allocate container expenses across shipments based on the specified method
 * @param shipments - Array of shipments in the container
 * @param expenses - Array of container expenses
 * @param method - Allocation method to use
 * @returns Object mapping shipment IDs to their allocated expense amount
 */
export function allocateExpenses(
  shipments: AllocatableShipment[],
  expenses: AllocatableExpense[],
  method: AllocationMethod = 'EQUAL'
): Record<string, number> {
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const allocation: Record<string, number> = {};

  if (shipments.length === 0) {
    return allocation;
  }

  switch (method) {
    case 'EQUAL':
      // Divide expenses equally among all shipments
      const perShipment = totalExpenses / shipments.length;
      shipments.forEach(s => {
        allocation[s.id] = perShipment;
      });
      break;

    case 'BY_VALUE':
      // Allocate based on insurance value
      const totalValue = shipments.reduce((sum, s) => sum + (s.insuranceValue || 0), 0);
      if (totalValue === 0) {
        // Fallback to equal if no values are set
        return allocateExpenses(shipments, expenses, 'EQUAL');
      }
      shipments.forEach(s => {
        const percentage = (s.insuranceValue || 0) / totalValue;
        allocation[s.id] = totalExpenses * percentage;
      });
      break;

    case 'BY_WEIGHT':
      // Allocate based on vehicle weight
      const totalWeight = shipments.reduce((sum, s) => sum + (s.weight || 0), 0);
      if (totalWeight === 0) {
        // Fallback to equal if no weights are set
        return allocateExpenses(shipments, expenses, 'EQUAL');
      }
      shipments.forEach(s => {
        const percentage = (s.weight || 0) / totalWeight;
        allocation[s.id] = totalExpenses * percentage;
      });
      break;

    case 'CUSTOM':
      // For custom allocation, we would need additional percentage data
      // For now, fallback to equal
      return allocateExpenses(shipments, expenses, 'EQUAL');
  }

  return allocation;
}

/**
 * Calculate expense allocation summary
 * @param shipments - Array of shipments
 * @param expenses - Array of expenses
 * @param method - Allocation method
 * @returns Summary of allocation with totals and per-shipment breakdown
 */
export function calculateAllocationSummary(
  shipments: AllocatableShipment[],
  expenses: AllocatableExpense[],
  method: AllocationMethod = 'EQUAL'
) {
  const allocation = allocateExpenses(shipments, expenses, method);
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  return {
    method,
    totalExpenses,
    shipmentsCount: shipments.length,
    allocations: Object.entries(allocation).map(([shipmentId, amount]) => {
      const shipment = shipments.find(s => s.id === shipmentId);
      return {
        shipmentId,
        amount,
        percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
        vehicleInfo: shipment ? `${shipment.vehicleYear || ''} ${shipment.vehicleMake || ''} ${shipment.vehicleModel || ''}`.trim() : 'Unknown',
        insuranceValue: shipment?.insuranceValue || 0,
        weight: shipment?.weight || 0,
      };
    }),
  };
}

/**
 * Validate allocation method for a set of shipments
 * @param shipments - Array of shipments
 * @param method - Allocation method to validate
 * @returns Object with valid flag and reason if invalid
 */
export function validateAllocationMethod(
  shipments: AllocatableShipment[],
  method: AllocationMethod
): { valid: boolean; reason?: string } {
  if (shipments.length === 0) {
    return { valid: false, reason: 'No shipments in container' };
  }

  switch (method) {
    case 'EQUAL':
      return { valid: true };

    case 'BY_VALUE':
      const hasValues = shipments.some(s => (s.insuranceValue || 0) > 0);
      if (!hasValues) {
        return { 
          valid: false, 
          reason: 'No insurance values set. BY_VALUE allocation requires at least one shipment with an insurance value.' 
        };
      }
      return { valid: true };

    case 'BY_WEIGHT':
      const hasWeights = shipments.some(s => (s.weight || 0) > 0);
      if (!hasWeights) {
        return { 
          valid: false, 
          reason: 'No weights set. BY_WEIGHT allocation requires at least one shipment with a weight value.' 
        };
      }
      return { valid: true };

    case 'CUSTOM':
      return { valid: true };

    default:
      return { valid: false, reason: 'Unknown allocation method' };
  }
}
