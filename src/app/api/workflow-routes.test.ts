import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import { NextRequest } from 'next/server';
import { routeDeps } from '../../lib/route-deps.ts';
import { POST as postDispatchHandoff } from './dispatches/[id]/handoff/route.ts';
import { POST as postDispatchReceive } from './dispatches/[id]/receive/route.ts';
import { DELETE as deleteDispatchShipment, POST as postDispatchShipment } from './dispatches/[id]/shipments/route.ts';
import { PATCH as patchDispatch } from './dispatches/[id]/route.ts';
import { DELETE as deleteContainerShipment, POST as postContainerShipments } from './containers/[id]/shipments/route.ts';
import { POST as postReleaseToken } from './shipments/[id]/release-token/route.ts';
import { POST as postTransitDeliveryConfirmation } from './transits/[id]/confirm-delivery/route.ts';
import { PATCH as patchTransit } from './transits/[id]/route.ts';
import { DELETE as deleteTransitShipment, POST as postTransitShipment } from './transits/[id]/shipments/route.ts';
import { POST as postLedgerExpense } from './ledger/expense/route.ts';

type CompanyState = {
  id: string;
  name: string;
  code: string | null;
  isActive: boolean;
  companyType: 'SHIPPING' | 'DISPATCH' | 'TRANSIT';
  priceListConfig?: Record<string, unknown>;
  priceLists?: Array<Record<string, unknown>>;
};

type ShipmentState = {
  id: string;
  userId: string;
  status: string;
  dispatchId: string | null;
  containerId: string | null;
  transitId: string | null;
  shippingCompanyId: string | null;
  releaseToken: string | null;
  releaseTokenCreatedAt: Date | null;
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleVIN: string | null;
  purchaseLocation?: string | null;
  price?: number | null;
  priceListPricingSnapshot?: Record<string, unknown> | null;
  createdAt: string;
};

type DispatchState = {
  id: string;
  companyId: string;
  referenceNumber: string;
  origin: string;
  destination: string;
  status: 'PENDING' | 'DISPATCHED' | 'ARRIVED_AT_PORT' | 'COMPLETED' | 'CANCELLED';
};

type ContainerState = {
  id: string;
  companyId: string | null;
  containerNumber: string;
  status: string;
  maxCapacity: number;
  currentCount: number;
  estimatedArrival: Date | null;
};

type TransitState = {
  id: string;
  companyId: string | null;
  referenceNumber: string;
  status: 'PENDING' | 'DISPATCHED' | 'IN_TRANSIT' | 'ARRIVED' | 'DELIVERED' | 'CANCELLED';
  actualDelivery: Date | null;
  deliveryReceiverName: string | null;
  deliveryProofUrl: string | null;
  deliveryProofName: string | null;
  deliveryProofType: string | null;
  deliveryNotes: string | null;
  destination: string;
};

type TransitEventState = {
  id: string;
  transitId: string;
  companyId: string;
  origin: string;
  destination: string;
  status: string;
  location: string | null;
  description: string | null;
  eventDate: Date;
  createdBy: string;
  createdAt: Date;
};

type WorkflowState = {
  users: Record<string, { id: string; name: string; email: string; phone: string | null; role: string }>;
  userSettings: Record<string, { userId: string; notifyShipmentPush: boolean | null }>;
  companies: Record<string, CompanyState>;
  shipments: Record<string, ShipmentState>;
  dispatches: Record<string, DispatchState>;
  containers: Record<string, ContainerState>;
  transits: Record<string, TransitState>;
  dispatchEvents: Array<Record<string, unknown>>;
  transitEvents: TransitEventState[];
  shipmentAuditLogs: Array<Record<string, unknown>>;
  ledgerEntries: Array<Record<string, unknown>>;
  companyLedgerEntries: Array<Record<string, unknown>>;
  containerAuditLogs: Array<Record<string, unknown>>;
  shipmentCharges: Array<Record<string, unknown>>;
  shipmentChargeAuditLogs: Array<Record<string, unknown>>;
};

const originalRouteDepFns = {
  auth: routeDeps.auth,
  hasPermission: routeDeps.hasPermission,
  hasAnyPermission: routeDeps.hasAnyPermission,
  recalculateUserLedgerBalances: routeDeps.recalculateUserLedgerBalances,
  recalculateCompanyLedgerBalances: routeDeps.recalculateCompanyLedgerBalances,
  createNotifications: routeDeps.createNotifications,
  loggerInfo: routeDeps.logger.info,
  loggerError: routeDeps.logger.error,
  prismaTransaction: routeDeps.prisma.$transaction,
  prismaQueryRaw: routeDeps.prisma.$queryRaw,
  prismaExecuteRaw: routeDeps.prisma.$executeRaw,
  dispatchFindUnique: routeDeps.prisma.dispatch.findUnique,
  dispatchUpdate: routeDeps.prisma.dispatch.update,
  companyFindUnique: routeDeps.prisma.company.findUnique,
  shipmentFindUnique: routeDeps.prisma.shipment.findUnique,
  shipmentFindMany: routeDeps.prisma.shipment.findMany,
  shipmentUpdate: routeDeps.prisma.shipment.update,
  shipmentUpdateMany: routeDeps.prisma.shipment.updateMany,
  containerFindUnique: routeDeps.prisma.container.findUnique,
  containerUpdate: routeDeps.prisma.container.update,
  transitFindUnique: routeDeps.prisma.transit.findUnique,
  transitUpdate: routeDeps.prisma.transit.update,
  transitDelete: routeDeps.prisma.transit.delete,
  transitEventCreate: routeDeps.prisma.transitEvent.create,
  dispatchEventCreate: routeDeps.prisma.dispatchEvent.create,
  userFindMany: routeDeps.prisma.user.findMany,
  userSettingsFindMany: routeDeps.prisma.userSettings.findMany,
  shipmentAuditCreateMany: routeDeps.prisma.shipmentAuditLog.createMany,
  containerAuditCreate: routeDeps.prisma.containerAuditLog.create,
  containerAuditCreateMany: routeDeps.prisma.containerAuditLog.createMany,
  ledgerEntryCreate: routeDeps.prisma.ledgerEntry.create,
  companyLedgerEntryCreate: routeDeps.prisma.companyLedgerEntry.create,
  shipmentChargeFindFirst: routeDeps.prisma.shipmentCharge.findFirst,
  shipmentChargeCreate: routeDeps.prisma.shipmentCharge.create,
  shipmentChargeUpdate: routeDeps.prisma.shipmentCharge.update,
  shipmentChargeAuditCreate: routeDeps.prisma.shipmentChargeAuditLog.create,
};

