# Business Flow Diagrams - Jacxi Shipping

**Visual Reference Guide**  
**Date:** January 31, 2026

---

## Current System Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    JACXI SHIPPING WORKFLOW                       │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐
│   CUSTOMER   │
│  Has Vehicle │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ STEP 1: ADMIN CREATES SHIPMENT                               │
├──────────────────────────────────────────────────────────────┤
│ • Vehicle details (VIN, make, model, year)                   │
│ • Insurance value, weight                                    │
│ • Payment mode (CASH or DUE)                                 │
│ • Upload photos                                              │
│ • Status: ON_HAND                                            │
└──────┬───────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ STEP 2: AUTO-CREATE LEDGER ENTRY                            │
├──────────────────────────────────────────────────────────────┤
│ IF Payment Mode = CASH:                                      │
│   → Create CREDIT entry (payment received)                   │
│   → Shipment status = COMPLETED                              │
│                                                               │
│ IF Payment Mode = DUE:                                       │
│   → Create DEBIT entry (amount owed)                         │
│   → Shipment status = PENDING                                │
└──────┬───────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ STEP 3: ASSIGN TO CONTAINER                                  │
├──────────────────────────────────────────────────────────────┤
│ • Find container with available capacity                     │
│ • Check: currentCount < maxCapacity (default: 4)             │
│ • Assign shipment to container                               │
│ • Update: currentCount++                                     │
│ • Update shipment status: IN_TRANSIT                         │
└──────┬───────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ STEP 4: CONTAINER LIFECYCLE                                  │
├──────────────────────────────────────────────────────────────┤
│ 1. CREATED            → Container initialized                │
│ 2. WAITING_FOR_LOADING → Ready to load vehicles             │
│ 3. LOADED             → All vehicles loaded                  │
│ 4. IN_TRANSIT         → Sailing to destination               │
│ 5. ARRIVED_PORT       → Arrived at port                      │
│ 6. CUSTOMS_CLEARANCE  → Going through customs                │
│ 7. RELEASED           → Cleared, ready for delivery          │
│ 8. CLOSED             → All vehicles delivered               │
└──────┬───────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ STEP 5: ADD CONTAINER EXPENSES                               │
├──────────────────────────────────────────────────────────────┤
│ Types of Expenses:                                            │
│ • Shipping Fee: $5,000                                       │
│ • Customs Fee: $800                                          │
│ • Storage: $400                                              │
│ • Handling: $300                                             │
│ • Documentation: $200                                        │
│                                                               │
│ Total: $6,700                                                │
│ Per Vehicle (4 cars): $1,675 each                            │
└──────┬───────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ STEP 6: GENERATE INVOICE (Automated)                         │
├──────────────────────────────────────────────────────────────┤
│ Trigger: Manual or Daily Cron (9 AM)                         │
│                                                               │
│ For Each Customer in Container:                              │
│   Line Items:                                                 │
│   • Vehicle 1 Price: $8,000                                  │
│   • Vehicle 1 Insurance: $400                                │
│   • Shared Expenses: $1,675                                  │
│   • Vehicle 2 Price: $12,000                                 │
│   • Vehicle 2 Insurance: $600                                │
│   • Shared Expenses: $1,675                                  │
│                                                               │
│   Subtotal: $24,350                                          │
│   Tax (0%): $0                                               │
│   Discount: $0                                               │
│   TOTAL: $24,350                                             │
│                                                               │
│   Due Date: 30 days from issue                               │
│   Invoice #: INV-2026-0042                                   │
└──────┬───────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ STEP 7: CUSTOMER PAYMENT (Currently Manual)                  │
├──────────────────────────────────────────────────────────────┤
│ Admin Records Payment:                                        │
│ • Amount: $24,350                                            │
│ • Payment method: Wire Transfer                              │
│ • Reference: TXN-123456                                      │
│                                                               │
│ System Auto-Actions:                                          │
│ • Create CREDIT ledger entry                                 │
│ • Distribute payment across shipments                        │
│ • Update shipment payment status → COMPLETED                 │
│ • Update invoice status → PAID                               │
└──────┬───────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────┐
│   COMPLETE   │
│   Shipment   │
│   Delivered  │
└──────────────┘
```

---

## Proposed Improved Flow (With Automation)

```
┌─────────────────────────────────────────────────────────────────┐
│              IMPROVED WORKFLOW (With 3 Ps)                       │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐
│   CUSTOMER   │
│  Has Vehicle │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ STEP 1: ADMIN CREATES SHIPMENT (Same)                        │
└──────┬───────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ STEP 2: AUTO-CREATE LEDGER + SEND EMAIL 📧 ✨ NEW           │
├──────────────────────────────────────────────────────────────┤
│ • Create ledger entry (same as before)                       │
│ • Send email to customer:                                    │
│   "Your vehicle shipment has been created!"                  │
│   - Tracking information                                     │
│   - Expected timeline                                        │
│   - Contact information                                      │
└──────┬───────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ STEP 3: ASSIGN TO CONTAINER (Same)                           │
└──────┬───────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ STEP 4: CONTAINER LIFECYCLE + AUTO-TRACKING ✨ NEW           │
├──────────────────────────────────────────────────────────────┤
│ Every 6 hours, system automatically:                         │
│ • Polls shipping line API (Maersk, MSC, etc.)               │
│ • Updates container status                                   │
│ • Creates tracking events                                    │
│ • Sends email to customers: 📧                               │
│   "Your container status updated: IN_TRANSIT"                │
│   "Current location: Singapore Port"                         │
│   "ETA: Jan 15, 2026"                                        │
└──────┬───────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ STEP 5: EXPENSES + WEIGHTED ALLOCATION ✨ NEW                │
├──────────────────────────────────────────────────────────────┤
│ Old Method (Equal):                                           │
│ • $6,700 ÷ 4 vehicles = $1,675 each                         │
│                                                               │
│ New Method (By Value):                                        │
│ • Vehicle 1 value: $8,000 (20%) → $1,340                    │
│ • Vehicle 2 value: $12,000 (30%) → $2,010                   │
│ • Vehicle 3 value: $15,000 (37.5%) → $2,512.50              │
│ • Vehicle 4 value: $5,000 (12.5%) → $837.50                 │
│                                                               │
│ Fairer distribution based on actual value!                   │
└──────┬───────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ STEP 6: GENERATE INVOICE + EMAIL 📧 ✨ NEW                  │
├──────────────────────────────────────────────────────────────┤
│ • System generates invoice (same as before)                  │
│ • Automatically emails customer:                             │
│   "Your invoice is ready!"                                   │
│   - PDF attachment                                           │
│   - Payment link (Stripe) 💳                                 │
│   - Due date reminder                                        │
│   - Tracking link                                            │
└──────┬───────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ STEP 7: ONLINE PAYMENT 💳 ✨ NEW                            │
├──────────────────────────────────────────────────────────────┤
│ Customer clicks "Pay Now" button in email                    │
│   ↓                                                           │
│ Opens Stripe payment page                                    │
│   ↓                                                           │
│ Enters credit card details                                   │
│   ↓                                                           │
│ Pays instantly                                               │
│   ↓                                                           │
│ System automatically:                                         │
│ • Receives webhook from Stripe                               │
│ • Creates ledger entry                                       │
│ • Updates invoice → PAID                                     │
│ • Updates shipments → COMPLETED                              │
│ • Sends receipt email 📧                                     │
│ • Sends "Thank you" email with tracking link                 │
│                                                               │
│ No admin intervention needed! ✨                             │
└──────┬───────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ STEP 8: OVERDUE REMINDERS 🔔 ✨ NEW                         │
├──────────────────────────────────────────────────────────────┤
│ If invoice not paid by due date:                             │
│                                                               │
│ Day 3 overdue:  📧 "Friendly reminder"                       │
│ Day 7 overdue:  📧 "Payment overdue - please pay"           │
│ Day 14 overdue: 📧 "Urgent: Invoice 14 days overdue"        │
│ Day 30 overdue: 📧 "Final notice"                            │
│                                                               │
│ All automated - no admin work! ✨                            │
└──────┬───────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────┐
│   COMPLETE   │
│   Shipment   │
│   Delivered  │
└──────────────┘
```

---

## Financial Flow (Ledger System)

```
┌─────────────────────────────────────────────────────────────┐
│               DOUBLE-ENTRY LEDGER SYSTEM                     │
└─────────────────────────────────────────────────────────────┘

