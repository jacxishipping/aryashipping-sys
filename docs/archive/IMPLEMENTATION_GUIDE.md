# Implementation Guide - Business Logic Improvements

**Date:** January 31, 2026  
**Purpose:** Step-by-step guide to implement recommended business logic improvements

---

## Quick Reference

### Priority Matrix

```
┌─────────────────────────────────────────────────────────┐
│                    IMPACT vs EFFORT                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  High Impact    │ ⭐ Email Notifications (1-2 days)     │
│  Low Effort     │ ⭐ Payment Reminders (1 day)          │
│                 │ ⭐ Weighted Allocation (2 days)        │
│                                                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  High Impact    │ ⭐⭐⭐ Payment Gateway (1 week)        │
│  Med Effort     │ ⭐⭐⭐ Carrier Tracking (1 week)       │
│                 │ ⭐⭐ Quality Workflow (1 week)         │
│                                                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Med Impact     │ ⭐ Predictive Analytics (2-3 weeks)   │
│  High Effort    │ ⭐ Customs Automation (3-4 weeks)     │
│                 │ ⭐ Mobile App (4-6 weeks)             │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## Phase 1: Quick Wins (Week 1)

### 1. Email Notification System

**Goal:** Send automated emails for invoices and status updates

**Effort:** 1-2 days  
**Impact:** High  
**Complexity:** Low

#### Step 1: Choose Email Service

**Recommended:** Resend (modern, developer-friendly, free tier)

**Alternatives:**
- SendGrid (enterprise-grade, complex)
- AWS SES (cheap, requires AWS setup)
- Mailgun (reliable, paid)

#### Step 2: Install Dependencies

```bash
npm install resend
```

#### Step 3: Create Email Service

**File:** `src/lib/email.ts`

```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendInvoiceEmail({
  to,
  invoiceNumber,
  amount,
  dueDate,
  pdfUrl,
}: {
  to: string;
  invoiceNumber: string;
  amount: number;
  dueDate: string;
  pdfUrl: string;
}) {
  try {
    await resend.emails.send({
      from: 'invoices@jacxishipping.com',
      to,
      subject: `Invoice ${invoiceNumber} - $${amount.toFixed(2)}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">New Invoice from Jacxi Shipping</h1>
          <p>Hello,</p>
          <p>Your invoice is ready.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Invoice Number:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${invoiceNumber}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Amount Due:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">$${amount.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Due Date:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${dueDate}</td>
            </tr>
          </table>
          <p>
            <a href="${pdfUrl}" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Download Invoice PDF
            </a>
          </p>
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            Questions? Reply to this email or contact us at support@jacxishipping.com
          </p>
        </div>
      `,
    });
    return { success: true };
  } catch (error) {
    console.error('Email send failed:', error);
    return { success: false, error };
  }
}

export async function sendStatusUpdateEmail({
  to,
  containerNumber,
  status,
  message,
}: {
  to: string;
  containerNumber: string;
  status: string;
  message: string;
}) {
  try {
    await resend.emails.send({
      from: 'tracking@jacxishipping.com',
      to,
      subject: `Container ${containerNumber} - ${status}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">Shipment Update</h1>
          <p>Container <strong>${containerNumber}</strong> status has been updated:</p>
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="margin: 0; color: #1f2937;">${status}</h2>
            <p style="margin: 10px 0 0 0; color: #6b7280;">${message}</p>
          </div>
          <p>
            <a href="https://app.jacxishipping.com/tracking/${containerNumber}" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Track Your Shipment
            </a>
          </p>
        </div>
      `,
    });
    return { success: true };
  } catch (error) {
    console.error('Email send failed:', error);
    return { success: false, error };
  }
}
```

#### Step 4: Update Invoice Generation

**File:** `src/app/api/invoices/generate/route.ts`

Add after invoice creation:

```typescript
// Send invoice email
const user = await prisma.user.findUnique({
  where: { id: invoice.userId },
});

