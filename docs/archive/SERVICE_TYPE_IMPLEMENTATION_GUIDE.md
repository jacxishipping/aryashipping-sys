# Service Type Implementation Guide

## Overview

The shipping platform now supports two distinct business models:

1. **Purchase + Shipping**: Company purchases vehicles from auctions/dealers for customers and handles shipping
2. **Shipping Only**: Customers already own vehicles, company only provides shipping service

## Business Logic

### Service Type 1: Purchase + Shipping

**What it is:**
- Company acts as vehicle procurement agent + shipper
- Company buys cars from auctions (Copart, IAAI, etc.) or dealers on behalf of customers
- Provides end-to-end service: purchase + transportation

**Workflow:**
1. Customer requests specific vehicle or type
2. Company finds and purchases vehicle at auction/dealer
3. Company arranges shipping from purchase location to customer
4. Customer pays: Vehicle Purchase Price + Shipping Cost + Service Fees

**Data Tracked:**
- Vehicle purchase price (what company paid)
- Purchase date
- Dealer/Auction name (e.g., "Copart Dallas")
- Purchase location (city, state)
- Purchase notes (condition, bidding details, etc.)
- Shipping service price (separate from purchase)
- Total cost = Purchase Price + Shipping + Fees

**Example:**
```
Customer wants: 2020 Toyota Camry
Company finds one at: Copart Dallas for $15,000
Shipping cost: $1,200
Service fee: $500
Total to customer: $16,700

Records:
- Service Type: PURCHASE_AND_SHIPPING
- Purchase Price: $15,000
- Dealer: Copart Dallas
- Purchase Location: Dallas, TX
- Shipping Price: $1,200
- Total Invoice: $16,700
```

### Service Type 2: Shipping Only

**What it is:**
- Customer already owns the vehicle
- Company only provides transportation service
- No vehicle purchase involved

**Workflow:**
1. Customer has vehicle in USA (won vehicle at auction themselves, or already owns it)
2. Customer needs it shipped to final destination
3. Company provides shipping-only service
4. Customer pays: Shipping Cost + Service Fees only

**Data Tracked:**
- Vehicle details (for shipping purposes)
- Shipping service price
- No purchase information needed
- Total cost = Shipping + Fees

**Example:**
```
Customer has: 2018 Honda Accord (already owns it)
Current location: Los Angeles, CA
Destination: Customer's country
Shipping cost: $1,500
Service fee: $300
Total to customer: $1,800

Records:
- Service Type: SHIPPING_ONLY
- Purchase Price: N/A (customer owns vehicle)
- Shipping Price: $1,500
- Total Invoice: $1,800
```

## Database Schema Changes

### Shipment Model Updates

```prisma
model Shipment {
  // ... existing fields

  // NEW: Service Type
  serviceType         ServiceType           @default(SHIPPING_ONLY)
  
  // NEW: Purchase Information (only for PURCHASE_AND_SHIPPING)
  purchasePrice       Float?                // Vehicle purchase price
  purchaseDate        DateTime?             // Date vehicle was purchased
  purchaseLocation    String?               // Auction/Dealer location
  dealerName          String?               // Dealer or auction house name
  purchaseNotes       String?               // Additional purchase details
  
  // ... existing fields
}

enum ServiceType {
  PURCHASE_AND_SHIPPING  // Company buys car for customer + shipping
  SHIPPING_ONLY          // Customer already owns car, just shipping
}
```

## UI/UX Implementation

### New Shipment Form

**Step 1: Service Type Selection**

```
┌─────────────────────────────────────────────────────────┐
│ Service Type *                                          │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ [v] Shipping Only (Customer owns vehicle)           │ │
│ │     Purchase + Shipping (We buy for customer)       │ │
│ └─────────────────────────────────────────────────────┘ │
│ 🚚 Shipping Only: Customer already owns the vehicle,   │
│    we just handle shipping                              │
└─────────────────────────────────────────────────────────┘
```

**When "Purchase + Shipping" is selected:**

