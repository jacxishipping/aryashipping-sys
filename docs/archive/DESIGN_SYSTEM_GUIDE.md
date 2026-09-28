# Jacxi Dashboard Design System

## Overview
This design system provides a consistent, professional UI across all dashboard pages, based on the existing dashboard, shipments, and signin page designs.

## Core Design Principles

### 1. **Color Palette**
- **Background**: `var(--background)` - Main page background
- **Panel**: `var(--panel)` - Card/Panel backgrounds  
- **Border**: `var(--border)` - Border colors
- **Text Primary**: `var(--text-primary)` - Main text color
- **Text Secondary**: `var(--text-secondary)` - Secondary/muted text
- **Accent Gold**: `var(--accent-gold)` - Primary action color
- **Error**: `var(--error)` - Error states

### 2. **Typography**
- **Page Titles**: 1.5rem - 2rem, font-weight: 600
- **Section Titles**: 0.95rem, font-weight: 600
- **Body Text**: 0.85rem - 0.95rem
- **Small Text**: 0.75rem - 0.8rem
- **Labels**: 0.65rem - 0.75rem, uppercase, letter-spacing: 0.15em

### 3. **Spacing**
- **Padding**: 1.5rem - 2rem for cards
- **Gap**: 0.75rem - 1.5rem for grids
- **Border Radius**: 2 (16px in MUI theme)

### 4. **Shadows**
- **Cards**: `0 12px 30px rgba(var(--text-primary-rgb), 0.08)`
- **Panels**: `0 16px 40px rgba(var(--text-primary-rgb), 0.08)`
- **Hover**: Slightly increased shadow values

## Components

### Layout Components

#### DashboardSurface
```tsx
import { DashboardSurface } from '@/components/dashboard/DashboardSurface';

<DashboardSurface>
  {/* Page content */}
</DashboardSurface>
```

#### DashboardPanel
```tsx
import { DashboardPanel } from '@/components/dashboard/DashboardSurface';

<DashboardPanel
  title="Panel Title"
  description="Optional description"
  actions={<ActionButton>Action</ActionButton>}
  fullHeight={false}
>
  {/* Panel content */}
</DashboardPanel>
```

#### DashboardGrid
```tsx
import { DashboardGrid } from '@/components/dashboard/DashboardSurface';

<DashboardGrid className="grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
  {/* Grid items */}
</DashboardGrid>
```

### Design System Components

#### PageHeader
```tsx
import { PageHeader } from '@/components/design-system';

<PageHeader
  title="Page Title"
  description="Page description"
  actions={<ActionButton>Action</ActionButton>}
  meta={[
    { label: 'Total', value: 100 },
    { label: 'Active', value: 50 }
  ]}
/>
```

#### StatsCard
```tsx
import { StatsCard } from '@/components/design-system';
import { TrendingUp } from 'lucide-react';

<StatsCard
  icon={<TrendingUp style={{ fontSize: 18 }} />}
  title="Total Sales"
  value="$1,234"
  subtitle="Last 30 days"
  delay={0.1}
/>
```

#### FormField
```tsx
import { FormField } from '@/components/design-system';
import { Email } from '@mui/icons-material';

<FormField
  id="email"
  label="Email Address"
  type="email"
  placeholder="Enter your email"
  leftIcon={<Email sx={{ fontSize: 20 }} />}
  helperText="We'll never share your email"
/>
```

#### ActionButton
```tsx
import { ActionButton } from '@/components/design-system';
import { Plus } from 'lucide-react';

<ActionButton
  variant="primary" // primary | secondary | outline | ghost
  icon={<Plus className="w-4 h-4" />}
  iconPosition="start" // start | end
  size="small"
>
  Create New
</ActionButton>
```

#### EmptyState
```tsx
import { EmptyState } from '@/components/design-system';
import { Inbox } from '@mui/icons-material';

<EmptyState
  icon={<Inbox />}
  title="No items found"
  description="Get started by creating your first item"
  action={<ActionButton>Create Item</ActionButton>}
/>
```

#### LoadingState
```tsx
import { LoadingState } from '@/components/design-system';

<LoadingState 
  message="Loading data..." 
  fullScreen={false}
/>
```