if (user?.email) {
  await sendInvoiceEmail({
    to: user.email,
    invoiceNumber: invoice.invoiceNumber,
    amount: invoice.total,
    dueDate: invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A',
    pdfUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/invoices/${invoice.id}/pdf`,
  });
}
```

#### Step 5: Add Environment Variables

**File:** `.env`

```bash
RESEND_API_KEY=re_xxxxxxxxxxxxx
NEXT_PUBLIC_APP_URL=https://app.jacxishipping.com
```

**Estimated Time:** 4-6 hours  
**Testing:** Send test emails, verify delivery

---

### 2. Overdue Payment Reminders

**Goal:** Automatically email customers with overdue invoices

**Effort:** 1 day  
**Impact:** High  
**Complexity:** Low

#### Step 1: Create Reminder Cron Job

**File:** `src/app/api/cron/send-payment-reminders/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendInvoiceEmail } from '@/lib/email';

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const today = new Date();
    
    // Find overdue invoices
    const overdueInvoices = await prisma.userInvoice.findMany({
      where: {
        status: 'PENDING',
        dueDate: {
          lt: today,
        },
      },
      include: {
        user: true,
      },
    });

    const results = [];

    for (const invoice of overdueInvoices) {
      const daysOverdue = Math.floor(
        (today.getTime() - new Date(invoice.dueDate!).getTime()) / (1000 * 60 * 60 * 24)
      );

      // Send reminder at 3, 7, 14, 30 days overdue
      if ([3, 7, 14, 30].includes(daysOverdue) && invoice.user.email) {
        await sendInvoiceEmail({
          to: invoice.user.email,
          invoiceNumber: invoice.invoiceNumber,
          amount: invoice.total,
          dueDate: new Date(invoice.dueDate!).toLocaleDateString(),
          pdfUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/invoices/${invoice.id}/pdf`,
        });

        // Mark invoice as OVERDUE
        await prisma.userInvoice.update({
          where: { id: invoice.id },
          data: { status: 'OVERDUE' },
        });

        results.push({
          invoiceId: invoice.id,
          daysOverdue,
          sent: true,
        });
      }
    }

    return NextResponse.json({
      success: true,
      processed: overdueInvoices.length,
      reminded: results.length,
      results,
    });
  } catch (error) {
    console.error('Payment reminder cron failed:', error);
    return NextResponse.json(
      { error: 'Failed to send reminders' },
      { status: 500 }
    );
  }
}
```

#### Step 2: Schedule Cron Job

**File:** `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/cron/auto-generate-invoices",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/cron/send-payment-reminders",
      "schedule": "0 10 * * *"
    }
  ]
}
```

**Estimated Time:** 2-3 hours  
**Testing:** Create test overdue invoice, verify reminder

---

### 3. Weighted Expense Allocation

**Goal:** Allow different expense allocation methods

**Effort:** 2 days  
**Impact:** Medium  
**Complexity:** Low

#### Step 1: Update Container Schema

**File:** `prisma/schema.prisma`

Add to Container model:

```prisma
model Container {
  // ... existing fields
  expenseAllocationMethod ExpenseAllocationMethod @default(EQUAL)
}

enum ExpenseAllocationMethod {
  EQUAL           // Current: divide equally
  BY_VALUE        // Based on vehicle insurance value
  BY_WEIGHT       // Based on vehicle weight
  CUSTOM          // Manual percentages
}
```

#### Step 2: Create Allocation Service

**File:** `src/lib/expense-allocation.ts`

```typescript
import { Shipment, Container, ContainerExpense } from '@prisma/client';

export function allocateExpenses(
  shipments: Shipment[],
  expenses: ContainerExpense[],
  method: 'EQUAL' | 'BY_VALUE' | 'BY_WEIGHT' | 'CUSTOM'
): Record<string, number> {
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const allocation: Record<string, number> = {};

  switch (method) {
    case 'EQUAL':
      const perShipment = totalExpenses / shipments.length;
      shipments.forEach(s => {
        allocation[s.id] = perShipment;
      });
      break;

    case 'BY_VALUE':
      const totalValue = shipments.reduce((sum, s) => sum + (s.insuranceValue || 0), 0);
      if (totalValue === 0) {
        // Fallback to equal if no values
        return allocateExpenses(shipments, expenses, 'EQUAL');
      }
      shipments.forEach(s => {
        const percentage = (s.insuranceValue || 0) / totalValue;
        allocation[s.id] = totalExpenses * percentage;
      });
      break;

    case 'BY_WEIGHT':
      const totalWeight = shipments.reduce((sum, s) => sum + (s.weight || 0), 0);
      if (totalWeight === 0) {
        // Fallback to equal if no weights
        return allocateExpenses(shipments, expenses, 'EQUAL');
      }
      shipments.forEach(s => {
        const percentage = (s.weight || 0) / totalWeight;
        allocation[s.id] = totalExpenses * percentage;
      });
      break;

    case 'CUSTOM':
      // Would require additional percentages field per shipment
      // For now, fallback to equal
      return allocateExpenses(shipments, expenses, 'EQUAL');
  }

  return allocation;
}
```

#### Step 3: Update Invoice Generation

**File:** `src/app/api/invoices/generate/route.ts`

Replace expense distribution logic:

```typescript
// OLD: Equal distribution
// const expensePerShipment = totalExpenses / userShipments.length;

