# Health App

A React Native health tracking application built with Expo and Supabase.

## Features

- 🔐 User authentication (sign up, sign in, sign out)
- 📊 Health record tracking (weight, height, heart rate, blood pressure)
- 📱 Cross-platform support (iOS, Android, Web)
- 🎨 Modern UI with TailwindCSS/NativeWind
- ☁️ Cloud-based data storage with Supabase

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI (`npm install -g @expo/cli`)
- A Supabase account

### Installation

1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd Health-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up Supabase:
   - Follow the detailed instructions in `SUPABASE_SETUP.md`
   - Create a `.env` file with your Supabase credentials

4. Start the development server:
   ```bash
   npm start
   ```

### Supabase Setup

Please refer to `SUPABASE_SETUP.md` for detailed instructions on setting up your Supabase project and database.

## Project Structure

```
src/
├── components/          # React components
│   ├── HealthCard.tsx
│   ├── HealthDashboard.tsx
│   ├── LoginScreen.tsx
│   └── index.ts
├── hooks/              # Custom React hooks
│   ├── useAuth.ts
│   └── useHealthRecords.ts
├── lib/                # Utility libraries
│   └── supabase.ts
└── types/              # TypeScript type definitions
    └── database.types.ts
```

## Available Scripts

- `npm start` - Start the Expo development server
- `npm run android` - Run on Android device/emulator
- `npm run ios` - Run on iOS device/simulator
- `npm run web` - Run in web browser

## Technologies Used

- **React Native** - Mobile app framework
- **Expo** - Development platform
- **Supabase** - Backend as a Service
- **TypeScript** - Type-safe JavaScript
- **TailwindCSS/NativeWind** - Styling
- **React Hooks** - State management

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

A React Native application built with Expo and styled with NativeWind (Tailwind CSS for React Native).

## 🚀 Features

- React Native with Expo
- NativeWind for styling (Tailwind CSS)
- TypeScript support
- Pre-configured development environment
- Sample health tracking components

## 📦 Installation

The project is already set up with all dependencies. To get started:

```bash
npm install
```

## 🏃‍♂️ Running the App

### Development Server
```bash
npm start
```

### Platform-specific commands
```bash
# Android
npm run android

# iOS (macOS required)
npm run ios

# Web
npm run web
```

## 🎨 Styling with NativeWind

This project uses NativeWind, which brings Tailwind CSS to React Native. You can use Tailwind classes directly in your components:

```tsx
<View className="flex-1 bg-blue-500 items-center justify-center">
  <Text className="text-white text-xl font-bold">Hello NativeWind!</Text>
</View>
```

## 📁 Project Structure

```
├── src/
│   ├── components/       # Reusable components
│   └── screens/         # Screen components
├── assets/              # Images, fonts, etc.
├── App.tsx              # Main app component
├── global.css           # Global Tailwind styles
└── tailwind.config.js   # Tailwind configuration
```

## 🛠️ Configuration Files

- `tailwind.config.js` - Tailwind CSS configuration
- `metro.config.js` - Metro bundler configuration for NativeWind
- `babel.config.js` - Babel configuration with NativeWind plugin
- `nativewind-env.d.ts` - TypeScript declarations for NativeWind

## 🔧 Development

The app is ready for development with:
- Hot reloading
- TypeScript support
- Tailwind CSS intellisense (in VS Code)
- Pre-configured linting and formatting

## 📱 Sample Components

The project includes a sample `HealthCard` component demonstrating how to use NativeWind classes in reusable components.

## 🤝 Contributing

1. Fork the project
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request