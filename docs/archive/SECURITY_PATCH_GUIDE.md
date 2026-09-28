# Security Patch Guide

**Date:** January 30, 2026  
**Priority:** CRITICAL - Immediate Action Required

## 🚨 Critical Security Alert

This repository contains **CRITICAL security vulnerabilities** that must be patched immediately:

1. **Remote Code Execution (RCE)** in Next.js 15.1.6
2. **Local File Inclusion/Path Traversal** in jsPDF 3.0.4
3. **Denial of Service (DoS)** vulnerabilities
4. **Resource exhaustion** in undici

## Quick Fix Commands

### Step 1: Backup Current State (Optional but Recommended)
```bash
# Create a backup branch
git checkout -b backup-before-security-patch
git push origin backup-before-security-patch
git checkout copilot/scan-complete-code
```

### Step 2: Update Dependencies

```bash
# Update Next.js to latest stable (fixes RCE and other critical issues)
npm install next@latest

# Update jsPDF to v4 (fixes file inclusion vulnerability)
npm install jspdf@latest jspdf-autotable@latest

# Run audit fix for remaining issues
npm audit fix

# Verify no high/critical vulnerabilities remain
npm audit
```

### Step 3: Test the Application

```bash
# Generate Prisma client (if needed)
npm run db:generate

# Build the application
npm run build

# If build succeeds, start in development mode to test
npm run dev
```

### Step 4: Manual Testing Checklist

After updating dependencies, test these critical features:

- [ ] **Authentication** - Sign in/sign out works
- [ ] **PDF Generation** - Invoice PDFs generate correctly
- [ ] **File Uploads** - Photo uploads work (arrival/container photos)
- [ ] **API Routes** - All API endpoints respond correctly
- [ ] **Dashboard** - Main dashboard loads and displays data
- [ ] **Shipment Management** - Create/edit/view shipments
- [ ] **Container Management** - Create/edit/view containers
- [ ] **Finance System** - Invoices, payments, and ledger work
- [ ] **Search** - Global search functionality works

### Step 5: Review Breaking Changes

#### Next.js Updates
Check the [Next.js Release Notes](https://github.com/vercel/next.js/releases) for any breaking changes between 15.1.6 and the new version.

**Common issues to watch for:**
- Changes in Server Actions behavior
- Image optimization changes
- Middleware updates
- API route changes

#### jsPDF v3 → v4 Updates
Check the [jsPDF Changelog](https://github.com/parallax/jsPDF/releases) for breaking changes.

**Areas to review:**
- PDF generation code in `/src/app/api/invoices/[id]/pdf/route.ts`
- PDF export features
- Any custom PDF templates

## Expected Results After Patching

### Before Patching
```
5 vulnerabilities (2 moderate, 1 high, 2 critical)
```

### After Patching (Expected)
```
found 0 vulnerabilities
```

## Rollback Procedure (If Issues Occur)

If you encounter issues after updating:

```bash
# Restore package.json and package-lock.json
git checkout HEAD -- package.json package-lock.json

# Reinstall old dependencies
rm -rf node_modules
npm install

# Rebuild
npm run build
```

## Additional Security Hardening (Recommended)

After patching critical vulnerabilities, consider:

1. **Enable Dependabot** on GitHub for automatic security updates
2. **Set up GitHub Actions** to run `npm audit` on every PR
3. **Add security headers** in `next.config.ts`:
   ```typescript
   headers: async () => [
     {
       source: '/(.*)',
       headers: [
         { key: 'X-Frame-Options', value: 'DENY' },
         { key: 'X-Content-Type-Options', value: 'nosniff' },
         { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
       ],
     },
   ]
   ```
4. **Implement rate limiting** for API routes
5. **Regular security audits** - Run `npm audit` weekly

## Questions or Issues?

If you encounter problems during patching:

1. Check the detailed `CODE_SCAN_REPORT.md` for more context
2. Review the dependency changelogs for breaking changes
3. Test in a development environment first
4. Create a new issue in the repository with details

## Timeline

- **Immediate (Day 1):** Patch Next.js RCE vulnerability
- **Day 2:** Patch jsPDF vulnerability and test PDF generation
- **Day 3:** Complete testing and deploy to production
- **Ongoing:** Monitor for new vulnerabilities weekly

---

**Remember:** Do not deploy to production until all CRITICAL vulnerabilities are patched and tested.