Customer: John Smith
Shipments: 2 vehicles

┌──────────────┬──────────┬──────────┬──────────┬──────────┐
│ Date         │ Type     │ Debit    │ Credit   │ Balance  │
├──────────────┼──────────┼──────────┼──────────┼──────────┤
│ Jan 1, 2026  │ DEBIT    │ $8,000   │          │ -$8,000  │
│ (Vehicle 1)  │          │          │          │          │
├──────────────┼──────────┼──────────┼──────────┼──────────┤
│ Jan 2, 2026  │ DEBIT    │ $12,000  │          │ -$20,000 │
│ (Vehicle 2)  │          │          │          │          │
├──────────────┼──────────┼──────────┼──────────┼──────────┤
│ Jan 5, 2026  │ DEBIT    │ $400     │          │ -$20,400 │
│ (Insurance)  │          │          │          │          │
├──────────────┼──────────┼──────────┼──────────┼──────────┤
│ Jan 10, 2026 │ DEBIT    │ $3,350   │          │ -$23,750 │
│ (Expenses)   │          │          │          │          │
├──────────────┼──────────┼──────────┼──────────┼──────────┤
│ Jan 15, 2026 │ CREDIT   │          │ $10,000  │ -$13,750 │
│ (Payment 1)  │          │          │          │          │
├──────────────┼──────────┼──────────┼──────────┼──────────┤
│ Jan 20, 2026 │ CREDIT   │          │ $13,750  │ $0       │
│ (Payment 2)  │          │          │          │ ✅ PAID │
└──────────────┴──────────┴──────────┴──────────┴──────────┘

