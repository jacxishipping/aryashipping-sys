# Phase 4 Component Examples

Complete usage examples for all Phase 4 components.

---

## 🎉 Toast Notifications

### Basic Toasts
```tsx
import { toast } from '@/components/design-system';

// Success
function handleSuccess() {
  toast.success('Container created successfully!');
}

// Error
function handleError() {
  toast.error('Failed to create container');
}

// Warning
function handleWarning() {
  toast.warning('Container is almost full');
}

// Info
function handleInfo() {
  toast.info('New update available');
}
```

### Toast with Description
```tsx
toast.error('Failed to create container', {
  description: 'Please check your network connection and try again'
});

toast.success('Shipment updated', {
  description: 'All changes have been saved successfully'
});
```

### Promise Toast (Loading State)
```tsx
async function createShipment(data) {
  await toast.promise(
    api.createShipment(data),
    {
      loading: 'Creating shipment...',
      success: 'Shipment created successfully!',
      error: 'Failed to create shipment',
    }
  );
}

// With custom duration
toast.promise(
  fetch('/api/containers').then(res => res.json()),
  {
    loading: 'Fetching containers...',
    success: (data) => `Loaded ${data.length} containers`,
    error: (err) => `Error: ${err.message}`,
  }
);
```

### Toast with Action Button
```tsx
import { useRouter } from 'next/navigation';

function handleShipmentUpdate() {
  const router = useRouter();
  
  toast.action('Shipment updated', {
    action: {
      label: 'View',
      onClick: () => router.push('/dashboard/shipments/123')
    },
    description: 'Click to view updated shipment details'
  });
}
```

### Setup (Required Once)
```tsx
// app/layout.tsx
import { Toaster } from '@/components/design-system';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
```

---

## 🧭 Breadcrumbs

### Auto-generated from URL
```tsx
// app/dashboard/shipments/[id]/page.tsx
import { Breadcrumbs } from '@/components/design-system';

export default function ShipmentPage() {
  return (
    <div>
      <Breadcrumbs />
      {/* URL: /dashboard/shipments/123 
          Renders: Home > Dashboard > Shipments > 123 */}
    </div>
  );
}
```

### Manual Breadcrumbs
```tsx
import { Breadcrumbs } from '@/components/design-system';

const breadcrumbs = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Shipments', href: '/dashboard/shipments' },
  { label: 'International', href: '/dashboard/shipments?type=international' },
  { label: 'SHP-2024-001', href: '/dashboard/shipments/123' }
];

<Breadcrumbs items={breadcrumbs} />
```

### Compact Variant (Mobile)
```tsx
import { BreadcrumbsCompact } from '@/components/design-system';

// Only shows parent > current (space-saving)
<BreadcrumbsCompact />
```

### Without Home Link
```tsx
<Breadcrumbs showHome={false} />
```

### Custom Home Label
```tsx
<Breadcrumbs homeLabel="Dashboard" />
```

---

## 💀 Skeleton Loaders

### Basic Skeleton
```tsx
import { Skeleton } from '@/components/design-system';

// Text line
<Skeleton variant="text" width="80%" />

// Rectangle
<Skeleton variant="rectangular" width={200} height={100} />

// Circle (avatar)
<Skeleton variant="circular" width={40} height={40} />

// Rounded
<Skeleton variant="rounded" width="100%" height={200} />
```

### Wave Animation
```tsx
<Skeleton variant="rectangular" width="100%" height={200} animation="wave" />
```

### Pre-built Content Skeletons

#### Text & Paragraphs
```tsx
import { SkeletonText, SkeletonParagraph } from '@/components/design-system';

// Single line
<SkeletonText width="60%" />

// Multiple lines
<SkeletonParagraph lines={3} />
<SkeletonParagraph lines={5} />
```

#### Avatar
```tsx
import { SkeletonAvatar } from '@/components/design-system';

<SkeletonAvatar size={40} />
<SkeletonAvatar size={64} />
```

#### Card
```tsx
import { SkeletonCard } from '@/components/design-system';

// Full card with avatar + text + buttons
<SkeletonCard />
```

#### Stats Card
```tsx
import { SkeletonStatsCard } from '@/components/design-system';

<SkeletonStatsCard />
```

