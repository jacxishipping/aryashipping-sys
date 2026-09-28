import { expect, test, type Page, type Route } from '@playwright/test';

type WorkflowPhase = 'on-hand' | 'dispatching' | 'released' | 'transit';
type SessionRole = 'admin' | 'customer';

type WorkflowState = {
  phase: WorkflowPhase;
  releaseToken: string | null;
  releaseTokenCreatedAt: string | null;
};

const shipmentId = 'shipment-1';
const dispatchId = 'dispatch-1';
const transitId = 'transit-1';
const dispatchReference = 'DSP-2026-AAA11';
const transitReference = 'TRN-2026-AAA11';
const containerId = 'container-1';
const containerNumber = 'CONT-2026-AAA11';

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

function buildShipment(state: WorkflowState) {
  const baseShipment = {
    id: shipmentId,
    userId: 'customer-1',
    serviceType: 'SHIPPING',
    vehicleType: 'CAR',
    vehicleMake: 'Toyota',
    vehicleModel: 'Corolla',
    vehicleYear: 2020,
    vehicleVIN: 'VIN-WORKFLOW-1',
    vehicleColor: 'White',
    lotNumber: null,
    auctionName: null,
    status: 'ON_HAND',
    price: 1200,
    companyShippingFare: 850,
    damageCost: null,
    damageCredit: 0,
    weight: 3200,
    dimensions: '182 x 70 x 57 in',
    insuranceValue: 9000,
    vehiclePhotos: [],
    arrivalPhotos: [],
    hasKey: true,
    hasTitle: true,
    titleStatus: 'READY',
    vehicleAge: 6,
    dispatchId: null as string | null,
    containerId: null as string | null,
    transitId: null as string | null,
    dispatch: null as null | {
      id: string;
      referenceNumber: string;
      origin: string;
      destination: string;
      status: string;
      company: { id: string; name: string };
    },
    container: null as null | {
      id: string;
      containerNumber: string;
      trackingNumber: string | null;
      vesselName: string | null;
      voyageNumber: string | null;
      shippingLine: string | null;
      bookingNumber: string | null;
      loadingPort: string | null;
      destinationPort: string | null;
      transshipmentPorts: string[];
      loadingDate: string | null;
      departureDate: string | null;
      estimatedArrival: string | null;
      actualArrival: string | null;
      status: string;
      currentLocation: string | null;
      progress: number;
      maxCapacity: number;
      currentCount: number;
      notes: string | null;
      trackingEvents: Array<{
        id: string;
        status: string;
        location: string | null;
        eventDate: string;
        description: string | null;
        completed: boolean;
      }>;
    },
    transit: null as null | {
      id: string;
      referenceNumber: string;
      origin: string;
      destination: string;
      status: string;
      company: { id: string; name: string };
    },
    internalNotes: 'Lifecycle UI test shipment',
    paymentStatus: 'PENDING',
    paymentMode: 'BANK_TRANSFER',
    releaseToken: state.releaseToken,
    releaseTokenCreatedAt: state.releaseTokenCreatedAt,
    createdAt: '2026-04-01T00:00:00.000Z',
    updatedAt: '2026-04-04T00:00:00.000Z',
    user: {
      id: 'customer-1',
      name: 'Customer One',
      email: 'customer@example.com',
      phone: '+1 555 0100',
      address: '123 Main St',
      city: 'Houston',
      country: 'USA',
    },
    documents: [],
    ledgerEntries: [],
    companyLedgerEntries: [],
    containerDamages: [],
    auditLogs: [],
  };

  if (state.phase === 'dispatching') {
    baseShipment.status = 'DISPATCHING';
    baseShipment.dispatchId = dispatchId;
    baseShipment.dispatch = {
      id: dispatchId,
      referenceNumber: dispatchReference,
      origin: 'Houston Yard',
      destination: 'Port of Loading',
      status: 'DISPATCHED',
      company: { id: 'dispatch-co', name: 'Dispatch Co' },
    };
  }

  if (state.phase === 'released') {
    baseShipment.status = 'RELEASED';
    baseShipment.containerId = containerId;
    baseShipment.container = {
      id: containerId,
      containerNumber,
      trackingNumber: 'TRK-12345',
      vesselName: 'MV Jacxi',
      voyageNumber: 'VY-88',
      shippingLine: 'Jacxi Line',
      bookingNumber: 'BK-1001',
      loadingPort: 'Jebel Ali',
      destinationPort: 'Karachi',
      transshipmentPorts: [],
      loadingDate: '2026-04-02T00:00:00.000Z',
      departureDate: '2026-04-03T00:00:00.000Z',
      estimatedArrival: '2026-04-15T00:00:00.000Z',
      actualArrival: null,
      status: 'RELEASED',
      currentLocation: 'Jebel Ali',
      progress: 100,
      maxCapacity: 4,
      currentCount: 1,
      notes: null,
      trackingEvents: [],
    };
  }

  if (state.phase === 'transit') {
    baseShipment.status = 'IN_TRANSIT_TO_DESTINATION';
    baseShipment.containerId = containerId;
    baseShipment.transitId = transitId;
    baseShipment.container = {
      id: containerId,
      containerNumber,
      trackingNumber: 'TRK-12345',
      vesselName: 'MV Jacxi',
      voyageNumber: 'VY-88',
      shippingLine: 'Jacxi Line',
      bookingNumber: 'BK-1001',
      loadingPort: 'Jebel Ali',
      destinationPort: 'Karachi',
      transshipmentPorts: [],
      loadingDate: '2026-04-02T00:00:00.000Z',
      departureDate: '2026-04-03T00:00:00.000Z',
      estimatedArrival: '2026-04-15T00:00:00.000Z',
      actualArrival: null,
      status: 'RELEASED',
      currentLocation: 'Kabul Hub',
      progress: 100,
      maxCapacity: 4,
      currentCount: 1,
      notes: null,
      trackingEvents: [],
    };
    baseShipment.transit = {
      id: transitId,
      referenceNumber: transitReference,
      origin: 'Dubai',
      destination: 'Kabul',
      status: 'IN_TRANSIT',
      company: { id: 'transit-co', name: 'Transit Co' },
    };
  }

  return baseShipment;
}