```
┌─────────────────────────────────────────────────────────┐
│ 💰 Purchase Information                                 │
├─────────────────────────────────────────────────────────┤
│ Purchase Price *     │ Purchase Date                    │
│ $15,000             │ 2026-01-15                       │
├─────────────────────────────────────────────────────────┤
│ Dealer/Auction       │ Purchase Location                │
│ Copart Dallas       │ Dallas, TX                       │
├─────────────────────────────────────────────────────────┤
│ Purchase Notes                                          │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Vehicle won at auction. Clean title. Minor front    │ │
│ │ bumper damage, otherwise excellent condition.       │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Review & Summary

**For Purchase + Shipping:**
```
Shipment Summary
─────────────────────────────────────────
Service Type:      📦 Purchase + Shipping
Vehicle:           2020 Toyota Camry
VIN:               1HGCR2F3XFA123456
Purchase Price:    $15,000
Shipping Price:    $1,200
─────────────────────────────────────────
💰 Purchase Details
Dealer/Auction:    Copart Dallas
Location:          Dallas, TX
Purchase Date:     Jan 15, 2026
─────────────────────────────────────────
Total Cost:        $16,700
```

**For Shipping Only:**
```
Shipment Summary
─────────────────────────────────────────
Service Type:      🚚 Shipping Only
Vehicle:           2018 Honda Accord
VIN:               1HGCR2F3XFA789012
Shipping Price:    $1,500
─────────────────────────────────────────
Total Cost:        $1,800
```

## Invoicing Logic

### Purchase + Shipping Invoice

```
INVOICE #INV-2026-001
─────────────────────────────────────────
2020 Toyota Camry (VIN: 1HGCR2F3XFA123456)

Line Items:
1. Vehicle Purchase Price      $15,000.00
   Purchased from: Copart Dallas
   
2. Shipping Service             $1,200.00
   From: Dallas, TX
   
3. Service Fee                    $500.00

─────────────────────────────────────────
Subtotal:                      $16,700.00
─────────────────────────────────────────
TOTAL:                         $16,700.00
```

### Shipping Only Invoice

```
INVOICE #INV-2026-002
─────────────────────────────────────────
2018 Honda Accord (VIN: 1HGCR2F3XFA789012)

Line Items:
1. Shipping Service             $1,500.00
   From: Los Angeles, CA
   
2. Service Fee                    $300.00

─────────────────────────────────────────
Subtotal:                       $1,800.00
─────────────────────────────────────────
TOTAL:                          $1,800.00
```

## Validation Rules

### Purchase + Shipping

**Required Fields:**
- ✅ Service Type: `PURCHASE_AND_SHIPPING`
- ✅ Purchase Price (must be > 0)
- ✅ Vehicle information (type, make, model, etc.)
- ✅ Shipping price

**Optional Fields:**
- Purchase Date
- Dealer/Auction Name
- Purchase Location
- Purchase Notes

**Business Rule:**
```typescript
if (serviceType === 'PURCHASE_AND_SHIPPING' && !purchasePrice) {
  throw Error('Purchase price is required for Purchase + Shipping service');
}
```

### Shipping Only

**Required Fields:**
- ✅ Service Type: `SHIPPING_ONLY`
- ✅ Vehicle information (type, make, model, etc.)
- ✅ Shipping price

**Not Required:**
- ❌ Purchase Price (should be null/undefined)
- ❌ Purchase Date
- ❌ Dealer Name
- ❌ Purchase Location
- ❌ Purchase Notes

## API Usage

### Create Purchase + Shipping Shipment

```typescript
POST /api/shipments

{
  "userId": "user-123",
  "serviceType": "PURCHASE_AND_SHIPPING",
  
  // Vehicle Info
  "vehicleType": "sedan",
  "vehicleMake": "Toyota",
  "vehicleModel": "Camry",
  "vehicleYear": 2020,
  "vehicleVIN": "1HGCR2F3XFA123456",
  
  // Purchase Info
  "purchasePrice": 15000,
  "purchaseDate": "2026-01-15",
  "dealerName": "Copart Dallas",
  "purchaseLocation": "Dallas, TX",
  "purchaseNotes": "Won at auction, clean title",
  
  // Shipping Info
  "price": 1200,
  "status": "ON_HAND"
}
```

### Create Shipping Only Shipment

```typescript
POST /api/shipments

