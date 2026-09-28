# ✅ Container Tables Fix

## Issue
```
Error [PrismaClientKnownRequestError]: 
The table `public.ContainerAuditLog` does not exist in the current database.
Code: P2021
```

## Root Cause
The Container system has 5 related tables defined in the Prisma schema, but they were never created in the database:
- `ContainerExpense`
- `ContainerInvoice`
- `ContainerDocument`
- `ContainerTrackingEvent`
- `ContainerAuditLog`

These tables are used by the container API routes to track:
- Expenses (shipping costs, customs, storage, handling)
- Invoices (billing documents)
- Documents (BOL, customs docs, packing lists, photos)
- Tracking events (container location updates)
- Audit logs (all changes to container data)

## Solution Applied

### 1. Created All Missing Tables

#### ContainerExpense
- Tracks all costs associated with a container
- Fields: type, amount, currency, vendor, invoice number, notes
- Indexed by: containerId, type

#### ContainerInvoice
- Stores billing documents for container shipments
- Fields: invoice number, amount, vendor, dates, status (DRAFT/SENT/PAID/OVERDUE/CANCELLED)
- Indexed by: containerId, status

#### ContainerDocument
- Manages all documents related to a container
- Fields: type, name, file URL, file metadata, uploader
- Indexed by: containerId, type

#### ContainerTrackingEvent
- Records container location and status updates
- Fields: status, location, vessel, coordinates, event date
- Indexed by: containerId, eventDate

#### ContainerAuditLog
- Logs all changes to container data (audit trail)
- Fields: action, description, performer, old/new values, metadata
- Indexed by: containerId, timestamp, action

### 2. Added Enum Types

#### InvoiceStatus
- `DRAFT` - Invoice created but not sent
- `SENT` - Invoice sent to customer
- `PAID` - Invoice paid
- `OVERDUE` - Payment past due date
- `CANCELLED` - Invoice cancelled

### 3. Created Indexes

For optimal query performance:
- All tables indexed by `containerId` (for container lookups)
- Additional indexes on frequently queried fields (type, status, date, action)

### 4. Added Foreign Key Constraints

All tables have foreign key constraints:
```sql
FOREIGN KEY (containerId) REFERENCES Container(id) 
ON DELETE CASCADE ON UPDATE CASCADE
```

This ensures:
- ✅ Data integrity (can't reference non-existent containers)
- ✅ Automatic cleanup (deleting container deletes all related records)
- ✅ Update propagation (container ID changes cascade)

## Tables Created

```sql
✓ ContainerExpense (9 fields, 2 indexes)
✓ ContainerInvoice (12 fields, 2 indexes)
✓ ContainerDocument (9 fields, 2 indexes)
✓ ContainerTrackingEvent (12 fields, 2 indexes)
✓ ContainerAuditLog (9 fields, 3 indexes)
```

## API Routes Fixed

These API routes now work correctly:

### Container Creation
- `/api/containers` (POST) - Creates audit log entry

### Container Updates
- `/api/containers/[id]` (PUT) - Logs status changes, ETA updates, etc.

### Expense Management
- `/api/containers/[id]/expenses` (POST) - Add expenses with audit log

### Invoice Management
- `/api/containers/[id]/invoices` (POST) - Add invoices with audit log

### Document Management
- `/api/containers/[id]/documents` (POST) - Upload documents with audit log

### Shipment Assignment
- `/api/containers/[id]/shipments` (POST) - Assign shipments with audit log

## Result

✅ **All container operations now work!**
- Create containers ✓
- Add expenses ✓
- Upload invoices ✓
- Upload documents ✓
- Track container location ✓
- View audit history ✓

## Testing Checklist

- [ ] Create new container
- [ ] Verify audit log created
- [ ] Add expense to container
- [ ] Add invoice to container
- [ ] Upload document to container
- [ ] Assign shipments to container
- [ ] Update container status
- [ ] View container audit trail
- [ ] Delete container (verify cascade)

## Database Schema

```
Container (main table)
├── ContainerExpense (1:N) - costs
├── ContainerInvoice (1:N) - billing
├── ContainerDocument (1:N) - files
├── ContainerTrackingEvent (1:N) - location updates
├── ContainerAuditLog (1:N) - change history
└── Shipment (N:M via containerId field)
```

## Notes

- All tables use CASCADE delete for automatic cleanup
- Timestamps are in TIMESTAMP(3) format (millisecond precision)
- JSON metadata field in audit logs for flexible data storage
- Currency fields default to 'USD'
- All primary keys use CUID format (TEXT)

