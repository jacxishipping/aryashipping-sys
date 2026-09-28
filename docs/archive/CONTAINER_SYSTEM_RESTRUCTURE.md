# Container System Restructure - Implementation Guide

## ⚠️ **MAJOR BREAKING CHANGE**

This is a complete architectural redesign of the Shipment and Container system. This will require:
1. Database schema changes (breaking)
2. Data migration (manual intervention required)
3. API changes (breaking)
4. UI changes (complete rebuild)

## 🎯 Goals

1. **Containers** become the primary shipping unit with all shipping data
2. **Shipments** only contain car information and link to containers
3. Clean separation of concerns
4. Match real-world logistics workflows

## 📊 Before vs. After

### BEFORE (Current)
```
Shipment
├── Car info
├── Shipping data (tracking, vessel, ETA, etc.)
├── Status
└── Container (many-to-many via items)

Container
├── Container number
├── Capacity
└── Has Items (not Shipments)
```

### AFTER (New)
```
Container (Primary Shipping Unit)
├── Container number
├── Tracking number
├── Vessel, voyage, shipping line
├── Ports (loading, destination, transshipment)
├── ETA, arrival date
├── Status (lifecycle)
├── Expenses
├── Invoices
├── Documents
└── Has many Shipments

Shipment (Car/Vehicle Data Only)
├── Car info (VIN, make, model, etc.)
├── Status (ON_HAND or IN_TRANSIT)
├── Container ID (nullable)
├── Owner/Customer
└── Internal notes
```

## 🗄️ New Database Schema

### Shipment Model (Simplified)
```prisma
model Shipment {
  id                  String              @id @default(cuid())
  // Car Information
  vehicleType         String
  vehicleMake         String?
  vehicleModel        String?
  vehicleYear         Int?
  vehicleVIN          String?             @unique
  vehicleColor        String?
  lotNumber           String?
  auctionName         String?
  hasKey              Boolean?
  hasTitle            Boolean?
  titleStatus         TitleStatus?
  vehicleAge          Int?
  weight              Float?
  dimensions          String?
  insuranceValue      Float?
  arrivalPhotos       String[]            @default([])
  vehiclePhotos       String[]            @default([])
  
  // Status and Assignment
  status              ShipmentSimpleStatus @default(ON_HAND)
  containerId         String?
  userId              String              // Owner/Customer
  internalNotes       String?
  
  // Financial
  price               Float?
  paymentStatus       PaymentStatus       @default(PENDING)
  paymentMode         PaymentMode?
  
  // Metadata
  createdAt           DateTime            @default(now())
  updatedAt           DateTime            @updatedAt
  
  // Relations
  container           Container?          @relation(fields: [containerId], references: [id])
  user                User                @relation(fields: [userId], references: [id])
  documents           Document[]
  payments            Payment[]
  qualityChecks       QualityCheck[]
  ledgerEntries       LedgerEntry[]
  
  @@index([userId])
  @@index([containerId])
  @@index([status])
}

enum ShipmentSimpleStatus {
  ON_HAND
  IN_TRANSIT
}
```

### Container Model (Enhanced)
```prisma
model Container {
  id                  String              @id @default(cuid())
  containerNumber     String              @unique
  
  // Shipping Information
  trackingNumber      String?             @unique
  vesselName          String?
  voyageNumber        String?
  shippingLine        String?
  bookingNumber       String?
  
  // Ports
  loadingPort         String?
  destinationPort     String?
  transshipmentPorts  String[]            @default([])
  
  // Dates
  loadingDate         DateTime?
  departureDate       DateTime?
  estimatedArrival    DateTime?
  actualArrival       DateTime?
  
  // Status and Progress
  status              ContainerLifecycleStatus @default(CREATED)
  currentLocation     String?
  progress            Int                 @default(0)
  
  // Capacity
  maxCapacity         Int                 @default(4)
  currentCount        Int                 @default(0)
  
  // Notes and Documentation
  notes               String?
  lastLocationUpdate  DateTime?
  autoTrackingEnabled Boolean             @default(true)
  
  // Metadata
  createdAt           DateTime            @default(now())
  updatedAt           DateTime            @updatedAt
  
  // Relations
  shipments           Shipment[]
  expenses            ContainerExpense[]
  invoices            ContainerInvoice[]
  documents           ContainerDocument[]
  trackingEvents      ContainerTrackingEvent[]
  auditLogs           ContainerAuditLog[]
  
  @@index([status])
  @@index([shippingLine])
  @@index([destinationPort])
  @@index([estimatedArrival])
}

enum ContainerLifecycleStatus {
  CREATED
  WAITING_FOR_LOADING
  LOADED
  IN_TRANSIT
  ARRIVED_PORT
  CUSTOMS_CLEARANCE
  RELEASED
  CLOSED
}
```

### Container Expenses
```prisma
model ContainerExpense {
  id            String    @id @default(cuid())
  containerId   String
  type          String    // Shipping, Customs, Storage, etc.
  amount        Float
  currency      String    @default("USD")
  date          DateTime  @default(now())
  vendor        String?
  invoiceNumber String?
  notes         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  container     Container @relation(fields: [containerId], references: [id], onDelete: Cascade)
  
  @@index([containerId])
}
```

### Container Invoices
```prisma
model ContainerInvoice {
  id              String    @id @default(cuid())
  containerId     String
  invoiceNumber   String
  amount          Float
  currency        String    @default("USD")
  vendor          String?
  date            DateTime
  dueDate         DateTime?
  status          InvoiceStatus @default(PENDING)
  fileUrl         String?
  notes           String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  container       Container @relation(fields: [containerId], references: [id], onDelete: Cascade)
  
  @@index([containerId])
  @@index([status])
}
```

