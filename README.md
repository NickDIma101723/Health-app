# Health App

A health and fitness coaching app built with React Native and Expo. Connects coaches with clients for progress tracking, messaging, and health management.

## What It Does

This app lets health coaches work with clients. Coaches can see client progress, send messages, track health stats, and give advice. Clients can track workouts, log meals, record health data, and chat with their coach.

## Main Features

### For Everyone
- Create an account as a client or coach
- Login and manage your profile
- Switch between client and coach accounts
- Delete your account if needed

### For Clients
- Dashboard showing your health overview
- Track workouts, water intake, and calories
- Log activities like workouts, meals, and meditation
- Record meals with calories and macros
- Track health data like steps, sleep, and weight
- Chat with your assigned coach
- Send photos and files in chat
- Set fitness goals and track progress

### For Coaches
- Dashboard showing all your clients
- See detailed info for each client
- View client activities and progress
- Chat with each client individually
- Take private notes about clients
- Assign or remove clients from your list
- See client health history
- Monitor client meals and workouts

### Messaging
- Real-time chat between coach and client
- Send text, images, and documents
- See when messages are read
- See typing indicators
- View full message history

## Tech Stack

Built with React Native, Expo, TypeScript, and Supabase. Uses PostgreSQL for the database with real-time updates.

## Database Tables

The app stores data in these tables:
- profiles: user info and fitness goals
- coaches: coach-specific data
- coach_client_assignments: who's assigned to who
- messages: chat messages
- activities: scheduled and completed activities
- health_metrics: daily health stats
- meals: meal logs with nutrition info
- weekly_goals: weekly progress
- coach_notes: private coach notes

## Setup

You need Node.js 18+, npm or yarn, and a Supabase account.

### Install and Run

1. Clone the repo and install dependencies:
```bash
git clone [repository-url]
cd Health-app
npm install
```

2. Create a .env file with your Supabase credentials:
```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. Set up your Supabase database:
- Create a new Supabase project
- Run the SQL from database.sql
- Set up the storage bucket for file uploads

4. Start the app:
```bash
npm start
```

5. Run it:
- Press i for iOS simulator
- Press a for Android emulator
- Scan QR code with Expo Go on your phone

## File Structure

```
Health-app/
├── src/
│   ├── components/       UI components
│   ├── contexts/         Auth and state management
│   ├── screens/          All the app screens
│   ├── lib/              Utilities and helpers
│   ├── hooks/            Custom React hooks
│   ├── types/            TypeScript types
│   └── constants/        Theme and config
├── assets/               Images and icons
├── App.tsx               Main app file
├── database.sql          Database setup
└── package.json          Dependencies
```

## How It Works

### Registration
User signs up with email and password. Profile gets created. They start as a client.

### Becoming a Coach
Client goes to profile settings, taps "Become a Coach", enters admin password (admin123), and re-logs in as a coach.

### Going Back to Client
Coach goes to profile settings, taps "Convert to Client Account", and all their assigned clients get unassigned. They re-login as a client.

### Main Workflows

Clients log activities and meals, track health stats, and chat with their coach. Coaches view client data, monitor progress, take notes, and chat with clients.

## Account Actions

### Delete Account
Delete your account from profile settings. This removes all your data and cannot be undone.

### Switch Roles
Convert between client and coach anytime. Client to coach needs admin password. Coach to client removes all assigned clients.

## Build for Android

To build an APK for Android:
```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android --profile preview
```

Download the APK from the link EAS gives you and install it on your Android phone.

## Common Issues

**Supabase not connecting:** Check your .env file has the right credentials.

**Media uploads failing:** Make sure the storage bucket exists in Supabase with correct permissions.

**Messages not showing:** Check you're logged in and the database policies are set up.

**Coach features missing:** Make sure you have a coach record in the database and re-login after converting.

## Security

API keys are in environment variables. Database has row-level security. Passwords are hashed by Supabase. Files are checked before upload. Coach conversion needs admin password.

## Future Ideas

Some things that could be added later:
- Video calls between coach and client
- Meal planning suggestions
- Fitness tracker integration
- Group coaching
- Achievement badges
- Workout builder
- Analytics dashboard

## License

Proprietary software for health and wellness coaching.

## Built With

React Native, Expo, Supabase, TypeScript, and Material Icons.
