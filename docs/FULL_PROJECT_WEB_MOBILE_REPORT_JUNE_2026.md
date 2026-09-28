# Jacxi Shipping Full Project Report

Date: June 2, 2026

## Purpose

This report summarizes the implemented scope of the Jacxi Shipping platform across the web application and the mobile application, then compares both products side by side.

This report is based on the current repository structure, key route trees, navigation files, API modules, and the highest-signal project documentation. Where documentation and code can diverge, the route and screen inventory was treated as the source of truth.

## Platform Summary

Jacxi Shipping is a shipping operations platform centered on vehicle shipments, containerization, invoicing, finance tracking, document handling, user/customer management, and tracking visibility.

The platform currently consists of:

- A web application built on Next.js for operations, finance, customer management, workflow control, partner features, and public-facing marketing/tracking surfaces.
- A mobile application built on Expo React Native for role-based access to shipment, invoice, container, tracking, notification, and account workflows.
- A shared backend/API layer serving both apps.

## Core Business Domains

The codebase is organized around these core domains:

- Authentication and session management
- Customer and user management
- Shipment lifecycle management
- Container lifecycle management
- Dispatch and transit workflows
- Invoice and payment tracking
- Ledger and financial reporting
- Document and photo handling
- Tracking and public shipment visibility
- Notifications and reminders
- Search, analytics, and AI-assisted summaries
- Settings, admin tools, and auditability
- Public landing, quote, and contact experience
- Voice call agent and webhook-driven integrations

## Web Application Overview

The web app is the primary system-of-record and operational control center.

### Web Experience Layers

- Public marketing and lead-generation homepage
- Authenticated dashboard and internal workspace
- Admin and operations tools
- Customer-facing protected portal surfaces
- Public tracking and quote-related entry points
- API-first backend powering both web and mobile clients

### Web UI Shell and Navigation

The dashboard layout includes:

- Protected routing
- Session provider wrapping authenticated areas
- Header + sidebar layout
- Mobile bottom navigation for smaller screens
- Keyboard shortcut help
- Command palette support

This indicates the web app is designed as a full operations workspace rather than a simple CRUD admin panel.

## Web Features and Functions

### 1. Public Website and Lead Capture

The public homepage includes:

- Hero section
- Route and service previews
- Process explanation
- Province coverage section
- Mobile app promotion
- Testimonials
- Quote form section
- Contact section
- About mini section
- Animated landing effects

Functions:

- Brand presentation
- Service explanation
- Lead generation via quote/contact forms
- Public customer education
- Promotion of the mobile app as a companion product

### 2. Authentication and Access Control

Implemented/authenticated surfaces indicate:

- NextAuth-backed web authentication
- Separate mobile auth namespace for mobile-compatible JSON auth flows
- Role-aware access behavior
- Protected dashboard routes
- Profile/session endpoints

Functions:

- Email/password sign-in
- Mobile-compatible token/session sign-in flows
- Sign-out and profile recovery
- Role-based access to operational modules

### 3. Dashboard and Operations Workspace

The dashboard includes KPI and operational overview components such as:

- KPI grid
- Charts section
- Aging exceptions panel
- Operations panel
- AI-generated dashboard brief
- Quick actions
- Global search / smart search

Functions:

- Active shipment visibility
- Active container visibility
- Pending invoice visibility
- Dispatch workload visibility
- Recent operational exception surfacing
- Search-driven navigation and workflow acceleration

### 4. Shipment Management

Web shipment capabilities are broad and operationally central.

Implemented surfaces indicate:

- Shipment list and detail pages
- Shipment edit page
- Shipment APIs
- Bulk export, bulk update, and bulk delete endpoints
- Shipment calculators/cards/rows in dashboard components
- Tracking sync and shipment workflow support APIs

Functions:

- Create, read, update, and manage shipments
- View shipment details and timeline context
- Filter and review shipment status progression
- Bulk-operate on shipments
- Export shipment datasets
- Attach operational metadata and status transitions