async function mockAuthenticatedSession(page: Page, role: SessionRole = 'admin') {
  await page.route('**/api/auth/session**', async (route) => {
    await json(route, {
      user: {
        id: role === 'admin' ? 'admin-1' : 'customer-1',
        name: role === 'admin' ? 'Admin User' : 'Customer One',
        email: role === 'admin' ? 'admin@example.com' : 'customer@example.com',
        role,
      },
      expires: '2099-01-01T00:00:00.000Z',
    });
  });

  await page.route('**/api/auth/_log**', async (route) => {
    await json(route, { ok: true });
  });
}

test('walks the main shipment lifecycle UI from dispatch assignment to transit assignment', async ({ page }) => {
  const state: WorkflowState = {
    phase: 'on-hand',
    releaseToken: null,
    releaseTokenCreatedAt: null,
  };

  await mockAuthenticatedSession(page);

  await page.route(`**/api/shipments/${shipmentId}`, async (route) => {
    if (route.request().method() !== 'GET') {
      await json(route, { message: 'Unsupported request' }, 405);
      return;
    }

    await json(route, { shipment: buildShipment(state) });
  });

  await page.route('**/api/dispatches', async (route) => {
    await json(route, {
      dispatches: [
        {
          id: dispatchId,
          referenceNumber: dispatchReference,
          origin: 'Houston Yard',
          destination: 'Port of Loading',
          status: 'PENDING',
          company: { name: 'Dispatch Co' },
        },
      ],
    });
  });

  await page.route(`**/api/dispatches/${dispatchId}/shipments`, async (route) => {
    if (route.request().method() !== 'POST') {
      await json(route, { error: 'Unsupported request' }, 405);
      return;
    }

    state.phase = 'dispatching';
    await json(route, { shipment: buildShipment(state) });
  });

  await page.route(`**/api/shipments/${shipmentId}/release-token`, async (route) => {
    state.releaseToken = 'REL-TEST-TOKEN';
    state.releaseTokenCreatedAt = '2026-04-04T12:00:00.000Z';
    await json(route, {
      shipment: {
        id: shipmentId,
        releaseToken: state.releaseToken,
        releaseTokenCreatedAt: state.releaseTokenCreatedAt,
      },
    });
  });

  await page.route('**/api/transits/*/shipments', async (route) => {
    if (route.request().method() !== 'POST') {
      await json(route, { error: 'Unsupported request' }, 405);
      return;
    }

    const body = route.request().postDataJSON() as { shipmentId?: string; releaseToken?: string };
    if (body.shipmentId !== shipmentId || body.releaseToken !== state.releaseToken) {
      await json(route, { error: 'Invalid release token for this shipment' }, 400);
      return;
    }

    state.phase = 'transit';
    await json(route, { shipment: buildShipment(state) });
  });

  await page.goto(`/dashboard/shipments/${shipmentId}`);

  await expect(page.getByRole('heading', { name: 'VIN-WORKFLOW-1' })).toBeVisible();
  await expect(page.getByText('Assign to Dispatch')).toBeVisible();
  await expect(page.getByText('No transit assigned. Transit can be assigned only after shipment release.')).toBeVisible();

  await page.getByRole('button', { name: 'Assign to Dispatch' }).click();
  const dispatchDialog = page.getByRole('dialog', { name: 'Assign Shipment to Dispatch' });
  await expect(dispatchDialog).toBeVisible();
  await dispatchDialog.getByLabel('Dispatch').click();
  await page.getByRole('option', { name: /DSP-2026-AAA11/ }).click();
  await dispatchDialog.getByRole('button', { name: 'Assign' }).click();

  await expect(page.getByText('Ref:')).toBeVisible();
  await expect(page.getByText(dispatchReference)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Assign to Dispatch' })).toHaveCount(0);
  await expect(page.getByText('Remove from dispatch')).toBeVisible();

  state.phase = 'released';
  await page.reload();

  await expect(page.getByText(containerNumber)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Generate Token' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Assign to Transit' })).toBeEnabled();

  await page.getByRole('button', { name: 'Generate Token' }).click();
  await expect(page.getByRole('button', { name: 'Release Token PDF' })).toBeVisible();

  await page.getByRole('button', { name: 'Assign to Transit' }).click();
  const transitDialog = page.getByRole('dialog', { name: 'Assign Shipment to Transit' });
  await expect(transitDialog).toBeVisible();
  await transitDialog.getByLabel('Transit ID').fill(transitId);
  await transitDialog.getByLabel('Release Token').fill(state.releaseToken ?? '');
  await transitDialog.getByRole('button', { name: 'Assign' }).click();

  await expect(page.getByText(transitReference)).toBeVisible();
  await expect(page.getByText('Remove from transit')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Transit Expense' })).toBeEnabled();
});

