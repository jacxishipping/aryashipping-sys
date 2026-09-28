# New Features Documentation

This document describes the three major features that have been added to the Jacxi Shipping platform. These features require database migration to be fully operational.

## Overview

Three powerful automation features have been implemented:

1. **Automatic Status Progression** - Syncs shipment statuses from tracking API
2. **Estimated Delivery Date Alerts** - Monitors delivery dates and alerts on delays
3. **Container Capacity Management** - Tracks and enforces container vehicle limits

## Status: Requires Migration

⚠️ **Important**: These features have been implemented in code but are **commented out** until the database migration is run. Once you run `npx prisma migrate dev`, all features will become active.

---

## Feature 1: Automatic Status Progression

### Description
Automatically updates shipment statuses by syncing with the tracking API. Instead of manually changing statuses, the system periodically checks the tracking provider and updates shipments accordingly.

### How It Works
- A cron job endpoint `/api/cron/sync-shipment-status` calls the tracking API for all in-transit shipments
- Maps tracking provider statuses to internal statuses
- Updates shipment location and progress
- Creates shipment events for each status change
- Tracks last sync time to avoid redundant calls

### API Endpoint
**POST** `/api/cron/sync-shipment-status`

**Headers:**
```
Authorization: Bearer YOUR_CRON_SECRET
```

**Response:**
```json
{
  "message": "Shipment status sync completed",
  "results": {
    "total": 10,
    "updated": 3,
    "errors": 0,
    "details": [
      {
        "shipmentId": "abc123",
        "trackingNumber": "TRACK123",
        "oldStatus": "PENDING",
        "newStatus": "IN_TRANSIT",
        "success": true
      }
    ]
  }
}
```

### Database Changes (Schema)
```prisma
model Shipment {
  // ... existing fields
  lastStatusSync      DateTime?   // Last time status was synced from tracking
  autoStatusUpdate    Boolean     @default(true) // Enable automatic status updates
}
```

### Setup Instructions
1. Run migration: `npx prisma migrate dev`
2. Set `CRON_SECRET` in your `.env` file
3. Set up a cron job to call this endpoint every hour (or as needed)
4. Example cron job (using a service like Vercel Cron or GitHub Actions):
   ```yaml
   # .github/workflows/cron-sync-status.yml
   name: Sync Shipment Statuses
   on:
     schedule:
       - cron: '0 * * * *'  # Every hour
   jobs:
     sync:
       runs-on: ubuntu-latest
       steps:
         - name: Call sync endpoint
           run: |
             curl -X POST https://your-domain.com/api/cron/sync-shipment-status \
               -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
   ```

### Uncomment After Migration
In `src/app/api/cron/sync-shipment-status/route.ts`:
- Line 27: Uncomment `autoStatusUpdate: true`
- Line 34: Uncomment `lastStatusSync: true`
- Line 114: Uncomment `lastStatusSync: new Date()`
- Lines 139-147: Uncomment the lastStatusSync update block

---

## Feature 2: Estimated Delivery Date Alerts

### Description
Monitors shipments with estimated delivery dates and automatically categorizes them into alert levels:
- **ON_TIME**: More than 3 days until ETA
- **WARNING**: Within 3 days of ETA, not yet delivered
- **OVERDUE**: Past ETA, not yet delivered
- **DELIVERED**: Successfully delivered

### How It Works
- A cron job endpoint `/api/cron/check-delivery-alerts` runs daily
- Checks all non-delivered shipments with ETAs
- Calculates time until delivery
- Updates alert status accordingly
- Can be extended to send email/SMS notifications

### API Endpoint
**POST** `/api/cron/check-delivery-alerts`

**Headers:**
```
Authorization: Bearer YOUR_CRON_SECRET
```

**Response:**
```json
{
  "message": "Delivery alerts check completed",
  "results": {
    "total": 25,
    "warnings": 5,
    "overdue": 2,
    "onTime": 18,
    "details": [
      {
        "shipmentId": "abc123",
        "trackingNumber": "TRACK123",
        "oldStatus": "ON_TIME",
        "newStatus": "WARNING",
        "estimatedDelivery": "2025-11-20T00:00:00Z",
        "userName": "John Doe"
      }
    ]
  }
}
```

### Database Changes (Schema)
```prisma
model Shipment {
  // ... existing fields
  deliveryAlertStatus DeliveryAlertStatus @default(ON_TIME)
}

enum DeliveryAlertStatus {
  ON_TIME
  WARNING      // 3 days before ETA, not delivered
  OVERDUE      // Past ETA, not delivered
  DELIVERED
}
```

