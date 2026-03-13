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
      activities: {
        Row: {
          activity_category: string
          assigned_to_email: string | null
          client_id: string | null
          completed_at: string | null
          completed_notes: string | null
          created_at: string | null
          description: string | null
          due_date: string
          due_time: string | null
          id: string
          next_contact_date: string | null
          next_step: string | null
          order_id: string | null
          parent_activity_id: string | null
          priority: string | null
          quote_id: string | null
          recurrence_rule: Json | null
          reminder_at: string | null
          reminder_sent: boolean | null
          result: string | null
          route_visit_id: string | null
          status: string | null
          template_id: string | null
          title: string
          type: string
          updated_at: string | null
          watcher_emails: string[]
        }
        Insert: {
          activity_category?: string
          assigned_to_email?: string | null
          client_id?: string | null
          completed_at?: string | null
          completed_notes?: string | null
          created_at?: string | null
          description?: string | null
          due_date: string
          due_time?: string | null
          id?: string
          next_contact_date?: string | null
          next_step?: string | null
          order_id?: string | null
          parent_activity_id?: string | null
          priority?: string | null
          quote_id?: string | null
          recurrence_rule?: Json | null
          reminder_at?: string | null
          reminder_sent?: boolean | null
          result?: string | null
          route_visit_id?: string | null
          status?: string | null
          template_id?: string | null
          title: string
          type: string
          updated_at?: string | null
          watcher_emails?: string[]
        }
        Update: {
          activity_category?: string
          assigned_to_email?: string | null
          client_id?: string | null
          completed_at?: string | null
          completed_notes?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string
          due_time?: string | null
          id?: string
          next_contact_date?: string | null
          next_step?: string | null
          order_id?: string | null
          parent_activity_id?: string | null
          priority?: string | null
          quote_id?: string | null
          recurrence_rule?: Json | null
          reminder_at?: string | null
          reminder_sent?: boolean | null
          result?: string | null
          route_visit_id?: string | null
          status?: string | null
          template_id?: string | null
          title?: string
          type?: string
          updated_at?: string | null
          watcher_emails?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "activities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_parent_fkey"
            columns: ["parent_activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_route_visit_id_fkey"
            columns: ["route_visit_id"]
            isOneToOne: false
            referencedRelation: "route_visits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_template_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "activity_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_attachments: {
        Row: {
          activity_id: string
          created_at: string
          file_name: string | null
          file_url: string
          id: string
        }
        Insert: {
          activity_id: string
          created_at?: string
          file_name?: string | null
          file_url: string
          id?: string
        }
        Update: {
          activity_id?: string
          created_at?: string
          file_name?: string | null
          file_url?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_attachments_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_checklist_items: {
        Row: {
          activity_id: string
          checked: boolean
          created_at: string
          id: string
          label: string
          sort_order: number
        }
        Insert: {
          activity_id: string
          checked?: boolean
          created_at?: string
          id?: string
          label: string
          sort_order?: number
        }
        Update: {
          activity_id?: string
          checked?: boolean
          created_at?: string
          id?: string
          label?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "activity_checklist_items_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_reminders: {
        Row: {
          activity_id: string
          created_at: string | null
          error_message: string | null
          id: string
          reminder_type: string | null
          scheduled_at: string
          sent_at: string | null
          status: string | null
        }
        Insert: {
          activity_id: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          reminder_type?: string | null
          scheduled_at: string
          sent_at?: string | null
          status?: string | null
        }
        Update: {
          activity_id?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          reminder_type?: string | null
          scheduled_at?: string
          sent_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_reminders_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_templates: {
        Row: {
          created_at: string | null
          days_offset: number | null
          default_priority: string | null
          default_time: string | null
          description_template: string | null
          id: string
          is_active: boolean | null
          name: string
          title_template: string
          type: string
        }
        Insert: {
          created_at?: string | null
          days_offset?: number | null
          default_priority?: string | null
          default_time?: string | null
          description_template?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          title_template: string
          type: string
        }
        Update: {
          created_at?: string | null
          days_offset?: number | null
          default_priority?: string | null
          default_time?: string | null
          description_template?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          title_template?: string
          type?: string
        }
        Relationships: []
      }
      client_influencers: {
        Row: {
          client_id: string
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          role: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          role?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_influencers_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_representatives: {
        Row: {
          client_id: string
          created_at: string
          id: string
          representative_email: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          representative_email: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          representative_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_representatives_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_segments: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          city: string | null
          client_type: string | null
          company: string
          complement: string | null
          created_at: string
          curve: string | null
          curve_updated_at: string | null
          default_payment_terms: string | null
          document: string | null
          email: string | null
          id: string
          inscricao_estadual: string | null
          is_new_client: boolean | null
          name: string | null
          neighborhood: string | null
          notes: string | null
          number: string | null
          owner_email: string | null
          parent_client_id: string | null
          phone: string | null
          segment: string | null
          site: string | null
          state: string | null
          street: string | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          city?: string | null
          client_type?: string | null
          company: string
          complement?: string | null
          created_at?: string
          curve?: string | null
          curve_updated_at?: string | null
          default_payment_terms?: string | null
          document?: string | null
          email?: string | null
          id?: string
          inscricao_estadual?: string | null
          is_new_client?: boolean | null
          name?: string | null
          neighborhood?: string | null
          notes?: string | null
          number?: string | null
          owner_email?: string | null
          parent_client_id?: string | null
          phone?: string | null
          segment?: string | null
          site?: string | null
          state?: string | null
          street?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          city?: string | null
          client_type?: string | null
          company?: string
          complement?: string | null
          created_at?: string
          curve?: string | null
          curve_updated_at?: string | null
          default_payment_terms?: string | null
          document?: string | null
          email?: string | null
          id?: string
          inscricao_estadual?: string | null
          is_new_client?: boolean | null
          name?: string | null
          neighborhood?: string | null
          notes?: string | null
          number?: string | null
          owner_email?: string | null
          parent_client_id?: string | null
          phone?: string | null
          segment?: string | null
          site?: string | null
          state?: string | null
          street?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_parent_client_id_fkey"
            columns: ["parent_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_entries: {
        Row: {
          cliente: string
          cond_pgto: string | null
          created_at: string
          dt_emissao: string | null
          dt_fat: string
          id: string
          numero_nf: string
          numero_pedido: string
          produto_completo: string
          representante_pf: string
          tabela_preco: string | null
          tipo_pedido: string | null
          valor: number
        }
        Insert: {
          cliente: string
          cond_pgto?: string | null
          created_at?: string
          dt_emissao?: string | null
          dt_fat: string
          id?: string
          numero_nf: string
          numero_pedido: string
          produto_completo: string
          representante_pf: string
          tabela_preco?: string | null
          tipo_pedido?: string | null
          valor?: number
        }
        Update: {
          cliente?: string
          cond_pgto?: string | null
          created_at?: string
          dt_emissao?: string | null
          dt_fat?: string
          id?: string
          numero_nf?: string
          numero_pedido?: string
          produto_completo?: string
          representante_pf?: string
          tabela_preco?: string | null
          tipo_pedido?: string | null
          valor?: number
        }
        Relationships: []
      }
      commission_installments: {
        Row: {
          cliente: string
          comissao_calculada: number
          cond_pgto: string | null
          created_at: string
          dt_fat: string
          id: string
          numero_nf: string
          numero_pedido: string
          parcela_idx: number
          representante: string
          status_conciliacao: string
          status_parcela: string
          tabela_preco: string | null
          taxa_comissao: number
          total_parcelas: number
          updated_at: string
          valor_parcela: number
          vencimento: string
        }
        Insert: {
          cliente: string
          comissao_calculada?: number
          cond_pgto?: string | null
          created_at?: string
          dt_fat: string
          id?: string
          numero_nf: string
          numero_pedido: string
          parcela_idx: number
          representante: string
          status_conciliacao?: string
          status_parcela?: string
          tabela_preco?: string | null
          taxa_comissao?: number
          total_parcelas: number
          updated_at?: string
          valor_parcela?: number
          vencimento: string
        }
        Update: {
          cliente?: string
          comissao_calculada?: number
          cond_pgto?: string | null
          created_at?: string
          dt_fat?: string
          id?: string
          numero_nf?: string
          numero_pedido?: string
          parcela_idx?: number
          representante?: string
          status_conciliacao?: string
          status_parcela?: string
          tabela_preco?: string | null
          taxa_comissao?: number
          total_parcelas?: number
          updated_at?: string
          valor_parcela?: number
          vencimento?: string
        }
        Relationships: []
      }
      discount_policies: {
        Row: {
          avg_days: number
          created_at: string | null
          discount_pct: number
          id: string
          payment_terms: string
          tier: string
        }
        Insert: {
          avg_days: number
          created_at?: string | null
          discount_pct?: number
          id?: string
          payment_terms: string
          tier: string
        }
        Update: {
          avg_days?: number
          created_at?: string | null
          discount_pct?: number
          id?: string
          payment_terms?: string
          tier?: string
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
      okr_goals: {
        Row: {
          created_at: string
          id: string
          key_result: string
          metric_type: string
          month_start: string
          monthly_target: number
          owner_email: string
          strategic_objective: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          key_result: string
          metric_type: string
          month_start: string
          monthly_target: number
          owner_email: string
          strategic_objective: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          key_result?: string
          metric_type?: string
          month_start?: string
          monthly_target?: number
          owner_email?: string
          strategic_objective?: string
          updated_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          client_id: string | null
          client_name: string
          created_at: string
          delivery_date: string | null
          dimensions: string | null
          fabric: string | null
          fabric_arrival_date: string | null
          fabric_provided: string | null
          id: string
          issue_date: string
          nf_number: string | null
          nf_pdf_url: string | null
          oc: string | null
          order_number: string | null
          order_type: string | null
          owner_email: string | null
          payment_terms: string | null
          pdf_url: string | null
          price: number | null
          product: string | null
          quantity: number | null
          representative: string | null
          reschedule_date: string | null
          reschedule_history: Json | null
          status: string
          supplier: string | null
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          client_name: string
          created_at?: string
          delivery_date?: string | null
          dimensions?: string | null
          fabric?: string | null
          fabric_arrival_date?: string | null
          fabric_provided?: string | null
          id?: string
          issue_date: string
          nf_number?: string | null
          nf_pdf_url?: string | null
          oc?: string | null
          order_number?: string | null
          order_type?: string | null
          owner_email?: string | null
          payment_terms?: string | null
          pdf_url?: string | null
          price?: number | null
          product?: string | null
          quantity?: number | null
          representative?: string | null
          reschedule_date?: string | null
          reschedule_history?: Json | null
          status?: string
          supplier?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          client_name?: string
          created_at?: string
          delivery_date?: string | null
          dimensions?: string | null
          fabric?: string | null
          fabric_arrival_date?: string | null
          fabric_provided?: string | null
          id?: string
          issue_date?: string
          nf_number?: string | null
          nf_pdf_url?: string | null
          oc?: string | null
          order_number?: string | null
          order_type?: string | null
          owner_email?: string | null
          payment_terms?: string | null
          pdf_url?: string | null
          price?: number | null
          product?: string | null
          quantity?: number | null
          representative?: string | null
          reschedule_date?: string | null
          reschedule_history?: Json | null
          status?: string
          supplier?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
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
          owner_email: string | null
          parent_quote_id: string | null
          payment: Json
          status: string
          subtotal: number
          total: number
          updated_at: string
          version: number
        }
        Insert: {
          client_data: Json
          client_id?: string | null
          created_at?: string
          discount?: number
          id?: string
          items: Json
          owner_email?: string | null
          parent_quote_id?: string | null
          payment: Json
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          version?: number
        }
        Update: {
          client_data?: Json
          client_id?: string | null
          created_at?: string
          discount?: number
          id?: string
          items?: Json
          owner_email?: string | null
          parent_quote_id?: string | null
          payment?: Json
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_parent_quote_id_fkey"
            columns: ["parent_quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      rep_goals: {
        Row: {
          goal_value: number
          month_start: string
          owner_email: string
        }
        Insert: {
          goal_value: number
          month_start: string
          owner_email: string
        }
        Update: {
          goal_value?: number
          month_start?: string
          owner_email?: string
        }
        Relationships: []
      }
      representatives_map: {
        Row: {
          active: boolean
          email: string
          representative_name: string
        }
        Insert: {
          active?: boolean
          email: string
          representative_name: string
        }
        Update: {
          active?: boolean
          email?: string
          representative_name?: string
        }
        Relationships: []
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
      sales_opportunities: {
        Row: {
          client_id: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          description: string | null
          expected_close_date: string | null
          funnel_type: string
          id: string
          lost_at: string | null
          lost_reason: string | null
          notes: string | null
          owner_email: string | null
          stage: string
          title: string
          updated_at: string
          value: number | null
          won_at: string | null
        }
        Insert: {
          client_id?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          expected_close_date?: string | null
          funnel_type?: string
          id?: string
          lost_at?: string | null
          lost_reason?: string | null
          notes?: string | null
          owner_email?: string | null
          stage?: string
          title: string
          updated_at?: string
          value?: number | null
          won_at?: string | null
        }
        Update: {
          client_id?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          expected_close_date?: string | null
          funnel_type?: string
          id?: string
          lost_at?: string | null
          lost_reason?: string | null
          notes?: string | null
          owner_email?: string | null
          stage?: string
          title?: string
          updated_at?: string
          value?: number | null
          won_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_opportunities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      service_order_photos: {
        Row: {
          created_at: string
          file_name: string | null
          file_url: string
          id: string
          photo_type: string
          service_order_id: string
        }
        Insert: {
          created_at?: string
          file_name?: string | null
          file_url: string
          id?: string
          photo_type?: string
          service_order_id: string
        }
        Update: {
          created_at?: string
          file_name?: string | null
          file_url?: string
          id?: string
          photo_type?: string
          service_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_order_photos_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      service_orders: {
        Row: {
          boleto_info: string | null
          change_history: Json
          client_id: string | null
          created_at: string
          defect: string | null
          delivery_forecast: string | null
          exit_nf: string | null
          freight_cost: number
          has_rt: boolean
          id: string
          labor_cost: number
          net_result: number
          origin_nf: string | null
          os_number: string
          owner_email: string | null
          product: string | null
          responsible_name: string | null
          responsible_type: string
          rt_percentage: number | null
          service_types: string[]
          status: string
          supplies_cost: number
          supplies_nf_data: Json | null
          supplies_nf_url: string | null
          updated_at: string
        }
        Insert: {
          boleto_info?: string | null
          change_history?: Json
          client_id?: string | null
          created_at?: string
          defect?: string | null
          delivery_forecast?: string | null
          exit_nf?: string | null
          freight_cost?: number
          has_rt?: boolean
          id?: string
          labor_cost?: number
          net_result?: number
          origin_nf?: string | null
          os_number?: string
          owner_email?: string | null
          product?: string | null
          responsible_name?: string | null
          responsible_type?: string
          rt_percentage?: number | null
          service_types?: string[]
          status?: string
          supplies_cost?: number
          supplies_nf_data?: Json | null
          supplies_nf_url?: string | null
          updated_at?: string
        }
        Update: {
          boleto_info?: string | null
          change_history?: Json
          client_id?: string | null
          created_at?: string
          defect?: string | null
          delivery_forecast?: string | null
          exit_nf?: string | null
          freight_cost?: number
          has_rt?: boolean
          id?: string
          labor_cost?: number
          net_result?: number
          origin_nf?: string | null
          os_number?: string
          owner_email?: string | null
          product?: string | null
          responsible_name?: string | null
          responsible_type?: string
          rt_percentage?: number | null
          service_types?: string[]
          status?: string
          supplies_cost?: number
          supplies_nf_data?: Json | null
          supplies_nf_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
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
          owner_email: string | null
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
          owner_email?: string | null
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
          owner_email?: string | null
          start_date?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      v_client_90d_compare: {
        Row: {
          client_id: string | null
          client_name: string | null
          orders_90d: number | null
          orders_prev_90d: number | null
          owner_email: string | null
          revenue_90d: number | null
          revenue_change_pct: number | null
          revenue_prev_90d: number | null
          ticket_90d: number | null
          ticket_change_pct: number | null
          ticket_prev_90d: number | null
          volume_90d: number | null
          volume_change_pct: number | null
          volume_prev_90d: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      v_client_monthly_12m: {
        Row: {
          client_id: string | null
          client_name: string | null
          month: string | null
          orders: number | null
          owner_email: string | null
          revenue: number | null
          volume: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      v_client_suppliers_12m: {
        Row: {
          client_id: string | null
          client_name: string | null
          orders_12m: number | null
          owner_email: string | null
          revenue_12m: number | null
          supplier: string | null
          volume_12m: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      v_clients_summary: {
        Row: {
          client_id: string | null
          client_name: string | null
          days_since_last_purchase: number | null
          last_purchase_date: string | null
          no_purchase_60d: boolean | null
          orders_12m: number | null
          owner_email: string | null
          revenue_12m: number | null
          ticket_avg_12m: number | null
          volume_12m: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      v_rep_90d_compare: {
        Row: {
          orders_90d: number | null
          orders_prev_90d: number | null
          owner_email: string | null
          revenue_90d: number | null
          revenue_change_pct: number | null
          revenue_prev_90d: number | null
          ticket_90d: number | null
          ticket_change_pct: number | null
          ticket_prev_90d: number | null
          volume_90d: number | null
          volume_change_pct: number | null
          volume_prev_90d: number | null
        }
        Relationships: []
      }
      v_rep_clients_no_purchase_60d: {
        Row: {
          client_id: string | null
          client_name: string | null
          days_since_last_purchase: number | null
          last_purchase_date: string | null
          orders_12m: number | null
          owner_email: string | null
          revenue_12m: number | null
          ticket_avg_12m: number | null
          volume_12m: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      v_rep_month_dashboard: {
        Row: {
          daily_pace_so_far: number | null
          goal_achieved_pct: number | null
          goal_value: number | null
          month_end: string | null
          month_start: string | null
          owner_email: string | null
          remaining_to_goal: number | null
          required_daily_pace_remaining: number | null
          sold_month: number | null
          today: string | null
        }
        Relationships: []
      }
      v_rep_supplier_90d_compare: {
        Row: {
          orders_90d: number | null
          orders_prev_90d: number | null
          owner_email: string | null
          revenue_90d: number | null
          revenue_change_pct: number | null
          revenue_prev_90d: number | null
          supplier: string | null
          ticket_90d: number | null
          ticket_change_pct: number | null
          ticket_prev_90d: number | null
          volume_90d: number | null
          volume_change_pct: number | null
          volume_prev_90d: number | null
        }
        Relationships: []
      }
      v_rep_supplier_clients_inactive_60d: {
        Row: {
          client_id: string | null
          client_name: string | null
          days_since_last_purchase: number | null
          last_purchase_date: string | null
          owner_email: string | null
          supplier: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      v_rep_suppliers_12m: {
        Row: {
          clients_12m: number | null
          last_purchase_date: string | null
          orders_12m: number | null
          owner_email: string | null
          revenue_12m: number | null
          supplier: string | null
          volume_12m: number | null
        }
        Relationships: []
      }
      v_rep_suppliers_month: {
        Row: {
          clients_month: number | null
          orders_month: number | null
          owner_email: string | null
          revenue_month: number | null
          supplier: string | null
          volume_month: number | null
        }
        Relationships: []
      }
      v_suppliers_list: {
        Row: {
          supplier_name: string | null
        }
        Relationships: []
      }
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