test('shows failure UX for invalid release-token submission and denied assignment actions', async ({ browser }) => {
  const adminPage = await browser.newPage();
  const customerPage = await browser.newPage();

  const releasedState: WorkflowState = {
    phase: 'released',
    releaseToken: 'REL-VALID-TOKEN',
    releaseTokenCreatedAt: '2026-04-04T12:00:00.000Z',
  };

  await mockAuthenticatedSession(adminPage, 'admin');

  await adminPage.route(`**/api/shipments/${shipmentId}`, async (route) => {
    if (route.request().method() !== 'GET') {
      await json(route, { message: 'Unsupported request' }, 405);
      return;
    }

    await json(route, { shipment: buildShipment(releasedState) });
  });

  await adminPage.route('**/api/transits/*/shipments', async (route) => {
    if (route.request().method() !== 'POST') {
      await json(route, { error: 'Unsupported request' }, 405);
      return;
    }

    await json(route, { error: 'Invalid release token for this shipment' }, 400);
  });

  await adminPage.goto(`/dashboard/shipments/${shipmentId}`);
  await expect(adminPage.getByRole('button', { name: 'Assign to Transit' })).toBeEnabled();

  await adminPage.getByRole('button', { name: 'Assign to Transit' }).click();
  const transitDialog = adminPage.getByRole('dialog', { name: 'Assign Shipment to Transit' });
  await expect(transitDialog).toBeVisible();
  await transitDialog.getByLabel('Transit ID').fill(transitId);
  await transitDialog.getByLabel('Release Token').fill('REL-WRONG-TOKEN');
  await transitDialog.getByRole('button', { name: 'Assign' }).click();

  await expect(adminPage.getByText('Invalid release token for this shipment')).toBeVisible();
  await expect(transitDialog).toBeVisible();
  await expect(adminPage.getByText(transitReference)).toHaveCount(0);

  const customerState: WorkflowState = {
    phase: 'on-hand',
    releaseToken: null,
    releaseTokenCreatedAt: null,
  };

  await mockAuthenticatedSession(customerPage, 'customer');

  await customerPage.route(`**/api/shipments/${shipmentId}`, async (route) => {
    if (route.request().method() !== 'GET') {
      await json(route, { message: 'Unsupported request' }, 405);
      return;
    }

    await json(route, { shipment: buildShipment(customerState) });
  });

  await customerPage.goto(`/dashboard/shipments/${shipmentId}`);

  await expect(customerPage.getByRole('heading', { name: 'VIN-WORKFLOW-1' })).toBeVisible();
  await expect(customerPage.getByRole('button', { name: 'Assign to Dispatch' })).toHaveCount(0);
  await expect(customerPage.getByRole('button', { name: 'Assign to Transit' })).toHaveCount(0);
  await expect(customerPage.getByRole('button', { name: 'Generate Token' })).toHaveCount(0);
  await expect(customerPage.getByText('Remove from dispatch')).toHaveCount(0);
  await expect(customerPage.getByText('Remove from transit')).toHaveCount(0);

  await adminPage.close();
  await customerPage.close();
});