I have created the following plan after thorough exploration and analysis of the codebase. Follow the below plan verbatim. Trust the files and references. Do not re-verify what's written in the plan. Explore only when absolutely necessary. First implement all the proposed file changes and then I'll review all the changes together at the end.

## Observations

The JACXI Shipping platform is a mature Next.js 14 app using Material UI + Tailwind CSS + a custom design system (`src/components/design-system`). Many foundational UI/UX features are already in place: skeleton loaders, toast notifications, breadcrumbs, `DataTable` with bulk actions, `StatusBadge`, `CommandPalette`, `NotificationCenter`, dark mode tokens, and mobile `BottomNavigation`. The main gaps are: (1) inconsistent status badge rendering in the containers card view vs. the design system's `StatusBadge`, (2) the native `<select>` filter in the containers page lacks design-system styling, (3) the `PageHeader` component has no breadcrumb integration, (4) the `DataTable` footer only shows a count but no page-level pagination, and (5) the `Sidebar` has no user avatar/name footer section.

## Approach

Focus on targeted, high-impact polish that closes the visible inconsistencies and adds missing UX affordances — without introducing new libraries or architectural changes. All changes stay within the existing MUI + Tailwind + design-system patterns already established in the codebase.

---

## Implementation Plan

### 1. Fix Inconsistent Status Badge in Containers Card View

**File:** `file:src/app/dashboard/containers/page.tsx`

The container cards use a local `statusColors` map and raw `Box` styling instead of the shared `StatusBadge` component. Replace the inline status chip inside each container card's header with `<StatusBadge status={container.status} size="sm" />` (already imported on line 11). Remove the local `statusColors` constant entirely since `StatusBadge` already covers all container statuses.

---

### 2. Replace Native `<select>` with Design-System-Styled Select

**File:** `file:src/app/dashboard/containers/page.tsx`

The status filter uses a raw `<select>` with inline styles that don't adapt to dark mode or match the design system's border-radius and focus ring. Replace it with the `Select` component exported from `file:src/components/design-system/index.ts` (already available as `Select` with `SelectOption` type). Pass `containerStatusOptions` (already built on line 279) as the `options` prop, and add an "All Status" option with value `"all"`.

---

### 3. Add User Identity Footer to Sidebar

**File:** `file:src/components/dashboard/Sidebar.tsx`

The `SidebarContent` function renders only the navigation list with no bottom anchor. Add a sticky footer section at the bottom of the sidebar (below the scrollable nav `Box`) that shows:
- The user's avatar initial (matching the `Header` avatar style — gold background, `var(--background)` text)
- The user's `name` and `role` from `session`
- A compact `Sign Out` button using `signOut` from `next-auth/react`

Use MUI `Box` with `borderTop: '1px solid var(--border)'` and `px: 1.5, py: 1.5` for spacing, consistent with the existing sidebar padding.

---

### 4. Integrate Breadcrumbs into `PageHeader`

**File:** `file:src/components/design-system/PageHeader.tsx`

Currently, pages manually render `<Breadcrumbs />` in a separate `Box` above `PageHeader` (e.g., shipments page lines 274–276, containers page lines 346–348). Add an optional `showBreadcrumbs?: boolean` prop to `PageHeader`. When `true`, render `<Breadcrumbs />` (imported from `./Breadcrumbs`) above the title row. This removes the boilerplate from every page and ensures consistent spacing.

Update the following pages to remove their standalone breadcrumb `Box` and pass `showBreadcrumbs` to `PageHeader`:
- `file:src/app/dashboard/shipments/page.tsx` — move breadcrumb into `ShipmentsSearchPanel` or the `PageHeader` call
- `file:src/app/dashboard/containers/page.tsx` — remove lines 346–348, add `showBreadcrumbs` to `PageHeader`

---

### 5. Add "No Results" Illustration to `DataTable` Empty State

**File:** `file:src/components/ui/DataTable.tsx`

