import { Suspense } from 'react';
import { auth } from '@/lib/auth';
import { formatMoney } from '@/lib/format';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/rbac';
import {
    DashboardSurface
} from '@/components/dashboard/DashboardSurface';
import DashboardKpiGrid from '@/components/dashboard/DashboardKpiGrid';
import DashboardOperationsChart from '@/components/dashboard/DashboardOperationsChart';
import DashboardTodayWork from '@/components/dashboard/DashboardTodayWork';
import DashboardMore from '@/components/dashboard/DashboardMore';
import QuickCalculatorButton from '@/components/dashboard/QuickCalculatorButton';
import OnboardingTour from '@/components/onboarding/OnboardingTour';
import { getEffectiveAiProviderSettings, isAiProviderConfigured } from '@/lib/ai/provider-settings';
import { DashboardPageSkeleton, PageHeader } from '@/components/design-system';

// Force dynamic rendering (requires database connection)
export const dynamic = 'force-dynamic';

// Helper for currency if not available
const formatDateKey = (date: Date) => {
    const normalized = new Date(date);
    normalized.setHours(var(--text-primary-rgb), 0);
    return normalized.toISOString().slice(0, 10);
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DASHBOARD_AGE_THRESHOLDS = {
    dispatchStuckDays: 7,
    releasedAwaitingTransitDays: 5,
} as const;

const differenceInWholeDays = (start: Date, end: Date) => {
    const utcStart = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
    const utcEnd = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
    return Math.max(0, Math.floor((utcEnd - utcStart) / MS_PER_DAY));
};

const formatShortDate = (value: Date | string | null | undefined) => {
    if (!value) return 'Unknown';

    return new Date(value).toLocaleDateString();
};

type DashboardExceptionItem = {
    id: string;
    title: string;
    subtitle: string;
    detail: string;
    href: string;
    severityLabel: string;
    ageDays: number;
};

const buildVehicleLabel = (shipment: {
    id: string;
    vehicleYear: number | null;
    vehicleMake: string | null;
    vehicleModel: string | null;
    vehicleVIN: string | null;
}) => {
    const vehicleLabel = [shipment.vehicleYear, shipment.vehicleMake, shipment.vehicleModel]
        .filter(Boolean)
        .join(' ')
        .trim();

    if (shipment.vehicleVIN && vehicleLabel) {
        return `${vehicleLabel} (${shipment.vehicleVIN})`;
    }

    return shipment.vehicleVIN || vehicleLabel || `Shipment ${shipment.id.slice(0, 8)}`;
};

type DashboardDataOptions = {
    canReadAllShipments: boolean;
    canReadAllContainers: boolean;
    canReadAllInvoices: boolean;
    canManageDispatches: boolean;
};

const dispatchStatusLabels: Record<string, string> = {
    PENDING: 'Pending',
    DISPATCHED: 'Dispatched',
    ARRIVED_AT_PORT: 'Arrived At Port',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
};

function buildDashboardFilters(
    userId: string | undefined,
    options: DashboardDataOptions,
) {
    const effectiveUserId = userId ?? '';
    const { canReadAllShipments, canReadAllContainers, canReadAllInvoices, canManageDispatches } = options;
    const shipmentUserFilter = canReadAllShipments ? {} : { userId: effectiveUserId };
    const containerUserFilter = canReadAllContainers ? {} : { shipments: { some: { userId: effectiveUserId } } };
    const invoiceUserFilter = canReadAllInvoices ? {} : { userId: effectiveUserId };
    const dispatchVisibilityFilter = canManageDispatches
        ? canReadAllShipments
            ? {}
            : { shipments: { some: { userId: effectiveUserId } } }
        : null;

    return { effectiveUserId, shipmentUserFilter, containerUserFilter, invoiceUserFilter, dispatchVisibilityFilter };
}

// Fast queries: cheap counts and aggregates that power the KPI strip and chart.
// Kept separate from the heavy workflow-records query so this section can stream
// to the browser while the slow data is still loading.
async function getDashboardKpiData(
    userId: string | undefined,
    options: DashboardDataOptions,
) {
    const trendDays = 14;
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - (trendDays - 1));
    startDate.setHours(var(--text-primary-rgb), 0);

    const {
        effectiveUserId,
        shipmentUserFilter,
        containerUserFilter,
        invoiceUserFilter,
        dispatchVisibilityFilter,
    } = buildDashboardFilters(userId, options);
    const { canReadAllShipments, canManageDispatches } = options;

    // Parallelize all independent DB queries
    const [
        activeShipmentsCount,
        activeContainersCount,
        pendingInvoices,
        shipmentStats,
        shipmentsInRange,
        containerUtilization,
        dispatchStats,
        overdueInvoicesCount,
        pendingInvoicesCount,
        failedAiJobsCount,
    ] = await Promise.all([
        // 1. KPI Stats
        prisma.shipment.count({
            where: {
                ...shipmentUserFilter,
                status: {
                    in: ['ON_HAND', 'DISPATCHING', 'IN_TRANSIT', 'IN_TRANSIT_TO_DESTINATION']
                }
            }
        }),

        prisma.container.count({
            where: {
                ...containerUserFilter,
                status: {
                    in: ['LOADED', 'IN_TRANSIT', 'ARRIVED_PORT', 'CUSTOMS_CLEARANCE']
                }
            }
        }),

        prisma.userInvoice.aggregate({
            _sum: {
                total: true
            },
            where: {
                ...invoiceUserFilter,
                status: {
                    in: ['PENDING', 'OVERDUE']
                }
            }
        }),

        // 3. Counts by Status for Chart/Progress
        prisma.shipment.groupBy({
            by: ['status'],
            _count: true,
            where: shipmentUserFilter,
        }),

        prisma.shipment.findMany({
            where: {
                ...shipmentUserFilter,
                createdAt: {
                    gte: startDate,
                },
            },
            select: {
                createdAt: true,
                status: true,
            },
        }),

        prisma.container.findMany({
            where: containerUserFilter,
            select: {
                containerNumber: true,
                currentCount: true,
                maxCapacity: true,
            },
            orderBy: {
                updatedAt: 'desc',
            },
            take: 6,
        }),

        canManageDispatches && dispatchVisibilityFilter
            ? prisma.dispatch.groupBy({
                by: ['status'],
                _count: true,
                where: dispatchVisibilityFilter,
            })
            : Promise.resolve([]),

        prisma.userInvoice.count({
            where: {
                ...invoiceUserFilter,
                status: 'OVERDUE',
            },
        }),

        prisma.userInvoice.count({
            where: {
                ...invoiceUserFilter,
                status: 'PENDING',
            },
        }),

        prisma.aiInteractionLog.count({
            where: {
                status: 'FAILED',
                ...(canReadAllShipments ? {} : { actorUserId: effectiveUserId }),
            },
        }),
    ]);

    const shipmentTrendMap = new Map<string, { shipments: number; inTransit: number }>();
    for (let i = 0; i < trendDays; i += 1) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        shipmentTrendMap.set(formatDateKey(date), { shipments: 0, inTransit: 0 });
    }

    shipmentsInRange.forEach((shipment) => {
        const key = formatDateKey(shipment.createdAt);
        const current = shipmentTrendMap.get(key) ?? { shipments: 0, inTransit: 0 };
        current.shipments += 1;
        if (['DISPATCHING', 'IN_TRANSIT', 'IN_TRANSIT_TO_DESTINATION'].includes(shipment.status)) {
            current.inTransit += 1;
        }
        shipmentTrendMap.set(key, current);
    });

    const shipmentTrends = Array.from(shipmentTrendMap.entries()).map(([date, counts]) => ({
        date,
        shipments: counts.shipments,
        inTransit: counts.inTransit,
    }));

    const weekBoundary = new Date(startDate);
    weekBoundary.setDate(startDate.getDate() + 7);

    const priorCount = shipmentsInRange.filter((shipment) => shipment.createdAt < weekBoundary).length;
    const currentCount = shipmentsInRange.filter((shipment) => shipment.createdAt >= weekBoundary).length;
    const shipmentTrendValue = Math.round(((currentCount - priorCount) / Math.max(priorCount, 1)) * 100);
    const shipmentTrend = {
        value: shipmentTrendValue,
        isPositive: currentCount > priorCount,
    };

    return {
        activeShipmentsCount,
        activeContainersCount,
        pendingRevenue: pendingInvoices._sum.total || 0,
        shipmentStats,
        shipmentTrends,
        shipmentTrend,
        containerUtilization: containerUtilization.map((container) => ({
            containerNumber: container.containerNumber,
            utilization: container.currentCount,
            capacity: container.maxCapacity,
        })),
        activeDispatchesCount: dispatchStats.reduce((total, stat) => {
            return ['PENDING', 'DISPATCHED', 'ARRIVED_AT_PORT'].includes(stat.status)
                ? total + stat._count
                : total;
        }, 0),
        dispatchStats: dispatchStats.map((stat) => ({
            status: stat.status,
            label: dispatchStatusLabels[stat.status] ?? stat.status,
            count: stat._count,
        })),
        overdueInvoicesCount,
        pendingInvoicesCount,
        failedAiJobsCount,
        canManageDispatches,
    };
}

