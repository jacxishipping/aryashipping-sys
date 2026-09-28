type ShipmentWorkflowState = {
  id: string;
  status: string;
  dispatchId: string | null;
  containerId: string | null;
  transitId: string | null;
};

type WorkflowUpdateInput = {
  status?: string;
  dispatchId?: string | null;
  containerId?: string | null;
};

function getEffectiveDispatchId(
  shipment: ShipmentWorkflowState,
  update: WorkflowUpdateInput,
): string | null {
  if (update.dispatchId === undefined) {
    return shipment.dispatchId;
  }

  return update.dispatchId || null;
}

function getEffectiveContainerId(
  shipment: ShipmentWorkflowState,
  update: WorkflowUpdateInput,
): string | null {
  if (update.containerId === undefined) {
    return shipment.containerId;
  }

  return update.containerId || null;
}

function getEffectiveStatus(
  shipment: ShipmentWorkflowState,
  update: WorkflowUpdateInput,
): string {
  return update.status ?? shipment.status;
}

export function validateManualShipmentWorkflowUpdate(
  shipment: ShipmentWorkflowState,
  update: WorkflowUpdateInput,
): string | null {
  const effectiveDispatchId = getEffectiveDispatchId(shipment, update);
  const effectiveContainerId = getEffectiveContainerId(shipment, update);
  const effectiveStatus = getEffectiveStatus(shipment, update);

  if (shipment.transitId) {
    if (update.dispatchId !== undefined && (update.dispatchId || null) !== shipment.dispatchId) {
      return 'Dispatch assignment cannot be changed while the shipment is assigned to a transit';
    }

    if (update.containerId !== undefined && (update.containerId || null) !== shipment.containerId) {
      return 'Container assignment cannot be changed while the shipment is assigned to a transit';
    }

    if (update.status !== undefined && update.status !== shipment.status) {
      return 'Shipment workflow status is controlled by the transit assignment. Update the transit instead.';
    }

    return null;
  }

  if (shipment.containerId) {
    if (update.dispatchId !== undefined && (update.dispatchId || null) !== shipment.dispatchId) {
      return 'Dispatch assignment cannot be changed while the shipment is assigned to a container';
    }

    if (update.status === 'DISPATCHING') {
      return 'DISPATCHING cannot be set while the shipment is assigned to a container';
    }
  }

  if (effectiveStatus === 'DISPATCHING' && !effectiveDispatchId) {
    return 'Dispatch ID is required for DISPATCHING shipments';
  }

  if (effectiveDispatchId && effectiveContainerId && effectiveStatus === 'DISPATCHING') {
    return 'A shipment cannot remain DISPATCHING after it has been handed off to a container';
  }

  if (effectiveStatus === 'IN_TRANSIT_TO_DESTINATION') {
    return 'IN_TRANSIT_TO_DESTINATION can only be set by assigning the shipment to a transit';
  }

  if (effectiveStatus === 'DISPATCHING') {
    return 'DISPATCHING can only be set by assigning the shipment to a dispatch';
  }

  if ((effectiveStatus === 'IN_TRANSIT' || effectiveStatus === 'RELEASED') && !effectiveContainerId) {
    return 'Container ID is required for IN_TRANSIT or RELEASED shipments';
  }

  return null;
}

export function validateBulkShipmentStatusUpdate(
  shipments: ShipmentWorkflowState[],
  nextStatus: string,
): string | null {
  if (nextStatus === 'DISPATCHING') {
    return 'DISPATCHING can only be set through dispatch assignment';
  }

  if (nextStatus === 'IN_TRANSIT_TO_DESTINATION') {
    return 'IN_TRANSIT_TO_DESTINATION can only be set through transit assignment';
  }

  const transitManagedShipment = shipments.find((shipment) => shipment.transitId);
  if (transitManagedShipment) {
    return 'One or more selected shipments are assigned to a transit. Update the transit instead of manually changing shipment status.';
  }

  if (nextStatus === 'IN_TRANSIT' || nextStatus === 'RELEASED') {
    const shipmentMissingContainer = shipments.find((shipment) => !shipment.containerId);
    if (shipmentMissingContainer) {
      return `Shipment ${shipmentMissingContainer.id} cannot be set to ${nextStatus} without a container assignment`;
    }
  }

  return null;
}

export function validateBulkContainerAssignment(shipments: ShipmentWorkflowState[]): string | null {
  const transitManagedShipment = shipments.find((shipment) => shipment.transitId);
  if (transitManagedShipment) {
    return 'One or more selected shipments are assigned to a transit and cannot be reassigned to a container';
  }

  const dispatchManagedShipment = shipments.find((shipment) => shipment.status === 'DISPATCHING');
  if (dispatchManagedShipment) {
    return 'One or more selected shipments are still in dispatch. Complete the dispatch handoff before assigning a container';
  }

  return null;
}