function createState(): WorkflowState {
  return {
    users: {
      'user-1': { id: 'user-1', name: 'Customer One', email: 'customer@example.com', phone: null, role: 'user' },
      'ops-1': { id: 'ops-1', name: 'Operations', email: 'ops@example.com', phone: null, role: 'admin' },
    },
    userSettings: {
      'user-1': { userId: 'user-1', notifyShipmentPush: true },
      'ops-1': { userId: 'ops-1', notifyShipmentPush: true },
    },
    companies: {
      'dispatch-co': { id: 'dispatch-co', name: 'Dispatch Co', code: 'DSP', isActive: true, companyType: 'DISPATCH', priceListConfig: { stateRates: { CA: 1000 } }, priceLists: [] },
      'shipping-co': { id: 'shipping-co', name: 'Shipping Co', code: 'SHP', isActive: true, companyType: 'SHIPPING', priceListConfig: { stateRates: { CA: 1200 } }, priceLists: [] },
      'transit-co': { id: 'transit-co', name: 'Transit Co', code: 'TRN', isActive: true, companyType: 'TRANSIT' },
    },
    shipments: {
      s1: {
        id: 's1',
        userId: 'user-1',
        status: 'ON_HAND',
        dispatchId: null,
        containerId: null,
        transitId: null,
        shippingCompanyId: null,
        releaseToken: null,
        releaseTokenCreatedAt: null,
        vehicleMake: 'Toyota',
        vehicleModel: 'Corolla',
        vehicleVIN: 'VIN-1',
        purchaseLocation: 'CA',
        price: null,
        priceListPricingSnapshot: null,
        createdAt: new Date('2026-04-01T00:00:00.000Z').toISOString(),
      },
      s2: {
        id: 's2',
        userId: 'user-1',
        status: 'ON_HAND',
        dispatchId: null,
        containerId: null,
        transitId: null,
        shippingCompanyId: null,
        releaseToken: null,
        releaseTokenCreatedAt: null,
        vehicleMake: 'Honda',
        vehicleModel: 'Civic',
        vehicleVIN: 'VIN-2',
        purchaseLocation: 'CA',
        price: null,
        priceListPricingSnapshot: null,
        createdAt: new Date('2026-04-02T00:00:00.000Z').toISOString(),
      },
    },
    dispatches: {
      d1: {
        id: 'd1',
        companyId: 'dispatch-co',
        referenceNumber: 'DSP-2026-AAA11',
        origin: 'USA Yard',
        destination: 'Port of Loading',
        status: 'PENDING',
      },
    },
    containers: {
      c1: {
        id: 'c1',
        companyId: 'shipping-co',
        containerNumber: 'CONT-1',
        status: 'CREATED',
        maxCapacity: 4,
        currentCount: 0,
        estimatedArrival: null,
      },
      c2: {
        id: 'c2',
        companyId: 'shipping-co',
        containerNumber: 'CONT-2',
        status: 'CREATED',
        maxCapacity: 4,
        currentCount: 0,
        estimatedArrival: null,
      },
    },
    transits: {
      t1: {
        id: 't1',
        companyId: null,
        referenceNumber: 'TRN-2026-AAA11',
        status: 'PENDING',
        actualDelivery: null,
        deliveryReceiverName: null,
        deliveryProofUrl: null,
        deliveryProofName: null,
        deliveryProofType: null,
        deliveryNotes: null,
        destination: 'Kabul, Afghanistan',
      },
    },
    dispatchEvents: [],
    transitEvents: [
      {
        id: 'te-1',
        transitId: 't1',
        companyId: 'transit-co',
        origin: 'Herat, Afghanistan',
        destination: 'Kabul, Afghanistan',
        status: 'DISPATCHED',
        location: 'Herat, Afghanistan',
        description: 'Initial transit leg',
        eventDate: new Date('2026-04-03T08:00:00.000Z'),
        createdBy: 'admin-1',
        createdAt: new Date('2026-04-03T08:00:00.000Z'),
      },
    ],
    shipmentAuditLogs: [],
    ledgerEntries: [],
    companyLedgerEntries: [],
    containerAuditLogs: [],
    shipmentCharges: [],
    shipmentChargeAuditLogs: [],
  };
}

function getTransitEvents(state: WorkflowState, transitId: string) {
  return state.transitEvents
    .filter((event) => event.transitId === transitId)
    .sort((left, right) => {
      const eventTime = right.eventDate.getTime() - left.eventDate.getTime();
      if (eventTime !== 0) return eventTime;
      return right.createdAt.getTime() - left.createdAt.getTime();
    })
    .map((event) => ({
      ...event,
      company: state.companies[event.companyId],
    }));
}

function buildShipment(state: WorkflowState, shipmentId: string) {
  const shipment = state.shipments[shipmentId];
  if (!shipment) return null;

  const currentTransitEvent = shipment.transitId
    ? getTransitEvents(state, shipment.transitId)[0] ?? null
    : null;

  return {
    ...shipment,
    user: state.users[shipment.userId],
    dispatch: shipment.dispatchId
      ? {
          companyId: state.dispatches[shipment.dispatchId]?.companyId || null,
          referenceNumber: state.dispatches[shipment.dispatchId]?.referenceNumber || null,
        }
      : null,
    container: shipment.containerId
      ? {
          companyId: state.containers[shipment.containerId]?.companyId || null,
          containerNumber: state.containers[shipment.containerId]?.containerNumber || null,
          status: state.containers[shipment.containerId]?.status || null,
        }
      : null,
    transit: shipment.transitId
      ? {
          companyId: currentTransitEvent?.companyId || state.transits[shipment.transitId]?.companyId || null,
          referenceNumber: state.transits[shipment.transitId]?.referenceNumber || null,
          status: state.transits[shipment.transitId]?.status || null,
          events: currentTransitEvent
            ? [
                {
                  companyId: currentTransitEvent.companyId,
                  origin: currentTransitEvent.origin,
                  destination: currentTransitEvent.destination,
                },
              ]
            : [],
        }
      : null,
  };
}

function buildContainer(state: WorkflowState, containerId: string) {
  const container = state.containers[containerId];
  if (!container) return null;

  const shipments = Object.values(state.shipments)
    .filter((shipment) => shipment.containerId === containerId)
    .map((shipment) => buildShipment(state, shipment.id));

  return {
    ...container,
    shipments,
    company: container.companyId ? state.companies[container.companyId] : null,
    _count: {
      shipments: shipments.length,
      expenses: 0,
      invoices: 0,
      documents: 0,
    },
  };
}

