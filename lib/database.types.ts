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
      rounds: {
        Row: {
          id: string
          created_at: string
          event_id: string
          status: 'open' | 'closed' | 'pending'
          round_number: number
          start_time: string
          end_time: string
        }
        Insert: {
          id?: string
          created_at?: string
          event_id: string
          status?: 'open' | 'closed' | 'pending'
          round_number: number
          start_time: string
          end_time: string
        }
        Update: {
          id?: string
          created_at?: string
          event_id?: string
          status?: 'open' | 'closed' | 'pending'
          round_number?: number
          start_time?: string
          end_time?: string
        }
      }
      events: {
        Row: {
          id: string
          created_at: string
          name: string
          description: string | null
          start_date: string
          end_date: string
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          description?: string | null
          start_date: string
          end_date: string
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          description?: string | null
          start_date?: string
          end_date?: string
        }
      }
      users_metadata: {
        Row: {
          id: string
          created_at: string
          role: 'admin' | 'brother' | 'pending'
          email: string
        }
        Insert: {
          id: string
          created_at?: string
          role?: 'admin' | 'brother' | 'pending'
          email: string
        }
        Update: {
          id?: string
          created_at?: string
          role?: 'admin' | 'brother' | 'pending'
          email?: string
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
  }
} 