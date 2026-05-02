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
          client_name: string | null
          completed_at: string | null
          completed_notes: string | null
          created_at: string | null
          description: string | null
          due_date: string
          due_time: string | null
          fase_destino: string | null
          fase_origem: string | null
          id: string
          next_contact_date: string | null
          next_step: string | null
          order_id: string | null
          origem: string | null
          parent_activity_id: string | null
          priority: string | null
          quote_id: string | null
          recurrence_rule: Json | null
          reminder_at: string | null
          reminder_sent: boolean | null
          result: string | null
          route_visit_id: string | null
          sales_opportunity_id: string | null
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
          client_name?: string | null
          completed_at?: string | null
          completed_notes?: string | null
          created_at?: string | null
          description?: string | null
          due_date: string
          due_time?: string | null
          fase_destino?: string | null
          fase_origem?: string | null
          id?: string
          next_contact_date?: string | null
          next_step?: string | null
          order_id?: string | null
          origem?: string | null
          parent_activity_id?: string | null
          priority?: string | null
          quote_id?: string | null
          recurrence_rule?: Json | null
          reminder_at?: string | null
          reminder_sent?: boolean | null
          result?: string | null
          route_visit_id?: string | null
          sales_opportunity_id?: string | null
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
          client_name?: string | null
          completed_at?: string | null
          completed_notes?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string
          due_time?: string | null
          fase_destino?: string | null
          fase_origem?: string | null
          id?: string
          next_contact_date?: string | null
          next_step?: string | null
          order_id?: string | null
          origem?: string | null
          parent_activity_id?: string | null
          priority?: string | null
          quote_id?: string | null
          recurrence_rule?: Json | null
          reminder_at?: string | null
          reminder_sent?: boolean | null
          result?: string | null
          route_visit_id?: string | null
          sales_opportunity_id?: string | null
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
            foreignKeyName: "activities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_clients_for_nps"
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
            foreignKeyName: "activities_sales_opportunity_id_fkey"
            columns: ["sales_opportunity_id"]
            isOneToOne: false
            referencedRelation: "sales_opportunities"
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
      alertas: {
        Row: {
          cliente_id: string | null
          created_at: string | null
          data_geracao: string | null
          descricao: string | null
          id: string
          resolvido: boolean | null
          tipo: string | null
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string | null
          data_geracao?: string | null
          descricao?: string | null
          id?: string
          resolvido?: boolean | null
          tipo?: string | null
        }
        Update: {
          cliente_id?: string | null
          created_at?: string | null
          data_geracao?: string | null
          descricao?: string | null
          id?: string
          resolvido?: boolean | null
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alertas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alertas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "vw_giro_cliente"
            referencedColumns: ["cliente_id"]
          },
          {
            foreignKeyName: "alertas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "vw_wallet_share"
            referencedColumns: ["cliente_id"]
          },
        ]
      }
      automation_logs: {
        Row: {
          actions_result: Json | null
          automation_id: string | null
          duration_ms: number | null
          error_message: string | null
          executed_at: string | null
          id: string
          status: string | null
          trigger_payload: Json | null
        }
        Insert: {
          actions_result?: Json | null
          automation_id?: string | null
          duration_ms?: number | null
          error_message?: string | null
          executed_at?: string | null
          id?: string
          status?: string | null
          trigger_payload?: Json | null
        }
        Update: {
          actions_result?: Json | null
          automation_id?: string | null
          duration_ms?: number | null
          error_message?: string | null
          executed_at?: string | null
          id?: string
          status?: string | null
          trigger_payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_logs_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "automations"
            referencedColumns: ["id"]
          },
        ]
      }
      automations: {
        Row: {
          actions: Json | null
          conditions: Json | null
          created_at: string | null
          created_by: string | null
          description: string | null
          error_count: number | null
          id: string
          is_active: boolean | null
          last_run_at: string | null
          name: string
          run_count: number | null
          trigger: Json | null
          updated_at: string | null
        }
        Insert: {
          actions?: Json | null
          conditions?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          error_count?: number | null
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          name: string
          run_count?: number | null
          trigger?: Json | null
          updated_at?: string | null
        }
        Update: {
          actions?: Json | null
          conditions?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          error_count?: number | null
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          name?: string
          run_count?: number | null
          trigger?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      calendar_tokens: {
        Row: {
          created_at: string
          id: string
          token: string
          user_email: string
        }
        Insert: {
          created_at?: string
          id?: string
          token?: string
          user_email: string
        }
        Update: {
          created_at?: string
          id?: string
          token?: string
          user_email?: string
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
          {
            foreignKeyName: "client_influencers_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_clients_for_nps"
            referencedColumns: ["id"]
          },
        ]
      }
      client_portal_access: {
        Row: {
          client_id: string
          commercial_conditions: string | null
          created_at: string | null
          id: string
          portal_enabled: boolean | null
          updated_at: string | null
        }
        Insert: {
          client_id: string
          commercial_conditions?: string | null
          created_at?: string | null
          id?: string
          portal_enabled?: boolean | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          commercial_conditions?: string | null
          created_at?: string | null
          id?: string
          portal_enabled?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_portal_access_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_portal_access_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "v_clients_for_nps"
            referencedColumns: ["id"]
          },
        ]
      }
      client_portal_products: {
        Row: {
          client_id: string
          created_at: string | null
          id: string
          product_id: string
        }
        Insert: {
          client_id: string
          created_at?: string | null
          id?: string
          product_id: string
        }
        Update: {
          client_id?: string
          created_at?: string | null
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_portal_products_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_portal_products_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_clients_for_nps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_portal_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_portal_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_portal_products"
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
          {
            foreignKeyName: "client_representatives_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_clients_for_nps"
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
      clientes: {
        Row: {
          ativo: boolean | null
          cidade: string | null
          cnpj: string | null
          created_at: string | null
          estado: string | null
          id: string
          nome_fantasia: string | null
          padrao: string | null
          potencial_estimado: number | null
          razao_social: string
          representante_id: string | null
          segmento: string | null
        }
        Insert: {
          ativo?: boolean | null
          cidade?: string | null
          cnpj?: string | null
          created_at?: string | null
          estado?: string | null
          id?: string
          nome_fantasia?: string | null
          padrao?: string | null
          potencial_estimado?: number | null
          razao_social: string
          representante_id?: string | null
          segmento?: string | null
        }
        Update: {
          ativo?: boolean | null
          cidade?: string | null
          cnpj?: string | null
          created_at?: string | null
          estado?: string | null
          id?: string
          nome_fantasia?: string | null
          padrao?: string | null
          potencial_estimado?: number | null
          razao_social?: string
          representante_id?: string | null
          segmento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clientes_representante_id_fkey"
            columns: ["representante_id"]
            isOneToOne: false
            referencedRelation: "representantes"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          avg_ticket: number | null
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
          last_interaction_date: string | null
          last_purchase_date: string | null
          milestone: string | null
          name: string | null
          neighborhood: string | null
          next_action_date: string | null
          notes: string | null
          number: string | null
          owner_email: string | null
          parent_client_id: string | null
          phone: string | null
          portfolio_status: string | null
          purchase_frequency_days: number | null
          segment: string | null
          site: string | null
          state: string | null
          status: string | null
          street: string | null
          trade_name: string | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          avg_ticket?: number | null
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
          last_interaction_date?: string | null
          last_purchase_date?: string | null
          milestone?: string | null
          name?: string | null
          neighborhood?: string | null
          next_action_date?: string | null
          notes?: string | null
          number?: string | null
          owner_email?: string | null
          parent_client_id?: string | null
          phone?: string | null
          portfolio_status?: string | null
          purchase_frequency_days?: number | null
          segment?: string | null
          site?: string | null
          state?: string | null
          status?: string | null
          street?: string | null
          trade_name?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          avg_ticket?: number | null
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
          last_interaction_date?: string | null
          last_purchase_date?: string | null
          milestone?: string | null
          name?: string | null
          neighborhood?: string | null
          next_action_date?: string | null
          notes?: string | null
          number?: string | null
          owner_email?: string | null
          parent_client_id?: string | null
          phone?: string | null
          portfolio_status?: string | null
          purchase_frequency_days?: number | null
          segment?: string | null
          site?: string | null
          state?: string | null
          status?: string | null
          street?: string | null
          trade_name?: string | null
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
          {
            foreignKeyName: "clients_parent_client_id_fkey"
            columns: ["parent_client_id"]
            isOneToOne: false
            referencedRelation: "v_clients_for_nps"
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
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      finance_audit_log: {
        Row: {
          action: string
          created_at: string
          id: string
          payload: Json | null
          record_id: string | null
          table_name: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          payload?: Json | null
          record_id?: string | null
          table_name: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          payload?: Json | null
          record_id?: string | null
          table_name?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      finance_bank_accounts: {
        Row: {
          account_number: string | null
          account_type: string
          active: boolean
          agency: string | null
          bank_name: string | null
          color: string | null
          company_id: string | null
          created_at: string
          id: string
          initial_balance: number
          initial_balance_date: string | null
          initial_balance_notes: string | null
          name: string
          updated_at: string
        }
        Insert: {
          account_number?: string | null
          account_type?: string
          active?: boolean
          agency?: string | null
          bank_name?: string | null
          color?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          initial_balance?: number
          initial_balance_date?: string | null
          initial_balance_notes?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          account_number?: string | null
          account_type?: string
          active?: boolean
          agency?: string | null
          bank_name?: string | null
          color?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          initial_balance?: number
          initial_balance_date?: string | null
          initial_balance_notes?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_bank_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "finance_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_bank_transactions: {
        Row: {
          amount: number
          balance_after: number | null
          bank_account_id: string
          created_at: string
          description: string
          fitid: string | null
          id: string
          imported_at: string
          memo: string | null
          raw_data: Json | null
          reconciliation_status: string
          source: string
          transaction_date: string
          transaction_type: string
          updated_at: string
        }
        Insert: {
          amount: number
          balance_after?: number | null
          bank_account_id: string
          created_at?: string
          description: string
          fitid?: string | null
          id?: string
          imported_at?: string
          memo?: string | null
          raw_data?: Json | null
          reconciliation_status?: string
          source?: string
          transaction_date: string
          transaction_type?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          balance_after?: number | null
          bank_account_id?: string
          created_at?: string
          description?: string
          fitid?: string | null
          id?: string
          imported_at?: string
          memo?: string | null
          raw_data?: Json | null
          reconciliation_status?: string
          source?: string
          transaction_date?: string
          transaction_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_bank_transactions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "finance_bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_bank_transactions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "vw_finance_account_balance"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_cash_entries: {
        Row: {
          amount: number
          bank_account_id: string | null
          category: string | null
          company_id: string | null
          cost_center: string | null
          created_at: string | null
          created_by: string | null
          description: string
          direction: string
          entry_date: string
          id: string
          notes: string | null
          receipt_url: string | null
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          category?: string | null
          company_id?: string | null
          cost_center?: string | null
          created_at?: string | null
          created_by?: string | null
          description: string
          direction: string
          entry_date?: string
          id?: string
          notes?: string | null
          receipt_url?: string | null
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          category?: string | null
          company_id?: string | null
          cost_center?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string
          direction?: string
          entry_date?: string
          id?: string
          notes?: string | null
          receipt_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_cash_entries_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "finance_bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_cash_entries_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "vw_finance_account_balance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_cash_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "finance_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_categories: {
        Row: {
          active: boolean
          category_type: string
          color: string | null
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          category_type?: string
          color?: string | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          category_type?: string
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      finance_companies: {
        Row: {
          active: boolean
          created_at: string
          document: string | null
          entity_type: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          document?: string | null
          entity_type?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          document?: string | null
          entity_type?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      finance_cost_centers: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      finance_documents: {
        Row: {
          created_at: string
          entry_id: string | null
          error_message: string | null
          extracted_data: Json | null
          file_hash: string | null
          file_name: string
          file_size: number
          id: string
          mime_type: string
          ocr_confidence: string | null
          status: string
          storage_path: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          entry_id?: string | null
          error_message?: string | null
          extracted_data?: Json | null
          file_hash?: string | null
          file_name: string
          file_size?: number
          id?: string
          mime_type: string
          ocr_confidence?: string | null
          status?: string
          storage_path: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          entry_id?: string | null
          error_message?: string | null
          extracted_data?: Json | null
          file_hash?: string | null
          file_name?: string
          file_size?: number
          id?: string
          mime_type?: string
          ocr_confidence?: string | null
          status?: string
          storage_path?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_documents_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "finance_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_entries: {
        Row: {
          amount: number
          bank_account_id: string | null
          category_id: string | null
          company_id: string | null
          cost_center: string | null
          counterparty: string | null
          created_at: string
          description: string
          document: string | null
          due_date: string
          entry_type: string
          id: string
          installment_index: number
          installment_total: number
          notes: string | null
          paid_date: string | null
          payment_method: string | null
          recurrence_id: string | null
          recurrence_rule: string | null
          source: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          category_id?: string | null
          company_id?: string | null
          cost_center?: string | null
          counterparty?: string | null
          created_at?: string
          description: string
          document?: string | null
          due_date: string
          entry_type: string
          id?: string
          installment_index?: number
          installment_total?: number
          notes?: string | null
          paid_date?: string | null
          payment_method?: string | null
          recurrence_id?: string | null
          recurrence_rule?: string | null
          source?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          category_id?: string | null
          company_id?: string | null
          cost_center?: string | null
          counterparty?: string | null
          created_at?: string
          description?: string
          document?: string | null
          due_date?: string
          entry_type?: string
          id?: string
          installment_index?: number
          installment_total?: number
          notes?: string | null
          paid_date?: string | null
          payment_method?: string | null
          recurrence_id?: string | null
          recurrence_rule?: string | null
          source?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_entries_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "finance_bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_entries_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "vw_finance_account_balance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_entries_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "finance_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "finance_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_reconciliations: {
        Row: {
          bank_transaction_id: string
          confirmed_at: string
          confirmed_by: string | null
          created_at: string
          entry_id: string
          id: string
          match_score: number | null
          match_type: string
          notes: string | null
        }
        Insert: {
          bank_transaction_id: string
          confirmed_at?: string
          confirmed_by?: string | null
          created_at?: string
          entry_id: string
          id?: string
          match_score?: number | null
          match_type?: string
          notes?: string | null
        }
        Update: {
          bank_transaction_id?: string
          confirmed_at?: string
          confirmed_by?: string | null
          created_at?: string
          entry_id?: string
          id?: string
          match_score?: number | null
          match_type?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_reconciliations_bank_transaction_id_fkey"
            columns: ["bank_transaction_id"]
            isOneToOne: false
            referencedRelation: "finance_bank_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_reconciliations_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "finance_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_user_preferences: {
        Row: {
          created_at: string
          currency: string
          date_format: string
          dre_email_frequency: string
          dre_email_recipients: string[]
          due_alert_days: number
          due_alerts_enabled: boolean
          id: string
          updated_at: string
          user_email: string
        }
        Insert: {
          created_at?: string
          currency?: string
          date_format?: string
          dre_email_frequency?: string
          dre_email_recipients?: string[]
          due_alert_days?: number
          due_alerts_enabled?: boolean
          id?: string
          updated_at?: string
          user_email: string
        }
        Update: {
          created_at?: string
          currency?: string
          date_format?: string
          dre_email_frequency?: string
          dre_email_recipients?: string[]
          due_alert_days?: number
          due_alerts_enabled?: boolean
          id?: string
          updated_at?: string
          user_email?: string
        }
        Relationships: []
      }
      historico_fases: {
        Row: {
          alterado_por: string | null
          created_at: string
          fase_anterior: string | null
          fase_nova: string
          id: string
          sales_opportunity_id: string
        }
        Insert: {
          alterado_por?: string | null
          created_at?: string
          fase_anterior?: string | null
          fase_nova: string
          id?: string
          sales_opportunity_id: string
        }
        Update: {
          alterado_por?: string | null
          created_at?: string
          fase_anterior?: string | null
          fase_nova?: string
          id?: string
          sales_opportunity_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "historico_fases_sales_opportunity_id_fkey"
            columns: ["sales_opportunity_id"]
            isOneToOne: false
            referencedRelation: "sales_opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      metas: {
        Row: {
          ano: number | null
          created_at: string | null
          id: string
          mes: number | null
          representada_id: string | null
          representante_id: string | null
          tipo: string | null
          valor_meta: number | null
        }
        Insert: {
          ano?: number | null
          created_at?: string | null
          id?: string
          mes?: number | null
          representada_id?: string | null
          representante_id?: string | null
          tipo?: string | null
          valor_meta?: number | null
        }
        Update: {
          ano?: number | null
          created_at?: string | null
          id?: string
          mes?: number | null
          representada_id?: string | null
          representante_id?: string | null
          tipo?: string | null
          valor_meta?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "metas_representada_id_fkey"
            columns: ["representada_id"]
            isOneToOne: false
            referencedRelation: "representadas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metas_representante_id_fkey"
            columns: ["representante_id"]
            isOneToOne: false
            referencedRelation: "representantes"
            referencedColumns: ["id"]
          },
        ]
      }
      modulation_finishes: {
        Row: {
          created_at: string | null
          finish_name: string
          id: string
          price: number
          size_id: string | null
        }
        Insert: {
          created_at?: string | null
          finish_name: string
          id?: string
          price: number
          size_id?: string | null
        }
        Update: {
          created_at?: string | null
          finish_name?: string
          id?: string
          price?: number
          size_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "modulation_finishes_size_id_fkey"
            columns: ["size_id"]
            isOneToOne: false
            referencedRelation: "modulation_sizes"
            referencedColumns: ["id"]
          },
        ]
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
      nps_responses: {
        Row: {
          client_id: string
          comment: string | null
          consultant_name: string
          created_at: string | null
          id: string
          response_date: string
          score_1: number
          score_2: number
          score_3: number
          score_4: number
          score_5: number
          trainer_email: string | null
          training_id: string | null
        }
        Insert: {
          client_id: string
          comment?: string | null
          consultant_name: string
          created_at?: string | null
          id?: string
          response_date?: string
          score_1?: number
          score_2?: number
          score_3?: number
          score_4?: number
          score_5?: number
          trainer_email?: string | null
          training_id?: string | null
        }
        Update: {
          client_id?: string
          comment?: string | null
          consultant_name?: string
          created_at?: string | null
          id?: string
          response_date?: string
          score_1?: number
          score_2?: number
          score_3?: number
          score_4?: number
          score_5?: number
          trainer_email?: string | null
          training_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nps_responses_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nps_responses_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_clients_for_nps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nps_responses_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "store_trainings"
            referencedColumns: ["id"]
          },
        ]
      }
      okr_goal_activity_types: {
        Row: {
          activity_type: string
          created_at: string | null
          goal_id: string
          id: string
        }
        Insert: {
          activity_type: string
          created_at?: string | null
          goal_id: string
          id?: string
        }
        Update: {
          activity_type?: string
          created_at?: string | null
          goal_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "okr_goal_activity_types_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "okr_goals"
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
      opportunity_activities: {
        Row: {
          canal: string | null
          created_at: string | null
          data_prevista: string
          data_realizada: string | null
          descricao: string | null
          id: string
          notas_execucao: string | null
          opportunity_id: string
          status: string
          tipo: string
          titulo: string
          updated_at: string | null
        }
        Insert: {
          canal?: string | null
          created_at?: string | null
          data_prevista: string
          data_realizada?: string | null
          descricao?: string | null
          id?: string
          notas_execucao?: string | null
          opportunity_id: string
          status?: string
          tipo: string
          titulo: string
          updated_at?: string | null
        }
        Update: {
          canal?: string | null
          created_at?: string | null
          data_prevista?: string
          data_realizada?: string | null
          descricao?: string | null
          id?: string
          notas_execucao?: string | null
          opportunity_id?: string
          status?: string
          tipo?: string
          titulo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_activities_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "sales_opportunities"
            referencedColumns: ["id"]
          },
        ]
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
          {
            foreignKeyName: "orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_clients_for_nps"
            referencedColumns: ["id"]
          },
        ]
      }
      orders_history: {
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
        Relationships: []
      }
      product_finish_prices: {
        Row: {
          acabamento: string
          created_at: string | null
          id: string
          modulacao: string
          preco: number
          product_code: string
          product_name: string | null
          tamanho: string
        }
        Insert: {
          acabamento: string
          created_at?: string | null
          id?: string
          modulacao: string
          preco: number
          product_code: string
          product_name?: string | null
          tamanho: string
        }
        Update: {
          acabamento?: string
          created_at?: string | null
          id?: string
          modulacao?: string
          preco?: number
          product_code?: string
          product_name?: string | null
          tamanho?: string
        }
        Relationships: []
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
          {
            foreignKeyName: "product_modulations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_portal_products"
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
          tipo_precificacao: string | null
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
          tipo_precificacao?: string | null
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
          tipo_precificacao?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      produtos: {
        Row: {
          ativo: boolean | null
          categoria: string | null
          codigo: string
          created_at: string | null
          id: string
          linha: string | null
          nome: string
          preco_tabela: number | null
          representada_id: string | null
        }
        Insert: {
          ativo?: boolean | null
          categoria?: string | null
          codigo: string
          created_at?: string | null
          id?: string
          linha?: string | null
          nome: string
          preco_tabela?: number | null
          representada_id?: string | null
        }
        Update: {
          ativo?: boolean | null
          categoria?: string | null
          codigo?: string
          created_at?: string | null
          id?: string
          linha?: string | null
          nome?: string
          preco_tabela?: number | null
          representada_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "produtos_representada_id_fkey"
            columns: ["representada_id"]
            isOneToOne: false
            referencedRelation: "representadas"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "quotes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_clients_for_nps"
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
          id: string
          month_start: string
          owner_email: string
          supplier: string | null
        }
        Insert: {
          goal_value: number
          id?: string
          month_start: string
          owner_email: string
          supplier?: string | null
        }
        Update: {
          goal_value?: number
          id?: string
          month_start?: string
          owner_email?: string
          supplier?: string | null
        }
        Relationships: []
      }
      representadas: {
        Row: {
          ativa: boolean | null
          created_at: string | null
          id: string
          nome: string
          percentual_carteira: number | null
        }
        Insert: {
          ativa?: boolean | null
          created_at?: string | null
          id?: string
          nome: string
          percentual_carteira?: number | null
        }
        Update: {
          ativa?: boolean | null
          created_at?: string | null
          id?: string
          nome?: string
          percentual_carteira?: number | null
        }
        Relationships: []
      }
      representantes: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          id: string
          nome: string
          tipo: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          id?: string
          nome: string
          tipo?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          id?: string
          nome?: string
          tipo?: string | null
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
            foreignKeyName: "route_visits_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_clients_for_nps"
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
          fase: string | null
          fase_anterior: string | null
          fase_atualizada_em: string | null
          funnel_type: string
          id: string
          lost_at: string | null
          lost_reason: string | null
          next_followup_date: string | null
          notes: string | null
          owner_email: string | null
          stage: string
          stage_changed_at: string
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
          fase?: string | null
          fase_anterior?: string | null
          fase_atualizada_em?: string | null
          funnel_type?: string
          id?: string
          lost_at?: string | null
          lost_reason?: string | null
          next_followup_date?: string | null
          notes?: string | null
          owner_email?: string | null
          stage?: string
          stage_changed_at?: string
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
          fase?: string | null
          fase_anterior?: string | null
          fase_atualizada_em?: string | null
          funnel_type?: string
          id?: string
          lost_at?: string | null
          lost_reason?: string | null
          next_followup_date?: string | null
          notes?: string | null
          owner_email?: string | null
          stage?: string
          stage_changed_at?: string
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
          {
            foreignKeyName: "sales_opportunities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_clients_for_nps"
            referencedColumns: ["id"]
          },
        ]
      }
      sell_in: {
        Row: {
          cliente_id: string | null
          created_at: string | null
          data_pedido: string
          id: string
          produto_id: string | null
          quantidade: number
          representada_id: string | null
          representante_id: string | null
          status: string | null
          tipo: string | null
          valor_total: number | null
          valor_unitario: number | null
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string | null
          data_pedido: string
          id?: string
          produto_id?: string | null
          quantidade?: number
          representada_id?: string | null
          representante_id?: string | null
          status?: string | null
          tipo?: string | null
          valor_total?: number | null
          valor_unitario?: number | null
        }
        Update: {
          cliente_id?: string | null
          created_at?: string | null
          data_pedido?: string
          id?: string
          produto_id?: string | null
          quantidade?: number
          representada_id?: string | null
          representante_id?: string | null
          status?: string | null
          tipo?: string | null
          valor_total?: number | null
          valor_unitario?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sell_in_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sell_in_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "vw_giro_cliente"
            referencedColumns: ["cliente_id"]
          },
          {
            foreignKeyName: "sell_in_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "vw_wallet_share"
            referencedColumns: ["cliente_id"]
          },
          {
            foreignKeyName: "sell_in_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sell_in_representada_id_fkey"
            columns: ["representada_id"]
            isOneToOne: false
            referencedRelation: "representadas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sell_in_representante_id_fkey"
            columns: ["representante_id"]
            isOneToOne: false
            referencedRelation: "representantes"
            referencedColumns: ["id"]
          },
        ]
      }
      sell_out: {
        Row: {
          cliente_id: string | null
          created_at: string | null
          data_venda: string
          id: string
          origem: string | null
          produto_id: string | null
          quantidade: number
          valor_venda: number | null
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string | null
          data_venda: string
          id?: string
          origem?: string | null
          produto_id?: string | null
          quantidade?: number
          valor_venda?: number | null
        }
        Update: {
          cliente_id?: string | null
          created_at?: string | null
          data_venda?: string
          id?: string
          origem?: string | null
          produto_id?: string | null
          quantidade?: number
          valor_venda?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sell_out_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sell_out_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "vw_giro_cliente"
            referencedColumns: ["cliente_id"]
          },
          {
            foreignKeyName: "sell_out_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "vw_wallet_share"
            referencedColumns: ["cliente_id"]
          },
          {
            foreignKeyName: "sell_out_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      sellout_lsa: {
        Row: {
          categoria: string | null
          cliente: string | null
          cond_pgto: string | null
          created_at: string | null
          dimensoes: string | null
          dt_cli: string | null
          dt_emissao: string | null
          faixa_preco: string | null
          id: string
          marca: string | null
          numero_pedido: string | null
          oc: string | null
          produto_completo: string | null
          quantidade: number | null
          representante: string | null
          tecido: string | null
          tipo_pedido: string | null
          valor: number | null
        }
        Insert: {
          categoria?: string | null
          cliente?: string | null
          cond_pgto?: string | null
          created_at?: string | null
          dimensoes?: string | null
          dt_cli?: string | null
          dt_emissao?: string | null
          faixa_preco?: string | null
          id?: string
          marca?: string | null
          numero_pedido?: string | null
          oc?: string | null
          produto_completo?: string | null
          quantidade?: number | null
          representante?: string | null
          tecido?: string | null
          tipo_pedido?: string | null
          valor?: number | null
        }
        Update: {
          categoria?: string | null
          cliente?: string | null
          cond_pgto?: string | null
          created_at?: string | null
          dimensoes?: string | null
          dt_cli?: string | null
          dt_emissao?: string | null
          faixa_preco?: string | null
          id?: string
          marca?: string | null
          numero_pedido?: string | null
          oc?: string | null
          produto_completo?: string | null
          quantidade?: number | null
          representante?: string | null
          tecido?: string | null
          tipo_pedido?: string | null
          valor?: number | null
        }
        Relationships: []
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
          {
            foreignKeyName: "service_orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_clients_for_nps"
            referencedColumns: ["id"]
          },
        ]
      }
      showroom: {
        Row: {
          cliente_id: string | null
          condicao: string | null
          created_at: string | null
          data_entrada: string
          data_saida: string | null
          id: string
          motivo_saida: string | null
          produto_id: string | null
        }
        Insert: {
          cliente_id?: string | null
          condicao?: string | null
          created_at?: string | null
          data_entrada: string
          data_saida?: string | null
          id?: string
          motivo_saida?: string | null
          produto_id?: string | null
        }
        Update: {
          cliente_id?: string | null
          condicao?: string | null
          created_at?: string | null
          data_entrada?: string
          data_saida?: string | null
          id?: string
          motivo_saida?: string | null
          produto_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "showroom_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "showroom_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "vw_giro_cliente"
            referencedColumns: ["cliente_id"]
          },
          {
            foreignKeyName: "showroom_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "vw_wallet_share"
            referencedColumns: ["cliente_id"]
          },
          {
            foreignKeyName: "showroom_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      showroom_tracking: {
        Row: {
          atualizado_em: string | null
          checklist_id: string | null
          cidade: string | null
          cliente: string
          data_confirmacao: string | null
          data_treinamento: string | null
          dt_faturamento: string
          id: string
          importado_em: string | null
          nf_numero: string
          obs_treinamento: string | null
          observacao: string | null
          order_type: string | null
          produto: string
          quantidade: number | null
          representante: string | null
          segmento_cliente: string | null
          status_exposicao: string | null
          status_treinamento: string | null
          valor: number | null
        }
        Insert: {
          atualizado_em?: string | null
          checklist_id?: string | null
          cidade?: string | null
          cliente: string
          data_confirmacao?: string | null
          data_treinamento?: string | null
          dt_faturamento: string
          id?: string
          importado_em?: string | null
          nf_numero: string
          obs_treinamento?: string | null
          observacao?: string | null
          order_type?: string | null
          produto: string
          quantidade?: number | null
          representante?: string | null
          segmento_cliente?: string | null
          status_exposicao?: string | null
          status_treinamento?: string | null
          valor?: number | null
        }
        Update: {
          atualizado_em?: string | null
          checklist_id?: string | null
          cidade?: string | null
          cliente?: string
          data_confirmacao?: string | null
          data_treinamento?: string | null
          dt_faturamento?: string
          id?: string
          importado_em?: string | null
          nf_numero?: string
          obs_treinamento?: string | null
          observacao?: string | null
          order_type?: string | null
          produto?: string
          quantidade?: number | null
          representante?: string | null
          segmento_cliente?: string | null
          status_exposicao?: string | null
          status_treinamento?: string | null
          valor?: number | null
        }
        Relationships: []
      }
      store_trainings: {
        Row: {
          client_id: string
          collection: string | null
          created_at: string | null
          id: string
          nps_submitted: boolean
          nps_token: string | null
          observations: string | null
          trainer_email: string
          training_date: string
        }
        Insert: {
          client_id: string
          collection?: string | null
          created_at?: string | null
          id?: string
          nps_submitted?: boolean
          nps_token?: string | null
          observations?: string | null
          trainer_email: string
          training_date: string
        }
        Update: {
          client_id?: string
          collection?: string | null
          created_at?: string | null
          id?: string
          nps_submitted?: boolean
          nps_token?: string | null
          observations?: string | null
          trainer_email?: string
          training_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_trainings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_trainings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_clients_for_nps"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      training_participants: {
        Row: {
          consultant_name: string
          created_at: string | null
          id: string
          training_id: string
        }
        Insert: {
          consultant_name: string
          created_at?: string | null
          id?: string
          training_id: string
        }
        Update: {
          consultant_name?: string
          created_at?: string | null
          id?: string
          training_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_participants_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "store_trainings"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          client_id: string | null
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_clients_for_nps"
            referencedColumns: ["id"]
          },
        ]
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
      visitas: {
        Row: {
          acao_showroom: string | null
          cliente_id: string | null
          created_at: string | null
          data_visita: string
          duracao_minutos: number | null
          id: string
          mix_apresentado: string | null
          observacoes: string | null
          oportunidade_mix: string | null
          previsao_compra: number | null
          produtos_sem_giro_identificados: boolean | null
          projetos_em_andamento: string | null
          proxima_visita_prevista: string | null
          representante_id: string | null
          resultado: string | null
          showroom_revisado: boolean | null
          tipo: string | null
          valor_pedido: number | null
        }
        Insert: {
          acao_showroom?: string | null
          cliente_id?: string | null
          created_at?: string | null
          data_visita: string
          duracao_minutos?: number | null
          id?: string
          mix_apresentado?: string | null
          observacoes?: string | null
          oportunidade_mix?: string | null
          previsao_compra?: number | null
          produtos_sem_giro_identificados?: boolean | null
          projetos_em_andamento?: string | null
          proxima_visita_prevista?: string | null
          representante_id?: string | null
          resultado?: string | null
          showroom_revisado?: boolean | null
          tipo?: string | null
          valor_pedido?: number | null
        }
        Update: {
          acao_showroom?: string | null
          cliente_id?: string | null
          created_at?: string | null
          data_visita?: string
          duracao_minutos?: number | null
          id?: string
          mix_apresentado?: string | null
          observacoes?: string | null
          oportunidade_mix?: string | null
          previsao_compra?: number | null
          produtos_sem_giro_identificados?: boolean | null
          projetos_em_andamento?: string | null
          proxima_visita_prevista?: string | null
          representante_id?: string | null
          resultado?: string | null
          showroom_revisado?: boolean | null
          tipo?: string | null
          valor_pedido?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "visitas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visitas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "vw_giro_cliente"
            referencedColumns: ["cliente_id"]
          },
          {
            foreignKeyName: "visitas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "vw_wallet_share"
            referencedColumns: ["cliente_id"]
          },
          {
            foreignKeyName: "visitas_representante_id_fkey"
            columns: ["representante_id"]
            isOneToOne: false
            referencedRelation: "representantes"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: []
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
          {
            foreignKeyName: "orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_clients_for_nps"
            referencedColumns: ["id"]
          },
        ]
      }
      v_client_mtd_yoy: {
        Row: {
          client_id: string | null
          client_name: string | null
          orders_mtd_current: number | null
          orders_mtd_previous: number | null
          orders_mtd_yoy_pct: number | null
          owner_email: string | null
          revenue_mtd_current: number | null
          revenue_mtd_previous: number | null
          revenue_mtd_yoy_pct: number | null
          ticket_mtd_current: number | null
          ticket_mtd_previous: number | null
          volume_mtd_current: number | null
          volume_mtd_previous: number | null
          volume_mtd_yoy_pct: number | null
        }
        Relationships: []
      }
      v_client_supplier_share_12m: {
        Row: {
          client_id: string | null
          client_name: string | null
          orders_12m: number | null
          orders_share_pct: number | null
          owner_email: string | null
          revenue_12m: number | null
          revenue_share_pct: number | null
          supplier: string | null
          total_client_orders_12m: number | null
          total_client_revenue_12m: number | null
          total_client_volume_12m: number | null
          volume_12m: number | null
          volume_share_pct: number | null
        }
        Relationships: []
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
          {
            foreignKeyName: "orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_clients_for_nps"
            referencedColumns: ["id"]
          },
        ]
      }
      v_clients_for_nps: {
        Row: {
          company: string | null
          id: string | null
        }
        Insert: {
          company?: string | null
          id?: string | null
        }
        Update: {
          company?: string | null
          id?: string | null
        }
        Relationships: []
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
        Relationships: []
      }
      v_portal_products: {
        Row: {
          category: string | null
          code: string | null
          description: string | null
          factory: string | null
          id: string | null
          image_url: string | null
          name: string | null
          price_from: number | null
        }
        Relationships: []
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
        Relationships: []
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
      v_rep_month_trend: {
        Row: {
          avg_ticket: number | null
          month_ref: string | null
          orders_count: number | null
          orders_diff_month: number | null
          orders_prev_month: number | null
          owner_email: string | null
          rep_name: string | null
          revenue: number | null
          revenue_change_pct: number | null
          revenue_diff_month: number | null
          revenue_prev_month: number | null
          ticket_change_pct: number | null
          ticket_diff_month: number | null
          ticket_prev_month: number | null
          trend_status: string | null
          volume: number | null
          volume_change_pct: number | null
          volume_diff_month: number | null
          volume_prev_month: number | null
        }
        Relationships: []
      }
      v_rep_month_trend_base: {
        Row: {
          avg_ticket: number | null
          month_ref: string | null
          orders_count: number | null
          owner_email: string | null
          rep_name: string | null
          revenue: number | null
          volume: number | null
        }
        Relationships: []
      }
      v_rep_mtd_yoy: {
        Row: {
          orders_mtd_current: number | null
          orders_mtd_previous: number | null
          orders_mtd_yoy_pct: number | null
          owner_email: string | null
          revenue_mtd_current: number | null
          revenue_mtd_diff: number | null
          revenue_mtd_previous: number | null
          revenue_mtd_yoy_pct: number | null
          ticket_mtd_current: number | null
          ticket_mtd_previous: number | null
          ticket_mtd_yoy_pct: number | null
          volume_mtd_current: number | null
          volume_mtd_previous: number | null
          volume_mtd_yoy_pct: number | null
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
          {
            foreignKeyName: "orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_clients_for_nps"
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
      v_rep_top_clients_90d: {
        Row: {
          client_id: string | null
          client_name: string | null
          orders_90d: number | null
          owner_email: string | null
          rank_90d: number | null
          revenue_90d: number | null
          ticket_90d: number | null
          volume_90d: number | null
        }
        Relationships: []
      }
      v_sales_90d_by_client: {
        Row: {
          client_id: string | null
          client_name: string | null
          orders_90d: number | null
          owner_email: string | null
          revenue_90d: number | null
          ticket_90d: number | null
          volume_90d: number | null
        }
        Relationships: []
      }
      v_sales_base: {
        Row: {
          client_id: string | null
          client_name: string | null
          id: string | null
          issue_date: string | null
          line_revenue: number | null
          month_num: number | null
          month_ref: string | null
          order_number: string | null
          owner_email: string | null
          price: number | null
          quantity: number | null
          representative: string | null
          revenue_status: string | null
          supplier: string | null
          year_ref: number | null
        }
        Relationships: []
      }
      v_sales_mtd_by_client: {
        Row: {
          client_id: string | null
          client_name: string | null
          orders_mtd: number | null
          owner_email: string | null
          revenue_mtd: number | null
          ticket_mtd: number | null
          volume_mtd: number | null
        }
        Relationships: []
      }
      v_sales_mtd_by_representative: {
        Row: {
          orders_mtd: number | null
          owner_email: string | null
          representative: string | null
          revenue_mtd: number | null
          ticket_mtd: number | null
          volume_mtd: number | null
        }
        Relationships: []
      }
      v_sales_mtd_by_supplier: {
        Row: {
          orders_mtd: number | null
          owner_email: string | null
          revenue_mtd: number | null
          supplier: string | null
          ticket_mtd: number | null
          volume_mtd: number | null
        }
        Relationships: []
      }
      v_suppliers_list: {
        Row: {
          supplier_name: string | null
        }
        Relationships: []
      }
      vw_cadencia_linkedin: {
        Row: {
          acao_script: string | null
          acao_titulo: string | null
          data_prevista: string | null
          data_realizada: string | null
          id: string | null
          lead_contato: string | null
          lead_email: string | null
          lead_stage: string | null
          lead_telefone: string | null
          lead_titulo: string | null
          notas_execucao: string | null
          opportunity_id: string | null
          status: string | null
          tipo: string | null
          urgencia: string | null
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_activities_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "sales_opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_clientes_risco: {
        Row: {
          client_name: string | null
          dias_sem_sellout: number | null
          mix_historico: number | null
          nivel_risco: string | null
          representative: string | null
          sellin_historico: number | null
          sellout_historico: number | null
          ultimo_sellout: string | null
        }
        Relationships: []
      }
      vw_finance_account_balance: {
        Row: {
          account_type: string | null
          bank_name: string | null
          caixa_in: number | null
          caixa_out: number | null
          color: string | null
          company_id: string | null
          data_saldo_inicial: string | null
          id: string | null
          name: string | null
          saldo_atual: number | null
          saldo_inicial: number | null
          total_entradas: number | null
          total_saidas: number | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_bank_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "finance_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_finance_cashflow_30d: {
        Row: {
          data_vencimento: string | null
          previsto_entrada: number | null
          previsto_saida: number | null
          saldo_diario_liquido: number | null
        }
        Relationships: []
      }
      vw_giro_cliente: {
        Row: {
          cliente_id: string | null
          nome_fantasia: string | null
          segmento: string | null
          sell_in_12m: number | null
          sell_out_12m: number | null
          taxa_giro_pct: number | null
        }
        Relationships: []
      }
      vw_giro_pdv: {
        Row: {
          classificacao_giro: string | null
          client_name: string | null
          giro_pct: number | null
          pecas_expostas: number | null
          pecas_vendidas: number | null
          product: string | null
          representative: string | null
          sellin: number | null
          sellout: number | null
          supplier: string | null
        }
        Relationships: []
      }
      vw_mix_cliente: {
        Row: {
          client_name: string | null
          indice_mix_pct: number | null
          produtos_distintos: number | null
          produtos_expostos: number | null
          produtos_vendidos: number | null
          representative: string | null
          sellin_total: number | null
          sellout_total: number | null
        }
        Relationships: []
      }
      vw_mix_heatmap: {
        Row: {
          client_name: string | null
          order_type: string | null
          pecas: number | null
          pedidos: number | null
          primeira_vez: string | null
          product: string | null
          representative: string | null
          supplier: string | null
          ultima_vez: string | null
          volume: number | null
        }
        Relationships: []
      }
      vw_positivacao: {
        Row: {
          positivados_30d: number | null
          positivados_60d: number | null
          positivados_90d: number | null
          segmento: string | null
          taxa_positivacao_30d: number | null
          total_clientes: number | null
        }
        Relationships: []
      }
      vw_positivacao_mensal: {
        Row: {
          clientes_casabrazil: number | null
          clientes_com_sellout: number | null
          clientes_sohome: number | null
          mes: string | null
        }
        Relationships: []
      }
      vw_ranking_produtos: {
        Row: {
          clientes_compradores: number | null
          clientes_expondo: number | null
          pecas_vendidas: number | null
          pedidos_encomenda: number | null
          product: string | null
          sellin_total: number | null
          sellout_total: number | null
          supplier: string | null
          taxa_conversao_pct: number | null
        }
        Relationships: []
      }
      vw_ranking_representantes: {
        Row: {
          clientes_com_sellout: number | null
          pedidos_sellin: number | null
          pedidos_sellout: number | null
          representative: string | null
          sellin_total: number | null
          sellout_total: number | null
          ticket_medio_cliente: number | null
          total_clientes: number | null
          volume_total: number | null
        }
        Relationships: []
      }
      vw_saude_carteira: {
        Row: {
          client_name: string | null
          dias_sem_sellout: number | null
          mix_produtos: number | null
          produtos_vendidos: number | null
          representative: string | null
          sellin_total: number | null
          sellout_30d: number | null
          sellout_90d: number | null
          sellout_total: number | null
          status_sellout: string | null
          taxa_giro: number | null
          ultimo_sellout: string | null
        }
        Relationships: []
      }
      vw_segmentacao_abc: {
        Row: {
          client_name: string | null
          pct_acumulada: number | null
          pct_do_sellout: number | null
          representative: string | null
          segmento: string | null
          sellin_total: number | null
          sellout_total: number | null
          volume_total: number | null
        }
        Relationships: []
      }
      vw_sell_in_mensal: {
        Row: {
          clientes: number | null
          mes: string | null
          pedidos: number | null
          sell_in_total: number | null
          supplier: string | null
        }
        Relationships: []
      }
      vw_sell_in_mtd: {
        Row: {
          clientes_ativos: number | null
          pecas_mtd: number | null
          qtd_pedidos: number | null
          representative: string | null
          sell_in_mtd: number | null
        }
        Relationships: []
      }
      vw_sell_out_mensal: {
        Row: {
          clientes: number | null
          mes: string | null
          pedidos: number | null
          sell_out_total: number | null
          supplier: string | null
        }
        Relationships: []
      }
      vw_sell_out_mtd: {
        Row: {
          clientes_ativos: number | null
          pecas_mtd: number | null
          qtd_pedidos: number | null
          representative: string | null
          sell_out_mtd: number | null
        }
        Relationships: []
      }
      vw_showroom_acompanhamento: {
        Row: {
          cidade: string | null
          cliente: string | null
          data_confirmacao: string | null
          dias_desde_fat: number | null
          dt_faturamento: string | null
          id: string | null
          nf_numero: string | null
          observacao: string | null
          produto: string | null
          quantidade: number | null
          representante: string | null
          segmento_cliente: string | null
          status_exposicao: string | null
          status_treinamento: string | null
          treinamento_pendente: boolean | null
          urgencia: string | null
          valor: number | null
        }
        Insert: {
          cidade?: string | null
          cliente?: string | null
          data_confirmacao?: string | null
          dias_desde_fat?: never
          dt_faturamento?: string | null
          id?: string | null
          nf_numero?: string | null
          observacao?: string | null
          produto?: string | null
          quantidade?: number | null
          representante?: string | null
          segmento_cliente?: string | null
          status_exposicao?: string | null
          status_treinamento?: string | null
          treinamento_pendente?: never
          urgencia?: never
          valor?: number | null
        }
        Update: {
          cidade?: string | null
          cliente?: string | null
          data_confirmacao?: string | null
          dias_desde_fat?: never
          dt_faturamento?: string | null
          id?: string | null
          nf_numero?: string | null
          observacao?: string | null
          produto?: string | null
          quantidade?: number | null
          representante?: string | null
          segmento_cliente?: string | null
          status_exposicao?: string | null
          status_treinamento?: string | null
          treinamento_pendente?: never
          urgencia?: never
          valor?: number | null
        }
        Relationships: []
      }
      vw_showroom_resumo_rep: {
        Row: {
          expostos: number | null
          nao_expostos: number | null
          pendentes: number | null
          representante: string | null
          taxa_exposicao_pct: number | null
          total_clientes: number | null
          total_itens: number | null
          treinamentos_pendentes: number | null
          urgentes: number | null
          valor_total: number | null
        }
        Relationships: []
      }
      vw_wallet_share: {
        Row: {
          cliente_id: string | null
          nome_fantasia: string | null
          potencial_estimado: number | null
          segmento: string | null
          sell_in_12m: number | null
          wallet_share_pct: number | null
        }
        Relationships: []
      }
      vw_yoy_mensal: {
        Row: {
          ano: number | null
          mes_nome: string | null
          mes_num: number | null
          sellin_total: number | null
          sellout_total: number | null
          volume_total: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      gerar_cadencia_linkedin: {
        Args: { p_data_inicio?: string; p_opportunity_id: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_finance_lsa_user: { Args: never; Returns: boolean }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user" | "client"
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
      app_role: ["admin", "user", "client"],
    },
  },
} as const
