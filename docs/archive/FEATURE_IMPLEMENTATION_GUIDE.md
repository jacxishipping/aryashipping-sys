# Quick Feature Implementation Guide

## 🎯 How to Use the New Components

### 1. Toast Notifications (Replaces alert())

**Before:**
```typescript
alert('Success!');
```

**After:**
```typescript
import { toast } from '@/lib/toast';
toast.success('Success!', 'Optional description');
toast.error('Error!', 'Something went wrong');
toast.warning('Warning!', 'Please check this');
toast.info('Info', 'Did you know?');
```

---

### 2. Form Validation

**Replace standard inputs with:**
```typescript
import { FormField } from '@/components/ui/FormField';

<FormField
  label="Email"
  type="email"
  error={errors.email}
  isValid={!errors.email && touched.email}
  required
  placeholder="Enter email"
/>
```

---

### 3. Data Tables with Sorting & Selection

```typescript
import { DataTable } from '@/components/ui/DataTable';

<DataTable
  data={shipments}
  columns={[
    { key: 'id', header: 'ID', sortable: true },
    { key: 'status', header: 'Status', sortable: true },
    { 
      key: 'date', 
      header: 'Date', 
      sortable: true,
      render: (value) => new Date(value).toLocaleDateString()
    }
  ]}
  keyField="id"
  selectable
  onRowClick={(row) => router.push(`/shipments/${row.id}`)}
  onDelete={handleDelete}
  onExport={handleExport}
/>
```

---

### 4. Advanced Filters

```typescript
import { FilterBuilder, applyFilters } from '@/components/ui/FilterBuilder';

const [filters, setFilters] = useState([]);
const filteredData = applyFilters(data, filters);

<FilterBuilder
  fields={[
    { key: 'status', label: 'Status', type: 'select', options: statusOptions },
    { key: 'date', label: 'Date', type: 'date' },
    { key: 'amount', label: 'Amount', type: 'number' }
  ]}
  onApply={setFilters}
  onClear={() => setFilters([])}
/>
```

---

### 5. File Upload with Progress

```typescript
import { FileUpload } from '@/components/ui/FileUpload';

<FileUpload
  accept="image/*"
  multiple
  maxSize={10}
  maxFiles={5}
  onUpload={async (files) => {
    // Upload files to server
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    await fetch('/api/upload', { method: 'POST', body: formData });
  }}
/>
```

---

### 6. Comments System

```typescript
import { CommentSection } from '@/components/ui/CommentSection';

<CommentSection
  comments={comments}
  onAddComment={async (content) => {
    await fetch('/api/comments', {
      method: 'POST',
      body: JSON.stringify({ content, shipmentId })
    });
  }}
  onEditComment={async (id, content) => {
    await fetch(`/api/comments/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ content })
    });
  }}
  onDeleteComment={async (id) => {
    await fetch(`/api/comments/${id}`, { method: 'DELETE' });
  }}
  currentUser={{ name: session.user.name, avatar: session.user.image }}
/>
```

---

### 7. Mobile Card View (Responsive)

```typescript
import { ResponsiveDataView } from '@/components/ui/MobileCardView';
import { DataTable } from '@/components/ui/DataTable';

<ResponsiveDataView
  data={shipments}
  TableComponent={DataTable}
  tableProps={{ columns, keyField: 'id' }}
  renderMobileCard={(shipment) => [
    { label: 'VIN', value: shipment.vin, primary: true },
    { label: 'Status', value: shipment.status },
    { label: 'Origin', value: shipment.origin },
    { label: 'Destination', value: shipment.destination }
  ]}
  keyField="id"
  onItemClick={(item) => router.push(`/shipments/${item.id}`)}
/>
```

---

### 8. Onboarding Tours

```typescript
import { useOnboardingTour } from '@/components/ui/OnboardingTour';

