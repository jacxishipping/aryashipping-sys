# Validation Guide - JACXI Shipping Platform

## Overview
The JACXI Shipping platform uses **Zod** for schema validation and **React Hook Form** for form management to ensure robust input validation across all forms.

## Validation Schemas

### 1. Shipment Validation
**Location**: `src/lib/validations/shipment.ts`

#### Shipment Creation Schema
```typescript
vehicleType: string (required, min 1 char)
vehicleMake: string (optional)
vehicleModel: string (optional)
vehicleYear: string (optional, 1900-currentYear+1)
vehicleVIN: string (optional, min 17 chars if provided)
origin: string (required, min 3 chars)
destination: string (required, min 3 chars)
weight: string (optional, 0-50000 lbs)
dimensions: string (optional, max 100 chars)
specialInstructions: string (optional, max 1000 chars)
insuranceValue: string (optional, > 0)
price: string (optional, > 0)
```

#### Key Validations
- **Vehicle Type**: Must be selected
- **Origin/Destination**: Minimum 3 characters
- **VIN**: If provided, must be at least 17 characters
- **Vehicle Year**: Must be between 1900 and current year + 1
- **Weight**: Between 0 and 50,000 lbs
- **Financial Fields**: Must be positive numbers

### 2. Authentication Validation
**Location**: `src/lib/validations/auth.ts`

#### Sign In Schema
```typescript
email: string (valid email format)
password: string (min 6 characters)
```

#### Sign Up Schema
```typescript
name: string (2-100 characters)
email: string (valid email format)
password: string (min 8 chars, 1 uppercase, 1 lowercase, 1 number)
confirmPassword: string (must match password)
```

#### Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number

### 3. Shipment Events Validation
**Location**: `src/lib/validations/events.ts`

```typescript
status: string (required)
location: string (2-200 characters)
description: string (optional, max 500 chars)
completed: boolean (optional, default false)
latitude: string (optional, -90 to 90)
longitude: string (optional, -180 to 180)
```

## Implementation

### Using React Hook Form
All forms use React Hook Form for state management:

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { shipmentSchema } from '@/lib/validations/shipment';

const {
  register,
  handleSubmit,
  formState: { errors, isSubmitting },
} = useForm({
  resolver: zodResolver(shipmentSchema),
  mode: 'onBlur', // Validate on blur for better UX
});

// Register fields
<input {...register('vehicleType')} />
{errors.vehicleType && <p>{errors.vehicleType.message}</p>}
```

### Error Display
- Field-level errors appear below each input
- Red border on invalid fields
- Clear, descriptive error messages
- Submit button disabled during validation/ submission

## Form States

### Validation Modes
- **onBlur**: Validate when field loses focus (default)
- **onChange**: Validate on every keystroke (for real-time feedback)
- **onSubmit**: Validate only on form submission

### Submit States
- **isSubmitting**: Button shows "Creating..." / "Updating..." during submission
- **disabled**: Fields and buttons disabled to prevent multiple submissions
- **Error handling**: Server errors displayed at form level

## Field Types Supported

### Text Inputs
- Basic text validation
- Min/max length
- Custom regex patterns

### Number Inputs
- Min/max ranges
- Decimal precision
- Type conversion (string to number)

### Email
- Standard email format validation
- RFC 5322 compliant

### Password
- Minimum length
- Complexity requirements
- Confirmation matching

### Phone Numbers
- International format support
- Flexible formatting options
- Optional validation

### Dates
- ISO format validation
- Min/max date constraints
- Relative dates (e.g., future-only)

## Best Practices

### 1. Progressive Enhancement
- Client-side validation for immediate feedback
- Server-side validation for security
- Always validate on the server

### 2. User Experience
- Clear error messages in plain language
- Show errors near the relevant fields
- Use visual indicators (red borders, icons)
- Disable submit during processing

### 3. Security
- Never trust client-side validation alone
- Sanitize all inputs
- Use parameterized queries
- Validate file uploads

### 4. Accessibility
- Associate errors with form fields using ARIA
- Provide clear labels
- Support keyboard navigation
- Screen reader friendly messages

## Common Validation Patterns

### Required Field
```typescript
field: z.string().min(1, 'This field is required')
```

### Optional Field
```typescript
field: z.string().optional()
```

### Email
```typescript
email: z.string().email('Invalid email format')
```

### Number Range
```typescript
age: z.string().refine(
  (val) => parseInt(val) >= 18 && parseInt(val) <= 120,
  { message: 'Age must be between 18 and 120' }
)
```

### Custom Regex
```typescript
zipCode: z.string().regex(
  /^\d{5}(-\d{4})?$/,
  'Invalid ZIP code format'
)
```

### Conditional Validation
```typescript
password: z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Must contain uppercase letter')
  .regex(/[a-z]/, 'Must contain lowercase letter')
  .regex(/[0-9]/, 'Must contain a number')
```

## Testing Validation

### Manual Testing
1. Try submitting empty form → should show required field errors
2. Enter invalid data → should show format errors
3. Enter valid data → should submit successfully
4. Try concurrent submissions → should be prevented

### Automated Testing
```bash
# Run linter to check for TypeScript errors
npm run lint

# Check validation schemas
# All schemas are strongly typed with TypeScript
```

## Error Messages

All error messages are user-friendly and descriptive:
- ❌ Bad: "Invalid input"
- ✅ Good: "Email must be a valid email address"
- ❌ Bad: "Error"
- ✅ Good: "Password must contain at least one number"

## Extending Validation

To add new validation rules:

1. Update the Zod schema in `src/lib/validations/`
2. Import the schema in your form
3. Register fields with React Hook Form
4. Display errors conditionally
5. Test thoroughly

Example:
```typescript
// Add to schema
quantity: z.string()
  .refine((val) => parseInt(val) > 0, 
    { message: 'Quantity must be greater than 0' }
  )

// Use in form
<input {...register('quantity')} />
{errors.quantity && <span>{errors.quantity.message}</span>}
```

## Resources

- [Zod Documentation](https://zod.dev/)
- [React Hook Form Documentation](https://react-hook-form.com/)
- [Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

---

**Built for JACXI Shipping** 🚢