### 5. Container Management

Container functionality is a major strength of the platform.

Implemented surfaces indicate:

- Container list and detail views
- Container tracking APIs
- Container timeline endpoints
- Container expense endpoints
- Container invoice endpoints
- Container document endpoints
- Container export endpoints

Functions:

- Create and manage containers
- Associate shipments/items with containers
- View timeline/history per container
- Track container state through shipping lifecycle
- Attach documents and finance records to containers
- Export container data

Documented but migration-gated support also exists for container capacity enforcement and capacity status.

### 6. Dispatch and Transit Management

The web app includes distinct operational layers for dispatches and transits.

Functions:

- Manage dispatch records
- Track shipment movement toward port/origin transfer points
- Manage transit records and events
- Confirm delivery on transit records
- Review event history for in-progress transport legs

This separates local movement, container movement, and delivery workflow into dedicated operational entities.

### 7. Customer and User Management

Dashboard route structure and APIs show support for:

- Customers module
- Users module
- User detail and edit flows
- Profile endpoints

Functions:

- Manage internal users and customer accounts
- Review customer-specific shipment and finance records
- Create and edit users
- Maintain profile data and permissions-driven access

### 8. Invoice Management and Payments

The web app includes a full invoice domain.

Implemented surfaces and APIs indicate:

- Invoice routes
- Invoice generation endpoint
- Record payment page
- Payment reminder cron endpoint
- User invoice aggregation on dashboard

Functions:

- Generate invoices
- Review invoice lists and invoice states
- Record payments manually
- Monitor pending and overdue balances
- Trigger reminder workflows

The business docs still identify online card processing as a future improvement rather than a completed feature.

### 9. Ledger and Finance System

Finance is deeper on web than on mobile.

Implemented surfaces and APIs indicate:

- Finance dashboard area
- Ledger list/detail endpoints
- Ledger payment endpoints
- Financial report endpoints
- Due-aging report endpoint
- Excel/PDF export endpoints
- Banking-related pages in the broader project

Functions:

- Track company ledgers
- Record ledger payments
- Produce due-aging and financial reports
- Export accounting views to Excel and PDF
- View finance and aging workflows from dashboard pages

### 10. Documents, Uploads, and Media

Document/media handling exists across shipment and container workflows.

Functions:

- Upload shipment/container photos and files
- Manage documents tied to operational records
- Store arrival/container photos
- Support authenticated admin uploads
- Render supporting records for inspection and audit trails

### 11. Tracking and Public Visibility

Tracking is exposed in both private and public modes.

Implemented surfaces indicate:

- Dashboard tracking route
- Public tracking API
- Tracking API/webhook integration
- Container tracking endpoint
- Shipment tracking sync cron jobs

Functions:

- Internal tracking review by operations users
- Public lookup/tracking exposure
- Provider sync into internal statuses
- Tracking event ingestion through webhook support

### 12. Search, Smart Search, and Command Features

The web app includes:

- Search API
- Global search component
- Smart search component
- Command palette provider

Functions:

- Cross-module lookup
- Faster navigation inside the dashboard
- Support for operators working across many records

### 13. Analytics and AI-Assisted Features

The web app includes:

- Analytics route area
- Dashboard charts
- AI dashboard brief endpoint/component
- AI document extract endpoint
- AI logs route

Functions:

- Operational analytics display
- KPI summarization
- AI-assisted extraction of document data
- AI-generated dashboard context or summaries

### 14. Notifications, Alerts, and Automation

The platform includes automation and reminder infrastructure.

Implemented/documented features include:

- Notifications APIs/routes
- Payment reminder cron
- Shipment status sync cron
- Delivery alert cron
- Tracking sync cron

Functions:

- Automated background checks for shipment/tracking status
- Overdue and due-date monitoring
- Notification-oriented backend support

Some automation features are documented as present in code but dependent on database migrations being active.

