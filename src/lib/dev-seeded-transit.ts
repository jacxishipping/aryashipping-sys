import { TransitStatus } from '@prisma/client';

export const DEV_SEEDED_TRANSIT_ID = 'seeded-dev-transit';

const DEV_SEEDED_TRANSIT_COMPANY = {
  id: 'seeded-dev-transit-company',
  name: 'Khyber Inland Transit Co.',
  code: 'KIT-DEV',
  phone: '+93 70 000 1122',
  email: 'ops+transit-dev@jacxi.local',
};

const DEV_SEEDED_TRANSIT_EVENTS = [
  {
    id: 'seeded-dev-transit-event-2',
    origin: 'Peshawar, Pakistan',
    destination: 'Kabul, Afghanistan',
    status: 'DELIVERED',
    eventDate: '2026-05-21T09:30:00.000Z',
    createdAt: '2026-05-21T09:30:00.000Z',
    company: DEV_SEEDED_TRANSIT_COMPANY,
  },
  {
    id: 'seeded-dev-transit-event-1',
    origin: 'Karachi Port, Pakistan',
    destination: 'Peshawar, Pakistan',
    status: 'IN_TRANSIT',
    eventDate: '2026-05-18T08:00:00.000Z',
    createdAt: '2026-05-18T08:00:00.000Z',
    company: DEV_SEEDED_TRANSIT_COMPANY,
  },
];

const DEV_SEEDED_TRANSIT_SHIPMENTS = [
  {
    id: 'seeded-dev-transit-shipment-1',
    status: 'IN_TRANSIT_TO_DESTINATION',
    vehicleMake: 'Toyota',
    vehicleModel: 'Corolla',
    vehicleVIN: 'DEVTRN12345678901',
    user: {
      id: 'seeded-dev-transit-customer-1',
      name: 'Transit Demo Customer',
      email: 'transit-demo@example.com',
      phone: '+93 79 111 2233',
    },
  },
];

const DEV_SEEDED_TRANSIT_EXPENSES = [
  {
    id: 'seeded-dev-transit-expense-1',
    type: 'FUEL',
    description: 'Line-haul fuel and checkpoint fees',
    amount: 185,
    currency: 'USD',
    date: '2026-05-19T14:15:00.000Z',
    vendor: 'North Route Fuel Stop',
    invoiceNumber: 'DEV-FUEL-102',
    category: 'OPERATIONS',
    notes: 'Seeded development expense for transit detail verification.',
    shipment: DEV_SEEDED_TRANSIT_SHIPMENTS[0],
    transitEvent: {
      id: DEV_SEEDED_TRANSIT_EVENTS[0].id,
      company: DEV_SEEDED_TRANSIT_COMPANY,
    },
    source: 'TRANSIT_EXPENSE' as const,
  },
  {
    id: 'seeded-dev-transit-expense-2',
    type: 'ESCORT',
    description: 'Final-mile yard escort and unloading coordination',
    amount: 95,
    currency: 'USD',
    date: '2026-05-21T11:00:00.000Z',
    vendor: 'Kabul Arrival Services',
    invoiceNumber: 'DEV-ESCORT-221',
    category: 'DELIVERY',
    notes: 'Seeded development expense for delivery confirmation coverage.',
    shipment: DEV_SEEDED_TRANSIT_SHIPMENTS[0],
    transitEvent: {
      id: DEV_SEEDED_TRANSIT_EVENTS[0].id,
      company: DEV_SEEDED_TRANSIT_COMPANY,
    },
    source: 'SHIPMENT_EXPENSE' as const,
  },
];

const DEV_SEEDED_TRANSIT = {
  id: DEV_SEEDED_TRANSIT_ID,
  referenceNumber: 'TRN-DEV-KBL01',
  origin: 'Karachi Port, Pakistan',
  destination: 'Kabul, Afghanistan',
  status: 'DELIVERED' as TransitStatus,
  dispatchDate: '2026-05-18T08:00:00.000Z',
  estimatedDelivery: '2026-05-22T17:00:00.000Z',
  actualDelivery: '2026-05-21T12:30:00.000Z',
  deliveryReceiverName: 'Warehouse Supervisor',
  deliveryProofUrl: 'https://example.com/dev-transit-proof',
  deliveryProofName: 'delivery-proof-dev-transit.jpg',
  deliveryProofType: 'PHOTO',
  deliveryNotes: 'Seeded development transit used to verify the mobile detail experience end to end.',
  cost: 280,
  notes: 'Development-only seeded transit for verifying route, company, expense, and delivery sections before local DB transit data exists.',
  createdAt: '2026-05-18T08:00:00.000Z',
  currentEvent: DEV_SEEDED_TRANSIT_EVENTS[0],
  currentCompany: DEV_SEEDED_TRANSIT_COMPANY,
  shipments: DEV_SEEDED_TRANSIT_SHIPMENTS,
  events: DEV_SEEDED_TRANSIT_EVENTS,
  expenses: DEV_SEEDED_TRANSIT_EXPENSES,
  _count: {
    shipments: DEV_SEEDED_TRANSIT_SHIPMENTS.length,
    events: DEV_SEEDED_TRANSIT_EVENTS.length,
    expenses: DEV_SEEDED_TRANSIT_EXPENSES.length,
  },
};

export function isDevSeededTransitEnabled() {
  return process.env.NODE_ENV !== 'production';
}

export function getDevSeededTransitSummary(filters?: { status?: string | null; companyId?: string | null; search?: string | null }) {
  if (!isDevSeededTransitEnabled()) {
    return null;
  }

  if (filters?.status && filters.status !== DEV_SEEDED_TRANSIT.status) {
    return null;
  }

  if (filters?.companyId && filters.companyId !== DEV_SEEDED_TRANSIT.currentCompany.id) {
    return null;
  }

  const searchNeedle = filters?.search?.trim().toLowerCase();
  if (searchNeedle) {
    const haystack = [
      DEV_SEEDED_TRANSIT.referenceNumber,
      DEV_SEEDED_TRANSIT.origin,
      DEV_SEEDED_TRANSIT.destination,
      DEV_SEEDED_TRANSIT.notes,
      DEV_SEEDED_TRANSIT.currentCompany.name,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    if (!haystack.includes(searchNeedle)) {
      return null;
    }
  }

  return {
    ...DEV_SEEDED_TRANSIT,
    shipments: undefined,
    events: undefined,
    expenses: undefined,
  };
}

export function getDevSeededTransitDetail(id: string) {
  if (!isDevSeededTransitEnabled() || id !== DEV_SEEDED_TRANSIT_ID) {
    return null;
  }

  return {
    transit: DEV_SEEDED_TRANSIT,
    totalExpenses: DEV_SEEDED_TRANSIT_EXPENSES.reduce((sum, expense) => sum + expense.amount, 0),
  };
}