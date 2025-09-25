# Health App

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