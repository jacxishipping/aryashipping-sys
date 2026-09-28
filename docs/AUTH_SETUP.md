# 🔐 JACXI Shipping Authentication Setup

## Overview
This document provides a comprehensive guide for setting up the authentication system for the JACXI Shipping platform using NextAuth.js v5 (beta) with Prisma and PostgreSQL.

## 🚀 Quick Start

### 1. Environment Variables
Create a `.env.local` file in the root directory with the following variables:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/jacxi_shipping"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-super-secret-key-here"

# Google OAuth (Optional)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

### 2. Database Setup
```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Seed the database with sample data
npm run db:seed
```

### 3. Start Development Server
```bash
npm run dev
```

## 🔧 Features Implemented

### Authentication Methods
- ✅ **Email/Password Authentication** - Traditional login with credentials
- ✅ **Google OAuth** - Social login with Google
- ✅ **Session Management** - JWT-based sessions
- ✅ **Password Hashing** - Secure password storage with bcrypt

### User Management
- ✅ **User Registration** - New user signup with validation
- ✅ **User Profiles** - User information and preferences
- ✅ **Role-Based Access** - Admin, Manager, and User roles
- ✅ **Protected Routes** - Middleware protection for dashboard

### Security Features
- ✅ **CSRF Protection** - Built-in CSRF protection
- ✅ **Password Validation** - Minimum requirements and confirmation
- ✅ **Session Security** - Secure session handling
- ✅ **Route Protection** - Middleware-based route protection

## 📁 File Structure

```
src/
├── app/
│   ├── api/auth/
│   │   ├── [...nextauth]/route.ts    # NextAuth API route
│   │   └── register/route.ts          # User registration API
│   ├── auth/
│   │   ├── signin/page.tsx            # Sign-in page
│   │   └── signup/page.tsx            # Sign-up page
│   └── dashboard/page.tsx              # Protected dashboard
├── components/
│   ├── auth/
│   │   └── ProtectedRoute.tsx         # Route protection component
│   └── providers/
│       └── SessionProvider.tsx        # NextAuth session provider
├── lib/
│   └── auth.ts                        # NextAuth configuration
└── middleware.ts                      # Route protection middleware
```

## 🎯 Authentication Flow

### 1. User Registration
```
User → Sign Up Page → API Route → Database → Success/Error
```

### 2. User Login
```
User → Sign In Page → NextAuth → Credentials/Google → Session → Dashboard
```

### 3. Protected Routes
```
User → Protected Route → Middleware → Session Check → Allow/Redirect
```

## 🔒 Security Considerations

### Password Security
- Passwords are hashed using bcrypt with salt rounds of 12
- Minimum password length validation
- Password confirmation on registration

### Session Security
- JWT tokens for stateless authentication
- Secure session configuration
- Automatic session expiration

### Route Protection
- Middleware-based protection
- Automatic redirects for unauthenticated users
- Role-based access control

## 🛠️ Database Schema

### User Model
```prisma
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  emailVerified DateTime?
  image         String?
  password      String?
  role          Role      @default(USER)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}
```

### Authentication Models
- `Account` - OAuth provider accounts
- `Session` - User sessions
- `VerificationToken` - Email verification tokens

## 🎨 UI Components

### Authentication Pages
- **Sign In Page** - Clean, responsive login form
- **Sign Up Page** - Registration with validation
- **Dashboard** - Protected user dashboard

### Navigation
- **Dynamic Navbar** - Shows login/logout based on session
- **User Menu** - Profile dropdown with logout option
- **Protected Links** - Dashboard access for authenticated users

## 🚀 Deployment Considerations

### Environment Variables
Ensure all required environment variables are set in production:
- `DATABASE_URL` - Production database connection
- `NEXTAUTH_SECRET` - Strong secret key
- `NEXTAUTH_URL` - Production domain
- OAuth provider credentials

### Database
- Use a production PostgreSQL database
- Run migrations: `npm run db:migrate`
- Seed initial data if needed

### Security
- Use HTTPS in production
- Set secure session cookies
- Configure CORS properly
- Use environment-specific secrets

## 🔧 Troubleshooting

### Common Issues

1. **Database Connection**
   - Verify `DATABASE_URL` is correct
   - Ensure database is running
   - Check network connectivity

2. **NextAuth Configuration**
   - Verify `NEXTAUTH_SECRET` is set
   - Check `NEXTAUTH_URL` matches your domain
   - Ensure OAuth credentials are correct

3. **Session Issues**
   - Clear browser cookies
   - Check session configuration
   - Verify middleware setup

### Debug Mode
Enable NextAuth debug mode by setting:
```env
NEXTAUTH_DEBUG=true
```

## 📚 Next Steps

1. **Email Verification** - Add email verification flow
2. **Password Reset** - Implement password reset functionality
3. **Two-Factor Authentication** - Add 2FA support
4. **Social Providers** - Add more OAuth providers
5. **Admin Panel** - Create admin interface for user management

## 🎉 Success!

Your JACXI Shipping platform now has a complete authentication system! Users can:
- Register new accounts
- Sign in with email/password or Google
- Access protected dashboard
- Manage their profile
- Track shipments securely

The system is production-ready with proper security measures and a clean user interface.
