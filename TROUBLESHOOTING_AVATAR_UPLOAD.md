# Troubleshooting Avatar Upload Issues

## Current Error: ERR_INTERNET_DISCONNECTED

You're seeing this error:
```
PATCH https://fkmthgmwrvzgygdqoqvq.supabase.co/rest/v1/profiles
net::ERR_INTERNET_DISCONNECTED
```

### Quick Fixes (Try these in order)

#### 1. Check Browser Network Status
**In your browser (Chrome/Edge/Firefox):**
- Open DevTools (F12)
- Go to **Network** tab
- Look for a "Offline" checkbox at the top - **make sure it's UNCHECKED**
- Or look for a throttling dropdown - set it to "No throttling"

#### 2. Clear Browser Cache and Reload
```bash
# In browser DevTools Console
window.location.reload(true)
```
Or:
- Press `Ctrl + Shift + R` (Windows/Linux) or `Cmd + Shift + R` (Mac)
- Or right-click reload button → "Empty Cache and Hard Reload"

#### 3. Disable Service Workers
**In DevTools:**
- Go to **Application** tab
- Click **Service Workers** in left sidebar
- Click "Unregister" on any listed service workers
- Reload the page

#### 4. Check Browser Extensions
Some extensions (ad blockers, privacy tools) can block Supabase requests:
- Try opening in **Incognito/Private mode**
- Or temporarily disable extensions

#### 5. Clear Expo Web Cache
```bash
cd /workspaces/Health-app
rm -rf .expo
rm -rf node_modules/.cache
npm start -- --clear
```

#### 6. Verify Network Inspector
**In DevTools → Network tab:**
1. Clear all requests (trash icon)
2. Try uploading avatar again
3. Look for the failed request
4. Click on it and check:
   - **Headers** tab - verify URL is correct
   - **Preview/Response** tab - see actual error
   - **Timing** tab - check where it's failing

### For Production (Mobile App)

If you're testing on a mobile device:
1. Ensure device is connected to internet
2. Check if device can reach Supabase:
   ```
   Open browser on device → visit https://fkmthgmwrvzgygdqoqvq.supabase.co
   ```
3. Try switching between WiFi/mobile data

### Current Workaround

The app now stores avatars **locally** by default, which works without Supabase storage buckets. You'll see this message:

> "Profile picture updated!
> 
> Note: Image is stored locally. For cloud storage, please configure Supabase storage buckets"

**This works fine for development!** The image will:
- ✅ Display correctly in your profile
- ✅ Persist in the database
- ❌ Not sync across devices (local URI only)

### Setting Up Cloud Storage (Optional)

When ready for production, follow the guide in `SUPABASE_STORAGE_SETUP.md` to:
1. Create storage buckets in Supabase dashboard
2. Set up security policies
3. Uncomment the cloud upload code in ProfileScreen.tsx

### Still Not Working?

If avatar upload keeps failing even with local storage:

1. **Check Supabase Connection:**
   ```bash
   # In terminal
   curl https://fkmthgmwrvzgygdqoqvq.supabase.co/rest/v1/
   ```
   Should return: `{"message":"The server is running"}`

2. **Check Environment Variables:**
   ```bash
   cat .env | grep SUPABASE
   ```
   Should show your Supabase URL and Anon Key

3. **Test Database Connection:**
   - Try logging out and back in
   - If that works, database connection is fine
   - Issue is likely with image upload specifically

4. **Check Browser Console for More Errors:**
   Look for any CORS, authentication, or policy errors

### Debug Mode

Add this to your browser console to see detailed network info:
```javascript
// Enable verbose logging
localStorage.setItem('debug', 'supabase:*');
// Reload the page
```

### Contact Support

If none of these work, please share:
1. Browser name and version
2. Full error from DevTools Console
3. Network tab screenshot showing the failed request
4. Any CORS or security errors
