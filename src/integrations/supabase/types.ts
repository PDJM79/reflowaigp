export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5";
  };
  public: {
    Tables: {
      appraisals: {
        Row: {
          completed_date: string | null;
          created_at: string | null;
          employee_acknowledged_at: string | null;
          employee_id: string;
          form_submission_id: string | null;
          id: string;
          period: string;
          reviewer_id: string;
          scheduled_date: string | null;
          status: string | null;
          updated_at: string | null;
        };
        Insert: {
          completed_date?: string | null;
          created_at?: string | null;
          employee_acknowledged_at?: string | null;
          employee_id: string;
          form_submission_id?: string | null;
          id?: string;
          period: string;
          reviewer_id: string;
          scheduled_date?: string | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Update: {
          completed_date?: string | null;
          created_at?: string | null;
          employee_acknowledged_at?: string | null;
          employee_id?: string;
          form_submission_id?: string | null;
          id?: string;
          period?: string;
          reviewer_id?: string;
          scheduled_date?: string | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "appraisals_employee_id_fkey";
            columns: ["employee_id"];
            isOneToOne: false;
            referencedRelation: "employee_self_service_data";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "appraisals_employee_id_fkey";
            columns: ["employee_id"];
            isOneToOne: false;
            referencedRelation: "employees";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "appraisals_form_submission_id_fkey";
            columns: ["form_submission_id"];
            isOneToOne: false;
            referencedRelation: "form_submissions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "appraisals_reviewer_id_fkey";
            columns: ["reviewer_id"];
            isOneToOne: false;
            referencedRelation: "employee_self_service_data";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "appraisals_reviewer_id_fkey";
            columns: ["reviewer_id"];
            isOneToOne: false;
            referencedRelation: "employees";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_logs: {
        Row: {
          action: string;
          after_data: Json | null;
          before_data: Json | null;
          created_at: string | null;
          entity_id: string;
          entity_type: string;
          id: string;
          practice_id: string;
          user_id: string | null;
        };
        Insert: {
          action: string;
          after_data?: Json | null;
          before_data?: Json | null;
          created_at?: string | null;
          entity_id: string;
          entity_type: string;
          id?: string;
          practice_id: string;
          user_id?: string | null;
        };
        Update: {
          action?: string;
          after_data?: Json | null;
          before_data?: Json | null;
          created_at?: string | null;
          entity_id?: string;
          entity_type?: string;
          id?: string;
          practice_id?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "audit_logs_practice_id_fkey";
            columns: ["practice_id"];
            isOneToOne: false;
            referencedRelation: "practices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_trail: {
        Row: {
          action: string;
          actor_id: string | null;
          after_hash: string | null;
          at: string | null;
          before_hash: string | null;
          entity_id: string;
          entity_type: string;
          id: string;
          metadata: Json | null;
          practice_id: string | null;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          after_hash?: string | null;
          at?: string | null;
          before_hash?: string | null;
          entity_id: string;
          entity_type: string;
          id?: string;
          metadata?: Json | null;
          practice_id?: string | null;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          after_hash?: string | null;
          at?: string | null;
          before_hash?: string | null;
          entity_id?: string;
          entity_type?: string;
          id?: string;
          metadata?: Json | null;
          practice_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "audit_trail_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "audit_trail_practice_id_fkey";
            columns: ["practice_id"];
            isOneToOne: false;
            referencedRelation: "practices";
            referencedColumns: ["id"];
          },
        ];
      };
      candidate_contact_details: {
        Row: {
          candidate_id: string;
          created_at: string;
          email: string | null;
          phone_number: string | null;
          updated_at: string;
        };
        Insert: {
          candidate_id: string;
          created_at?: string;
          email?: string | null;
          phone_number?: string | null;
          updated_at?: string;
        };
        Update: {
          candidate_id?: string;
          created_at?: string;
          email?: string | null;
          phone_number?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "candidate_contact_details_candidate_id_fkey";
            columns: ["candidate_id"];
            isOneToOne: true;
            referencedRelation: "candidates";
            referencedColumns: ["id"];
          },
        ];
      };
      candidates: {
        Row: {
          applied_for: string | null;
          created_at: string | null;
          cv_evidence_id: string | null;
          id: string;
          last_contact_at: string | null;
          name: string;
          practice_id: string;
          retention_delete_at: string | null;
          status: string | null;
          updated_at: string | null;
        };
        Insert: {
          applied_for?: string | null;
          created_at?: string | null;
          cv_evidence_id?: string | null;
          id?: string;
          last_contact_at?: string | null;
          name: string;
          practice_id: string;
          retention_delete_at?: string | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Update: {
          applied_for?: string | null;
          created_at?: string | null;
          cv_evidence_id?: string | null;
          id?: string;
          last_contact_at?: string | null;
          name?: string;
          practice_id?: string;
          retention_delete_at?: string | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "candidates_cv_evidence_id_fkey";
            columns: ["cv_evidence_id"];
            isOneToOne: false;
            referencedRelation: "evidence_v2";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "candidates_practice_id_fkey";
            columns: ["practice_id"];
            isOneToOne: false;
            referencedRelation: "practices";
            referencedColumns: ["id"];
          },
        ];
      };
      claim_items: {
        Row: {
          claim_run_id: string;
          created_at: string | null;
          description: string | null;
          evidence_ids: string[] | null;
          id: string;
          quantity: number;
          service_code: string;
          total_value: number | null;
          unit_value: number | null;
        };
        Insert: {
          claim_run_id: string;
          created_at?: string | null;
          description?: string | null;
          evidence_ids?: string[] | null;
          id?: string;
          quantity: number;
          service_code: string;
          total_value?: number | null;
          unit_value?: number | null;
        };
        Update: {
          claim_run_id?: string;
          created_at?: string | null;
          description?: string | null;
          evidence_ids?: string[] | null;
          id?: string;
          quantity?: number;
          service_code?: string;
          total_value?: number | null;
          unit_value?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "claim_items_claim_run_id_fkey";
            columns: ["claim_run_id"];
            isOneToOne: false;
            referencedRelation: "claim_runs";
            referencedColumns: ["id"];
          },
        ];
      };
      claim_review_logs: {
        Row: {
          checklist: Json;
          claim_run_id: string;
          id: string;
          notes: string | null;
          reviewed_at: string | null;
          reviewed_by: string;
        };
        Insert: {
          checklist: Json;
          claim_run_id: string;
          id?: string;
          notes?: string | null;
          reviewed_at?: string | null;
          reviewed_by: string;
        };
        Update: {
          checklist?: Json;
          claim_run_id?: string;
          id?: string;
          notes?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: "claim_review_logs_claim_run_id_fkey";
            columns: ["claim_run_id"];
            isOneToOne: false;
            referencedRelation: "script_claim_runs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "claim_review_logs_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      claim_runs: {
        Row: {
          claim_type: string | null;
          created_at: string | null;
          fpps_reference: string | null;
          fpps_submission_status: string | null;
          fpps_submitted_at: string | null;
          generated_at: string | null;
          id: string;
          pdf_storage_path: string | null;
          period_end: string;
          period_start: string;
          ppv_audit_date: string | null;
          ppv_audit_notes: string | null;
          ppv_audit_status: string | null;
          practice_id: string;
          status: string | null;
          submitted_at: string | null;
          submitted_by: string | null;
          total_items: number | null;
          total_scripts: number | null;
          updated_at: string | null;
        };
        Insert: {
          claim_type?: string | null;
          created_at?: string | null;
          fpps_reference?: string | null;
          fpps_submission_status?: string | null;
          fpps_submitted_at?: string | null;
          generated_at?: string | null;
          id?: string;
          pdf_storage_path?: string | null;
          period_end: string;
          period_start: string;
          ppv_audit_date?: string | null;
          ppv_audit_notes?: string | null;
          ppv_audit_status?: string | null;
          practice_id: string;
          status?: string | null;
          submitted_at?: string | null;
          submitted_by?: string | null;
          total_items?: number | null;
          total_scripts?: number | null;
          updated_at?: string | null;
        };
        Update: {
          claim_type?: string | null;
          created_at?: string | null;
          fpps_reference?: string | null;
          fpps_submission_status?: string | null;
          fpps_submitted_at?: string | null;
          generated_at?: string | null;
          id?: string;
          pdf_storage_path?: string | null;
          period_end?: string;
          period_start?: string;
          ppv_audit_date?: string | null;
          ppv_audit_notes?: string | null;
          ppv_audit_status?: string | null;
          practice_id?: string;
          status?: string | null;
          submitted_at?: string | null;
          submitted_by?: string | null;
          total_items?: number | null;
          total_scripts?: number | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "claim_runs_practice_id_fkey";
            columns: ["practice_id"];
            isOneToOne: false;
            referencedRelation: "practices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "claim_runs_submitted_by_fkey";
            columns: ["submitted_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      cleaning_logs: {
        Row: {
          completed_at: string | null;
          completed_by: string | null;
          created_at: string | null;
          id: string;
          initials: string | null;
          issues: Json | null;
          log_date: string;
          practice_id: string;
          retained_until: string | null;
          room_id: string;
          task_id: string | null;
        };
        Insert: {
          completed_at?: string | null;
          completed_by?: string | null;
          created_at?: string | null;
          id?: string;
          initials?: string | null;
          issues?: Json | null;
          log_date: string;
          practice_id: string;
          retained_until?: string | null;
          room_id: string;
          task_id?: string | null;
        };
        Update: {
          completed_at?: string | null;
          completed_by?: string | null;
          created_at?: string | null;
          id?: string;
          initials?: string | null;
          issues?: Json | null;
          log_date?: string;
          practice_id?: string;
          retained_until?: string | null;
          room_id?: string;
          task_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "cleaning_logs_completed_by_fkey";
            columns: ["completed_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cleaning_logs_practice_id_fkey";
            columns: ["practice_id"];
            isOneToOne: false;
            referencedRelation: "practices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cleaning_logs_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cleaning_logs_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "cleaning_tasks";
            referencedColumns: ["id"];
          },
        ];
      };
      cleaning_tasks: {
        Row: {
          created_at: string | null;
          description: string | null;
          frequency: Database["public"]["Enums"]["clean_frequency"];
          id: string;
          is_active: boolean | null;
          periodic_rule: string | null;
          practice_id: string;
          task_name: string;
          updated_at: string | null;
          zone_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          description?: string | null;
          frequency: Database["public"]["Enums"]["clean_frequency"];
          id?: string;
          is_active?: boolean | null;
          periodic_rule?: string | null;
          practice_id: string;
          task_name: string;
          updated_at?: string | null;
          zone_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          description?: string | null;
          frequency?: Database["public"]["Enums"]["clean_frequency"];
          id?: string;
          is_active?: boolean | null;
          periodic_rule?: string | null;
          practice_id?: string;
          task_name?: string;
          updated_at?: string | null;
          zone_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "cleaning_tasks_practice_id_fkey";
            columns: ["practice_id"];
            isOneToOne: false;
            referencedRelation: "practices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cleaning_tasks_zone_id_fkey";
            columns: ["zone_id"];
            isOneToOne: false;
            referencedRelation: "cleaning_zones";
            referencedColumns: ["id"];
          },
        ];
      };
      cleaning_zones: {
        Row: {
          created_at: string | null;
          description: string | null;
          id: string;
          is_active: boolean | null;
          practice_id: string;
          updated_at: string | null;
          zone_name: string;
          zone_type: string | null;
        };
        Insert: {
          created_at?: string | null;
          description?: string | null;
          id?: string;
          is_active?: boolean | null;
          practice_id: string;
          updated_at?: string | null;
          zone_name: string;
          zone_type?: string | null;
        };
        Update: {
          created_at?: string | null;
          description?: string | null;
          id?: string;
          is_active?: boolean | null;
          practice_id?: string;
          updated_at?: string | null;
          zone_name?: string;
          zone_type?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "cleaning_zones_practice_id_fkey";
            columns: ["practice_id"];
            isOneToOne: false;
            referencedRelation: "practices";
            referencedColumns: ["id"];
          },
        ];
      };
      complaints: {
        Row: {
          ack_due: string;
          ack_sent_at: string | null;
          assigned_to: string | null;
          channel: string | null;
          created_at: string | null;
          description: string;
          emis_hash: string | null;
          files: string[] | null;
          final_due: string;
          final_sent_at: string | null;
          id: string;
          practice_id: string;
          received_at: string;
          redactions: Json | null;
          status: string | null;
          updated_at: string | null;
        };
        Insert: {
          ack_due: string;
          ack_sent_at?: string | null;
          assigned_to?: string | null;
          channel?: string | null;
          created_at?: string | null;
          description: string;
          emis_hash?: string | null;
          files?: string[] | null;
          final_due: string;
          final_sent_at?: string | null;
          id?: string;
          practice_id: string;
          received_at: string;
          redactions?: Json | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Update: {
          ack_due?: string;
          ack_sent_at?: string | null;
          assigned_to?: string | null;
          channel?: string | null;
          created_at?: string | null;
          description?: string;
          emis_hash?: string | null;
          files?: string[] | null;
          final_due?: string;
          final_sent_at?: string | null;
          id?: string;
          practice_id?: string;
          received_at?: string;
          redactions?: Json | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "complaints_assigned_to_fkey";
            columns: ["assigned_to"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "complaints_practice_id_fkey";
            columns: ["practice_id"];
            isOneToOne: false;
            referencedRelation: "practices";
            referencedColumns: ["id"];
          },
        ];
      };
      compliance_status: {
        Row: {
          assessed_by: string | null;
          created_at: string | null;
          evidence_count: number | null;
          framework_id: string;
          id: string;
          last_assessed_at: string | null;
          notes: string | null;
          practice_id: string;
          rag_status: string | null;
          score: number | null;
          standard_id: string;
          status: string;
          updated_at: string | null;
        };
        Insert: {
          assessed_by?: string | null;
          created_at?: string | null;
          evidence_count?: number | null;
          framework_id: string;
          id?: string;
          last_assessed_at?: string | null;
          notes?: string | null;
          practice_id: string;
          rag_status?: string | null;
          score?: number | null;
          standard_id: string;
          status?: string;
          updated_at?: string | null;
        };
        Update: {
          assessed_by?: string | null;
          created_at?: string | null;
          evidence_count?: number | null;
          framework_id?: string;
          id?: string;
          last_assessed_at?: string | null;
          notes?: string | null;
          practice_id?: string;
          rag_status?: string | null;
          score?: number | null;
          standard_id?: string;
          status?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "compliance_status_assessed_by_fkey";
            columns: ["assessed_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "compliance_status_framework_id_fkey";
            columns: ["framework_id"];
            isOneToOne: false;
            referencedRelation: "regulatory_frameworks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "compliance_status_practice_id_fkey";
            columns: ["practice_id"];
            isOneToOne: false;
            referencedRelation: "practices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "compliance_status_standard_id_fkey";
            columns: ["standard_id"];
            isOneToOne: false;
            referencedRelation: "regulatory_standards";
            referencedColumns: ["id"];
          },
        ];
      };
      coshh_assessments: {
        Row: {
          created_at: string | null;
          emergency_controls: Json | null;
          hazard_flags: Json | null;
          hazard_sheet_url: string | null;
          id: string;
          manufacturer: string | null;
          next_review_date: string | null;
          ppe: Json | null;
          practice_id: string;
          risk_level: string | null;
          routes: Json | null;
          substance_name: string;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          emergency_controls?: Json | null;
          hazard_flags?: Json | null;
          hazard_sheet_url?: string | null;
          id?: string;
          manufacturer?: string | null;
          next_review_date?: string | null;
          ppe?: Json | null;
          practice_id: string;
          risk_level?: string | null;
          routes?: Json | null;
          substance_name: string;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          emergency_controls?: Json | null;
          hazard_flags?: Json | null;
          hazard_sheet_url?: string | null;
          id?: string;
          manufacturer?: string | null;
          next_review_date?: string | null;
          ppe?: Json | null;
          practice_id?: string;
          risk_level?: string | null;
          routes?: Json | null;
          substance_name?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "coshh_assessments_practice_id_fkey";
            columns: ["practice_id"];
            isOneToOne: false;
            referencedRelation: "practices";
            referencedColumns: ["id"];
          },
        ];
      };
      country_profile_settings: {
        Row: {
          country: Database["public"]["Enums"]["country_code"];
          created_at: string | null;
          id: string;
          overrides_json: Json;
          updated_at: string | null;
        };
        Insert: {
          country: Database["public"]["Enums"]["country_code"];
          created_at?: string | null;
          id?: string;
          overrides_json?: Json;
          updated_at?: string | null;
        };
        Update: {
          country?: Database["public"]["Enums"]["country_code"];
          created_at?: string | null;
          id?: string;
          overrides_json?: Json;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      dbs_checks: {
        Row: {
          certificate_number: string | null;
          check_date: string;
          created_at: string | null;
          employee_id: string;
          evidence_id: string | null;
          id: string;
          next_review_due: string | null;
          practice_id: string;
          reminder_sent_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          certificate_number?: string | null;
          check_date: string;
          created_at?: string | null;
          employee_id: string;
          evidence_id?: string | null;
          id?: string;
          next_review_due?: string | null;
          practice_id: string;
          reminder_sent_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          certificate_number?: string | null;
          check_date?: string;
          created_at?: string | null;
          employee_id?: string;
          evidence_id?: string | null;
          id?: string;
          next_review_due?: string | null;
          practice_id?: string;
          reminder_sent_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "dbs_checks_employee_id_fkey";
            columns: ["employee_id"];
            isOneToOne: false;
            referencedRelation: "employee_self_service_data";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "dbs_checks_employee_id_fkey";
            columns: ["employee_id"];
            isOneToOne: false;
            referencedRelation: "employees";
            referencedColumns: ["id"];
          },
        ];
      };
      email_logs: {
        Row: {
          bounce_reason: string | null;
          bounce_type: string | null;
          bounced_at: string | null;
          clicked_at: string | null;
          complained_at: string | null;
          created_at: string;
          delivered_at: string | null;
          email_type: string;
          error_message: string | null;
          id: string;
          metadata: Json | null;
          opened_at: string | null;
          practice_id: string;
          recipient_email: string;
          recipient_name: string | null;
          resend_email_id: string | null;
          sent_at: string;
          status: string;
          subject: string;
          updated_at: string;
        };
        Insert: {
          bounce_reason?: string | null;
          bounce_type?: string | null;
          bounced_at?: string | null;
          clicked_at?: string | null;
          complained_at?: string | null;
          created_at?: string;
          delivered_at?: string | null;
          email_type: string;
          error_message?: string | null;
          id?: string;
          metadata?: Json | null;
          opened_at?: string | null;
          practice_id: string;
          recipient_email: string;
          recipient_name?: string | null;
          resend_email_id?: string | null;
          sent_at?: string;
          status?: string;
          subject: string;
          updated_at?: string;
        };
        Update: {
          bounce_reason?: string | null;
          bounce_type?: string | null;
          bounced_at?: string | null;
          clicked_at?: string | null;
          complained_at?: string | null;
          created_at?: string;
          delivered_at?: string | null;
          email_type?: string;
          error_message?: string | null;
          id?: string;
          metadata?: Json | null;
          opened_at?: string | null;
          practice_id?: string;
          recipient_email?: string;
          recipient_name?: string | null;
          resend_email_id?: string | null;
          sent_at?: string;
          status?: string;
          subject?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      employee_contact_details: {
        Row: {
          created_at: string;
          email: string | null;
          employee_id: string;
          phone_number: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          employee_id: string;
          phone_number?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          employee_id?: string;
          phone_number?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "employee_contact_details_employee_id_fkey";
            columns: ["employee_id"];
            isOneToOne: true;
            referencedRelation: "employee_self_service_data";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "employee_contact_details_employee_id_fkey";
            columns: ["employee_id"];
            isOneToOne: true;
            referencedRelation: "employees";
            referencedColumns: ["id"];
          },
        ];
      };
      employees: {
        Row: {
          created_at: string | null;
          end_date: string | null;
          id: string;
          manager_id: string | null;
          name: string;
          practice_id: string;
          role: Database["public"]["Enums"]["user_role"] | null;
          start_date: string | null;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          end_date?: string | null;
          id?: string;
          manager_id?: string | null;
          name: string;
          practice_id: string;
          role?: Database["public"]["Enums"]["user_role"] | null;
          start_date?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          end_date?: string | null;
          id?: string;
          manager_id?: string | null;
          name?: string;
          practice_id?: string;
          role?: Database["public"]["Enums"]["user_role"] | null;
          start_date?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "employees_manager_id_fkey";
            columns: ["manager_id"];
            isOneToOne: false;
            referencedRelation: "employee_self_service_data";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "employees_manager_id_fkey";
            columns: ["manager_id"];
            isOneToOne: false;
            referencedRelation: "employees";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "employees_practice_id_fkey";
            columns: ["practice_id"];
            isOneToOne: false;
            referencedRelation: "practices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "employees_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      encrypted_payloads: {
        Row: {
          ciphertext: string;
          created_at: string | null;
          id: string;
          module: string;
          period_key: string;
          practice_id: string;
        };
        Insert: {
          ciphertext: string;
          created_at?: string | null;
          id?: string;
          module: string;
          period_key: string;
          practice_id: string;
        };
        Update: {
          ciphertext?: string;
          created_at?: string | null;
          id?: string;
          module?: string;
          period_key?: string;
          practice_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "encrypted_payloads_practice_id_fkey";
            columns: ["practice_id"];
            isOneToOne: false;
            referencedRelation: "practices";
            referencedColumns: ["id"];
          },
        ];
      };
      evidence: {
        Row: {
          created_at: string | null;
          exif_data: Json | null;
          height: number | null;
          id: string;
          mime_type: string | null;
          step_instance_id: string;
          storage_path: string;
          type: Database["public"]["Enums"]["evidence_type"];
          user_id: string;
          width: number | null;
        };
        Insert: {
          created_at?: string | null;
          exif_data?: Json | null;
          height?: number | null;
          id?: string;
          mime_type?: string | null;
          step_instance_id: string;
          storage_path: string;
          type: Database["public"]["Enums"]["evidence_type"];
          user_id: string;
          width?: number | null;
        };
        Update: {
          created_at?: string | null;
          exif_data?: Json | null;
          height?: number | null;
          id?: string;
          mime_type?: string | null;
          step_instance_id?: string;
          storage_path?: string;
          type?: Database["public"]["Enums"]["evidence_type"];
          user_id?: string;
          width?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "evidence_step_instance_id_fkey";
            columns: ["step_instance_id"];
            isOneToOne: false;
            referencedRelation: "step_instances";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "evidence_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      evidence_v2: {
        Row: {
          created_at: string | null;
          created_by: string;
          device_timestamp: string | null;
          id: string;
          latitude: number | null;
          link_url: string | null;
          location_accuracy: number | null;
          longitude: number | null;
          mime_type: string | null;
          practice_id: string;
          server_timestamp: string | null;
          sha256: string | null;
          sharepoint_item_id: string | null;
          size_bytes: number | null;
          storage_path: string | null;
          submission_id: string | null;
          tags: string[] | null;
          task_id: string | null;
          type: string;
        };
        Insert: {
          created_at?: string | null;
          created_by: string;
          device_timestamp?: string | null;
          id?: string;
          latitude?: number | null;
          link_url?: string | null;
          location_accuracy?: number | null;
          longitude?: number | null;
          mime_type?: string | null;
          practice_id: string;
          server_timestamp?: string | null;
          sha256?: string | null;
          sharepoint_item_id?: string | null;
          size_bytes?: number | null;
          storage_path?: string | null;
          submission_id?: string | null;
          tags?: string[] | null;
          task_id?: string | null;
          type: string;
        };
        Update: {
          created_at?: string | null;
          created_by?: string;
          device_timestamp?: string | null;
          id?: string;
          latitude?: number | null;
          link_url?: string | null;
          location_accuracy?: number | null;
          longitude?: number | null;
          mime_type?: string | null;
          practice_id?: string;
          server_timestamp?: string | null;
          sha256?: string | null;
          sharepoint_item_id?: string | null;
          size_bytes?: number | null;
          storage_path?: string | null;
          submission_id?: string | null;
          tags?: string[] | null;
          task_id?: string | null;
          type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "evidence_v2_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "evidence_v2_practice_id_fkey";
            columns: ["practice_id"];
            isOneToOne: false;
            referencedRelation: "practices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "evidence_v2_submission_id_fkey";
            columns: ["submission_id"];
            isOneToOne: false;
            referencedRelation: "form_submissions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "evidence_v2_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
        ];
      };
      fire_actions: {
        Row: {
          assessment_id: string | null;
          assigned_to: string | null;
          completed_at: string | null;
          created_at: string | null;
          deficiency: string;
          due_date: string | null;
          id: string;
          practice_id: string;
          severity: Database["public"]["Enums"]["act_severity"];
          status: Database["public"]["Enums"]["act_status"] | null;
          timeframe: string | null;
          updated_at: string | null;
        };
        Insert: {
          assessment_id?: string | null;
          assigned_to?: string | null;
          completed_at?: string | null;
          created_at?: string | null;
          deficiency: string;
          due_date?: string | null;
          id?: string;
          practice_id: string;
          severity?: Database["public"]["Enums"]["act_severity"];
          status?: Database["public"]["Enums"]["act_status"] | null;
          timeframe?: string | null;
          updated_at?: string | null;
        };
        Update: {
          assessment_id?: string | null;
          assigned_to?: string | null;
          completed_at?: string | null;
          created_at?: string | null;
          deficiency?: string;
          due_date?: string | null;
          id?: string;
          practice_id?: string;
          severity?: Database["public"]["Enums"]["act_severity"];
          status?: Database["public"]["Enums"]["act_status"] | null;
          timeframe?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fire_actions_assessment_id_fkey";
            columns: ["assessment_id"];
            isOneToOne: false;
            referencedRelation: "fire_risk_assessments_v2";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fire_actions_assigned_to_fkey";
            columns: ["assigned_to"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fire_actions_practice_id_fkey";
            columns: ["practice_id"];
            isOneToOne: false;
            referencedRelation: "practices";
            referencedColumns: ["id"];
          },
        ];
      };
      fire_risk_assessments_v2: {
        Row: {
          assessment_date: string;
          assessor_name: string | null;
          assessor_role: string | null;
          completed_at: string | null;
          created_at: string | null;
          emergency_plan: Json | null;
          hazards: Json | null;
          id: string;
          maintenance: Json | null;
          next_review_date: string | null;
          practice_id: string;
          premises: Json | null;
          updated_at: string | null;
        };
        Insert: {
          assessment_date: string;
          assessor_name?: string | null;
          assessor_role?: string | null;
          completed_at?: string | null;
          created_at?: string | null;
          emergency_plan?: Json | null;
          hazards?: Json | null;
          id?: string;
          maintenance?: Json | null;
          next_review_date?: string | null;
          practice_id: string;
          premises?: Json | null;
          updated_at?: string | null;
        };
        Update: {
          assessment_date?: string;
          assessor_name?: string | null;
          assessor_role?: string | null;
          completed_at?: string | null;
          created_at?: string | null;
          emergency_plan?: Json | null;
          hazards?: Json | null;
          id?: string;
          maintenance?: Json | null;
          next_review_date?: string | null;
          practice_id?: string;
          premises?: Json | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fire_risk_assessments_v2_practice_id_fkey";
            columns: ["practice_id"];
            isOneToOne: false;
            referencedRelation: "practices";
            referencedColumns: ["id"];
          },
        ];
      };
      fire_safety_actions: {
        Row: {
          action_description: string;
          assessment_id: string | null;
          assigned_to: string | null;
          completed_at: string | null;
          completed_by: string | null;
          completion_notes: string | null;
          created_at: string | null;
          due_date: string;
          id: string;
          practice_id: string;
          severity: string;
          timeframe: string;
          updated_at: string | null;
        };
        Insert: {
          action_description: string;
          assessment_id?: string | null;
          assigned_to?: string | null;
          completed_at?: string | null;
          completed_by?: string | null;
          completion_notes?: string | null;
          created_at?: string | null;
          due_date: string;
          id?: string;
          practice_id: string;
          severity: string;
          timeframe: string;
          updated_at?: string | null;
        };
        Update: {
          action_description?: string;
          assessment_id?: string | null;
          assigned_to?: string | null;
          completed_at?: string | null;
          completed_by?: string | null;
          completion_notes?: string | null;
          created_at?: string | null;
          due_date?: string;
          id?: string;
          practice_id?: string;
          severity?: string;
          timeframe?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fire_safety_actions_assessment_id_fkey";
            columns: ["assessment_id"];
            isOneToOne: false;
            referencedRelation: "fire_safety_assessments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fire_safety_actions_assigned_to_fkey";
            columns: ["assigned_to"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fire_safety_actions_completed_by_fkey";
            columns: ["completed_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      fire_safety_assessments: {
        Row: {
          assessment_date: string;
          assessment_type: string;
          assessor_id: string | null;
          created_at: string | null;
          evidence_ids: string[] | null;
          id: string;
          next_assessment_due: string | null;
          overall_risk_rating: string | null;
          practice_id: string;
          summary: string | null;
          updated_at: string | null;
        };
        Insert: {
          assessment_date: string;
          assessment_type: string;
          assessor_id?: string | null;
          created_at?: string | null;
          evidence_ids?: string[] | null;
          id?: string;
          next_assessment_due?: string | null;
          overall_risk_rating?: string | null;
          practice_id: string;
          summary?: string | null;
          updated_at?: string | null;
        };
        Update: {
          assessment_date?: string;
          assessment_type?: string;
          assessor_id?: string | null;
          created_at?: string | null;
          evidence_ids?: string[] | null;
          id?: string;
          next_assessment_due?: string | null;
          overall_risk_rating?: string | null;
          practice_id?: string;
          summary?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fire_safety_assessments_assessor_id_fkey";
            columns: ["assessor_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      form_submissions: {
        Row: {
          created_at: string | null;
          current_editors: string[] | null;
          data: Json | null;
          id: string;
          practice_id: string;
          signed_off_at: string | null;
          signed_off_by: string | null;
          status: string | null;
          submitted_at: string | null;
          task_id: string | null;
          template_id: string | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          current_editors?: string[] | null;
          data?: Json | null;
          id?: string;
          practice_id: string;
          signed_off_at?: string | null;
          signed_off_by?: string | null;
          status?: string | null;
          submitted_at?: string | null;
          task_id?: string | null;
          template_id?: string | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          current_editors?: string[] | null;
          data?: Json | null;
          id?: string;
          practice_id?: string;
          signed_off_at?: string | null;
          signed_off_by?: string | null;
          status?: string | null;
          submitted_at?: string | null;
          task_id?: string | null;
          template_id?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "form_submissions_practice_id_fkey";
            columns: ["practice_id"];
            isOneToOne: false;
            referencedRelation: "practices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "form_submissions_signed_off_by_fkey";
            columns: ["signed_off_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "form_submissions_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "form_submissions_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "form_templates";
            referencedColumns: ["id"];
          },
        ];
      };
      form_templates: {
        Row: {
          created_at: string | null;
          id: string;
          json_schema: Json;
          module: string;
          owner_role: Database["public"]["Enums"]["user_role"] | null;
          title: string;
          ui_schema: Json | null;
          updated_at: string | null;
          version: number | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          json_schema: Json;
          module: string;
          owner_role?: Database["public"]["Enums"]["user_role"] | null;
          title: string;
          ui_schema?: Json | null;
          updated_at?: string | null;
          version?: number | null;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          json_schema?: Json;
          module?: string;
          owner_role?: Database["public"]["Enums"]["user_role"] | null;
          title?: string;
          ui_schema?: Json | null;
          updated_at?: string | null;
          version?: number | null;
        };
        Relationships: [];
      };
      fridges: {
        Row: {
          created_at: string | null;
          id: string;
          location: string | null;
          max_temp: number;
          min_temp: number;
          name: string;
          practice_id: string;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          location?: string | null;
          max_temp: number;
          min_temp: number;
          name: string;
          practice_id: string;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          location?: string | null;
          max_temp?: number;
          min_temp?: number;
          name?: string;
          practice_id?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fridges_practice_id_fkey";
            columns: ["practice_id"];
            isOneToOne: false;
            referencedRelation: "practices";
            referencedColumns: ["id"];
          },
        ];
      };
      generated_reports: {
        Row: {
          file_hash: string | null;
          generated_at: string | null;
          id: string;
          params: Json | null;
          practice_id: string;
          report_type: string;
          sharepoint_item_id: string | null;
          storage_path: string | null;
        };
        Insert: {
          file_hash?: string | null;
          generated_at?: string | null;
          id?: string;
          params?: Json | null;
          practice_id: string;
          report_type: string;
          sharepoint_item_id?: string | null;
          storage_path?: string | null;
        };
        Update: {
          file_hash?: string | null;
          generated_at?: string | null;
          id?: string;
          params?: Json | null;
          practice_id?: string;
          report_type?: string;
          sharepoint_item_id?: string | null;
          storage_path?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "generated_reports_practice_id_fkey";
            columns: ["practice_id"];
            isOneToOne: false;
            referencedRelation: "practices";
            referencedColumns: ["id"];
          },
        ];
      };
      GP: {
        Row: {
          "Evidence required": string | null;
          Frequency: string | null;
          Process: string | null;
          "Responsible role": string | null;
          "Row type": string;
          "Step 1": string | null;
          "Step 2": string | null;
          "Step 3": string | null;
          "Step 4": string | null;
          "Step 5": string | null;
          "Step 6": string | null;
          "Where evidence is stored ÔÇô Folder/Path or URL": string | null;
          "Where evidence is stored ÔÇô Physical location (if any)": string | null;
          "Where evidence is stored ÔÇô System/Source": string | null;
        };
        Insert: {
          "Evidence required"?: string | null;
          Frequency?: string | null;
          Process?: string | null;
          "Responsible role"?: string | null;
          "Row type": string;
          "Step 1"?: string | null;
          "Step 2"?: string | null;
          "Step 3"?: string | null;
          "Step 4"?: string | null;
          "Step 5"?: string | null;
          "Step 6"?: string | null;
          "Where evidence is stored ÔÇô Folder/Path or URL"?: string | null;
          "Where evidence is stored ÔÇô Physical location (if any)"?: string | null;
          "Where evidence is stored ÔÇô System/Source"?: string | null;
        };
        Update: {
          "Evidence required"?: string | null;
          Frequency?: string | null;
          Process?: string | null;
          "Responsible role"?: string | null;
          "Row type"?: string;
          "Step 1"?: string | null;
          "Step 2"?: string | null;
          "Step 3"?: string | null;
          "Step 4"?: string | null;
          "Step 5"?: string | null;
          "Step 6"?: string | null;
          "Where evidence is stored ÔÇô Folder/Path or URL"?: string | null;
          "Where evidence is stored ÔÇô Physical location (if any)"?: string | null;
          "Where evidence is stored ÔÇô System/Source"?: string | null;
        };
        Relationships: [];
      };
      "GP tasks": {
        Row: {
          created_at: string;
          id: number;
        };
        Insert: {
          created_at?: string;
          id?: number;
        };
        Update: {
          created_at?: string;
          id?: number;
        };
        Relationships: [];
      };
      groups: {
        Row: {
          created_at: string | null;
          id: string;
          name: string;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          name: string;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          name?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      hr_360_feedback: {
        Row: {
          appraisal_id: string;
          created_at: string | null;
          id: string;
          question: string;
          response: string | null;
        };
        Insert: {
          appraisal_id: string;
          created_at?: string | null;
          id?: string;
          question: string;
          response?: string | null;
        };
        Update: {
          appraisal_id?: string;
          created_at?: string | null;
          id?: string;
          question?: string;
          response?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "hr_360_feedback_appraisal_id_fkey";
            columns: ["appraisal_id"];
            isOneToOne: false;
            referencedRelation: "hr_appraisals";
            referencedColumns: ["id"];
          },
        ];
      };
      hr_actions: {
        Row: {
          action_description: string;
          completed_at: string | null;
          created_at: string | null;
          due_date: string | null;
          employee_id: string;
          id: string;
          practice_id: string;
          source: string | null;
          source_id: string | null;
          status: Database["public"]["Enums"]["act_status"] | null;
          updated_at: string | null;
        };
        Insert: {
          action_description: string;
          completed_at?: string | null;
          created_at?: string | null;
          due_date?: string | null;
          employee_id: string;
          id?: string;
          practice_id: string;
          source?: string | null;
          source_id?: string | null;
          status?: Database["public"]["Enums"]["act_status"] | null;
          updated_at?: string | null;
        };
        Update: {
          action_description?: string;
          completed_at?: string | null;
          created_at?: string | null;
          due_date?: string | null;
          employee_id?: string;
          id?: string;
          practice_id?: string;
          source?: string | null;
          source_id?: string | null;
          status?: Database["public"]["Enums"]["act_status"] | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "hr_actions_employee_id_fkey";
            columns: ["employee_id"];
            isOneToOne: false;
            referencedRelation: "employee_self_service_data";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "hr_actions_employee_id_fkey";
            columns: ["employee_id"];
            isOneToOne: false;
            referencedRelation: "employees";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "hr_actions_practice_id_fkey";
            columns: ["practice_id"];
            isOneToOne: false;
            referencedRelation: "practices";
            referencedColumns: ["id"];
          },
        ];
      };
      hr_appraisals: {
        Row: {
          achievements: string | null;
          challenges: string | null;
          created_at: string | null;
          employee_id: string;
          employee_signature_date: string | null;
          id: string;
          jd_changes: string | null;
          next_year_targets: Json | null;
          period_end: string;
          period_start: string;
          practice_id: string;
          ratings: Json | null;
          reviewer_id: string | null;
          reviewer_signature_date: string | null;
          support_needs: string | null;
          updated_at: string | null;
        };
        Insert: {
          achievements?: string | null;
          challenges?: string | null;
          created_at?: string | null;
          employee_id: string;
          employee_signature_date?: string | null;
          id?: string;
          jd_changes?: string | null;
          next_year_targets?: Json | null;
          period_end: string;
          period_start: string;
          practice_id: string;
          ratings?: Json | null;
          reviewer_id?: string | null;
          reviewer_signature_date?: string | null;
          support_needs?: string | null;
          updated_at?: string | null;
        };
        Update: {
          achievements?: string | null;
          challenges?: string | null;
          created_at?: string | null;
          employee_id?: string;
          employee_signature_date?: string | null;
          id?: string;
          jd_changes?: string | null;
          next_year_targets?: Json | null;
          period_end?: string;
          period_start?: string;
          practice_id?: string;
          ratings?: Json | null;
          reviewer_id?: string | null;
          reviewer_signature_date?: string | null;
          support_needs?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "hr_appraisals_employee_id_fkey";
            columns: ["employee_id"];
            isOneToOne: false;
            referencedRelation: "employee_self_service_data";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "hr_appraisals_employee_id_fkey";
            columns: ["employee_id"];
            isOneToOne: false;
            referencedRelation: "employees";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "hr_appraisals_practice_id_fkey";
            columns: ["practice_id"];
            isOneToOne: false;
            referencedRelation: "practices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "hr_appraisals_reviewer_id_fkey";
            columns: ["reviewer_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      ic_responses: {
        Row: {
          answer: string | null;
          comment: string | null;
          created_at: string | null;
          evidence_ids: string[] | null;
          id: string;
          question_id: string;
          section_id: string;
          submission_id: string;
          updated_at: string | null;
        };
        Insert: {
          answer?: string | null;
          comment?: string | null;
          created_at?: string | null;
          evidence_ids?: string[] | null;
          id?: string;
          question_id: string;
          section_id: string;
          submission_id: string;
          updated_at?: string | null;
        };
        Update: {
          answer?: string | null;
          comment?: string | null;
          created_at?: string | null;
          evidence_ids?: string[] | null;
          id?: string;
          question_id?: string;
          section_id?: string;
          submission_id?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ic_responses_section_id_fkey";
            columns: ["section_id"];
            isOneToOne: false;
            referencedRelation: "ic_sections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ic_responses_submission_id_fkey";
            columns: ["submission_id"];
            isOneToOne: false;
            referencedRelation: "form_submissions";
            referencedColumns: ["id"];
          },
        ];
      };
      ic_sections: {
        Row: {
          created_at: string | null;
          id: string;
          name: string;
          order_index: number;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          name: string;
          order_index: number;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          name?: string;
          order_index?: number;
        };
        Relationships: [];
      };
      improvement_recommendations: {
        Row: {
          accepted_at: string | null;
          accepted_by: string | null;
          created_at: string | null;
          generated_at: string;
          id: string;
          overall_score: number;
          practice_id: string;
          recommendations_json: Json;
          status: string | null;
        };
        Insert: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          created_at?: string | null;
          generated_at?: string;
          id?: string;
          overall_score: number;
          practice_id: string;
          recommendations_json?: Json;
          status?: string | null;
        };
        Update: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          created_at?: string | null;
          generated_at?: string;
          id?: string;
          overall_score?: number;
          practice_id?: string;
          recommendations_json?: Json;
          status?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "improvement_recommendations_accepted_by_fkey";
            columns: ["accepted_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "improvement_recommendations_practice_id_fkey";
            columns: ["practice_id"];
            isOneToOne: false;
            referencedRelation: "practices";
            referencedColumns: ["id"];
          },
        ];
      };
      incidents: {
        Row: {
          actions: Json | null;
          created_at: string | null;
          description: string;
          id: string;
          incident_date: string;
          location: string | null;
          photos: string[] | null;
          practice_id: string;
          rag: string;
          reported_by: string;
          status: string | null;
          themes: string[] | null;
          updated_at: string | null;
        };
        Insert: {
          actions?: Json | null;
          created_at?: string | null;
          description: string;
          id?: string;
          incident_date: string;
          location?: string | null;
          photos?: string[] | null;
          practice_id: string;
          rag: string;
          reported_by: string;
          status?: string | null;
          themes?: string[] | null;
          updated_at?: string | null;
        };
        Update: {
          actions?: Json | null;
          created_at?: string | null;
          description?: string;
          id?: string;
          incident_date?: string;
          location?: string | null;
          photos?: string[] | null;
          practice_id?: string;
          rag?: string;
          reported_by?: string;
          status?: string | null;
          themes?: string[] | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "incidents_practice_id_fkey";
            columns: ["practice_id"];
            isOneToOne: false;
            referencedRelation: "practices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "incidents_reported_by_fkey";
            columns: ["reported_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      ipc_actions: {
        Row: {
          assigned_to: string | null;
          audit_id: string | null;
          check_id: string | null;
          completed_at: string | null;
          created_at: string | null;
          description: string;
          due_date: string | null;
          id: string;
          practice_id: string;
          severity: Database["public"]["Enums"]["act_severity"];
          status: Database["public"]["Enums"]["act_status"] | null;
          timeframe: string | null;
          updated_at: string | null;
        };
        Insert: {
          assigned_to?: string | null;
          audit_id?: string | null;
          check_id?: string | null;
          completed_at?: string | null;
          created_at?: string | null;
          description: string;
          due_date?: string | null;
          id?: string;
          practice_id: string;
          severity?: Database["public"]["Enums"]["act_severity"];
          status?: Database["public"]["Enums"]["act_status"] | null;
          timeframe?: string | null;
          updated_at?: string | null;
        };
        Update: {
          assigned_to?: string | null;
          audit_id?: string | null;
          check_id?: string | null;
          completed_at?: string | null;
          created_at?: string | null;
          description?: string;
          due_date?: string | null;
          id?: string;
          practice_id?: string;
          severity?: Database["public"]["Enums"]["act_severity"];
          status?: Database["public"]["Enums"]["act_status"] | null;
          timeframe?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ipc_actions_assigned_to_fkey";
            columns: ["assigned_to"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ipc_actions_audit_id_fkey";
            columns: ["audit_id"];
            isOneToOne: false;
            referencedRelation: "ipc_audits";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ipc_actions_check_id_fkey";
            columns: ["check_id"];
            isOneToOne: false;
            referencedRelation: "ipc_checks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ipc_actions_practice_id_fkey";
            columns: ["practice_id"];
            isOneToOne: false;
            referencedRelation: "practices";
            referencedColumns: ["id"];
          },
        ];
      };
      ipc_audits: {
        Row: {
          completed_at: string | null;
          completed_by: string | null;
          created_at: string | null;
          id: string;
          location_scope: string | null;
          period_month: number;
          period_year: number;
          practice_id: string;
          retained_until: string | null;
          updated_at: string | null;
        };
        Insert: {
          completed_at?: string | null;
          completed_by?: string | null;
          created_at?: string | null;
          id?: string;
          location_scope?: string | null;
          period_month: number;
          period_year: number;
          practice_id: string;
          retained_until?: string | null;
          updated_at?: string | null;
        };
        Update: {
          completed_at?: string | null;
          completed_by?: string | null;
          created_at?: string | null;
          id?: string;
          location_scope?: string | null;
          period_month?: number;
          period_year?: number;
          practice_id?: string;
          retained_until?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ipc_audits_completed_by_fkey";
            columns: ["completed_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ipc_audits_practice_id_fkey";
            columns: ["practice_id"];
            isOneToOne: false;
            referencedRelation: "practices";
            referencedColumns: ["id"];
          },
        ];
      };
      ipc_checks: {
        Row: {
          area: string | null;
          audit_id: string;
          comments: string | null;
          created_at: string | null;
          id: string;
          item: string;
          photo_url: string | null;
          response: Database["public"]["Enums"]["ynna"];
          section: string;
        };
        Insert: {
          area?: string | null;
          audit_id: string;
          comments?: string | null;
          created_at?: string | null;
          id?: string;
          item: string;
          photo_url?: string | null;
          response: Database["public"]["Enums"]["ynna"];
          section: string;
        };
        Update: {
          area?: string | null;
          audit_id?: string;
          comments?: string | null;
          created_at?: string | null;
          id?: string;
          item?: string;
          photo_url?: string | null;
          response?: Database["public"]["Enums"]["ynna"];
          section?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ipc_checks_audit_id_fkey";
            columns: ["audit_id"];
            isOneToOne: false;
            referencedRelation: "ipc_audits";
            referencedColumns: ["id"];
          },
        ];
      };
      issues: {
        Row: {
          assigned_to_id: string | null;
          created_at: string | null;
          details: string | null;
          id: string;
          process_instance_id: string;
          raised_by_id: string;
          resolved_at: string | null;
          sla_due_at: string | null;
          status: Database["public"]["Enums"]["issue_status"] | null;
          step_instance_id: string | null;
          summary: string;
        };
        Insert: {
          assigned_to_id?: string | null;
          created_at?: string | null;
          details?: string | null;
          id?: string;
          process_instance_id: string;
          raised_by_id: string;
          resolved_at?: string | null;
          sla_due_at?: string | null;
          status?: Database["public"]["Enums"]["issue_status"] | null;
          step_instance_id?: string | null;
          summary: string;
        };
        Update: {
          assigned_to_id?: string | null;
          created_at?: string | null;
          details?: string | null;
          id?: string;
          process_instance_id?: string;
          raised_by_id?: string;
          resolved_at?: string | null;
          sla_due_at?: string | null;
          status?: Database["public"]["Enums"]["issue_status"] | null;
          step_instance_id?: string | null;
          summary?: string;
        };
        Relationships: [
          {
            foreignKeyName: "issues_assigned_to_id_fkey";
            columns: ["assigned_to_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "issues_process_instance_id_fkey";
            columns: ["process_instance_id"];
            isOneToOne: false;
            referencedRelation: "process_instances";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "issues_raised_by_id_fkey";
            columns: ["raised_by_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "issues_step_instance_id_fkey";
            columns: ["step_instance_id"];
            isOneToOne: false;
            referencedRelation: "step_instances";
            referencedColumns: ["id"];
          },
        ];
      };
      leave_policies: {
        Row: {
          annual_days: number;
          created_at: string | null;
          id: string;
          name: string;
          practice_id: string;
          updated_at: string | null;
        };
        Insert: {
          annual_days: number;
          created_at?: string | null;
          id?: string;
          name: string;
          practice_id: string;
          updated_at?: string | null;
        };
        Update: {
          annual_days?: number;
          created_at?: string | null;
          id?: string;
          name?: string;
          practice_id?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "leave_policies_practice_id_fkey";
            columns: ["practice_id"];
            isOneToOne: false;
            referencedRelation: "practices";
            referencedColumns: ["id"];
          },
        ];
      };
      leave_requests: {
        Row: {
          approved_at: string | null;
          approver_id: string | null;
          created_at: string | null;
          days_count: number;
          employee_id: string;
          end_date: string;
          id: string;
          reason: string | null;
          start_date: string;
          status: string | null;
          updated_at: string | null;
        };
        Insert: {
          approved_at?: string | null;
          approver_id?: string | null;
          created_at?: string | null;
          days_count: number;
          employee_id: string;
          end_date: string;
          id?: string;
          reason?: string | null;
          start_date: string;
          status?: string | null;
          updated_at?: string | null;
        };
        Update: {
          approved_at?: string | null;
          approver_id?: string | null;
          created_at?: string | null;
          days_count?: number;
          employee_id?: string;
          end_date?: string;
          id?: string;
          reason?: string | null;
          start_date?: string;
          status?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "leave_requests_approver_id_fkey";
            columns: ["approver_id"];
            isOneToOne: false;
            referencedRelation: "employee_self_service_data";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leave_requests_approver_id_fkey";
            columns: ["approver_id"];
            isOneToOne: false;
            referencedRelation: "employees";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leave_requests_employee_id_fkey";
            columns: ["employee_id"];
            isOneToOne: false;
            referencedRelation: "employee_self_service_data";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leave_requests_employee_id_fkey";
            columns: ["employee_id"];
            isOneToOne: false;
            referencedRelation: "employees";
            referencedColumns: ["id"];
          },
        ];
      };
      medical_requests: {
        Row: {
          assigned_gp_id: string | null;
          created_at: string | null;
          emis_hash: string | null;
          evidence_ids: string[] | null;
          id: string;
          notes: string | null;
          practice_id: string;
          received_at: string;
          request_type: string;
          sent_at: string | null;
          status: string | null;
          updated_at: string | null;
        };
        Insert: {
          assigned_gp_id?: string | null;
          created_at?: string | null;
          emis_hash?: string | null;
          evidence_ids?: string[] | null;
          id?: string;
          notes?: string | null;
          practice_id: string;
          received_at: string;
          request_type: string;
          sent_at?: string | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Update: {
          assigned_gp_id?: string | null;
          created_at?: string | null;
          emis_hash?: string | null;
          evidence_ids?: string[] | null;
          id?: string;
          notes?: string | null;
          practice_id?: string;
          received_at?: string;
          request_type?: string;
          sent_at?: string | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "medical_requests_assigned_gp_id_fkey";
            columns: ["assigned_gp_id"];
            isOneToOne: false;
            referencedRelation: "employee_self_service_data";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "medical_requests_assigned_gp_id_fkey";
            columns: ["assigned_gp_id"];
            isOneToOne: false;
            referencedRelation: "employees";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "medical_requests_practice_id_fkey";
            columns: ["practice_id"];
            isOneToOne: false;
            referencedRelation: "practices";
            referencedColumns: ["id"];
          },
        ];
      };
      month_end_scripts: {
        Row: {
          claim_run_id: string | null;
          created_at: string | null;
          created_by: string;
          drug_code: string;
          drug_name: string;
          emis_hash: string;
          emis_id: string | null;
          id: string;
          issue_date: string;
          month: string;
          notes: string | null;
          practice_id: string;
          prescriber: string;
          quantity: number;
          removed: boolean | null;
          removed_at: string | null;
          removed_by: string | null;
          removed_reason: string | null;
        };
        Insert: {
          claim_run_id?: string | null;
          created_at?: string | null;
          created_by: string;
          drug_code: string;
          drug_name: string;
          emis_hash: string;
          emis_id?: string | null;
          id?: string;
          issue_date: string;
          month: string;
          notes?: string | null;
          practice_id: string;
          prescriber: string;
          quantity: number;
          removed?: boolean | null;
          removed_at?: string | null;
          removed_by?: string | null;
          removed_reason?: string | null;
        };
        Update: {
          claim_run_id?: string | null;
          created_at?: string | null;
          created_by?: string;
          drug_code?: string;
          drug_name?: string;
          emis_hash?: string;
          emis_id?: string | null;
          id?: string;
          issue_date?: string;
          month?: string;
          notes?: string | null;
          practice_id?: string;
          prescriber?: string;
          quantity?: number;
          removed?: boolean | null;
          removed_at?: string | null;
          removed_by?: string | null;
          removed_reason?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "month_end_scripts_claim_run_id_fkey";
            columns: ["claim_run_id"];
            isOneToOne: false;
            referencedRelation: "claim_runs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "month_end_scripts_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "month_end_scripts_practice_id_fkey";
            columns: ["practice_id"];
            isOneToOne: false;
            referencedRelation: "practices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "month_end_scripts_removed_by_fkey";
            columns: ["removed_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      notification_delivery_log: {
        Row: {
          created_at: string | null;
          delivered_at: string | null;
          delivery_method: string;
          error_message: string | null;
          failed: boolean | null;
          id: string;
          notification_id: string | null;
          practice_id: string;
          read_at: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          delivered_at?: string | null;
          delivery_method: string;
          error_message?: string | null;
          failed?: boolean | null;
          id?: string;
          notification_id?: string | null;
          practice_id: string;
          read_at?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          delivered_at?: string | null;
          delivery_method?: string;
          error_message?: string | null;
          failed?: boolean | null;
          id?: string;
          notification_id?: string | null;
          practice_id?: string;
          read_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notification_delivery_log_notification_id_fkey";
            columns: ["notification_id"];
            isOneToOne: false;
            referencedRelation: "notifications";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notification_delivery_log_practice_id_fkey";
            columns: ["practice_id"];
            isOneToOne: false;
            referencedRelation: "practices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notification_delivery_log_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      notification_preferences: {
        Row: {
          created_at: string;
          email_frequency: string;
          id: string;
          in_app_enabled: boolean;
          policy_reminders: boolean;
          task_notifications: boolean;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          email_frequency?: string;
          id?: string;
          in_app_enabled?: boolean;
          policy_reminders?: boolean;
          task_notifications?: boolean;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          email_frequency?: string;
          id?: string;
          in_app_enabled?: boolean;
          policy_reminders?: boolean;
          task_notifications?: boolean;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          action_url: string | null;
          created_at: string | null;
          expires_at: string | null;
          id: string;
          is_read: boolean | null;
          message: string;
          metadata: Json | null;
          notification_type: string;
          practice_id: string;
          priority: string | null;
          read_at: string | null;
          related_entity_id: string | null;
          related_entity_type: string | null;
          title: string;
          user_id: string;
        };
        Insert: {
          action_url?: string | null;
          created_at?: string | null;
          expires_at?: string | null;
          id?: string;
          is_read?: boolean | null;
          message: string;
          metadata?: Json | null;
          notification_type: string;
          practice_id: string;
          priority?: string | null;
          read_at?: string | null;
          related_entity_id?: string | null;
          related_entity_type?: string | null;
          title: string;
          user_id: string;
        };
        Update: {
          action_url?: string | null;
          created_at?: string | null;
          expires_at?: string | null;
          id?: string;
          is_read?: boolean | null;
          message?: string;
          metadata?: Json | null;
          notification_type?: string;
          practice_id?: string;
          priority?: string | null;
          read_at?: string | null;
          related_entity_id?: string | null;
          related_entity_type?: string | null;
          title?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_practice_id_fkey";
            columns: ["practice_id"];
            isOneToOne: false;
            referencedRelation: "practices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      organization_setup: {
        Row: {
          created_at: string;
          id: string;
          practice_id: string;
          setup_completed: boolean | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          practice_id: string;
          setup_completed?: boolean | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          practice_id?: string;
          setup_completed?: boolean | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "organization_setup_practice_id_fkey";
            columns: ["practice_id"];
            isOneToOne: false;
            referencedRelation: "practices";
            referencedColumns: ["id"];
          },
        ];
      };
      policy_acknowledgments: {
        Row: {
          acknowledged_at: string;
          created_at: string | null;
          id: string;
          ip_address: unknown;
          policy_id: string;
          practice_id: string;
          user_agent: string | null;
          user_id: string;
          version_acknowledged: string;
        };
        Insert: {
          acknowledged_at?: string;
          created_at?: string | null;
          id?: string;
          ip_address?: unknown;
          policy_id: string;
          practice_id: string;
          user_agent?: string | null;
          user_id: string;
          version_acknowledged: string;
        };
        Update: {
          acknowledged_at?: string;
          created_at?: string | null;
          id?: string;
          ip_address?: unknown;
          policy_id?: string;
          practice_id?: string;
          user_agent?: string | null;
          user_id?: string;
          version_acknowledged?: string;
        };
        Relationships: [
          {
            foreignKeyName: "policy_acknowledgments_policy_id_fkey";
            columns: ["policy_id"];
            isOneToOne: false;
            referencedRelation: "policy_documents";
            referencedColumns: ["id"];
          },
        ];
      };
      policy_documents: {
        Row: {
          created_at: string | null;
          effective_from: string | null;
          file_mime_type: string | null;
          file_size: number | null;
          id: string;
          last_reviewed_at: string | null;
          last_reviewed_by: string | null;
          owner_role: Database["public"]["Enums"]["user_role"] | null;
          practice_id: string;
          review_due: string | null;
          sharepoint_item_id: string | null;
          source: string | null;
          status: string | null;
          storage_path: string | null;
          title: string;
          updated_at: string | null;
          uploaded_by: string | null;
          url: string | null;
          version: string | null;
        };
        Insert: {
          created_at?: string | null;
          effective_from?: string | null;
          file_mime_type?: string | null;
          file_size?: number | null;
          id?: string;
          last_reviewed_at?: string | null;
          last_reviewed_by?: string | null;
          owner_role?: Database["public"]["Enums"]["user_role"] | null;
          practice_id: string;
          review_due?: string | null;
          sharepoint_item_id?: string | null;
          source?: string | null;
          status?: string | null;
          storage_path?: string | null;
          title: string;
          updated_at?: string | null;
          uploaded_by?: string | null;
          url?: string | null;
          version?: string | null;
        };
        Update: {
          created_at?: string | null;
          effective_from?: string | null;
          file_mime_type?: string | null;
          file_size?: number | null;
          id?: string;
          last_reviewed_at?: string | null;
          last_reviewed_by?: string | null;
          owner_role?: Database["public"]["Enums"]["user_role"] | null;
          practice_id?: string;
          review_due?: string | null;
          sharepoint_item_id?: string | null;
          source?: string | null;
          status?: string | null;
          storage_path?: string | null;
          title?: string;
          updated_at?: string | null;
          uploaded_by?: string | null;
          url?: string | null;
          version?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "policy_documents_last_reviewed_by_fkey";
            columns: ["last_reviewed_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "policy_documents_practice_id_fkey";
            columns: ["practice_id"];
            isOneToOne: false;
            referencedRelation: "practices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "policy_documents_uploaded_by_fkey";
            columns: ["uploaded_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      policy_review_history: {
        Row: {
          created_at: string | null;
          id: string;
          notes: string | null;
          policy_id: string;
          practice_id: string;
          review_type: string;
          reviewed_at: string;
          reviewed_by: string;
          version_reviewed: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          notes?: string | null;
          policy_id: string;
          practice_id: string;
          review_type: string;
          reviewed_at?: string;
          reviewed_by: string;
          version_reviewed: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          notes?: string | null;
          policy_id?: string;
          practice_id?: string;
          review_type?: string;
          reviewed_at?: string;
          reviewed_by?: string;
          version_reviewed?: string;
        };
        Relationships: [
          {
            foreignKeyName: "policy_review_history_policy_id_fkey";
            columns: ["policy_id"];
            isOneToOne: false;
            referencedRelation: "policy_documents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "policy_review_history_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      policy_views: {
        Row: {
          id: string;
          policy_id: string;
          user_id: string;
          version: string;
          viewed_at: string;
        };
        Insert: {
          id?: string;
          policy_id: string;
          user_id: string;
          version: string;
          viewed_at?: string;
        };
        Update: {
          id?: string;
          policy_id?: string;
          user_id?: string;
          version?: string;
          viewed_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "policy_views_policy_id_fkey";
            columns: ["policy_id"];
            isOneToOne: false;
            referencedRelation: "policy_documents";
            referencedColumns: ["id"];
          },
        ];
      };
      practice_targets: {
        Row: {
          created_at: string | null;
          effective_from: string;
          id: string;
          practice_id: string;
          section_key: string | null;
          target_score: number;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          effective_from?: string;
          id?: string;
          practice_id: string;
          section_key?: string | null;
          target_score: number;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          effective_from?: string;
          id?: string;
          practice_id?: string;
          section_key?: string | null;
          target_score?: number;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "practice_targets_practice_id_fkey";
            columns: ["practice_id"];
            isOneToOne: false;
            referencedRelation: "practices";
            referencedColumns: ["id"];
          },
        ];
      };
      practices: {
        Row: {
          address: string | null;
          audit_country: Database["public"]["Enums"]["country_code"] | null;
          country: string | null;
          created_at: string | null;
          group_id: string | null;
          id: string;
          initial_setup_by: string | null;
          logo_url: string | null;
          name: string;
          onboarding_completed_at: string | null;
          onboarding_stage: Database["public"]["Enums"]["onboarding_stage"] | null;
          sharepoint_drive_id: string | null;
          sharepoint_root_path: string | null;
          sharepoint_site_id: string | null;
          theme: Json | null;
          timezone: string | null;
          updated_at: string | null;
        };
        Insert: {
          address?: string | null;
          audit_country?: Database["public"]["Enums"]["country_code"] | null;
          country?: string | null;
          created_at?: string | null;
          group_id?: string | null;
          id?: string;
          initial_setup_by?: string | null;
          logo_url?: string | null;
          name: string;
          onboarding_completed_at?: string | null;
          onboarding_stage?: Database["public"]["Enums"]["onboarding_stage"] | null;
          sharepoint_drive_id?: string | null;
          sharepoint_root_path?: string | null;
          sharepoint_site_id?: string | null;
          theme?: Json | null;
          timezone?: string | null;
          updated_at?: string | null;
        };
        Update: {
          address?: string | null;
          audit_country?: Database["public"]["Enums"]["country_code"] | null;
          country?: string | null;
          created_at?: string | null;
          group_id?: string | null;
          id?: string;
          initial_setup_by?: string | null;
          logo_url?: string | null;
          name?: string;
          onboarding_completed_at?: string | null;
          onboarding_stage?: Database["public"]["Enums"]["onboarding_stage"] | null;
          sharepoint_drive_id?: string | null;
          sharepoint_root_path?: string | null;
          sharepoint_site_id?: string | null;
          theme?: Json | null;
          timezone?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "practices_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "practices_initial_setup_by_fkey";
            columns: ["initial_setup_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      process_instances: {
        Row: {
          assignee_id: string | null;
          completed_at: string | null;
          created_at: string | null;
          due_at: string;
          id: string;
          period_end: string;
          period_start: string;
          practice_id: string;
          started_at: string | null;
          status: Database["public"]["Enums"]["process_status"] | null;
          template_id: string;
          updated_at: string | null;
        };
        Insert: {
          assignee_id?: string | null;
          completed_at?: string | null;
          created_at?: string | null;
          due_at: string;
          id?: string;
          period_end: string;
          period_start: string;
          practice_id: string;
          started_at?: string | null;
          status?: Database["public"]["Enums"]["process_status"] | null;
          template_id: string;
          updated_at?: string | null;
        };
        Update: {
          assignee_id?: string | null;
          completed_at?: string | null;
          created_at?: string | null;
          due_at?: string;
          id?: string;
          period_end?: string;
          period_start?: string;
          practice_id?: string;
          started_at?: string | null;
          status?: Database["public"]["Enums"]["process_status"] | null;
          template_id?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "process_instances_assignee_id_fkey";
            columns: ["assignee_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "process_instances_practice_id_fkey";
            columns: ["practice_id"];
            isOneToOne: false;
            referencedRelation: "practices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "process_instances_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "process_templates";
            referencedColumns: ["id"];
          },
        ];
      };
      process_templates: {
        Row: {
          active: boolean | null;
          compliance_metadata: Json | null;
          created_at: string | null;
          custom_frequency: string | null;
          evidence_hint: string | null;
          frequency: Database["public"]["Enums"]["process_frequency"];
          id: string;
          name: string;
          practice_id: string;
          regulatory_standards: string[] | null;
          remedials: Json;
          responsible_role: Database["public"]["Enums"]["user_role"];
          sla_hours: number | null;
          start_date: string | null;
          steps: Json;
          storage_hints: Json | null;
          updated_at: string | null;
        };
        Insert: {
          active?: boolean | null;
          compliance_metadata?: Json | null;
          created_at?: string | null;
          custom_frequency?: string | null;
          evidence_hint?: string | null;
          frequency: Database["public"]["Enums"]["process_frequency"];
          id?: string;
          name: string;
          practice_id: string;
          regulatory_standards?: string[] | null;
          remedials?: Json;
          responsible_role: Database["public"]["Enums"]["user_role"];
          sla_hours?: number | null;
          start_date?: string | null;
          steps?: Json;
          storage_hints?: Json | null;
          updated_at?: string | null;
        };
        Update: {
          active?: boolean | null;
          compliance_metadata?: Json | null;
          created_at?: string | null;
          custom_frequency?: string | null;
          evidence_hint?: string | null;
          frequency?: Database["public"]["Enums"]["process_frequency"];
          id?: string;
          name?: string;
          practice_id?: string;
          regulatory_standards?: string[] | null;
          remedials?: Json;
          responsible_role?: Database["public"]["Enums"]["user_role"];
          sla_hours?: number | null;
          start_date?: string | null;
          steps?: Json;
          storage_hints?: Json | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "process_templates_practice_id_fkey";
            columns: ["practice_id"];
            isOneToOne: false;
            referencedRelation: "practices";
            referencedColumns: ["id"];
          },
        ];
      };
      regulatory_frameworks: {
        Row: {
          active: boolean | null;
          country: string | null;
          created_at: string | null;
          description: string | null;
          framework_code: string;
          framework_name: string;
          id: string;
        };
        Insert: {
          active?: boolean | null;
          country?: string | null;
          created_at?: string | null;
          description?: string | null;
          framework_code: string;
          framework_name: string;
          id?: string;
        };
        Update: {
          active?: boolean | null;
          country?: string | null;
          created_at?: string | null;
          description?: string | null;
          framework_code?: string;
          framework_name?: string;
          id?: string;
        };
        Relationships: [];
      };
      regulatory_standards: {
        Row: {
          active: boolean | null;
          category: string | null;
          created_at: string | null;
          description: string | null;
          framework_id: string;
          id: string;
          standard_code: string;
          standard_name: string;
        };
        Insert: {
          active?: boolean | null;
          category?: string | null;
          created_at?: string | null;
          description?: string | null;
          framework_id: string;
          id?: string;
          standard_code: string;
          standard_name: string;
        };
        Update: {
          active?: boolean | null;
          category?: string | null;
          created_at?: string | null;
          description?: string | null;
          framework_id?: string;
          id?: string;
          standard_code?: string;
          standard_name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "regulatory_standards_framework_id_fkey";
            columns: ["framework_id"];
            isOneToOne: false;
            referencedRelation: "regulatory_frameworks";
            referencedColumns: ["id"];
          },
        ];
      };
      risk_assessments: {
        Row: {
          action_owner: string | null;
          created_at: string | null;
          existing_controls: string | null;
          further_actions: string | null;
          hazard_description: string;
          id: string;
          next_review_date: string | null;
          practice_id: string;
          risk_level: string | null;
          updated_at: string | null;
          who_might_be_harmed: string | null;
        };
        Insert: {
          action_owner?: string | null;
          created_at?: string | null;
          existing_controls?: string | null;
          further_actions?: string | null;
          hazard_description: string;
          id?: string;
          next_review_date?: string | null;
          practice_id: string;
          risk_level?: string | null;
          updated_at?: string | null;
          who_might_be_harmed?: string | null;
        };
        Update: {
          action_owner?: string | null;
          created_at?: string | null;
          existing_controls?: string | null;
          further_actions?: string | null;
          hazard_description?: string;
          id?: string;
          next_review_date?: string | null;
          practice_id?: string;
          risk_level?: string | null;
          updated_at?: string | null;
          who_might_be_harmed?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "risk_assessments_action_owner_fkey";
            columns: ["action_owner"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "risk_assessments_practice_id_fkey";
            columns: ["practice_id"];
            isOneToOne: false;
            referencedRelation: "practices";
            referencedColumns: ["id"];
          },
        ];
      };
      role_assignment_contacts: {
        Row: {
          assigned_email: string;
          assignment_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          assigned_email: string;
          assignment_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          assigned_email?: string;
          assignment_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "role_assignment_contacts_assignment_id_fkey";
            columns: ["assignment_id"];
            isOneToOne: true;
            referencedRelation: "role_assignments";
            referencedColumns: ["id"];
          },
        ];
      };
      role_assignments: {
        Row: {
          assigned_name: string;
          created_at: string;
          id: string;
          practice_id: string;
          role: Database["public"]["Enums"]["user_role"];
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          assigned_name: string;
          created_at?: string;
          id?: string;
          practice_id: string;
          role: Database["public"]["Enums"]["user_role"];
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          assigned_name?: string;
          created_at?: string;
          id?: string;
          practice_id?: string;
          role?: Database["public"]["Enums"]["user_role"];
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "role_assignments_practice_id_fkey";
            columns: ["practice_id"];
            isOneToOne: false;
            referencedRelation: "practices";
            referencedColumns: ["id"];
          },
        ];
      };
      room_assessments: {
        Row: {
          assessment_date: string;
          assessor_id: string | null;
          created_at: string | null;
          findings: Json;
          id: string;
          next_due_date: string | null;
          practice_id: string;
          room_id: string;
          updated_at: string | null;
        };
        Insert: {
          assessment_date: string;
          assessor_id?: string | null;
          created_at?: string | null;
          findings: Json;
          id?: string;
          next_due_date?: string | null;
          practice_id: string;
          room_id: string;
          updated_at?: string | null;
        };
        Update: {
          assessment_date?: string;
          assessor_id?: string | null;
          created_at?: string | null;
          findings?: Json;
          id?: string;
          next_due_date?: string | null;
          practice_id?: string;
          room_id?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "room_assessments_assessor_id_fkey";
            columns: ["assessor_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "room_assessments_practice_id_fkey";
            columns: ["practice_id"];
            isOneToOne: false;
            referencedRelation: "practices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "room_assessments_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          },
        ];
      };
      rooms: {
        Row: {
          created_at: string | null;
          floor: string | null;
          id: string;
          name: string;
          practice_id: string;
          room_type: string | null;
          schedule_rule: string | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          floor?: string | null;
          id?: string;
          name: string;
          practice_id: string;
          room_type?: string | null;
          schedule_rule?: string | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          floor?: string | null;
          id?: string;
          name?: string;
          practice_id?: string;
          room_type?: string | null;
          schedule_rule?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "rooms_practice_id_fkey";
            columns: ["practice_id"];
            isOneToOne: false;
            referencedRelation: "practices";
            referencedColumns: ["id"];
          },
        ];
      };
      scheduled_reminders: {
        Row: {
          created_at: string | null;
          id: string;
          is_active: boolean | null;
          last_run_at: string | null;
          metadata: Json | null;
          next_run_at: string;
          practice_id: string;
          reminder_type: Database["public"]["Enums"]["notification_type"];
          schedule_pattern: string;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          last_run_at?: string | null;
          metadata?: Json | null;
          next_run_at: string;
          practice_id: string;
          reminder_type: Database["public"]["Enums"]["notification_type"];
          schedule_pattern: string;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          last_run_at?: string | null;
          metadata?: Json | null;
          next_run_at?: string;
          practice_id?: string;
          reminder_type?: Database["public"]["Enums"]["notification_type"];
          schedule_pattern?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "scheduled_reminders_practice_id_fkey";
            columns: ["practice_id"];
            isOneToOne: false;
            referencedRelation: "practices";
            referencedColumns: ["id"];
          },
        ];
      };
      score_current: {
        Row: {
          contributors_json: Json | null;
          gates_json: Json | null;
          practice_id: string;
          score: number;
          section_key: string;
          updated_at: string;
        };
        Insert: {
          contributors_json?: Json | null;
          gates_json?: Json | null;
          practice_id: string;
          score: number;
          section_key: string;
          updated_at?: string;
        };
        Update: {
          contributors_json?: Json | null;
          gates_json?: Json | null;
          practice_id?: string;
          score?: number;
          section_key?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "score_current_practice_id_fkey";
            columns: ["practice_id"];
            isOneToOne: false;
            referencedRelation: "practices";
            referencedColumns: ["id"];
          },
        ];
      };
      score_snapshot: {
        Row: {
          contributors_json: Json | null;
          created_at: string | null;
          id: string;
          practice_id: string;
          score: number;
          section_key: string | null;
          snapshot_date: string;
        };
        Insert: {
          contributors_json?: Json | null;
          created_at?: string | null;
          id?: string;
          practice_id: string;
          score: number;
          section_key?: string | null;
          snapshot_date: string;
        };
        Update: {
          contributors_json?: Json | null;
          created_at?: string | null;
          id?: string;
          practice_id?: string;
          score?: number;
          section_key?: string | null;
          snapshot_date?: string;
        };
        Relationships: [
          {
            foreignKeyName: "score_snapshot_practice_id_fkey";
            columns: ["practice_id"];
            isOneToOne: false;
            referencedRelation: "practices";
            referencedColumns: ["id"];
          },
        ];
      };
      script_claim_runs: {
        Row: {
          created_at: string | null;
          created_by: string | null;
          id: string;
          period_end: string;
          period_start: string;
          practice_id: string;
          run_date: string;
        };
        Insert: {
          created_at?: string | null;
          created_by?: string | null;
          id?: string;
          period_end: string;
          period_start: string;
          practice_id: string;
          run_date: string;
        };
        Update: {
          created_at?: string | null;
          created_by?: string | null;
          id?: string;
          period_end?: string;
          period_start?: string;
          practice_id?: string;
          run_date?: string;
        };
        Relationships: [
          {
            foreignKeyName: "script_claim_runs_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "script_claim_runs_practice_id_fkey";
            columns: ["practice_id"];
            isOneToOne: false;
            referencedRelation: "practices";
            referencedColumns: ["id"];
          },
        ];
      };
      script_claims: {
        Row: {
          amount: string;
          claim_run_id: string;
          created_at: string | null;
          emis_id: string;
          id: string;
          issue_date: string;
          medication: string;
          script_id: string | null;
        };
        Insert: {
          amount: string;
          claim_run_id: string;
          created_at?: string | null;
          emis_id: string;
          id?: string;
          issue_date: string;
          medication: string;
          script_id?: string | null;
        };
        Update: {
          amount?: string;
          claim_run_id?: string;
          created_at?: string | null;
          emis_id?: string;
          id?: string;
          issue_date?: string;
          medication?: string;
          script_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "script_claims_claim_run_id_fkey";
            columns: ["claim_run_id"];
            isOneToOne: false;
            referencedRelation: "script_claim_runs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "script_claims_script_id_fkey";
            columns: ["script_id"];
            isOneToOne: false;
            referencedRelation: "month_end_scripts";
            referencedColumns: ["id"];
          },
        ];
      };
      step_instances: {
        Row: {
          created_at: string | null;
          device_timestamp: string | null;
          id: string;
          latitude: number | null;
          longitude: number | null;
          notes: string | null;
          process_instance_id: string;
          server_timestamp: string | null;
          status: Database["public"]["Enums"]["step_status"] | null;
          step_index: number;
          three_words: string | null;
          title: string;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          device_timestamp?: string | null;
          id?: string;
          latitude?: number | null;
          longitude?: number | null;
          notes?: string | null;
          process_instance_id: string;
          server_timestamp?: string | null;
          status?: Database["public"]["Enums"]["step_status"] | null;
          step_index: number;
          three_words?: string | null;
          title: string;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          device_timestamp?: string | null;
          id?: string;
          latitude?: number | null;
          longitude?: number | null;
          notes?: string | null;
          process_instance_id?: string;
          server_timestamp?: string | null;
          status?: Database["public"]["Enums"]["step_status"] | null;
          step_index?: number;
          three_words?: string | null;
          title?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "step_instances_process_instance_id_fkey";
            columns: ["process_instance_id"];
            isOneToOne: false;
            referencedRelation: "process_instances";
            referencedColumns: ["id"];
          },
        ];
      };
      task_templates: {
        Row: {
          allowed_roles: Database["public"]["Enums"]["user_role"][] | null;
          created_at: string | null;
          default_assignee_role: Database["public"]["Enums"]["user_role"] | null;
          description: string | null;
          due_rule: string | null;
          evidence_tags: string[] | null;
          id: string;
          json_schema: Json | null;
          module: string;
          practice_id: string | null;
          requires_photo: boolean | null;
          sla_type: string | null;
          title: string;
          ui_schema: Json | null;
          updated_at: string | null;
        };
        Insert: {
          allowed_roles?: Database["public"]["Enums"]["user_role"][] | null;
          created_at?: string | null;
          default_assignee_role?: Database["public"]["Enums"]["user_role"] | null;
          description?: string | null;
          due_rule?: string | null;
          evidence_tags?: string[] | null;
          id?: string;
          json_schema?: Json | null;
          module: string;
          practice_id?: string | null;
          requires_photo?: boolean | null;
          sla_type?: string | null;
          title: string;
          ui_schema?: Json | null;
          updated_at?: string | null;
        };
        Update: {
          allowed_roles?: Database["public"]["Enums"]["user_role"][] | null;
          created_at?: string | null;
          default_assignee_role?: Database["public"]["Enums"]["user_role"] | null;
          description?: string | null;
          due_rule?: string | null;
          evidence_tags?: string[] | null;
          id?: string;
          json_schema?: Json | null;
          module?: string;
          practice_id?: string | null;
          requires_photo?: boolean | null;
          sla_type?: string | null;
          title?: string;
          ui_schema?: Json | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "task_templates_practice_id_fkey";
            columns: ["practice_id"];
            isOneToOne: false;
            referencedRelation: "practices";
            referencedColumns: ["id"];
          },
        ];
      };
      tasks: {
        Row: {
          assigned_to_role: Database["public"]["Enums"]["user_role"] | null;
          assigned_to_user_id: string | null;
          completed_at: string | null;
          completion_time_seconds: number | null;
          compliance_metadata: Json | null;
          created_at: string | null;
          created_by: string | null;
          description: string | null;
          due_at: string;
          id: string;
          module: string;
          practice_id: string;
          priority: string | null;
          regulatory_standards: string[] | null;
          requires_photo: boolean | null;
          return_notes: string | null;
          returned_by: string | null;
          returned_reason: string | null;
          scheduled_at: string | null;
          status: string | null;
          template_id: string | null;
          title: string;
          updated_at: string | null;
        };
        Insert: {
          assigned_to_role?: Database["public"]["Enums"]["user_role"] | null;
          assigned_to_user_id?: string | null;
          completed_at?: string | null;
          completion_time_seconds?: number | null;
          compliance_metadata?: Json | null;
          created_at?: string | null;
          created_by?: string | null;
          description?: string | null;
          due_at: string;
          id?: string;
          module: string;
          practice_id: string;
          priority?: string | null;
          regulatory_standards?: string[] | null;
          requires_photo?: boolean | null;
          return_notes?: string | null;
          returned_by?: string | null;
          returned_reason?: string | null;
          scheduled_at?: string | null;
          status?: string | null;
          template_id?: string | null;
          title: string;
          updated_at?: string | null;
        };
        Update: {
          assigned_to_role?: Database["public"]["Enums"]["user_role"] | null;
          assigned_to_user_id?: string | null;
          completed_at?: string | null;
          completion_time_seconds?: number | null;
          compliance_metadata?: Json | null;
          created_at?: string | null;
          created_by?: string | null;
          description?: string | null;
          due_at?: string;
          id?: string;
          module?: string;
          practice_id?: string;
          priority?: string | null;
          regulatory_standards?: string[] | null;
          requires_photo?: boolean | null;
          return_notes?: string | null;
          returned_by?: string | null;
          returned_reason?: string | null;
          scheduled_at?: string | null;
          status?: string | null;
          template_id?: string | null;
          title?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_user_id_fkey";
            columns: ["assigned_to_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_practice_id_fkey";
            columns: ["practice_id"];
            isOneToOne: false;
            referencedRelation: "practices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_returned_by_fkey";
            columns: ["returned_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "task_templates";
            referencedColumns: ["id"];
          },
        ];
      };
      temp_logs: {
        Row: {
          breach_flag: boolean | null;
          created_at: string | null;
          fridge_id: string;
          id: string;
          log_date: string;
          log_time: string;
          outcome: string | null;
          reading: number;
          recorded_by: string;
          remedial_action: string | null;
        };
        Insert: {
          breach_flag?: boolean | null;
          created_at?: string | null;
          fridge_id: string;
          id?: string;
          log_date: string;
          log_time: string;
          outcome?: string | null;
          reading: number;
          recorded_by: string;
          remedial_action?: string | null;
        };
        Update: {
          breach_flag?: boolean | null;
          created_at?: string | null;
          fridge_id?: string;
          id?: string;
          log_date?: string;
          log_time?: string;
          outcome?: string | null;
          reading?: number;
          recorded_by?: string;
          remedial_action?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "temp_logs_fridge_id_fkey";
            columns: ["fridge_id"];
            isOneToOne: false;
            referencedRelation: "fridges";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "temp_logs_recorded_by_fkey";
            columns: ["recorded_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      training_records: {
        Row: {
          certificate_evidence_id: string | null;
          completion_date: string;
          course_name: string;
          created_at: string | null;
          employee_id: string;
          expiry_date: string | null;
          id: string;
          is_mandatory: boolean | null;
          reminder_sent_at: string | null;
          training_provider: string | null;
          training_type_id: string | null;
        };
        Insert: {
          certificate_evidence_id?: string | null;
          completion_date: string;
          course_name: string;
          created_at?: string | null;
          employee_id: string;
          expiry_date?: string | null;
          id?: string;
          is_mandatory?: boolean | null;
          reminder_sent_at?: string | null;
          training_provider?: string | null;
          training_type_id?: string | null;
        };
        Update: {
          certificate_evidence_id?: string | null;
          completion_date?: string;
          course_name?: string;
          created_at?: string | null;
          employee_id?: string;
          expiry_date?: string | null;
          id?: string;
          is_mandatory?: boolean | null;
          reminder_sent_at?: string | null;
          training_provider?: string | null;
          training_type_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "training_records_certificate_evidence_id_fkey";
            columns: ["certificate_evidence_id"];
            isOneToOne: false;
            referencedRelation: "evidence_v2";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "training_records_employee_id_fkey";
            columns: ["employee_id"];
            isOneToOne: false;
            referencedRelation: "employee_self_service_data";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "training_records_employee_id_fkey";
            columns: ["employee_id"];
            isOneToOne: false;
            referencedRelation: "employees";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "training_records_training_type_id_fkey";
            columns: ["training_type_id"];
            isOneToOne: false;
            referencedRelation: "training_types";
            referencedColumns: ["id"];
          },
        ];
      };
      training_types: {
        Row: {
          audience_roles: string[] | null;
          certificate_required: boolean | null;
          created_at: string | null;
          id: string;
          key: string;
          level: string | null;
          practice_id: string;
          recurrence_months: number | null;
          tags: Json | null;
          title: string;
          updated_at: string | null;
        };
        Insert: {
          audience_roles?: string[] | null;
          certificate_required?: boolean | null;
          created_at?: string | null;
          id?: string;
          key: string;
          level?: string | null;
          practice_id: string;
          recurrence_months?: number | null;
          tags?: Json | null;
          title: string;
          updated_at?: string | null;
        };
        Update: {
          audience_roles?: string[] | null;
          certificate_required?: boolean | null;
          created_at?: string | null;
          id?: string;
          key?: string;
          level?: string | null;
          practice_id?: string;
          recurrence_months?: number | null;
          tags?: Json | null;
          title?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "training_types_practice_id_fkey";
            columns: ["practice_id"];
            isOneToOne: false;
            referencedRelation: "practices";
            referencedColumns: ["id"];
          },
        ];
      };
      user_auth_sensitive: {
        Row: {
          created_at: string;
          mfa_secret: string | null;
          phone_number: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          mfa_secret?: string | null;
          phone_number?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          mfa_secret?: string | null;
          phone_number?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_auth_sensitive_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      user_contact_details: {
        Row: {
          created_at: string;
          email: string;
          id: string;
          phone_number: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          id?: string;
          phone_number?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
          phone_number?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_contact_details_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          practice_id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          practice_id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          practice_id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_roles_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      users: {
        Row: {
          auth_user_id: string | null;
          created_at: string | null;
          id: string;
          is_active: boolean | null;
          is_master_user: boolean | null;
          is_practice_manager: boolean | null;
          mfa_enabled: boolean | null;
          name: string;
          practice_id: string;
          updated_at: string | null;
        };
        Insert: {
          auth_user_id?: string | null;
          created_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          is_master_user?: boolean | null;
          is_practice_manager?: boolean | null;
          mfa_enabled?: boolean | null;
          name: string;
          practice_id: string;
          updated_at?: string | null;
        };
        Update: {
          auth_user_id?: string | null;
          created_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          is_master_user?: boolean | null;
          is_practice_manager?: boolean | null;
          mfa_enabled?: boolean | null;
          name?: string;
          practice_id?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "users_practice_id_fkey";
            columns: ["practice_id"];
            isOneToOne: false;
            referencedRelation: "practices";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      employee_self_service_data: {
        Row: {
          appraisals_completed: number | null;
          dbs_check_date: string | null;
          dbs_next_review: string | null;
          id: string | null;
          last_appraisal_date: string | null;
          manager_id: string | null;
          name: string | null;
          practice_id: string | null;
          role: Database["public"]["Enums"]["user_role"] | null;
          start_date: string | null;
          training_count: number | null;
          user_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "employees_manager_id_fkey";
            columns: ["manager_id"];
            isOneToOne: false;
            referencedRelation: "employee_self_service_data";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "employees_manager_id_fkey";
            columns: ["manager_id"];
            isOneToOne: false;
            referencedRelation: "employees";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "employees_practice_id_fkey";
            columns: ["practice_id"];
            isOneToOne: false;
            referencedRelation: "practices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "employees_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      add_working_days: {
        Args: { days_to_add: number; start_date: string };
        Returns: string;
      };
      calculate_next_due_date: {
        Args: {
          _frequency: Database["public"]["Enums"]["process_frequency"];
          _occurrence_count?: number;
          _start_date: string;
        };
        Returns: string;
      };
      calculate_working_days: {
        Args: { end_date: string; start_date: string };
        Returns: number;
      };
      can_access_sensitive_user_field: {
        Args: { _target_user_id: string };
        Returns: boolean;
      };
      expire_old_notifications: { Args: never; Returns: undefined };
      get_candidate_email_audited: {
        Args: { _candidate_id: string };
        Returns: string;
      };
      get_current_user_practice_id: { Args: never; Returns: string };
      get_employee_email_audited: {
        Args: { _employee_id: string };
        Returns: string;
      };
      get_role_assignment_email_audited: {
        Args: { _assignment_id: string };
        Returns: string;
      };
      get_unacknowledged_policies_count: {
        Args: { p_user_id: string };
        Returns: number;
      };
      get_user_email_audited: { Args: { _user_id: string }; Returns: string };
      get_user_id_from_auth: { Args: never; Returns: string };
      get_user_mfa_status: {
        Args: { target_user_id?: string };
        Returns: {
          mfa_enabled: boolean;
          phone_configured: boolean;
          updated_at: string;
          user_id: string;
        }[];
      };
      get_user_practice_from_roles: {
        Args: { _user_id: string };
        Returns: string;
      };
      get_user_practice_id: { Args: { user_id: string }; Returns: string };
      get_user_profile: {
        Args: { user_id: string };
        Returns: {
          auth_user_id: string;
          created_at: string;
          email: string;
          id: string;
          is_active: boolean;
          is_master_user: boolean;
          is_practice_manager: boolean;
          mfa_enabled: boolean;
          name: string;
          phone_number: string;
          practice_id: string;
          role: Database["public"]["Enums"]["user_role"];
          updated_at: string;
        }[];
      };
      get_users_for_assignment: {
        Args: never;
        Returns: {
          id: string;
          is_active: boolean;
          name: string;
          practice_id: string;
          role: Database["public"]["Enums"]["app_role"];
        }[];
      };
      get_users_public_info: {
        Args: never;
        Returns: {
          auth_user_id: string;
          id: string;
          is_active: boolean;
          name: string;
          practice_id: string;
        }[];
      };
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][];
          _user_id: string;
        };
        Returns: boolean;
      };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      is_current_user_master: { Args: never; Returns: boolean };
      is_current_user_practice_manager: { Args: never; Returns: boolean };
      is_group_manager: { Args: { user_id: string }; Returns: boolean };
      is_in_same_practice: {
        Args: { _target_user_id: string; _user_id: string };
        Returns: boolean;
      };
      is_master_user: { Args: { user_id: string }; Returns: boolean };
      is_practice_manager: { Args: { user_id: string }; Returns: boolean };
      is_task_compliant: {
        Args: { _completed_at: string; _due_at: string; _sla_hours: number };
        Returns: boolean;
      };
      is_user_practice_manager_for_practice: {
        Args: { _practice_id: string; _user_id: string };
        Returns: boolean;
      };
      user_has_mfa_enabled: { Args: { _user_id: string }; Returns: boolean };
      verify_user_mfa_token: {
        Args: { _token: string; _user_id: string };
        Returns: boolean;
      };
    };
    Enums: {
      act_severity: "urgent" | "moderate" | "low";
      act_status: "open" | "in_progress" | "done";
      app_role:
        | "practice_manager"
        | "gp"
        | "nurse"
        | "administrator"
        | "nurse_lead"
        | "cd_lead_gp"
        | "estates_lead"
        | "ig_lead"
        | "reception_lead"
        | "hca"
        | "reception"
        | "auditor"
        | "group_manager";
      clean_frequency: "full" | "spot" | "check" | "periodic" | "touch";
      country_code: "Wales" | "England" | "Scotland";
      evidence_type: "photo" | "note" | "signature";
      frequency: "daily" | "weekly" | "monthly" | "quarterly" | "annually" | "as_needed";
      issue_status: "open" | "in_progress" | "resolved";
      notification_priority: "low" | "medium" | "high" | "urgent";
      notification_type:
        | "claim_reminder"
        | "ipc_audit_due"
        | "fire_assessment_due"
        | "coshh_due"
        | "legionella_due"
        | "room_assessment_due"
        | "dbs_review_due"
        | "training_expiry"
        | "appraisal_due"
        | "complaint_holding_letter"
        | "complaint_final_response"
        | "medical_request_reminder"
        | "medical_request_escalation"
        | "fridge_temp_alert"
        | "policy_review_due"
        | "task_overdue"
        | "general";
      onboarding_stage: "invited" | "registered" | "configured" | "live";
      process_frequency: "daily" | "weekly" | "monthly" | "quarterly" | "six_monthly" | "annual" | "twice_daily";
      process_status: "pending" | "in_progress" | "complete" | "blocked";
      responsible_role: "practice_manager" | "nurse" | "doctor" | "admin_staff" | "receptionist";
      step_status: "pending" | "complete" | "not_complete";
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
        | "group_manager";
      ynna: "yes" | "no" | "na";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      act_severity: ["urgent", "moderate", "low"],
      act_status: ["open", "in_progress", "done"],
      app_role: [
        "practice_manager",
        "gp",
        "nurse",
        "administrator",
        "nurse_lead",
        "cd_lead_gp",
        "estates_lead",
        "ig_lead",
        "reception_lead",
        "hca",
        "reception",
        "auditor",
        "group_manager",
      ],
      clean_frequency: ["full", "spot", "check", "periodic", "touch"],
      country_code: ["Wales", "England", "Scotland"],
      evidence_type: ["photo", "note", "signature"],
      frequency: ["daily", "weekly", "monthly", "quarterly", "annually", "as_needed"],
      issue_status: ["open", "in_progress", "resolved"],
      notification_priority: ["low", "medium", "high", "urgent"],
      notification_type: [
        "claim_reminder",
        "ipc_audit_due",
        "fire_assessment_due",
        "coshh_due",
        "legionella_due",
        "room_assessment_due",
        "dbs_review_due",
        "training_expiry",
        "appraisal_due",
        "complaint_holding_letter",
        "complaint_final_response",
        "medical_request_reminder",
        "medical_request_escalation",
        "fridge_temp_alert",
        "policy_review_due",
        "task_overdue",
        "general",
      ],
      onboarding_stage: ["invited", "registered", "configured", "live"],
      process_frequency: ["daily", "weekly", "monthly", "quarterly", "six_monthly", "annual", "twice_daily"],
      process_status: ["pending", "in_progress", "complete", "blocked"],
      responsible_role: ["practice_manager", "nurse", "doctor", "admin_staff", "receptionist"],
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
      ynna: ["yes", "no", "na"],
    },
  },
} as const;