// Heavy queries: full workflow scan across shipments plus audit activity.
// These power the aging-exception and recent-activity sections and are the
// slowest part of the page, so they load in a separate Suspense boundary.
async function getDashboardWorkData(
    userId: string | undefined,
    options: DashboardDataOptions,
) {
    const {
        effectiveUserId,
        shipmentUserFilter,
        dispatchVisibilityFilter,
    } = buildDashboardFilters(userId, options);
    const { canReadAllShipments, canManageDispatches } = options;

    const [shipmentWorkflowRecords, recentDispatches, recentShipmentActivity] = await Promise.all([
        prisma.shipment.findMany({
            where: shipmentUserFilter,
            select: {
                id: true,
                vehicleMake: true,
                vehicleModel: true,
                vehicleYear: true,
                vehicleVIN: true,
                status: true,
                createdAt: true,
                dispatchId: true,
                containerId: true,
                transitId: true,
                dispatch: {
                    select: {
                        id: true,
                        referenceNumber: true,
                        dispatchDate: true,
                        estimatedArrival: true,
                        actualArrival: true,
                        status: true,
                    },
                },
                container: {
                    select: {
                        id: true,
                        containerNumber: true,
                        estimatedArrival: true,
                        actualArrival: true,
                        status: true,
                    },
                },
                transit: {
                    select: {
                        id: true,
                        referenceNumber: true,
                        dispatchDate: true,
                        estimatedDelivery: true,
                        actualDelivery: true,
                        status: true,
                    },
                },
            },
        }),

        canManageDispatches && dispatchVisibilityFilter
            ? prisma.dispatch.findMany({
                where: {
                    ...dispatchVisibilityFilter,
                    status: {
                        in: ['PENDING', 'DISPATCHED', 'ARRIVED_AT_PORT'],
                    },
                },
                select: {
                    id: true,
                    referenceNumber: true,
                    status: true,
                    origin: true,
                    destination: true,
                    dispatchDate: true,
                    estimatedArrival: true,
                    company: {
                        select: {
                            name: true,
                        },
                    },
                    _count: {
                        select: {
                            shipments: true,
                        },
                    },
                },
                orderBy: [
                    { updatedAt: 'desc' },
                    { createdAt: 'desc' },
                ],
                take: 4,
            })
            : Promise.resolve([]),

        prisma.shipmentAuditLog.findMany({
            where: canReadAllShipments ? {} : { shipment: { userId: effectiveUserId } },
            select: {
                id: true,
                action: true,
                description: true,
                timestamp: true,
                shipment: {
                    select: {
                        id: true,
                        vehicleYear: true,
                        vehicleMake: true,
                        vehicleModel: true,
                        vehicleVIN: true,
                    },
                },
            },
            orderBy: {
                timestamp: 'desc',
            },
            take: 5,
        }),
    ]);

    const buildShipmentLabel = buildVehicleLabel;

    const now = new Date();
    const dispatchExceptions: DashboardExceptionItem[] = shipmentWorkflowRecords
        .filter((shipment) => !shipment.containerId && !shipment.transitId && ['ON_HAND', 'DISPATCHING'].includes(shipment.status))
        .map((shipment) => {
            const startedAt = shipment.dispatch?.dispatchDate ?? shipment.createdAt;
            const ageDays = differenceInWholeDays(startedAt, now);

            return {
                id: `dispatch-${shipment.id}`,
                title: buildShipmentLabel(shipment),
                subtitle: shipment.dispatch?.referenceNumber
                    ? `Dispatch ${shipment.dispatch.referenceNumber}`
                    : 'Awaiting dispatch progress',
                detail: `${ageDays} day${ageDays === 1 ? '' : 's'} in dispatch stage`,
                href: `/dashboard/shipments/${shipment.id}`,
                severityLabel: 'Dispatch aging',
                ageDays,
            };
        })
        .filter((item) => item.ageDays > DASHBOARD_AGE_THRESHOLDS.dispatchStuckDays)
        .sort((left, right) => right.ageDays - left.ageDays);

    const containerEtaExceptions: DashboardExceptionItem[] = shipmentWorkflowRecords
        .filter((shipment) => shipment.status === 'IN_TRANSIT' && shipment.container && !shipment.transitId)
        .map((shipment) => {
            const eta = shipment.container?.estimatedArrival;
            const overdueDays = eta ? differenceInWholeDays(eta, now) : 0;

            return {
                id: `container-${shipment.id}`,
                title: buildShipmentLabel(shipment),
                subtitle: shipment.container?.containerNumber
                    ? `Container ${shipment.container.containerNumber}`
                    : 'Container assigned',
                detail: eta
                    ? `ETA ${formatShortDate(eta)} missed by ${overdueDays} day${overdueDays === 1 ? '' : 's'}`
                    : 'No ETA recorded',
                href: shipment.container?.id ? `/dashboard/containers/${shipment.container.id}` : `/dashboard/shipments/${shipment.id}`,
                severityLabel: 'Container ETA risk',
                ageDays: overdueDays,
            };
        })
        .filter((item) => item.ageDays > 0)
        .sort((left, right) => right.ageDays - left.ageDays);

    const releasedAwaitingTransitExceptions: DashboardExceptionItem[] = shipmentWorkflowRecords
        .filter((shipment) => shipment.status === 'RELEASED' && !shipment.transitId)
        .map((shipment) => {
            const referenceDate = shipment.container?.actualArrival ?? shipment.container?.estimatedArrival ?? shipment.createdAt;
            const ageDays = differenceInWholeDays(referenceDate, now);

            return {
                id: `released-${shipment.id}`,
                title: buildShipmentLabel(shipment),
                subtitle: shipment.container?.containerNumber
                    ? `Released from ${shipment.container.containerNumber}`
                    : 'Released and awaiting assignment',
                detail: `${ageDays} day${ageDays === 1 ? '' : 's'} waiting for transit`,
                href: `/dashboard/shipments/${shipment.id}`,
                severityLabel: 'Transit handoff queue',
                ageDays,
            };
        })
        .filter((item) => item.ageDays > DASHBOARD_AGE_THRESHOLDS.releasedAwaitingTransitDays)
        .sort((left, right) => right.ageDays - left.ageDays);

    const transitOverdueExceptionsByTransit = new Map<string, DashboardExceptionItem>();
    shipmentWorkflowRecords
        .filter((shipment) => shipment.transit && shipment.status !== 'DELIVERED')
        .forEach((shipment) => {
            const transit = shipment.transit;
            if (!transit?.estimatedDelivery || transit.actualDelivery || transit.status === 'DELIVERED') {
                return;
            }

            const overdueDays = differenceInWholeDays(transit.estimatedDelivery, now);
            if (overdueDays <= 0) {
                return;
            }

            const existing = transitOverdueExceptionsByTransit.get(transit.id);
            if (!existing || overdueDays > existing.ageDays) {
                transitOverdueExceptionsByTransit.set(transit.id, {
                    id: `transit-${transit.id}`,
                    title: `Transit ${transit.referenceNumber}`,
                    subtitle: buildShipmentLabel(shipment),
                    detail: `Est. delivery ${formatShortDate(transit.estimatedDelivery)} missed by ${overdueDays} day${overdueDays === 1 ? '' : 's'}`,
                    href: `/dashboard/transits/${transit.id}`,
                    severityLabel: 'Delivery overdue',
                    ageDays: overdueDays,
                });
            }
        });

    const transitOverdueExceptions = Array.from(transitOverdueExceptionsByTransit.values()).sort(
        (left, right) => right.ageDays - left.ageDays,
    );

    const dashboardExceptions = [
        ...transitOverdueExceptions,
        ...containerEtaExceptions,
        ...releasedAwaitingTransitExceptions,
        ...dispatchExceptions,
    ]
        .sort((left, right) => right.ageDays - left.ageDays)
        .slice(0, 8);

    return {
        recentDispatches: recentDispatches.map((dispatch) => ({
            ...dispatch,
            statusLabel: dispatchStatusLabels[dispatch.status] ?? dispatch.status,
        })),
        agingMetrics: {
            dispatchStuckCount: dispatchExceptions.length,
            dispatchThresholdDays: DASHBOARD_AGE_THRESHOLDS.dispatchStuckDays,
            containerPastEtaCount: containerEtaExceptions.length,
            releasedAwaitingTransitCount: releasedAwaitingTransitExceptions.length,
            releasedAwaitingTransitThresholdDays: DASHBOARD_AGE_THRESHOLDS.releasedAwaitingTransitDays,
            transitsOverdueCount: transitOverdueExceptions.length,
            totalExceptions: dashboardExceptions.length,
            exceptions: dashboardExceptions,
        },
        todayWork: {
            workItems: dashboardExceptions.slice(0, 4),
            recentActivity: recentShipmentActivity.map((activity) => ({
                id: activity.id,
                label: activity.action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase()),
                description: activity.description || buildVehicleLabel(activity.shipment),
                href: `/dashboard/shipments/${activity.shipment.id}`,
                timestamp: activity.timestamp.toISOString(),
            })),
        },
    };
}