function matchesShipmentWhere(shipment: ShipmentState, where: Record<string, unknown> | undefined) {
  if (!where) return true;

  if (typeof where.id === 'string' && shipment.id !== where.id) return false;
  if (typeof where.status === 'string' && shipment.status !== where.status) return false;
  if (Object.hasOwn(where, 'dispatchId') && shipment.dispatchId !== (where.dispatchId as string | null)) return false;
  if (Object.hasOwn(where, 'containerId') && shipment.containerId !== (where.containerId as string | null)) return false;
  if (Object.hasOwn(where, 'transitId') && shipment.transitId !== (where.transitId as string | null)) return false;

  if (where.id && typeof where.id === 'object' && Array.isArray((where.id as { in?: string[] }).in)) {
    if (!(where.id as { in: string[] }).in.includes(shipment.id)) return false;
  }

  return true;
}

function installRouteMocks(state: WorkflowState) {
  let ledgerId = 1;
  let companyLedgerId = 1;
  let shipmentChargeId = 1;
  let shipmentChargeAuditId = 1;

  routeDeps.auth = (async () => ({ user: { id: 'admin-1', role: 'admin' } })) as unknown as typeof routeDeps.auth;
  routeDeps.hasPermission = (() => true) as unknown as typeof routeDeps.hasPermission;
  routeDeps.hasAnyPermission = (() => true) as unknown as typeof routeDeps.hasAnyPermission;
  routeDeps.recalculateUserLedgerBalances = (async () => 0) as unknown as typeof routeDeps.recalculateUserLedgerBalances;
  routeDeps.recalculateCompanyLedgerBalances = (async () => 0) as unknown as typeof routeDeps.recalculateCompanyLedgerBalances;
  routeDeps.createNotifications = (async () => ({ count: 0 })) as unknown as typeof routeDeps.createNotifications;
  routeDeps.logger.info = (() => undefined) as unknown as typeof routeDeps.logger.info;
  routeDeps.logger.error = (() => undefined) as unknown as typeof routeDeps.logger.error;
  routeDeps.prisma.$transaction = (async (callback: (tx: typeof routeDeps.prisma) => Promise<unknown>) => callback(routeDeps.prisma)) as unknown as typeof routeDeps.prisma.$transaction;
  routeDeps.prisma.$queryRaw = (async (sqlObj: { text: string; values: unknown[] } | ReturnType<typeof import('@prisma/client').Prisma.sql>) => {
    const query = sqlObj.text;
    const args = sqlObj.values;

    if (query.includes('COUNT(*)::int AS count')) {
      const token = String(args[0]);
      const count = Object.values(state.shipments).filter((shipment) => shipment.releaseToken === token).length;
      return [{ count }];
    }

    if (query.includes('SELECT "id", "releaseToken", "releaseTokenCreatedAt"')) {
      const shipmentId = String(args[0]);
      const shipment = state.shipments[shipmentId];
      return shipment
        ? [{ id: shipment.id, releaseToken: shipment.releaseToken, releaseTokenCreatedAt: shipment.releaseTokenCreatedAt }]
        : [];
    }

    return [];
  }) as unknown as typeof routeDeps.prisma.$queryRaw;
  routeDeps.prisma.$executeRaw = (async (sqlObj: { text: string; values: unknown[] } | ReturnType<typeof import('@prisma/client').Prisma.sql>) => {
    const args = sqlObj.values;
    const token = String(args[0]);
    const createdAt = args[1] as Date;
    const _updatedAt = args[2] as Date;
    const shipmentId = String(args[3]);
    state.shipments[shipmentId].releaseToken = token;
    state.shipments[shipmentId].releaseTokenCreatedAt = createdAt;
    return 1;
  }) as unknown as typeof routeDeps.prisma.$executeRaw;

  routeDeps.prisma.dispatch.findUnique = (async ({ where, include }: any) => {
    const dispatch = state.dispatches[where.id];
    if (!dispatch) return null;

    return {
      ...dispatch,
      ...(include?.shipments
        ? {
            shipments: Object.values(state.shipments)
              .filter((shipment) => shipment.dispatchId === where.id)
              .map((shipment) => ({
                id: shipment.id,
                userId: shipment.userId,
                status: shipment.status,
                dispatchId: shipment.dispatchId,
                containerId: shipment.containerId,
                transitId: shipment.transitId,
                vehicleYear: null,
                vehicleMake: shipment.vehicleMake,
                vehicleModel: shipment.vehicleModel,
                vehicleVIN: shipment.vehicleVIN,
              })),
          }
        : {}),
    };
  }) as unknown as typeof routeDeps.prisma.dispatch.findUnique;
  routeDeps.prisma.dispatch.update = (async ({ where, data, include }: any) => {
    const dispatch = state.dispatches[where.id];
    Object.assign(dispatch, data);
    return include?.company
      ? { ...dispatch, company: state.companies[dispatch.companyId] }
      : { ...dispatch };
  }) as unknown as typeof routeDeps.prisma.dispatch.update;

  routeDeps.prisma.company.findUnique = (async ({ where }: { where: { id: string } }) => state.companies[where.id] || null) as unknown as typeof routeDeps.prisma.company.findUnique;

  routeDeps.prisma.shipment.findUnique = (async ({ where }: { where: { id: string } }) => buildShipment(state, where.id)) as unknown as typeof routeDeps.prisma.shipment.findUnique;
  routeDeps.prisma.shipment.findMany = (async ({ where }: { where?: Record<string, unknown> }) => {
    return Object.values(state.shipments)
      .filter((shipment) => matchesShipmentWhere(shipment, where))
      .map((shipment) => buildShipment(state, shipment.id));
  }) as unknown as typeof routeDeps.prisma.shipment.findMany;
  routeDeps.prisma.shipment.update = (async ({ where, data, include }: any) => {
    Object.assign(state.shipments[where.id], data);
    return include?.user ? buildShipment(state, where.id) : buildShipment(state, where.id);
  }) as unknown as typeof routeDeps.prisma.shipment.update;
  routeDeps.prisma.shipment.updateMany = (async ({ where, data }: any) => {
    let count = 0;
    for (const shipment of Object.values(state.shipments)) {
      if (!matchesShipmentWhere(shipment, where)) continue;
      Object.assign(shipment, data);
      count += 1;
    }
    return { count };
  }) as unknown as typeof routeDeps.prisma.shipment.updateMany;

  routeDeps.prisma.container.findUnique = (async ({ where }: { where: { id: string } }) => buildContainer(state, where.id)) as unknown as typeof routeDeps.prisma.container.findUnique;
  routeDeps.prisma.container.update = (async ({ where, data }: any) => {
    Object.assign(state.containers[where.id], data);
    return buildContainer(state, where.id);
  }) as unknown as typeof routeDeps.prisma.container.update;

  routeDeps.prisma.transit.findUnique = (async ({ where, include }: any) => {
    const transit = state.transits[where.id];
    if (!transit) return null;

    const transitEvents = getTransitEvents(state, where.id);

    return {
      ...transit,
      ...(include?.shipments
        ? {
            shipments: Object.values(state.shipments)
              .filter((shipment) => shipment.transitId === where.id)
              .map((shipment) => ({
                id: shipment.id,
                userId: shipment.userId,
                transitId: shipment.transitId,
                vehicleYear: null,
                vehicleMake: shipment.vehicleMake,
                vehicleModel: shipment.vehicleModel,
                vehicleVIN: shipment.vehicleVIN,
              })),
          }
        : {}),
      ...(include?.events
        ? {
            events: transitEvents.slice(0, include.events.take ?? transitEvents.length),
          }
        : {}),
    };
  }) as unknown as typeof routeDeps.prisma.transit.findUnique;
  routeDeps.prisma.transit.update = (async ({ where, data, include }: any) => {
    Object.assign(state.transits[where.id], data);
    const transit = state.transits[where.id];

    if (include?.events) {
      const transitEvents = getTransitEvents(state, where.id);
      return {
        ...transit,
        events: transitEvents.slice(0, include.events.take ?? transitEvents.length),
      };
    }

    return { ...transit };
  }) as unknown as typeof routeDeps.prisma.transit.update;
  routeDeps.prisma.transit.delete = (async ({ where }: any) => {
    const transit = state.transits[where.id];
    delete state.transits[where.id];
    return transit;
  }) as unknown as typeof routeDeps.prisma.transit.delete;
  routeDeps.prisma.transitEvent.create = (async ({ data }: any) => {
    const event = {
      id: `te-${state.transitEvents.length + 1}`,
      location: null,
      description: null,
      createdAt: new Date(),
      ...data,
    };
    state.transitEvents.push(event);
    return {
      ...event,
      company: state.companies[event.companyId],
    };
  }) as unknown as typeof routeDeps.prisma.transitEvent.create;
  routeDeps.prisma.user.findMany = (async ({ where, select }: any) => {
    return Object.values(state.users)
      .filter((user) => {
        if (where?.role?.not && user.role === where.role.not) return false;
        if (where?.id?.not && user.id === where.id.not) return false;
        if (where?.id?.in && !where.id.in.includes(user.id)) return false;
        return true;
      })
      .map((user) => {
        if (!select) return user;

        const result: Record<string, unknown> = {};
        for (const key of Object.keys(select)) {
          if (select[key]) {
            result[key] = user[key as keyof typeof user];
          }
        }
        return result;
      });
  }) as unknown as typeof routeDeps.prisma.user.findMany;
  routeDeps.prisma.userSettings.findMany = (async ({ where, select }: any) => {
    return Object.values(state.userSettings)
      .filter((setting) => {
        if (where?.userId?.in && !where.userId.in.includes(setting.userId)) return false;
        return true;
      })
      .map((setting) => {
        if (!select) return setting;

        const result: Record<string, unknown> = {};
        for (const key of Object.keys(select)) {
          if (select[key]) {
            result[key] = setting[key as keyof typeof setting];
          }
        }
        return result;
      });
  }) as unknown as typeof routeDeps.prisma.userSettings.findMany;
  routeDeps.prisma.dispatchEvent.create = (async ({ data }: any) => {
    const event = { id: `de-${state.dispatchEvents.length + 1}`, createdAt: new Date(), ...data };
    state.dispatchEvents.push(event);
    return event;
  }) as unknown as typeof routeDeps.prisma.dispatchEvent.create;
  routeDeps.prisma.shipmentAuditLog.createMany = (async ({ data }: any) => {
    state.shipmentAuditLogs.push(...data);
    return { count: data.length };
  }) as unknown as typeof routeDeps.prisma.shipmentAuditLog.createMany;

  routeDeps.prisma.containerAuditLog.create = (async ({ data }: any) => {
    state.containerAuditLogs.push(data);
    return data;
  }) as unknown as typeof routeDeps.prisma.containerAuditLog.create;
  routeDeps.prisma.containerAuditLog.createMany = (async ({ data }: any) => {
    state.containerAuditLogs.push(...data);
    return { count: data.length };
  }) as unknown as typeof routeDeps.prisma.containerAuditLog.createMany;

  routeDeps.prisma.ledgerEntry.create = (async ({ data }: any) => {
    const entry = { id: `le-${ledgerId++}`, ...data };
    state.ledgerEntries.push(entry);
    return entry;
  }) as unknown as typeof routeDeps.prisma.ledgerEntry.create;
  routeDeps.prisma.companyLedgerEntry.create = (async ({ data }: any) => {
    const entry = { id: `cle-${companyLedgerId++}`, ...data };
    state.companyLedgerEntries.push(entry);
    return entry;
  }) as unknown as typeof routeDeps.prisma.companyLedgerEntry.create;
  routeDeps.prisma.shipmentCharge.findFirst = (async ({ where }: any) => {
    return state.shipmentCharges.find((charge) => (
      (where.shipmentId ? charge.shipmentId === where.shipmentId : true) &&
      charge.sourceType === where.sourceType &&
      charge.sourceId === where.sourceId
    )) || null;
  }) as unknown as typeof routeDeps.prisma.shipmentCharge.findFirst;
  routeDeps.prisma.shipmentCharge.create = (async ({ data }: any) => {
    const charge = { id: `sc-${shipmentChargeId++}`, ...data };
    state.shipmentCharges.push(charge);
    return charge;
  }) as unknown as typeof routeDeps.prisma.shipmentCharge.create;
  routeDeps.prisma.shipmentCharge.update = (async ({ where, data }: any) => {
    const charge = state.shipmentCharges.find((item) => item.id === where.id);
    if (!charge) return null;
    Object.assign(charge, data);
    return charge;
  }) as unknown as typeof routeDeps.prisma.shipmentCharge.update;
  routeDeps.prisma.shipmentChargeAuditLog.create = (async ({ data }: any) => {
    const audit = { id: `sca-${shipmentChargeAuditId++}`, ...data };
    state.shipmentChargeAuditLogs.push(audit);
    return audit;
  }) as unknown as typeof routeDeps.prisma.shipmentChargeAuditLog.create;
}

