export const DISPATCH_EXPENSE_CATEGORY_OPTIONS = [
  { value: 'TRANSPORT', label: 'Transport' },
  { value: 'PORT', label: 'Port & Terminal' },
  { value: 'COMPLIANCE', label: 'Compliance & Customs' },
  { value: 'STORAGE', label: 'Storage & Handling' },
  { value: 'DOCUMENTATION', label: 'Documentation' },
  { value: 'INCIDENTAL', label: 'Incidental' },
] as const;

export const DISPATCH_EXPENSE_TYPE_OPTIONS = {
  TRANSPORT: [
    { value: 'LINE_HAUL', label: 'Line Haul' },
    { value: 'FUEL_SURCHARGE', label: 'Fuel Surcharge' },
    { value: 'DRIVER_LAYOVER', label: 'Driver Layover' },
    { value: 'ESCORT_SERVICE', label: 'Escort Service' },
  ],
  PORT: [
    { value: 'PORT_ENTRY', label: 'Port Entry' },
    { value: 'TERMINAL_HANDLING', label: 'Terminal Handling' },
    { value: 'GATE_PASS', label: 'Gate Pass' },
    { value: 'CHASSIS_RENTAL', label: 'Chassis Rental' },
  ],
  COMPLIANCE: [
    { value: 'CUSTOMS_CLEARANCE', label: 'Customs Clearance' },
    { value: 'INSPECTION', label: 'Inspection' },
    { value: 'SECURITY_SCREENING', label: 'Security Screening' },
    { value: 'BOND_FEE', label: 'Bond Fee' },
  ],
  STORAGE: [
    { value: 'YARD_STORAGE', label: 'Yard Storage' },
    { value: 'HANDLING_FEE', label: 'Handling Fee' },
    { value: 'LOADING_LABOR', label: 'Loading Labor' },
    { value: 'CRANE_FORKLIFT', label: 'Crane / Forklift' },
  ],
  DOCUMENTATION: [
    { value: 'PAPERWORK', label: 'Paperwork' },
    { value: 'TITLE_PROCESSING', label: 'Title Processing' },
    { value: 'RELEASE_ORDER', label: 'Release Order' },
    { value: 'INVOICE_FEE', label: 'Invoice Fee' },
  ],
  INCIDENTAL: [
    { value: 'TOLL', label: 'Toll' },
    { value: 'REPAIR', label: 'Repair' },
    { value: 'INSURANCE', label: 'Insurance' },
    { value: 'OTHER', label: 'Other' },
  ],
} as const;

export type DispatchExpenseCategory = keyof typeof DISPATCH_EXPENSE_TYPE_OPTIONS;

export const DEFAULT_DISPATCH_EXPENSE_CATEGORY: DispatchExpenseCategory = 'TRANSPORT';

const DISPATCH_EXPENSE_INVOICE_REGEX = /^[A-Za-z0-9][A-Za-z0-9/_\-.]{2,39}$/;

export function getDispatchExpenseTypes(category: DispatchExpenseCategory) {
  return DISPATCH_EXPENSE_TYPE_OPTIONS[category];
}

export function isDispatchExpenseCategory(value: string): value is DispatchExpenseCategory {
  return value in DISPATCH_EXPENSE_TYPE_OPTIONS;
}

export function isDispatchExpenseTypeForCategory(category: DispatchExpenseCategory, type: string) {
  return DISPATCH_EXPENSE_TYPE_OPTIONS[category].some((option) => option.value === type);
}

export function getDispatchExpenseCategoryLabel(category: string) {
  return DISPATCH_EXPENSE_CATEGORY_OPTIONS.find((option) => option.value === category)?.label ?? category;
}

export function getDispatchExpenseTypeLabel(category: DispatchExpenseCategory, type: string) {
  return DISPATCH_EXPENSE_TYPE_OPTIONS[category].find((option) => option.value === type)?.label ?? type;
}

export function normalizeOptionalDispatchExpenseText(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function isValidDispatchExpenseInvoiceNumber(value: string) {
  return DISPATCH_EXPENSE_INVOICE_REGEX.test(value);
}