const MyPage = () => {
  const { startTour, isCompleted } = useOnboardingTour('my-page');

  useEffect(() => {
    if (!isCompleted) {
      startTour([
        {
          element: '#step-1',
          popover: {
            title: 'Welcome!',
            description: 'This is the first step'
          }
        },
        {
          element: '#step-2',
          popover: {
            title: 'Next Feature',
            description: 'Click here to do this'
          }
        }
      ]);
    }
  }, [isCompleted]);

  return (
    <div>
      <button id="step-1">Click me</button>
      <div id="step-2">Feature here</div>
    </div>
  );
};
```

---

### 9. Keyboard Shortcuts

**In your page component:**
```typescript
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

const MyPage = () => {
  useKeyboardShortcuts([
    {
      key: 'n',
      meta: true,
      action: () => router.push('/new'),
      description: 'Create new item',
      category: 'Actions'
    },
    {
      key: 's',
      ctrl: true,
      action: handleSave,
      description: 'Save changes',
      category: 'Actions'
    }
  ]);

  return <div>...</div>;
};
```

**Global shortcuts are already set up:**
- ⌘K → Command Palette
- ? → Shortcuts Help
- ⌘H → Dashboard
- ⌘S → Shipments
- etc.

---

### 10. Skeleton Loaders

```typescript
import { SkeletonCard, SkeletonTable } from '@/components/ui/Skeleton';

{loading ? (
  <>
    <SkeletonCard />
    <SkeletonCard />
  </>
) : (
  data.map(item => <Card key={item.id} {...item} />)
)}
```

---

### 11. Optimized Images

```typescript
import { OptimizedImage } from '@/components/ui/OptimizedImage';

<OptimizedImage
  src="/path/to/image.jpg"
  alt="Description"
  width={400}
  height={300}
  objectFit="cover"
  quality={80}
/>
```

---

### 12. Charts

```typescript
import { ShipmentTrendsChart } from '@/components/charts/ShipmentTrendsChart';

<ShipmentTrendsChart
  data={[
    { date: '2025-01', shipments: 50, delivered: 45 },
    { date: '2025-02', shipments: 75, delivered: 70 }
  ]}
/>
```

---

## 🎨 Theming

All components use CSS variables. To customize colors:

```css
:root {
  --accent-gold: #YOUR_COLOR;
  --background: #YOUR_BG;
  --text-primary: #YOUR_TEXT;
  /* ... etc */
}
```

---

## 📱 Mobile-First

All components are responsive by default:
- Tables → Cards on mobile
- Bottom navigation appears < 1024px
- Touch targets are 44x44px minimum
- Drawer patterns for modals on mobile

---

## ⌨️ Accessibility

All components include:
- ARIA labels
- Keyboard navigation
- Focus management
- Screen reader support
- Color contrast compliance

---

## 🚀 Performance Tips

1. **Lazy Load**: Use `OptimizedImage` for all images
2. **Code Split**: Dynamic imports for heavy components
3. **Memoize**: Use `useMemo` for expensive computations
4. **Debounce**: Filters and search inputs
5. **Virtualize**: Large lists with `react-window`

---

## 🐛 Common Issues

### "Module not found"
```bash
npm install
```

### TypeScript errors
```bash
npm run build
```

### Styles not applying
Check that CSS variables are defined in `:root` and `[data-theme='dark']`

---

## 📚 Additional Resources

- [Sonner Docs](https://sonner.emilkowal.ski/)
- [Recharts Docs](https://recharts.org/)
- [Driver.js Docs](https://driverjs.com/)
- [cmdk Docs](https://cmdk.paco.me/)

---

## 💡 Pro Tips

1. **Command Palette**: Add your own commands to `/src/components/ui/CommandPalette.tsx`
2. **Custom Themes**: Create theme variants in `globals.css`
3. **Export Templates**: Customize PDF layouts in `/src/lib/pdfGenerator.ts`
4. **Notifications**: Create a notification queue system with priority levels

---

**Happy coding! 🚀**