#### Table
```tsx
import { SkeletonTable, SkeletonTableRow } from '@/components/design-system';

// Full table
<SkeletonTable rows={5} columns={4} />

// Single row
<SkeletonTableRow columns={6} />
```

#### Form Field
```tsx
import { SkeletonFormField } from '@/components/design-system';

<SkeletonFormField />
<SkeletonFormField />
<SkeletonFormField />
```

#### Image
```tsx
import { SkeletonImage } from '@/components/design-system';

// Fixed dimensions
<SkeletonImage width={300} height={200} />

// Aspect ratio
<SkeletonImage aspectRatio="16/9" />
<SkeletonImage aspectRatio="4/3" />
```

#### Group Container
```tsx
import { SkeletonGroup, SkeletonCard } from '@/components/design-system';

<SkeletonGroup>
  <SkeletonCard />
  <SkeletonCard />
  <SkeletonCard />
</SkeletonGroup>
```

### Real-world Example
```tsx
import { SkeletonCard, SkeletonStatsCard } from '@/components/design-system';

function DashboardPage() {
  const { data, loading } = useDashboardData();

  if (loading) {
    return (
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          <SkeletonStatsCard />
          <SkeletonStatsCard />
          <SkeletonStatsCard />
          <SkeletonStatsCard />
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 24 }}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  return <Dashboard data={data} />;
}
```

---

## 💬 Tooltips

### Basic Tooltip
```tsx
import { Tooltip } from '@/components/design-system';

<Tooltip title="Delete shipment">
  <IconButton icon={<Delete />} />
</Tooltip>
```

### With Placement
```tsx
// 12 placement options
<Tooltip title="Bottom tooltip" placement="bottom">
  <Button>Hover me</Button>
</Tooltip>

<Tooltip title="Right tooltip" placement="right">
  <Button>Hover me</Button>
</Tooltip>

<Tooltip title="Top start" placement="top-start">
  <Button>Hover me</Button>
</Tooltip>
```

### Custom Delay
```tsx
<Tooltip title="Appears after 500ms" delay={500}>
  <Button>Hover me</Button>
</Tooltip>
```

### Without Arrow
```tsx
<Tooltip title="No arrow" arrow={false}>
  <Button>Hover me</Button>
</Tooltip>
```

### Info Tooltip (Inline Help)
```tsx
import { InfoTooltip } from '@/components/design-system';

<Typography>
  Container Capacity 
  <InfoTooltip content="Maximum number of vehicles this container can hold" />
</Typography>

<label>
  Voyage Number
  <InfoTooltip 
    content="Unique identifier for the ship's journey" 
    placement="right"
  />
</label>
```

### Real-world Example
```tsx
import { Tooltip, InfoTooltip } from '@/components/design-system';

function ShipmentActions({ shipment }) {
  return (
    <div>
      <Typography variant="h6">
        Shipment Details
        <InfoTooltip content="All information about this shipment" />
      </Typography>
      
      <Tooltip title="Edit shipment details">
        <IconButton icon={<Edit />} onClick={handleEdit} />
      </Tooltip>
      
      <Tooltip title="Delete shipment (cannot be undone)" placement="top">
        <IconButton icon={<Delete />} onClick={handleDelete} />
      </Tooltip>
      
      <Tooltip title="Download shipment documents">
        <IconButton icon={<Download />} onClick={handleDownload} />
      </Tooltip>
    </div>
  );
}
```

---

## 🌙 Dark Mode

### Theme Toggle Button
```tsx
// Add to your header/navigation
import { ThemeToggle } from '@/components/design-system';

function Header() {
  return (
    <header>
      <nav>
        <Logo />
        <NavigationLinks />
        <ThemeToggle />
      </nav>
    </header>
  );
}
```

### Manual Theme Control
```tsx
"use client";

import { useEffect, useState } from 'react';

function MyComponent() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Apply theme
  const applyTheme = (newTheme: 'light' | 'dark') => {
    const root = document.documentElement;
    
    if (newTheme === 'dark') {
      root.classList.add('dark-mode');
      root.classList.remove('light-mode');
    } else {
      root.classList.add('light-mode');
      root.classList.remove('dark-mode');
    }
    
    localStorage.setItem('theme', newTheme);
  };

  // Toggle theme
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    applyTheme(newTheme);
  };

  return (
    <button onClick={toggleTheme}>
      Toggle Theme
    </button>
  );
}
```

