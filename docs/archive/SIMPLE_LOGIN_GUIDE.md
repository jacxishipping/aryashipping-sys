# Simple Login System for Customers

## Overview

This system provides an easy-to-use login method for customers using 8-character login codes instead of traditional email/password combinations. This is particularly helpful for users who may have difficulty with complex authentication systems.

## Features

- **Simple 8-character codes** - Easy to remember and type
- **Case-insensitive** - Works with uppercase or lowercase
- **No confusing characters** - Excludes O/0, I/1/l to avoid confusion
- **Admin-managed** - Codes are assigned by administrators
- **Secure** - Uses the same authentication system as regular logins
- **Accessible UI** - Large, clear input field with visual feedback

## How It Works

### For Customers

1. **Visit the Simple Login Page**
   - Go to `/auth/simple-login`
   - You'll see a large input field for your login code

2. **Enter Your 8-Character Code**
   - Type the code provided by our team
   - The code is automatically converted to uppercase
   - You can show/hide the code using the eye icon
   - Character counter shows your progress (0/8 to 8/8)

3. **Click Login**
   - The button activates when you've entered 8 characters
   - You'll be redirected to your dashboard if the code is valid

### For Administrators

1. **Generate a Login Code for a Customer**

   ```javascript
   // Using the API
   POST /api/users/login-code
   {
     "userId": "user-id-here",
     // Optionally specify a custom code:
     "customCode": "ABCD1234"
   }
   ```

2. **View a Customer's Login Code**

   ```javascript
   // Using the API
   GET /api/users/login-code?userId=user-id-here
   ```

3. **Remove a Login Code**

   ```javascript
   // Using the API
   DELETE /api/users/login-code?userId=user-id-here
   ```

## Code Format

- **Length**: Exactly 8 characters
- **Characters**: Letters (A-Z) and numbers (2-9)
- **Excluded**: O, 0 (zero), I, 1 (one), l (lowercase L) - to avoid confusion
- **Case**: Automatically converted to uppercase
- **Uniqueness**: Each code must be unique across all users

### Examples of Valid Codes
- `ABCD1234`
- `XYZ89ABC`
- `HELLO789`
- `SHIP2024`

### Examples of Invalid Codes
- `ABC123` (too short)
- `ABCD12345` (too long)
- `ABCDO123` (contains O)
- `ABC1I234` (contains I)

## Database Schema

```prisma
model User {
  // ... other fields
  loginCode        String?            @unique
  // ... other fields
  
  @@index([loginCode])
}
```

## Security Considerations

1. **Unique Codes**: Each code is unique to prevent conflicts
2. **Case-Insensitive**: Stored in uppercase, matched case-insensitively
3. **Same Auth System**: Uses NextAuth with JWT tokens like regular logins
4. **Admin-Only Management**: Only administrators can create/view/delete codes
5. **No Auto-Generation on Signup**: Codes must be explicitly created by admins

## URL Structure

- **Customer Login**: `/auth/simple-login`
- **Admin Login**: `/auth/signin` (traditional email/password)
- **Admin Signup**: `/auth/signup`

## Implementation Details

### Authentication Flow

1. User enters 8-character code
2. Code is sent to NextAuth credentials provider
3. Database lookup using case-insensitive search
4. If match found, user is authenticated
5. JWT token is created
6. User is redirected to dashboard

### API Endpoints

#### Generate/Update Login Code
```
POST /api/users/login-code
Authorization: Required (Admin only)

Body:
{
  "userId": "clxxx...",
  "customCode": "ABCD1234" // Optional
}

Response:
{
  "success": true,
  "message": "Login code updated successfully",
  "userId": "clxxx...",
  "name": "Customer Name",
  "email": "customer@example.com",
  "loginCode": "ABCD1234"
}
```

#### Get Login Code
```
GET /api/users/login-code?userId=clxxx...
Authorization: Required (Admin only)

Response:
{
  "userId": "clxxx...",
  "name": "Customer Name",
  "email": "customer@example.com",
  "loginCode": "ABCD1234"
}
```

#### Remove Login Code
```
DELETE /api/users/login-code?userId=clxxx...
Authorization: Required (Admin only)

Response:
{
  "success": true,
  "message": "Login code removed successfully",
  "userId": "clxxx...",
  "name": "Customer Name",
  "email": "customer@example.com"
}
```

## User Experience

### Simple Login Page Features

1. **Large, Clear Input Field**
   - 1.5rem font size
   - Letter-spaced for easy reading
   - Centered text
   - Gold accent color

2. **Visual Feedback**
   - Character counter (X/8 characters)
   - Show/hide code toggle
   - Error messages in large text
   - Disabled button until 8 characters entered

3. **Helpful Instructions**
   - Clear title: "Customer Login"
   - Subtitle: "Enter your 8-character login code"
   - Note: "(This code was provided to you by our team)"
   - Link to admin login for staff

4. **Accessibility**
   - Auto-focus on code input
   - Large touch targets
   - High contrast colors
   - Clear error messages

## Best Practices

### For Administrators

1. **Generate Codes for New Customers**
   - Create a login code immediately after creating a customer account
   - Write the code down and provide it to the customer securely
   - Consider using memorable codes (e.g., SHIP2024, CARGO123)

2. **Communicate Codes Securely**
   - Don't send codes via unsecure channels
   - Provide codes in person when possible
   - Use printed cards or secure messaging

3. **Track Code Assignment**
   - Keep a record of which customer has which code
   - Update codes if compromised
   - Remove codes for inactive accounts

### For Customers

1. **Keep Your Code Safe**
   - Don't share your code with others
   - Write it down in a safe place
   - Memorize it if possible

2. **Contact Support**
   - If you forget your code, contact our team
   - We can look it up or generate a new one for you
   - Have your account information ready

## Migration Guide

If you have existing customers, you can add login codes to their accounts:

```javascript
// Example: Add login codes to all existing customers
const customers = await prisma.user.findMany({
  where: { role: 'user' }
});

for (const customer of customers) {
  const response = await fetch('/api/users/login-code', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId: customer.id
    })
  });
  
  const data = await response.json();
  console.log(`Code for ${customer.name}: ${data.loginCode}`);
}
```

## Troubleshooting

### Common Issues

**"Invalid login code"**
- Check that the code is exactly 8 characters
- Verify there are no spaces
- Make sure you're using the latest code (not an old one)
- Contact support if the problem persists

**"This login code is already in use"**
- Each code must be unique
- The admin should generate a different code
- Or use the auto-generate feature

**Can't access admin panel**
- Login codes only work for customer accounts
- Administrators must use email/password at `/auth/signin`

## Future Enhancements

Potential improvements for this system:

1. **QR Code Generation** - Generate QR codes for easy mobile login
2. **SMS/Email Code Delivery** - Automated code distribution
3. **Code Expiration** - Optional expiration dates for codes
4. **Multiple Codes** - Support for multiple codes per user
5. **Code History** - Track code changes and usage
6. **Biometric Integration** - Add fingerprint/face recognition
7. **2FA Option** - Optional two-factor authentication
8. **Code Analytics** - Track login attempts and usage

## Support

For questions or issues with the simple login system:

1. Check this documentation first
2. Contact your administrator
3. Reach out to technical support
4. File an issue in the repository

## Summary

The Simple Login System provides an accessible, easy-to-use authentication method for customers who may struggle with traditional email/password systems. With 8-character codes, case-insensitive matching, and a clear, simple UI, it makes logging in as straightforward as possible while maintaining security and admin control.
