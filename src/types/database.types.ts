export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_order: number
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      expense: {
        Row: {
          amount: number
          created_at: string
          entry_date: string | null
          household_id: string | null
          id: number
          needs_settlement: boolean
          owner: string
          source: string
          subcategory_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          entry_date?: string | null
          household_id?: string | null
          id?: number
          needs_settlement?: boolean
          owner?: string
          source: string
          subcategory_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          entry_date?: string | null
          household_id?: string | null
          id?: number
          needs_settlement?: boolean
          owner?: string
          source?: string
          subcategory_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          }
        ]
      }
      recurring_entries: {
        Row: {
          id: number
          user_id: string
          household_id: string | null
          type: string
          source: string
          amount: number
          subcategory_id: string | null
          owner: string
          needs_settlement: boolean
          frequency: string
          day_of_month: number
          month_of_year: number | null
          next_apply_date: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          user_id: string
          household_id?: string | null
          type: string
          source: string
          amount: number
          subcategory_id?: string | null
          owner?: string
          needs_settlement?: boolean
          frequency: string
          day_of_month: number
          month_of_year?: number | null
          next_apply_date: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          household_id?: string | null
          type?: string
          source?: string
          amount?: number
          subcategory_id?: string | null
          owner?: string
          needs_settlement?: boolean
          frequency?: string
          day_of_month?: number
          month_of_year?: number | null
          next_apply_date?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      household_invitations: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string | null
          household_id: string
          id: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at?: string | null
          household_id: string
          id?: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string | null
          household_id?: string
          id?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      household_members: {
        Row: {
          household_id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          household_id: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          household_id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      households: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      income: {
        Row: {
          amount: number
          created_at: string
          entry_date: string | null
          household_id: string | null
          id: number
          needs_settlement: boolean
          owner: string
          source: string
          subcategory_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          entry_date?: string | null
          household_id?: string | null
          id?: number
          needs_settlement?: boolean
          owner?: string
          source: string
          subcategory_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          entry_date?: string | null
          household_id?: string | null
          id?: number
          needs_settlement?: boolean
          owner?: string
          source?: string
          subcategory_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "income_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "income_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      settlement_items: {
        Row: {
          id: string
          item_id: number
          item_type: string
          settlement_id: string
        }
        Insert: {
          id?: string
          item_id: number
          item_type: string
          settlement_id: string
        }
        Update: {
          id?: string
          item_id?: number
          item_type?: string
          settlement_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "settlement_items_settlement_id_fkey"
            columns: ["settlement_id"]
            isOneToOne: false
            referencedRelation: "settlements"
            referencedColumns: ["id"]
          }
        ]
      }
      settlements: {
        Row: {
          cancelled_at: string | null
          created_at: string
          household_id: string
          id: string
          payments: Json
          settled_at: string
          split_ratios: Json
          total_amount: number
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string
          household_id: string
          id?: string
          payments: Json
          settled_at?: string
          split_ratios: Json
          total_amount: number
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string
          household_id?: string
          id?: string
          payments?: Json
          settled_at?: string
          split_ratios?: Json
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "settlements_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          }
        ]
      }
      subcategories: {
        Row: {
          category_id: string
          created_at: string
          id: string
          name: string
          sort_order: number
          user_id: string | null
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          user_id?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_my_household_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_my_household_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