### Using Dark Mode Colors
```tsx
// In your components, use CSS variables
const styles = {
  backgroundColor: 'var(--background)',
  color: 'var(--text-primary)',
  border: '1px solid var(--border)',
};

// Or with MUI sx prop
<Box
  sx={{
    bgcolor: 'var(--panel)',
    color: 'var(--text-primary)',
    borderColor: 'var(--border)',
  }}
>
  Content
</Box>
```

---

## ⌨️ Keyboard Shortcuts

### Basic Shortcut
```tsx
import { useKeyboardShortcut } from '@/lib/hooks';

function MyComponent() {
  // Ctrl+S to save
  useKeyboardShortcut(
    { key: 's', ctrl: true },
    () => {
      console.log('Save triggered!');
      handleSave();
    }
  );

  return <div>Press Ctrl+S to save</div>;
}
```

### Multiple Keys for Same Action
```tsx
import { useKeyboardShortcut } from '@/lib/hooks';

function MyComponent() {
  // Works on both Windows (Ctrl+S) and Mac (Cmd+S)
  useKeyboardShortcut(
    [
      { key: 's', ctrl: true },  // Windows/Linux
      { key: 's', meta: true }   // Mac
    ],
    () => handleSave()
  );
}
```

### Common Shortcuts
```tsx
import { useKeyboardShortcut, commonShortcuts } from '@/lib/hooks';

function MyPage() {
  useKeyboardShortcut(commonShortcuts.save, handleSave);
  useKeyboardShortcut(commonShortcuts.search, openSearch);
  useKeyboardShortcut(commonShortcuts.refresh, refresh);
  useKeyboardShortcut(commonShortcuts.escape, closeModal);
  useKeyboardShortcut(commonShortcuts.delete, deleteItem);
}
```

### Conditional Shortcut
```tsx
function ModalComponent() {
  const [isOpen, setIsOpen] = useState(false);

  // Only active when modal is open
  useKeyboardShortcut(
    { key: 'Escape' },
    () => setIsOpen(false),
    { enabled: isOpen }
  );

  return (
    <Modal open={isOpen}>
      <p>Press ESC to close</p>
    </Modal>
  );
}
```

### Global Shortcut (Shows in Help Menu)
```tsx
import { useGlobalKeyboardShortcut } from '@/lib/hooks';

function ShipmentPage() {
  useGlobalKeyboardShortcut(
    'save-shipment',           // Unique ID
    { key: 's', ctrl: true },  // Shortcut
    () => handleSave(),        // Handler
    'Save shipment'            // Description (shown in help)
  );
}
```

### Keyboard Shortcut Help Dialog
```tsx
// Add to your layout (shows all shortcuts)
import { KeyboardShortcutHelp } from '@/components/design-system';

function Layout({ children }) {
  return (
    <>
      {children}
      <KeyboardShortcutHelp />
    </>
  );
}
```

### Real-world Example
```tsx
import { 
  useKeyboardShortcut, 
  useGlobalKeyboardShortcut,
  commonShortcuts 
} from '@/lib/hooks';
import { KeyboardShortcutHelp } from '@/components/design-system';

function ShipmentEditor({ shipment }) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Save shortcut
  useGlobalKeyboardShortcut(
    'save-shipment',
    commonShortcuts.save,
    () => handleSave(),
    'Save shipment'
  );

  // Preview shortcut
  useGlobalKeyboardShortcut(
    'toggle-preview',
    { key: 'p', ctrl: true },
    () => setIsPreviewOpen(!isPreviewOpen),
    'Toggle preview'
  );

  // Close preview with Escape
  useKeyboardShortcut(
    commonShortcuts.escape,
    () => setIsPreviewOpen(false),
    { enabled: isPreviewOpen }
  );

  // Delete shortcut (with confirmation)
  useKeyboardShortcut(
    commonShortcuts.delete,
    () => {
      if (confirm('Delete this shipment?')) {
        handleDelete();
      }
    }
  );

  return (
    <>
      <ShipmentForm shipment={shipment} />
      {isPreviewOpen && <Preview shipment={shipment} />}
      <KeyboardShortcutHelp />
    </>
  );
}
```