Running Balance = Sum of all entries
Payment Status = "COMPLETED" when Balance >= 0
```

---

## Expense Allocation Comparison

```
┌─────────────────────────────────────────────────────────────┐
│           CURRENT METHOD (Equal Distribution)                │
└─────────────────────────────────────────────────────────────┘

Total Container Expenses: $6,700
Number of Vehicles: 4

Vehicle 1 ($8,000 value)   → $1,675 (25%)
Vehicle 2 ($12,000 value)  → $1,675 (25%)
Vehicle 3 ($15,000 value)  → $1,675 (25%)
Vehicle 4 ($5,000 value)   → $1,675 (25%)

Issue: High-value and low-value cars pay the same! ❌

┌─────────────────────────────────────────────────────────────┐
│        IMPROVED METHOD (Weighted by Value) ✨ NEW            │
└─────────────────────────────────────────────────────────────┘

Total Container Expenses: $6,700
Total Vehicle Value: $40,000

Vehicle 1 ($8,000 value)   → $1,340 (20%)   ⬇️ Saves $335
Vehicle 2 ($12,000 value)  → $2,010 (30%)   ⬆️ Pays $335 more
Vehicle 3 ($15,000 value)  → $2,512 (37.5%) ⬆️ Pays $837 more
Vehicle 4 ($5,000 value)   → $837 (12.5%)   ⬇️ Saves $838

Result: Fairer pricing based on actual value! ✅

┌─────────────────────────────────────────────────────────────┐
│         ALTERNATIVE METHOD (Weighted by Weight) ✨ NEW       │
└─────────────────────────────────────────────────────────────┘

Total Container Expenses: $6,700
Total Weight: 8,000 lbs

Vehicle 1 (2,500 lbs SUV)  → $2,094 (31.25%)
Vehicle 2 (1,800 lbs Sedan) → $1,508 (22.5%)
Vehicle 3 (2,000 lbs Sedan) → $1,675 (25%)
Vehicle 4 (1,700 lbs Coupe) → $1,423 (21.25%)