### Container Documents
```prisma
model ContainerDocument {
  id              String    @id @default(cuid())
  containerId     String
  type            String    // BOL, Customs, Packing List, Photos, etc.
  name            String
  fileUrl         String
  fileType        String
  fileSize        Int
  uploadedBy      String
  uploadedAt      DateTime  @default(now())
  notes           String?
  
  container       Container @relation(fields: [containerId], references: [id], onDelete: Cascade)
  
  @@index([containerId])
  @@index([type])
}
```

### Container Tracking Events
```prisma
model ContainerTrackingEvent {
  id            String    @id @default(cuid())
  containerId   String
  status        String
  location      String?
  description   String?
  eventDate     DateTime
  source        String?   // API, Manual, System
  createdAt     DateTime  @default(now())
  
  container     Container @relation(fields: [containerId], references: [id], onDelete: Cascade)
  
  @@index([containerId])
  @@index([eventDate])
}
```

### Container Audit Log
```prisma
model ContainerAuditLog {
  id            String    @id @default(cuid())
  containerId   String
  action        String    // Status Change, Shipment Added, ETA Updated, etc.
  description   String
  performedBy   String
  metadata      Json?
  timestamp     DateTime  @default(now())
  
  container     Container @relation(fields: [containerId], references: [id], onDelete: Cascade)
  
  @@index([containerId])
  @@index([timestamp])
}
```

## 🔄 Migration Strategy

### Phase 1: Preparation (Manual)
1. **Backup existing database**
2. **Export current shipment and container data**
3. **Map existing shipments to new structure**

### Phase 2: Schema Migration
1. Create new Container-enhanced model
2. Create new Shipment-simplified model
3. Create supporting models (expenses, invoices, documents, etc.)

### Phase 3: Data Migration (Manual/Script)
1. For each existing Shipment:
   - Extract car information → new Shipment
   - Extract shipping data → Container
   - Link Shipment to Container
2. Migrate existing Container data
3. Migrate relationships

### Phase 4: Code Migration
1. Update all API routes
2. Update UI components
3. Update cron jobs
4. Update reports

### Phase 5: Testing
1. Test all CRUD operations
2. Test relationships
3. Test cron jobs
4. Test reporting

### Phase 6: Deployment
1. Run migration in production
2. Monitor for issues
3. Roll back if needed

## 📝 Implementation Checklist

### Database
- [ ] Create new Prisma schema
- [ ] Generate migration files
- [ ] Test migration in development
- [ ] Create data migration script
- [ ] Backup production data
- [ ] Run migration in production

### API Routes
- [ ] Container CRUD (`/api/containers`)
- [ ] Container expenses (`/api/containers/[id]/expenses`)
- [ ] Container invoices (`/api/containers/[id]/invoices`)
- [ ] Container documents (`/api/containers/[id]/documents`)
- [ ] Container timeline (`/api/containers/[id]/timeline`)
- [ ] Container tracking (`/api/containers/[id]/tracking`)
- [ ] Update Shipment CRUD (remove shipping data)
- [ ] Container-Shipment assignment API
- [ ] Container status update API with cascading effects

### UI Components
- [ ] Container list page
- [ ] Container detail page with tabs
- [ ] Container timeline view
- [ ] Container creation form
- [ ] Container edit form
- [ ] Shipment creation form (simplified)
- [ ] Shipment edit form (simplified)
- [ ] Shipment detail page (show container info)
- [ ] Container selection dropdown
- [ ] Expense management UI
- [ ] Invoice management UI
- [ ] Document upload UI

### Cron Jobs
- [ ] Update container tracking (not shipments)
- [ ] Auto-update container status
- [ ] Cascade status to shipments
- [ ] ETA alerts for containers

### Features
- [ ] Filtering and search
- [ ] Audit trail
- [ ] Timeline visualization
- [ ] Status workflow enforcement
- [ ] Auto-cascading status updates

## ⚠️ Breaking Changes

### API Endpoints
**Removed:**
- Shipment tracking endpoints (use container tracking)
- Shipment status updates (use container status)

**Changed:**
- `POST /api/shipments` - Simplified payload
- `PATCH /api/shipments/[id]` - Can't update shipping data
- `GET /api/shipments` - Returns minimal data

**New:**
- `GET /api/containers`
- `POST /api/containers`
- `GET /api/containers/[id]`
- `PATCH /api/containers/[id]`
- `DELETE /api/containers/[id]`
- `GET /api/containers/[id]/shipments`
- `POST /api/containers/[id]/expenses`
- `POST /api/containers/[id]/invoices`
- `POST /api/containers/[id]/documents`
- `GET /api/containers/[id]/timeline`

### Data Structure
**Shipment:**
- Removed: trackingNumber, origin, destination, currentLocation, estimatedDelivery, progress, events
- Changed: status (now only ON_HAND or IN_TRANSIT)
- Added: containerId, internalNotes

**Container:**
- Added: All shipping data
- Added: Lifecycle statuses
- Changed: Relationship (has many Shipments)

## 🚀 Rollout Plan

### Week 1: Development
- [ ] Update schema
- [ ] Create migration
- [ ] Build API routes

### Week 2: UI Development  
- [ ] Build container pages
- [ ] Update shipment pages
- [ ] Add timeline view

### Week 3: Testing
- [ ] Unit tests
- [ ] Integration tests
- [ ] User acceptance testing

### Week 4: Deployment
- [ ] Migrate development
- [ ] Migrate staging
- [ ] Migrate production

## 📞 Support

After migration, provide:
1. Updated documentation
2. Training materials
3. Migration support
4. Bug fixes and adjustments

---

**Status**: Ready for implementation  
**Version**: 2.0.0 (Major breaking change)  
**Impact**: High - Complete system restructure
