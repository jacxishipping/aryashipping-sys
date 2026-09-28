/**
 * Design System Components
 * 
 * Import all design system components from this central location.
 * All components follow consistent APIs and use design tokens.
 * 
 * @version 2.0.0 - Phase 4 Enhancements
 */

// Form Components
export { default as FormField } from './FormField';
export { default as Select } from './Select';
export type { SelectOption, SelectProps } from './Select';

// Button Components
export { default as Button, IconButton } from './Button';
export type { ButtonProps, IconButtonProps } from './Button';
export { default as ActionButton } from './ActionButton'; // Legacy - use Button instead

// Status & Feedback
export { default as StatusBadge, ShipmentStatusBadge, PaymentStatusBadge } from './StatusBadge';
export type { 
  StatusBadgeProps, 
  ShipmentStatus, 
  PaymentStatus, 
  GenericStatus, 
  StatusType 
} from './StatusBadge';

export { default as Alert } from './Alert';
export type { AlertProps, AlertSeverity, AlertVariant } from './Alert';

export { default as LoadingState } from './LoadingState';
export { default as EmptyState } from './EmptyState';

// Layout Components
export { default as StatsCard } from './StatsCard';
export { default as PageHeader } from './PageHeader';
export { Table } from './Table';
export { MobileCard } from './MobileCard';

// Overlay Components
export { default as Modal, ConfirmDialog } from './Modal';
export type { ModalProps, ConfirmDialogProps } from './Modal';
export { default as Drawer } from './Drawer';
export type { DrawerProps } from './Drawer';
export { default as MilestoneStepper } from './MilestoneStepper';
export type { MilestoneStep, MilestoneStepperProps } from './MilestoneStepper';

// Toast Notifications (Phase 4)
export { Toaster, toast } from './Toast';

// Navigation (Phase 4)
export { default as Breadcrumbs, BreadcrumbsCompact } from './Breadcrumbs';
export type { BreadcrumbItem } from './Breadcrumbs';

// Loading States (Phase 4)
export { 
  Skeleton,
  SkeletonText,
  SkeletonParagraph,
  SkeletonAvatar,
  SkeletonCard,
  SkeletonTable,
  SkeletonTableRow,
  SkeletonStatsCard,
  SkeletonFormField,
  SkeletonImage,
  SkeletonGroup
} from './Skeleton';

// Page Skeletons (Phase 4)
export {
  DashboardPageSkeleton,
  DetailPageSkeleton,
  FormPageSkeleton,
  CompactSkeleton,
  TableSkeleton,
  StatsGridSkeleton,
} from './PageSkeletons';

// Tooltips (Phase 4)
export { default as Tooltip, InfoTooltip } from './Tooltip';
export type { TooltipProps } from './Tooltip';

// Theme (Phase 4)
export { ThemeToggle } from './ThemeToggle';

// Keyboard Shortcuts (Phase 4)
export { default as KeyboardShortcutHelp } from './KeyboardShortcutHelp';

// Operational Productivity Primitives
export { default as CopyButton } from '@/components/ui/CopyButton';
export { default as StatusFilterPills } from '@/components/ui/StatusFilterPills';