### 15. Partner Portals and External Collaboration

The web app includes a dedicated partner portals area.

Functions:

- Create and manage partner portals
- View partner portal details
- Edit portal records
- Review portal activity

This indicates support for third-party collaboration or relationship-specific workspace features.

### 16. Auditability and Compliance-Oriented Utilities

Implemented surfaces indicate:

- Audit logs API
- System tools route in mobile admin and admin settings areas on web
- Profile/settings modules

Functions:

- Operational traceability
- System-level diagnostics/admin actions
- Settings and profile control

### 17. Voice Agent and Communications Integration

The repository includes a voice call agent.

Functions:

- Twilio-compatible inbound voice webhook
- Access-code-driven phone interaction
- Shipment tracking and finance information through call flow
- Gemini-backed live assistant path over WebSockets

This is a notable differentiator on the web/backend side and is not mirrored in mobile.

## Mobile Application Overview

The mobile app is a role-based operational companion focused on day-to-day access rather than complete web parity.

### Mobile Architecture Summary

- Expo React Native app
- Role-based navigation
- Auth flow navigator
- Separate admin and customer navigators
- Zustand auth store
- React Query server-state hooks
- Secure token/session storage
- Axios API client with auth interceptors and refresh logic

### Mobile Authentication

Implemented auth screens and store behavior show:

- Email/password login
- 8-character login code login
- Forgot password screen
- Session restore on app launch
- Secure local session persistence
- Mobile sign-out and current-user restoration

Functions:

- Fast customer/admin access from device
- Alternate login-code-based authentication
- Role-aware post-login routing

### Mobile Customer Experience

Customer mobile users currently have direct access to:

- Dashboard
- Shipments list
- Shipment detail
- Tracking screen
- Invoices
- Notifications
- Profile/workspace
- Documents access route
- Container list/detail access route

Functions:

- Monitor active shipments
- View shipment details on the move
- Track by number or VIN
- Review invoices
- Receive and review notifications
- Access profile-level account information
- Open supporting documents and container details when needed

### Mobile Admin Experience

Admin mobile users currently have a much broader scope than customers.

Implemented admin screens include:

- Dashboard
- Shipments
- Shipment detail
- Shipment creation
- Customers
- Customer detail
- Containers
- Container detail
- Dispatches
- Invoices
- Finance
- Finance reports
- Aging report
- Banking
- Company ledgers
- Company ledger detail
- Documents
- Analytics
- Notifications
- Settings
- Users
- User detail/create/edit
- Partner portals
- Partner portal create/detail/edit/activity
- Transits
- Transit detail
- System tools

Functions:

- Review operational KPIs from mobile
- Manage shipments and customers while away from desktop
- Open finance and ledger views from device
- Review container and transit movement
- Access partner and user management features
- Reach notifications, tools, analytics, and settings on mobile

### Mobile Shared Functional Modules

The mobile API/client layer includes modules for:

- Auth
- Shipments
- Containers
- Customers
- Dispatches
- Documents
- Finance
- Invoices
- Notifications
- Partner portals
- Settings
- Tracking
- Transits
- Users
- Analytics

This confirms the mobile app is not a thin wrapper. It has first-class module coverage over the shared backend.

### Mobile User Experience Features

Documented and structured mobile UX features include:

- Dark mode support
- Animated tab bar and screen transitions
- Haptic feedback
- Loading states and skeletons
- Error states and retry behavior
- Safe-area-aware layouts
- Form validation
- Shared reusable UI components

### Mobile Technical Strengths

- Secure token handling via SecureStore
- Automatic session restoration
- Token refresh behavior on unauthorized responses
- Typed navigation and API layer
- Role-based experience separation
- App-ready structure for iOS, Android, Expo Go, and limited web mode

## Shared Capabilities Across Web and Mobile

The following domains are shared across both products, though web usually has more depth:

