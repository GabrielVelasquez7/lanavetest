export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      agencies: {
        Row: {
          address: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      daily_sessions: {
        Row: {
          created_at: string
          id: string
          is_closed: boolean
          notes: string | null
          session_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_closed?: boolean
          notes?: string | null
          session_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_closed?: boolean
          notes?: string | null
          session_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount_bs: number
          amount_usd: number
          category: Database["public"]["Enums"]["expense_category"]
          created_at: string
          description: string
          id: string
          session_id: string
          updated_at: string
        }
        Insert: {
          amount_bs?: number
          amount_usd?: number
          category: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          description: string
          id?: string
          session_id: string
          updated_at?: string
        }
        Update: {
          amount_bs?: number
          amount_usd?: number
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          description?: string
          id?: string
          session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "daily_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      lottery_systems: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      mobile_payments: {
        Row: {
          amount_bs: number
          created_at: string
          description: string | null
          id: string
          reference_number: string
          session_id: string
          updated_at: string
        }
        Insert: {
          amount_bs?: number
          created_at?: string
          description?: string | null
          id?: string
          reference_number: string
          session_id: string
          updated_at?: string
        }
        Update: {
          amount_bs?: number
          created_at?: string
          description?: string | null
          id?: string
          reference_number?: string
          session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mobile_payments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "daily_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      point_of_sale: {
        Row: {
          amount_bs: number
          created_at: string
          id: string
          session_id: string
          updated_at: string
        }
        Insert: {
          amount_bs?: number
          created_at?: string
          id?: string
          session_id: string
          updated_at?: string
        }
        Update: {
          amount_bs?: number
          created_at?: string
          id?: string
          session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "point_of_sale_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "daily_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      prize_transactions: {
        Row: {
          amount_bs: number
          amount_usd: number
          created_at: string
          id: string
          lottery_system_id: string
          session_id: string
          updated_at: string
        }
        Insert: {
          amount_bs?: number
          amount_usd?: number
          created_at?: string
          id?: string
          lottery_system_id: string
          session_id: string
          updated_at?: string
        }
        Update: {
          amount_bs?: number
          amount_usd?: number
          created_at?: string
          id?: string
          lottery_system_id?: string
          session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prize_transactions_lottery_system_id_fkey"
            columns: ["lottery_system_id"]
            isOneToOne: false
            referencedRelation: "lottery_systems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prize_transactions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "daily_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          agency_id: string | null
          agency_name: string | null
          created_at: string
          full_name: string
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          agency_id?: string | null
          agency_name?: string | null
          created_at?: string
          full_name: string
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          agency_id?: string | null
          agency_name?: string | null
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_transactions: {
        Row: {
          amount_bs: number
          amount_usd: number
          created_at: string
          id: string
          lottery_system_id: string
          session_id: string
          updated_at: string
        }
        Insert: {
          amount_bs?: number
          amount_usd?: number
          created_at?: string
          id?: string
          lottery_system_id: string
          session_id: string
          updated_at?: string
        }
        Update: {
          amount_bs?: number
          amount_usd?: number
          created_at?: string
          id?: string
          lottery_system_id?: string
          session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_transactions_lottery_system_id_fkey"
            columns: ["lottery_system_id"]
            isOneToOne: false
            referencedRelation: "lottery_systems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_transactions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "daily_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_user_role: {
        Args: { user_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
    }
    Enums: {
      expense_category: "deuda" | "gasto_operativo" | "otros"
      user_role: "taquillero" | "encargado" | "administrador"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      expense_category: ["deuda", "gasto_operativo", "otros"],
      user_role: ["taquillero", "encargado", "administrador"],
    },
  },
} as const
