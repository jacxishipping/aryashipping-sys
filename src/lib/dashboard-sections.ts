/**
 * Dashboard home section visibility.
 *
 * Each user can show/hide dashboard home sections from
 * Settings -> Preferences. Optional sections are hidden by default;
 * core sections (KPIs, Today's Work) stay visible unless the user
 * turns them off. Unknown stored keys are ignored so older payloads
 * and future sections never break normalization.
 */

export type DashboardSectionId =
  | 'kpis'
  | 'todayWork'
  | 'operationsChart'
  | 'moreTools'
  | 'calculatorShortcut';

export interface DashboardSectionDef {
  id: DashboardSectionId;
  title: string;
  description: string;
  defaultVisible: boolean;
}

export const DASHBOARD_SECTIONS: DashboardSectionDef[] = [
  {
    id: 'kpis',
    title: 'KPI Strip',
    description: 'Active shipments, containers, revenue and dispatch counts at a glance.',
    defaultVisible: true,
  },
  {
    id: 'todayWork',
    title: "Today's Work",
    description: 'Priority exceptions and recent activity for your role.',
    defaultVisible: true,
  },
  {
    id: 'operationsChart',
    title: 'Operations Chart',
    description: 'Pipeline and movement analytics with trends and utilization.',
    defaultVisible: false,
  },
  {
    id: 'moreTools',
    title: 'More Tools & Insights',
    description: 'Trends, rate calculator, pipeline and AI brief shortcuts.',
    defaultVisible: false,
  },
  {
    id: 'calculatorShortcut',
    title: 'Calculator Shortcut',
    description: 'Quick rate calculator button in the dashboard header.',
    defaultVisible: false,
  },
];

export type DashboardSectionVisibility = Record<DashboardSectionId, boolean>;

export const DEFAULT_DASHBOARD_SECTIONS: DashboardSectionVisibility = {
  kpis: true,
  todayWork: true,
  operationsChart: false,
  moreTools: false,
  calculatorShortcut: false,
};

export function normalizeDashboardSections(value: unknown): DashboardSectionVisibility {
  const normalized: DashboardSectionVisibility = { ...DEFAULT_DASHBOARD_SECTIONS };
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return normalized;
  }
  const record = value as Record<string, unknown>;
  for (const section of DASHBOARD_SECTIONS) {
    if (typeof record[section.id] === 'boolean') {
      normalized[section.id] = record[section.id] as boolean;
    }
  }
  return normalized;
}