// NEW: Use allocation method
import { allocateExpenses } from '@/lib/expense-allocation';

const expenseAllocations = allocateExpenses(
  userShipments,
  expenses,
  container.expenseAllocationMethod
);

// Then use expenseAllocations[shipment.id] for each shipment
```

**Estimated Time:** 4-5 hours  
**Testing:** Test each allocation method with sample data

---

## Phase 2: Core Enhancements (Weeks 2-3)

### 4. Stripe Payment Integration

**Goal:** Enable online credit card payments

**Effort:** 1 week  
**Impact:** High  
**Complexity:** Medium

#### Prerequisites

1. Create Stripe account
2. Get API keys (test + production)
3. Set up webhook endpoint

#### Step 1: Install Stripe

```bash
npm install stripe @stripe/stripe-js
```

#### Step 2: Create Stripe Service

**File:** `src/lib/stripe.ts`

```typescript
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

export async function createPaymentIntent(
  amount: number,
  currency: string = 'usd',
  metadata: Record<string, string> = {}
) {
  return await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // Convert to cents
    currency,
    metadata,
    automatic_payment_methods: {
      enabled: true,
    },
  });
}
```

#### Step 3: Create Payment API Route

**File:** `src/app/api/payments/create-intent/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createPaymentIntent } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { invoiceId } = await request.json();

  const invoice = await prisma.userInvoice.findUnique({
    where: { id: invoiceId },
  });

  if (!invoice || invoice.userId !== session.user.id) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }

  const paymentIntent = await createPaymentIntent(invoice.total, 'usd', {
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    userId: session.user.id,
  });

  return NextResponse.json({
    clientSecret: paymentIntent.client_secret,
  });
}
```

#### Step 4: Create Payment Page

**File:** `src/app/dashboard/invoices/[id]/pay/page.tsx`

```typescript
'use client';

import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { PaymentForm } from '@/components/payment/PaymentForm';
import { useState, useEffect } from 'react';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function PayInvoicePage({ params }: { params: { id: string } }) {
  const [clientSecret, setClientSecret] = useState('');

  useEffect(() => {
    fetch('/api/payments/create-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoiceId: params.id }),
    })
      .then(res => res.json())
      .then(data => setClientSecret(data.clientSecret));
  }, [params.id]);

  if (!clientSecret) {
    return <div>Loading payment form...</div>;
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <PaymentForm invoiceId={params.id} />
    </Elements>
  );
}
```

#### Step 5: Create Webhook Handler

**File:** `src/app/api/webhooks/stripe/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const { invoiceId, userId } = paymentIntent.metadata;

    // Update invoice
    await prisma.userInvoice.update({
      where: { id: invoiceId },
      data: {
        status: 'PAID',
        paidDate: new Date(),
        paymentMethod: 'Credit Card',
        paymentReference: paymentIntent.id,
      },
    });

    // Create ledger entry
    await prisma.ledgerEntry.create({
      data: {
        userId,
        description: `Payment received for invoice ${paymentIntent.metadata.invoiceNumber}`,
        type: 'CREDIT',
        amount: paymentIntent.amount / 100,
        balance: 0, // Calculate actual balance
        createdBy: 'SYSTEM',
        metadata: {
          source: 'stripe',
          paymentIntentId: paymentIntent.id,
        },
      },
    });
  }

  return NextResponse.json({ received: true });
}
```

**Estimated Time:** 20-30 hours  
**Testing:** Test card: 4242 4242 4242 4242

---

### 5. Real-Time Carrier Tracking

**Goal:** Automatically poll carrier APIs for container updates

**Effort:** 1 week  
**Impact:** High  
**Complexity:** Medium

#### Recommended Service: Searates API

**Alternatives:**
- ShipEngine
- project44
- FourKites

#### Step 1: Install HTTP Client

```bash
npm install axios
```

#### Step 2: Create Tracking Service

**File:** `src/lib/tracking.ts`

```typescript
import axios from 'axios';

