import { Prisma } from '@prisma/client';

export type ShipmentWorkflowStage = 'DISPATCHING' | 'SHIPPING' | 'TRANSIT_DELIVERY' | 'DELIVERED';

type WorkflowStageShipment = {
  status?: string | null;
  dispatchId?: string | null;
  containerId?: string | null;
  transitId?: string | null;
};

export const SHIPMENT_WORKFLOW_STAGE_OPTIONS: Array<{
  value: ShipmentWorkflowStage;
  label: string;
}> = [
  { value: 'DISPATCHING', label: 'Dispatching' },
  { value: 'SHIPPING', label: 'Shipping' },
  { value: 'TRANSIT_DELIVERY', label: 'Transit / Delivery' },
  { value: 'DELIVERED', label: 'Delivered' },
];

export function isShipmentWorkflowStage(value: string): value is ShipmentWorkflowStage {
  return SHIPMENT_WORKFLOW_STAGE_OPTIONS.some((option) => option.value === value);
}

export function getShipmentWorkflowStage(shipment: WorkflowStageShipment): ShipmentWorkflowStage {
  if (shipment.status === 'DELIVERED') {
    return 'DELIVERED';
  }

  if (shipment.transitId || shipment.status === 'IN_TRANSIT_TO_DESTINATION') {
    return 'TRANSIT_DELIVERY';
  }

  if (shipment.containerId || shipment.status === 'IN_TRANSIT' || shipment.status === 'RELEASED') {
    return 'SHIPPING';
  }

  return 'DISPATCHING';
}

export function buildShipmentWorkflowStageWhereInput(
  workflowStage: ShipmentWorkflowStage,
): Prisma.ShipmentWhereInput {
  switch (workflowStage) {
    case 'DELIVERED':
      return { status: 'DELIVERED' };
    case 'TRANSIT_DELIVERY':
      return {
        AND: [
          { status: { not: 'DELIVERED' } },
          {
            OR: [{ transitId: { not: null } }, { status: 'IN_TRANSIT_TO_DESTINATION' }],
          },
        ],
      };
    case 'SHIPPING':
      return {
        AND: [
          { status: { not: 'DELIVERED' } },
          { transitId: null },
          {
            OR: [{ containerId: { not: null } }, { status: { in: ['IN_TRANSIT', 'RELEASED'] } }],
          },
        ],
      };
    case 'DISPATCHING':
    default:
      return {
        AND: [
          { status: { in: ['ON_HAND', 'DISPATCHING'] } },
          { containerId: null },
          { transitId: null },
        ],
      };
  }
}