- Authentication
- Shipments
- Containers
- Tracking
- Invoices
- Notifications
- Documents
- Profile/account surfaces
- Finance-related visibility

Shared backend patterns:

- Shared API-driven data model
- Shared auth/user identity concepts
- Shared shipment/container/invoice/finance records
- Shared production backend URL model for mobile and web integration

## Web vs Mobile Comparison

### Strategic Positioning

- Web app: primary control tower and system-of-record
- Mobile app: fast access and field/remote operations companion

### Functional Breadth

- Web is broader in operational depth, automation, exports, public surfaces, and backend integrations.
- Mobile covers the main daily workflows and exposes many admin modules, but it is still a client of the broader web/backend platform.

### Web Strengths

- Public marketing site
- Rich dashboard workspace
- Full route/API surface
- Bulk shipment operations
- Export features
- AI document extraction and AI briefs
- Public tracking endpoints
- Voice agent integration
- Cron automation and webhooks
- Broader finance/reporting depth

### Mobile Strengths

- Native, role-based access from anywhere
- Secure session persistence on device
- Login-code flow optimized for quick access
- Focused operational screens for admins and customers
- Better convenience for shipment lookup, invoices, notifications, and field review
- Modern mobile UX with animations, haptics, and dark mode

### Areas with Strong Cross-Platform Parity

- Auth
- Shipments
- Tracking
- Invoices
- Notifications
- Containers
- Documents

### Areas Primarily Web-First

- Public website and quote capture
- Bulk actions and exports
- Deeper finance/ledger/reporting workflows
- AI document extraction
- Voice/call-agent features
- Cron-based background automation
- Webhook and integration administration
- Audit log depth

### Web-Only Or Missing On Mobile

Excluding partner portals as requested, the following web capabilities were verified in the repository but do not have a dedicated mobile screen, navigator entry, or clearly matching mobile module in the current inspected mobile app surface.

#### Public-facing business and acquisition features

- Full marketing homepage experience
- Service previews and route/coverage presentation
- Testimonials and public trust sections
- Quote request flow and quote-related public entry points
- Contact and lead-capture sections
- Public mobile-app promotion landing content

These are web-only by design and are not represented in the mobile app.

#### Dashboard productivity and workspace tooling

- Sidebar-based dashboard workspace shell
- Command palette support
- Keyboard shortcut help
- Global search
- Smart search
- Onboarding tour

These features improve desktop operational throughput and were not verified as dedicated mobile features.

#### AI and assistant features

- AI dashboard brief
- AI document extraction
- AI logs route area
- Voice/call-agent workflow
- Gemini-backed live voice assistant path

These are currently web/backend-centric capabilities with no direct mobile UI equivalent verified in the inspected mobile code.

#### Automation and event-driven backend features

- Payment reminder cron workflow
- Shipment status sync cron workflow
- Delivery alert cron workflow
- Tracking sync cron workflow
- Tracking webhook ingestion
- General webhook administration endpoints

Mobile can consume the resulting data, but these automation and integration control features are owned by the web/backend platform rather than the mobile client.

#### Search, audit, and operational oversight features

- Audit logs
- Navigation badge endpoints
- Search API-backed cross-module discovery
- AI logs operational review

These platform-observability features are not represented by dedicated mobile screens in the current app surface.

#### Advanced integration features

- IAAI lot lookup/integration routes
- Copart-related integration routes
- Plaid integration routes
- Finicity integration routes

These integrations exist in the web/backend surface and were not verified as user-facing mobile workflows.

#### Shipment and ledger utilities with no clear mobile equivalent

- Bulk shipment update
- Bulk shipment delete
- Bulk shipment export
- Ledger Excel export
- Ledger PDF export
- Web record-payment flow

Mobile includes finance, reports, and invoice-related screens, but these specific utility workflows were only verified on the web side.

#### Upload and public-service surfaces

- Direct authenticated upload endpoint for shipment/container media
- Photo-specific backend route area
- Public tracking endpoint namespace
- Public quotes endpoint namespace

