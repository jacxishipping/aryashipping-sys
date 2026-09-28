# 🔍 Smart Search & Filter - Complete Documentation

## Overview

The Jacxi Shipping dashboard now includes a comprehensive **Smart Search and Filter System** that provides powerful, real-time search capabilities across all major entities (Shipments, Items/Containers, Users) with advanced filtering options.

---

## ✨ Key Features

### 1. **Smart Search Component**
- Real-time debounced search (500ms)
- Advanced filter panel with collapsible UI
- Multiple filter options (status, date range, price, etc.)
- Active filter count badges
- Filter summary display
- Loading states and animations

### 2. **Global Search (Cmd/Ctrl + K)**
- Keyboard-triggered modal search
- Searches across all entities simultaneously
- Recent searches history
- Keyboard navigation (↑↓ arrows, Enter, Escape)
- Direct navigation to results
- Beautiful command palette UI

### 3. **Page-Specific Search**
- **Shipments Page**: Full-featured search with all filters
- **Containers Page**: Simplified search with date filters
- **Users Page**: Name/email search with date filters
- Each page optimized for its specific needs

---

## 🎨 Components

### SmartSearch Component

**Location**: `src/components/dashboard/SmartSearch.tsx`

**Props**:
```typescript
interface SmartSearchProps {
  onSearch: (filters: SearchFilters) => void;
  placeholder?: string;
  showTypeFilter?: boolean;
  showStatusFilter?: boolean;
  showDateFilter?: boolean;
  showPriceFilter?: boolean;
  showUserFilter?: boolean;
  defaultType?: 'all' | 'shipments' | 'items' | 'users';
}
```

**SearchFilters Interface**:
```typescript
interface SearchFilters {
  query: string;
  type: 'all' | 'shipments' | 'items' | 'users';
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  minPrice?: string;
  maxPrice?: string;
  userId?: string;
}
```

**Features**:
- Debounced search input
- Quick type selector buttons
- Expandable advanced filters
- Active filter badges
- Clear all functionality
- Filter summary panel

### GlobalSearch Component

**Location**: `src/components/dashboard/GlobalSearch.tsx`

**Features**:
- Keyboard shortcut (⌘K / Ctrl+K)
- Modal overlay with blur backdrop
- Real-time search across all entities
- Recent search history (localStorage)
- Keyboard navigation
- Loading states
- Empty states
- Result categorization by type

---

## 📱 Usage

### In Shipments Page

```typescript
import SmartSearch, { SearchFilters } from '@/components/dashboard/SmartSearch';

const [searchFilters, setSearchFilters] = useState<SearchFilters>({
  query: '',
  type: 'shipments',
});

const handleSearch = (filters: SearchFilters) => {
  setSearchFilters(filters);
  // Fetch data with filters
};

<SmartSearch
  onSearch={handleSearch}
  placeholder="Search shipments by tracking number, VIN, origin..."
  showTypeFilter={false}
  showStatusFilter={true}
  showDateFilter={true}
  showPriceFilter={true}
  showUserFilter={isAdmin}
  defaultType="shipments"
/>
```

### In Containers Page

```typescript
<SmartSearch
  onSearch={handleSearch}
  placeholder="Search containers by number or tracking number..."
  showTypeFilter={false}
  showStatusFilter={false}
  showDateFilter={true}
  showPriceFilter={false}
  showUserFilter={false}
  defaultType="items"
/>
```

### In Users Page

```typescript
<SmartSearch
  onSearch={handleSearch}
  placeholder="Search users by name or email..."
  showTypeFilter={false}
  showStatusFilter={false}
  showDateFilter={true}
  showPriceFilter={false}
  showUserFilter={false}
  defaultType="users"
/>
```

### Global Search in Sidebar

```typescript
import GlobalSearch from '@/components/dashboard/GlobalSearch';

// In sidebar
<div className="px-3 pt-4 pb-2">
  <GlobalSearch />
</div>
```

---

## 🔌 API Integration

### Search API Endpoint

**Endpoint**: `GET /api/search`

**Query Parameters**:
- `query` (string): Search term
- `type` (string): Entity type ('all', 'shipments', 'items', 'users')
- `status` (string): Filter by status
- `dateFrom` (string): Start date (ISO format)
- `dateTo` (string): End date (ISO format)
- `minPrice` (number): Minimum price
- `maxPrice` (number): Maximum price
- `userId` (string): Filter by user ID
- `page` (number): Page number for pagination
- `limit` (number): Results per page
- `sortBy` (string): Sort field
- `sortOrder` (string): 'asc' or 'desc'

