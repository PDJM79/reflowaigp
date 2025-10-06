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
      appraisals: {
        Row: {
          completed_date: string | null
          created_at: string | null
          employee_acknowledged_at: string | null
          employee_id: string
          form_submission_id: string | null
          id: string
          period: string
          reviewer_id: string
          scheduled_date: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          completed_date?: string | null
          created_at?: string | null
          employee_acknowledged_at?: string | null
          employee_id: string
          form_submission_id?: string | null
          id?: string
          period: string
          reviewer_id: string
          scheduled_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          completed_date?: string | null
          created_at?: string | null
          employee_acknowledged_at?: string | null
          employee_id?: string
          form_submission_id?: string | null
          id?: string
          period?: string
          reviewer_id?: string
          scheduled_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appraisals_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appraisals_form_submission_id_fkey"
            columns: ["form_submission_id"]
            isOneToOne: false
            referencedRelation: "form_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appraisals_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
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
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_trail: {
        Row: {
          action: string
          actor_id: string | null
          after_hash: string | null
          at: string | null
          before_hash: string | null
          entity_id: string
          entity_type: string
          id: string
          metadata: Json | null
          practice_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          after_hash?: string | null
          at?: string | null
          before_hash?: string | null
          entity_id: string
          entity_type: string
          id?: string
          metadata?: Json | null
          practice_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          after_hash?: string | null
          at?: string | null
          before_hash?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          metadata?: Json | null
          practice_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_trail_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_trail_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_trail_practice_id_fkey"
            columns: ["practice_id"]
            isOneToOne: false
            referencedRelation: "practices"
            referencedColumns: ["id"]
          },
        ]
      }
      candidates: {
        Row: {
          applied_for: string | null
          created_at: string | null
          cv_evidence_id: string | null
          email: string | null
          id: string
          last_contact_at: string | null
          name: string
          practice_id: string
          retention_delete_at: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          applied_for?: string | null
          created_at?: string | null
          cv_evidence_id?: string | null
          email?: string | null
          id?: string
          last_contact_at?: string | null
          name: string
          practice_id: string
          retention_delete_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          applied_for?: string | null
          created_at?: string | null
          cv_evidence_id?: string | null
          email?: string | null
          id?: string
          last_contact_at?: string | null
          name?: string
          practice_id?: string
          retention_delete_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidates_cv_evidence_id_fkey"
            columns: ["cv_evidence_id"]
            isOneToOne: false
            referencedRelation: "evidence_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidates_practice_id_fkey"
            columns: ["practice_id"]
            isOneToOne: false
            referencedRelation: "practices"
            referencedColumns: ["id"]
          },
        ]
      }
      claim_items: {
        Row: {
          claim_run_id: string
          created_at: string | null
          description: string | null
          evidence_ids: string[] | null
          id: string
          quantity: number
          service_code: string
          total_value: number | null
          unit_value: number | null
        }
        Insert: {
          claim_run_id: string
          created_at?: string | null
          description?: string | null
          evidence_ids?: string[] | null
          id?: string
          quantity: number
          service_code: string
          total_value?: number | null
          unit_value?: number | null
        }
        Update: {
          claim_run_id?: string
          created_at?: string | null
          description?: string | null
          evidence_ids?: string[] | null
          id?: string
          quantity?: number
          service_code?: string
          total_value?: number | null
          unit_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "claim_items_claim_run_id_fkey"
            columns: ["claim_run_id"]
            isOneToOne: false
            referencedRelation: "claim_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      claim_runs: {
        Row: {
          created_at: string | null
          generated_at: string | null
          id: string
          period_end: string
          period_start: string
          practice_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          generated_at?: string | null
          id?: string
          period_end: string
          period_start: string
          practice_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          generated_at?: string | null
          id?: string
          period_end?: string
          period_start?: string
          practice_id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "claim_runs_practice_id_fkey"
            columns: ["practice_id"]
            isOneToOne: false
            referencedRelation: "practices"
            referencedColumns: ["id"]
          },
        ]
      }
      cleaning_logs: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          id: string
          issues: Json | null
          log_date: string
          practice_id: string
          room_id: string
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          id?: string
          issues?: Json | null
          log_date: string
          practice_id: string
          room_id: string
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          id?: string
          issues?: Json | null
          log_date?: string
          practice_id?: string
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cleaning_logs_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cleaning_logs_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "users_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cleaning_logs_practice_id_fkey"
            columns: ["practice_id"]
            isOneToOne: false
            referencedRelation: "practices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cleaning_logs_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      complaints: {
        Row: {
          ack_due: string
          ack_sent_at: string | null
          assigned_to: string | null
          channel: string | null
          created_at: string | null
          description: string
          emis_hash: string | null
          files: string[] | null
          final_due: string
          final_sent_at: string | null
          id: string
          practice_id: string
          received_at: string
          redactions: Json | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          ack_due: string
          ack_sent_at?: string | null
          assigned_to?: string | null
          channel?: string | null
          created_at?: string | null
          description: string
          emis_hash?: string | null
          files?: string[] | null
          final_due: string
          final_sent_at?: string | null
          id?: string
          practice_id: string
          received_at: string
          redactions?: Json | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          ack_due?: string
          ack_sent_at?: string | null
          assigned_to?: string | null
          channel?: string | null
          created_at?: string | null
          description?: string
          emis_hash?: string | null
          files?: string[] | null
          final_due?: string
          final_sent_at?: string | null
          id?: string
          practice_id?: string
          received_at?: string
          redactions?: Json | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "complaints_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complaints_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complaints_practice_id_fkey"
            columns: ["practice_id"]
            isOneToOne: false
            referencedRelation: "practices"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          created_at: string | null
          email: string | null
          end_date: string | null
          id: string
          manager_id: string | null
          name: string
          practice_id: string
          role: Database["public"]["Enums"]["user_role"] | null
          start_date: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          end_date?: string | null
          id?: string
          manager_id?: string | null
          name: string
          practice_id: string
          role?: Database["public"]["Enums"]["user_role"] | null
          start_date?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          end_date?: string | null
          id?: string
          manager_id?: string | null
          name?: string
          practice_id?: string
          role?: Database["public"]["Enums"]["user_role"] | null
          start_date?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_practice_id_fkey"
            columns: ["practice_id"]
            isOneToOne: false
            referencedRelation: "practices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      encrypted_payloads: {
        Row: {
          ciphertext: string
          created_at: string | null
          id: string
          module: string
          period_key: string
          practice_id: string
        }
        Insert: {
          ciphertext: string
          created_at?: string | null
          id?: string
          module: string
          period_key: string
          practice_id: string
        }
        Update: {
          ciphertext?: string
          created_at?: string | null
          id?: string
          module?: string
          period_key?: string
          practice_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "encrypted_payloads_practice_id_fkey"
            columns: ["practice_id"]
            isOneToOne: false
            referencedRelation: "practices"
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
          {
            foreignKeyName: "evidence_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence_v2: {
        Row: {
          created_at: string | null
          created_by: string
          device_timestamp: string | null
          id: string
          latitude: number | null
          link_url: string | null
          location_accuracy: number | null
          longitude: number | null
          mime_type: string | null
          practice_id: string
          server_timestamp: string | null
          sha256: string | null
          sharepoint_item_id: string | null
          size_bytes: number | null
          storage_path: string | null
          submission_id: string | null
          tags: string[] | null
          task_id: string | null
          type: string
        }
        Insert: {
          created_at?: string | null
          created_by: string
          device_timestamp?: string | null
          id?: string
          latitude?: number | null
          link_url?: string | null
          location_accuracy?: number | null
          longitude?: number | null
          mime_type?: string | null
          practice_id: string
          server_timestamp?: string | null
          sha256?: string | null
          sharepoint_item_id?: string | null
          size_bytes?: number | null
          storage_path?: string | null
          submission_id?: string | null
          tags?: string[] | null
          task_id?: string | null
          type: string
        }
        Update: {
          created_at?: string | null
          created_by?: string
          device_timestamp?: string | null
          id?: string
          latitude?: number | null
          link_url?: string | null
          location_accuracy?: number | null
          longitude?: number | null
          mime_type?: string | null
          practice_id?: string
          server_timestamp?: string | null
          sha256?: string | null
          sharepoint_item_id?: string | null
          size_bytes?: number | null
          storage_path?: string | null
          submission_id?: string | null
          tags?: string[] | null
          task_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidence_v2_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_v2_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_v2_practice_id_fkey"
            columns: ["practice_id"]
            isOneToOne: false
            referencedRelation: "practices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_v2_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "form_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_v2_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      form_submissions: {
        Row: {
          created_at: string | null
          current_editors: string[] | null
          data: Json | null
          id: string
          practice_id: string
          signed_off_at: string | null
          signed_off_by: string | null
          status: string | null
          submitted_at: string | null
          task_id: string | null
          template_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_editors?: string[] | null
          data?: Json | null
          id?: string
          practice_id: string
          signed_off_at?: string | null
          signed_off_by?: string | null
          status?: string | null
          submitted_at?: string | null
          task_id?: string | null
          template_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_editors?: string[] | null
          data?: Json | null
          id?: string
          practice_id?: string
          signed_off_at?: string | null
          signed_off_by?: string | null
          status?: string | null
          submitted_at?: string | null
          task_id?: string | null
          template_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_submissions_practice_id_fkey"
            columns: ["practice_id"]
            isOneToOne: false
            referencedRelation: "practices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_signed_off_by_fkey"
            columns: ["signed_off_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_signed_off_by_fkey"
            columns: ["signed_off_by"]
            isOneToOne: false
            referencedRelation: "users_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "form_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      form_templates: {
        Row: {
          created_at: string | null
          id: string
          json_schema: Json
          module: string
          owner_role: Database["public"]["Enums"]["user_role"] | null
          title: string
          ui_schema: Json | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          json_schema: Json
          module: string
          owner_role?: Database["public"]["Enums"]["user_role"] | null
          title: string
          ui_schema?: Json | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          json_schema?: Json
          module?: string
          owner_role?: Database["public"]["Enums"]["user_role"] | null
          title?: string
          ui_schema?: Json | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: []
      }
      fridges: {
        Row: {
          created_at: string | null
          id: string
          location: string | null
          max_temp: number
          min_temp: number
          name: string
          practice_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          location?: string | null
          max_temp: number
          min_temp: number
          name: string
          practice_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          location?: string | null
          max_temp?: number
          min_temp?: number
          name?: string
          practice_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fridges_practice_id_fkey"
            columns: ["practice_id"]
            isOneToOne: false
            referencedRelation: "practices"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_reports: {
        Row: {
          file_hash: string | null
          generated_at: string | null
          id: string
          params: Json | null
          practice_id: string
          report_type: string
          sharepoint_item_id: string | null
          storage_path: string | null
        }
        Insert: {
          file_hash?: string | null
          generated_at?: string | null
          id?: string
          params?: Json | null
          practice_id: string
          report_type: string
          sharepoint_item_id?: string | null
          storage_path?: string | null
        }
        Update: {
          file_hash?: string | null
          generated_at?: string | null
          id?: string
          params?: Json | null
          practice_id?: string
          report_type?: string
          sharepoint_item_id?: string | null
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_reports_practice_id_fkey"
            columns: ["practice_id"]
            isOneToOne: false
            referencedRelation: "practices"
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
      groups: {
        Row: {
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      ic_responses: {
        Row: {
          answer: string | null
          comment: string | null
          created_at: string | null
          evidence_ids: string[] | null
          id: string
          question_id: string
          section_id: string
          submission_id: string
          updated_at: string | null
        }
        Insert: {
          answer?: string | null
          comment?: string | null
          created_at?: string | null
          evidence_ids?: string[] | null
          id?: string
          question_id: string
          section_id: string
          submission_id: string
          updated_at?: string | null
        }
        Update: {
          answer?: string | null
          comment?: string | null
          created_at?: string | null
          evidence_ids?: string[] | null
          id?: string
          question_id?: string
          section_id?: string
          submission_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ic_responses_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "ic_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ic_responses_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "form_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      ic_sections: {
        Row: {
          created_at: string | null
          id: string
          name: string
          order_index: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          order_index: number
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          order_index?: number
        }
        Relationships: []
      }
      incidents: {
        Row: {
          actions: Json | null
          created_at: string | null
          description: string
          id: string
          incident_date: string
          location: string | null
          photos: string[] | null
          practice_id: string
          rag: string
          reported_by: string
          status: string | null
          themes: string[] | null
          updated_at: string | null
        }
        Insert: {
          actions?: Json | null
          created_at?: string | null
          description: string
          id?: string
          incident_date: string
          location?: string | null
          photos?: string[] | null
          practice_id: string
          rag: string
          reported_by: string
          status?: string | null
          themes?: string[] | null
          updated_at?: string | null
        }
        Update: {
          actions?: Json | null
          created_at?: string | null
          description?: string
          id?: string
          incident_date?: string
          location?: string | null
          photos?: string[] | null
          practice_id?: string
          rag?: string
          reported_by?: string
          status?: string | null
          themes?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incidents_practice_id_fkey"
            columns: ["practice_id"]
            isOneToOne: false
            referencedRelation: "practices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "users_safe"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "issues_assigned_to_id_fkey"
            columns: ["assigned_to_id"]
            isOneToOne: false
            referencedRelation: "users_safe"
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
            foreignKeyName: "issues_raised_by_id_fkey"
            columns: ["raised_by_id"]
            isOneToOne: false
            referencedRelation: "users_safe"
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
      leave_policies: {
        Row: {
          annual_days: number
          created_at: string | null
          id: string
          name: string
          practice_id: string
          updated_at: string | null
        }
        Insert: {
          annual_days: number
          created_at?: string | null
          id?: string
          name: string
          practice_id: string
          updated_at?: string | null
        }
        Update: {
          annual_days?: number
          created_at?: string | null
          id?: string
          name?: string
          practice_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leave_policies_practice_id_fkey"
            columns: ["practice_id"]
            isOneToOne: false
            referencedRelation: "practices"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          approved_at: string | null
          approver_id: string | null
          created_at: string | null
          days_count: number
          employee_id: string
          end_date: string
          id: string
          reason: string | null
          start_date: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approver_id?: string | null
          created_at?: string | null
          days_count: number
          employee_id: string
          end_date: string
          id?: string
          reason?: string | null
          start_date: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approver_id?: string | null
          created_at?: string | null
          days_count?: number
          employee_id?: string
          end_date?: string
          id?: string
          reason?: string | null
          start_date?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_requests: {
        Row: {
          assigned_gp_id: string | null
          created_at: string | null
          emis_hash: string | null
          evidence_ids: string[] | null
          id: string
          notes: string | null
          practice_id: string
          received_at: string
          request_type: string
          sent_at: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_gp_id?: string | null
          created_at?: string | null
          emis_hash?: string | null
          evidence_ids?: string[] | null
          id?: string
          notes?: string | null
          practice_id: string
          received_at: string
          request_type: string
          sent_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_gp_id?: string | null
          created_at?: string | null
          emis_hash?: string | null
          evidence_ids?: string[] | null
          id?: string
          notes?: string | null
          practice_id?: string
          received_at?: string
          request_type?: string
          sent_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medical_requests_assigned_gp_id_fkey"
            columns: ["assigned_gp_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_requests_practice_id_fkey"
            columns: ["practice_id"]
            isOneToOne: false
            referencedRelation: "practices"
            referencedColumns: ["id"]
          },
        ]
      }
      month_end_scripts: {
        Row: {
          created_at: string | null
          created_by: string
          drug_code: string
          drug_name: string
          emis_hash: string
          id: string
          issue_date: string
          month: string
          notes: string | null
          practice_id: string
          prescriber: string
          quantity: number
        }
        Insert: {
          created_at?: string | null
          created_by: string
          drug_code: string
          drug_name: string
          emis_hash: string
          id?: string
          issue_date: string
          month: string
          notes?: string | null
          practice_id: string
          prescriber: string
          quantity: number
        }
        Update: {
          created_at?: string | null
          created_by?: string
          drug_code?: string
          drug_name?: string
          emis_hash?: string
          id?: string
          issue_date?: string
          month?: string
          notes?: string | null
          practice_id?: string
          prescriber?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "month_end_scripts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "month_end_scripts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "month_end_scripts_practice_id_fkey"
            columns: ["practice_id"]
            isOneToOne: false
            referencedRelation: "practices"
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
      policy_documents: {
        Row: {
          created_at: string | null
          effective_from: string | null
          id: string
          owner_role: Database["public"]["Enums"]["user_role"] | null
          practice_id: string
          review_due: string | null
          sharepoint_item_id: string | null
          source: string | null
          status: string | null
          storage_path: string | null
          title: string
          updated_at: string | null
          url: string | null
          version: string | null
        }
        Insert: {
          created_at?: string | null
          effective_from?: string | null
          id?: string
          owner_role?: Database["public"]["Enums"]["user_role"] | null
          practice_id: string
          review_due?: string | null
          sharepoint_item_id?: string | null
          source?: string | null
          status?: string | null
          storage_path?: string | null
          title: string
          updated_at?: string | null
          url?: string | null
          version?: string | null
        }
        Update: {
          created_at?: string | null
          effective_from?: string | null
          id?: string
          owner_role?: Database["public"]["Enums"]["user_role"] | null
          practice_id?: string
          review_due?: string | null
          sharepoint_item_id?: string | null
          source?: string | null
          status?: string | null
          storage_path?: string | null
          title?: string
          updated_at?: string | null
          url?: string | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "policy_documents_practice_id_fkey"
            columns: ["practice_id"]
            isOneToOne: false
            referencedRelation: "practices"
            referencedColumns: ["id"]
          },
        ]
      }
      practices: {
        Row: {
          address: string | null
          country: string | null
          created_at: string | null
          group_id: string | null
          id: string
          logo_url: string | null
          name: string
          sharepoint_drive_id: string | null
          sharepoint_root_path: string | null
          sharepoint_site_id: string | null
          theme: Json | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          country?: string | null
          created_at?: string | null
          group_id?: string | null
          id?: string
          logo_url?: string | null
          name: string
          sharepoint_drive_id?: string | null
          sharepoint_root_path?: string | null
          sharepoint_site_id?: string | null
          theme?: Json | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          country?: string | null
          created_at?: string | null
          group_id?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          sharepoint_drive_id?: string | null
          sharepoint_root_path?: string | null
          sharepoint_site_id?: string | null
          theme?: Json | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "practices_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "process_instances_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "users_safe"
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
      rooms: {
        Row: {
          created_at: string | null
          id: string
          name: string
          practice_id: string
          schedule_rule: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          practice_id: string
          schedule_rule?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          practice_id?: string
          schedule_rule?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rooms_practice_id_fkey"
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
      task_templates: {
        Row: {
          allowed_roles: Database["public"]["Enums"]["user_role"][] | null
          created_at: string | null
          default_assignee_role: Database["public"]["Enums"]["user_role"] | null
          description: string | null
          due_rule: string | null
          evidence_tags: string[] | null
          id: string
          json_schema: Json | null
          module: string
          practice_id: string | null
          requires_photo: boolean | null
          sla_type: string | null
          title: string
          ui_schema: Json | null
          updated_at: string | null
        }
        Insert: {
          allowed_roles?: Database["public"]["Enums"]["user_role"][] | null
          created_at?: string | null
          default_assignee_role?:
            | Database["public"]["Enums"]["user_role"]
            | null
          description?: string | null
          due_rule?: string | null
          evidence_tags?: string[] | null
          id?: string
          json_schema?: Json | null
          module: string
          practice_id?: string | null
          requires_photo?: boolean | null
          sla_type?: string | null
          title: string
          ui_schema?: Json | null
          updated_at?: string | null
        }
        Update: {
          allowed_roles?: Database["public"]["Enums"]["user_role"][] | null
          created_at?: string | null
          default_assignee_role?:
            | Database["public"]["Enums"]["user_role"]
            | null
          description?: string | null
          due_rule?: string | null
          evidence_tags?: string[] | null
          id?: string
          json_schema?: Json | null
          module?: string
          practice_id?: string | null
          requires_photo?: boolean | null
          sla_type?: string | null
          title?: string
          ui_schema?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_templates_practice_id_fkey"
            columns: ["practice_id"]
            isOneToOne: false
            referencedRelation: "practices"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to_role: Database["public"]["Enums"]["user_role"] | null
          assigned_to_user_id: string | null
          completed_at: string | null
          completion_time_seconds: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_at: string
          id: string
          module: string
          practice_id: string
          priority: string | null
          requires_photo: boolean | null
          return_notes: string | null
          returned_by: string | null
          returned_reason: string | null
          scheduled_at: string | null
          status: string | null
          template_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to_role?: Database["public"]["Enums"]["user_role"] | null
          assigned_to_user_id?: string | null
          completed_at?: string | null
          completion_time_seconds?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_at: string
          id?: string
          module: string
          practice_id: string
          priority?: string | null
          requires_photo?: boolean | null
          return_notes?: string | null
          returned_by?: string | null
          returned_reason?: string | null
          scheduled_at?: string | null
          status?: string | null
          template_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to_role?: Database["public"]["Enums"]["user_role"] | null
          assigned_to_user_id?: string | null
          completed_at?: string | null
          completion_time_seconds?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_at?: string
          id?: string
          module?: string
          practice_id?: string
          priority?: string | null
          requires_photo?: boolean | null
          return_notes?: string | null
          returned_by?: string | null
          returned_reason?: string | null
          scheduled_at?: string | null
          status?: string | null
          template_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_user_id_fkey"
            columns: ["assigned_to_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assigned_to_user_id_fkey"
            columns: ["assigned_to_user_id"]
            isOneToOne: false
            referencedRelation: "users_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_practice_id_fkey"
            columns: ["practice_id"]
            isOneToOne: false
            referencedRelation: "practices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_returned_by_fkey"
            columns: ["returned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_returned_by_fkey"
            columns: ["returned_by"]
            isOneToOne: false
            referencedRelation: "users_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "task_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      temp_logs: {
        Row: {
          breach_flag: boolean | null
          created_at: string | null
          fridge_id: string
          id: string
          log_date: string
          log_time: string
          outcome: string | null
          reading: number
          recorded_by: string
          remedial_action: string | null
        }
        Insert: {
          breach_flag?: boolean | null
          created_at?: string | null
          fridge_id: string
          id?: string
          log_date: string
          log_time: string
          outcome?: string | null
          reading: number
          recorded_by: string
          remedial_action?: string | null
        }
        Update: {
          breach_flag?: boolean | null
          created_at?: string | null
          fridge_id?: string
          id?: string
          log_date?: string
          log_time?: string
          outcome?: string | null
          reading?: number
          recorded_by?: string
          remedial_action?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "temp_logs_fridge_id_fkey"
            columns: ["fridge_id"]
            isOneToOne: false
            referencedRelation: "fridges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "temp_logs_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "temp_logs_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "users_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      training_records: {
        Row: {
          certificate_evidence_id: string | null
          completion_date: string
          course_name: string
          created_at: string | null
          employee_id: string
          expiry_date: string | null
          id: string
        }
        Insert: {
          certificate_evidence_id?: string | null
          completion_date: string
          course_name: string
          created_at?: string | null
          employee_id: string
          expiry_date?: string | null
          id?: string
        }
        Update: {
          certificate_evidence_id?: string | null
          completion_date?: string
          course_name?: string
          created_at?: string | null
          employee_id?: string
          expiry_date?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_records_certificate_evidence_id_fkey"
            columns: ["certificate_evidence_id"]
            isOneToOne: false
            referencedRelation: "evidence_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
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
          mfa_enabled: boolean | null
          mfa_secret: string | null
          name: string
          phone_number: string | null
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
          mfa_enabled?: boolean | null
          mfa_secret?: string | null
          name: string
          phone_number?: string | null
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
          mfa_enabled?: boolean | null
          mfa_secret?: string | null
          name?: string
          phone_number?: string | null
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
      users_safe: {
        Row: {
          auth_user_id: string | null
          created_at: string | null
          email: string | null
          id: string | null
          is_active: boolean | null
          is_master_user: boolean | null
          is_practice_manager: boolean | null
          mfa_enabled: boolean | null
          name: string | null
          phone_number: string | null
          practice_id: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          updated_at: string | null
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: string | null
          is_active?: boolean | null
          is_master_user?: boolean | null
          is_practice_manager?: boolean | null
          mfa_enabled?: boolean | null
          name?: string | null
          phone_number?: never
          practice_id?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: string | null
          is_active?: boolean | null
          is_master_user?: boolean | null
          is_practice_manager?: boolean | null
          mfa_enabled?: boolean | null
          name?: string | null
          phone_number?: never
          practice_id?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
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
    Functions: {
      get_current_user_practice_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_user_practice_id: {
        Args: { user_id: string }
        Returns: string
      }
      get_user_profile: {
        Args: { user_id: string }
        Returns: {
          auth_user_id: string
          created_at: string
          email: string
          id: string
          is_active: boolean
          is_master_user: boolean
          is_practice_manager: boolean
          mfa_enabled: boolean
          name: string
          phone_number: string
          practice_id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }[]
      }
      is_current_user_master: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_current_user_practice_manager: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_group_manager: {
        Args: { user_id: string }
        Returns: boolean
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
        | "group_manager"
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
        "group_manager",
      ],
    },
  },
} as const