export default async function DashboardPage() {
    const session = await auth();
    const role = session?.user?.role;
    const options = {
        canReadAllShipments: hasPermission(role, 'shipments:read_all'),
        canReadAllContainers: hasPermission(role, 'containers:read_all'),
        canReadAllInvoices: hasPermission(role, 'invoices:manage'),
        canManageDispatches: hasPermission(role, 'dispatches:manage'),
    } as const;

    // Fire both phases immediately but don't await them here — each Suspense
    // boundary below streams its own section as soon as its data is ready.
    const kpiDataPromise = getDashboardKpiData(session?.user?.id, options);
    const workDataPromise = getDashboardWorkData(session?.user?.id, options);
    const aiEnabled = isAiProviderConfigured(await getEffectiveAiProviderSettings());

    async function KpiSection() {
        const data = await kpiDataPromise;
        const aiBriefPayload = {
            activeShipmentsCount: data.activeShipmentsCount,
            activeContainersCount: data.activeContainersCount,
            pendingRevenue: data.pendingRevenue,
            activeDispatchesCount: data.activeDispatchesCount,
            shipmentStats: data.shipmentStats.map((item) => ({
                status: item.status,
                count: item._count,
            })),
            dispatchStats: data.dispatchStats,
        };

        return (
            <>
                {/* Compact KPIs */}
                <DashboardKpiGrid
                    activeShipmentsCount={data.activeShipmentsCount}
                    activeContainersCount={data.activeContainersCount}
                    pendingRevenue={formatMoney(data.pendingRevenue)}
                    shipmentTrend={data.shipmentTrend}
                    canManageDispatches={data.canManageDispatches}
                    activeDispatchesCount={data.activeDispatchesCount}
                />

                {/* Interactive Operations Pipeline & Movement Analytics */}
                <DashboardOperationsChart
                    trends={data.shipmentTrends}
                    containerUtilization={data.containerUtilization}
                    shipmentStats={data.shipmentStats}
                />
            </>
        );
    }

    async function WorkSection() {
        const data = await workDataPromise;
        const kpiData = await kpiDataPromise;
        const aiBriefPayload = {
            activeShipmentsCount: kpiData.activeShipmentsCount,
            activeContainersCount: kpiData.activeContainersCount,
            pendingRevenue: kpiData.pendingRevenue,
            activeDispatchesCount: kpiData.activeDispatchesCount,
            shipmentStats: kpiData.shipmentStats.map((item) => ({
                status: item.status,
                count: item._count,
            })),
            dispatchStats: kpiData.dispatchStats,
            agingMetrics: {
                ...data.agingMetrics,
                exceptions: data.agingMetrics.exceptions.map((item) => ({
                    title: item.title,
                    subtitle: item.subtitle,
                    detail: item.detail,
                    severityLabel: item.severityLabel,
                    ageDays: item.ageDays,
                })),
            },
            recentDispatches: data.recentDispatches.map((dispatch) => ({
                referenceNumber: dispatch.referenceNumber,
                statusLabel: dispatch.statusLabel,
                origin: dispatch.origin,
                destination: dispatch.destination,
                shipmentCount: dispatch._count.shipments,
                companyName: dispatch.company.name,
            })),
        };

        return (
            <>
                {/* Light Priority Work */}
                <DashboardTodayWork
                    role={role}
                    workItems={data.todayWork.workItems}
                    overdueInvoicesCount={kpiData.overdueInvoicesCount}
                    pendingInvoicesCount={kpiData.pendingInvoicesCount}
                    failedAiJobsCount={kpiData.failedAiJobsCount}
                    recentActivity={data.todayWork.recentActivity}
                />

                {/* Remaining sections are accessible here — trends, calculator, pipeline, AI */}
                <DashboardMore
                    aiEnabled={aiEnabled}
                    aiBriefPayload={aiBriefPayload}
                    canManageDispatches={kpiData.canManageDispatches}
                    shipmentStats={kpiData.shipmentStats}
                    activeDispatchesCount={kpiData.activeDispatchesCount}
                />
            </>
        );
    }

    return (
        <DashboardSurface className="gap-4 pt-3 pb-6">
            {/* Header — renders immediately, no data dependency */}
            <div id="dashboard-header">
                <PageHeader
                    title="Overview"
                    description="Operations at a glance."
                    actions={
                      <>
                        <QuickCalculatorButton />
                        <OnboardingTour autoStart={true} />
                      </>
                    }
                />
            </div>

            {/* KPI strip + chart stream as soon as the fast queries resolve */}
            <Suspense
                fallback={
                    <DashboardPageSkeleton />
                }
            >
                <KpiSection />
            </Suspense>

            {/* Workflow exceptions + recent activity stream separately when the
                heavier workflow-scan query completes */}
            <Suspense fallback={null}>
                <WorkSection />
            </Suspense>
        </DashboardSurface>
    );
}