### Setup Instructions
1. Run migration: `npx prisma migrate dev`
2. Set `CRON_SECRET` in your `.env` file
3. Set up a cron job to call this endpoint daily
4. Example cron job:
   ```yaml
   # .github/workflows/cron-check-alerts.yml
   name: Check Delivery Alerts
   on:
     schedule:
       - cron: '0 6 * * *'  # Daily at 6 AM
   jobs:
     check:
       runs-on: ubuntu-latest
       steps:
         - name: Call alerts endpoint
           run: |
             curl -X POST https://your-domain.com/api/cron/check-delivery-alerts \
               -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
   ```

### Uncomment After Migration
In `src/app/api/cron/check-delivery-alerts/route.ts`:
- Line 46: Uncomment `deliveryAlertStatus: true`
- Lines 94-115: Uncomment the full delivery alert update block

### Notification Integration (Future)
The endpoint includes a TODO comment where you can integrate email/SMS notifications:
```typescript
// TODO: Send notification to user
// You can implement email/SMS notifications here based on the alert status
```

Suggested notification services:
- **Email**: SendGrid, AWS SES, Resend
- **SMS**: Twilio, AWS SNS
- **Push**: Firebase Cloud Messaging

---

## Feature 3: Container Capacity Management

### Description
Tracks the number of vehicles in each container and enforces capacity limits. Prevents overfilling containers and provides real-time capacity status.

### How It Works
- Each container has a `maxCapacity` (default: 4 vehicles)
- Each container tracks `currentCount` of vehicles
- Status automatically updates based on fill level:
  - **EMPTY**: 0 vehicles
  - **PARTIAL**: 1 to capacity-1 vehicles
  - **FULL**: At capacity
  - **SHIPPED**: Container has been shipped
  - **ARCHIVED**: Container is archived
- Adding items increments count, removing items decrements count
- API prevents adding items to full or shipped containers

### Database Changes (Schema)
```prisma
model Container {
  id              String          @id @default(cuid())
  containerNumber String          @unique
  shipmentId      String?
  status          ContainerStatus @default(EMPTY)
  maxCapacity     Int             @default(4)  // Maximum number of vehicles
  currentCount    Int             @default(0)  // Current number of vehicles
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  shipment Shipment? @relation(fields: [shipmentId], references: [id], onDelete: SetNull)
  items    Item[]
  invoices Invoice[]
}

enum ContainerStatus {
  EMPTY
  PARTIAL
  FULL
  SHIPPED
  ARCHIVED
}
```

### API Behavior

#### Creating a Container
**POST** `/api/containers`
```json
{
  "containerNumber": "CONT-001",
  "maxCapacity": 6  // Optional, defaults to 4
}
```

#### Adding Items to Container
**POST** `/api/items`
```json
{
  "containerId": "container_id",
  "vin": "VIN123",
  "lotNumber": "LOT456",
  "auctionCity": "New York"
}
```

**Validation:**
- ✅ Checks if container exists
- ✅ Checks if container is at capacity
- ✅ Checks if container is already shipped
- ✅ Automatically increments `currentCount`
- ✅ Updates container status (EMPTY → PARTIAL → FULL)

**Error Response (Full Container):**
```json
{
  "message": "Container is full. Maximum capacity: 4 vehicles"
}
```

**Error Response (Shipped Container):**
```json
{
  "message": "Cannot add items to a shipped container"
}
```

### Setup Instructions
1. Run migration: `npx prisma migrate dev`
2. The feature will automatically activate

### Uncomment After Migration

#### In `src/app/api/containers/route.ts`:
- Lines 104-105: Uncomment `maxCapacity` and `currentCount` initialization

#### In `src/app/api/items/route.ts`:
- Lines 18-43: Uncomment the `updateContainerStatus` function
- Lines 111-127: Uncomment container capacity validation
- Lines 160-170: Uncomment container count increment logic

### UI Integration
You can display container capacity in the dashboard:
```tsx
<div>
  <p>Capacity: {container.currentCount} / {container.maxCapacity}</p>
  <progress 
    value={container.currentCount} 
    max={container.maxCapacity}
  />
  <span>Status: {container.status}</span>
</div>
```

---

## Migration Steps

### 1. Review Changes
Review the Prisma schema changes in `prisma/schema.prisma`:
- Container model updates (status, maxCapacity, currentCount)
- Shipment model updates (deliveryAlertStatus, lastStatusSync, autoStatusUpdate)
- New enums (ContainerStatus, DeliveryAlertStatus)

