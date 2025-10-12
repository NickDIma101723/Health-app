export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          date_of_birth: string | null
          height_cm: number | null
          weight_kg: number | null
          gender: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null
          onboarding_completed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          date_of_birth?: string | null
          height_cm?: number | null
          weight_kg?: number | null
          gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null
          onboarding_completed?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          date_of_birth?: string | null
          height_cm?: number | null
          weight_kg?: number | null
          gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null
          onboarding_completed?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      user_goals: {
        Row: {
          id: string
          user_id: string
          steps_daily: number
          calories_daily: number
          protein_daily: number
          carbs_daily: number
          fats_daily: number
          water_daily: number
          sleep_hours_daily: number
          exercise_minutes_daily: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          steps_daily?: number
          calories_daily?: number
          protein_daily?: number
          carbs_daily?: number
          fats_daily?: number
          water_daily?: number
          sleep_hours_daily?: number
          exercise_minutes_daily?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          steps_daily?: number
          calories_daily?: number
          protein_daily?: number
          carbs_daily?: number
          fats_daily?: number
          water_daily?: number
          sleep_hours_daily?: number
          exercise_minutes_daily?: number
          created_at?: string
          updated_at?: string
        }
      }
      health_metrics: {
        Row: {
          id: string
          user_id: string
          date: string
          steps: number
          calories_burned: number
          water_intake: number
          sleep_hours: number
          heart_rate: number | null
          exercise_minutes: number
          weight_kg: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          steps?: number
          calories_burned?: number
          water_intake?: number
          sleep_hours?: number
          heart_rate?: number | null
          exercise_minutes?: number
          weight_kg?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          steps?: number
          calories_burned?: number
          water_intake?: number
          sleep_hours?: number
          heart_rate?: number | null
          exercise_minutes?: number
          weight_kg?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          message: string
          notification_type: 'achievement' | 'reminder' | 'suggestion' | 'report' | 'message'
          is_read: boolean
          read_at: string | null
          action_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          message: string
          notification_type: 'achievement' | 'reminder' | 'suggestion' | 'report' | 'message'
          is_read?: boolean
          read_at?: string | null
          action_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          message?: string
          notification_type?: 'achievement' | 'reminder' | 'suggestion' | 'report' | 'message'
          is_read?: boolean
          read_at?: string | null
          action_url?: string | null
          created_at?: string
        }
      }
      mindfulness_sessions: {
        Row: {
          id: string
          user_id: string
          session_type: 'breathing' | 'meditation' | 'body_scan' | 'visualization'
          duration_seconds: number
          completed: boolean
          mood_before: string | null
          mood_after: string | null
          notes: string | null
          started_at: string
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          session_type: 'breathing' | 'meditation' | 'body_scan' | 'visualization'
          duration_seconds: number
          completed?: boolean
          mood_before?: string | null
          mood_after?: string | null
          notes?: string | null
          started_at?: string
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          session_type?: 'breathing' | 'meditation' | 'body_scan' | 'visualization'
          duration_seconds?: number
          completed?: boolean
          mood_before?: string | null
          mood_after?: string | null
          notes?: string | null
          started_at?: string
          completed_at?: string | null
          created_at?: string
        }
      }
      mood_logs: {
        Row: {
          id: string
          user_id: string
          date: string
          mood: 'great' | 'good' | 'okay' | 'bad' | 'terrible'
          energy_level: number | null
          stress_level: number | null
          notes: string | null
          logged_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          mood: 'great' | 'good' | 'okay' | 'bad' | 'terrible'
          energy_level?: number | null
          stress_level?: number | null
          notes?: string | null
          logged_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          mood?: 'great' | 'good' | 'okay' | 'bad' | 'terrible'
          energy_level?: number | null
          stress_level?: number | null
          notes?: string | null
          logged_at?: string
          created_at?: string
        }
      }
      activity_templates: {
        Row: {
          id: string
          title: string
          description: string | null
          duration: number
          type: 'workout' | 'meal' | 'mindfulness' | 'appointment' | 'habit' | 'custom'
          color: string
          icon: string
          default_time: string | null
          is_system: boolean
          user_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          duration?: number
          type: 'workout' | 'meal' | 'mindfulness' | 'appointment' | 'habit' | 'custom'
          color?: string
          icon?: string
          default_time?: string | null
          is_system?: boolean
          user_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          duration?: number
          type?: 'workout' | 'meal' | 'mindfulness' | 'appointment' | 'habit' | 'custom'
          color?: string
          icon?: string
          default_time?: string | null
          is_system?: boolean
          user_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      activities: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          time: string
          duration: number
          activity_type: 'workout' | 'meal' | 'mindfulness' | 'appointment' | 'habit' | 'custom'
          color: string
          icon: string
          status: 'incomplete' | 'completed' | 'failed'
          date: string
          tags: string[] | null
          reminder_enabled: boolean
          reminder_time: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          time: string
          duration?: number
          activity_type: 'workout' | 'meal' | 'mindfulness' | 'appointment' | 'habit' | 'custom'
          color?: string
          icon?: string
          status?: 'incomplete' | 'completed' | 'failed'
          date: string
          tags?: string[] | null
          reminder_enabled?: boolean
          reminder_time?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          time?: string
          duration?: number
          activity_type?: 'workout' | 'meal' | 'mindfulness' | 'appointment' | 'habit' | 'custom'
          color?: string
          icon?: string
          status?: 'incomplete' | 'completed' | 'failed'
          date?: string
          tags?: string[] | null
          reminder_enabled?: boolean
          reminder_time?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      weekly_goals: {
        Row: {
          id: string
          user_id: string
          week_start_date: string
          workouts_target: number
          workouts_current: number
          meals_target: number
          meals_current: number
          meditation_target: number
          meditation_current: number
          habits_target: number
          habits_current: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          week_start_date: string
          workouts_target?: number
          workouts_current?: number
          meals_target?: number
          meals_current?: number
          meditation_target?: number
          meditation_current?: number
          habits_target?: number
          habits_current?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          week_start_date?: string
          workouts_target?: number
          workouts_current?: number
          meals_target?: number
          meals_current?: number
          meditation_target?: number
          meditation_current?: number
          habits_target?: number
          habits_current?: number
          created_at?: string
          updated_at?: string
        }
      }
      meals: {
        Row: {
          id: string
          user_id: string
          name: string
          meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
          calories: number
          protein: number
          carbs: number
          fats: number
          time: string
          date: string
          image_url: string | null
          ingredients: string[] | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
          calories?: number
          protein?: number
          carbs?: number
          fats?: number
          time: string
          date: string
          image_url?: string | null
          ingredients?: string[] | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          meal_type?: 'breakfast' | 'lunch' | 'dinner' | 'snack'
          calories?: number
          protein?: number
          carbs?: number
          fats?: number
          time?: string
          date?: string
          image_url?: string | null
          ingredients?: string[] | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      water_intake: {
        Row: {
          id: string
          user_id: string
          amount: number
          date: string
          time: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          amount: number
          date: string
          time: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          amount?: number
          date?: string
          time?: string
          created_at?: string
        }
      }
      nutrition_goals: {
        Row: {
          id: string
          user_id: string
          calories: number
          protein: number
          carbs: number
          fats: number
          water: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          calories?: number
          protein?: number
          carbs?: number
          fats?: number
          water?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          calories?: number
          protein?: number
          carbs?: number
          fats?: number
          water?: number
          created_at?: string
          updated_at?: string
        }
      }
      coaches: {
        Row: {
          id: string
          user_id: string
          full_name: string
          email: string
          specialization: string | null
          bio: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          full_name: string
          email: string
          specialization?: string | null
          bio?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          full_name?: string
          email?: string
          specialization?: string | null
          bio?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      user_coaches: {
        Row: {
          id: string
          user_id: string
          coach_id: string
          assigned_at: string
          is_active: boolean
        }
        Insert: {
          id?: string
          user_id: string
          coach_id: string
          assigned_at?: string
          is_active?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          coach_id?: string
          assigned_at?: string
          is_active?: boolean
        }
      }
      messages: {
        Row: {
          id: string
          sender_id: string
          receiver_id: string
          message_text: string | null
          media_url: string | null
          media_type: string | null
          media_filename: string | null
          media_size: number | null
          is_read: boolean
          read_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          sender_id: string
          receiver_id: string
          message_text?: string | null
          media_url?: string | null
          media_type?: string | null
          media_filename?: string | null
          media_size?: number | null
          is_read?: boolean
          read_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          sender_id?: string
          receiver_id?: string
          message_text?: string | null
          media_url?: string | null
          media_type?: string | null
          media_filename?: string | null
          media_size?: number | null
          is_read?: boolean
          read_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}