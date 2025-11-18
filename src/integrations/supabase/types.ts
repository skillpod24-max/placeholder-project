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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action_type: string
          created_at: string | null
          deadline_notified: boolean | null
          entity_id: string
          entity_type: string
          id: string
          is_read: boolean | null
          new_value: string | null
          notes: string | null
          notification_type: string | null
          old_value: string | null
          progress_percentage: number | null
          recipient_id: string | null
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string | null
          deadline_notified?: boolean | null
          entity_id: string
          entity_type: string
          id?: string
          is_read?: boolean | null
          new_value?: string | null
          notes?: string | null
          notification_type?: string | null
          old_value?: string | null
          progress_percentage?: number | null
          recipient_id?: string | null
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string | null
          deadline_notified?: boolean | null
          entity_id?: string
          entity_type?: string
          id?: string
          is_read?: boolean | null
          new_value?: string | null
          notes?: string | null
          notification_type?: string | null
          old_value?: string | null
          progress_percentage?: number | null
          recipient_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          attachment_url: string | null
          created_at: string | null
          id: string
          message: string
          room_id: string
          sender_id: string
          sender_name: string
          sender_role: string
        }
        Insert: {
          attachment_url?: string | null
          created_at?: string | null
          id?: string
          message: string
          room_id: string
          sender_id: string
          sender_name: string
          sender_role: string
        }
        Update: {
          attachment_url?: string | null
          created_at?: string | null
          id?: string
          message?: string
          room_id?: string
          sender_id?: string
          sender_name?: string
          sender_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_participants: {
        Row: {
          id: string
          joined_at: string | null
          last_read_at: string | null
          room_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string | null
          last_read_at?: string | null
          room_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string | null
          last_read_at?: string | null
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_participants_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_rooms: {
        Row: {
          company_id: string
          created_at: string | null
          entity_id: string | null
          entity_type: string
          id: string
          name: string | null
          room_type: string | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          name?: string | null
          room_type?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          name?: string | null
          room_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_rooms_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string
          email: string | null
          id: string
          industry: string | null
          industry_type: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          industry?: string | null
          industry_type?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          industry?: string | null
          industry_type?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          created_by: string
          due_date: string | null
          id: string
          invoice_number: string
          issue_date: string
          items: Json | null
          job_id: string | null
          notes: string | null
          paid_date: string | null
          status: string
          tax: number | null
          total_amount: number
          updated_at: string
          vendor_id: string
        }
        Insert: {
          amount: number
          company_id: string
          created_at?: string
          created_by: string
          due_date?: string | null
          id?: string
          invoice_number: string
          issue_date?: string
          items?: Json | null
          job_id?: string | null
          notes?: string | null
          paid_date?: string | null
          status?: string
          tax?: number | null
          total_amount: number
          updated_at?: string
          vendor_id: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          created_by?: string
          due_date?: string | null
          id?: string
          invoice_number?: string
          issue_date?: string
          items?: Json | null
          job_id?: string | null
          notes?: string | null
          paid_date?: string | null
          status?: string
          tax?: number | null
          total_amount?: number
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      job_activities: {
        Row: {
          activity_type: string
          created_at: string
          description: string
          id: string
          job_id: string
          new_status: Database["public"]["Enums"]["job_status"] | null
          old_status: Database["public"]["Enums"]["job_status"] | null
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          description: string
          id?: string
          job_id: string
          new_status?: Database["public"]["Enums"]["job_status"] | null
          old_status?: Database["public"]["Enums"]["job_status"] | null
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          description?: string
          id?: string
          job_id?: string
          new_status?: Database["public"]["Enums"]["job_status"] | null
          old_status?: Database["public"]["Enums"]["job_status"] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_activities_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_tasks: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          assigned_to_team_id: string | null
          assigned_to_worker_id: string | null
          created_at: string
          custom_fields: Json | null
          daily_updates: Json | null
          deadline: string | null
          description: string | null
          id: string
          job_id: string
          progress_percentage: number | null
          qc_status: string | null
          status: string
          title: string
          updated_at: string
          vendor_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_to_team_id?: string | null
          assigned_to_worker_id?: string | null
          created_at?: string
          custom_fields?: Json | null
          daily_updates?: Json | null
          deadline?: string | null
          description?: string | null
          id?: string
          job_id: string
          progress_percentage?: number | null
          qc_status?: string | null
          status?: string
          title: string
          updated_at?: string
          vendor_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_to_team_id?: string | null
          assigned_to_worker_id?: string | null
          created_at?: string
          custom_fields?: Json | null
          daily_updates?: Json | null
          deadline?: string | null
          description?: string | null
          id?: string
          job_id?: string
          progress_percentage?: number | null
          qc_status?: string | null
          status?: string
          title?: string
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_tasks_assigned_to_team_id_fkey"
            columns: ["assigned_to_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_tasks_assigned_to_worker_id_fkey"
            columns: ["assigned_to_worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_tasks_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_tasks_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          assigned_to_team_id: string | null
          assigned_to_vendor_id: string | null
          assigned_to_worker_id: string | null
          company_id: string
          created_at: string
          created_by: string
          custom_fields: Json | null
          deadline: string | null
          description: string | null
          id: string
          requirements: string | null
          status: Database["public"]["Enums"]["job_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_to_team_id?: string | null
          assigned_to_vendor_id?: string | null
          assigned_to_worker_id?: string | null
          company_id: string
          created_at?: string
          created_by: string
          custom_fields?: Json | null
          deadline?: string | null
          description?: string | null
          id?: string
          requirements?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_to_team_id?: string | null
          assigned_to_vendor_id?: string | null
          assigned_to_worker_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string
          custom_fields?: Json | null
          deadline?: string | null
          description?: string | null
          id?: string
          requirements?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_assigned_to_team_id_fkey"
            columns: ["assigned_to_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_assigned_to_vendor_id_fkey"
            columns: ["assigned_to_vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_assigned_to_worker_id_fkey"
            columns: ["assigned_to_worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      quality_control: {
        Row: {
          checklist: Json | null
          created_at: string
          defects: Json | null
          failed_at: string | null
          id: string
          inspector_id: string
          inspector_name: string
          job_id: string
          job_task_id: string | null
          passed_at: string | null
          rework_notes: string | null
          rework_required: boolean | null
          status: string
          updated_at: string
        }
        Insert: {
          checklist?: Json | null
          created_at?: string
          defects?: Json | null
          failed_at?: string | null
          id?: string
          inspector_id: string
          inspector_name: string
          job_id: string
          job_task_id?: string | null
          passed_at?: string | null
          rework_notes?: string | null
          rework_required?: boolean | null
          status?: string
          updated_at?: string
        }
        Update: {
          checklist?: Json | null
          created_at?: string
          defects?: Json | null
          failed_at?: string | null
          id?: string
          inspector_id?: string
          inspector_name?: string
          job_id?: string
          job_task_id?: string | null
          passed_at?: string | null
          rework_notes?: string | null
          rework_required?: boolean | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quality_control_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quality_control_job_task_id_fkey"
            columns: ["job_task_id"]
            isOneToOne: false
            referencedRelation: "job_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_allocations: {
        Row: {
          allocated_at: string | null
          allocated_by: string
          entity_id: string
          entity_type: string
          id: string
          notes: string | null
          quantity: number | null
          released_at: string | null
          resource_id: string | null
        }
        Insert: {
          allocated_at?: string | null
          allocated_by: string
          entity_id: string
          entity_type: string
          id?: string
          notes?: string | null
          quantity?: number | null
          released_at?: string | null
          resource_id?: string | null
        }
        Update: {
          allocated_at?: string | null
          allocated_by?: string
          entity_id?: string
          entity_type?: string
          id?: string
          notes?: string | null
          quantity?: number | null
          released_at?: string | null
          resource_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resource_allocations_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
        ]
      }
      resources: {
        Row: {
          company_id: string
          created_at: string | null
          custom_fields: Json | null
          id: string
          name: string
          quantity: number | null
          status: string | null
          type: string
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          custom_fields?: Json | null
          id?: string
          name: string
          quantity?: number | null
          status?: string | null
          type: string
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          custom_fields?: Json | null
          id?: string
          name?: string
          quantity?: number | null
          status?: string | null
          type?: string
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resources_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          added_at: string
          added_by: string
          id: string
          role: string | null
          team_id: string
          worker_id: string
        }
        Insert: {
          added_at?: string
          added_by: string
          id?: string
          role?: string | null
          team_id: string
          worker_id: string
        }
        Update: {
          added_at?: string
          added_by?: string
          id?: string
          role?: string | null
          team_id?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      team_tasks: {
        Row: {
          assigned_at: string
          assigned_by: string
          assigned_to_worker_id: string | null
          created_at: string
          daily_updates: Json | null
          deadline: string | null
          description: string | null
          id: string
          job_id: string | null
          job_task_id: string | null
          progress_percentage: number | null
          status: string
          team_id: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_at?: string
          assigned_by: string
          assigned_to_worker_id?: string | null
          created_at?: string
          daily_updates?: Json | null
          deadline?: string | null
          description?: string | null
          id?: string
          job_id?: string | null
          job_task_id?: string | null
          progress_percentage?: number | null
          status?: string
          team_id: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          assigned_to_worker_id?: string | null
          created_at?: string
          daily_updates?: Json | null
          deadline?: string | null
          description?: string | null
          id?: string
          job_id?: string | null
          job_task_id?: string | null
          progress_percentage?: number | null
          status?: string
          team_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_tasks_assigned_to_worker_id_fkey"
            columns: ["assigned_to_worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_tasks_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_tasks_job_task_id_fkey"
            columns: ["job_task_id"]
            isOneToOne: false
            referencedRelation: "job_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_tasks_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          id: string
          name: string
          team_head_id: string | null
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by: string
          id?: string
          name: string
          team_head_id?: string | null
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          team_head_id?: string | null
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_team_head_id_fkey"
            columns: ["team_head_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          company_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_companies: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          vendor_id: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          vendor_id: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_companies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_companies_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          company_id: string
          created_at: string
          email: string
          id: string
          name: string
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          email: string
          id?: string
          name: string
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          email?: string
          id?: string
          name?: string
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendors_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      workers: {
        Row: {
          company_id: string
          created_at: string
          email: string
          id: string
          name: string
          role: string | null
          team_role: string | null
          timezone: string | null
          updated_at: string
          user_id: string
          vendor_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          email: string
          id?: string
          name: string
          role?: string | null
          team_role?: string | null
          timezone?: string | null
          updated_at?: string
          user_id: string
          vendor_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          email?: string
          id?: string
          name?: string
          role?: string | null
          team_role?: string | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workers_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
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
      is_company_admin: {
        Args: { _company_id: string; _user_id?: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "company" | "vendor" | "worker"
      job_status:
        | "draft"
        | "created"
        | "pending"
        | "assigned"
        | "in_progress"
        | "completed"
        | "on_hold"
        | "cancelled"
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
      app_role: ["company", "vendor", "worker"],
      job_status: [
        "draft",
        "created",
        "pending",
        "assigned",
        "in_progress",
        "completed",
        "on_hold",
        "cancelled",
      ],
    },
  },
} as const
