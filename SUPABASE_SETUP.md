# Supabase Setup Guide

This guide will help you set up Supabase for your Health App.

## 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Create a new project
4. Choose your organization, project name, database password, and region
5. Wait for the project to be created

## 2. Get Your Project Credentials

1. Go to your project dashboard
2. Click on "Settings" in the sidebar
3. Click on "API" 
4. Copy the following:
   - Project URL
   - Anon/Public key

## 3. Update Environment Variables

1. Open the `.env` file in your project root
2. Replace the placeholder values with your actual Supabase credentials:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## 4. Set Up Database Schema

1. Go to your Supabase project dashboard
2. Click on "Table Editor" in the sidebar
3. Click "New table"
4. Create the `health_records` table using the SQL in `database-schema.sql`

Alternatively, you can run the SQL directly:
1. Go to "SQL Editor" in the sidebar
2. Copy and paste the contents of `database-schema.sql`
3. Click "Run"

## 5. Authentication Setup (Optional)

The app includes authentication hooks. To enable user authentication:

1. Go to "Authentication" in your Supabase dashboard
2. Configure your authentication providers
3. Set up email confirmation if needed
4. Configure redirect URLs for your app

## 6. Row Level Security (Recommended)

For production apps, enable Row Level Security (RLS):

1. Go to "Authentication" > "Policies"
2. Enable RLS on the `health_records` table
3. Create policies to ensure users can only access their own records

Example policy for `health_records`:
```sql
-- Allow users to see only their own records
CREATE POLICY "Users can view own health records" ON health_records
FOR SELECT USING (auth.uid() = user_id);

-- Allow users to insert their own records
CREATE POLICY "Users can insert own health records" ON health_records
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own records
CREATE POLICY "Users can update own health records" ON health_records
FOR UPDATE USING (auth.uid() = user_id);

-- Allow users to delete their own records
CREATE POLICY "Users can delete own health records" ON health_records
FOR DELETE USING (auth.uid() = user_id);
```

## 7. Test Your Setup

1. Start your Expo development server: `npm start`
2. The app should now be able to connect to Supabase
3. Check the console for any connection errors
4. Try adding some test health records

## Available Hooks

- `useAuth()` - Authentication state and methods
- `useHealthRecords()` - CRUD operations for health records

## Next Steps

1. Implement authentication screens
2. Create forms for adding health records
3. Add data visualization components
4. Set up real-time subscriptions for live updates