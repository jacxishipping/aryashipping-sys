# Quick Setup Guide - Email & Automation

**Time to complete:** ~10 minutes

---

## Step 1: Get Resend API Key (5 minutes)

1. **Go to** https://resend.com
2. **Sign up** (free tier: 100 emails/day)
3. **Verify your domain** or use `resend.dev` for testing
4. **Create API key:**
   - Click "API Keys" in sidebar
   - Click "Create API Key"
   - Give it a name (e.g., "Production")
   - Copy the key (starts with `re_`)

---

## Step 2: Add Environment Variables (2 minutes)

### Local Development (.env.local)

Create `.env.local` file in the root directory:

```bash
# Email Service
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxx

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Cron Security (generate a random string)
CRON_SECRET=your-random-secret-here
```

### Production (Vercel)

1. Go to your Vercel project
2. Click "Settings" → "Environment Variables"
3. Add these variables:

```
RESEND_API_KEY = re_xxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_APP_URL = https://yourdomain.com
CRON_SECRET = your-random-secret-here
```

---

## Step 3: Run Database Migration (1 minute)

```bash
npx prisma migrate dev --name add-expense-allocation-method
```

This adds the `expenseAllocationMethod` field to the Container table.

---

## Step 4: Test Email Functionality (2 minutes)

### Option A: Generate an Invoice

1. Go to your app
2. Navigate to a container with shipments
3. Generate an invoice
4. Check your email!

### Option B: Use API

```bash
curl -X POST http://localhost:3000/api/invoices/generate \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{
    "containerId": "your-container-id",
    "sendEmail": true
  }'
```

---

## Step 5: Test Payment Reminders (Optional)

### Manual Trigger:

```bash
curl http://localhost:3000/api/cron/send-payment-reminders \
  -H "Authorization: Bearer your-cron-secret"
```

### Automatic:
The cron job runs daily at 10 AM automatically in production.

---

## Step 6: Configure Weighted Allocation (Optional)

### Set allocation method for a container:

```sql
UPDATE "Container" 
SET "expenseAllocationMethod" = 'BY_VALUE'
WHERE "containerNumber" = 'CONT-001';
```

**Options:**
- `EQUAL` - Default, divide equally
- `BY_VALUE` - Based on insurance value (fairer)
- `BY_WEIGHT` - Based on vehicle weight
- `CUSTOM` - Reserved for future use

---

## ✅ Verification

### Check Email Service:

Look for this in console when generating invoice:
```
✅ Email sent to customer@example.com
```

Or if not configured:
```
⚠️  Resend API key not configured, skipping email send
```

### Check Payment Reminders:

Look for cron job output:
```json
{
  "success": true,
  "summary": {
    "overdueInvoicesChecked": 5,
    "remindersSent": 2,
    "statusUpdatedToOverdue": 3
  }
}
```

### Check Weighted Allocation:

Generate an invoice and check the expense line items. You should see:
```
"Shared Container Expenses (By Value)" instead of
"Shared Container Expenses (Equal Split)"
```

---

## 🎯 You're Done!

Your Jacxi Shipping platform now has:
- ✅ Automated email notifications
- ✅ Smart payment reminders
- ✅ Fair expense allocation

---

## 🐛 Common Issues

### "Email service not configured"
**Solution:** Add RESEND_API_KEY to environment variables

### "Domain not verified"
**Solution:** Verify your domain in Resend dashboard or use `resend.dev` for testing

### "Cron job not running"
**Solution:** Check that CRON_SECRET is set in Vercel environment variables

### "Weighted allocation not working"
**Solution:** Make sure you ran the Prisma migration

---

## 📞 Need Help?

Check the full documentation:
- IMPLEMENTATION_COMPLETE.md - Complete implementation details
- BUSINESS_LOGIC_ANALYSIS.md - Understanding the system

---

**Setup Time:** ~10 minutes  
**Difficulty:** Easy  
**Result:** Professional automated shipping platform! 🚀
