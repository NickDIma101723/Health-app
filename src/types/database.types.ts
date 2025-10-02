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
      health_records: {
        Row: {
          id: string
          user_id: string
          date: string
          weight?: number
          height?: number
          blood_pressure_systolic?: number
          blood_pressure_diastolic?: number
          heart_rate?: number
          notes?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          weight?: number | null
          height?: number | null
          blood_pressure_systolic?: number | null
          blood_pressure_diastolic?: number | null
          heart_rate?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          weight?: number | null
          height?: number | null
          blood_pressure_systolic?: number | null
          blood_pressure_diastolic?: number | null
          heart_rate?: number | null
          notes?: string | null
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