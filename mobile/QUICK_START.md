# Quick Start Guide

## Installation

```bash
cd mobile
npm install
```

## Configuration

```bash
cp .env.example .env
```

Edit `.env` and set your API URL:
```
EXPO_PUBLIC_API_URL=http://YOUR_IP:3000
```

**Important**: For physical devices, use your computer's local IP address (not localhost).

## Run the App

```bash
npm start
```

Then:
- Press `i` for iOS Simulator
- Press `a` for Android Emulator  
- Scan QR code with Expo Go app on your phone

## Test Login

### With Email/Password:
- Email: `admin@jacxi.com`
- Password: `password123`

### With Login Code:
- Code: `ADMIN123` (8 characters)

## What's Included

✅ **25 Complete Screens**
- Auth: Login, Login Code, Forgot Password
- Customer: 7 screens (Dashboard, Shipments, Tracking, Invoices, Profile, etc.)
- Admin: 15 screens (Dashboard, Shipments CRUD, Customers, Containers, etc.)

✅ **24 Reusable Components**
- 10 UI components (Button, Input, Card, Modal, Toast, etc.)
- 7 Shared components (Header, TabBar, StatusBadge, etc.)
- 4 Admin-specific, 3 Customer-specific

✅ **Full Features**
- Authentication with secure storage
- Role-based navigation (Admin/Customer)
- Real-time tracking
- Invoice management
- Dark mode support
- Smooth animations
- Pull-to-refresh
- Form validation
- Error handling

## Project Structure

```
mobile/
├── src/
│   ├── api/              # API clients
│   ├── components/       # Reusable components
│   ├── constants/        # Design tokens
│   ├── hooks/           # Custom hooks
│   ├── navigation/      # Navigation setup
│   ├── screens/         # Screen components
│   ├── store/           # Zustand stores
│   └── types/           # TypeScript types
└── App.tsx              # Root component
```

## Troubleshooting

### Cannot connect to API
- Check `EXPO_PUBLIC_API_URL` in `.env`
- Use your computer's IP, not `localhost` for physical devices
- Ensure backend is running

### Module not found
```bash
npm start -- --clear
```

### Need to reinstall
```bash
rm -rf node_modules
npm install
```

## Next Steps

1. Connect to your backend API
2. Test authentication flows
3. Explore admin and customer features
4. Customize colors/branding
5. Add additional screens as needed

## Support

- Check README.md for detailed documentation
- See IMPLEMENTATION_SUMMARY.md for architecture details
- All code is fully typed with TypeScript
- No placeholders - everything is implemented!

🎉 **Ready to ship!**