export async function trackContainer(
  trackingNumber: string,
  shippingLine: string
) {
  try {
    const response = await axios.post(
      'https://api.searates.com/tracking',
      {
        tracking_number: trackingNumber,
        carrier_code: getCarrierCode(shippingLine),
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.SEARATES_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('Tracking failed:', error);
    return { success: false, error };
  }
}

function getCarrierCode(shippingLine: string): string {
  const carriers: Record<string, string> = {
    'MAERSK': 'MAEU',
    'MSC': 'MSCU',
    'CMA CGM': 'CMDU',
    'COSCO': 'COSU',
    'EVERGREEN': 'EGLV',
  };
  return carriers[shippingLine.toUpperCase()] || 'MAEU';
}
```

#### Step 3: Create Tracking Poller

**File:** `src/app/api/cron/sync-tracking/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { trackContainer } from '@/lib/tracking';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get active containers with tracking enabled
    const containers = await prisma.container.findMany({
      where: {
        autoTrackingEnabled: true,
        status: {
          in: ['IN_TRANSIT', 'ARRIVED_PORT', 'CUSTOMS_CLEARANCE'],
        },
        trackingNumber: {
          not: null,
        },
      },
    });

    const results = [];

    for (const container of containers) {
      const trackingData = await trackContainer(
        container.trackingNumber!,
        container.shippingLine || ''
      );

      if (trackingData.success) {
        // Create tracking events
        for (const event of trackingData.data.events) {
          await prisma.containerTrackingEvent.create({
            data: {
              containerId: container.id,
              status: event.status,
              location: event.location,
              description: event.description,
              eventDate: new Date(event.date),
              source: 'API',
              latitude: event.latitude,
              longitude: event.longitude,
            },
          });
        }

        // Update container status if needed
        const latestStatus = trackingData.data.events[0]?.status;
        if (latestStatus && latestStatus !== container.status) {
          await prisma.container.update({
            where: { id: container.id },
            data: {
              status: mapApiStatusToContainerStatus(latestStatus),
              currentLocation: trackingData.data.events[0]?.location,
              lastLocationUpdate: new Date(),
            },
          });
        }

        results.push({
          containerId: container.id,
          success: true,
          eventsAdded: trackingData.data.events.length,
        });
      }
    }

    return NextResponse.json({
      success: true,
      processed: containers.length,
      results,
    });
  } catch (error) {
    console.error('Tracking sync failed:', error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}

function mapApiStatusToContainerStatus(apiStatus: string): string {
  const mapping: Record<string, string> = {
    'LOADED': 'LOADED',
    'IN_TRANSIT': 'IN_TRANSIT',
    'ARRIVED': 'ARRIVED_PORT',
    'CUSTOMS': 'CUSTOMS_CLEARANCE',
    'RELEASED': 'RELEASED',
  };
  return mapping[apiStatus] || 'IN_TRANSIT';
}
```

#### Step 4: Schedule Tracking Sync

**File:** `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/cron/sync-tracking",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

**Estimated Time:** 25-35 hours  
**Testing:** Mock API responses, test status mapping

---

## Summary Checklist

### Week 1: Quick Wins
- [ ] Email service integration (Resend)
- [ ] Invoice email delivery
- [ ] Status update emails
- [ ] Overdue payment reminders cron
- [ ] Weighted expense allocation
- [ ] Test all email flows
- [ ] Test allocation methods

### Week 2-3: Core Features
- [ ] Stripe account setup
- [ ] Payment intent API
- [ ] Payment page UI
- [ ] Webhook handler
- [ ] Test payment flow
- [ ] Carrier tracking service
- [ ] Tracking poller cron
- [ ] Test tracking sync

### Environment Variables Needed

```bash
# Email
RESEND_API_KEY=re_xxxxx

# Stripe
STRIPE_SECRET_KEY=sk_test_xxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Tracking
SEARATES_API_KEY=xxxxx

# Security
CRON_SECRET=your-random-secret

# App
NEXT_PUBLIC_APP_URL=https://app.jacxishipping.com
```

### Success Metrics

**Week 1:**
- ✅ 100% of invoices emailed automatically
- ✅ Overdue reminders sent daily
- ✅ Multiple allocation methods available

**Week 2-3:**
- ✅ Online payments enabled
- ✅ Tracking auto-updates every 6 hours
- ✅ Customer portal shows real-time status

---

**Document Version:** 1.0  
**Last Updated:** January 31, 2026