Result: Heavier vehicles pay more (takes up more space) ✅
```

---

## Timeline Comparison: Before vs After

```
┌─────────────────────────────────────────────────────────────┐
│                  BEFORE IMPROVEMENTS                         │
└─────────────────────────────────────────────────────────────┘

Day 1:  Admin creates shipment
        ↓ (Manual work: 30 min)
        
Day 2:  Admin assigns to container
        ↓ (Manual work: 15 min)
        
Day 5:  Container departs
        ↓ (Admin checks shipping website)
        
Day 10: Admin manually updates status
        ↓ (Manual work: 30 min)
        
Day 15: Admin generates invoice
        ↓ (Manual work: 45 min)
        
Day 15: Admin emails invoice (copy/paste)
        ↓ (Manual work: 15 min)
        
Day 16: Customer calls asking about payment
        ↓ (Phone call: 10 min)
        
Day 16: Admin emails bank details
        ↓ (Manual work: 5 min)
        
Day 20: Customer initiates wire transfer
        ↓ (Wait time: 3-5 days)
        
Day 25: Payment arrives
        ↓ (Manual work: 20 min)
        
Day 25: Admin manually records payment
        ↓ (Manual work: 15 min)
        
Day 26: Admin emails receipt
        ↓ (Manual work: 10 min)

Total Admin Time: ~3.5 hours per container
Total Customer Wait: 25+ days

┌─────────────────────────────────────────────────────────────┐
│              AFTER IMPROVEMENTS ✨                           │
└─────────────────────────────────────────────────────────────┘

Day 1:  Admin creates shipment
        ↓ (Manual work: 30 min)
        📧 AUTO: Customer email sent ✨
        
Day 2:  Admin assigns to container
        ↓ (Manual work: 15 min)
        
Day 5:  Container departs
        ↓ (AUTO: System tracks via API) ✨
        📧 AUTO: Status email sent ✨
        
Day 10: System auto-updates status
        ↓ (Manual work: 0 min) ✨
        📧 AUTO: Update email sent ✨
        
Day 15: System generates invoice (cron)
        ↓ (Manual work: 0 min) ✨
        📧 AUTO: Invoice email + payment link ✨
        
Day 15: Customer clicks "Pay Now"
        ↓ (Customer self-service) ✨
        
Day 15: Customer pays with credit card
        ↓ (Instant payment) ✨
        
Day 15: System auto-records payment
        ↓ (Manual work: 0 min) ✨
        📧 AUTO: Receipt email sent ✨
        📧 AUTO: Thank you email ✨

Total Admin Time: ~45 minutes per container (-78%) ✅
Total Customer Wait: 15 days (-40%) ✅
Customer calls: 0 (-100%) ✅
```

---

## ROI Calculation

```
┌─────────────────────────────────────────────────────────────┐
│                    COST-BENEFIT ANALYSIS                     │
└─────────────────────────────────────────────────────────────┘

MONTHLY COSTS:
├─ Email Service (Resend)        $20
├─ Payment Processing (Stripe)   2.9% + $0.30 per transaction
├─ Tracking API (Searates)       $50
└─ TOTAL MONTHLY: ~$70 + transaction fees

ONE-TIME COSTS:
└─ Development (80 hours @ $100/hr) = $8,000

MONTHLY SAVINGS:
├─ Admin Time Saved
│  └─ 2.75 hours × 20 containers × $30/hr = $1,650
│
├─ Faster Payments
│  └─ 10 days faster × 20 invoices × $0.50/day = $100
│
├─ Reduced Support Calls
│  └─ 30 calls × 10 min × $30/hr = $150
│
└─ TOTAL MONTHLY SAVINGS: $1,900

PAYBACK PERIOD:
$8,000 ÷ ($1,900 - $70) = 4.4 months

ROI (Year 1):
($1,830 × 12) - $8,000 = $13,960
Return: 174% ✅
```

---

**Next Steps:** See IMPLEMENTATION_GUIDE.md for code examples  
**Questions?** Refer to BUSINESS_LOGIC_ANALYSIS.md for detailed comparison

**Document Version:** 1.0  
**Last Updated:** January 31, 2026