**Example Request**:
```bash
GET /api/search?query=ABC123&type=shipments&status=IN_TRANSIT&dateFrom=2025-01-01&limit=10
```

**Response**:
```json
{
  "message": "Search results fetched successfully",
  "shipments": [...],
  "items": [...],
  "users": [...],
  "totalShipments": 25,
  "totalItems": 10,
  "totalUsers": 5,
  "pagination": {
    "currentPage": 1,
    "limit": 10,
    "totalPages": 3
  }
}
```

---

## 🎯 Search Capabilities

### Shipments Search
Searches across:
- Tracking number
- Vehicle type
- Vehicle make/model
- VIN
- Origin
- Destination
- Status
- Price
- Date created

### Items Search
Searches across:
- VIN
- Lot number
- Auction city
- Tracking number
- Status
- Date created

### Users Search (Admin only)
Searches across:
- Name
- Email
- Phone
- Role
- Date created

---

## 🔧 Technical Implementation

### Debouncing

The SmartSearch component implements a 500ms debounce to avoid excessive API calls:

```typescript
useEffect(() => {
  const timer = setTimeout(() => {
    if (query !== filters.query) {
      handleSearch({ ...filters, query });
    }
  }, 500);

  return () => clearTimeout(timer);
}, [query, filters, handleSearch]);
```

### Filter State Management

Filters are managed through React state with callbacks:

```typescript
const handleSearch = useCallback((newFilters: SearchFilters) => {
  setIsSearching(true);
  setFilters(newFilters);
  onSearch(newFilters);
  setTimeout(() => setIsSearching(false), 300);
}, [onSearch]);
```

### Active Filter Count

Active filters are counted using derived state:

```typescript
const activeFiltersCount = (() => {
  let count = 0;
  if (filters.status) count++;
  if (filters.dateFrom || filters.dateTo) count++;
  if (filters.minPrice || filters.maxPrice) count++;
  if (filters.userId) count++;
  return count;
})();
```

---

## 🎨 UI/UX Features

### Visual Feedback

1. **Loading States**
   - Spinning loader icon during search
   - "Searching..." text
   - Disabled state for inputs

2. **Active Filters**
   - Badge showing count of active filters
   - Cyan highlight for active filter panel
   - Individual filter pills in summary

3. **Animations**
   - Smooth expand/collapse for filter panel
   - Fade-in for search results
   - Hover effects on buttons
   - Scale animations on interactions

### Keyboard Shortcuts

- **⌘K / Ctrl+K**: Open global search
- **Escape**: Close global search
- **↑/↓**: Navigate results
- **Enter**: Select result
- **Tab**: Navigate form fields

### Responsive Design

- Mobile-optimized layout
- Touch-friendly buttons
- Collapsible sections on mobile
- Adaptive grid layouts
- Smooth scrolling

---

## 📊 Filter Options

### Status Filters

**Shipments**:
- Pending
- In Transit
- Delivered
- Cancelled
- On Hold
- Pickup Completed
- At Port
- Customs Clearance
- Out for Delivery

**Items**:
- On Hand
- Ready for Shipment

### Date Filters

- **Date From**: Start date for creation date range
- **Date To**: End date for creation date range
- ISO 8601 format support
- HTML5 date picker integration

### Price Filters

- **Min Price**: Minimum shipment price
- **Max Price**: Maximum shipment price
- Number input with validation
- USD currency

---

## 🚀 Performance Optimizations

### 1. Debouncing
- 500ms delay before API call
- Prevents excessive requests
- Improves user experience

### 2. Memoization
- `useCallback` for handler functions
- Prevents unnecessary re-renders
- Optimized dependency arrays

### 3. Lazy State Updates
- Batched state updates
- Derived state where possible
- Minimal re-renders

### 4. API Efficiency
- Server-side filtering
- Pagination support
- Selective field inclusion
- Indexed database queries

---

## 📝 Best Practices

### For Users

1. **Use Global Search for Quick Navigation**
   - Press ⌘K/Ctrl+K anytime
   - Type what you're looking for
   - Navigate directly to results

2. **Use Page Search for Detailed Filtering**
   - More control over results
   - Multiple filter combinations
   - Better for bulk operations

3. **Leverage Recent Searches**
   - Quick access to common queries
   - Saves typing time
   - Available in global search

4. **Clear Filters When Done**
   - Use "Clear" or "Clear all filters"
   - Resets to default view
   - Prevents confusion

### For Developers

