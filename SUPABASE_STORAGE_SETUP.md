# Supabase Storage Setup Guide

## Issue
Profile picture uploads are failing because the required storage buckets are not configured in Supabase.

## Solution

### 1. Create Storage Buckets

Go to your Supabase Dashboard → Storage → Create Bucket

#### Create `profile-images` bucket:
- Name: `profile-images`
- Public: ✅ Yes (Enable public access)
- File size limit: 5MB
- Allowed MIME types: `image/jpeg, image/jpg, image/png, image/gif, image/webp`

#### Existing `chat-media` bucket (if not created):
- Name: `chat-media`
- Public: ✅ Yes (Enable public access)
- File size limit: 10MB
- Allowed MIME types: All image, document, and video types

### 2. Set Storage Policies

For each bucket, add these policies:

#### Policy 1: Allow authenticated users to upload their own files
```sql
-- For profile-images bucket
CREATE POLICY "Users can upload their own avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'profile-images' AND (storage.foldername(name))[1] = 'avatars' AND (storage.foldername(name))[2] = auth.uid()::text);

-- For chat-media bucket
CREATE POLICY "Users can upload their own media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-media' AND (storage.foldername(name))[1] = auth.uid()::text);
```

#### Policy 2: Allow public read access
```sql
-- For profile-images bucket
CREATE POLICY "Anyone can view profile images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-images');

-- For chat-media bucket
CREATE POLICY "Anyone can view chat media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'chat-media');
```

#### Policy 3: Allow users to update their own files
```sql
-- For profile-images bucket
CREATE POLICY "Users can update their own avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'profile-images' AND (storage.foldername(name))[1] = 'avatars' AND (storage.foldername(name))[2] = auth.uid()::text);

-- For chat-media bucket
CREATE POLICY "Users can update their own media"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'chat-media' AND (storage.foldername(name))[1] = auth.uid()::text);
```

#### Policy 4: Allow users to delete their own files
```sql
-- For profile-images bucket
CREATE POLICY "Users can delete their own avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'profile-images' AND (storage.foldername(name))[1] = 'avatars' AND (storage.foldername(name))[2] = auth.uid()::text);

-- For chat-media bucket
CREATE POLICY "Users can delete their own media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'chat-media' AND (storage.foldername(name))[1] = auth.uid()::text);
```

### 3. Quick Setup via Supabase Dashboard

1. **Go to Storage**
   - Navigate to: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/storage/buckets

2. **Create `profile-images` bucket**
   - Click "New Bucket"
   - Name: `profile-images`
   - Toggle "Public bucket" ON
   - Click "Create bucket"

3. **Set Policies**
   - Click on the bucket → Policies tab
   - Click "New Policy"
   - Choose template or create custom policies using the SQL above

### 4. Fallback Behavior

The app has been updated to:
1. First try uploading to `profile-images` bucket
2. If that fails, try `chat-media` bucket as fallback
3. If both fail, store the image URI locally in the database

This ensures profile pictures work even if storage buckets aren't configured yet, though they won't persist across devices.

### 5. Testing

After setup:
1. Reload the app
2. Go to Profile screen
3. Tap the avatar
4. Select an image
5. Check console logs for successful upload

Expected log output:
```
[ProfileScreen] Upload successful to bucket: profile-images
[ProfileScreen] Public URL: https://YOUR_PROJECT.supabase.co/storage/v1/object/public/profile-images/avatars/USER_ID/TIMESTAMP.jpg
```

## Troubleshooting

### "Failed to fetch" error
- Check if Supabase project is active
- Verify API keys in `.env` or `src/lib/supabase.ts`
- Ensure buckets are created and public

### "Bucket not found" error
- Create the storage buckets as described above
- Verify bucket names match exactly: `profile-images` and `chat-media`

### Images not loading
- Check storage policies allow public SELECT
- Verify the bucket is marked as "Public"
- Check browser console for CORS errors

### Database schema: add avatar_url column

If you see an error like:

```
Could not find the 'avatar_url' column of 'profiles' in the schema cache
```

Run this SQL in the Supabase SQL editor (SQL → New query) to add the column:

```sql
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS avatar_url text;
```

I also added a migration file at `supabase/add_avatar_url_column.sql` in this repo you can copy into Supabase.