The mobile app can view documents and shipment data, but these web/public service surfaces were not verified as dedicated mobile features.

### Areas Exposed on Mobile but Likely More Practical on Web

- Finance reports
- Aging reports
- Banking
- Company ledger detail
- Partner portal management
- User creation/editing
- System tools

These modules exist on mobile, but their workflow complexity suggests web remains the more efficient environment for heavy administrative work.

## A to Z Feature Index

This index maps platform capability areas alphabetically. If a letter does not have a distinct implemented module name in the current repository, it is marked accordingly.

- A: Analytics, AI dashboard brief, AI document extraction, audit logs, authentication
- B: Banking, billing/invoice-related balance tracking, bottom navigation on mobile and web-responsive dashboard
- C: Containers, customers, contact capture, command palette
- D: Dashboard, dispatches, documents, due-aging reports
- E: Exports, expense-linked container workflows, email/payment reminder automation support
- F: Finance, financial reports, forgot password, file/photo uploads
- G: Global search, Gemini-backed voice assistant path
- H: Homepage marketing flow, header/sidebar workspace shell
- I: Invoices, internal integrations with IAAI-related lot lookup
- J: No dedicated J-named module identified in the current codebase
- K: KPI dashboards, keyboard shortcut help
- L: Ledger management, lead capture, login code authentication
- M: Mobile app promotion, media upload, mobile auth namespace
- N: Notifications, nav badges
- O: Operations overview, onboarding tour support
- P: Partner portals, profile management, public tracking, photos, payment recording
- Q: Quote-related public lead capture, query/search workflows
- R: Reports, role-based navigation, reminders
- S: Shipments, search, settings, smart search, system tools
- T: Tracking, transits, testimonials, Twilio-compatible voice webhook
- U: Users, uploads, user invoices
- V: Voice agent, vehicle shipment workflows
- W: Webhooks, workspace navigation, web dashboard
- X: No dedicated X-named module identified in the current codebase
- Y: No dedicated Y-named module identified in the current codebase
- Z: No dedicated Z-named module identified in the current codebase

## Current Strengths

- Strong domain coverage for shipment operations
- Meaningful container and finance modeling
- Good role separation between admin and customer usage
- Shared API model across web and mobile
- Mobile app is substantial, not superficial
- Web app contains advanced operations, analytics, and integration layers

## Current Gaps or Caveats

- Some automation features are documented as migration-dependent before full activation.
- Business docs still describe online payments and some notification paths as future/improvement work rather than fully completed production features.
- Web remains the authoritative environment for the most complex operational tasks.
- Mobile has broad admin surface area, but some deep finance/admin workflows are likely more review-oriented than creation-heavy in practical use.

## Bottom-Line Comparison

If the question is which product is the main platform, the answer is the web app.

If the question is whether the mobile app is a real product or only a viewer, the answer is that it is a real role-based operational client with meaningful admin and customer workflows.

In practical terms:

- Web is where the company runs the business.
- Mobile is where users stay connected to the business.

## Recommended Uses by Platform

### Best Done on Web

- Heavy shipment administration
- Bulk updates and exports
- Ledger and reporting workflows
- Public lead capture and customer acquisition
- Integration management
- Voice agent operations
- System-wide analytics review

### Best Done on Mobile

- Quick shipment lookup
- Tracking checks on the move
- Invoice review
- Notification review
- Customer self-service access
- Field/operator access to containers, documents, and shipment detail
- Lightweight admin review and follow-up actions

## Source Anchors Used

Primary source anchors for this report included:

- Root README and feature/business summary documents
- Dashboard route tree under `src/app/dashboard`
- API route tree under `src/app/api`
- Mobile README and implementation summary
- Mobile screen inventory under `mobile/src/screens`
- Mobile navigators under `mobile/src/navigation`
- Mobile API modules under `mobile/src/api`