The current empty state (line 382–390) is a plain centered text cell. Replace it with a richer empty state that uses the `EmptyState` component from `file:src/components/design-system/index.ts`. Render it inside a `<td colSpan={...}>` with `py: 8`. Pass a `Search` icon from `lucide-react` (already imported in the project), a title of `"No results found"`, and a description of `"Try adjusting your search or filters"`.

---

### 6. Add Pagination Info to `DataTable` Footer

**File:** `file:src/components/ui/DataTable.tsx`

The footer (lines 483–488) shows `"Showing X results"` but has no page context when the parent controls pagination externally. Add two optional props to `DataTableProps`:
- `currentPage?: number`
- `totalPages?: number`

When both are provided, render `"Page X of Y"` in the footer alongside the existing results count. This surfaces pagination context directly in the table without requiring the parent to duplicate it.

---

### 7. Improve `DashboardKpiGrid` Trend Indicator Accessibility

**File:** `file:src/components/dashboard/DashboardKpiGrid.tsx`

Locate the trend arrow/percentage display in the KPI cards. Ensure the trend indicator has an `aria-label` attribute (e.g., `aria-label="Trend: +12% increase"`) so screen readers can interpret the directional icon. Use the existing `shipmentTrend.isPositive` and `shipmentTrend.value` props already passed to the component.

---

### 8. Standardize the Containers Page Filter Panel

**File:** `file:src/app/dashboard/containers/page.tsx`

The "Search & Filter" `DashboardPanel` (lines 414–465) uses `FormField` for search but a raw `<select>` for status. After step 2 above, also:
- Remove the manual `Typography` label for "Status Filter" and let the `Select` component's built-in `label` prop handle it
- Wrap the search `FormField` in a `form` with `onSubmit={handleSearch}` (already done) but add a visually hidden submit button so pressing Enter triggers search on mobile keyboards

---

### 9. Add Active Route Highlight to `BottomNavigation`

**File:** `file:src/components/mobile/BottomNavigation.tsx`

Verify that the active tab uses `var(--accent-gold)` for both the icon and label text (matching the sidebar's active state). If the active indicator is only on the icon, extend it to the label text as well for visual consistency with the desktop sidebar's gold active state.

---

### 10. Ensure Dark Mode Compatibility for Finance Page Inline Styles

**File:** `file:src/app/dashboard/finance/page.tsx`

The "Paid Shipments" and "Due Shipments" boxes (lines 219–249) use Tailwind `dark:` variants (`dark:border-green-800/30`, `dark:bg-green-900/10`) which require the `dark` class on the `<html>` element. The existing dark mode uses `.dark-mode` and `.dark` classes (per `globals.css`). Verify the `ThemeToggle` component in `file:src/components/design-system/ThemeToggle.tsx` applies the `dark` class to `<html>` so these Tailwind dark variants activate correctly. If it applies only `.dark-mode`, add `.dark` class toggling alongside it.

---

### Summary of Changes

| # | File | Change Type |
|---|------|-------------|
| 1 | `containers/page.tsx` | Replace local status chip with `StatusBadge` |
| 2 | `containers/page.tsx` | Replace `<select>` with design-system `Select` |
| 3 | `Sidebar.tsx` | Add user identity footer with sign-out |
| 4 | `PageHeader.tsx` | Add `showBreadcrumbs` prop |
| 5 | `DataTable.tsx` | Richer empty state via `EmptyState` |
| 6 | `DataTable.tsx` | Add `currentPage`/`totalPages` footer props |
| 7 | `DashboardKpiGrid.tsx` | Add `aria-label` to trend indicators |
| 8 | `containers/page.tsx` | Standardize filter panel label handling |
| 9 | `BottomNavigation.tsx` | Extend active gold highlight to label text |
| 10 | `finance/page.tsx` + `ThemeToggle.tsx` | Verify `dark` class for Tailwind dark variants |