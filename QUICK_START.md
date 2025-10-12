# Quick Start - Build and Install APK

## The Easy Way

Just run this script:

```bash
./build-apk.sh
```

It will:
1. Check if you're logged into Expo (prompts you to login if not)
2. Start the build process
3. Give you a download link when done

## Manual Way

If you prefer to do it step by step:

1. Login to Expo:
```bash
eas login
```

2. Build the APK:
```bash
eas build --platform android --profile preview
```

3. Wait for the build (10-15 minutes)

4. Download the APK from the link provided

5. Install on your Android phone

## Installing on Your Phone

### Method 1: Transfer from Computer
- Download the APK to your computer
- Connect your phone via USB
- Copy the APK to your phone
- Open it on your phone and tap Install

### Method 2: Direct Download
- Open the EAS build link on your phone's browser
- Download the APK directly
- Tap Install

Note: You may need to enable "Install from unknown sources" in your phone settings.

## What You Get

An APK file you can install on any Android phone. The app will have:
- Your Supabase connection configured
- All features working
- No Expo Go needed

## Troubleshooting

**Not logged in:** Run `eas login` first

**Build fails:** Check your internet and try again

**Can't install:** Enable unknown sources in phone settings

**App crashes:** Make sure .env file has correct Supabase credentials

## Files Added

- `eas.json` - Build configuration
- `build-apk.sh` - Quick build script
- `BUILD_APK.md` - Detailed instructions
- `QUICK_START.md` - This file

## Next Steps

After installing the APK:
- Open the app on your phone
- Create an account or login
- Start using the health tracking features

