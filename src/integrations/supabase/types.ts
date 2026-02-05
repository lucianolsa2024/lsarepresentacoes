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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      clients: {
        Row: {
          city: string | null
          company: string
          complement: string | null
          created_at: string
          document: string | null
          email: string | null
          id: string
          is_new_client: boolean | null
          name: string | null
          neighborhood: string | null
          number: string | null
          phone: string | null
          state: string | null
          street: string | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          city?: string | null
          company: string
          complement?: string | null
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          is_new_client?: boolean | null
          name?: string | null
          neighborhood?: string | null
          number?: string | null
          phone?: string | null
          state?: string | null
          street?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          city?: string | null
          company?: string
          complement?: string | null
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          is_new_client?: boolean | null
          name?: string | null
          neighborhood?: string | null
          number?: string | null
          phone?: string | null
          state?: string | null
          street?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      modulation_sizes: {
        Row: {
          created_at: string | null
          depth: string | null
          description: string
          dimensions: string | null
          fabric_quantity: number | null
          height: string | null
          id: string
          length: string | null
          modulation_id: string
          price_fx_3d: number | null
          price_fx_b: number | null
          price_fx_c: number | null
          price_fx_couro: number | null
          price_fx_d: number | null
          price_fx_e: number | null
          price_fx_f: number | null
          price_fx_g: number | null
          price_fx_h: number | null
          price_fx_i: number | null
          price_fx_j: number | null
          price_sem_tec: number | null
        }
        Insert: {
          created_at?: string | null
          depth?: string | null
          description: string
          dimensions?: string | null
          fabric_quantity?: number | null
          height?: string | null
          id?: string
          length?: string | null
          modulation_id: string
          price_fx_3d?: number | null
          price_fx_b?: number | null
          price_fx_c?: number | null
          price_fx_couro?: number | null
          price_fx_d?: number | null
          price_fx_e?: number | null
          price_fx_f?: number | null
          price_fx_g?: number | null
          price_fx_h?: number | null
          price_fx_i?: number | null
          price_fx_j?: number | null
          price_sem_tec?: number | null
        }
        Update: {
          created_at?: string | null
          depth?: string | null
          description?: string
          dimensions?: string | null
          fabric_quantity?: number | null
          height?: string | null
          id?: string
          length?: string | null
          modulation_id?: string
          price_fx_3d?: number | null
          price_fx_b?: number | null
          price_fx_c?: number | null
          price_fx_couro?: number | null
          price_fx_d?: number | null
          price_fx_e?: number | null
          price_fx_f?: number | null
          price_fx_g?: number | null
          price_fx_h?: number | null
          price_fx_i?: number | null
          price_fx_j?: number | null
          price_sem_tec?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "modulation_sizes_modulation_id_fkey"
            columns: ["modulation_id"]
            isOneToOne: false
            referencedRelation: "product_modulations"
            referencedColumns: ["id"]
          },
        ]
      }
      product_modulations: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          product_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          product_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_modulations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          available_bases: string[] | null
          category: string
          code: string
          created_at: string | null
          description: string | null
          factory: string | null
          has_base: boolean | null
          id: string
          image_url: string | null
          name: string
          updated_at: string | null
        }
        Insert: {
          available_bases?: string[] | null
          category?: string
          code?: string
          created_at?: string | null
          description?: string | null
          factory?: string | null
          has_base?: boolean | null
          id?: string
          image_url?: string | null
          name: string
          updated_at?: string | null
        }
        Update: {
          available_bases?: string[] | null
          category?: string
          code?: string
          created_at?: string | null
          description?: string | null
          factory?: string | null
          has_base?: boolean | null
          id?: string
          image_url?: string | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      quotes: {
        Row: {
          client_data: Json
          client_id: string | null
          created_at: string
          discount: number
          id: string
          items: Json
          payment: Json
          status: string
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          client_data: Json
          client_id?: string | null
          created_at?: string
          discount?: number
          id?: string
          items: Json
          payment: Json
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Update: {
          client_data?: Json
          client_id?: string | null
          created_at?: string
          discount?: number
          id?: string
          items?: Json
          payment?: Json
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      route_visits: {
        Row: {
          check_in_at: string | null
          check_out_at: string | null
          client_id: string | null
          created_at: string | null
          id: string
          notes: string | null
          route_id: string
          status: string | null
          visit_date: string
          visit_order: number | null
        }
        Insert: {
          check_in_at?: string | null
          check_out_at?: string | null
          client_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          route_id: string
          status?: string | null
          visit_date: string
          visit_order?: number | null
        }
        Update: {
          check_in_at?: string | null
          check_out_at?: string | null
          client_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          route_id?: string
          status?: string | null
          visit_date?: string
          visit_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "route_visits_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_visits_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "visit_routes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      visit_routes: {
        Row: {
          created_at: string | null
          end_date: string
          id: string
          name: string
          notes: string | null
          start_date: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          end_date: string
          id?: string
          name: string
          notes?: string | null
          start_date: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          end_date?: string
          id?: string
          name?: string
          notes?: string | null
          start_date?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
