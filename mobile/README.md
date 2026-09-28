# Jacxi Shipping Mobile App

Complete React Native (Expo + TypeScript) mobile app for the Jacxi Shipping platform.

## Features

- ✅ Authentication (Email/Password + 8-character Login Code)
- ✅ Role-based navigation (Admin/Customer)
- ✅ Shipment tracking & management
- ✅ Customer portal
- ✅ Invoice management
- ✅ Real-time notifications
- ✅ Dark mode support
- ✅ Smooth animations with Reanimated
- ✅ Type-safe with TypeScript

## Tech Stack

- **Framework**: Expo SDK 52
- **UI**: React Native 0.76.7
- **Navigation**: React Navigation 6
- **State Management**: Zustand
- **Server State**: React Query (TanStack Query)
- **Forms**: React Hook Form + Zod
- **Animations**: React Native Reanimated 3
- **Styling**: StyleSheet API (no external styling lib)

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac) or Android Emulator

### Installation

```bash
cd mobile
npm install
```

### Configuration

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Update the API URL in `.env`:
   ```
   EXPO_PUBLIC_API_URL=http://localhost:3000
   ```
   For physical devices, use your computer's IP address instead of localhost.

### Running the App

```bash
# Start Metro bundler
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android

# Run in web browser (limited functionality)
npm run web
```

### Development

```bash
# Type check
npm run type-check

# Lint code
npm run lint
```

## Project Structure

```
mobile/
├── App.tsx                 # Root component
├── src/
│   ├── api/               # API client & endpoints
│   ├── components/        # Reusable components
│   │   ├── ui/           # Base UI components
│   │   ├── shared/       # Shared components
│   │   ├── admin/        # Admin-specific
│   │   └── customer/     # Customer-specific
│   ├── constants/         # Design tokens
│   ├── hooks/            # Custom hooks
│   ├── navigation/       # Navigation setup
│   ├── screens/          # Screen components
│   │   ├── auth/         # Auth screens
│   │   ├── admin/        # Admin screens
│   │   └── customer/     # Customer screens
│   ├── store/            # Zustand stores
│   └── types/            # TypeScript types
└── package.json
```

## Design System

### Colors
- **Accent Gold**: #D4AF37
- **Background (Light)**: #F9FAFB
- **Background (Dark)**: #0A0A0A
- **Panel (Light)**: #FFFFFF
- **Panel (Dark)**: #1C1C1E

### Typography
- **System Fonts**: SF Pro (iOS), Roboto (Android)
- **Sizes**: xs (12px) to 5xl (48px)

### Spacing
- **Base Unit**: 16px
- **Scale**: xs (4px), sm (8px), md (12px), base (16px), lg (20px), xl (24px), 2xl (32px), 3xl (40px)

### Border Radius
- **Buttons/Inputs**: 8px
- **Cards**: 12px
- **Badges/Avatars**: 50% (full round)

## Authentication

### Email + Password
Standard email/password authentication with secure token storage.

### Login Code
8-character alphanumeric code for quick access. Displayed in user profile after login.

## User Roles

- **ADMIN**: Full admin dashboard with all management features
- **MANAGER**: Same as ADMIN
- **USER**: Customer portal with shipment tracking
- **CUSTOMER**: Same as USER

## API Integration

The app connects to the backend API at `EXPO_PUBLIC_API_URL`. All API calls:
- Use Axios with interceptors
- Handle auth tokens automatically
- Refresh tokens on 401
- Store tokens in Expo SecureStore

## Screens

### Customer App
- Dashboard: Overview with active shipments & quick actions
- Shipments: List & detail views
- Tracking: Track by number or VIN
- Invoices: View & manage invoices
- Profile: User info & settings

### Admin App
- Dashboard: KPIs, charts, recent activity
- Shipments: Full CRUD operations
- Customers: Customer management
- Containers: Container tracking
- Settings: Admin settings & profile

## State Management

- **Auth State**: Zustand store (`src/store/auth.ts`)
- **Server State**: React Query hooks (`src/hooks/`)
- **UI State**: Component-level with useState

## Animations

- Screen transitions: Slide/fade
- List items: Staggered fade-in
- Cards: Scale on press
- Loading states: Skeleton shimmer
- All animations use react-native-reanimated for 60fps performance

## Troubleshooting

### "Unable to connect to API"
- Verify `EXPO_PUBLIC_API_URL` in `.env`
- For physical devices, use your computer's local IP, not `localhost`
- Ensure backend server is running

### "Module not found" errors
- Clear cache: `expo start -c`
- Reinstall dependencies: `rm -rf node_modules && npm install`

### Build errors
- Update Expo: `npm install expo@latest`
- Rebuild: `expo prebuild --clean`

## Building for Production

### iOS
```bash
eas build --platform ios
```

### Android
```bash
eas build --platform android
```

## License

Proprietary - Jacxi Shipping Platform