function request(url: string, method: string, body?: Record<string, unknown>) {
  return new NextRequest(url, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('workflow route integration', () => {
  let state: WorkflowState;

  beforeEach(() => {
    state = createState();
    installRouteMocks(state);
  });

  afterEach(() => {
    routeDeps.auth = originalRouteDepFns.auth;
    routeDeps.hasPermission = originalRouteDepFns.hasPermission;
    routeDeps.hasAnyPermission = originalRouteDepFns.hasAnyPermission;
    routeDeps.recalculateUserLedgerBalances = originalRouteDepFns.recalculateUserLedgerBalances;
    routeDeps.recalculateCompanyLedgerBalances = originalRouteDepFns.recalculateCompanyLedgerBalances;
    routeDeps.createNotifications = originalRouteDepFns.createNotifications;
    routeDeps.logger.info = originalRouteDepFns.loggerInfo;
    routeDeps.logger.error = originalRouteDepFns.loggerError;
    routeDeps.prisma.$transaction = originalRouteDepFns.prismaTransaction;
    routeDeps.prisma.$queryRaw = originalRouteDepFns.prismaQueryRaw;
    routeDeps.prisma.$executeRaw = originalRouteDepFns.prismaExecuteRaw;
    routeDeps.prisma.dispatch.findUnique = originalRouteDepFns.dispatchFindUnique;
    routeDeps.prisma.dispatch.update = originalRouteDepFns.dispatchUpdate;
    routeDeps.prisma.company.findUnique = originalRouteDepFns.companyFindUnique;
    routeDeps.prisma.shipment.findUnique = originalRouteDepFns.shipmentFindUnique;
    routeDeps.prisma.shipment.findMany = originalRouteDepFns.shipmentFindMany;
    routeDeps.prisma.shipment.update = originalRouteDepFns.shipmentUpdate;
    routeDeps.prisma.shipment.updateMany = originalRouteDepFns.shipmentUpdateMany;
    routeDeps.prisma.container.findUnique = originalRouteDepFns.containerFindUnique;
    routeDeps.prisma.container.update = originalRouteDepFns.containerUpdate;
    routeDeps.prisma.transit.findUnique = originalRouteDepFns.transitFindUnique;
    routeDeps.prisma.transit.update = originalRouteDepFns.transitUpdate;
    routeDeps.prisma.transit.delete = originalRouteDepFns.transitDelete;
    routeDeps.prisma.transitEvent.create = originalRouteDepFns.transitEventCreate;
    routeDeps.prisma.dispatchEvent.create = originalRouteDepFns.dispatchEventCreate;
    routeDeps.prisma.user.findMany = originalRouteDepFns.userFindMany;
    routeDeps.prisma.userSettings.findMany = originalRouteDepFns.userSettingsFindMany;
    routeDeps.prisma.shipmentAuditLog.createMany = originalRouteDepFns.shipmentAuditCreateMany;
    routeDeps.prisma.containerAuditLog.create = originalRouteDepFns.containerAuditCreate;
    routeDeps.prisma.containerAuditLog.createMany = originalRouteDepFns.containerAuditCreateMany;
    routeDeps.prisma.ledgerEntry.create = originalRouteDepFns.ledgerEntryCreate;
    routeDeps.prisma.companyLedgerEntry.create = originalRouteDepFns.companyLedgerEntryCreate;
    routeDeps.prisma.shipmentCharge.findFirst = originalRouteDepFns.shipmentChargeFindFirst;
    routeDeps.prisma.shipmentCharge.create = originalRouteDepFns.shipmentChargeCreate;
    routeDeps.prisma.shipmentCharge.update = originalRouteDepFns.shipmentChargeUpdate;
    routeDeps.prisma.shipmentChargeAuditLog.create = originalRouteDepFns.shipmentChargeAuditCreate;
    mock.restoreAll();
  });

  it('assigns an ON_HAND shipment to dispatch via the route handler', async () => {
    const response = await postDispatchShipment(
      request('http://localhost/api/dispatches/d1/shipments', 'POST', { shipmentId: 's1' }),
      { params: Promise.resolve({ id: 'd1' }) },
    );

    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.shipment.dispatchId, 'd1');
    assert.equal(state.shipments.s1.status, 'DISPATCHING');
    assert.equal(state.shipments.s1.price, null);
    assert.equal(state.shipmentCharges.length, 0);
  });

  it('forbids dispatch assignment without workflow permissions', async () => {
    routeDeps.hasPermission = (() => false) as unknown as typeof routeDeps.hasPermission;

    const response = await postDispatchShipment(
      request('http://localhost/api/dispatches/d1/shipments', 'POST', { shipmentId: 's1' }),
      { params: Promise.resolve({ id: 'd1' }) },
    );
    const body = await response.json();

    assert.equal(response.status, 403);
    assert.equal(body.error, 'Forbidden');
  });

  it('blocks adding a shipment to a closed dispatch', async () => {
    state.dispatches.d1.status = 'COMPLETED';
    routeDeps.auth = (async () => ({ user: { id: 'manager-1', role: 'manager' } })) as unknown as typeof routeDeps.auth;

    const response = await postDispatchShipment(
      request('http://localhost/api/dispatches/d1/shipments', 'POST', { shipmentId: 's1' }),
      { params: Promise.resolve({ id: 'd1' }) },
    );
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error, 'Cannot add shipments to a completed or cancelled dispatch');
    assert.equal(state.shipments.s1.dispatchId, null);
    assert.equal(state.shipments.s1.status, 'ON_HAND');
  });

  it('forbids dispatch removal without workflow permissions', async () => {
    state.shipments.s1.dispatchId = 'd1';
    state.shipments.s1.status = 'DISPATCHING';
    routeDeps.hasPermission = (() => false) as unknown as typeof routeDeps.hasPermission;

    const response = await deleteDispatchShipment(
      request('http://localhost/api/dispatches/d1/shipments?shipmentId=s1', 'DELETE'),
      { params: Promise.resolve({ id: 'd1' }) },
    );
    const body = await response.json();

    assert.equal(response.status, 403);
    assert.equal(body.error, 'Forbidden');
    assert.equal(state.shipments.s1.dispatchId, 'd1');
  });

  it('releases a dispatched shipment at handoff and then allows container assignment', async () => {
    await postDispatchShipment(
      request('http://localhost/api/dispatches/d1/shipments', 'POST', { shipmentId: 's1' }),
      { params: Promise.resolve({ id: 'd1' }) },
    );

    const handoffResponse = await patchDispatch(
      request('http://localhost/api/dispatches/d1', 'PATCH', { status: 'ARRIVED_AT_PORT' }),
      { params: Promise.resolve({ id: 'd1' }) },
    );

    assert.equal(handoffResponse.status, 200);
    assert.equal(state.shipments.s1.dispatchId, null);
    assert.equal(state.shipments.s1.status, 'ON_HAND');

    const containerResponse = await postContainerShipments(
      request('http://localhost/api/containers/c1/shipments', 'POST', { shipmentIds: ['s1'] }),
      { params: Promise.resolve({ id: 'c1' }) },
    );
    const containerBody = await containerResponse.json();

    assert.equal(containerResponse.status, 200);
    assert.equal(containerBody.count, 1);
    assert.equal(state.shipments.s1.containerId, 'c1');
    assert.equal(state.shipments.s1.status, 'IN_TRANSIT');
    assert.equal(state.containers.c1.currentCount, 1);
  });

  it('hands off dispatch shipments to a container and records audit trail', async () => {
    state.shipments.s1.dispatchId = 'd1';
    state.shipments.s1.status = 'DISPATCHING';
    state.dispatches.d1.status = 'DISPATCHED';

    const response = await postDispatchHandoff(
      request('http://localhost/api/dispatches/d1/handoff', 'POST', { containerId: 'c1', shipmentIds: ['s1'] }),
      { params: Promise.resolve({ id: 'd1' }) },
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.handoff.containerId, 'c1');
    assert.equal(body.handoff.shipmentCount, 1);
    assert.equal(state.shipments.s1.dispatchId, null);
    assert.equal(state.shipments.s1.containerId, 'c1');
    assert.equal(state.shipments.s1.status, 'IN_TRANSIT');
    assert.equal(state.shipments.s1.shippingCompanyId, 'shipping-co');
    assert.equal(state.containers.c1.currentCount, 1);
    assert.equal(state.dispatches.d1.status, 'COMPLETED');
    assert.equal(state.dispatchEvents.length, 1);
    assert.equal(state.containerAuditLogs.length, 1);
    assert.equal(state.shipmentAuditLogs.length, 1);
    assert.equal(state.shipments.s1.price, 1200);
    assert.equal(state.shipmentCharges.length, 2);
    assert.deepEqual(
      state.shipmentCharges.map((charge) => [charge.chargeCode, charge.totalAmount]),
      [
        ['PRICE_LIST_DISPATCH', 360],
        ['PRICE_LIST_SHIPPING', 840],
      ],
    );
  });

  it('supports split handoff across multiple containers with separate audit records', async () => {
    state.shipments.s1.dispatchId = 'd1';
    state.shipments.s1.status = 'DISPATCHING';
    state.shipments.s2.dispatchId = 'd1';
    state.shipments.s2.status = 'DISPATCHING';
    state.dispatches.d1.status = 'DISPATCHED';

    const firstResponse = await postDispatchHandoff(
      request('http://localhost/api/dispatches/d1/handoff', 'POST', { containerId: 'c1', shipmentIds: ['s1'] }),
      { params: Promise.resolve({ id: 'd1' }) },
    );
    const firstBody = await firstResponse.json();

    assert.equal(firstResponse.status, 200);
    assert.equal(firstBody.handoff.shipmentCount, 1);
    assert.equal(firstBody.handoff.remainingDispatchShipmentCount, 1);
    assert.equal(state.shipments.s1.containerId, 'c1');
    assert.equal(state.shipments.s2.dispatchId, 'd1');
    assert.equal(state.dispatches.d1.status, 'ARRIVED_AT_PORT');
    assert.equal(state.dispatchEvents.length, 1);
    assert.equal(state.containerAuditLogs.length, 1);
    assert.equal(state.shipmentAuditLogs.length, 1);

    const secondResponse = await postDispatchHandoff(
      request('http://localhost/api/dispatches/d1/handoff', 'POST', { containerId: 'c2', shipmentIds: ['s2'] }),
      { params: Promise.resolve({ id: 'd1' }) },
    );
    const secondBody = await secondResponse.json();

    assert.equal(secondResponse.status, 200);
    assert.equal(secondBody.handoff.shipmentCount, 1);
    assert.equal(secondBody.handoff.remainingDispatchShipmentCount, 0);
    assert.equal(state.shipments.s2.containerId, 'c2');
    assert.equal(state.dispatches.d1.status, 'COMPLETED');
    assert.equal(state.dispatchEvents.length, 2);
    assert.equal(state.containerAuditLogs.length, 2);
    assert.equal(state.shipmentAuditLogs.length, 2);
  });

  it('receives dispatch shipments to yard and leaves them ON_HAND for later container assignment', async () => {
    state.shipments.s1.dispatchId = 'd1';
    state.shipments.s1.status = 'DISPATCHING';
    state.shipments.s2.dispatchId = 'd1';
    state.shipments.s2.status = 'DISPATCHING';
    state.dispatches.d1.status = 'DISPATCHED';

    const response = await postDispatchReceive(
      request('http://localhost/api/dispatches/d1/receive', 'POST'),
      { params: Promise.resolve({ id: 'd1' }) },
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.receipt.shipmentCount, 2);
    assert.equal(state.dispatches.d1.status, 'COMPLETED');
    assert.equal(state.shipments.s1.dispatchId, null);
    assert.equal(state.shipments.s2.dispatchId, null);
    assert.equal(state.shipments.s1.status, 'ON_HAND');
    assert.equal(state.shipments.s2.status, 'ON_HAND');
    assert.equal(state.dispatchEvents.length, 1);
    assert.equal(state.shipmentAuditLogs.length, 2);
  });

  it('forbids receiving a dispatch to yard without permissions', async () => {
    state.shipments.s1.dispatchId = 'd1';
    state.shipments.s1.status = 'DISPATCHING';
    routeDeps.hasPermission = (() => false) as unknown as typeof routeDeps.hasPermission;

    const response = await postDispatchReceive(
      request('http://localhost/api/dispatches/d1/receive', 'POST'),
      { params: Promise.resolve({ id: 'd1' }) },
    );
    const body = await response.json();

    assert.equal(response.status, 403);
    assert.equal(body.error, 'Forbidden');
    assert.equal(state.shipments.s1.dispatchId, 'd1');
  });

  it('forbids dispatch handoff without workflow permissions', async () => {
    state.shipments.s1.dispatchId = 'd1';
    state.shipments.s1.status = 'DISPATCHING';
    routeDeps.hasPermission = (() => false) as unknown as typeof routeDeps.hasPermission;

    const response = await postDispatchHandoff(
      request('http://localhost/api/dispatches/d1/handoff', 'POST', { containerId: 'c1', shipmentIds: ['s1'] }),
      { params: Promise.resolve({ id: 'd1' }) },
    );
    const body = await response.json();

    assert.equal(response.status, 403);
    assert.equal(body.error, 'Forbidden');
    assert.equal(state.shipments.s1.dispatchId, 'd1');
    assert.equal(state.containers.c1.currentCount, 0);
  });

  it('rejects partial handoff when any selected shipment is not in the dispatch workflow', async () => {
    state.shipments.s1.dispatchId = 'd1';
    state.shipments.s1.status = 'DISPATCHING';
    state.shipments.s2.status = 'ON_HAND';

    const response = await postDispatchHandoff(
      request('http://localhost/api/dispatches/d1/handoff', 'POST', { containerId: 'c1', shipmentIds: ['s1', 's2'] }),
      { params: Promise.resolve({ id: 'd1' }) },
    );
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error, 'One or more selected shipments are not assigned to this dispatch');
    assert.equal(state.shipments.s1.containerId, null);
    assert.equal(state.shipments.s2.containerId, null);
  });

  it('forbids container assignment without workflow permissions', async () => {
    routeDeps.hasPermission = (() => false) as unknown as typeof routeDeps.hasPermission;

    const response = await postContainerShipments(
      request('http://localhost/api/containers/c1/shipments', 'POST', { shipmentIds: ['s1'] }),
      { params: Promise.resolve({ id: 'c1' }) },
    );
    const body = await response.json();

    assert.equal(response.status, 403);
    assert.equal(body.error, 'Forbidden');
  });

  it('blocks container assignment when capacity would be exceeded', async () => {
    state.containers.c1.maxCapacity = 0;

    const response = await postContainerShipments(
      request('http://localhost/api/containers/c1/shipments', 'POST', { shipmentIds: ['s1'] }),
      { params: Promise.resolve({ id: 'c1' }) },
    );
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.match(body.error, /Container capacity exceeded/);
    assert.equal(state.shipments.s1.containerId, null);
    assert.equal(state.shipments.s1.status, 'ON_HAND');
  });

  it('forbids container removal without workflow permissions', async () => {
    state.shipments.s1.containerId = 'c1';
    state.shipments.s1.status = 'IN_TRANSIT';
    state.containers.c1.currentCount = 1;
    routeDeps.hasPermission = (() => false) as unknown as typeof routeDeps.hasPermission;

    const response = await deleteContainerShipment(
      request('http://localhost/api/containers/c1/shipments?shipmentId=s1', 'DELETE'),
      { params: Promise.resolve({ id: 'c1' }) },
    );
    const body = await response.json();

    assert.equal(response.status, 403);
    assert.equal(body.error, 'Forbidden');
    assert.equal(state.shipments.s1.containerId, 'c1');
  });

  it('blocks dispatch removal after handoff to container', async () => {
    state.shipments.s1.dispatchId = 'd1';
    state.shipments.s1.containerId = 'c1';
    state.shipments.s1.status = 'IN_TRANSIT';

    const response = await deleteDispatchShipment(
      request('http://localhost/api/dispatches/d1/shipments?shipmentId=s1', 'DELETE'),
      { params: Promise.resolve({ id: 'd1' }) },
    );
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error, 'Cannot remove a shipment from dispatch after handoff to container or transit');
    assert.equal(state.shipments.s1.dispatchId, 'd1');
    assert.equal(state.shipments.s1.containerId, 'c1');
  });

  it('generates a release token only for released shipments', async () => {
    state.shipments.s1.containerId = 'c1';
    state.shipments.s1.status = 'RELEASED';
    state.containers.c1.status = 'RELEASED';

    const response = await postReleaseToken(new Request('http://localhost/api/shipments/s1/release-token', { method: 'POST' }), {
      params: Promise.resolve({ id: 's1' }),
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.ok(body.shipment.releaseToken);
    assert.equal(state.shipments.s1.releaseToken, body.shipment.releaseToken);
  });

  it('forbids release token generation without shipment permissions', async () => {
    state.shipments.s1.containerId = 'c1';
    state.shipments.s1.status = 'RELEASED';
    state.containers.c1.status = 'RELEASED';
    routeDeps.hasPermission = (() => false) as unknown as typeof routeDeps.hasPermission;

    const response = await postReleaseToken(new Request('http://localhost/api/shipments/s1/release-token', { method: 'POST' }), {
      params: Promise.resolve({ id: 's1' }),
    });
    const body = await response.json();

    assert.equal(response.status, 403);
    assert.equal(body.error, 'Forbidden');
  });

  it('blocks transit assignment before shipment release', async () => {
    state.shipments.s1.containerId = 'c1';
    state.shipments.s1.status = 'IN_TRANSIT';
    state.shipments.s1.releaseToken = 'REL-TEST-TOKEN';
    state.containers.c1.status = 'IN_TRANSIT';

    const response = await postTransitShipment(
      request('http://localhost/api/transits/t1/shipments', 'POST', {
        shipmentId: 's1',
        releaseToken: 'REL-TEST-TOKEN',
      }),
      { params: Promise.resolve({ id: 't1' }) },
    );
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error, 'Shipment can be assigned to transit only after release');
    assert.equal(state.shipments.s1.transitId, null);
    assert.equal(state.shipments.s1.status, 'IN_TRANSIT');
  });

  it('forbids transit assignment without workflow permissions', async () => {
    state.shipments.s1.containerId = 'c1';
    state.shipments.s1.status = 'RELEASED';
    state.shipments.s1.releaseToken = 'REL-TEST-TOKEN';
    state.containers.c1.status = 'RELEASED';
    routeDeps.hasPermission = (() => false) as unknown as typeof routeDeps.hasPermission;

    const response = await postTransitShipment(
      request('http://localhost/api/transits/t1/shipments', 'POST', {
        shipmentId: 's1',
        releaseToken: 'REL-TEST-TOKEN',
      }),
      { params: Promise.resolve({ id: 't1' }) },
    );
    const body = await response.json();

    assert.equal(response.status, 403);
    assert.equal(body.error, 'Forbidden');
  });

  it('assigns a released shipment to transit when the release token matches', async () => {
    state.shipments.s1.containerId = 'c1';
    state.shipments.s1.status = 'RELEASED';
    state.shipments.s1.releaseToken = 'REL-TEST-TOKEN';
    state.containers.c1.status = 'RELEASED';

    const response = await postTransitShipment(
      request('http://localhost/api/transits/t1/shipments', 'POST', {
        shipmentId: 's1',
        releaseToken: 'REL-TEST-TOKEN',
      }),
      { params: Promise.resolve({ id: 't1' }) },
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.shipment.transitId, 't1');
    assert.equal(state.shipments.s1.status, 'IN_TRANSIT_TO_DESTINATION');
  });

  it('forbids transit removal without workflow permissions', async () => {
    state.shipments.s1.containerId = 'c1';
    state.shipments.s1.transitId = 't1';
    state.shipments.s1.status = 'IN_TRANSIT_TO_DESTINATION';
    routeDeps.hasPermission = (() => false) as unknown as typeof routeDeps.hasPermission;

    const response = await deleteTransitShipment(
      request('http://localhost/api/transits/t1/shipments?shipmentId=s1', 'DELETE'),
      { params: Promise.resolve({ id: 't1' }) },
    );
    const body = await response.json();

    assert.equal(response.status, 403);
    assert.equal(body.error, 'Forbidden');
    assert.equal(state.shipments.s1.transitId, 't1');
  });

  it('blocks transit assignment when the release token is invalid', async () => {
    state.shipments.s1.containerId = 'c1';
    state.shipments.s1.status = 'RELEASED';
    state.shipments.s1.releaseToken = 'REL-TEST-TOKEN';
    state.containers.c1.status = 'RELEASED';

    const response = await postTransitShipment(
      request('http://localhost/api/transits/t1/shipments', 'POST', {
        shipmentId: 's1',
        releaseToken: 'WRONG-TOKEN',
      }),
      { params: Promise.resolve({ id: 't1' }) },
    );
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error, 'Invalid release token for this shipment');
    assert.equal(state.shipments.s1.transitId, null);
    assert.equal(state.shipments.s1.status, 'RELEASED');
  });

  it('blocks container removal after handoff to transit', async () => {
    state.shipments.s1.containerId = 'c1';
    state.shipments.s1.transitId = 't1';
    state.shipments.s1.status = 'IN_TRANSIT_TO_DESTINATION';
    state.containers.c1.currentCount = 1;

    const response = await deleteContainerShipment(
      request('http://localhost/api/containers/c1/shipments?shipmentId=s1', 'DELETE'),
      { params: Promise.resolve({ id: 'c1' }) },
    );
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error, 'Cannot remove a shipment from the container while it is assigned to a transit');
    assert.equal(state.shipments.s1.containerId, 'c1');
    assert.equal(state.shipments.s1.transitId, 't1');
  });

  it('keeps handed-off shipments intact when a dispatch is cancelled', async () => {
    state.shipments.s1.dispatchId = 'd1';
    state.shipments.s1.containerId = 'c1';
    state.shipments.s1.status = 'IN_TRANSIT';

    const response = await patchDispatch(
      request('http://localhost/api/dispatches/d1', 'PATCH', { status: 'CANCELLED' }),
      { params: Promise.resolve({ id: 'd1' }) },
    );

    assert.equal(response.status, 200);
    assert.equal(state.shipments.s1.status, 'IN_TRANSIT');
    assert.equal(state.shipments.s1.containerId, 'c1');
  });

  it('releases transit shipments back to RELEASED when transit is cancelled', async () => {
    state.shipments.s1.containerId = 'c1';
    state.shipments.s1.transitId = 't1';
    state.shipments.s1.status = 'IN_TRANSIT_TO_DESTINATION';

    const response = await patchTransit(
      request('http://localhost/api/transits/t1', 'PATCH', { status: 'CANCELLED' }),
      { params: Promise.resolve({ id: 't1' }) },
    );

    assert.equal(response.status, 200);
    assert.equal(state.shipments.s1.transitId, null);
    assert.equal(state.shipments.s1.status, 'RELEASED');
  });

  it('confirms transit delivery with receiver and proof, then closes all transit shipments', async () => {
    state.shipments.s1.containerId = 'c1';
    state.shipments.s1.transitId = 't1';
    state.shipments.s1.status = 'IN_TRANSIT_TO_DESTINATION';
    state.transits.t1.status = 'ARRIVED';

    const response = await postTransitDeliveryConfirmation(
      request('http://localhost/api/transits/t1/confirm-delivery', 'POST', {
        deliveredDate: '2026-04-05T10:30:00.000Z',
        receiverName: 'Ahmad Khan',
        proofUrl: 'https://blob.example.com/pod.pdf',
        proofName: 'pod.pdf',
        proofType: 'application/pdf',
        notes: 'Vehicle handed over at Kabul yard',
      }),
      { params: Promise.resolve({ id: 't1' }) },
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(state.transits.t1.status, 'DELIVERED');
    assert.equal(state.transits.t1.deliveryReceiverName, 'Ahmad Khan');
    assert.equal(state.transits.t1.deliveryProofUrl, 'https://blob.example.com/pod.pdf');
    assert.equal(state.shipments.s1.status, 'DELIVERED');
    assert.equal(state.transitEvents.length, 2);
    assert.equal(body.deliveryConfirmation.receiverName, 'Ahmad Khan');
  });

  it('forbids transit delivery confirmation without workflow permissions', async () => {
    state.shipments.s1.containerId = 'c1';
    state.shipments.s1.transitId = 't1';
    state.shipments.s1.status = 'IN_TRANSIT_TO_DESTINATION';
    routeDeps.hasPermission = (() => false) as unknown as typeof routeDeps.hasPermission;

    const response = await postTransitDeliveryConfirmation(
      request('http://localhost/api/transits/t1/confirm-delivery', 'POST', {
        deliveredDate: '2026-04-05T10:30:00.000Z',
        receiverName: 'Ahmad Khan',
        proofUrl: 'https://blob.example.com/pod.pdf',
      }),
      { params: Promise.resolve({ id: 't1' }) },
    );
    const body = await response.json();

    assert.equal(response.status, 403);
    assert.equal(body.error, 'Forbidden');
  });

  it('blocks generic transit updates from marking a transit delivered without confirmation', async () => {
    const response = await patchTransit(
      request('http://localhost/api/transits/t1', 'PATCH', { status: 'DELIVERED' }),
      { params: Promise.resolve({ id: 't1' }) },
    );
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error, 'Use the delivery confirmation flow to close a transit as delivered');
    assert.equal(state.transits.t1.status, 'PENDING');
  });

  it('posts dispatch-only shipment expenses to the dispatch company ledger', async () => {
    state.shipments.s1.status = 'DISPATCHING';
    state.shipments.s1.dispatchId = 'd1';

    const response = await postLedgerExpense(
      request('http://localhost/api/ledger/expense', 'POST', {
        shipmentId: 's1',
        description: 'Local truck fee',
        amount: 125,
        expenseType: 'FUEL',
        paymentMode: 'DUE',
        contextType: 'DISPATCH',
        contextId: 'd1',
      }),
    );
    const body = await response.json();

    assert.equal(response.status, 201);
    assert.equal(body.companyEntry.companyId, 'dispatch-co');
    assert.equal(body.companyEntry.category, 'Dispatch Expense Recovery');
    assert.equal((body.companyEntry.metadata as Record<string, unknown>).expenseSource, 'DISPATCH');
    assert.equal((body.entry.metadata as Record<string, unknown>).dispatchId, 'd1');
    assert.equal(state.ledgerEntries.length, 1);
    assert.equal(state.companyLedgerEntries.length, 1);
  });

  it('posts shipment expenses without company credit when explicitly disabled', async () => {
    state.shipments.s1.status = 'DISPATCHING';
    state.shipments.s1.dispatchId = 'd1';

    const response = await postLedgerExpense(
      request('http://localhost/api/ledger/expense', 'POST', {
        shipmentId: 's1',
        description: 'Customer-only charge',
        amount: 80,
        expenseType: 'FUEL',
        paymentMode: 'DUE',
        contextType: 'DISPATCH',
        contextId: 'd1',
        createCompanyCredit: false,
      }),
    );
    const body = await response.json();

    assert.equal(response.status, 201);
    assert.equal(body.companyEntry, null);
    assert.equal(state.ledgerEntries.length, 1);
    assert.equal(state.companyLedgerEntries.length, 0);
  });
});
