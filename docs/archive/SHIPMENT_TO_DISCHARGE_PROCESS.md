# Shipment to Container Discharge Process

This document outlines the complete lifecycle of a shipment within the Jacxi system, detailing the workflow from initial vehicle reception to final container discharge. It incorporates new features such as document management, visual tracking, and the container-centric accounting system.

## 1. Shipment Intake & Creation
**Goal:** Record the initial receipt of a vehicle or cargo.

- **Actors:** Admin / Warehouse Staff / Customer (via Quote request)
- **Input Data:**
  - Vehicle Details (VIN, Make, Model, Year, Color).
  - Condition Report (Photos, Damage notes).
  - Owner/Customer assignment (`User` relation).
- **System Actions:**
  - Creates a `Shipment` record with status `ON_HAND`.
  - Validates VIN uniqueness.
  - Triggers "Received" notification to the customer.

## 2. Document Management
**Goal:** Ensure all legal and logistics documents are attached to the shipment before export.

- **Feature:** **Admin Document Upload**
- **Process:**
  - Admin navigates to the specific **Shipment Details** page.
  - Uses the "Documents" tab to upload files.
  - **Document Types:** Title, Bill of Sale, Power of Attorney, Export Power of Attorney.
  - **Storage:** Files are stored securely (e.g., AWS S3 or local uploads folder) and linked via the `Document` model.
- **Validation:**
  - System checks if critical documents (like Title) are present before allowing container assignment (optional config).

## 3. Container Planning & Loading
**Goal:** Group shipments into a container for export.

- **Process:**
  1.  **Create Container:** Admin creates a `Container` record (Booking #, Container #, Line, Ports).
  2.  **Assign Shipments:**
      - Admin views a list of `ON_HAND` shipments.
      - Selects vehicles to load into the container.
      - **Logic:** Max capacity (e.g., 4 cars) is checked.
  3.  **Update Status:**
      - Container status -> `LOADED`
      - Linked Shipments status -> `IN_TRANSIT`
  4.  **Container Documents:** Admin uploads Master Bill of Lading (MBL) and Shipping Instructions to the *Container* record.

## 4. Financials: Expenses & Invoicing
**Goal:** Track costs and generate customer invoices accurately.

### A. Expense Tracking (Container Level)
Admin records operational costs against the **Container**:
- **Ocean Freight:** $2,500
- **Terminal Handling (THC):** $300
- **Trucking/Drayage:** $400
- **Total Container Cost:** $3,200

### B. Cost Allocation Logic
How container expenses are split among shipments to generate the final invoice.

**Recommended Logic: "Per Car" Flat Rate + Extras**
1.  **Base Rate:** The shipping price agreed upon with the customer (e.g., $900/car) often covers standard freight.
2.  **Shared Costs (Dynamic):** If the agreement is "Cost Plus", shared expenses are divided by the number of cars in the container.
    - *Formula:* `(Total Container Expense / Number of Cars)`
    - *Example:* $3,200 / 4 cars = $800 cost allocation per car.

### C. Invoice Generation
Admin clicks **"Generate Invoices"** for a specific Container.
- **System Action:**
  - Iterates through all Shipments in the Container.
  - Creates a `UserInvoice` for each distinct Customer in that container.
  - **Invoice Items:**
    1.  **Shipment Charges:** (e.g., Towing to warehouse) - pulled from Shipment specific costs.
    2.  **Freight/Shipping:** Prorated share of container expenses OR flat agreed rate.
    3.  **Service Fees:** Fixed fees.
  - **Result:** A PDF invoice is generated and linked to the user's dashboard.

## 5. Tracking & Visibility
**Goal:** Provide transparency while maintaining privacy.

### A. Visual Tracking Map
- **Feature:** Interactive map showing the vessel's live location.
- **Data Source:** Integration with Tracking API (e.g., MarineTraffic or similar) using the Container's `trackingNumber` or Vessel Name.
- **Display:**
  - Admin sees global view of all containers.
  - User sees map focused only on *their* active containers.

### B. User Access Control (Privacy)
- **Rule:** A User can access the **Container Details** page **IF AND ONLY IF** they own a Shipment inside that container.
- **Filtered View:**
  - When a user views the Container page:
    - They see: Container Status, ETA, Current Location, Vessel Name.
    - They see: **Only their own** Shipment details in the loading list. Other users' shipments are hidden or shown as "Reserved Slot".
    - They see: Documents marked as `isPublic` (e.g., redacted MBL), but NOT private docs of other customers.

## 6. Discharge & Arrival
**Goal:** Process the container upon arrival at the destination port.

- **Process:**
  1.  **Arrival:** Admin updates Container status to `ARRIVED_PORT`.
  2.  **Unloading:**
      - Admin marks container as `CUSTOMS_CLEARANCE`.
      - "Unload" action moves Shipments from "Container" context to "Warehouse/Destination" context (conceptually).
  3.  **Release:**
      - Admin confirms Payment Status = `PAID` for the invoice.
      - **Gate Pass:** System generates a "Release Order" or "Gate Pass" for the customer to pick up the vehicle.
  4.  **Close:** Container marked as `CLOSED` / `RETURNED_TO_YARD`. Shipment marked as `DELIVERED`.

## Summary of Data Flow
`Shipment (On Hand)` -> `Assigned to Container` -> `Container Loaded` -> `In Transit (Tracking)` -> `Arrival` -> `Invoice Generated` -> `Payment` -> `Release`

## 7. Mobile Experience
**Goal:** Ensure all stakeholders can access critical data on the go.

- **Responsive Design:** All dashboard pages (Shipments, Containers, Invoices) are optimized for mobile devices.
- **Features:**
  - **Quick Scan:** QR Codes on container/shipment documents link directly to the tracking page.
  - **Photo Upload:** Warehouse staff can upload arrival photos directly from their mobile camera via the "Upload Photos" button on the Shipment Detail page.
  - **Status Checks:** Customers can check status and pay invoices via their mobile dashboard.