## Form Input Pattern (from Signin Page)

```tsx
<TextField
  fullWidth
  InputProps={{
    startAdornment: (
      <InputAdornment position="start">
        <Icon sx={{ fontSize: 20, color: 'var(--text-secondary)' }} />
      </InputAdornment>
    ),
  }}
  sx={{
    '& .MuiOutlinedInput-root': {
      bgcolor: 'var(--background)',
      borderRadius: 2,
      color: 'var(--text-primary)',
      '& fieldset': {
        borderColor: 'rgba(var(--border-rgb), 0.9)',
      },
      '&:hover fieldset': {
        borderColor: 'var(--border)',
      },
      '&.Mui-focused fieldset': {
        borderColor: 'var(--accent-gold)',
        borderWidth: 2,
      },
      '& input': {
        color: 'var(--text-primary)',
        '&::placeholder': {
          color: 'var(--text-secondary)',
          opacity: 1,
        },
      },
    },
  }}
/>
```

## Page Structure Template

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { DashboardSurface, DashboardPanel, DashboardGrid } from '@/components/dashboard/DashboardSurface';
import { PageHeader, StatsCard, ActionButton, EmptyState, LoadingState } from '@/components/design-system';

export default function PageName() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  // Check auth
  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.replace('/auth/signin');
      return;
    }
    fetchData();
  }, [session, status, router]);

  // Loading state
  if (status === 'loading' || loading) {
    return <LoadingState fullScreen message="Loading..." />;
  }

  // Main content
  return (
    <DashboardSurface>
      {/* Header */}
      <PageHeader
        title="Page Title"
        description="Page description"
        actions={<ActionButton>Action</ActionButton>}
      />

      {/* Stats */}
      <DashboardGrid className="grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard icon={<Icon />} title="Stat 1" value={100} />
        <StatsCard icon={<Icon />} title="Stat 2" value={200} delay={0.1} />
      </DashboardGrid>

      {/* Content */}
      <DashboardPanel title="Content Title" fullHeight>
        {/* Panel content */}
      </DashboardPanel>
    </DashboardSurface>
  );
}
```

## Responsive Design

All components are responsive by default using MUI's `sx` prop breakpoints:
- `xs`: Extra small (mobile)
- `sm`: Small (tablet)
- `md`: Medium (desktop)
- `lg`: Large (wide desktop)

Example:
```tsx
sx={{
  fontSize: { xs: '0.85rem', sm: '0.9rem', md: '0.95rem' },
  padding: { xs: 1.5, sm: 2, md: 2.5 }
}}
```

## Animation Patterns

Use Framer Motion `Fade` for cards and components:
```tsx
import { Fade } from '@mui/material';

<Fade in={isVisible} timeout={600}>
  <Box>{/* Content */}</Box>
</Fade>
```

Or use delays for staggered animations:
```tsx
delay={index * 0.1} // 100ms delay between each item
```

## Best Practices

1. **Always use design system components** when available
2. **Consistent spacing**: Use MUI's spacing scale (0.5, 1, 1.5, 2, etc.)
3. **Color variables**: Always use CSS variables for colors
4. **Typography hierarchy**: Follow the typography scale
5. **Loading states**: Always show loading indicators during data fetching
6. **Empty states**: Provide clear empty states with call-to-action
7. **Responsive**: Test on mobile, tablet, and desktop
8. **Accessibility**: Use semantic HTML and ARIA labels
9. **Icons**: Use lucide-react or @mui/icons-material consistently
10. **Hover states**: Add hover effects for interactive elements

## Migration Checklist

When updating an existing page:
- [ ] Replace custom cards with `DashboardPanel`
- [ ] Replace page wrapper with `DashboardSurface`
- [ ] Use `PageHeader` for page title and actions
- [ ] Use `StatsCard` for metrics
- [ ] Use `ActionButton` for buttons
- [ ] Use `FormField` for form inputs
- [ ] Add `LoadingState` and `EmptyState`
- [ ] Ensure responsive design with proper breakpoints
- [ ] Test hover states and transitions
- [ ] Verify color consistency with CSS variables
