# Container Fetch Data Feature

## Summary
Added a "Fetch Data" button to the create container page that automatically retrieves container shipping information based on the container number. Also fixed the dark background issue on input fields for better visibility.

## Changes Made

### 1. Create Container Page (`/src/app/dashboard/containers/new/page.tsx`)

#### Added Fetch Data Functionality
- **New state variables**:
  - `fetching`: Loading state for fetch operation
  - `fetchError`: Error message display
  - `fetchSuccess`: Success message display
  
- **New `fetchContainerData` function**:
  - Validates container number is entered
  - Calls tracking API endpoint
  - Auto-populates form fields with fetched data
  - Displays success/error messages
  - Allows manual override of any fetched data

#### Enhanced Container Number Field
- **Fetch Data Button** next to container number input:
  - Icon: Download icon with "Fetch Data" label
  - Shows spinner animation while fetching
  - Disabled when container number is empty or fetching
  - Styled with indigo theme matching the dashboard
  
- **Helper text** explaining how to use the feature
- **Alert messages** for fetch success/errors displayed at top of form

#### Fixed Input Field Styling
All input fields now have proper styling for both light and dark modes:
- **Background colors**:
  - Light mode: `bg-white`
  - Dark mode: `bg-gray-700`
- **Text colors**:
  - Light mode: `text-gray-900`
  - Dark mode: `text-gray-100`
- **Border colors**:
  - Light mode: `border-gray-300`
  - Dark mode: `border-gray-600`
- **Focus states**:
  - Focus ring: `focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400`
  - Border: `focus:border-transparent`
- **Label colors**:
  - Light mode: `text-gray-700`
  - Dark mode: `text-gray-300`
- **Heading colors**:
  - Light mode: `text-gray-900`
  - Dark mode: `text-white`

All form fields updated:
- ✅ Container Number
- ✅ Tracking Number
- ✅ Booking Number
- ✅ Max Capacity
- ✅ Vessel Name
- ✅ Voyage Number
- ✅ Shipping Line
- ✅ Loading Port
- ✅ Destination Port
- ✅ Transshipment Ports
- ✅ Loading Date
- ✅ Departure Date
- ✅ Estimated Arrival
- ✅ Notes textarea
- ✅ Auto-tracking checkbox

### 2. Container Tracking API (`/src/app/api/containers/tracking/route.ts`)

#### New API Endpoint: `GET /api/containers/tracking`
- **Authentication**: Requires admin role
- **Query Parameters**: `containerNumber` (required)
- **Response**: Container tracking data or error message

#### Features
- Validates admin permissions
- Accepts container number as query parameter
- Calls tracking API function
- Returns structured tracking data
- Handles errors gracefully

#### Mock Data Implementation
Currently includes mock data for demonstration:
- **MAEU1234567**: Maersk Line container (Shanghai to Los Angeles)
- **MSCU9876543**: MSC container (Rotterdam to New York)
- Returns `null` for unknown containers (simulating "not found")

#### Production Integration Ready
The API is structured to easily integrate with real shipping line APIs:
- **Maersk API**: https://api.maersk.com/
- **Hapag-Lloyd**: https://www.hapag-lloyd.com/en/online-services/tracking.html
- **MSC**: https://www.msc.com/track-a-shipment
- **CMA CGM**: https://www.cma-cgm.com/ebusiness/tracking
- **ONE**: https://ecomm.one-line.com/one-ecom/manage-shipment/tracking

Or aggregator APIs:
- **FreightOS**
- **Project44**
- **Shippeo**

#### Data Fetched
When available, the API returns:
- Container number
- Tracking number
- Vessel name
- Voyage number
- Shipping line
- Loading port
- Destination port
- Loading date
- Departure date
- Estimated arrival
- Current location
- Status

## User Experience

### How to Use
1. Enter a container number (e.g., "MAEU1234567")
2. Click the **"Fetch Data"** button
3. System fetches container information from tracking API
4. Form fields are auto-populated with fetched data
5. Success message displays at top of form
6. User can review and adjust any field as needed
7. Click "Create Container" to save

### Error Handling
- **Empty container number**: Button is disabled
- **Container not found**: Warning message shown, user can enter details manually
- **API error**: Error message shown, user can enter details manually
- **Network error**: Error message shown, user can enter details manually

### Visual Feedback
- Loading spinner appears during fetch
- Button text changes to "Fetching..."
- Success/error messages appear in colored alert boxes
- All fetched data can be manually edited before submission

## Benefits

1. **Time Savings**: Automatically populate multiple fields with one click
2. **Accuracy**: Reduce manual data entry errors
3. **User-Friendly**: Clear visual feedback during fetch operation
4. **Flexible**: All fetched data can be manually overridden
5. **Professional**: Better visibility with properly styled form fields
6. **Accessible**: Works in both light and dark modes

## Testing

### Test Container Numbers
For testing, use these mock container numbers:
- **MAEU1234567**: Returns Maersk Line data
- **MSCU9876543**: Returns MSC data
- **Any other number**: Returns "not found" (simulates real-world scenario)

### What to Test
- ✅ Click Fetch Data with empty container number (should be disabled)
- ✅ Enter "MAEU1234567" and click Fetch Data (should populate fields)
- ✅ Enter "MSCU9876543" and click Fetch Data (should populate different data)
- ✅ Enter "UNKNOWN123" and click Fetch Data (should show not found message)
- ✅ Verify all input fields are visible and readable in both light/dark mode
- ✅ Verify fetched data can be manually edited
- ✅ Verify form submission works with fetched data

## Production Deployment Notes

### To Use Real Tracking APIs
1. Obtain API keys from shipping line providers
2. Update the `fetchFromTrackingAPI` function in `/src/app/api/containers/tracking/route.ts`
3. Replace mock data logic with actual API calls
4. Add API keys to environment variables
5. Implement rate limiting and caching as needed
6. Add error handling for specific API error codes

### Example Integration (Pseudo-code)
```typescript
async function fetchFromTrackingAPI(containerNumber: string) {
  // Detect shipping line from container prefix
  const prefix = containerNumber.substring(0, 4);
  
  if (prefix === 'MAEU') {
    return await fetchFromMaerskAPI(containerNumber);
  } else if (prefix === 'MSCU') {
    return await fetchFromMSCAPI(containerNumber);
  }
  // ... more shipping lines
  
  // Or use aggregator API
  return await fetchFromAggregatorAPI(containerNumber);
}
```

## Security Considerations
- ✅ Admin-only access enforced
- ✅ Container number validation
- ✅ Error messages don't expose internal details
- ⚠️ Production: Add rate limiting to prevent API abuse
- ⚠️ Production: Cache responses to reduce API calls
- ⚠️ Production: Secure API keys in environment variables

## Future Enhancements
- Add support for multiple shipping line APIs
- Implement automatic shipping line detection
- Add real-time tracking updates
- Cache frequently accessed containers
- Add bulk container import feature
- Integrate with webhook notifications
