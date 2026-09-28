# 🚀 Container System - Quick Start Guide

## Get Started in 5 Minutes

### Step 1: Run Migration
```bash
cd /workspace
npx prisma migrate dev
```

### Step 2: Start Your Server
```bash
npm run dev
```

### Step 3: Create Your First Container
1. Navigate to: `http://localhost:3000/dashboard/containers`
2. Click "New Container"
3. Fill in:
   - Container Number (e.g., `ABCU1234567`)
   - Vessel Name
   - Shipping Line
   - Loading & Destination Ports
   - Dates
4. Click "Create Container"

### Step 4: Assign Vehicles
1. Go to container detail page
2. Click "Shipments" tab
3. Click "Assign Vehicles"
4. Select shipments with status "ON_HAND"
5. They'll automatically become "IN_TRANSIT"

### Step 5: Track Progress
1. Update container status as it progresses:
   - CREATED → WAITING_FOR_LOADING → LOADED → IN_TRANSIT → 
   - ARRIVED_PORT → CUSTOMS_CLEARANCE → RELEASED → CLOSED
2. Assigned vehicles inherit the status automatically

---

## Common Workflows

### Create New Container + Assign Vehicles
```
1. Dashboard → Containers → New Container
2. Fill container details → Create
3. Go to container → Shipments tab
4. Assign Vehicles → Select shipments → Assign
5. Done! Shipments are now IN_TRANSIT
```

### Add Expenses to Container
```
1. Container detail → Expenses tab
2. Add Expense → Fill details
3. Type: Shipping Fee, Fuel, Port Charges, etc.
4. Amount, Date, Vendor → Save
5. Total automatically calculated
```

### Track Container Journey
```
1. Container detail → Tracking tab
2. View all tracking events
3. Timeline tab → Visual journey
4. Auto-updates from tracking API
```

### Update Container Status
```
1. Container detail → Overview tab
2. "Update Status" section at bottom
3. Click desired status button
4. Confirm → All assigned vehicles update automatically
```

---

## API Usage Examples

### Create Container
```javascript
const response = await fetch('/api/containers', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    containerNumber: 'ABCU1234567',
    vesselName: 'MSC MAYA',
    shippingLine: 'MSC',
    loadingPort: 'Jebel Ali, UAE',
    destinationPort: 'Los Angeles, USA',
    estimatedArrival: '2025-01-15',
    maxCapacity: 4
  })
});
```

### Assign Shipments
```javascript
const response = await fetch('/api/containers/[containerId]/shipments', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    shipmentIds: ['shipment-1', 'shipment-2', 'shipment-3']
  })
});
```

### Add Expense
```javascript
const response = await fetch('/api/containers/[containerId]/expenses', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'Shipping Fee',
    amount: 2500,
    currency: 'USD',
    date: '2025-12-05',
    notes: 'Ocean freight charges'
  })
});
```

---

## Troubleshooting

### Migration Issues
**Problem:** `DATABASE_URL not found`  
**Solution:** Set environment variable or check `.env` file

**Problem:** Migration fails  
**Solution:** Check database connection, verify Prisma version

### Container Creation Fails
**Problem:** "Container number already exists"  
**Solution:** Use unique container number

### Can't Assign Shipments
**Problem:** "Container at full capacity"  
**Solution:** Increase maxCapacity or create new container

**Problem:** "Can only assign ON_HAND shipments"  
**Solution:** Only shipments with status ON_HAND can be assigned

---

## Best Practices

### Naming Conventions
- **Container Numbers:** Use standard format (e.g., `ABCU1234567`)
- **Tracking Numbers:** Get from shipping line
- **Booking Numbers:** Use official booking reference

### Capacity Planning
- Set realistic `maxCapacity` (typically 2-6 for cars)
- Monitor capacity usage
- Create new container when approaching full

### Status Updates
- Update status as soon as information is available
- Don't skip statuses (follow the lifecycle)
- Use tracking events for detailed updates

### Financial Tracking
- Add expenses as they occur
- Attach invoices with file uploads
- Review financial summary regularly

### Documentation
- Upload BOL (Bill of Lading) immediately
- Add customs documents
- Keep loading photos

---

## Tips & Tricks

### 💡 Tip 1: Bulk Operations
Assign multiple shipments at once to save time

### 💡 Tip 2: Search Everything
Use search bar to find containers by number, vessel, or tracking

### 💡 Tip 3: Filter by Status
Quickly find containers in specific stages

### 💡 Tip 4: Monitor Capacity
Watch capacity indicators to plan ahead

### 💡 Tip 5: Use Notes
Add internal notes for special instructions

---

## Need Help?

### Common Issues
1. Check `CONTAINER_SYSTEM_IMPLEMENTATION_COMPLETE.md` for details
2. Review API documentation in source files
3. Check Prisma schema for data structure
4. Review audit logs for debugging

### Next Steps
- Complete Phase 2 for enhanced UI
- Customize as needed
- Integrate with external tracking APIs
- Add automated notifications

---

**You're all set!** 🎉

The container system is ready to use. Start by creating your first container and assigning vehicles. Everything else will flow naturally from there.

Happy shipping! 🚢
