# 🗄️ JACXI Shipping Database Setup Guide

## Overview
This guide provides comprehensive instructions for setting up the Prisma database schema, migrations, and data seeding for the JACXI Shipping platform.

## 🚀 Quick Start

### 1. Environment Setup
Create a `.env.local` file with your database configuration:

```env
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/jacxi_shipping"

# NextAuth Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-super-secret-key-here"

# OAuth Providers (Optional)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

### 2. Database Setup Commands

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database (for development)
npm run db:push

# OR run migrations (for production)
npm run db:migrate

# Seed the database with sample data
npm run db:seed

# Open Prisma Studio (database GUI)
npm run db:studio
```

### 3. Complete Setup (One Command)
```bash
npm run db:setup
```

## 📊 Database Schema

### Core Models

#### User Management
- **User** - User accounts with authentication
- **Account** - OAuth provider accounts
- **Session** - User sessions
- **VerificationToken** - Email verification

#### Shipping Operations
- **Shipment** - Vehicle shipping records
- **ShipmentEvent** - Tracking events and status updates
- **Quote** - Shipping quotes and estimates

#### Content Management
- **BlogPost** - Blog articles and content
- **Testimonial** - Customer reviews and testimonials
- **Contact** - Contact form submissions
- **Newsletter** - Newsletter subscriptions

## 🛠️ Available Scripts

### Development Scripts
```bash
# Generate Prisma client
npm run db:generate

# Push schema changes (development)
npm run db:push

# Create and run migrations (production)
npm run db:migrate

# Deploy migrations (production)
npm run db:migrate:deploy
```

### Data Management Scripts
```bash
# Seed database with sample data
npm run db:seed

# Backup database
npm run db:backup

# Reset database (development only)
npm run db:reset

# Full reset with reseeding
npm run db:full-reset
```

### Utility Scripts
```bash
# Open Prisma Studio
npm run db:studio

# Complete setup (generate + push + seed)
npm run db:setup
```

## 📈 Sample Data

### Users
- **Admin User**: `admin@jacxi.com` / `admin123`
- **Demo Customer**: `customer@example.com` / `customer123`

### Shipments
- 3 sample shipments with different statuses
- Complete tracking events for each shipment
- Realistic vehicle information and pricing

### Content
- 5 customer testimonials
- 3 blog posts about shipping
- 2 contact inquiries
- Newsletter subscriptions

## 🎉 Success!

Your JACXI Shipping database is now fully configured with:
- ✅ Complete schema with all models
- ✅ Sample data for testing
- ✅ Database utilities and services
- ✅ Backup and migration scripts
- ✅ Production-ready configuration

The database supports all platform features including user management, shipment tracking, quotes, content management, and analytics.
