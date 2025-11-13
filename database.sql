
CREATE TABLE public.achievements (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text NOT NULL,
  icon text,
  badge_color text,
  criteria jsonb NOT NULL,
  points integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT achievements_pkey PRIMARY KEY (id)
);
CREATE TABLE public.activities (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  date date NOT NULL,
  time text NOT NULL,
  duration integer,
  activity_type text NOT NULL CHECK (activity_type = ANY (ARRAY['workout'::text, 'meal'::text, 'mindfulness'::text, 'appointment'::text, 'habit'::text, 'custom'::text])),
  status text DEFAULT 'incomplete'::text CHECK (status = ANY (ARRAY['incomplete'::text, 'completed'::text, 'failed'::text])),
  color text,
  icon text,
  tags ARRAY,
  reminder_enabled boolean DEFAULT false,
  reminder_time integer,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT activities_pkey PRIMARY KEY (id),
  CONSTRAINT activities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.activity_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  activity_id uuid NOT NULL,
  user_id uuid NOT NULL,
  completed_at timestamp with time zone DEFAULT now(),
  duration_actual integer,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT activity_logs_pkey PRIMARY KEY (id),
  CONSTRAINT activity_logs_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES public.activities(id)
);
CREATE TABLE public.activity_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  duration integer NOT NULL DEFAULT 30,
  type text NOT NULL CHECK (type = ANY (ARRAY['workout'::text, 'meal'::text, 'mindfulness'::text, 'appointment'::text, 'habit'::text, 'custom'::text])),
  color text NOT NULL DEFAULT '#6FCF97'::text,
  icon text NOT NULL DEFAULT 'event'::text,
  default_time time without time zone,
  is_system boolean DEFAULT false,
  user_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT activity_templates_pkey PRIMARY KEY (id),
  CONSTRAINT activity_templates_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.coach_client_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL,
  client_user_id uuid NOT NULL,
  assigned_at timestamp with time zone NOT NULL DEFAULT now(),
  assigned_by uuid,
  is_active boolean DEFAULT true,
  notes text,
  CONSTRAINT coach_client_assignments_pkey PRIMARY KEY (id),
  CONSTRAINT coach_client_assignments_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES public.coaches(id),
  CONSTRAINT coach_client_assignments_client_user_id_fkey FOREIGN KEY (client_user_id) REFERENCES auth.users(id),
  CONSTRAINT coach_client_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES auth.users(id)
);
CREATE TABLE public.coach_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_user_id uuid NOT NULL,
  coach_id uuid NOT NULL,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'rejected'::text])),
  message text,
  requested_at timestamp with time zone NOT NULL DEFAULT now(),
  responded_at timestamp with time zone,
  responded_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT coach_requests_pkey PRIMARY KEY (id),
  CONSTRAINT coach_requests_client_user_id_fkey FOREIGN KEY (client_user_id) REFERENCES auth.users(id),
  CONSTRAINT coach_requests_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES public.coaches(id),
  CONSTRAINT coach_requests_responded_by_fkey FOREIGN KEY (responded_by) REFERENCES auth.users(id),
  CONSTRAINT coach_requests_unique_pending UNIQUE (client_user_id, coach_id, status)
);
CREATE TABLE public.coach_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL,
  client_user_id uuid NOT NULL,
  note_type text DEFAULT 'general'::text CHECK (note_type = ANY (ARRAY['general'::text, 'progress'::text, 'concern'::text, 'achievement'::text, 'plan_update'::text])),
  title text NOT NULL,
  content text NOT NULL,
  is_private boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT coach_notes_pkey PRIMARY KEY (id),
  CONSTRAINT coach_notes_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES public.coaches(id),
  CONSTRAINT coach_notes_client_user_id_fkey FOREIGN KEY (client_user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.coaches (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  full_name text NOT NULL,
  email text NOT NULL,
  specialization text,
  bio text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT coaches_pkey PRIMARY KEY (id),
  CONSTRAINT coaches_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.health_metrics (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  date date NOT NULL,
  steps integer DEFAULT 0,
  calories_burned integer DEFAULT 0,
  water_intake numeric DEFAULT 0,
  sleep_hours numeric DEFAULT 0,
  heart_rate integer,
  exercise_minutes integer DEFAULT 0,
  weight_kg numeric,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT health_metrics_pkey PRIMARY KEY (id),
  CONSTRAINT health_metrics_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.meal_ingredients (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  meal_id uuid NOT NULL,
  name text NOT NULL,
  amount text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT meal_ingredients_pkey PRIMARY KEY (id),
  CONSTRAINT meal_ingredients_meal_id_fkey FOREIGN KEY (meal_id) REFERENCES public.meals(id)
);
CREATE TABLE public.meals (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  meal_type text NOT NULL CHECK (meal_type = ANY (ARRAY['breakfast'::text, 'lunch'::text, 'dinner'::text, 'snack'::text])),
  calories integer NOT NULL DEFAULT 0,
  protein integer NOT NULL DEFAULT 0,
  carbs integer NOT NULL DEFAULT 0,
  fats integer NOT NULL DEFAULT 0,
  time text NOT NULL,
  date date NOT NULL,
  image_url text,
  ingredients ARRAY,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT meals_pkey PRIMARY KEY (id),
  CONSTRAINT meals_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  message_text text,
  is_read boolean DEFAULT false,
  read_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  media_url text,
  media_type character varying,
  media_filename text,
  media_size integer,
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id),
  CONSTRAINT messages_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES auth.users(id)
);
CREATE TABLE public.mindfulness_sessions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  session_type text NOT NULL CHECK (session_type = ANY (ARRAY['breathing'::text, 'meditation'::text, 'body_scan'::text, 'visualization'::text])),
  duration_seconds integer NOT NULL,
  completed boolean DEFAULT false,
  mood_before text,
  mood_after text,
  notes text,
  started_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT mindfulness_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT mindfulness_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.mood_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  date date NOT NULL,
  mood text NOT NULL CHECK (mood = ANY (ARRAY['great'::text, 'good'::text, 'okay'::text, 'bad'::text, 'terrible'::text])),
  energy_level integer CHECK (energy_level >= 1 AND energy_level <= 5),
  stress_level integer CHECK (stress_level >= 1 AND stress_level <= 5),
  notes text,
  logged_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT mood_logs_pkey PRIMARY KEY (id),
  CONSTRAINT mood_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  notification_type text NOT NULL CHECK (notification_type = ANY (ARRAY['achievement'::text, 'reminder'::text, 'suggestion'::text, 'report'::text, 'message'::text])),
  is_read boolean DEFAULT false,
  read_at timestamp with time zone,
  action_url text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.nutrition_goals (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL UNIQUE,
  calories integer NOT NULL DEFAULT 2200,
  protein integer NOT NULL DEFAULT 150,
  carbs integer NOT NULL DEFAULT 250,
  fats integer NOT NULL DEFAULT 70,
  water integer NOT NULL DEFAULT 8,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT nutrition_goals_pkey PRIMARY KEY (id),
  CONSTRAINT nutrition_goals_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  full_name text,
  age integer CHECK (age >= 0 AND age <= 150),
  height integer CHECK (height >= 0 AND height <= 300),
  weight integer CHECK (weight >= 0 AND weight <= 500),
  gender text DEFAULT 'prefer-not-to-say'::text CHECK (gender = ANY (ARRAY['male'::text, 'female'::text, 'prefer-not-to-say'::text])),
  phone text,
  bio text,
  fitness_level text DEFAULT 'beginner'::text CHECK (fitness_level = ANY (ARRAY['beginner'::text, 'intermediate'::text, 'advanced'::text])),
  goals text,
  avatar_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT fk_profiles_user_id FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.user_achievements (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  achievement_id uuid NOT NULL,
  earned_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_achievements_pkey PRIMARY KEY (id),
  CONSTRAINT user_achievements_achievement_id_fkey FOREIGN KEY (achievement_id) REFERENCES public.achievements(id),
  CONSTRAINT user_achievements_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.user_coaches (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  coach_id uuid NOT NULL,
  assigned_at timestamp with time zone DEFAULT now(),
  is_active boolean DEFAULT true,
  CONSTRAINT user_coaches_pkey PRIMARY KEY (id),
  CONSTRAINT user_coaches_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT user_coaches_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES public.coaches(id)
);
CREATE TABLE public.user_goals (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL UNIQUE,
  steps_daily integer DEFAULT 10000,
  calories_daily integer DEFAULT 2200,
  protein_daily numeric DEFAULT 165,
  carbs_daily numeric DEFAULT 220,
  fats_daily numeric DEFAULT 73,
  water_daily numeric DEFAULT 8,
  sleep_hours_daily numeric DEFAULT 8,
  exercise_minutes_daily integer DEFAULT 30,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_goals_pkey PRIMARY KEY (id),
  CONSTRAINT user_goals_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.water_intake (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  amount integer NOT NULL,
  date date NOT NULL,
  time text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT water_intake_pkey PRIMARY KEY (id),
  CONSTRAINT water_intake_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.water_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  date date NOT NULL,
  amount_ml integer NOT NULL,
  logged_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT water_logs_pkey PRIMARY KEY (id),
  CONSTRAINT water_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.weekly_goals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  week_start_date date NOT NULL,
  workouts_target integer DEFAULT 3,
  workouts_current integer DEFAULT 0,
  meals_target integer DEFAULT 21,
  meals_current integer DEFAULT 0,
  meditation_target integer DEFAULT 7,
  meditation_current integer DEFAULT 0,
  habits_target integer DEFAULT 7,
  habits_current integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT weekly_goals_pkey PRIMARY KEY (id),
  CONSTRAINT weekly_goals_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

INSERT INTO public.coaches (id, user_id, full_name, email, specialization, bio, is_active) VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Sarah Johnson', 'sarah.johnson@healthcoach.com', 'Nutrition', 'Certified nutritionist with 10+ years of experience helping clients achieve their dietary goals. Specializes in weight management and meal planning.', true),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'Mike Chen', 'mike.chen@healthcoach.com', 'Fitness', 'Personal trainer and fitness coach with expertise in strength training, cardio optimization, and injury prevention. Helped 200+ clients transform their lives.', true),
  ('30000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', 'Dr. Emily Rodriguez', 'emily.rodriguez@healthcoach.com', 'Mental Health', 'Licensed psychologist specializing in stress management, mindfulness, and cognitive behavioral therapy. Passionate about holistic wellness.', true),
  ('40000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000004', 'David Kim', 'david.kim@healthcoach.com', 'Weight Loss', 'Weight loss specialist who lost 100lbs himself. Expert in sustainable lifestyle changes, portion control, and motivation coaching.', true),
  ('50000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000005', 'Jessica Martinez', 'jessica.martinez@healthcoach.com', 'Sports', 'Former Olympic athlete turned performance coach. Specializes in athletic training, sports nutrition, and competition preparation.', true),
  ('60000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000006', 'Robert Taylor', 'robert.taylor@healthcoach.com', 'General', 'Holistic health coach focusing on overall wellness, lifestyle medicine, and preventive health. 15 years in the wellness industry.', true);

-- Function to delete a user account completely
-- This function can delete from auth.users table because it runs with elevated privileges
CREATE OR REPLACE FUNCTION delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_uuid uuid;
BEGIN
  -- Get the current user's ID
  user_uuid := auth.uid();
  
  -- Ensure user is authenticated
  IF user_uuid IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  -- Delete from auth.users table (this requires SECURITY DEFINER)
  DELETE FROM auth.users WHERE id = user_uuid;
  
  -- Note: All related data in app tables should be deleted by foreign key constraints
  -- or by the application before calling this function
END;
$$;

-- Workout Plans table for coach-created workout programs
CREATE TABLE public.workout_plans (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  coach_id uuid NOT NULL,
  client_id uuid,
  name text NOT NULL,
  description text,
  workout_days jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  is_active boolean DEFAULT true,
  CONSTRAINT workout_plans_pkey PRIMARY KEY (id),
  CONSTRAINT workout_plans_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES public.coaches(id),
  CONSTRAINT workout_plans_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.users(id)
);

-- Nutrition Plans table for coach-created meal plans
CREATE TABLE public.nutrition_plans (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  coach_id uuid NOT NULL,
  client_id uuid,
  name text NOT NULL,
  description text,
  target_calories integer DEFAULT 2000,
  target_protein integer DEFAULT 150,
  target_carbs integer DEFAULT 200,
  target_fats integer DEFAULT 65,
  meal_plans jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  is_active boolean DEFAULT true,
  CONSTRAINT nutrition_plans_pkey PRIMARY KEY (id),
  CONSTRAINT nutrition_plans_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES public.coaches(id),
  CONSTRAINT nutrition_plans_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.users(id)
);

ON CONFLICT (id) DO NOTHING;