1. **Always Provide Feedback**
   - Show loading states
   - Display empty states
   - Clear error messages

2. **Optimize API Calls**
   - Use debouncing
   - Implement pagination
   - Cache when appropriate

3. **Maintain Accessibility**
   - Keyboard navigation
   - ARIA labels
   - Focus management
   - Screen reader support

4. **Test Edge Cases**
   - Empty results
   - Network errors
   - Invalid inputs
   - Long search terms

---

## 🔒 Security Considerations

### Authentication
- All search APIs require authentication
- Session validation on every request
- Automatic redirect if unauthorized

### Authorization
- User search only for admins
- Users see only their own data (non-admins)
- Admin-specific filters hidden for users

### Input Validation
- Query string sanitization
- SQL injection prevention
- XSS protection
- Type checking

### Rate Limiting
- Consider implementing rate limiting
- Prevent abuse
- Protect server resources

---

## 🐛 Troubleshooting

### Search Not Working

**Check**:
1. Network connectivity
2. Authentication status
3. Browser console for errors
4. API endpoint availability

**Solutions**:
- Refresh the page
- Re-login if needed
- Clear browser cache
- Check server logs

### Filters Not Applying

**Check**:
1. Filter values are valid
2. Network request includes filters
3. API response matches expectations

**Solutions**:
- Clear all filters and try again
- Check browser console for errors
- Verify API query parameters

### Global Search Not Opening

**Check**:
1. JavaScript is enabled
2. No keyboard shortcut conflicts
3. Modal is not blocked

**Solutions**:
- Try clicking the search button
- Check for browser extensions interfering
- Refresh the page

---

## 📚 Code Examples

### Custom Search Implementation

```typescript
// pages/dashboard/custom-page.tsx
import { useState, useCallback } from 'react';
import SmartSearch, { SearchFilters } from '@/components/dashboard/SmartSearch';

export default function CustomPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async (filters: SearchFilters) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.query) params.append('query', filters.query);
      if (filters.status) params.append('status', filters.status);
      // Add more params...

      const response = await fetch(`/api/search?${params.toString()}`);
      const data = await response.json();
      setData(data.results || []);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div>
      <SmartSearch
        onSearch={fetchData}
        placeholder="Search..."
        showStatusFilter={true}
        showDateFilter={true}
      />
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div>{/* Render results */}</div>
      )}
    </div>
  );
}
```

### Adding New Filter Type

```typescript
// 1. Update SearchFilters interface
interface SearchFilters {
  // ... existing filters
  newFilter?: string;
}

// 2. Update SmartSearch props
interface SmartSearchProps {
  // ... existing props
  showNewFilter?: boolean;
}

// 3. Add UI in SmartSearch.tsx
{showNewFilter && (
  <div>
    <label>New Filter</label>
    <input
      value={filters.newFilter || ''}
      onChange={(e) => updateFilter('newFilter', e.target.value)}
    />
  </div>
)}

// 4. Update API to handle new filter
const newFilter = searchParams.get('newFilter');
if (newFilter) {
  where.newField = newFilter;
}
```

---

## 🎓 Advanced Features

### Implementing Autocomplete

```typescript
const [suggestions, setSuggestions] = useState([]);

useEffect(() => {
  if (query.length >= 2) {
    fetchSuggestions(query).then(setSuggestions);
  }
}, [query]);

const fetchSuggestions = async (term: string) => {
  const response = await fetch(`/api/suggestions?q=${term}`);
  return response.json();
};
```

### Adding Search History

```typescript
const [searchHistory, setSearchHistory] = useState<string[]>([]);

useEffect(() => {
  const history = localStorage.getItem('searchHistory');
  if (history) setSearchHistory(JSON.parse(history));
}, []);

const addToHistory = (query: string) => {
  const updated = [query, ...searchHistory].slice(0, 10);
  setSearchHistory(updated);
  localStorage.setItem('searchHistory', JSON.stringify(updated));
};
```

### Implementing Saved Searches

```typescript
interface SavedSearch {
  id: string;
  name: string;
  filters: SearchFilters;
}

const saveSearch = async (name: string, filters: SearchFilters) => {
  await fetch('/api/saved-searches', {
    method: 'POST',
    body: JSON.stringify({ name, filters }),
  });
};
```

---

## 📞 Support

For issues or feature requests:
1. Check this documentation
2. Review console logs for errors
3. Contact system administrator
4. Submit bug reports via issue tracker

---

**Last Updated**: November 18, 2025  
**Version**: 1.0.0  
**Author**: Jacxi Shipping Development Team