{
  "userId": "user-456",
  "serviceType": "SHIPPING_ONLY",
  
  // Vehicle Info
  "vehicleType": "sedan",
  "vehicleMake": "Honda",
  "vehicleModel": "Accord",
  "vehicleYear": 2018,
  "vehicleVIN": "1HGCR2F3XFA789012",
  
  // Shipping Info (no purchase fields)
  "price": 1500,
  "status": "ON_HAND"
}
```

## Business Benefits

### For Company

1. **Clear Service Differentiation**
   - Track which shipments include vehicle purchase
   - Understand profit margins on each service type
   - Separate revenue streams

2. **Better Cost Tracking**
   - Purchase costs tracked separately from shipping
   - Know exactly what was paid for each vehicle
   - Accurate profit calculation per shipment

3. **Improved Reporting**
   - Total vehicles purchased vs shipping-only
   - Average purchase price analysis
   - Preferred dealers/auctions tracking
   - Profit margins by service type

### For Customers

1. **Transparency**
   - Clear breakdown: Purchase Price vs Shipping Cost
   - Know exactly what company paid for vehicle
   - Understand service fees

2. **Options**
   - Can buy vehicle themselves (shipping-only)
   - Or use full-service (purchase + shipping)
   - Flexibility based on customer preference

## Migration Strategy

### Existing Shipments

All existing shipments will default to `SHIPPING_ONLY` service type:

```sql
-- Migration will set default
UPDATE Shipment 
SET serviceType = 'SHIPPING_ONLY' 
WHERE serviceType IS NULL;
```

### Retroactive Updates

If needed, admins can update existing shipments:

```typescript
PATCH /api/shipments/[id]

{
  "serviceType": "PURCHASE_AND_SHIPPING",
  "purchasePrice": 15000,
  "dealerName": "Copart Dallas",
  // ... other purchase fields
}
```

## FAQ

**Q: What if customer bought vehicle themselves but we helped with purchase process?**  
A: Use `SHIPPING_ONLY` and note the assistance in internal notes. The service type refers to whether the company's name is on the purchase transaction.

**Q: Can we change service type after creation?**  
A: Yes, admins can edit shipments and change service type. Update purchase fields accordingly.

**Q: What if purchase price is unknown?**  
A: For `PURCHASE_AND_SHIPPING`, purchase price is required. If truly unknown, use estimated value and note in purchase notes.

**Q: How does this affect container expenses?**  
A: Container expenses (shipping costs) are allocated the same way regardless of service type. Purchase price is vehicle-specific, not a shared container expense.

**Q: Should insurance be based on purchase price or shipping price?**  
A: For `PURCHASE_AND_SHIPPING`, insurance value should typically be purchase price + shipping costs. For `SHIPPING_ONLY`, use the vehicle's market value.

## Testing Checklist

- [ ] Create shipment with PURCHASE_AND_SHIPPING service type
- [ ] Verify purchase fields are required
- [ ] Create shipment with SHIPPING_ONLY service type
- [ ] Verify purchase fields are NOT required
- [ ] Check invoice shows purchase price for PURCHASE_AND_SHIPPING
- [ ] Check invoice doesn't show purchase price for SHIPPING_ONLY
- [ ] Verify service type badge displays correctly
- [ ] Test editing service type from one to another
- [ ] Verify validation works correctly
- [ ] Check review step shows correct summary

## Future Enhancements

1. **Purchase Analytics Dashboard**
   - Average purchase price by vehicle type
   - Best performing auction houses
   - Purchase price trends over time

2. **Auction Integration**
   - Direct integration with Copart/IAAI APIs
   - Auto-populate purchase details
   - Live bidding status

3. **Purchase Approval Workflow**
   - Customer approves purchase before company bids
   - Set maximum bid limits
   - Notify customer when won

4. **Profit Margin Tracking**
   - Automatic calculation: (Shipping Price + Fees) vs (Purchase Price + Costs)
   - Profit margin per shipment
   - Performance metrics by service type

---

**Implementation Date**: January 31, 2026  
**Version**: 1.0  
**Status**: ✅ Ready for Production
