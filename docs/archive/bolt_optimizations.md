## Potential Optimizations

### 1. `src/app/api/finance/companies/[id]/reports/route.ts` and `src/app/api/finance/companies/[id]/ledger/route.ts`
Multiple `prisma.companyLedgerEntry.aggregate` queries.
Can be optimized to use `prisma.companyLedgerEntry.groupBy` with `type` IN ['DEBIT', 'CREDIT'] to calculate both sums in a single database roundtrip.
See memory: "To optimize database performance when calculating multiple category sums (e.g., DEBIT and CREDIT totals) from the same table, consolidate separate prisma.aggregate queries into a single prisma.groupBy query to reduce database roundtrips."

### 2. `src/app/api/analytics/route.ts`
Several potential N+1 or inefficient algorithms:
- `shipments.filter(shipment => monthKey(shipment.createdAt) === month.key).length` inside a `.map` over 6 months (O(M*N)). Could group by month in a single pass.
- Similar loop for `invoices.filter(...)` inside `.map` for revenue by month.

### 3. `src/app/api/analytics/profit-margins/route.ts`
Deep nested `include` might cause overfetching. Need to investigate.

### 4. `src/app/api/containers/[id]/route.ts`
Wait, let's check `src/app/api/ledger/route.ts` which has `.aggregate` for DEBIT and CREDIT as well.
## 2026-07-03 - 3D Hero Section Implementation
**Learning:** Successfully integrated Three.js with Next.js using dynamic imports and @react-three/fiber. Managed to create a realistic glass capsule effect using MeshTransmissionMaterial.
**Action:** Use dynamic imports for any heavy 3D components to avoid SSR issues and improve initial page load.
