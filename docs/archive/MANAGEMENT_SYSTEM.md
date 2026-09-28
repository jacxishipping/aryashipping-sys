# JACXI Shipping - Management System Guide

## Overview
The JACXI Shipping platform includes a comprehensive management system for handling shipments, tracking, and customer data.

## Features Implemented

### 1. Shipment Management
- **List View** (`/dashboard/shipments`)
  - View all shipments with pagination
  - Search by tracking number, origin, or destination
  - Filter by status (Pending, In Transit, Delivered, etc.)
  - Real-time progress indicators
  - Admin view: See all shipments from all customers
  - Customer view: See only your own shipments

- **Add New Shipment** (`/dashboard/shipments/new`)
  - Complete form with validation
  - Vehicle information (type, make, model, year, VIN)
  - Shipping details (origin, destination, dimensions, weight)
  - Financial information (price, insurance value)
  - Special instructions
  - Automatic tracking number generation
  - Creates initial tracking event

- **View Shipment** (`/dashboard/shipments/[id]`)
  - Complete shipment details
  - Tracking timeline with all events
  - Progress visualization
  - Financial information
  - Delivery dates and status
  - Admin view: Customer information included

- **Edit Shipment** (`/dashboard/shipments/[id]/edit`)
  - Update all shipment fields
  - Change status and progress
  - Update location and delivery estimates
  - Modify pricing and insurance

### 2. Authentication & Authorization
- **Protected Routes**: All management pages require authentication
- **Admin Routes**: Special component for admin-only access
- **Role-Based Access Control**:
  - Regular users: Can view/edit their own shipments
  - Admin users: Full access to all shipments and system functions

### 3. API Routes
- `GET /api/shipments` - List shipments (with pagination, filters, search)
- `POST /api/shipments` - Create new shipment
- `GET /api/shipments/[id]` - Get shipment details
- `PUT /api/shipments/[id]` - Update shipment
- `DELETE /api/shipments/[id]` - Delete shipment (admin only)
- `GET /api/shipments/[id]/events` - Get tracking events
- `POST /api/shipments/[id]/events` - Add tracking event (admin only)

## Getting Started

### 1. Set Up Database
```bash
# Create .env.local with your DATABASE_URL
# Then run:
npm run db:setup
```

### 2. Create Admin User
You can create an admin user manually in the database or through the registration API:

```bash
# Create a user through /api/auth/register
# Then update the user's role to 'admin' in the database
```

### 3. Start Development Server
```bash
npm run dev
```

### 4. Access Management Pages
- **Customer Dashboard**: `http://localhost:3000/dashboard`
- **All Shipments**: `http://localhost:3000/dashboard/shipments`
- **Add Shipment**: `http://localhost:3000/dashboard/shipments/new`

## User Roles

### Regular User (`user`)
- Can create new shipments
- Can view their own shipments
- Can edit their own shipments
- Cannot delete shipments
- Cannot add tracking events

### Admin User (`admin`)
- All regular user permissions
- Can view ALL shipments from all customers
- Can edit ANY shipment
- Can delete shipments
- Can add tracking events
- Can see customer information

## Shipment Statuses

The system supports the following shipment statuses:

1. **PENDING** - Initial status when shipment is created
2. **QUOTE_REQUESTED** - Customer has requested a quote
3. **QUOTE_APPROVED** - Quote has been approved
4. **PICKUP_SCHEDULED** - Pickup has been scheduled
5. **PICKUP_COMPLETED** - Vehicle has been picked up
6. **IN_TRANSIT** - Vehicle is in transit
7. **AT_PORT** - Vehicle is at port
8. **LOADED_ON_VESSEL** - Vehicle is loaded on vessel
9. **IN_TRANSIT_OCEAN** - Vehicle is crossing ocean
10. **ARRIVED_AT_DESTINATION** - Vehicle has arrived at destination
11. **CUSTOMS_CLEARANCE** - Going through customs
12. **OUT_FOR_DELIVERY** - Out for final delivery
13. **DELIVERED** - Successfully delivered
14. **CANCELLED** - Shipment was cancelled
15. **ON_HOLD** - Shipment is on hold

## Tracking Events

Tracking events provide real-time updates on shipment progress. Each event includes:
- Status update
- Location
- Timestamp
- Description (optional)
- Completion flag
- GPS coordinates (optional, for future map integration)

## Next Steps

### Additional Features to Consider:
1. **Email Notifications** - Notify customers on status changes
2. **PDF Generation** - Generate shipping labels and documents
3. **Export Data** - Export shipments to CSV/Excel
4. **Analytics Dashboard** - Statistics and reporting
5. **Customer Management** - Full customer CRUD
6. **Quote Management** - Manage quotes and convert to shipments
7. **Payment Tracking** - Track payments and invoices
8. **Bulk Operations** - Update multiple shipments at once
9. **Advanced Search** - More sophisticated filtering options
10. **Shipment Templates** - Save common shipment configurations

## Troubleshooting

### Common Issues:

1. **"Unauthorized" errors**
   - Make sure you're logged in
   - Check that your session is valid
   - Verify database connection

2. **"Forbidden" errors**
   - Check user role in database
   - Verify you have permission for the operation
   - Admin operations require 'admin' role

3. **Database errors**
   - Run `npm run db:generate` to regenerate Prisma client
   - Run `npm run db:migrate` to apply migrations
   - Check DATABASE_URL in .env.local

4. **Translation warnings**
   - All translations are in src/locales/
   - Add missing keys if needed
   - Restart dev server after changes

## File Structure

```
src/
├── app/
│   ├── dashboard/
│   │   ├── page.tsx                 # Main dashboard
│   │   └── shipments/
│   │       ├── page.tsx             # List all shipments
│   │       ├── new/
│   │       │   └── page.tsx         # Add new shipment
│   │       └── [id]/
│   │           ├── page.tsx         # View shipment
│   │           └── edit/
│   │               └── page.tsx     # Edit shipment
│   └── api/
│       └── shipments/
│           ├── route.ts             # List/Create shipments
│           ├── [id]/
│           │   ├── route.ts         # Get/Update/Delete shipment
│           │   └── events/
│           │       └── route.ts     # Get/Create events
├── components/
│   ├── auth/
│   │   ├── ProtectedRoute.tsx       # Route protection
│   │   └── AdminRoute.tsx           # Admin-only protection
│   └── ui/                          # Reusable components
└── lib/
    ├── auth.ts                      # NextAuth configuration
    └── db.ts                        # Prisma client
```

## Support

For issues or questions:
- Check the console for error messages
- Review the API responses in Network tab
- Verify database records in Prisma Studio: `npm run db:studio`
- Check authentication flow in auth providers

---

**Built for JACXI Shipping** 🚢