---

## 🎨 Complete Integration Example

```tsx
"use client";

import { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import {
  Button,
  Breadcrumbs,
  StatusBadge,
  Tooltip,
  InfoTooltip,
  toast,
  SkeletonCard,
  SkeletonStatsCard,
  ThemeToggle,
  KeyboardShortcutHelp,
} from '@/components/design-system';
import { useKeyboardShortcut, commonShortcuts } from '@/lib/hooks';

export default function ShipmentsPage() {
  const [loading, setLoading] = useState(true);
  const [shipments, setShipments] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  // Load data
  useEffect(() => {
    loadShipments();
  }, []);

  const loadShipments = async () => {
    setLoading(true);
    try {
      const data = await fetch('/api/shipments').then(r => r.json());
      setShipments(data);
      toast.success(`Loaded ${data.length} shipments`);
    } catch (error) {
      toast.error('Failed to load shipments', {
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  // Refresh shortcut (Ctrl+R)
  useKeyboardShortcut(
    commonShortcuts.refresh,
    async () => {
      setRefreshing(true);
      await loadShipments();
      setRefreshing(false);
    }
  );

  // Create new shortcut (Ctrl+N)
  useKeyboardShortcut(
    commonShortcuts.newItem,
    () => router.push('/dashboard/shipments/new')
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Breadcrumbs />
          <Typography variant="h4" sx={{ mt: 2, fontWeight: 700 }}>
            Shipments
            <InfoTooltip content="Manage all your international shipments" />
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <ThemeToggle />
          
          <Tooltip title="Refresh data (Ctrl+R)">
            <Button
              variant="outline"
              onClick={loadShipments}
              loading={refreshing}
            >
              Refresh
            </Button>
          </Tooltip>
          
          <Tooltip title="Create new shipment (Ctrl+N)">
            <Button variant="primary" onClick={() => handleCreate()}>
              New Shipment
            </Button>
          </Tooltip>
        </Box>
      </Box>

      {/* Stats */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, mb: 3 }}>
        {loading ? (
          <>
            <SkeletonStatsCard />
            <SkeletonStatsCard />
            <SkeletonStatsCard />
            <SkeletonStatsCard />
          </>
        ) : (
          <>
            <StatsCard label="Total" value={shipments.length} variant="primary" />
            <StatsCard label="In Transit" value={12} variant="info" />
            <StatsCard label="Delivered" value={8} variant="success" />
            <StatsCard label="Pending" value={4} variant="warning" />
          </>
        )}
      </Box>

      {/* Shipments List */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          shipments.map(shipment => (
            <Box
              key={shipment.id}
              sx={{
                p: 2,
                border: '1px solid var(--border)',
                borderRadius: 2,
                bgcolor: 'var(--panel)',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h6">{shipment.title}</Typography>
                  <StatusBadge status={shipment.status} variant="default" />
                </Box>
                
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Tooltip title="View details">
                    <Button variant="ghost" onClick={() => handleView(shipment.id)}>
                      View
                    </Button>
                  </Tooltip>
                  
                  <Tooltip title="Edit shipment">
                    <Button variant="outline" onClick={() => handleEdit(shipment.id)}>
                      Edit
                    </Button>
                  </Tooltip>
                </Box>
              </Box>
            </Box>
          ))
        )}
      </Box>

      {/* Keyboard shortcuts help */}
      <KeyboardShortcutHelp />
    </Box>
  );

  async function handleCreate() {
    toast.promise(
      fetch('/api/shipments', { method: 'POST' }).then(r => r.json()),
      {
        loading: 'Creating shipment...',
        success: 'Shipment created!',
        error: 'Failed to create shipment',
      }
    );
  }
}
```

---

## 📦 Required Setup

### 1. Add Toaster to Layout
```tsx
// app/layout.tsx
import { Toaster } from '@/components/design-system';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
```

### 2. Install Sonner (if not already)
```bash
npm install sonner
```

All components are now ready to use! 🚀
