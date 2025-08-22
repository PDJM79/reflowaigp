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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          after_data: Json | null
          before_data: Json | null
          created_at: string | null
          entity_id: string
          entity_type: string
          id: string
          practice_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          practice_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          practice_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_practice_id_fkey"
            columns: ["practice_id"]
            isOneToOne: false
            referencedRelation: "practices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence: {
        Row: {
          created_at: string | null
          exif_data: Json | null
          height: number | null
          id: string
          mime_type: string | null
          step_instance_id: string
          storage_path: string
          type: Database["public"]["Enums"]["evidence_type"]
          user_id: string
          width: number | null
        }
        Insert: {
          created_at?: string | null
          exif_data?: Json | null
          height?: number | null
          id?: string
          mime_type?: string | null
          step_instance_id: string
          storage_path: string
          type: Database["public"]["Enums"]["evidence_type"]
          user_id: string
          width?: number | null
        }
        Update: {
          created_at?: string | null
          exif_data?: Json | null
          height?: number | null
          id?: string
          mime_type?: string | null
          step_instance_id?: string
          storage_path?: string
          type?: Database["public"]["Enums"]["evidence_type"]
          user_id?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "evidence_step_instance_id_fkey"
            columns: ["step_instance_id"]
            isOneToOne: false
            referencedRelation: "step_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      GP: {
        Row: {
          "Evidence required": string | null
          Frequency: string | null
          Process: string | null
          "Responsible role": string | null
          "Row type": string
          "Step 1": string | null
          "Step 2": string | null
          "Step 3": string | null
          "Step 4": string | null
          "Step 5": string | null
          "Step 6": string | null
          "Where evidence is stored – Folder/Path or URL": string | null
          "Where evidence is stored – Physical location (if any)": string | null
          "Where evidence is stored – System/Source": string | null
        }
        Insert: {
          "Evidence required"?: string | null
          Frequency?: string | null
          Process?: string | null
          "Responsible role"?: string | null
          "Row type": string
          "Step 1"?: string | null
          "Step 2"?: string | null
          "Step 3"?: string | null
          "Step 4"?: string | null
          "Step 5"?: string | null
          "Step 6"?: string | null
          "Where evidence is stored – Folder/Path or URL"?: string | null
          "Where evidence is stored – Physical location (if any)"?:
            | string
            | null
          "Where evidence is stored – System/Source"?: string | null
        }
        Update: {
          "Evidence required"?: string | null
          Frequency?: string | null
          Process?: string | null
          "Responsible role"?: string | null
          "Row type"?: string
          "Step 1"?: string | null
          "Step 2"?: string | null
          "Step 3"?: string | null
          "Step 4"?: string | null
          "Step 5"?: string | null
          "Step 6"?: string | null
          "Where evidence is stored – Folder/Path or URL"?: string | null
          "Where evidence is stored – Physical location (if any)"?:
            | string
            | null
          "Where evidence is stored – System/Source"?: string | null
        }
        Relationships: []
      }
      "GP tasks": {
        Row: {
          created_at: string
          id: number
        }
        Insert: {
          created_at?: string
          id?: number
        }
        Update: {
          created_at?: string
          id?: number
        }
        Relationships: []
      }
      issues: {
        Row: {
          assigned_to_id: string | null
          created_at: string | null
          details: string | null
          id: string
          process_instance_id: string
          raised_by_id: string
          resolved_at: string | null
          sla_due_at: string | null
          status: Database["public"]["Enums"]["issue_status"] | null
          step_instance_id: string | null
          summary: string
        }
        Insert: {
          assigned_to_id?: string | null
          created_at?: string | null
          details?: string | null
          id?: string
          process_instance_id: string
          raised_by_id: string
          resolved_at?: string | null
          sla_due_at?: string | null
          status?: Database["public"]["Enums"]["issue_status"] | null
          step_instance_id?: string | null
          summary: string
        }
        Update: {
          assigned_to_id?: string | null
          created_at?: string | null
          details?: string | null
          id?: string
          process_instance_id?: string
          raised_by_id?: string
          resolved_at?: string | null
          sla_due_at?: string | null
          status?: Database["public"]["Enums"]["issue_status"] | null
          step_instance_id?: string | null
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "issues_assigned_to_id_fkey"
            columns: ["assigned_to_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_process_instance_id_fkey"
            columns: ["process_instance_id"]
            isOneToOne: false
            referencedRelation: "process_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_raised_by_id_fkey"
            columns: ["raised_by_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_step_instance_id_fkey"
            columns: ["step_instance_id"]
            isOneToOne: false
            referencedRelation: "step_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_setup: {
        Row: {
          created_at: string
          id: string
          practice_id: string
          setup_completed: boolean | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          practice_id: string
          setup_completed?: boolean | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          practice_id?: string
          setup_completed?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_setup_practice_id_fkey"
            columns: ["practice_id"]
            isOneToOne: false
            referencedRelation: "practices"
            referencedColumns: ["id"]
          },
        ]
      }
      practices: {
        Row: {
          created_at: string | null
          id: string
          logo_url: string | null
          name: string
          theme: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name: string
          theme?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          theme?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      process_instances: {
        Row: {
          assignee_id: string | null
          completed_at: string | null
          created_at: string | null
          due_at: string
          id: string
          period_end: string
          period_start: string
          practice_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["process_status"] | null
          template_id: string
          updated_at: string | null
        }
        Insert: {
          assignee_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          due_at: string
          id?: string
          period_end: string
          period_start: string
          practice_id: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["process_status"] | null
          template_id: string
          updated_at?: string | null
        }
        Update: {
          assignee_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          due_at?: string
          id?: string
          period_end?: string
          period_start?: string
          practice_id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["process_status"] | null
          template_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "process_instances_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_instances_practice_id_fkey"
            columns: ["practice_id"]
            isOneToOne: false
            referencedRelation: "practices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_instances_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "process_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      process_templates: {
        Row: {
          active: boolean | null
          created_at: string | null
          evidence_hint: string | null
          frequency: Database["public"]["Enums"]["process_frequency"]
          id: string
          name: string
          practice_id: string
          remedials: Json
          responsible_role: Database["public"]["Enums"]["user_role"]
          steps: Json
          storage_hints: Json | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          evidence_hint?: string | null
          frequency: Database["public"]["Enums"]["process_frequency"]
          id?: string
          name: string
          practice_id: string
          remedials?: Json
          responsible_role: Database["public"]["Enums"]["user_role"]
          steps?: Json
          storage_hints?: Json | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          evidence_hint?: string | null
          frequency?: Database["public"]["Enums"]["process_frequency"]
          id?: string
          name?: string
          practice_id?: string
          remedials?: Json
          responsible_role?: Database["public"]["Enums"]["user_role"]
          steps?: Json
          storage_hints?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "process_templates_practice_id_fkey"
            columns: ["practice_id"]
            isOneToOne: false
            referencedRelation: "practices"
            referencedColumns: ["id"]
          },
        ]
      }
      role_assignments: {
        Row: {
          assigned_email: string
          assigned_name: string
          created_at: string
          id: string
          practice_id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          assigned_email: string
          assigned_name: string
          created_at?: string
          id?: string
          practice_id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          assigned_email?: string
          assigned_name?: string
          created_at?: string
          id?: string
          practice_id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_assignments_practice_id_fkey"
            columns: ["practice_id"]
            isOneToOne: false
            referencedRelation: "practices"
            referencedColumns: ["id"]
          },
        ]
      }
      step_instances: {
        Row: {
          created_at: string | null
          device_timestamp: string | null
          id: string
          latitude: number | null
          longitude: number | null
          notes: string | null
          process_instance_id: string
          server_timestamp: string | null
          status: Database["public"]["Enums"]["step_status"] | null
          step_index: number
          three_words: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          device_timestamp?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          process_instance_id: string
          server_timestamp?: string | null
          status?: Database["public"]["Enums"]["step_status"] | null
          step_index: number
          three_words?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          device_timestamp?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          process_instance_id?: string
          server_timestamp?: string | null
          status?: Database["public"]["Enums"]["step_status"] | null
          step_index?: number
          three_words?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "step_instances_process_instance_id_fkey"
            columns: ["process_instance_id"]
            isOneToOne: false
            referencedRelation: "process_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          auth_user_id: string | null
          created_at: string | null
          email: string
          id: string
          is_active: boolean | null
          is_master_user: boolean | null
          is_practice_manager: boolean | null
          name: string
          practice_id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          is_master_user?: boolean | null
          is_practice_manager?: boolean | null
          name: string
          practice_id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          is_master_user?: boolean | null
          is_practice_manager?: boolean | null
          name?: string
          practice_id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_practice_id_fkey"
            columns: ["practice_id"]
            isOneToOne: false
            referencedRelation: "practices"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_practice_id: {
        Args: { user_id: string }
        Returns: string
      }
      is_master_user: {
        Args: { user_id: string }
        Returns: boolean
      }
      is_practice_manager: {
        Args: { user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      evidence_type: "photo" | "note" | "signature"
      frequency:
        | "daily"
        | "weekly"
        | "monthly"
        | "quarterly"
        | "annually"
        | "as_needed"
      issue_status: "open" | "in_progress" | "resolved"
      process_frequency:
        | "daily"
        | "weekly"
        | "monthly"
        | "quarterly"
        | "six_monthly"
        | "annual"
      process_status: "pending" | "in_progress" | "complete" | "blocked"
      responsible_role:
        | "practice_manager"
        | "nurse"
        | "doctor"
        | "admin_staff"
        | "receptionist"
      step_status: "pending" | "complete" | "not_complete"
      user_role:
        | "practice_manager"
        | "nurse_lead"
        | "cd_lead_gp"
        | "estates_lead"
        | "ig_lead"
        | "reception_lead"
        | "nurse"
        | "hca"
        | "gp"
        | "reception"
        | "auditor"
        | "administrator"
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
      evidence_type: ["photo", "note", "signature"],
      frequency: [
        "daily",
        "weekly",
        "monthly",
        "quarterly",
        "annually",
        "as_needed",
      ],
      issue_status: ["open", "in_progress", "resolved"],
      process_frequency: [
        "daily",
        "weekly",
        "monthly",
        "quarterly",
        "six_monthly",
        "annual",
      ],
      process_status: ["pending", "in_progress", "complete", "blocked"],
      responsible_role: [
        "practice_manager",
        "nurse",
        "doctor",
        "admin_staff",
        "receptionist",
      ],
      step_status: ["pending", "complete", "not_complete"],
      user_role: [
        "practice_manager",
        "nurse_lead",
        "cd_lead_gp",
        "estates_lead",
        "ig_lead",
        "reception_lead",
        "nurse",
        "hca",
        "gp",
        "reception",
        "auditor",
        "administrator",
      ],
    },
  },
} as const