### 2. Run Migration
```bash
npx prisma migrate dev --name add_automation_features
```

### 3. Uncomment Code
Uncomment all the sections marked with migration-dependent comments in:
- `src/app/api/containers/route.ts`
- `src/app/api/items/route.ts`
- `src/app/api/cron/sync-shipment-status/route.ts`
- `src/app/api/cron/check-delivery-alerts/route.ts`

### 4. Update Environment Variables
Add to `.env`:
```env
CRON_SECRET=your-secure-random-string-here
```

### 5. Set Up Cron Jobs
Configure your hosting platform to call the cron endpoints:

**Vercel:**
Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/sync-shipment-status",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/check-delivery-alerts",
      "schedule": "0 6 * * *"
    }
  ]
}
```

**Other Platforms:**
Use external cron services like:
- EasyCron
- Cron-job.org
- GitHub Actions (see examples above)

### 6. Test Features
1. **Status Sync**: 
   ```bash
   curl -X POST http://localhost:3000/api/cron/sync-shipment-status \
     -H "Authorization: Bearer YOUR_CRON_SECRET"
   ```

2. **Delivery Alerts**:
   ```bash
   curl -X POST http://localhost:3000/api/cron/check-delivery-alerts \
     -H "Authorization: Bearer YOUR_CRON_SECRET"
   ```

3. **Container Capacity**:
   - Create a container
   - Add items until capacity
   - Try adding one more (should fail)

---

## Additional Changes

### Shipment Row Component
- **Removed**: Status change dropdown from shipments list page
- **Reasoning**: Status changes are now handled automatically via tracking API, or manually in the edit page
- **Location**: `src/components/dashboard/ShipmentRow.tsx`

The status change button has been replaced with a comment:
```tsx
{/* Status changes now handled automatically via tracking API and in edit page only */}
```

---

## Benefits

### Automatic Status Progression
✅ Eliminates manual status updates  
✅ Ensures consistency with tracking provider  
✅ Reduces human error  
✅ Saves admin time  
✅ Provides audit trail via shipment events  

### Estimated Delivery Date Alerts
✅ Proactive customer communication  
✅ Identifies delays early  
✅ Improves customer satisfaction  
✅ Enables better resource planning  
✅ Extensible for notifications  

### Container Capacity Management
✅ Prevents container overfilling  
✅ Optimizes container usage  
✅ Real-time capacity tracking  
✅ Automatic status updates  
✅ Prevents errors in shipping  

---

## Monitoring and Maintenance

### Logs
All cron jobs log their activities. Monitor the following:
- Number of shipments processed
- Number of updates made
- Any errors encountered

### Performance
- Status sync: ~50-100ms per shipment (network dependent)
- Delivery alerts: ~10ms per shipment (database only)
- Container management: ~5ms per operation (database only)

### Recommended Schedule
- Status sync: Every hour
- Delivery alerts: Once daily (morning)
- Container management: Real-time (no cron needed)

---

## Troubleshooting

### Problem: Cron job returns 401 Unauthorized
**Solution**: Check that `CRON_SECRET` matches in both `.env` and cron configuration

### Problem: Shipment status not updating
**Solutions:**
1. Check tracking API is responding correctly
2. Verify `autoStatusUpdate` is true for the shipment
3. Check tracking number is valid
4. Review cron job logs for errors

### Problem: Container capacity not enforced
**Solutions:**
1. Ensure migration has been run
2. Verify code has been uncommented
3. Check `maxCapacity` and `currentCount` fields exist in database

### Problem: Delivery alerts not working
**Solutions:**
1. Ensure migration has been run
2. Verify shipments have `estimatedDelivery` set
3. Check `deliveryAlertStatus` field exists in database
4. Review cron job schedule

---

## Future Enhancements

### Potential Additions
1. **Email/SMS Notifications** for delivery alerts
2. **Slack/Discord Integration** for status updates
3. **Dashboard Widgets** showing:
   - Overdue shipments count
   - Container utilization rates
   - Recent status syncs
4. **Manual Override** for automatic status updates
5. **Custom Alert Thresholds** (e.g., 5 days instead of 3)
6. **Container Type Variations** (20ft, 40ft, etc.) with different capacities
7. **Bulk Status Sync** for specific shipments
8. **Status Sync History** tracking

---

## Support

For questions or issues:
1. Check this documentation
2. Review code comments
3. Check Prisma migration status: `npx prisma migrate status`
4. Review server logs
5. Test endpoints individually

---

**Last Updated**: November 17, 2025  
**Version**: 1.0.0  
**Status**: Ready for migration

