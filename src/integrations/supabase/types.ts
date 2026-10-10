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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      academic_sessions: {
        Row: {
          created_at: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          name: string
          name_bn: string | null
          start_date: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          name_bn?: string | null
          start_date?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_bn?: string | null
          start_date?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      address_custom: {
        Row: {
          action: string
          created_at: string | null
          id: string
          is_active: boolean | null
          level: string
          name: string
          name_en: string
          original_name_en: string | null
          parent_path: string | null
          post_code: string | null
          sort_order: number | null
          sub_type: string | null
          updated_at: string | null
        }
        Insert: {
          action?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          level?: string
          name: string
          name_en: string
          original_name_en?: string | null
          parent_path?: string | null
          post_code?: string | null
          sort_order?: number | null
          sub_type?: string | null
          updated_at?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          level?: string
          name?: string
          name_en?: string
          original_name_en?: string | null
          parent_path?: string | null
          post_code?: string | null
          sort_order?: number | null
          sub_type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      address_levels: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          key: string
          label: string
          label_bn: string
          parent_level_key: string | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          key: string
          label: string
          label_bn: string
          parent_level_key?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          key?: string
          label?: string
          label_bn?: string
          parent_level_key?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "address_levels_parent_level_key_fkey"
            columns: ["parent_level_key"]
            isOneToOne: false
            referencedRelation: "address_levels"
            referencedColumns: ["key"]
          },
        ]
      }
      admin_name_request_log: {
        Row: {
          caller_role: string | null
          caller_user_id: string | null
          correlation_id: string
          created_at: string
          duration_ms: number | null
          error_code: string | null
          error_message: string | null
          filters: Json | null
          id: string
          result_count: number | null
          source_path: string
          sql_path: string | null
        }
        Insert: {
          caller_role?: string | null
          caller_user_id?: string | null
          correlation_id: string
          created_at?: string
          duration_ms?: number | null
          error_code?: string | null
          error_message?: string | null
          filters?: Json | null
          id?: string
          result_count?: number | null
          source_path: string
          sql_path?: string | null
        }
        Update: {
          caller_role?: string | null
          caller_user_id?: string | null
          correlation_id?: string
          created_at?: string
          duration_ms?: number | null
          error_code?: string | null
          error_message?: string | null
          filters?: Json | null
          id?: string
          result_count?: number | null
          source_path?: string
          sql_path?: string | null
        }
        Relationships: []
      }
      administrative_departments: {
        Row: {
          code: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          name_bn: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          name_bn: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_bn?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      administrative_officers: {
        Row: {
          address: string | null
          created_at: string
          date_of_birth: string | null
          deleted_at: string | null
          department: string | null
          department_id: string | null
          designation: string | null
          duty_end_time: string | null
          duty_start_time: string | null
          education: string | null
          email: string | null
          employment_type: string | null
          experience: string | null
          extra_data: Json | null
          id: string
          joining_date: string | null
          name_bn: string
          name_en: string | null
          nid: string | null
          office_room: string | null
          officer_id: string | null
          phone: string | null
          photo_url: string | null
          previous_institute: string | null
          religion: string | null
          residence_type: string | null
          responsibilities: string | null
          salary: number | null
          salary_encrypted: string | null
          sort_order: number | null
          status: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          date_of_birth?: string | null
          deleted_at?: string | null
          department?: string | null
          department_id?: string | null
          designation?: string | null
          duty_end_time?: string | null
          duty_start_time?: string | null
          education?: string | null
          email?: string | null
          employment_type?: string | null
          experience?: string | null
          extra_data?: Json | null
          id?: string
          joining_date?: string | null
          name_bn: string
          name_en?: string | null
          nid?: string | null
          office_room?: string | null
          officer_id?: string | null
          phone?: string | null
          photo_url?: string | null
          previous_institute?: string | null
          religion?: string | null
          residence_type?: string | null
          responsibilities?: string | null
          salary?: number | null
          salary_encrypted?: string | null
          sort_order?: number | null
          status?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          date_of_birth?: string | null
          deleted_at?: string | null
          department?: string | null
          department_id?: string | null
          designation?: string | null
          duty_end_time?: string | null
          duty_start_time?: string | null
          education?: string | null
          email?: string | null
          employment_type?: string | null
          experience?: string | null
          extra_data?: Json | null
          id?: string
          joining_date?: string | null
          name_bn?: string
          name_en?: string | null
          nid?: string | null
          office_room?: string | null
          officer_id?: string | null
          phone?: string | null
          photo_url?: string | null
          previous_institute?: string | null
          religion?: string | null
          residence_type?: string | null
          responsibilities?: string | null
          salary?: number | null
          salary_encrypted?: string | null
          sort_order?: number | null
          status?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_admin_officers_department"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "administrative_departments"
            referencedColumns: ["id"]
          },
        ]
      }
      admission_test_attempts: {
        Row: {
          answers: Json | null
          applicant_address: string | null
          applicant_email: string | null
          applicant_guardian: string | null
          applicant_name: string
          applicant_nid_birth: string | null
          applicant_phone: string | null
          correct_count: number | null
          created_at: string | null
          duration_seconds: number | null
          id: string
          ip_address: string | null
          passed: boolean | null
          percentage: number | null
          rank: number | null
          score: number | null
          started_at: string | null
          status: string | null
          submitted_at: string | null
          test_id: string
          total_questions: number | null
        }
        Insert: {
          answers?: Json | null
          applicant_address?: string | null
          applicant_email?: string | null
          applicant_guardian?: string | null
          applicant_name: string
          applicant_nid_birth?: string | null
          applicant_phone?: string | null
          correct_count?: number | null
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          ip_address?: string | null
          passed?: boolean | null
          percentage?: number | null
          rank?: number | null
          score?: number | null
          started_at?: string | null
          status?: string | null
          submitted_at?: string | null
          test_id: string
          total_questions?: number | null
        }
        Update: {
          answers?: Json | null
          applicant_address?: string | null
          applicant_email?: string | null
          applicant_guardian?: string | null
          applicant_name?: string
          applicant_nid_birth?: string | null
          applicant_phone?: string | null
          correct_count?: number | null
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          ip_address?: string | null
          passed?: boolean | null
          percentage?: number | null
          rank?: number | null
          score?: number | null
          started_at?: string | null
          status?: string | null
          submitted_at?: string | null
          test_id?: string
          total_questions?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "admission_test_attempts_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "admission_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      admission_test_questions: {
        Row: {
          correct_answer: string
          created_at: string | null
          id: string
          marks: number | null
          options: Json
          question_text: string
          question_text_bn: string | null
          sort_order: number | null
          test_id: string
        }
        Insert: {
          correct_answer: string
          created_at?: string | null
          id?: string
          marks?: number | null
          options?: Json
          question_text: string
          question_text_bn?: string | null
          sort_order?: number | null
          test_id: string
        }
        Update: {
          correct_answer?: string
          created_at?: string | null
          id?: string
          marks?: number | null
          options?: Json
          question_text?: string
          question_text_bn?: string | null
          sort_order?: number | null
          test_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admission_test_questions_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "admission_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      admission_tests: {
        Row: {
          academic_session_id: string | null
          class_id: string | null
          closes_at: string | null
          created_at: string | null
          deleted_at: string | null
          description: string | null
          description_bn: string | null
          duration_minutes: number
          id: string
          instructions: string | null
          instructions_bn: string | null
          is_published: boolean | null
          merit_approval_status: string
          merit_decided_at: string | null
          merit_decided_by: string | null
          merit_rejection_reason: string | null
          merit_submitted_at: string | null
          merit_submitted_by: string | null
          opens_at: string | null
          pass_mark: number
          show_result_immediately: boolean | null
          shuffle_questions: boolean | null
          title: string
          title_bn: string
          total_marks: number
          updated_at: string | null
        }
        Insert: {
          academic_session_id?: string | null
          class_id?: string | null
          closes_at?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          description_bn?: string | null
          duration_minutes?: number
          id?: string
          instructions?: string | null
          instructions_bn?: string | null
          is_published?: boolean | null
          merit_approval_status?: string
          merit_decided_at?: string | null
          merit_decided_by?: string | null
          merit_rejection_reason?: string | null
          merit_submitted_at?: string | null
          merit_submitted_by?: string | null
          opens_at?: string | null
          pass_mark?: number
          show_result_immediately?: boolean | null
          shuffle_questions?: boolean | null
          title: string
          title_bn: string
          total_marks?: number
          updated_at?: string | null
        }
        Update: {
          academic_session_id?: string | null
          class_id?: string | null
          closes_at?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          description_bn?: string | null
          duration_minutes?: number
          id?: string
          instructions?: string | null
          instructions_bn?: string | null
          is_published?: boolean | null
          merit_approval_status?: string
          merit_decided_at?: string | null
          merit_decided_by?: string | null
          merit_rejection_reason?: string | null
          merit_submitted_at?: string | null
          merit_submitted_by?: string | null
          opens_at?: string | null
          pass_mark?: number
          show_result_immediately?: boolean | null
          shuffle_questions?: boolean | null
          title?: string
          title_bn?: string
          total_marks?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admission_tests_academic_session_id_fkey"
            columns: ["academic_session_id"]
            isOneToOne: false
            referencedRelation: "academic_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admission_tests_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      api_verification_config: {
        Row: {
          api_key: string
          api_url: string
          created_at: string | null
          field_mappings: Json
          id: string
          is_enabled: boolean
          master_password: string
          updated_at: string | null
        }
        Insert: {
          api_key?: string
          api_url?: string
          created_at?: string | null
          field_mappings?: Json
          id?: string
          is_enabled?: boolean
          master_password?: string
          updated_at?: string | null
        }
        Update: {
          api_key?: string
          api_url?: string
          created_at?: string | null
          field_mappings?: Json
          id?: string
          is_enabled?: boolean
          master_password?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          created_at: string
          description: string | null
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      attendance_devices: {
        Row: {
          config: Json | null
          created_at: string | null
          device_type: string
          id: string
          ip_address: string | null
          is_active: boolean | null
          last_sync_at: string | null
          location: string | null
          location_bn: string | null
          model: string | null
          name: string
          name_bn: string
          port: number | null
          serial_number: string | null
          updated_at: string | null
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          device_type?: string
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_sync_at?: string | null
          location?: string | null
          location_bn?: string | null
          model?: string | null
          name: string
          name_bn: string
          port?: number | null
          serial_number?: string | null
          updated_at?: string | null
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          device_type?: string
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_sync_at?: string | null
          location?: string | null
          location_bn?: string | null
          model?: string | null
          name?: string
          name_bn?: string
          port?: number | null
          serial_number?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      attendance_records: {
        Row: {
          attendance_date: string
          check_in_time: string | null
          check_out_time: string | null
          created_at: string | null
          entity_id: string
          entity_type: string
          id: string
          leave_reason: string | null
          leave_type: string | null
          recorded_by: string | null
          remarks: string | null
          shift: string
          status: string
          updated_at: string | null
        }
        Insert: {
          attendance_date?: string
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string | null
          entity_id: string
          entity_type?: string
          id?: string
          leave_reason?: string | null
          leave_type?: string | null
          recorded_by?: string | null
          remarks?: string | null
          shift?: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          attendance_date?: string
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          leave_reason?: string | null
          leave_type?: string | null
          recorded_by?: string | null
          remarks?: string | null
          shift?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      attendance_rules: {
        Row: {
          config: Json
          created_at: string | null
          entity_type: string
          id: string
          is_active: boolean | null
          name: string
          name_bn: string
          rule_type: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          config?: Json
          created_at?: string | null
          entity_type?: string
          id?: string
          is_active?: boolean | null
          name: string
          name_bn: string
          rule_type?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          config?: Json
          created_at?: string | null
          entity_type?: string
          id?: string
          is_active?: boolean | null
          name?: string
          name_bn?: string
          rule_type?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      authorized_audit_devices: {
        Row: {
          added_by: string | null
          created_at: string
          device_id: string
          id: string
          is_active: boolean
          label: string | null
          notes: string | null
          revoked_at: string | null
          revoked_by: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          device_id: string
          id?: string
          is_active?: boolean
          label?: string | null
          notes?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          added_by?: string | null
          created_at?: string
          device_id?: string
          id?: string
          is_active?: boolean
          label?: string | null
          notes?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      backup_history: {
        Row: {
          backup_type: string
          completed_at: string | null
          created_at: string
          error_message: string | null
          file_size_bytes: number | null
          id: string
          row_count: number | null
          started_at: string
          status: string
          storage_path: string | null
          table_count: number | null
          triggered_by: string | null
        }
        Insert: {
          backup_type?: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          file_size_bytes?: number | null
          id?: string
          row_count?: number | null
          started_at?: string
          status?: string
          storage_path?: string | null
          table_count?: number | null
          triggered_by?: string | null
        }
        Update: {
          backup_type?: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          file_size_bytes?: number | null
          id?: string
          row_count?: number | null
          started_at?: string
          status?: string
          storage_path?: string | null
          table_count?: number | null
          triggered_by?: string | null
        }
        Relationships: []
      }
      blocked_devices: {
        Row: {
          attempt_count: number
          blocked_at: string
          blocked_by: string | null
          created_at: string
          device_id: string
          id: string
          is_active: boolean
          last_attempt_at: string
          last_city: string | null
          last_country: string | null
          last_ip: string | null
          last_upazila: string | null
          last_user_agent: string | null
          last_village: string | null
          notes: string | null
          reason: string
          unblocked_at: string | null
          unblocked_by: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          attempt_count?: number
          blocked_at?: string
          blocked_by?: string | null
          created_at?: string
          device_id: string
          id?: string
          is_active?: boolean
          last_attempt_at?: string
          last_city?: string | null
          last_country?: string | null
          last_ip?: string | null
          last_upazila?: string | null
          last_user_agent?: string | null
          last_village?: string | null
          notes?: string | null
          reason: string
          unblocked_at?: string | null
          unblocked_by?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          attempt_count?: number
          blocked_at?: string
          blocked_by?: string | null
          created_at?: string
          device_id?: string
          id?: string
          is_active?: boolean
          last_attempt_at?: string
          last_city?: string | null
          last_country?: string | null
          last_ip?: string | null
          last_upazila?: string | null
          last_user_agent?: string | null
          last_village?: string | null
          notes?: string | null
          reason?: string
          unblocked_at?: string | null
          unblocked_by?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      budgets: {
        Row: {
          budget_type: string
          category_id: string | null
          created_at: string
          deleted_at: string | null
          fiscal_year: string
          id: string
          institution_id: string | null
          name: string
          name_bn: string
          notes: string | null
          period_end: string
          period_start: string
          planned_amount: number
          status: string
          updated_at: string
        }
        Insert: {
          budget_type?: string
          category_id?: string | null
          created_at?: string
          deleted_at?: string | null
          fiscal_year: string
          id?: string
          institution_id?: string | null
          name: string
          name_bn: string
          notes?: string | null
          period_end: string
          period_start: string
          planned_amount?: number
          status?: string
          updated_at?: string
        }
        Update: {
          budget_type?: string
          category_id?: string | null
          created_at?: string
          deleted_at?: string | null
          fiscal_year?: string
          id?: string
          institution_id?: string | null
          name?: string
          name_bn?: string
          notes?: string | null
          period_end?: string
          period_start?: string
          planned_amount?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "expense_institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      certificate_templates: {
        Row: {
          config: Json
          created_at: string | null
          id: string
          is_active: boolean | null
          template_type: string
          updated_at: string | null
        }
        Insert: {
          config?: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          template_type: string
          updated_at?: string | null
        }
        Update: {
          config?: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          template_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          attachments: Json
          body: string | null
          conversation_id: string
          created_at: string
          deleted_at: string | null
          id: string
          sender_id: string
          updated_at: string
        }
        Insert: {
          attachments?: Json
          body?: string | null
          conversation_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          sender_id: string
          updated_at?: string
        }
        Update: {
          attachments?: Json
          body?: string | null
          conversation_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          sender_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      class_routines: {
        Row: {
          academic_session_id: string | null
          class_id: string
          created_at: string | null
          effective_from: string | null
          effective_to: string | null
          id: string
          is_active: boolean | null
          name: string
          name_bn: string
          updated_at: string | null
        }
        Insert: {
          academic_session_id?: string | null
          class_id: string
          created_at?: string | null
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          name_bn: string
          updated_at?: string | null
        }
        Update: {
          academic_session_id?: string | null
          class_id?: string
          created_at?: string | null
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_bn?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_routines_academic_session_id_fkey"
            columns: ["academic_session_id"]
            isOneToOne: false
            referencedRelation: "academic_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_routines_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          created_at: string | null
          division_id: string
          id: string
          is_active: boolean | null
          name: string
          name_ar: string | null
          name_bn: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          division_id: string
          id?: string
          is_active?: boolean | null
          name: string
          name_ar?: string | null
          name_bn: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          division_id?: string
          id?: string
          is_active?: boolean | null
          name?: string
          name_ar?: string | null
          name_bn?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classes_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
        ]
      }
      committee_attachments: {
        Row: {
          committee_id: string
          created_at: string
          deleted_at: string | null
          description: string | null
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          mime_type: string | null
          storage_path: string
          updated_at: string
          uploaded_by: string | null
          uploaded_by_email: string | null
        }
        Insert: {
          committee_id: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          mime_type?: string | null
          storage_path: string
          updated_at?: string
          uploaded_by?: string | null
          uploaded_by_email?: string | null
        }
        Update: {
          committee_id?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          mime_type?: string | null
          storage_path?: string
          updated_at?: string
          uploaded_by?: string | null
          uploaded_by_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "committee_attachments_committee_id_fkey"
            columns: ["committee_id"]
            isOneToOne: false
            referencedRelation: "committees"
            referencedColumns: ["id"]
          },
        ]
      }
      committee_audit_log: {
        Row: {
          action: string
          committee_id: string | null
          committee_name: string | null
          created_at: string
          designation: string | null
          details: Json | null
          id: string
          member_id: string | null
          member_name: string | null
          performed_by: string | null
          performed_by_email: string | null
          staff_id: string | null
        }
        Insert: {
          action: string
          committee_id?: string | null
          committee_name?: string | null
          created_at?: string
          designation?: string | null
          details?: Json | null
          id?: string
          member_id?: string | null
          member_name?: string | null
          performed_by?: string | null
          performed_by_email?: string | null
          staff_id?: string | null
        }
        Update: {
          action?: string
          committee_id?: string | null
          committee_name?: string | null
          created_at?: string
          designation?: string | null
          details?: Json | null
          id?: string
          member_id?: string | null
          member_name?: string | null
          performed_by?: string | null
          performed_by_email?: string | null
          staff_id?: string | null
        }
        Relationships: []
      }
      committee_members: {
        Row: {
          address: string | null
          allow_overlap: boolean
          committee_id: string
          created_at: string
          deleted_at: string | null
          designation: string
          designation_en: string | null
          email: string | null
          id: string
          is_active: boolean
          joining_date: string | null
          name: string
          name_en: string | null
          nid: string | null
          notes: string | null
          occupation: string | null
          occupation_en: string | null
          phone: string | null
          photo_url: string | null
          sort_order: number
          staff_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          allow_overlap?: boolean
          committee_id: string
          created_at?: string
          deleted_at?: string | null
          designation: string
          designation_en?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          joining_date?: string | null
          name: string
          name_en?: string | null
          nid?: string | null
          notes?: string | null
          occupation?: string | null
          occupation_en?: string | null
          phone?: string | null
          photo_url?: string | null
          sort_order?: number
          staff_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          allow_overlap?: boolean
          committee_id?: string
          created_at?: string
          deleted_at?: string | null
          designation?: string
          designation_en?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          joining_date?: string | null
          name?: string
          name_en?: string | null
          nid?: string | null
          notes?: string | null
          occupation?: string | null
          occupation_en?: string | null
          phone?: string | null
          photo_url?: string | null
          sort_order?: number
          staff_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "committee_members_committee_id_fkey"
            columns: ["committee_id"]
            isOneToOne: false
            referencedRelation: "committees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "committee_members_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      committees: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string | null
          description_en: string | null
          expiry_date: string | null
          formation_date: string | null
          id: string
          is_active: boolean
          name: string
          name_en: string | null
          sort_order: number
          tenure_months: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          description_en?: string | null
          expiry_date?: string | null
          formation_date?: string | null
          id?: string
          is_active?: boolean
          name: string
          name_en?: string | null
          sort_order?: number
          tenure_months?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          description_en?: string | null
          expiry_date?: string | null
          formation_date?: string | null
          id?: string
          is_active?: boolean
          name?: string
          name_en?: string | null
          sort_order?: number
          tenure_months?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      complaint_field_config: {
        Row: {
          created_at: string
          display_order: number
          field_key: string
          field_type: string
          id: string
          is_locked: boolean
          is_required: boolean
          is_visible: boolean
          label_bn: string
          label_en: string
          max_length: number | null
          min_length: number | null
          options: Json | null
          placeholder_bn: string | null
          placeholder_en: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          field_key: string
          field_type?: string
          id?: string
          is_locked?: boolean
          is_required?: boolean
          is_visible?: boolean
          label_bn: string
          label_en: string
          max_length?: number | null
          min_length?: number | null
          options?: Json | null
          placeholder_bn?: string | null
          placeholder_en?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          field_key?: string
          field_type?: string
          id?: string
          is_locked?: boolean
          is_required?: boolean
          is_visible?: boolean
          label_bn?: string
          label_en?: string
          max_length?: number | null
          min_length?: number | null
          options?: Json | null
          placeholder_bn?: string | null
          placeholder_en?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      complaint_updates: {
        Row: {
          complaint_id: string
          created_at: string
          created_by: string | null
          from_status: string | null
          id: string
          is_public: boolean
          message: string | null
          to_status: string | null
          update_type: string
        }
        Insert: {
          complaint_id: string
          created_at?: string
          created_by?: string | null
          from_status?: string | null
          id?: string
          is_public?: boolean
          message?: string | null
          to_status?: string | null
          update_type: string
        }
        Update: {
          complaint_id?: string
          created_at?: string
          created_by?: string | null
          from_status?: string | null
          id?: string
          is_public?: boolean
          message?: string | null
          to_status?: string | null
          update_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "complaint_updates_complaint_id_fkey"
            columns: ["complaint_id"]
            isOneToOne: false
            referencedRelation: "complaints"
            referencedColumns: ["id"]
          },
        ]
      }
      complaints: {
        Row: {
          assigned_to: string | null
          attachments: Json | null
          category: string
          complainant_address: string | null
          complainant_email: string | null
          complainant_name: string | null
          complainant_phone: string | null
          complainant_student_id: string | null
          contact_verification_method: string | null
          contact_verified: boolean
          contact_verified_at: string | null
          created_at: string
          deleted_at: string | null
          description: string
          id: string
          ip_address: string | null
          is_anonymous: boolean
          priority: string
          related_student_id: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          subject: string
          ticket_number: string | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          attachments?: Json | null
          category?: string
          complainant_address?: string | null
          complainant_email?: string | null
          complainant_name?: string | null
          complainant_phone?: string | null
          complainant_student_id?: string | null
          contact_verification_method?: string | null
          contact_verified?: boolean
          contact_verified_at?: string | null
          created_at?: string
          deleted_at?: string | null
          description: string
          id?: string
          ip_address?: string | null
          is_anonymous?: boolean
          priority?: string
          related_student_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          subject: string
          ticket_number?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          attachments?: Json | null
          category?: string
          complainant_address?: string | null
          complainant_email?: string | null
          complainant_name?: string | null
          complainant_phone?: string | null
          complainant_student_id?: string | null
          contact_verification_method?: string | null
          contact_verified?: boolean
          contact_verified_at?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string
          id?: string
          ip_address?: string | null
          is_anonymous?: boolean
          priority?: string
          related_student_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          subject?: string
          ticket_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "complaints_related_student_id_fkey"
            columns: ["related_student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complaints_related_student_id_fkey"
            columns: ["related_student_id"]
            isOneToOne: false
            referencedRelation: "students_public"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          last_read_at: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          last_read_at?: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          last_read_at?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          id: string
          last_message_at: string
          title: string | null
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          last_message_at?: string
          title?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          last_message_at?: string
          title?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      custom_form_fields: {
        Row: {
          created_at: string | null
          default_value: string | null
          field_type: string
          form_id: string
          id: string
          is_active: boolean | null
          is_required: boolean | null
          label: string
          label_bn: string
          options: Json | null
          placeholder: string | null
          section: string | null
          sort_order: number | null
          updated_at: string | null
          validation: Json | null
        }
        Insert: {
          created_at?: string | null
          default_value?: string | null
          field_type?: string
          form_id: string
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          label: string
          label_bn: string
          options?: Json | null
          placeholder?: string | null
          section?: string | null
          sort_order?: number | null
          updated_at?: string | null
          validation?: Json | null
        }
        Update: {
          created_at?: string | null
          default_value?: string | null
          field_type?: string
          form_id?: string
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          label?: string
          label_bn?: string
          options?: Json | null
          placeholder?: string | null
          section?: string | null
          sort_order?: number | null
          updated_at?: string | null
          validation?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_form_fields_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "custom_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_form_submissions: {
        Row: {
          created_at: string | null
          data: Json
          form_id: string
          id: string
          status: string
          submitted_by: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data?: Json
          form_id: string
          id?: string
          status?: string
          submitted_by?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data?: Json
          form_id?: string
          id?: string
          status?: string
          submitted_by?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_form_submissions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "custom_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_forms: {
        Row: {
          created_at: string | null
          description: string | null
          form_type: string
          id: string
          is_active: boolean | null
          menu_slug: string | null
          name: string
          name_bn: string
          parent_menu: string | null
          publish_to: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          form_type?: string
          id?: string
          is_active?: boolean | null
          menu_slug?: string | null
          name: string
          name_bn: string
          parent_menu?: string | null
          publish_to?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          form_type?: string
          id?: string
          is_active?: boolean | null
          menu_slug?: string | null
          name?: string
          name_bn?: string
          parent_menu?: string | null
          publish_to?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      custom_roles: {
        Row: {
          allowed_categories: string[]
          base_role: string
          created_at: string | null
          description: string | null
          description_bn: string | null
          id: string
          is_active: boolean | null
          is_system: boolean | null
          name: string
          name_bn: string
          permissions_template: Json | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          allowed_categories?: string[]
          base_role?: string
          created_at?: string | null
          description?: string | null
          description_bn?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name: string
          name_bn: string
          permissions_template?: Json | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          allowed_categories?: string[]
          base_role?: string
          created_at?: string | null
          description?: string | null
          description_bn?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name?: string
          name_bn?: string
          permissions_template?: Json | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      deposits: {
        Row: {
          amount: number
          bank_details: string | null
          created_at: string | null
          deposit_date: string
          id: string
          month_year: string
          other_details: string | null
          source: string | null
          updated_at: string | null
        }
        Insert: {
          amount?: number
          bank_details?: string | null
          created_at?: string | null
          deposit_date?: string
          id?: string
          month_year: string
          other_details?: string | null
          source?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          bank_details?: string | null
          created_at?: string | null
          deposit_date?: string
          id?: string
          month_year?: string
          other_details?: string | null
          source?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      design_projects: {
        Row: {
          background: string
          canvas_json: Json
          created_at: string
          deleted_at: string | null
          height: number
          id: string
          name: string
          thumbnail: string | null
          updated_at: string
          user_id: string
          version_history: Json
          width: number
        }
        Insert: {
          background?: string
          canvas_json?: Json
          created_at?: string
          deleted_at?: string | null
          height?: number
          id?: string
          name?: string
          thumbnail?: string | null
          updated_at?: string
          user_id: string
          version_history?: Json
          width?: number
        }
        Update: {
          background?: string
          canvas_json?: Json
          created_at?: string
          deleted_at?: string | null
          height?: number
          id?: string
          name?: string
          thumbnail?: string | null
          updated_at?: string
          user_id?: string
          version_history?: Json
          width?: number
        }
        Relationships: []
      }
      design_templates: {
        Row: {
          background: string
          canvas_json: Json
          category: string
          created_at: string
          description: string | null
          height: number
          id: string
          is_system: boolean
          name: string
          tags: string[] | null
          thumbnail: string | null
          updated_at: string
          user_id: string | null
          width: number
        }
        Insert: {
          background?: string
          canvas_json?: Json
          category?: string
          created_at?: string
          description?: string | null
          height?: number
          id?: string
          is_system?: boolean
          name: string
          tags?: string[] | null
          thumbnail?: string | null
          updated_at?: string
          user_id?: string | null
          width?: number
        }
        Update: {
          background?: string
          canvas_json?: Json
          category?: string
          created_at?: string
          description?: string | null
          height?: number
          id?: string
          is_system?: boolean
          name?: string
          tags?: string[] | null
          thumbnail?: string | null
          updated_at?: string
          user_id?: string | null
          width?: number
        }
        Relationships: []
      }
      designations: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          name_bn: string
          sort_order: number | null
          staff_category: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          name_bn: string
          sort_order?: number | null
          staff_category?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_bn?: string
          sort_order?: number | null
          staff_category?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      device_approval_requests: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          device_id: string
          device_model: string | null
          id: string
          ip_address: string | null
          latitude: number | null
          longitude: number | null
          region: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          upazila: string | null
          updated_at: string
          user_agent: string | null
          user_id: string
          village: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          device_id: string
          device_model?: string | null
          id?: string
          ip_address?: string | null
          latitude?: number | null
          longitude?: number | null
          region?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          upazila?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id: string
          village?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          device_id?: string
          device_model?: string | null
          id?: string
          ip_address?: string | null
          latitude?: number | null
          longitude?: number | null
          region?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          upazila?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string
          village?: string | null
        }
        Relationships: []
      }
      device_block_history: {
        Row: {
          action: string
          city: string | null
          country: string | null
          device_id: string
          id: string
          ip_address: string | null
          notes: string | null
          performed_at: string
          performed_by: string | null
          reason: string
          upazila: string | null
          user_agent: string | null
          user_id: string | null
          village: string | null
        }
        Insert: {
          action: string
          city?: string | null
          country?: string | null
          device_id: string
          id?: string
          ip_address?: string | null
          notes?: string | null
          performed_at?: string
          performed_by?: string | null
          reason: string
          upazila?: string | null
          user_agent?: string | null
          user_id?: string | null
          village?: string | null
        }
        Update: {
          action?: string
          city?: string | null
          country?: string | null
          device_id?: string
          id?: string
          ip_address?: string | null
          notes?: string | null
          performed_at?: string
          performed_by?: string | null
          reason?: string
          upazila?: string | null
          user_agent?: string | null
          user_id?: string | null
          village?: string | null
        }
        Relationships: []
      }
      device_route_allowlist: {
        Row: {
          approved_by: string | null
          created_at: string
          device_id: string
          id: string
          is_active: boolean
          notes: string | null
          route_path: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          device_id: string
          id?: string
          is_active?: boolean
          notes?: string | null
          route_path: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          device_id?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          route_path?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      divisions: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          name_ar: string | null
          name_bn: string
          prefix: string | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          name_ar?: string | null
          name_bn: string
          prefix?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_ar?: string | null
          name_bn?: string
          prefix?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      document_layouts: {
        Row: {
          category: string
          config: Json
          created_at: string | null
          id: string
          is_active: boolean | null
          layout_type: string
          name: string
          name_bn: string
          updated_at: string | null
        }
        Insert: {
          category?: string
          config?: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          layout_type?: string
          name: string
          name_bn: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          config?: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          layout_type?: string
          name?: string
          name_bn?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      donation_purposes: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          key: string
          label_bn: string
          label_en: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          key: string
          label_bn: string
          label_en: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          key?: string
          label_bn?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      donors: {
        Row: {
          address: string | null
          created_at: string | null
          deleted_at: string | null
          donation_amount: number | null
          donation_date: string | null
          donation_type: string | null
          email: string | null
          failed_reason: string | null
          id: string
          name_bn: string
          name_en: string | null
          nid: string | null
          notes: string | null
          payment_status: string
          phone: string | null
          purpose: string | null
          purpose_key: string | null
          receipt_number: string | null
          receipt_sent_at: string | null
          sender_number: string | null
          status: string | null
          updated_at: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          deleted_at?: string | null
          donation_amount?: number | null
          donation_date?: string | null
          donation_type?: string | null
          email?: string | null
          failed_reason?: string | null
          id?: string
          name_bn: string
          name_en?: string | null
          nid?: string | null
          notes?: string | null
          payment_status?: string
          phone?: string | null
          purpose?: string | null
          purpose_key?: string | null
          receipt_number?: string | null
          receipt_sent_at?: string | null
          sender_number?: string | null
          status?: string | null
          updated_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          deleted_at?: string | null
          donation_amount?: number | null
          donation_date?: string | null
          donation_type?: string | null
          email?: string | null
          failed_reason?: string | null
          id?: string
          name_bn?: string
          name_en?: string | null
          nid?: string | null
          notes?: string | null
          payment_status?: string
          phone?: string | null
          purpose?: string | null
          purpose_key?: string | null
          receipt_number?: string | null
          receipt_sent_at?: string | null
          sender_number?: string | null
          status?: string | null
          updated_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      duty_change_audit: {
        Row: {
          action: string
          changed_by: string | null
          changed_by_name: string | null
          created_at: string
          duty_date: string | null
          id: string
          ip_address: string | null
          new_value: Json | null
          old_value: Json | null
          shift_id: string | null
          shift_name: string | null
          source: string
          staff_id: string | null
          staff_name: string | null
          user_agent: string | null
          weekday: number | null
        }
        Insert: {
          action: string
          changed_by?: string | null
          changed_by_name?: string | null
          created_at?: string
          duty_date?: string | null
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          old_value?: Json | null
          shift_id?: string | null
          shift_name?: string | null
          source: string
          staff_id?: string | null
          staff_name?: string | null
          user_agent?: string | null
          weekday?: number | null
        }
        Update: {
          action?: string
          changed_by?: string | null
          changed_by_name?: string | null
          created_at?: string
          duty_date?: string | null
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          old_value?: Json | null
          shift_id?: string | null
          shift_name?: string | null
          source?: string
          staff_id?: string | null
          staff_name?: string | null
          user_agent?: string | null
          weekday?: number | null
        }
        Relationships: []
      }
      duty_roster: {
        Row: {
          created_at: string
          created_by: string | null
          duty_date: string
          id: string
          note: string | null
          shift_id: string
          staff_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          duty_date: string
          id?: string
          note?: string | null
          shift_id: string
          staff_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          duty_date?: string
          id?: string
          note?: string | null
          shift_id?: string
          staff_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "duty_roster_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "duty_shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      duty_shift_attendance: {
        Row: {
          check_in_time: string | null
          check_out_time: string | null
          created_at: string
          created_by: string | null
          device_id: string | null
          duty_date: string
          early_exit_minutes: number
          id: string
          late_minutes: number
          note: string | null
          shift_id: string
          source: string
          staff_id: string
          status: string
          updated_at: string
        }
        Insert: {
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string
          created_by?: string | null
          device_id?: string | null
          duty_date: string
          early_exit_minutes?: number
          id?: string
          late_minutes?: number
          note?: string | null
          shift_id: string
          source?: string
          staff_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string
          created_by?: string | null
          device_id?: string | null
          duty_date?: string
          early_exit_minutes?: number
          id?: string
          late_minutes?: number
          note?: string | null
          shift_id?: string
          source?: string
          staff_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "duty_shift_attendance_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "duty_shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      duty_shifts: {
        Row: {
          absent_deduction_amount: number
          attendance_mode: string
          code: string
          created_at: string
          deleted_at: string | null
          early_exit_grace_minutes: number
          end_time: string
          grace_minutes: number
          id: string
          is_active: boolean
          late_deduction_amount: number | null
          late_deduction_enabled: boolean
          late_deduction_free_minutes: number
          late_deduction_mode: string
          machine_close_after_minutes: number
          machine_enabled: boolean
          machine_open_before_minutes: number
          name_bn: string
          name_en: string | null
          notes: string | null
          pay_amount: number | null
          pay_type: string | null
          sort_order: number
          start_time: string
          updated_at: string
        }
        Insert: {
          absent_deduction_amount?: number
          attendance_mode?: string
          code: string
          created_at?: string
          deleted_at?: string | null
          early_exit_grace_minutes?: number
          end_time?: string
          grace_minutes?: number
          id?: string
          is_active?: boolean
          late_deduction_amount?: number | null
          late_deduction_enabled?: boolean
          late_deduction_free_minutes?: number
          late_deduction_mode?: string
          machine_close_after_minutes?: number
          machine_enabled?: boolean
          machine_open_before_minutes?: number
          name_bn: string
          name_en?: string | null
          notes?: string | null
          pay_amount?: number | null
          pay_type?: string | null
          sort_order?: number
          start_time?: string
          updated_at?: string
        }
        Update: {
          absent_deduction_amount?: number
          attendance_mode?: string
          code?: string
          created_at?: string
          deleted_at?: string | null
          early_exit_grace_minutes?: number
          end_time?: string
          grace_minutes?: number
          id?: string
          is_active?: boolean
          late_deduction_amount?: number | null
          late_deduction_enabled?: boolean
          late_deduction_free_minutes?: number
          late_deduction_mode?: string
          machine_close_after_minutes?: number
          machine_enabled?: boolean
          machine_open_before_minutes?: number
          name_bn?: string
          name_en?: string | null
          notes?: string | null
          pay_amount?: number | null
          pay_type?: string | null
          sort_order?: number
          start_time?: string
          updated_at?: string
        }
        Relationships: []
      }
      duty_weekly_template: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          shift_id: string
          staff_id: string
          updated_at: string
          weekday: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          shift_id: string
          staff_id: string
          updated_at?: string
          weekday: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          shift_id?: string
          staff_id?: string
          updated_at?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "duty_weekly_template_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "duty_shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      email_delivery_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          metadata: Json | null
          recipient_email: string
          recipient_name: string | null
          status: string
          subject: string | null
          template_kind: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          recipient_email: string
          recipient_name?: string | null
          status: string
          subject?: string | null
          template_kind: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          recipient_email?: string
          recipient_name?: string | null
          status?: string
          subject?: string | null
          template_kind?: string
        }
        Relationships: []
      }
      email_template_versions: {
        Row: {
          brand_color: string | null
          change_note: string | null
          changed_by: string | null
          changed_by_email: string | null
          created_at: string
          html_body: string
          id: string
          subject: string
          template_id: string
          template_key: string
          version_number: number
        }
        Insert: {
          brand_color?: string | null
          change_note?: string | null
          changed_by?: string | null
          changed_by_email?: string | null
          created_at?: string
          html_body: string
          id?: string
          subject: string
          template_id: string
          template_key: string
          version_number: number
        }
        Update: {
          brand_color?: string | null
          change_note?: string | null
          changed_by?: string | null
          changed_by_email?: string | null
          created_at?: string
          html_body?: string
          id?: string
          subject?: string
          template_id?: string
          template_key?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "email_template_versions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          brand_color: string | null
          created_at: string
          description: string | null
          html_body: string
          id: string
          is_enabled: boolean
          is_system: boolean
          name: string
          subject: string
          template_key: string
          updated_at: string
          variables: Json | null
        }
        Insert: {
          brand_color?: string | null
          created_at?: string
          description?: string | null
          html_body: string
          id?: string
          is_enabled?: boolean
          is_system?: boolean
          name: string
          subject: string
          template_key: string
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          brand_color?: string | null
          created_at?: string
          description?: string | null
          html_body?: string
          id?: string
          is_enabled?: boolean
          is_system?: boolean
          name?: string
          subject?: string
          template_key?: string
          updated_at?: string
          variables?: Json | null
        }
        Relationships: []
      }
      emailjs_config: {
        Row: {
          created_at: string
          id: string
          is_enabled: boolean
          otp_expiry_minutes: number
          public_key: string
          service_id: string
          template_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          otp_expiry_minutes?: number
          public_key?: string
          service_id?: string
          template_id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          otp_expiry_minutes?: number
          public_key?: string
          service_id?: string
          template_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      encryption_keys: {
        Row: {
          created_at: string
          id: string
          key_value: string
          rotated_at: string | null
        }
        Insert: {
          created_at?: string
          id: string
          key_value: string
          rotated_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          key_value?: string
          rotated_at?: string | null
        }
        Relationships: []
      }
      exam_routine_entries: {
        Row: {
          class_id: string | null
          created_at: string | null
          end_time: string
          exam_date: string
          id: string
          notes: string | null
          notes_bn: string | null
          room: string | null
          routine_id: string
          sort_order: number | null
          start_time: string
          subject_id: string | null
          updated_at: string | null
        }
        Insert: {
          class_id?: string | null
          created_at?: string | null
          end_time: string
          exam_date: string
          id?: string
          notes?: string | null
          notes_bn?: string | null
          room?: string | null
          routine_id: string
          sort_order?: number | null
          start_time: string
          subject_id?: string | null
          updated_at?: string | null
        }
        Update: {
          class_id?: string | null
          created_at?: string | null
          end_time?: string
          exam_date?: string
          id?: string
          notes?: string | null
          notes_bn?: string | null
          room?: string | null
          routine_id?: string
          sort_order?: number | null
          start_time?: string
          subject_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_routine_entries_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_routine_entries_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "exam_routines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_routine_entries_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_routines: {
        Row: {
          created_at: string | null
          exam_session_id: string
          id: string
          is_active: boolean | null
          name: string
          name_bn: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          exam_session_id: string
          id?: string
          is_active?: boolean | null
          name: string
          name_bn: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          exam_session_id?: string
          id?: string
          is_active?: boolean | null
          name?: string
          name_bn?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_routines_exam_session_id_fkey"
            columns: ["exam_session_id"]
            isOneToOne: false
            referencedRelation: "exam_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_session_classes: {
        Row: {
          class_id: string
          created_at: string | null
          exam_session_id: string
          id: string
          student_count: number | null
        }
        Insert: {
          class_id: string
          created_at?: string | null
          exam_session_id: string
          id?: string
          student_count?: number | null
        }
        Update: {
          class_id?: string
          created_at?: string | null
          exam_session_id?: string
          id?: string
          student_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_session_classes_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_session_classes_exam_session_id_fkey"
            columns: ["exam_session_id"]
            isOneToOne: false
            referencedRelation: "exam_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_session_students: {
        Row: {
          class_id: string
          created_at: string | null
          exam_session_id: string
          id: string
          student_id: string
        }
        Insert: {
          class_id: string
          created_at?: string | null
          exam_session_id: string
          id?: string
          student_id: string
        }
        Update: {
          class_id?: string
          created_at?: string | null
          exam_session_id?: string
          id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_session_students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_session_students_exam_session_id_fkey"
            columns: ["exam_session_id"]
            isOneToOne: false
            referencedRelation: "exam_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_session_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_session_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students_public"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_session_subjects: {
        Row: {
          class_id: string | null
          created_at: string | null
          exam_session_id: string
          id: string
          subject_id: string
        }
        Insert: {
          class_id?: string | null
          created_at?: string | null
          exam_session_id: string
          id?: string
          subject_id: string
        }
        Update: {
          class_id?: string | null
          created_at?: string | null
          exam_session_id?: string
          id?: string
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_session_subjects_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_session_subjects_exam_session_id_fkey"
            columns: ["exam_session_id"]
            isOneToOne: false
            referencedRelation: "exam_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_session_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_sessions: {
        Row: {
          academic_session_id: string
          created_at: string | null
          exam_type: string
          id: string
          is_active: boolean | null
          is_published: boolean | null
          name: string
          name_bn: string
          publish_approval_status: string
          publish_decided_at: string | null
          publish_decided_by: string | null
          publish_rejection_reason: string | null
          publish_requested_at: string | null
          publish_requested_by: string | null
          updated_at: string | null
        }
        Insert: {
          academic_session_id: string
          created_at?: string | null
          exam_type?: string
          id?: string
          is_active?: boolean | null
          is_published?: boolean | null
          name: string
          name_bn: string
          publish_approval_status?: string
          publish_decided_at?: string | null
          publish_decided_by?: string | null
          publish_rejection_reason?: string | null
          publish_requested_at?: string | null
          publish_requested_by?: string | null
          updated_at?: string | null
        }
        Update: {
          academic_session_id?: string
          created_at?: string | null
          exam_type?: string
          id?: string
          is_active?: boolean | null
          is_published?: boolean | null
          name?: string
          name_bn?: string
          publish_approval_status?: string
          publish_decided_at?: string | null
          publish_decided_by?: string | null
          publish_rejection_reason?: string | null
          publish_requested_at?: string | null
          publish_requested_by?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_sessions_academic_session_id_fkey"
            columns: ["academic_session_id"]
            isOneToOne: false
            referencedRelation: "academic_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_types: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          key: string
          name: string
          name_ar: string | null
          name_bn: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          key: string
          name: string
          name_ar?: string | null
          name_bn: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          key?: string
          name?: string
          name_ar?: string | null
          name_bn?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      expense_categories: {
        Row: {
          created_at: string | null
          id: string
          institution_id: string
          is_active: boolean | null
          name: string
          name_bn: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          institution_id: string
          is_active?: boolean | null
          name: string
          name_bn: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          institution_id?: string
          is_active?: boolean | null
          name?: string
          name_bn?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_categories_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "expense_institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_institutions: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          name_bn: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          name_bn: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_bn?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      expense_monthly_summary: {
        Row: {
          cash_amount: number | null
          casher_name: string | null
          created_at: string | null
          id: string
          month_year: string
          notes: string | null
          previous_arrears: number | null
          principal_name: string | null
          total_deposit: number | null
          total_expense: number | null
          updated_at: string | null
        }
        Insert: {
          cash_amount?: number | null
          casher_name?: string | null
          created_at?: string | null
          id?: string
          month_year: string
          notes?: string | null
          previous_arrears?: number | null
          principal_name?: string | null
          total_deposit?: number | null
          total_expense?: number | null
          updated_at?: string | null
        }
        Update: {
          cash_amount?: number | null
          casher_name?: string | null
          created_at?: string | null
          id?: string
          month_year?: string
          notes?: string | null
          previous_arrears?: number | null
          principal_name?: string | null
          total_deposit?: number | null
          total_expense?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category_id: string
          created_at: string | null
          deleted_at: string | null
          description: string | null
          expense_date: string
          has_receipt: boolean | null
          id: string
          institution_id: string
          month_year: string
          quantity: number | null
          receipt_url: string | null
          updated_at: string | null
        }
        Insert: {
          amount?: number
          category_id: string
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          expense_date?: string
          has_receipt?: boolean | null
          id?: string
          institution_id: string
          month_year: string
          quantity?: number | null
          receipt_url?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          category_id?: string
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          expense_date?: string
          has_receipt?: boolean | null
          id?: string
          institution_id?: string
          month_year?: string
          quantity?: number | null
          receipt_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "expense_institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          name_bn: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          name_bn: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_bn?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      fee_payment_allocations: {
        Row: {
          actor_id: string | null
          amount: number
          created_at: string
          fee_payment_id: string
          id: string
          method: string | null
          notes: string | null
          parent_account_id: string | null
          source: string
          source_record_id: string | null
          student_id: string
          trx_id: string | null
        }
        Insert: {
          actor_id?: string | null
          amount: number
          created_at?: string
          fee_payment_id: string
          id?: string
          method?: string | null
          notes?: string | null
          parent_account_id?: string | null
          source: string
          source_record_id?: string | null
          student_id: string
          trx_id?: string | null
        }
        Update: {
          actor_id?: string | null
          amount?: number
          created_at?: string
          fee_payment_id?: string
          id?: string
          method?: string | null
          notes?: string | null
          parent_account_id?: string | null
          source?: string
          source_record_id?: string | null
          student_id?: string
          trx_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fee_payment_allocations_fee_payment_id_fkey"
            columns: ["fee_payment_id"]
            isOneToOne: false
            referencedRelation: "fee_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_payments: {
        Row: {
          amount: number
          approved_by: string | null
          collected_by: string | null
          created_at: string | null
          deleted_at: string | null
          fee_type_id: string
          id: string
          month: string | null
          paid_amount: number | null
          paid_at: string | null
          receipt_number: string | null
          status: string | null
          student_id: string
          updated_at: string | null
          year: number | null
        }
        Insert: {
          amount: number
          approved_by?: string | null
          collected_by?: string | null
          created_at?: string | null
          deleted_at?: string | null
          fee_type_id: string
          id?: string
          month?: string | null
          paid_amount?: number | null
          paid_at?: string | null
          receipt_number?: string | null
          status?: string | null
          student_id: string
          updated_at?: string | null
          year?: number | null
        }
        Update: {
          amount?: number
          approved_by?: string | null
          collected_by?: string | null
          created_at?: string | null
          deleted_at?: string | null
          fee_type_id?: string
          id?: string
          month?: string | null
          paid_amount?: number | null
          paid_at?: string | null
          receipt_number?: string | null
          status?: string | null
          student_id?: string
          updated_at?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fee_payments_fee_type_id_fkey"
            columns: ["fee_type_id"]
            isOneToOne: false
            referencedRelation: "fee_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students_public"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_types: {
        Row: {
          amount: number
          applicable_months: Json | null
          class_id: string | null
          created_at: string | null
          deleted_at: string | null
          division_id: string | null
          fee_category: string
          id: string
          is_active: boolean | null
          name: string
          name_bn: string
          payment_frequency: string
          session_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount?: number
          applicable_months?: Json | null
          class_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          division_id?: string | null
          fee_category?: string
          id?: string
          is_active?: boolean | null
          name: string
          name_bn: string
          payment_frequency?: string
          session_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          applicable_months?: Json | null
          class_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          division_id?: string | null
          fee_category?: string
          id?: string
          is_active?: boolean | null
          name?: string
          name_bn?: string
          payment_frequency?: string
          session_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fee_types_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_types_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_types_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "academic_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_waivers: {
        Row: {
          created_at: string | null
          fee_type_id: string
          id: string
          is_active: boolean | null
          reason: string | null
          student_id: string
          updated_at: string | null
          waiver_percent: number
        }
        Insert: {
          created_at?: string | null
          fee_type_id: string
          id?: string
          is_active?: boolean | null
          reason?: string | null
          student_id: string
          updated_at?: string | null
          waiver_percent?: number
        }
        Update: {
          created_at?: string | null
          fee_type_id?: string
          id?: string
          is_active?: boolean | null
          reason?: string | null
          student_id?: string
          updated_at?: string | null
          waiver_percent?: number
        }
        Relationships: [
          {
            foreignKeyName: "fee_waivers_fee_type_id_fkey"
            columns: ["fee_type_id"]
            isOneToOne: false
            referencedRelation: "fee_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_waivers_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_waivers_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students_public"
            referencedColumns: ["id"]
          },
        ]
      }
      fixed_assets: {
        Row: {
          asset_name_bn: string
          asset_name_en: string | null
          category: string
          condition_notes: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          location: string | null
          location_bn: string | null
          purchase_date: string | null
          purchase_price: number | null
          quantity: number | null
          status: string
          updated_at: string | null
        }
        Insert: {
          asset_name_bn: string
          asset_name_en?: string | null
          category?: string
          condition_notes?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          location_bn?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          quantity?: number | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          asset_name_bn?: string
          asset_name_en?: string | null
          category?: string
          condition_notes?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          location_bn?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          quantity?: number | null
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      form_settings: {
        Row: {
          field_name: string | null
          footer_text: string | null
          id: string
          is_visible: boolean | null
          updated_at: string | null
        }
        Insert: {
          field_name?: string | null
          footer_text?: string | null
          id?: string
          is_visible?: boolean | null
          updated_at?: string | null
        }
        Update: {
          field_name?: string | null
          footer_text?: string | null
          id?: string
          is_visible?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      formulas: {
        Row: {
          created_at: string | null
          description: string | null
          expression: Json
          formula_type: string
          id: string
          is_active: boolean | null
          module: string
          name: string
          name_bn: string
          sort_order: number | null
          updated_at: string | null
          variables: Json | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          expression?: Json
          formula_type?: string
          id?: string
          is_active?: boolean | null
          module: string
          name: string
          name_bn: string
          sort_order?: number | null
          updated_at?: string | null
          variables?: Json | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          expression?: Json
          formula_type?: string
          id?: string
          is_active?: boolean | null
          module?: string
          name?: string
          name_bn?: string
          sort_order?: number | null
          updated_at?: string | null
          variables?: Json | null
        }
        Relationships: []
      }
      guardian_notifications: {
        Row: {
          channel: string
          created_at: string | null
          failed_count: number | null
          id: string
          message: string
          notification_type: string
          recipient_filter: Json | null
          recipients_count: number | null
          sent_at: string | null
          sent_by: string | null
          sent_count: number | null
          status: string
          subject: string | null
          template_key: string | null
          updated_at: string | null
        }
        Insert: {
          channel?: string
          created_at?: string | null
          failed_count?: number | null
          id?: string
          message: string
          notification_type?: string
          recipient_filter?: Json | null
          recipients_count?: number | null
          sent_at?: string | null
          sent_by?: string | null
          sent_count?: number | null
          status?: string
          subject?: string | null
          template_key?: string | null
          updated_at?: string | null
        }
        Update: {
          channel?: string
          created_at?: string | null
          failed_count?: number | null
          id?: string
          message?: string
          notification_type?: string
          recipient_filter?: Json | null
          recipients_count?: number | null
          sent_at?: string | null
          sent_by?: string | null
          sent_count?: number | null
          status?: string
          subject?: string | null
          template_key?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      health_profiles: {
        Row: {
          allergies: string | null
          blood_group: string | null
          chronic_conditions: string | null
          created_at: string
          current_medications: string | null
          deleted_at: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relation: string | null
          family_history: string | null
          height_cm: number | null
          id: string
          notes: string | null
          person_type: string
          staff_id: string | null
          student_id: string | null
          updated_at: string
          weight_kg: number | null
        }
        Insert: {
          allergies?: string | null
          blood_group?: string | null
          chronic_conditions?: string | null
          created_at?: string
          current_medications?: string | null
          deleted_at?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relation?: string | null
          family_history?: string | null
          height_cm?: number | null
          id?: string
          notes?: string | null
          person_type: string
          staff_id?: string | null
          student_id?: string | null
          updated_at?: string
          weight_kg?: number | null
        }
        Update: {
          allergies?: string | null
          blood_group?: string | null
          chronic_conditions?: string | null
          created_at?: string
          current_medications?: string | null
          deleted_at?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relation?: string | null
          family_history?: string | null
          height_cm?: number | null
          id?: string
          notes?: string | null
          person_type?: string
          staff_id?: string | null
          student_id?: string | null
          updated_at?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "health_profiles_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_profiles_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_profiles_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students_public"
            referencedColumns: ["id"]
          },
        ]
      }
      holidays: {
        Row: {
          approximate: boolean | null
          created_at: string | null
          date: string
          id: string
          is_active: boolean | null
          name_bn: string
          name_en: string
          sort_order: number | null
          type: string
          updated_at: string | null
          year: number
        }
        Insert: {
          approximate?: boolean | null
          created_at?: string | null
          date: string
          id?: string
          is_active?: boolean | null
          name_bn: string
          name_en: string
          sort_order?: number | null
          type?: string
          updated_at?: string | null
          year: number
        }
        Update: {
          approximate?: boolean | null
          created_at?: string | null
          date?: string
          id?: string
          is_active?: boolean | null
          name_bn?: string
          name_en?: string
          sort_order?: number | null
          type?: string
          updated_at?: string | null
          year?: number
        }
        Relationships: []
      }
      hostel_allocations: {
        Row: {
          academic_session_id: string | null
          bed_number: number | null
          check_in_date: string
          check_out_date: string | null
          class_id: string | null
          created_at: string
          discount_amount: number
          discount_percent: number
          fee_mode: string
          id: string
          monthly_charge: number
          notes: string | null
          occupant_type: string
          room_id: string
          staff_id: string | null
          status: string
          student_id: string | null
          updated_at: string
        }
        Insert: {
          academic_session_id?: string | null
          bed_number?: number | null
          check_in_date?: string
          check_out_date?: string | null
          class_id?: string | null
          created_at?: string
          discount_amount?: number
          discount_percent?: number
          fee_mode?: string
          id?: string
          monthly_charge?: number
          notes?: string | null
          occupant_type?: string
          room_id: string
          staff_id?: string | null
          status?: string
          student_id?: string | null
          updated_at?: string
        }
        Update: {
          academic_session_id?: string | null
          bed_number?: number | null
          check_in_date?: string
          check_out_date?: string | null
          class_id?: string | null
          created_at?: string
          discount_amount?: number
          discount_percent?: number
          fee_mode?: string
          id?: string
          monthly_charge?: number
          notes?: string | null
          occupant_type?: string
          room_id?: string
          staff_id?: string | null
          status?: string
          student_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hostel_allocations_academic_session_id_fkey"
            columns: ["academic_session_id"]
            isOneToOne: false
            referencedRelation: "academic_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hostel_allocations_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hostel_allocations_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "hostel_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hostel_allocations_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hostel_allocations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hostel_allocations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students_public"
            referencedColumns: ["id"]
          },
        ]
      }
      hostel_meal_attendance: {
        Row: {
          allocation_id: string | null
          attendance_date: string
          breakfast: boolean | null
          created_at: string
          dinner: boolean | null
          id: string
          lunch: boolean | null
          notes: string | null
          person_id: string | null
          person_name: string | null
          person_type: string | null
          updated_at: string
        }
        Insert: {
          allocation_id?: string | null
          attendance_date?: string
          breakfast?: boolean | null
          created_at?: string
          dinner?: boolean | null
          id?: string
          lunch?: boolean | null
          notes?: string | null
          person_id?: string | null
          person_name?: string | null
          person_type?: string | null
          updated_at?: string
        }
        Update: {
          allocation_id?: string | null
          attendance_date?: string
          breakfast?: boolean | null
          created_at?: string
          dinner?: boolean | null
          id?: string
          lunch?: boolean | null
          notes?: string | null
          person_id?: string | null
          person_name?: string | null
          person_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hostel_meal_attendance_allocation_id_fkey"
            columns: ["allocation_id"]
            isOneToOne: false
            referencedRelation: "hostel_allocations"
            referencedColumns: ["id"]
          },
        ]
      }
      hostel_meal_menu: {
        Row: {
          created_at: string
          day_of_week: string
          hostel_id: string
          id: string
          items: string
          items_bn: string | null
          meal_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: string
          hostel_id: string
          id?: string
          items: string
          items_bn?: string | null
          meal_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: string
          hostel_id?: string
          id?: string
          items?: string
          items_bn?: string | null
          meal_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hostel_meal_menu_hostel_id_fkey"
            columns: ["hostel_id"]
            isOneToOne: false
            referencedRelation: "hostels"
            referencedColumns: ["id"]
          },
        ]
      }
      hostel_rooms: {
        Row: {
          bed_count: number
          created_at: string
          floor: string | null
          hostel_id: string
          id: string
          is_active: boolean
          monthly_rent: number
          notes: string | null
          room_number: string
          room_type: string | null
          updated_at: string
        }
        Insert: {
          bed_count?: number
          created_at?: string
          floor?: string | null
          hostel_id: string
          id?: string
          is_active?: boolean
          monthly_rent?: number
          notes?: string | null
          room_number: string
          room_type?: string | null
          updated_at?: string
        }
        Update: {
          bed_count?: number
          created_at?: string
          floor?: string | null
          hostel_id?: string
          id?: string
          is_active?: boolean
          monthly_rent?: number
          notes?: string | null
          room_number?: string
          room_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hostel_rooms_hostel_id_fkey"
            columns: ["hostel_id"]
            isOneToOne: false
            referencedRelation: "hostels"
            referencedColumns: ["id"]
          },
        ]
      }
      hostels: {
        Row: {
          address: string | null
          created_at: string
          deleted_at: string | null
          hostel_type: string
          id: string
          is_active: boolean
          name: string
          name_bn: string
          notes: string | null
          total_capacity: number
          updated_at: string
          warden_name: string | null
          warden_phone: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          deleted_at?: string | null
          hostel_type?: string
          id?: string
          is_active?: boolean
          name: string
          name_bn: string
          notes?: string | null
          total_capacity?: number
          updated_at?: string
          warden_name?: string | null
          warden_phone?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          deleted_at?: string | null
          hostel_type?: string
          id?: string
          is_active?: boolean
          name?: string
          name_bn?: string
          notes?: string | null
          total_capacity?: number
          updated_at?: string
          warden_name?: string | null
          warden_phone?: string | null
        }
        Relationships: []
      }
      id_format_config: {
        Row: {
          created_at: string
          entity_key: string
          include_year: boolean
          label: string
          prefix: string
          reset_mode: string
          separator: string
          serial_padding: number
          start_serial: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          entity_key: string
          include_year?: boolean
          label: string
          prefix: string
          reset_mode?: string
          separator?: string
          serial_padding?: number
          start_serial?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          entity_key?: string
          include_year?: boolean
          label?: string
          prefix?: string
          reset_mode?: string
          separator?: string
          serial_padding?: number
          start_serial?: number
          updated_at?: string
        }
        Relationships: []
      }
      institutions: {
        Row: {
          accountant_name: string | null
          address: string | null
          address_en: string | null
          created_at: string | null
          email: string | null
          established_year: string | null
          established_year_en: string | null
          id: string
          is_default: boolean | null
          logo_url: string | null
          name: string
          name_ar: string | null
          name_en: string | null
          other_info: string | null
          other_info_en: string | null
          phone: string | null
          principal_name: string | null
          registration_number: string | null
          registration_number_en: string | null
          updated_at: string | null
          verifier_name: string | null
        }
        Insert: {
          accountant_name?: string | null
          address?: string | null
          address_en?: string | null
          created_at?: string | null
          email?: string | null
          established_year?: string | null
          established_year_en?: string | null
          id?: string
          is_default?: boolean | null
          logo_url?: string | null
          name: string
          name_ar?: string | null
          name_en?: string | null
          other_info?: string | null
          other_info_en?: string | null
          phone?: string | null
          principal_name?: string | null
          registration_number?: string | null
          registration_number_en?: string | null
          updated_at?: string | null
          verifier_name?: string | null
        }
        Update: {
          accountant_name?: string | null
          address?: string | null
          address_en?: string | null
          created_at?: string | null
          email?: string | null
          established_year?: string | null
          established_year_en?: string | null
          id?: string
          is_default?: boolean | null
          logo_url?: string | null
          name?: string
          name_ar?: string | null
          name_en?: string | null
          other_info?: string | null
          other_info_en?: string | null
          phone?: string | null
          principal_name?: string | null
          registration_number?: string | null
          registration_number_en?: string | null
          updated_at?: string | null
          verifier_name?: string | null
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          buying_price: number | null
          category: string
          created_at: string | null
          current_stock: number
          id: string
          is_active: boolean | null
          min_stock_level: number
          name_bn: string
          name_en: string | null
          notes: string | null
          unit: string
          updated_at: string | null
        }
        Insert: {
          buying_price?: number | null
          category?: string
          created_at?: string | null
          current_stock?: number
          id?: string
          is_active?: boolean | null
          min_stock_level?: number
          name_bn: string
          name_en?: string | null
          notes?: string | null
          unit?: string
          updated_at?: string | null
        }
        Update: {
          buying_price?: number | null
          category?: string
          created_at?: string | null
          current_stock?: number
          id?: string
          is_active?: boolean | null
          min_stock_level?: number
          name_bn?: string
          name_en?: string | null
          notes?: string | null
          unit?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      inventory_logs: {
        Row: {
          change_amount: number
          created_at: string | null
          expense_id: string | null
          id: string
          item_id: string
          performed_by: string | null
          reason: string | null
          type: string
        }
        Insert: {
          change_amount: number
          created_at?: string | null
          expense_id?: string | null
          id?: string
          item_id: string
          performed_by?: string | null
          reason?: string | null
          type?: string
        }
        Update: {
          change_amount?: number
          created_at?: string | null
          expense_id?: string | null
          id?: string
          item_id?: string
          performed_by?: string | null
          reason?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_logs_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      joining_letters: {
        Row: {
          created_at: string | null
          designation: string | null
          id: string
          joining_date: string | null
          letter_data: Json | null
          letter_date: string | null
          letter_number: string | null
          letter_type: string
          staff_id: string | null
          staff_name: string
          staff_name_bn: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          designation?: string | null
          id?: string
          joining_date?: string | null
          letter_data?: Json | null
          letter_date?: string | null
          letter_number?: string | null
          letter_type?: string
          staff_id?: string | null
          staff_name?: string
          staff_name_bn?: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          designation?: string | null
          id?: string
          joining_date?: string | null
          letter_data?: Json | null
          letter_date?: string | null
          letter_number?: string | null
          letter_type?: string
          staff_id?: string | null
          staff_name?: string
          staff_name_bn?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "joining_letters_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      library_books: {
        Row: {
          author: string | null
          author_bn: string | null
          available_copies: number
          book_category: string
          buying_price: number
          class_id: string | null
          condition: string
          created_at: string | null
          damaged_copies: number
          deleted_at: string | null
          id: string
          is_active: boolean | null
          lost_copies: number
          notes: string | null
          purchase_date: string
          purchased_by: string | null
          subject_id: string | null
          title: string
          title_bn: string | null
          total_copies: number
          updated_at: string | null
        }
        Insert: {
          author?: string | null
          author_bn?: string | null
          available_copies?: number
          book_category?: string
          buying_price?: number
          class_id?: string | null
          condition?: string
          created_at?: string | null
          damaged_copies?: number
          deleted_at?: string | null
          id?: string
          is_active?: boolean | null
          lost_copies?: number
          notes?: string | null
          purchase_date?: string
          purchased_by?: string | null
          subject_id?: string | null
          title: string
          title_bn?: string | null
          total_copies?: number
          updated_at?: string | null
        }
        Update: {
          author?: string | null
          author_bn?: string | null
          available_copies?: number
          book_category?: string
          buying_price?: number
          class_id?: string | null
          condition?: string
          created_at?: string | null
          damaged_copies?: number
          deleted_at?: string | null
          id?: string
          is_active?: boolean | null
          lost_copies?: number
          notes?: string | null
          purchase_date?: string
          purchased_by?: string | null
          subject_id?: string | null
          title?: string
          title_bn?: string | null
          total_copies?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "library_books_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_books_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      library_fines: {
        Row: {
          book_id: string
          created_at: string | null
          fine_amount: number
          fine_type: string
          id: string
          issuance_id: string
          notes: string | null
          paid_amount: number | null
          status: string
          updated_at: string | null
        }
        Insert: {
          book_id: string
          created_at?: string | null
          fine_amount?: number
          fine_type?: string
          id?: string
          issuance_id: string
          notes?: string | null
          paid_amount?: number | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          book_id?: string
          created_at?: string | null
          fine_amount?: number
          fine_type?: string
          id?: string
          issuance_id?: string
          notes?: string | null
          paid_amount?: number | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "library_fines_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "library_books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_fines_issuance_id_fkey"
            columns: ["issuance_id"]
            isOneToOne: false
            referencedRelation: "library_issuances"
            referencedColumns: ["id"]
          },
        ]
      }
      library_issuance_audit: {
        Row: {
          action: string
          created_at: string
          distributor_changed_by_admin: boolean
          distributor_name: string | null
          id: string
          issuance_id: string | null
          issued_by: string | null
          issued_by_name: string | null
          new_distributor_name: string | null
          old_distributor_name: string | null
        }
        Insert: {
          action?: string
          created_at?: string
          distributor_changed_by_admin?: boolean
          distributor_name?: string | null
          id?: string
          issuance_id?: string | null
          issued_by?: string | null
          issued_by_name?: string | null
          new_distributor_name?: string | null
          old_distributor_name?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          distributor_changed_by_admin?: boolean
          distributor_name?: string | null
          id?: string
          issuance_id?: string | null
          issued_by?: string | null
          issued_by_name?: string | null
          new_distributor_name?: string | null
          old_distributor_name?: string | null
        }
        Relationships: []
      }
      library_issuances: {
        Row: {
          book_condition: string
          book_id: string | null
          created_at: string | null
          custom_book_title: string | null
          distribution_type: string
          distributor_name: string | null
          id: string
          issued_by: string | null
          issued_date: string
          notes: string | null
          profile_id: string | null
          recipient_name: string | null
          recipient_type: string
          returned_date: string | null
          selling_price: number | null
          staff_id: string | null
          status: string
          student_id: string | null
          updated_at: string | null
        }
        Insert: {
          book_condition?: string
          book_id?: string | null
          created_at?: string | null
          custom_book_title?: string | null
          distribution_type?: string
          distributor_name?: string | null
          id?: string
          issued_by?: string | null
          issued_date?: string
          notes?: string | null
          profile_id?: string | null
          recipient_name?: string | null
          recipient_type?: string
          returned_date?: string | null
          selling_price?: number | null
          staff_id?: string | null
          status?: string
          student_id?: string | null
          updated_at?: string | null
        }
        Update: {
          book_condition?: string
          book_id?: string | null
          created_at?: string | null
          custom_book_title?: string | null
          distribution_type?: string
          distributor_name?: string | null
          id?: string
          issued_by?: string | null
          issued_date?: string
          notes?: string | null
          profile_id?: string | null
          recipient_name?: string | null
          recipient_type?: string
          returned_date?: string | null
          selling_price?: number | null
          staff_id?: string | null
          status?: string
          student_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "library_issuances_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "library_books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_issuances_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "library_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_issuances_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_issuances_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_issuances_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students_public"
            referencedColumns: ["id"]
          },
        ]
      }
      library_profiles: {
        Row: {
          address: string | null
          class_name: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          member_code: string | null
          member_type: string
          name: string
          notes: string | null
          phone: string | null
          roll_number: string | null
          staff_id: string | null
          student_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          class_name?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          member_code?: string | null
          member_type?: string
          name: string
          notes?: string | null
          phone?: string | null
          roll_number?: string | null
          staff_id?: string | null
          student_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          class_name?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          member_code?: string | null
          member_type?: string
          name?: string
          notes?: string | null
          phone?: string | null
          roll_number?: string | null
          staff_id?: string | null
          student_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "library_profiles_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_profiles_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_profiles_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students_public"
            referencedColumns: ["id"]
          },
        ]
      }
      live_class_messages: {
        Row: {
          created_at: string
          id: string
          is_pinned: boolean | null
          live_class_id: string
          message: string
          message_type: string
          parent_message_id: string | null
          sender_name: string
          sender_role: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_pinned?: boolean | null
          live_class_id: string
          message: string
          message_type?: string
          parent_message_id?: string | null
          sender_name: string
          sender_role?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_pinned?: boolean | null
          live_class_id?: string
          message?: string
          message_type?: string
          parent_message_id?: string | null
          sender_name?: string
          sender_role?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "live_class_messages_live_class_id_fkey"
            columns: ["live_class_id"]
            isOneToOne: false
            referencedRelation: "live_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_class_messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "live_class_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      live_class_participants: {
        Row: {
          attendance_marked: boolean | null
          created_at: string
          display_name: string
          duration_seconds: number | null
          id: string
          joined_at: string
          left_at: string | null
          live_class_id: string
          staff_id: string | null
          student_id: string | null
          user_id: string | null
        }
        Insert: {
          attendance_marked?: boolean | null
          created_at?: string
          display_name: string
          duration_seconds?: number | null
          id?: string
          joined_at?: string
          left_at?: string | null
          live_class_id: string
          staff_id?: string | null
          student_id?: string | null
          user_id?: string | null
        }
        Update: {
          attendance_marked?: boolean | null
          created_at?: string
          display_name?: string
          duration_seconds?: number | null
          id?: string
          joined_at?: string
          left_at?: string | null
          live_class_id?: string
          staff_id?: string | null
          student_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "live_class_participants_live_class_id_fkey"
            columns: ["live_class_id"]
            isOneToOne: false
            referencedRelation: "live_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_class_participants_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_class_participants_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_class_participants_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students_public"
            referencedColumns: ["id"]
          },
        ]
      }
      live_class_reminders: {
        Row: {
          channel: string
          created_at: string
          error_message: string | null
          id: string
          live_class_id: string
          recipients_count: number | null
          reminder_at: string
          sent_at: string | null
          status: string
        }
        Insert: {
          channel?: string
          created_at?: string
          error_message?: string | null
          id?: string
          live_class_id: string
          recipients_count?: number | null
          reminder_at: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          channel?: string
          created_at?: string
          error_message?: string | null
          id?: string
          live_class_id?: string
          recipients_count?: number | null
          reminder_at?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_class_reminders_live_class_id_fkey"
            columns: ["live_class_id"]
            isOneToOne: false
            referencedRelation: "live_classes"
            referencedColumns: ["id"]
          },
        ]
      }
      live_classes: {
        Row: {
          academic_session_id: string | null
          access_code: string | null
          access_mode: string
          actual_end: string | null
          actual_start: string | null
          class_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          description_bn: string | null
          enable_attendance: boolean
          enable_chat: boolean
          enable_reminder: boolean
          id: string
          is_published: boolean
          max_participants: number | null
          meeting_room: string | null
          meeting_url: string | null
          provider: string
          recording_url: string | null
          reminder_minutes_before: number
          scheduled_end: string
          scheduled_start: string
          status: string
          subject_id: string | null
          teacher_id: string | null
          title: string
          title_bn: string
          updated_at: string
        }
        Insert: {
          academic_session_id?: string | null
          access_code?: string | null
          access_mode?: string
          actual_end?: string | null
          actual_start?: string | null
          class_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          description_bn?: string | null
          enable_attendance?: boolean
          enable_chat?: boolean
          enable_reminder?: boolean
          id?: string
          is_published?: boolean
          max_participants?: number | null
          meeting_room?: string | null
          meeting_url?: string | null
          provider?: string
          recording_url?: string | null
          reminder_minutes_before?: number
          scheduled_end: string
          scheduled_start: string
          status?: string
          subject_id?: string | null
          teacher_id?: string | null
          title: string
          title_bn: string
          updated_at?: string
        }
        Update: {
          academic_session_id?: string | null
          access_code?: string | null
          access_mode?: string
          actual_end?: string | null
          actual_start?: string | null
          class_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          description_bn?: string | null
          enable_attendance?: boolean
          enable_chat?: boolean
          enable_reminder?: boolean
          id?: string
          is_published?: boolean
          max_participants?: number | null
          meeting_room?: string | null
          meeting_url?: string | null
          provider?: string
          recording_url?: string | null
          reminder_minutes_before?: number
          scheduled_end?: string
          scheduled_start?: string
          status?: string
          subject_id?: string | null
          teacher_id?: string | null
          title?: string
          title_bn?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_classes_academic_session_id_fkey"
            columns: ["academic_session_id"]
            isOneToOne: false
            referencedRelation: "academic_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_classes_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_classes_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_classes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      machine_punch_log: {
        Row: {
          created_at: string
          device_serial: string | null
          device_user_id: string
          direction: string | null
          error: string | null
          id: string
          processed: boolean
          punch_at: string
          punch_date: string
          punch_time: string
          raw: Json | null
          result: string | null
          shift_id: string | null
          staff_id: string | null
        }
        Insert: {
          created_at?: string
          device_serial?: string | null
          device_user_id: string
          direction?: string | null
          error?: string | null
          id?: string
          processed?: boolean
          punch_at: string
          punch_date: string
          punch_time: string
          raw?: Json | null
          result?: string | null
          shift_id?: string | null
          staff_id?: string | null
        }
        Update: {
          created_at?: string
          device_serial?: string | null
          device_user_id?: string
          direction?: string | null
          error?: string | null
          id?: string
          processed?: boolean
          punch_at?: string
          punch_date?: string
          punch_time?: string
          raw?: Json | null
          result?: string | null
          shift_id?: string | null
          staff_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "machine_punch_log_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "duty_shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "machine_punch_log_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_payment_methods: {
        Row: {
          account_holder: string | null
          account_holder_bn: string | null
          account_number: string
          created_at: string | null
          id: string
          instructions: string | null
          instructions_bn: string | null
          is_active: boolean | null
          method_name: string
          method_name_bn: string
          method_type: string
          qr_code_url: string | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          account_holder?: string | null
          account_holder_bn?: string | null
          account_number: string
          created_at?: string | null
          id?: string
          instructions?: string | null
          instructions_bn?: string | null
          is_active?: boolean | null
          method_name: string
          method_name_bn: string
          method_type?: string
          qr_code_url?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          account_holder?: string | null
          account_holder_bn?: string | null
          account_number?: string
          created_at?: string | null
          id?: string
          instructions?: string | null
          instructions_bn?: string | null
          is_active?: boolean | null
          method_name?: string
          method_name_bn?: string
          method_type?: string
          qr_code_url?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      medical_visits: {
        Row: {
          attended_by: string | null
          blood_pressure: string | null
          created_at: string
          deleted_at: string | null
          diagnosis: string | null
          follow_up_date: string | null
          id: string
          notes: string | null
          person_type: string
          prescription: string | null
          pulse_rate: number | null
          severity: string | null
          staff_id: string | null
          student_id: string | null
          symptoms: string | null
          temperature_c: number | null
          treatment: string | null
          updated_at: string
          visit_date: string
          visit_time: string | null
        }
        Insert: {
          attended_by?: string | null
          blood_pressure?: string | null
          created_at?: string
          deleted_at?: string | null
          diagnosis?: string | null
          follow_up_date?: string | null
          id?: string
          notes?: string | null
          person_type: string
          prescription?: string | null
          pulse_rate?: number | null
          severity?: string | null
          staff_id?: string | null
          student_id?: string | null
          symptoms?: string | null
          temperature_c?: number | null
          treatment?: string | null
          updated_at?: string
          visit_date?: string
          visit_time?: string | null
        }
        Update: {
          attended_by?: string | null
          blood_pressure?: string | null
          created_at?: string
          deleted_at?: string | null
          diagnosis?: string | null
          follow_up_date?: string | null
          id?: string
          notes?: string | null
          person_type?: string
          prescription?: string | null
          pulse_rate?: number | null
          severity?: string | null
          staff_id?: string | null
          student_id?: string | null
          symptoms?: string | null
          temperature_c?: number | null
          treatment?: string | null
          updated_at?: string
          visit_date?: string
          visit_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medical_visits_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_visits_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_visits_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students_public"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_participants: {
        Row: {
          attendance_marked: boolean | null
          created_at: string
          display_name: string
          id: string
          joined_at: string | null
          left_at: string | null
          meeting_id: string
          role: string
          staff_id: string | null
          user_id: string | null
        }
        Insert: {
          attendance_marked?: boolean | null
          created_at?: string
          display_name?: string
          id?: string
          joined_at?: string | null
          left_at?: string | null
          meeting_id: string
          role?: string
          staff_id?: string | null
          user_id?: string | null
        }
        Update: {
          attendance_marked?: boolean | null
          created_at?: string
          display_name?: string
          id?: string
          joined_at?: string | null
          left_at?: string | null
          meeting_id?: string
          role?: string
          staff_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_participants_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_participants_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_provider_settings: {
        Row: {
          config: Json | null
          created_at: string
          default_room_url: string | null
          id: string
          is_enabled: boolean
          provider: string
          updated_at: string
        }
        Insert: {
          config?: Json | null
          created_at?: string
          default_room_url?: string | null
          id?: string
          is_enabled?: boolean
          provider: string
          updated_at?: string
        }
        Update: {
          config?: Json | null
          created_at?: string
          default_room_url?: string | null
          id?: string
          is_enabled?: boolean
          provider?: string
          updated_at?: string
        }
        Relationships: []
      }
      meetings: {
        Row: {
          access_code: string | null
          access_mode: string
          created_at: string
          deleted_at: string | null
          description: string | null
          description_bn: string | null
          enable_attendance: boolean
          enable_chat: boolean
          enable_reminder: boolean
          id: string
          is_published: boolean
          meeting_room: string | null
          meeting_type: string
          meeting_url: string | null
          notes: string | null
          notes_bn: string | null
          organizer_id: string | null
          provider: string
          recording_url: string | null
          reminder_minutes: number | null
          scheduled_end: string
          scheduled_start: string
          staff_organizer_id: string | null
          status: string
          title: string
          title_bn: string
          updated_at: string
        }
        Insert: {
          access_code?: string | null
          access_mode?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          description_bn?: string | null
          enable_attendance?: boolean
          enable_chat?: boolean
          enable_reminder?: boolean
          id?: string
          is_published?: boolean
          meeting_room?: string | null
          meeting_type?: string
          meeting_url?: string | null
          notes?: string | null
          notes_bn?: string | null
          organizer_id?: string | null
          provider?: string
          recording_url?: string | null
          reminder_minutes?: number | null
          scheduled_end: string
          scheduled_start: string
          staff_organizer_id?: string | null
          status?: string
          title: string
          title_bn?: string
          updated_at?: string
        }
        Update: {
          access_code?: string | null
          access_mode?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          description_bn?: string | null
          enable_attendance?: boolean
          enable_chat?: boolean
          enable_reminder?: boolean
          id?: string
          is_published?: boolean
          meeting_room?: string | null
          meeting_type?: string
          meeting_url?: string | null
          notes?: string | null
          notes_bn?: string | null
          organizer_id?: string | null
          provider?: string
          recording_url?: string | null
          reminder_minutes?: number | null
          scheduled_end?: string
          scheduled_start?: string
          staff_organizer_id?: string | null
          status?: string
          title?: string
          title_bn?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetings_staff_organizer_id_fkey"
            columns: ["staff_organizer_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      merit_list_approvals: {
        Row: {
          class_id: string
          created_at: string
          decided_at: string | null
          decided_by: string | null
          exam_session_id: string
          id: string
          rejection_reason: string | null
          status: string
          submitted_at: string
          submitted_by: string | null
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          exam_session_id: string
          id?: string
          rejection_reason?: string | null
          status?: string
          submitted_at?: string
          submitted_by?: string | null
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          exam_session_id?: string
          id?: string
          rejection_reason?: string | null
          status?: string
          submitted_at?: string
          submitted_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "merit_list_approvals_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merit_list_approvals_exam_session_id_fkey"
            columns: ["exam_session_id"]
            isOneToOne: false
            referencedRelation: "exam_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      name_permission_audit: {
        Row: {
          action: string
          changed_by: string | null
          changed_by_email: string | null
          created_at: string
          id: string
          ip_address: string | null
          new_value: Json | null
          notes: string | null
          old_value: Json | null
          setting_key: string
          user_agent: string | null
        }
        Insert: {
          action: string
          changed_by?: string | null
          changed_by_email?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          notes?: string | null
          old_value?: Json | null
          setting_key: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          changed_by?: string | null
          changed_by_email?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          notes?: string | null
          old_value?: Json | null
          setting_key?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      notices: {
        Row: {
          attachment_url: string | null
          category: string | null
          content: string | null
          content_bn: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          id: string
          is_published: boolean | null
          published_at: string | null
          title: string
          title_bn: string | null
          updated_at: string | null
        }
        Insert: {
          attachment_url?: string | null
          category?: string | null
          content?: string | null
          content_bn?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_published?: boolean | null
          published_at?: string | null
          title: string
          title_bn?: string | null
          updated_at?: string | null
        }
        Update: {
          attachment_url?: string | null
          category?: string | null
          content?: string | null
          content_bn?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_published?: boolean | null
          published_at?: string | null
          title?: string
          title_bn?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      notification_templates: {
        Row: {
          body: string
          body_bn: string
          channel: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          name_bn: string
          subject: string | null
          template_type: string
          updated_at: string | null
          variables: Json | null
        }
        Insert: {
          body: string
          body_bn: string
          channel?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          name_bn: string
          subject?: string | null
          template_type?: string
          updated_at?: string | null
          variables?: Json | null
        }
        Update: {
          body?: string
          body_bn?: string
          channel?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_bn?: string
          subject?: string | null
          template_type?: string
          updated_at?: string | null
          variables?: Json | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          category: string
          created_at: string | null
          id: string
          is_read: boolean
          link: string | null
          message: string | null
          message_bn: string | null
          recipient_user_id: string | null
          title: string
          title_bn: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          category?: string
          created_at?: string | null
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string | null
          message_bn?: string | null
          recipient_user_id?: string | null
          title: string
          title_bn?: string | null
          type?: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string | null
          message_bn?: string | null
          recipient_user_id?: string | null
          title?: string
          title_bn?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      online_exam_answers: {
        Row: {
          answer: Json | null
          attempt_id: string
          awarded_marks: number
          created_at: string
          graded_at: string | null
          graded_by: string | null
          id: string
          is_correct: boolean | null
          manually_graded: boolean
          question_id: string
          reviewer_comment: string | null
          updated_at: string
        }
        Insert: {
          answer?: Json | null
          attempt_id: string
          awarded_marks?: number
          created_at?: string
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          is_correct?: boolean | null
          manually_graded?: boolean
          question_id: string
          reviewer_comment?: string | null
          updated_at?: string
        }
        Update: {
          answer?: Json | null
          attempt_id?: string
          awarded_marks?: number
          created_at?: string
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          is_correct?: boolean | null
          manually_graded?: boolean
          question_id?: string
          reviewer_comment?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "online_exam_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "online_exam_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_exam_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "online_exam_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_exam_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "online_exam_questions_public"
            referencedColumns: ["id"]
          },
        ]
      }
      online_exam_attempts: {
        Row: {
          attempt_token: string
          attempted_by_identifier: string | null
          attempted_by_name: string | null
          auto_graded_score: number
          created_at: string
          exam_id: string
          expires_at: string | null
          fullscreen_exit_count: number
          id: string
          ip_address: string | null
          is_published: boolean
          manual_graded_score: number
          parent_account_id: string | null
          question_order: Json | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          started_at: string
          status: string
          student_id: string | null
          submitted_at: string | null
          tab_switch_count: number
          time_taken_seconds: number | null
          total_score: number
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          attempt_token?: string
          attempted_by_identifier?: string | null
          attempted_by_name?: string | null
          auto_graded_score?: number
          created_at?: string
          exam_id: string
          expires_at?: string | null
          fullscreen_exit_count?: number
          id?: string
          ip_address?: string | null
          is_published?: boolean
          manual_graded_score?: number
          parent_account_id?: string | null
          question_order?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          started_at?: string
          status?: string
          student_id?: string | null
          submitted_at?: string | null
          tab_switch_count?: number
          time_taken_seconds?: number | null
          total_score?: number
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          attempt_token?: string
          attempted_by_identifier?: string | null
          attempted_by_name?: string | null
          auto_graded_score?: number
          created_at?: string
          exam_id?: string
          expires_at?: string | null
          fullscreen_exit_count?: number
          id?: string
          ip_address?: string | null
          is_published?: boolean
          manual_graded_score?: number
          parent_account_id?: string | null
          question_order?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          started_at?: string
          status?: string
          student_id?: string | null
          submitted_at?: string | null
          tab_switch_count?: number
          time_taken_seconds?: number | null
          total_score?: number
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "online_exam_attempts_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "online_exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_exam_attempts_parent_account_id_fkey"
            columns: ["parent_account_id"]
            isOneToOne: false
            referencedRelation: "parent_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_exam_attempts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_exam_attempts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students_public"
            referencedColumns: ["id"]
          },
        ]
      }
      online_exam_questions: {
        Row: {
          correct_answer: Json | null
          created_at: string
          exam_id: string
          explanation: string | null
          explanation_bn: string | null
          id: string
          marks: number
          negative_marks: number
          options: Json | null
          question_text: string
          question_text_bn: string
          question_type: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          correct_answer?: Json | null
          created_at?: string
          exam_id: string
          explanation?: string | null
          explanation_bn?: string | null
          id?: string
          marks?: number
          negative_marks?: number
          options?: Json | null
          question_text: string
          question_text_bn: string
          question_type?: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          correct_answer?: Json | null
          created_at?: string
          exam_id?: string
          explanation?: string | null
          explanation_bn?: string | null
          id?: string
          marks?: number
          negative_marks?: number
          options?: Json | null
          question_text?: string
          question_text_bn?: string
          question_type?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "online_exam_questions_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "online_exams"
            referencedColumns: ["id"]
          },
        ]
      }
      online_exams: {
        Row: {
          academic_session_id: string | null
          access_code: string | null
          access_mode: string
          class_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          description_bn: string | null
          duration_minutes: number
          end_at: string | null
          exam_session_id: string | null
          id: string
          instructions: string | null
          instructions_bn: string | null
          passing_marks: number
          result_mode: string
          result_publish_at: string | null
          settings: Json
          start_at: string | null
          status: string
          subject_id: string | null
          title: string
          title_bn: string
          total_marks: number
          updated_at: string
        }
        Insert: {
          academic_session_id?: string | null
          access_code?: string | null
          access_mode?: string
          class_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          description_bn?: string | null
          duration_minutes?: number
          end_at?: string | null
          exam_session_id?: string | null
          id?: string
          instructions?: string | null
          instructions_bn?: string | null
          passing_marks?: number
          result_mode?: string
          result_publish_at?: string | null
          settings?: Json
          start_at?: string | null
          status?: string
          subject_id?: string | null
          title: string
          title_bn: string
          total_marks?: number
          updated_at?: string
        }
        Update: {
          academic_session_id?: string | null
          access_code?: string | null
          access_mode?: string
          class_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          description_bn?: string | null
          duration_minutes?: number
          end_at?: string | null
          exam_session_id?: string | null
          id?: string
          instructions?: string | null
          instructions_bn?: string | null
          passing_marks?: number
          result_mode?: string
          result_publish_at?: string | null
          settings?: Json
          start_at?: string | null
          status?: string
          subject_id?: string | null
          title?: string
          title_bn?: string
          total_marks?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "online_exams_academic_session_id_fkey"
            columns: ["academic_session_id"]
            isOneToOne: false
            referencedRelation: "academic_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_exams_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_exams_exam_session_id_fkey"
            columns: ["exam_session_id"]
            isOneToOne: false
            referencedRelation: "exam_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_exams_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      otp_codes: {
        Row: {
          attempts: number
          code: string
          created_at: string
          email: string
          expires_at: string
          id: string
          is_used: boolean
          max_attempts: number
          purpose: string
        }
        Insert: {
          attempts?: number
          code: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
          is_used?: boolean
          max_attempts?: number
          purpose?: string
        }
        Update: {
          attempts?: number
          code?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          is_used?: boolean
          max_attempts?: number
          purpose?: string
        }
        Relationships: []
      }
      otp_config: {
        Row: {
          cooldown_seconds: number
          daily_limit: number
          expiry_minutes: number
          hourly_limit: number
          id: number
          is_enabled: boolean
          max_attempts: number
          require_for_email_change: boolean
          require_for_login: boolean
          require_for_password_change: boolean
          require_for_password_reset: boolean
          role_overrides: Json
          updated_at: string
        }
        Insert: {
          cooldown_seconds?: number
          daily_limit?: number
          expiry_minutes?: number
          hourly_limit?: number
          id?: number
          is_enabled?: boolean
          max_attempts?: number
          require_for_email_change?: boolean
          require_for_login?: boolean
          require_for_password_change?: boolean
          require_for_password_reset?: boolean
          role_overrides?: Json
          updated_at?: string
        }
        Update: {
          cooldown_seconds?: number
          daily_limit?: number
          expiry_minutes?: number
          hourly_limit?: number
          id?: number
          is_enabled?: boolean
          max_attempts?: number
          require_for_email_change?: boolean
          require_for_login?: boolean
          require_for_password_change?: boolean
          require_for_password_reset?: boolean
          role_overrides?: Json
          updated_at?: string
        }
        Relationships: []
      }
      otp_verify_attempts: {
        Row: {
          created_at: string
          email: string
          id: string
          purpose: string
          success: boolean
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          purpose: string
          success?: boolean
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          purpose?: string
          success?: boolean
        }
        Relationships: []
      }
      parent_accounts: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          email: string
          email_verified: boolean
          full_name: string
          id: string
          last_login_at: string | null
          linked_student_uuid: string | null
          linked_student_uuids: string[]
          nid: string | null
          password_hash: string
          phone: string | null
          rejection_reason: string | null
          session_expires_at: string | null
          session_token: string | null
          status: string
          student_dob: string
          student_id: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          email: string
          email_verified?: boolean
          full_name: string
          id?: string
          last_login_at?: string | null
          linked_student_uuid?: string | null
          linked_student_uuids?: string[]
          nid?: string | null
          password_hash: string
          phone?: string | null
          rejection_reason?: string | null
          session_expires_at?: string | null
          session_token?: string | null
          status?: string
          student_dob: string
          student_id: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          email?: string
          email_verified?: boolean
          full_name?: string
          id?: string
          last_login_at?: string | null
          linked_student_uuid?: string | null
          linked_student_uuids?: string[]
          nid?: string | null
          password_hash?: string
          phone?: string | null
          rejection_reason?: string | null
          session_expires_at?: string | null
          session_token?: string | null
          status?: string
          student_dob?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_accounts_linked_student_uuid_fkey"
            columns: ["linked_student_uuid"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_accounts_linked_student_uuid_fkey"
            columns: ["linked_student_uuid"]
            isOneToOne: false
            referencedRelation: "students_public"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_messages: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          parent_account_id: string | null
          parent_thread_id: string | null
          read_at: string | null
          sender_name: string | null
          sender_type: string
          student_id: string | null
          subject: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          parent_account_id?: string | null
          parent_thread_id?: string | null
          read_at?: string | null
          sender_name?: string | null
          sender_type?: string
          student_id?: string | null
          subject: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          parent_account_id?: string | null
          parent_thread_id?: string | null
          read_at?: string | null
          sender_name?: string | null
          sender_type?: string
          student_id?: string | null
          subject?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parent_messages_parent_account_id_fkey"
            columns: ["parent_account_id"]
            isOneToOne: false
            referencedRelation: "parent_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_messages_parent_thread_id_fkey"
            columns: ["parent_thread_id"]
            isOneToOne: false
            referencedRelation: "parent_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_messages_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_messages_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students_public"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_payment_requests: {
        Row: {
          amount: number
          created_at: string
          fee_assignment_ids: string[]
          id: string
          method: string
          note: string | null
          parent_account_id: string
          payment_record_id: string | null
          rejection_reason: string | null
          sender_phone: string | null
          status: string
          student_uuid: string
          trx_id: string | null
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          fee_assignment_ids?: string[]
          id?: string
          method: string
          note?: string | null
          parent_account_id: string
          payment_record_id?: string | null
          rejection_reason?: string | null
          sender_phone?: string | null
          status?: string
          student_uuid: string
          trx_id?: string | null
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          fee_assignment_ids?: string[]
          id?: string
          method?: string
          note?: string | null
          parent_account_id?: string
          payment_record_id?: string | null
          rejection_reason?: string | null
          sender_phone?: string | null
          status?: string
          student_uuid?: string
          trx_id?: string | null
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parent_payment_requests_parent_account_id_fkey"
            columns: ["parent_account_id"]
            isOneToOne: false
            referencedRelation: "parent_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_signup_field_config: {
        Row: {
          created_at: string
          display_order: number
          field_key: string
          field_type: string
          id: string
          is_locked: boolean
          is_required: boolean
          is_visible: boolean
          label_bn: string
          label_en: string
          max_length: number | null
          min_length: number | null
          placeholder_bn: string | null
          placeholder_en: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          field_key: string
          field_type?: string
          id?: string
          is_locked?: boolean
          is_required?: boolean
          is_visible?: boolean
          label_bn: string
          label_en: string
          max_length?: number | null
          min_length?: number | null
          placeholder_bn?: string | null
          placeholder_en?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          field_key?: string
          field_type?: string
          id?: string
          is_locked?: boolean
          is_required?: boolean
          is_visible?: boolean
          label_bn?: string
          label_en?: string
          max_length?: number | null
          min_length?: number | null
          placeholder_bn?: string | null
          placeholder_en?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      parent_student_link_audit: {
        Row: {
          action: string
          after_uuids: string[]
          before_uuids: string[]
          created_at: string
          id: string
          match_reason: string | null
          notes: string | null
          parent_account_id: string
          source: string
          student_uuid: string | null
          triggered_by_student_uuid: string | null
        }
        Insert: {
          action: string
          after_uuids?: string[]
          before_uuids?: string[]
          created_at?: string
          id?: string
          match_reason?: string | null
          notes?: string | null
          parent_account_id: string
          source?: string
          student_uuid?: string | null
          triggered_by_student_uuid?: string | null
        }
        Update: {
          action?: string
          after_uuids?: string[]
          before_uuids?: string[]
          created_at?: string
          id?: string
          match_reason?: string | null
          notes?: string | null
          parent_account_id?: string
          source?: string
          student_uuid?: string | null
          triggered_by_student_uuid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parent_student_link_audit_parent_account_id_fkey"
            columns: ["parent_account_id"]
            isOneToOne: false
            referencedRelation: "parent_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      password_policy: {
        Row: {
          block_leaked_passwords: boolean
          id: number
          min_length: number
          require_lowercase: boolean
          require_number: boolean
          require_special: boolean
          require_uppercase: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          block_leaked_passwords?: boolean
          id?: number
          min_length?: number
          require_lowercase?: boolean
          require_number?: boolean
          require_special?: boolean
          require_uppercase?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          block_leaked_passwords?: boolean
          id?: number
          min_length?: number
          require_lowercase?: boolean
          require_number?: boolean
          require_special?: boolean
          require_uppercase?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      payment_gateway_config: {
        Row: {
          api_key: string
          api_secret: string
          api_url: string
          callback_url: string
          created_at: string
          extra_config: Json | null
          id: string
          is_enabled: boolean
          is_sandbox: boolean
          merchant_id: string
          provider: string
          provider_name: string
          updated_at: string
          webhook_secret: string
        }
        Insert: {
          api_key?: string
          api_secret?: string
          api_url?: string
          callback_url?: string
          created_at?: string
          extra_config?: Json | null
          id?: string
          is_enabled?: boolean
          is_sandbox?: boolean
          merchant_id?: string
          provider?: string
          provider_name?: string
          updated_at?: string
          webhook_secret?: string
        }
        Update: {
          api_key?: string
          api_secret?: string
          api_url?: string
          callback_url?: string
          created_at?: string
          extra_config?: Json | null
          id?: string
          is_enabled?: boolean
          is_sandbox?: boolean
          merchant_id?: string
          provider?: string
          provider_name?: string
          updated_at?: string
          webhook_secret?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          fee_assignment_ids: string[]
          fee_type: string
          id: string
          notes: string | null
          parent_account_id: string | null
          payer_name: string | null
          payer_phone: string | null
          payment_method: string | null
          reconciled_at: string | null
          source: string
          status: string
          student_id: string | null
          transaction_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          fee_assignment_ids?: string[]
          fee_type: string
          id?: string
          notes?: string | null
          parent_account_id?: string | null
          payer_name?: string | null
          payer_phone?: string | null
          payment_method?: string | null
          reconciled_at?: string | null
          source?: string
          status?: string
          student_id?: string | null
          transaction_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          fee_assignment_ids?: string[]
          fee_type?: string
          id?: string
          notes?: string | null
          parent_account_id?: string | null
          payer_name?: string | null
          payer_phone?: string | null
          payment_method?: string | null
          reconciled_at?: string | null
          source?: string
          status?: string
          student_id?: string | null
          transaction_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students_public"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_actions: {
        Row: {
          action_type: string
          admin_note: string | null
          created_at: string | null
          id: string
          menu_path: string
          payload: Json
          requires_admin_approval: boolean | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          target_id: string | null
          target_table: string
          updated_at: string | null
          user_email: string | null
          user_id: string
          user_name: string | null
        }
        Insert: {
          action_type?: string
          admin_note?: string | null
          created_at?: string | null
          id?: string
          menu_path: string
          payload?: Json
          requires_admin_approval?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_id?: string | null
          target_table: string
          updated_at?: string | null
          user_email?: string | null
          user_id: string
          user_name?: string | null
        }
        Update: {
          action_type?: string
          admin_note?: string | null
          created_at?: string | null
          id?: string
          menu_path?: string
          payload?: Json
          requires_admin_approval?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_id?: string | null
          target_table?: string
          updated_at?: string | null
          user_email?: string | null
          user_id?: string
          user_name?: string | null
        }
        Relationships: []
      }
      post_comments: {
        Row: {
          comment_text: string
          commenter_name: string
          created_at: string | null
          id: string
          is_approved: boolean | null
          post_id: string
        }
        Insert: {
          comment_text: string
          commenter_name: string
          created_at?: string | null
          id?: string
          is_approved?: boolean | null
          post_id: string
        }
        Update: {
          comment_text?: string
          commenter_name?: string
          created_at?: string | null
          id?: string
          is_approved?: boolean | null
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          visitor_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          visitor_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          visitor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          attachments: Json | null
          category: string
          content: string | null
          content_bn: string | null
          created_at: string | null
          created_by: string | null
          id: string
          is_published: boolean | null
          published_at: string | null
          title: string
          title_bn: string | null
          updated_at: string | null
        }
        Insert: {
          attachments?: Json | null
          category?: string
          content?: string | null
          content_bn?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_published?: boolean | null
          published_at?: string | null
          title: string
          title_bn?: string | null
          updated_at?: string | null
        }
        Update: {
          attachments?: Json | null
          category?: string
          content?: string | null
          content_bn?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_published?: boolean | null
          published_at?: string | null
          title?: string
          title_bn?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string
          phone: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      promotion_history: {
        Row: {
          created_at: string
          from_class_id: string | null
          from_division_id: string | null
          from_roll_number: string | null
          from_session_id: string | null
          id: string
          promoted_by: string | null
          promotion_type: string
          remarks: string | null
          student_id: string
          to_class_id: string | null
          to_division_id: string | null
          to_roll_number: string | null
          to_session_id: string | null
        }
        Insert: {
          created_at?: string
          from_class_id?: string | null
          from_division_id?: string | null
          from_roll_number?: string | null
          from_session_id?: string | null
          id?: string
          promoted_by?: string | null
          promotion_type?: string
          remarks?: string | null
          student_id: string
          to_class_id?: string | null
          to_division_id?: string | null
          to_roll_number?: string | null
          to_session_id?: string | null
        }
        Update: {
          created_at?: string
          from_class_id?: string | null
          from_division_id?: string | null
          from_roll_number?: string | null
          from_session_id?: string | null
          id?: string
          promoted_by?: string | null
          promotion_type?: string
          remarks?: string | null
          student_id?: string
          to_class_id?: string | null
          to_division_id?: string | null
          to_roll_number?: string | null
          to_session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promotion_history_from_class_id_fkey"
            columns: ["from_class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_history_from_division_id_fkey"
            columns: ["from_division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_history_from_session_id_fkey"
            columns: ["from_session_id"]
            isOneToOne: false
            referencedRelation: "academic_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_history_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_history_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_history_to_class_id_fkey"
            columns: ["to_class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_history_to_division_id_fkey"
            columns: ["to_division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_history_to_session_id_fkey"
            columns: ["to_session_id"]
            isOneToOne: false
            referencedRelation: "academic_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      published_results: {
        Row: {
          created_at: string
          exam_id: string
          gpa: number | null
          grade: string | null
          id: string
          marks: number | null
          published_at: string
          published_by: string | null
          student_id: string
          subject_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          exam_id: string
          gpa?: number | null
          grade?: string | null
          id?: string
          marks?: number | null
          published_at?: string
          published_by?: string | null
          student_id: string
          subject_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          exam_id?: string
          gpa?: number | null
          grade?: string | null
          id?: string
          marks?: number | null
          published_at?: string
          published_by?: string | null
          student_id?: string
          subject_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      push_notification_log: {
        Row: {
          body: string | null
          category: string | null
          created_at: string | null
          failed_count: number | null
          id: string
          link: string | null
          sent_count: number | null
          title: string
          triggered_by: string | null
        }
        Insert: {
          body?: string | null
          category?: string | null
          created_at?: string | null
          failed_count?: number | null
          id?: string
          link?: string | null
          sent_count?: number | null
          title: string
          triggered_by?: string | null
        }
        Update: {
          body?: string | null
          category?: string | null
          created_at?: string | null
          failed_count?: number | null
          id?: string
          link?: string | null
          sent_count?: number | null
          title?: string
          triggered_by?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string | null
          endpoint: string
          id: string
          is_active: boolean | null
          last_used_at: string | null
          p256dh: string
          updated_at: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          auth: string
          created_at?: string | null
          endpoint: string
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          p256dh: string
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          auth?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          p256dh?: string
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      question_papers: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          class_id: string | null
          created_at: string
          created_by: string | null
          division_id: string | null
          duration_minutes: number
          exam_session_id: string | null
          font_config: Json | null
          header_config: Json | null
          id: string
          instructions: string | null
          instructions_bn: string | null
          layout_settings: Json | null
          rejection_note: string | null
          status: string
          subject_id: string | null
          subject_type: string
          title: string
          title_bn: string
          total_marks: number
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          class_id?: string | null
          created_at?: string
          created_by?: string | null
          division_id?: string | null
          duration_minutes?: number
          exam_session_id?: string | null
          font_config?: Json | null
          header_config?: Json | null
          id?: string
          instructions?: string | null
          instructions_bn?: string | null
          layout_settings?: Json | null
          rejection_note?: string | null
          status?: string
          subject_id?: string | null
          subject_type?: string
          title: string
          title_bn: string
          total_marks?: number
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          class_id?: string | null
          created_at?: string
          created_by?: string | null
          division_id?: string | null
          duration_minutes?: number
          exam_session_id?: string | null
          font_config?: Json | null
          header_config?: Json | null
          id?: string
          instructions?: string | null
          instructions_bn?: string | null
          layout_settings?: Json | null
          rejection_note?: string | null
          status?: string
          subject_id?: string | null
          subject_type?: string
          title?: string
          title_bn?: string
          total_marks?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_papers_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_papers_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_papers_exam_session_id_fkey"
            columns: ["exam_session_id"]
            isOneToOne: false
            referencedRelation: "exam_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_papers_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          answer: string | null
          created_at: string
          custom_label: string | null
          group_label: string | null
          group_label_bn: string | null
          id: string
          marks: number
          options: Json | null
          paper_id: string
          question_text: string
          question_text_bn: string | null
          question_type: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          answer?: string | null
          created_at?: string
          custom_label?: string | null
          group_label?: string | null
          group_label_bn?: string | null
          id?: string
          marks?: number
          options?: Json | null
          paper_id: string
          question_text: string
          question_text_bn?: string | null
          question_type?: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          answer?: string | null
          created_at?: string
          custom_label?: string | null
          group_label?: string | null
          group_label_bn?: string | null
          id?: string
          marks?: number
          options?: Json | null
          paper_id?: string
          question_text?: string
          question_text_bn?: string | null
          question_type?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_paper_id_fkey"
            columns: ["paper_id"]
            isOneToOne: false
            referencedRelation: "question_papers"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limit_config: {
        Row: {
          action: string
          category: string
          created_at: string
          description: string | null
          enabled: boolean
          id: string
          is_user_managed: boolean
          label_bn: string | null
          label_en: string | null
          max_requests: number
          scope: string
          updated_at: string
          window_seconds: number
        }
        Insert: {
          action: string
          category?: string
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          is_user_managed?: boolean
          label_bn?: string | null
          label_en?: string | null
          max_requests?: number
          scope?: string
          updated_at?: string
          window_seconds?: number
        }
        Update: {
          action?: string
          category?: string
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          is_user_managed?: boolean
          label_bn?: string | null
          label_en?: string | null
          max_requests?: number
          scope?: string
          updated_at?: string
          window_seconds?: number
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          action: string
          blocked_count: number
          bucket_key: string
          created_at: string
          id: string
          last_request_at: string
          request_count: number
          scope: string
          window_start: string
        }
        Insert: {
          action: string
          blocked_count?: number
          bucket_key: string
          created_at?: string
          id?: string
          last_request_at?: string
          request_count?: number
          scope: string
          window_start?: string
        }
        Update: {
          action?: string
          blocked_count?: number
          bucket_key?: string
          created_at?: string
          id?: string
          last_request_at?: string
          request_count?: number
          scope?: string
          window_start?: string
        }
        Relationships: []
      }
      receipt_counter: {
        Row: {
          current_year: number
          id: string
          last_number: number
          prefix: string
          updated_at: string | null
        }
        Insert: {
          current_year?: number
          id?: string
          last_number?: number
          prefix?: string
          updated_at?: string | null
        }
        Update: {
          current_year?: number
          id?: string
          last_number?: number
          prefix?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      receipt_settings: {
        Row: {
          created_at: string | null
          design_config: Json
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          name_bn: string
          paper_size: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          design_config?: Json
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          name_bn?: string
          paper_size?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          design_config?: Json
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          name_bn?: string
          paper_size?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      receipt_status_audit: {
        Row: {
          amount: number | null
          change_source: string | null
          changed_at: string
          changed_by: string | null
          changed_by_name: string | null
          id: string
          ip_address: string | null
          new_status: string
          note: string | null
          old_status: string | null
          payment_method: string | null
          receipt_number: string | null
          rejection_reason: string | null
          source_id: string
          source_table: string
          student_id: string | null
          trx_id: string | null
          user_agent: string | null
        }
        Insert: {
          amount?: number | null
          change_source?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_by_name?: string | null
          id?: string
          ip_address?: string | null
          new_status: string
          note?: string | null
          old_status?: string | null
          payment_method?: string | null
          receipt_number?: string | null
          rejection_reason?: string | null
          source_id: string
          source_table: string
          student_id?: string | null
          trx_id?: string | null
          user_agent?: string | null
        }
        Update: {
          amount?: number | null
          change_source?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_by_name?: string | null
          id?: string
          ip_address?: string | null
          new_status?: string
          note?: string | null
          old_status?: string | null
          payment_method?: string | null
          receipt_number?: string | null
          rejection_reason?: string | null
          source_id?: string
          source_table?: string
          student_id?: string | null
          trx_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      receipt_verify_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          last_scanned_at: string | null
          receipt_id: string
          receipt_type: string
          revoked_at: string | null
          scan_count: number
          token: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          last_scanned_at?: string | null
          receipt_id: string
          receipt_type: string
          revoked_at?: string | null
          scan_count?: number
          token: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          last_scanned_at?: string | null
          receipt_id?: string
          receipt_type?: string
          revoked_at?: string | null
          scan_count?: number
          token?: string
        }
        Relationships: []
      }
      resign_letters: {
        Row: {
          created_at: string | null
          designation: string | null
          id: string
          letter_data: Json | null
          letter_date: string | null
          letter_number: string | null
          reason: string | null
          resign_date: string | null
          staff_id: string | null
          staff_name: string
          staff_name_bn: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          designation?: string | null
          id?: string
          letter_data?: Json | null
          letter_date?: string | null
          letter_number?: string | null
          reason?: string | null
          resign_date?: string | null
          staff_id?: string | null
          staff_name?: string
          staff_name_bn?: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          designation?: string | null
          id?: string
          letter_data?: Json | null
          letter_date?: string | null
          letter_number?: string | null
          reason?: string | null
          resign_date?: string | null
          staff_id?: string | null
          staff_name?: string
          staff_name_bn?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resign_letters_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      result_footer_audit: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          id: string
          new_value: Json | null
          old_value: Json | null
          scope: string
          scope_id: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          scope: string
          scope_id?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          scope?: string
          scope_id?: string | null
        }
        Relationships: []
      }
      result_print_footer_overrides: {
        Row: {
          created_at: string
          id: string
          scope: string
          scope_id: string
          show_footer_institution: boolean | null
          show_page_numbers: boolean | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          scope: string
          scope_id: string
          show_footer_institution?: boolean | null
          show_page_numbers?: boolean | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          scope?: string
          scope_id?: string
          show_footer_institution?: boolean | null
          show_page_numbers?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      result_signatories_audit: {
        Row: {
          action: string
          actor_id: string | null
          cleaned_value: Json | null
          created_at: string
          diff: Json | null
          id: string
          original_value: Json | null
          reason: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          cleaned_value?: Json | null
          created_at?: string
          diff?: Json | null
          id?: string
          original_value?: Json | null
          reason?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          cleaned_value?: Json | null
          created_at?: string
          diff?: Json | null
          id?: string
          original_value?: Json | null
          reason?: string | null
        }
        Relationships: []
      }
      results: {
        Row: {
          created_at: string | null
          created_by: string | null
          division_id: string | null
          exam_id: string
          gpa: number | null
          grade: string | null
          id: string
          marks: number | null
          student_id: string
          subject_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          division_id?: string | null
          exam_id: string
          gpa?: number | null
          grade?: string | null
          id?: string
          marks?: number | null
          student_id: string
          subject_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          division_id?: string | null
          exam_id?: string
          gpa?: number | null
          grade?: string | null
          id?: string
          marks?: number | null
          student_id?: string
          subject_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "results_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "results_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exam_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "results_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "results_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "results_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          can_add: boolean
          can_approve: boolean
          can_delete: boolean
          can_edit: boolean
          can_view: boolean
          created_at: string | null
          id: string
          menu_path: string
          role: string
          updated_at: string | null
        }
        Insert: {
          can_add?: boolean
          can_approve?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          created_at?: string | null
          id?: string
          menu_path: string
          role: string
          updated_at?: string | null
        }
        Update: {
          can_add?: boolean
          can_approve?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          created_at?: string | null
          id?: string
          menu_path?: string
          role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      role_translations: {
        Row: {
          created_at: string
          description_bn: string | null
          description_en: string | null
          id: string
          is_system: boolean
          name_bn: string
          name_en: string
          role_key: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description_bn?: string | null
          description_en?: string | null
          id?: string
          is_system?: boolean
          name_bn: string
          name_en: string
          role_key: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description_bn?: string | null
          description_en?: string | null
          id?: string
          is_system?: boolean
          name_bn?: string
          name_en?: string
          role_key?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      routine_periods: {
        Row: {
          break_label: string | null
          break_label_bn: string | null
          created_at: string | null
          day_of_week: number
          end_time: string
          id: string
          is_break: boolean | null
          period_number: number
          room: string | null
          routine_id: string
          start_time: string
          subject_id: string | null
          teacher_name: string | null
          teacher_name_bn: string | null
          updated_at: string | null
        }
        Insert: {
          break_label?: string | null
          break_label_bn?: string | null
          created_at?: string | null
          day_of_week: number
          end_time: string
          id?: string
          is_break?: boolean | null
          period_number: number
          room?: string | null
          routine_id: string
          start_time: string
          subject_id?: string | null
          teacher_name?: string | null
          teacher_name_bn?: string | null
          updated_at?: string | null
        }
        Update: {
          break_label?: string | null
          break_label_bn?: string | null
          created_at?: string | null
          day_of_week?: number
          end_time?: string
          id?: string
          is_break?: boolean | null
          period_number?: number
          room?: string | null
          routine_id?: string
          start_time?: string
          subject_id?: string | null
          teacher_name?: string | null
          teacher_name_bn?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "routine_periods_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "class_routines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routine_periods_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_generation_log: {
        Row: {
          action: string
          created_at: string
          generated_by: string | null
          generated_by_name: string | null
          id: string
          metadata: Json | null
          month_year: string
          net_salary: number | null
          reason: string | null
          source: string
          staff_id: string | null
          staff_name: string | null
          success: boolean
        }
        Insert: {
          action?: string
          created_at?: string
          generated_by?: string | null
          generated_by_name?: string | null
          id?: string
          metadata?: Json | null
          month_year: string
          net_salary?: number | null
          reason?: string | null
          source?: string
          staff_id?: string | null
          staff_name?: string | null
          success?: boolean
        }
        Update: {
          action?: string
          created_at?: string
          generated_by?: string | null
          generated_by_name?: string | null
          id?: string
          metadata?: Json | null
          month_year?: string
          net_salary?: number | null
          reason?: string | null
          source?: string
          staff_id?: string | null
          staff_name?: string | null
          success?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "salary_generation_log_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_pdf_columns: {
        Row: {
          align: string
          col_key: string
          created_at: string
          id: string
          label_bn: string
          label_en: string
          sort_order: number
          updated_at: string
          visible: boolean
          weight: number
        }
        Insert: {
          align?: string
          col_key: string
          created_at?: string
          id?: string
          label_bn: string
          label_en: string
          sort_order?: number
          updated_at?: string
          visible?: boolean
          weight?: number
        }
        Update: {
          align?: string
          col_key?: string
          created_at?: string
          id?: string
          label_bn?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
          visible?: boolean
          weight?: number
        }
        Relationships: []
      }
      salary_records: {
        Row: {
          absence_deduction: number | null
          absent_days: number | null
          advance_deduction: number | null
          approved_at: string | null
          approved_by: string | null
          approved_by_name: string | null
          approved_by_role: string | null
          approver_settings_id: string | null
          approver_staff_id: string | null
          base_salary: number
          base_salary_encrypted: string | null
          bonus: number | null
          calc_basis: string | null
          created_at: string | null
          deductions_deferred: boolean | null
          deleted_at: string | null
          duty_deduction: number
          earned_from_attendance: number | null
          id: string
          late_days: number | null
          late_deduction: number | null
          manual_override: boolean
          month_year: string
          net_salary: number
          net_salary_encrypted: string | null
          other_allowance: number | null
          other_allowance_note: string | null
          other_deduction: number | null
          other_deduction_note: string | null
          overtime: number | null
          overtime_for_net: number | null
          overtime_reason: string | null
          paid_at: string | null
          paid_by: string | null
          paid_by_name: string | null
          paid_by_role: string | null
          prepared_at: string | null
          prepared_by: string | null
          prepared_by_name: string | null
          prepared_by_role: string | null
          present_days: number | null
          remarks: string | null
          savings_deduction: number
          staff_id: string
          status: string | null
          treasurer_settings_id: string | null
          updated_at: string | null
          verified_at: string | null
          verified_by: string | null
          verified_by_name: string | null
          verified_by_role: string | null
          verifier_settings_id: string | null
          verifier_staff_id: string | null
          workflow_notes: string | null
          workflow_stage: string
          working_days: number | null
        }
        Insert: {
          absence_deduction?: number | null
          absent_days?: number | null
          advance_deduction?: number | null
          approved_at?: string | null
          approved_by?: string | null
          approved_by_name?: string | null
          approved_by_role?: string | null
          approver_settings_id?: string | null
          approver_staff_id?: string | null
          base_salary?: number
          base_salary_encrypted?: string | null
          bonus?: number | null
          calc_basis?: string | null
          created_at?: string | null
          deductions_deferred?: boolean | null
          deleted_at?: string | null
          duty_deduction?: number
          earned_from_attendance?: number | null
          id?: string
          late_days?: number | null
          late_deduction?: number | null
          manual_override?: boolean
          month_year: string
          net_salary?: number
          net_salary_encrypted?: string | null
          other_allowance?: number | null
          other_allowance_note?: string | null
          other_deduction?: number | null
          other_deduction_note?: string | null
          overtime?: number | null
          overtime_for_net?: number | null
          overtime_reason?: string | null
          paid_at?: string | null
          paid_by?: string | null
          paid_by_name?: string | null
          paid_by_role?: string | null
          prepared_at?: string | null
          prepared_by?: string | null
          prepared_by_name?: string | null
          prepared_by_role?: string | null
          present_days?: number | null
          remarks?: string | null
          savings_deduction?: number
          staff_id: string
          status?: string | null
          treasurer_settings_id?: string | null
          updated_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
          verified_by_name?: string | null
          verified_by_role?: string | null
          verifier_settings_id?: string | null
          verifier_staff_id?: string | null
          workflow_notes?: string | null
          workflow_stage?: string
          working_days?: number | null
        }
        Update: {
          absence_deduction?: number | null
          absent_days?: number | null
          advance_deduction?: number | null
          approved_at?: string | null
          approved_by?: string | null
          approved_by_name?: string | null
          approved_by_role?: string | null
          approver_settings_id?: string | null
          approver_staff_id?: string | null
          base_salary?: number
          base_salary_encrypted?: string | null
          bonus?: number | null
          calc_basis?: string | null
          created_at?: string | null
          deductions_deferred?: boolean | null
          deleted_at?: string | null
          duty_deduction?: number
          earned_from_attendance?: number | null
          id?: string
          late_days?: number | null
          late_deduction?: number | null
          manual_override?: boolean
          month_year?: string
          net_salary?: number
          net_salary_encrypted?: string | null
          other_allowance?: number | null
          other_allowance_note?: string | null
          other_deduction?: number | null
          other_deduction_note?: string | null
          overtime?: number | null
          overtime_for_net?: number | null
          overtime_reason?: string | null
          paid_at?: string | null
          paid_by?: string | null
          paid_by_name?: string | null
          paid_by_role?: string | null
          prepared_at?: string | null
          prepared_by?: string | null
          prepared_by_name?: string | null
          prepared_by_role?: string | null
          present_days?: number | null
          remarks?: string | null
          savings_deduction?: number
          staff_id?: string
          status?: string | null
          treasurer_settings_id?: string | null
          updated_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
          verified_by_name?: string | null
          verified_by_role?: string | null
          verifier_settings_id?: string | null
          verifier_staff_id?: string | null
          workflow_notes?: string | null
          workflow_stage?: string
          working_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "salary_records_approver_settings_id_fkey"
            columns: ["approver_settings_id"]
            isOneToOne: false
            referencedRelation: "salary_workflow_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_records_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_records_treasurer_settings_id_fkey"
            columns: ["treasurer_settings_id"]
            isOneToOne: false
            referencedRelation: "salary_workflow_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_records_verifier_settings_id_fkey"
            columns: ["verifier_settings_id"]
            isOneToOne: false
            referencedRelation: "salary_workflow_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_savings: {
        Row: {
          created_at: string
          disbursed_amount: number | null
          disbursed_at: string | null
          duration_months: number
          expense_category_id: string | null
          expense_id: string | null
          expense_institution_id: string | null
          id: string
          is_active: boolean
          monthly_amount: number
          staff_id: string
          start_month: string
          total_saved: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          disbursed_amount?: number | null
          disbursed_at?: string | null
          duration_months?: number
          expense_category_id?: string | null
          expense_id?: string | null
          expense_institution_id?: string | null
          id?: string
          is_active?: boolean
          monthly_amount?: number
          staff_id: string
          start_month: string
          total_saved?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          disbursed_amount?: number | null
          disbursed_at?: string | null
          duration_months?: number
          expense_category_id?: string | null
          expense_id?: string | null
          expense_institution_id?: string | null
          id?: string
          is_active?: boolean
          monthly_amount?: number
          staff_id?: string
          start_month?: string
          total_saved?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "salary_savings_expense_category_id_fkey"
            columns: ["expense_category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_savings_expense_institution_id_fkey"
            columns: ["expense_institution_id"]
            isOneToOne: false
            referencedRelation: "expense_institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_savings_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_savings_ledger: {
        Row: {
          amount: number
          created_at: string
          id: string
          month_year: string
          savings_id: string
          staff_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          month_year: string
          savings_id: string
          staff_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          month_year?: string
          savings_id?: string
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "salary_savings_ledger_savings_id_fkey"
            columns: ["savings_id"]
            isOneToOne: false
            referencedRelation: "salary_savings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_savings_ledger_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_settings: {
        Row: {
          created_at: string | null
          description: string | null
          description_bn: string | null
          id: string
          is_active: boolean | null
          setting_key: string
          setting_value: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          description_bn?: string | null
          id?: string
          is_active?: boolean | null
          setting_key: string
          setting_value?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          description_bn?: string | null
          id?: string
          is_active?: boolean | null
          setting_key?: string
          setting_value?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      salary_sheet_memos: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          memo_no: string
          month_year: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          memo_no: string
          month_year: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          memo_no?: string
          month_year?: string
        }
        Relationships: []
      }
      salary_workflow_history: {
        Row: {
          action: string
          actor_name: string | null
          actor_role: string | null
          actor_user_id: string | null
          created_at: string
          from_stage: string | null
          id: string
          month_year: string | null
          notes: string | null
          salary_record_id: string | null
          staff_id: string | null
          target_name: string | null
          target_staff_id: string | null
          to_stage: string
        }
        Insert: {
          action: string
          actor_name?: string | null
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          from_stage?: string | null
          id?: string
          month_year?: string | null
          notes?: string | null
          salary_record_id?: string | null
          staff_id?: string | null
          target_name?: string | null
          target_staff_id?: string | null
          to_stage: string
        }
        Update: {
          action?: string
          actor_name?: string | null
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          from_stage?: string | null
          id?: string
          month_year?: string | null
          notes?: string | null
          salary_record_id?: string | null
          staff_id?: string | null
          target_name?: string | null
          target_staff_id?: string | null
          to_stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "salary_workflow_history_salary_record_id_fkey"
            columns: ["salary_record_id"]
            isOneToOne: false
            referencedRelation: "salary_records"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_workflow_settings: {
        Row: {
          admin_officer_id: string | null
          created_at: string
          designation: string | null
          display_name: string | null
          id: string
          is_active: boolean
          is_custom: boolean
          is_default: boolean
          role: string
          sort_order: number
          source: string | null
          staff_id: string | null
          updated_at: string
        }
        Insert: {
          admin_officer_id?: string | null
          created_at?: string
          designation?: string | null
          display_name?: string | null
          id?: string
          is_active?: boolean
          is_custom?: boolean
          is_default?: boolean
          role: string
          sort_order?: number
          source?: string | null
          staff_id?: string | null
          updated_at?: string
        }
        Update: {
          admin_officer_id?: string | null
          created_at?: string
          designation?: string | null
          display_name?: string | null
          id?: string
          is_active?: boolean
          is_custom?: boolean
          is_default?: boolean
          role?: string
          sort_order?: number
          source?: string | null
          staff_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "salary_workflow_settings_admin_officer_id_fkey"
            columns: ["admin_officer_id"]
            isOneToOne: false
            referencedRelation: "administrative_officers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_workflow_settings_admin_officer_id_fkey"
            columns: ["admin_officer_id"]
            isOneToOne: false
            referencedRelation: "administrative_officers_public"
            referencedColumns: ["id"]
          },
        ]
      }
      scholarship_awards: {
        Row: {
          academic_session_id: string | null
          awarded_amount: number
          awarded_by: string | null
          awarded_date: string
          created_at: string
          deleted_at: string | null
          id: string
          notes: string | null
          scholarship_id: string
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          academic_session_id?: string | null
          awarded_amount?: number
          awarded_by?: string | null
          awarded_date?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          notes?: string | null
          scholarship_id: string
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          academic_session_id?: string | null
          awarded_amount?: number
          awarded_by?: string | null
          awarded_date?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          notes?: string | null
          scholarship_id?: string
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scholarship_awards_academic_session_id_fkey"
            columns: ["academic_session_id"]
            isOneToOne: false
            referencedRelation: "academic_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scholarship_awards_scholarship_id_fkey"
            columns: ["scholarship_id"]
            isOneToOne: false
            referencedRelation: "scholarships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scholarship_awards_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scholarship_awards_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students_public"
            referencedColumns: ["id"]
          },
        ]
      }
      scholarships: {
        Row: {
          academic_session_id: string | null
          class_id: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          discount_type: string
          discount_value: number
          eligibility_criteria: string | null
          id: string
          is_active: boolean | null
          max_recipients: number | null
          name: string
          name_bn: string
          scholarship_type: string
          updated_at: string
        }
        Insert: {
          academic_session_id?: string | null
          class_id?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          eligibility_criteria?: string | null
          id?: string
          is_active?: boolean | null
          max_recipients?: number | null
          name: string
          name_bn: string
          scholarship_type?: string
          updated_at?: string
        }
        Update: {
          academic_session_id?: string | null
          class_id?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          eligibility_criteria?: string | null
          id?: string
          is_active?: boolean | null
          max_recipients?: number | null
          name?: string
          name_bn?: string
          scholarship_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scholarships_academic_session_id_fkey"
            columns: ["academic_session_id"]
            isOneToOne: false
            referencedRelation: "academic_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scholarships_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      security_alerts: {
        Row: {
          alert_type: string
          created_at: string
          details: Json | null
          device_id: string | null
          endpoint: string | null
          id: string
          ip_address: string | null
          registered_devices: string[] | null
          severity: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          alert_type: string
          created_at?: string
          details?: Json | null
          device_id?: string | null
          endpoint?: string | null
          id?: string
          ip_address?: string | null
          registered_devices?: string[] | null
          severity?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          alert_type?: string
          created_at?: string
          details?: Json | null
          device_id?: string | null
          endpoint?: string | null
          id?: string
          ip_address?: string | null
          registered_devices?: string[] | null
          severity?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      security_events: {
        Row: {
          created_at: string
          details: Json | null
          email: string | null
          event_type: string
          id: string
          ip_address: string | null
          reason: string | null
          severity: string
          target_user_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          details?: Json | null
          email?: string | null
          event_type: string
          id?: string
          ip_address?: string | null
          reason?: string | null
          severity?: string
          target_user_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          details?: Json | null
          email?: string | null
          event_type?: string
          id?: string
          ip_address?: string | null
          reason?: string | null
          severity?: string
          target_user_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      security_logs: {
        Row: {
          bucket_id: string | null
          created_at: string
          event_type: string
          http_status: number | null
          id: string
          ip_address: string | null
          metadata: Json | null
          object_path: string | null
          reason: string | null
          resource: string | null
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string
          event_type: string
          http_status?: number | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          object_path?: string | null
          reason?: string | null
          resource?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string
          event_type?: string
          http_status?: number | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          object_path?: string | null
          reason?: string | null
          resource?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      shift_time_audit_log: {
        Row: {
          affected_salary_records: number
          affected_staff_count: number
          affected_staff_ids: Json | null
          category_key: string
          category_label: string | null
          changed_by: string | null
          changed_by_name: string | null
          created_at: string
          id: string
          new_end: string | null
          new_start: string | null
          notes: string | null
          old_end: string | null
          old_start: string | null
        }
        Insert: {
          affected_salary_records?: number
          affected_staff_count?: number
          affected_staff_ids?: Json | null
          category_key: string
          category_label?: string | null
          changed_by?: string | null
          changed_by_name?: string | null
          created_at?: string
          id?: string
          new_end?: string | null
          new_start?: string | null
          notes?: string | null
          old_end?: string | null
          old_start?: string | null
        }
        Update: {
          affected_salary_records?: number
          affected_staff_count?: number
          affected_staff_ids?: Json | null
          category_key?: string
          category_label?: string | null
          changed_by?: string | null
          changed_by_name?: string | null
          created_at?: string
          id?: string
          new_end?: string | null
          new_start?: string | null
          notes?: string | null
          old_end?: string | null
          old_start?: string | null
        }
        Relationships: []
      }
      sms_gateway_config: {
        Row: {
          api_key: string
          api_secret: string
          api_url: string
          created_at: string
          extra_config: Json | null
          id: string
          is_enabled: boolean
          provider: string
          provider_name: string
          sender_id: string
          updated_at: string
        }
        Insert: {
          api_key?: string
          api_secret?: string
          api_url?: string
          created_at?: string
          extra_config?: Json | null
          id?: string
          is_enabled?: boolean
          provider?: string
          provider_name?: string
          sender_id?: string
          updated_at?: string
        }
        Update: {
          api_key?: string
          api_secret?: string
          api_url?: string
          created_at?: string
          extra_config?: Json | null
          id?: string
          is_enabled?: boolean
          provider?: string
          provider_name?: string
          sender_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      smtp_config: {
        Row: {
          created_at: string
          from_email: string
          from_name: string
          id: string
          is_enabled: boolean
          name: string
          notes: string | null
          priority: number
          purpose: string
          smtp_host: string
          smtp_password: string
          smtp_port: number
          smtp_username: string
          updated_at: string
          use_tls: boolean
        }
        Insert: {
          created_at?: string
          from_email?: string
          from_name?: string
          id?: string
          is_enabled?: boolean
          name?: string
          notes?: string | null
          priority?: number
          purpose?: string
          smtp_host?: string
          smtp_password?: string
          smtp_port?: number
          smtp_username?: string
          updated_at?: string
          use_tls?: boolean
        }
        Update: {
          created_at?: string
          from_email?: string
          from_name?: string
          id?: string
          is_enabled?: boolean
          name?: string
          notes?: string | null
          priority?: number
          purpose?: string
          smtp_host?: string
          smtp_password?: string
          smtp_port?: number
          smtp_username?: string
          updated_at?: string
          use_tls?: boolean
        }
        Relationships: []
      }
      staff: {
        Row: {
          address: string | null
          created_at: string | null
          custom_role_id: string | null
          date_of_birth: string | null
          deleted_at: string | null
          department: string | null
          designation: string | null
          duty_end_time: string | null
          duty_start_time: string | null
          education: string | null
          email: string | null
          employment_type: string | null
          experience: string | null
          id: string
          include_in_attendance: boolean
          include_in_payroll: boolean
          joining_date: string | null
          name_bn: string
          name_en: string | null
          nid: string | null
          phone: string | null
          photo_url: string | null
          previous_institute: string | null
          religion: string | null
          residence_type: string | null
          salary: number | null
          salary_encrypted: string | null
          salary_order: number | null
          staff_category: string
          staff_data: Json | null
          staff_id: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          custom_role_id?: string | null
          date_of_birth?: string | null
          deleted_at?: string | null
          department?: string | null
          designation?: string | null
          duty_end_time?: string | null
          duty_start_time?: string | null
          education?: string | null
          email?: string | null
          employment_type?: string | null
          experience?: string | null
          id?: string
          include_in_attendance?: boolean
          include_in_payroll?: boolean
          joining_date?: string | null
          name_bn: string
          name_en?: string | null
          nid?: string | null
          phone?: string | null
          photo_url?: string | null
          previous_institute?: string | null
          religion?: string | null
          residence_type?: string | null
          salary?: number | null
          salary_encrypted?: string | null
          salary_order?: number | null
          staff_category?: string
          staff_data?: Json | null
          staff_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          custom_role_id?: string | null
          date_of_birth?: string | null
          deleted_at?: string | null
          department?: string | null
          designation?: string | null
          duty_end_time?: string | null
          duty_start_time?: string | null
          education?: string | null
          email?: string | null
          employment_type?: string | null
          experience?: string | null
          id?: string
          include_in_attendance?: boolean
          include_in_payroll?: boolean
          joining_date?: string | null
          name_bn?: string
          name_en?: string | null
          nid?: string | null
          phone?: string | null
          photo_url?: string | null
          previous_institute?: string | null
          religion?: string | null
          residence_type?: string | null
          salary?: number | null
          salary_encrypted?: string | null
          salary_order?: number | null
          staff_category?: string
          staff_data?: Json | null
          staff_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_custom_role_id_fkey"
            columns: ["custom_role_id"]
            isOneToOne: false
            referencedRelation: "custom_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_categories: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          id_prefix: string | null
          id_start_range: number | null
          is_active: boolean | null
          key: string
          name: string
          name_bn: string
          route_path: string | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          id_prefix?: string | null
          id_start_range?: number | null
          is_active?: boolean | null
          key: string
          name: string
          name_bn: string
          route_path?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          id_prefix?: string | null
          id_start_range?: number | null
          is_active?: boolean | null
          key?: string
          name?: string
          name_bn?: string
          route_path?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      staff_holidays: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          holiday_date: string
          holiday_type: string
          id: string
          is_paid: boolean
          name_bn: string | null
          name_en: string | null
          notes: string | null
          updated_at: string
          weekday: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          holiday_date: string
          holiday_type?: string
          id?: string
          is_paid?: boolean
          name_bn?: string | null
          name_en?: string | null
          notes?: string | null
          updated_at?: string
          weekday?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          holiday_date?: string
          holiday_type?: string
          id?: string
          is_paid?: boolean
          name_bn?: string | null
          name_en?: string | null
          notes?: string | null
          updated_at?: string
          weekday?: number | null
        }
        Relationships: []
      }
      staff_machine_users: {
        Row: {
          created_at: string
          device_serial: string | null
          device_user_id: string
          finger_index: number | null
          id: string
          is_active: boolean
          note: string | null
          staff_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          device_serial?: string | null
          device_user_id: string
          finger_index?: number | null
          id?: string
          is_active?: boolean
          note?: string | null
          staff_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          device_serial?: string | null
          device_user_id?: string
          finger_index?: number | null
          id?: string
          is_active?: boolean
          note?: string | null
          staff_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_machine_users_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_promotions: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          effective_date: string
          id: string
          issued_by: string | null
          letter_file_url: string | null
          letter_number: string | null
          new_designation: string
          notes: string | null
          old_designation: string | null
          reason: string | null
          staff_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          effective_date?: string
          id?: string
          issued_by?: string | null
          letter_file_url?: string | null
          letter_number?: string | null
          new_designation: string
          notes?: string | null
          old_designation?: string | null
          reason?: string | null
          staff_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          effective_date?: string
          id?: string
          issued_by?: string | null
          letter_file_url?: string | null
          letter_number?: string | null
          new_designation?: string
          notes?: string | null
          old_designation?: string | null
          reason?: string | null
          staff_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_promotions_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_salary_changes: {
        Row: {
          change_type: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          effective_date: string
          id: string
          issued_by: string | null
          letter_file_url: string | null
          letter_number: string | null
          new_salary: number
          notes: string | null
          old_salary: number | null
          reason: string | null
          staff_id: string
          updated_at: string
        }
        Insert: {
          change_type: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          effective_date?: string
          id?: string
          issued_by?: string | null
          letter_file_url?: string | null
          letter_number?: string | null
          new_salary: number
          notes?: string | null
          old_salary?: number | null
          reason?: string | null
          staff_id: string
          updated_at?: string
        }
        Update: {
          change_type?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          effective_date?: string
          id?: string
          issued_by?: string | null
          letter_file_url?: string | null
          letter_number?: string | null
          new_salary?: number
          notes?: string | null
          old_salary?: number | null
          reason?: string | null
          staff_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_salary_changes_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      student_accounts: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          contact: string
          contact_type: string
          contact_verified: boolean
          created_at: string
          full_name: string
          id: string
          last_login_at: string | null
          linked_student_uuid: string
          password_hash: string
          rejection_reason: string | null
          status: string
          student_dob: string
          student_id: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          contact: string
          contact_type: string
          contact_verified?: boolean
          created_at?: string
          full_name: string
          id?: string
          last_login_at?: string | null
          linked_student_uuid: string
          password_hash: string
          rejection_reason?: string | null
          status?: string
          student_dob: string
          student_id: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          contact?: string
          contact_type?: string
          contact_verified?: boolean
          created_at?: string
          full_name?: string
          id?: string
          last_login_at?: string | null
          linked_student_uuid?: string
          password_hash?: string
          rejection_reason?: string | null
          status?: string
          student_dob?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      student_categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          name_bn: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          name_bn: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_bn?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      student_certificates: {
        Row: {
          achievements: string | null
          achievements_bn: string | null
          certificate_category: string | null
          certificate_type: string
          conduct: string | null
          conduct_bn: string | null
          created_at: string
          custom_data: Json | null
          date_of_admission: string | null
          date_of_leaving: string | null
          deleted_at: string | null
          id: string
          issue_date: string
          issued_by: string | null
          last_class_attended: string | null
          last_class_attended_bn: string | null
          purpose: string | null
          purpose_bn: string | null
          reason: string | null
          reason_bn: string | null
          remarks: string | null
          remarks_bn: string | null
          serial_number: string
          student_id: string
          updated_at: string
        }
        Insert: {
          achievements?: string | null
          achievements_bn?: string | null
          certificate_category?: string | null
          certificate_type: string
          conduct?: string | null
          conduct_bn?: string | null
          created_at?: string
          custom_data?: Json | null
          date_of_admission?: string | null
          date_of_leaving?: string | null
          deleted_at?: string | null
          id?: string
          issue_date?: string
          issued_by?: string | null
          last_class_attended?: string | null
          last_class_attended_bn?: string | null
          purpose?: string | null
          purpose_bn?: string | null
          reason?: string | null
          reason_bn?: string | null
          remarks?: string | null
          remarks_bn?: string | null
          serial_number: string
          student_id: string
          updated_at?: string
        }
        Update: {
          achievements?: string | null
          achievements_bn?: string | null
          certificate_category?: string | null
          certificate_type?: string
          conduct?: string | null
          conduct_bn?: string | null
          created_at?: string
          custom_data?: Json | null
          date_of_admission?: string | null
          date_of_leaving?: string | null
          deleted_at?: string | null
          id?: string
          issue_date?: string
          issued_by?: string | null
          last_class_attended?: string | null
          last_class_attended_bn?: string | null
          purpose?: string | null
          purpose_bn?: string | null
          reason?: string | null
          reason_bn?: string | null
          remarks?: string | null
          remarks_bn?: string | null
          serial_number?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_certificates_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_certificates_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students_public"
            referencedColumns: ["id"]
          },
        ]
      }
      student_type_audit: {
        Row: {
          changed_by: string | null
          changed_by_email: string | null
          changed_by_name: string | null
          created_at: string
          id: string
          new_type: string
          old_type: string | null
          reason: string | null
          student_id: string
        }
        Insert: {
          changed_by?: string | null
          changed_by_email?: string | null
          changed_by_name?: string | null
          created_at?: string
          id?: string
          new_type: string
          old_type?: string | null
          reason?: string | null
          student_id: string
        }
        Update: {
          changed_by?: string | null
          changed_by_email?: string | null
          changed_by_name?: string | null
          created_at?: string
          id?: string
          new_type?: string
          old_type?: string | null
          reason?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_type_audit_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_type_audit_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students_public"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          address: string | null
          admission_data: Json | null
          admission_date: string | null
          admission_session: string | null
          approval_status: string | null
          birth_reg_no: string | null
          class_id: string | null
          created_at: string | null
          date_of_birth: string | null
          deleted_at: string | null
          division_id: string | null
          email: string | null
          father_name: string | null
          father_name_en: string | null
          father_nid: string | null
          father_occupation: string | null
          father_phone: string | null
          gender: string | null
          guardian_nid: string | null
          guardian_phone: string | null
          id: string
          is_free: boolean | null
          is_orphan: boolean | null
          is_poor: boolean | null
          mother_name: string | null
          mother_name_en: string | null
          mother_nid: string | null
          mother_occupation: string | null
          mother_phone: string | null
          name_bn: string
          name_en: string | null
          phone: string | null
          photo_url: string | null
          previous_class: string | null
          previous_institute: string | null
          registration_no: string | null
          religion: string | null
          residence_type: string | null
          roll_number: string | null
          session_id: string | null
          session_year: string | null
          status: string | null
          student_category: string | null
          student_id: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          admission_data?: Json | null
          admission_date?: string | null
          admission_session?: string | null
          approval_status?: string | null
          birth_reg_no?: string | null
          class_id?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          deleted_at?: string | null
          division_id?: string | null
          email?: string | null
          father_name?: string | null
          father_name_en?: string | null
          father_nid?: string | null
          father_occupation?: string | null
          father_phone?: string | null
          gender?: string | null
          guardian_nid?: string | null
          guardian_phone?: string | null
          id?: string
          is_free?: boolean | null
          is_orphan?: boolean | null
          is_poor?: boolean | null
          mother_name?: string | null
          mother_name_en?: string | null
          mother_nid?: string | null
          mother_occupation?: string | null
          mother_phone?: string | null
          name_bn: string
          name_en?: string | null
          phone?: string | null
          photo_url?: string | null
          previous_class?: string | null
          previous_institute?: string | null
          registration_no?: string | null
          religion?: string | null
          residence_type?: string | null
          roll_number?: string | null
          session_id?: string | null
          session_year?: string | null
          status?: string | null
          student_category?: string | null
          student_id: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          admission_data?: Json | null
          admission_date?: string | null
          admission_session?: string | null
          approval_status?: string | null
          birth_reg_no?: string | null
          class_id?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          deleted_at?: string | null
          division_id?: string | null
          email?: string | null
          father_name?: string | null
          father_name_en?: string | null
          father_nid?: string | null
          father_occupation?: string | null
          father_phone?: string | null
          gender?: string | null
          guardian_nid?: string | null
          guardian_phone?: string | null
          id?: string
          is_free?: boolean | null
          is_orphan?: boolean | null
          is_poor?: boolean | null
          mother_name?: string | null
          mother_name_en?: string | null
          mother_nid?: string | null
          mother_occupation?: string | null
          mother_phone?: string | null
          name_bn?: string
          name_en?: string | null
          phone?: string | null
          photo_url?: string | null
          previous_class?: string | null
          previous_institute?: string | null
          registration_no?: string | null
          religion?: string | null
          residence_type?: string | null
          roll_number?: string | null
          session_id?: string | null
          session_year?: string | null
          status?: string | null
          student_category?: string | null
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "academic_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          class_id: string | null
          code: string | null
          created_at: string | null
          division_id: string | null
          id: string
          is_active: boolean | null
          name: string
          name_bn: string
          updated_at: string | null
        }
        Insert: {
          class_id?: string | null
          code?: string | null
          created_at?: string | null
          division_id?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          name_bn: string
          updated_at?: string | null
        }
        Update: {
          class_id?: string | null
          code?: string | null
          created_at?: string | null
          division_id?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_bn?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subjects_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subjects_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
        ]
      }
      syllabus_coverage: {
        Row: {
          chapter: string | null
          chapter_bn: string | null
          class_id: string
          coverage_date: string
          created_at: string | null
          duration_minutes: number | null
          id: string
          notes: string | null
          pages_covered: string | null
          progress_percent: number | null
          session_id: string
          subject_id: string
          teacher_id: string | null
          topic: string | null
          topic_bn: string | null
          updated_at: string | null
        }
        Insert: {
          chapter?: string | null
          chapter_bn?: string | null
          class_id: string
          coverage_date?: string
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          pages_covered?: string | null
          progress_percent?: number | null
          session_id: string
          subject_id: string
          teacher_id?: string | null
          topic?: string | null
          topic_bn?: string | null
          updated_at?: string | null
        }
        Update: {
          chapter?: string | null
          chapter_bn?: string | null
          class_id?: string
          coverage_date?: string
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          pages_covered?: string | null
          progress_percent?: number | null
          session_id?: string
          subject_id?: string
          teacher_id?: string | null
          topic?: string | null
          topic_bn?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "syllabus_coverage_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "syllabus_coverage_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "academic_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "syllabus_coverage_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "syllabus_coverage_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      system_logs: {
        Row: {
          action: string
          created_at: string
          description: string | null
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          request_id: string | null
          table_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          description?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          request_id?: string | null
          table_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          description?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          request_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      system_modules: {
        Row: {
          created_at: string | null
          description: string | null
          description_bn: string | null
          icon: string | null
          id: string
          is_enabled: boolean | null
          is_system: boolean | null
          menu_path: string | null
          name: string
          name_bn: string
          parent_module_id: string | null
          settings: Json | null
          sort_order: number | null
          updated_at: string | null
          visible_to_roles: string[] | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          description_bn?: string | null
          icon?: string | null
          id?: string
          is_enabled?: boolean | null
          is_system?: boolean | null
          menu_path?: string | null
          name: string
          name_bn: string
          parent_module_id?: string | null
          settings?: Json | null
          sort_order?: number | null
          updated_at?: string | null
          visible_to_roles?: string[] | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          description_bn?: string | null
          icon?: string | null
          id?: string
          is_enabled?: boolean | null
          is_system?: boolean | null
          menu_path?: string | null
          name?: string
          name_bn?: string
          parent_module_id?: string | null
          settings?: Json | null
          sort_order?: number | null
          updated_at?: string | null
          visible_to_roles?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "system_modules_parent_module_id_fkey"
            columns: ["parent_module_id"]
            isOneToOne: false
            referencedRelation: "system_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      user_devices: {
        Row: {
          approval_status: string
          browser: string | null
          city: string | null
          country: string | null
          created_at: string
          device_id: string
          device_model: string | null
          first_seen_at: string
          home_city: string | null
          home_country: string | null
          home_upazila: string | null
          id: string
          is_active: boolean
          isp: string | null
          label: string | null
          last_anomaly: string | null
          last_anomaly_at: string | null
          last_ip: string | null
          last_seen_at: string
          latitude: number | null
          longitude: number | null
          os: string | null
          region: string | null
          revoked_at: string | null
          upazila: string | null
          updated_at: string
          user_agent: string | null
          user_id: string
          village: string | null
        }
        Insert: {
          approval_status?: string
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_id: string
          device_model?: string | null
          first_seen_at?: string
          home_city?: string | null
          home_country?: string | null
          home_upazila?: string | null
          id?: string
          is_active?: boolean
          isp?: string | null
          label?: string | null
          last_anomaly?: string | null
          last_anomaly_at?: string | null
          last_ip?: string | null
          last_seen_at?: string
          latitude?: number | null
          longitude?: number | null
          os?: string | null
          region?: string | null
          revoked_at?: string | null
          upazila?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id: string
          village?: string | null
        }
        Update: {
          approval_status?: string
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_id?: string
          device_model?: string | null
          first_seen_at?: string
          home_city?: string | null
          home_country?: string | null
          home_upazila?: string | null
          id?: string
          is_active?: boolean
          isp?: string | null
          label?: string | null
          last_anomaly?: string | null
          last_anomaly_at?: string | null
          last_ip?: string | null
          last_seen_at?: string
          latitude?: number | null
          longitude?: number | null
          os?: string | null
          region?: string | null
          revoked_at?: string | null
          upazila?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string
          village?: string | null
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          approval_add: boolean
          approval_approve: boolean
          approval_delete: boolean
          approval_edit: boolean
          approval_reject: boolean | null
          approval_view: boolean
          can_add: boolean
          can_approve: boolean
          can_delete: boolean
          can_edit: boolean
          can_view: boolean
          created_at: string | null
          id: string
          menu_path: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          approval_add?: boolean
          approval_approve?: boolean
          approval_delete?: boolean
          approval_edit?: boolean
          approval_reject?: boolean | null
          approval_view?: boolean
          can_add?: boolean
          can_approve?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          created_at?: string | null
          id?: string
          menu_path: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          approval_add?: boolean
          approval_approve?: boolean
          approval_delete?: boolean
          approval_edit?: boolean
          approval_reject?: boolean | null
          approval_view?: boolean
          can_add?: boolean
          can_approve?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          created_at?: string | null
          id?: string
          menu_path?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_quran_prefs: {
        Row: {
          auto_scroll: boolean
          created_at: string
          prefs: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_scroll?: boolean
          created_at?: string
          prefs?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_scroll?: boolean
          created_at?: string
          prefs?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vaccinations: {
        Row: {
          administered_by: string | null
          batch_number: string | null
          created_at: string
          deleted_at: string | null
          dose_number: number | null
          id: string
          next_due_date: string | null
          notes: string | null
          person_type: string
          staff_id: string | null
          student_id: string | null
          updated_at: string
          vaccination_date: string
          vaccine_name: string
          vaccine_name_bn: string | null
        }
        Insert: {
          administered_by?: string | null
          batch_number?: string | null
          created_at?: string
          deleted_at?: string | null
          dose_number?: number | null
          id?: string
          next_due_date?: string | null
          notes?: string | null
          person_type: string
          staff_id?: string | null
          student_id?: string | null
          updated_at?: string
          vaccination_date: string
          vaccine_name: string
          vaccine_name_bn?: string | null
        }
        Update: {
          administered_by?: string | null
          batch_number?: string | null
          created_at?: string
          deleted_at?: string | null
          dose_number?: number | null
          id?: string
          next_due_date?: string | null
          notes?: string | null
          person_type?: string
          staff_id?: string | null
          student_id?: string | null
          updated_at?: string
          vaccination_date?: string
          vaccine_name?: string
          vaccine_name_bn?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vaccinations_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vaccinations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vaccinations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students_public"
            referencedColumns: ["id"]
          },
        ]
      }
      validation_rules: {
        Row: {
          config: Json
          created_at: string | null
          description: string | null
          error_message: string | null
          error_message_bn: string | null
          field_name: string | null
          id: string
          is_active: boolean | null
          module: string
          name: string
          name_bn: string
          rule_level: string
          rule_type: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          config?: Json
          created_at?: string | null
          description?: string | null
          error_message?: string | null
          error_message_bn?: string | null
          field_name?: string | null
          id?: string
          is_active?: boolean | null
          module?: string
          name: string
          name_bn: string
          rule_level?: string
          rule_type?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          config?: Json
          created_at?: string | null
          description?: string | null
          error_message?: string | null
          error_message_bn?: string | null
          field_name?: string | null
          id?: string
          is_active?: boolean | null
          module?: string
          name?: string
          name_bn?: string
          rule_level?: string
          rule_type?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      verified_payments: {
        Row: {
          amount: number
          consumed_at: string | null
          consumed_by_donor_id: string | null
          created_at: string
          created_by: string | null
          id: string
          method: string
          note: string | null
          sender_number: string | null
          trx_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          consumed_at?: string | null
          consumed_by_donor_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          method?: string
          note?: string | null
          sender_number?: string | null
          trx_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          consumed_at?: string | null
          consumed_by_donor_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          method?: string
          note?: string | null
          sender_number?: string | null
          trx_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "verified_payments_consumed_by_donor_id_fkey"
            columns: ["consumed_by_donor_id"]
            isOneToOne: false
            referencedRelation: "donors"
            referencedColumns: ["id"]
          },
        ]
      }
      website_settings: {
        Row: {
          id: string
          key: string
          updated_at: string | null
          value: Json | null
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string | null
          value?: Json | null
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string | null
          value?: Json | null
        }
        Relationships: []
      }
      whatsapp_click_events: {
        Row: {
          created_at: string
          error_reason: string | null
          event_type: string
          id: string
          is_pwa: boolean | null
          meta: Json | null
          page_url: string | null
          phone_number: string | null
          success: boolean
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error_reason?: string | null
          event_type: string
          id?: string
          is_pwa?: boolean | null
          meta?: Json | null
          page_url?: string | null
          phone_number?: string | null
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error_reason?: string | null
          event_type?: string
          id?: string
          is_pwa?: boolean | null
          meta?: Json | null
          page_url?: string | null
          phone_number?: string | null
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      whatsapp_config: {
        Row: {
          away_message: string | null
          business_account_id: string | null
          business_hours: string | null
          button_label: string | null
          button_position: string
          cloud_api_enabled: boolean
          created_at: string
          default_language: string | null
          id: string
          phone_number: string | null
          phone_number_id: string | null
          route_mode: string
          route_patterns: string[]
          show_floating_button: boolean
          updated_at: string
          welcome_message: string | null
        }
        Insert: {
          away_message?: string | null
          business_account_id?: string | null
          business_hours?: string | null
          button_label?: string | null
          button_position?: string
          cloud_api_enabled?: boolean
          created_at?: string
          default_language?: string | null
          id?: string
          phone_number?: string | null
          phone_number_id?: string | null
          route_mode?: string
          route_patterns?: string[]
          show_floating_button?: boolean
          updated_at?: string
          welcome_message?: string | null
        }
        Update: {
          away_message?: string | null
          business_account_id?: string | null
          business_hours?: string | null
          button_label?: string | null
          button_position?: string
          cloud_api_enabled?: boolean
          created_at?: string
          default_language?: string | null
          id?: string
          phone_number?: string | null
          phone_number_id?: string | null
          route_mode?: string
          route_patterns?: string[]
          show_floating_button?: boolean
          updated_at?: string
          welcome_message?: string | null
        }
        Relationships: []
      }
      whatsapp_message_queue: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          error_message: string | null
          id: string
          message_text: string
          recipient_name: string | null
          recipient_phone: string
          reference_id: string | null
          reference_table: string | null
          sent_at: string | null
          status: string
          template_name: string | null
          template_variables: Json | null
          trigger_type: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          message_text: string
          recipient_name?: string | null
          recipient_phone: string
          reference_id?: string | null
          reference_table?: string | null
          sent_at?: string | null
          status?: string
          template_name?: string | null
          template_variables?: Json | null
          trigger_type: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          message_text?: string
          recipient_name?: string | null
          recipient_phone?: string
          reference_id?: string | null
          reference_table?: string | null
          sent_at?: string | null
          status?: string
          template_name?: string | null
          template_variables?: Json | null
          trigger_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      whatsapp_templates: {
        Row: {
          body_bn: string
          body_en: string
          category: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          meta_language_code: string | null
          meta_template_name: string | null
          name: string
          name_bn: string
          sort_order: number | null
          template_key: string
          updated_at: string
          use_meta_template: boolean
          variable_rules: Json
          variables: Json
        }
        Insert: {
          body_bn: string
          body_en?: string
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          meta_language_code?: string | null
          meta_template_name?: string | null
          name: string
          name_bn: string
          sort_order?: number | null
          template_key: string
          updated_at?: string
          use_meta_template?: boolean
          variable_rules?: Json
          variables?: Json
        }
        Update: {
          body_bn?: string
          body_en?: string
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          meta_language_code?: string | null
          meta_template_name?: string | null
          name?: string
          name_bn?: string
          sort_order?: number | null
          template_key?: string
          updated_at?: string
          use_meta_template?: boolean
          variable_rules?: Json
          variables?: Json
        }
        Relationships: []
      }
      zakat_calculation_logs: {
        Row: {
          calc_type: string
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          id: string
          inputs: Json
          ip_address: string | null
          results: Json
          settings_year: number | null
          user_agent: string | null
        }
        Insert: {
          calc_type: string
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          inputs?: Json
          ip_address?: string | null
          results?: Json
          settings_year?: number | null
          user_agent?: string | null
        }
        Update: {
          calc_type?: string
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          inputs?: Json
          ip_address?: string | null
          results?: Json
          settings_year?: number | null
          user_agent?: string | null
        }
        Relationships: []
      }
      zakat_fitra_settings: {
        Row: {
          created_at: string
          fitra_options: Json
          gold_price_per_gram: number
          id: string
          is_active: boolean
          nisab_gold_grams: number
          nisab_silver_grams: number
          notes_bn: string | null
          notes_en: string | null
          silver_price_per_gram: number
          updated_at: string
          year: number
          zakat_rate: number
        }
        Insert: {
          created_at?: string
          fitra_options?: Json
          gold_price_per_gram?: number
          id?: string
          is_active?: boolean
          nisab_gold_grams?: number
          nisab_silver_grams?: number
          notes_bn?: string | null
          notes_en?: string | null
          silver_price_per_gram?: number
          updated_at?: string
          year: number
          zakat_rate?: number
        }
        Update: {
          created_at?: string
          fitra_options?: Json
          gold_price_per_gram?: number
          id?: string
          is_active?: boolean
          nisab_gold_grams?: number
          nisab_silver_grams?: number
          notes_bn?: string | null
          notes_en?: string | null
          silver_price_per_gram?: number
          updated_at?: string
          year?: number
          zakat_rate?: number
        }
        Relationships: []
      }
    }
    Views: {
      administrative_officers_public: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          department: string | null
          designation: string | null
          email: string | null
          id: string | null
          joining_date: string | null
          name_bn: string | null
          name_en: string | null
          officer_id: string | null
          phone: string | null
          photo_url: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          department?: string | null
          designation?: string | null
          email?: string | null
          id?: string | null
          joining_date?: string | null
          name_bn?: string | null
          name_en?: string | null
          officer_id?: string | null
          phone?: string | null
          photo_url?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          department?: string | null
          designation?: string | null
          email?: string | null
          id?: string | null
          joining_date?: string | null
          name_bn?: string | null
          name_en?: string | null
          officer_id?: string | null
          phone?: string | null
          photo_url?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      admission_test_attempts_public: {
        Row: {
          applicant_name: string | null
          correct_count: number | null
          id: string | null
          passed: boolean | null
          percentage: number | null
          rank: number | null
          score: number | null
          status: string | null
          submitted_at: string | null
          test_id: string | null
          total_questions: number | null
        }
        Insert: {
          applicant_name?: string | null
          correct_count?: number | null
          id?: string | null
          passed?: boolean | null
          percentage?: number | null
          rank?: number | null
          score?: number | null
          status?: string | null
          submitted_at?: string | null
          test_id?: string | null
          total_questions?: number | null
        }
        Update: {
          applicant_name?: string | null
          correct_count?: number | null
          id?: string | null
          passed?: boolean | null
          percentage?: number | null
          rank?: number | null
          score?: number | null
          status?: string | null
          submitted_at?: string | null
          test_id?: string | null
          total_questions?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "admission_test_attempts_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "admission_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      admission_test_questions_public: {
        Row: {
          id: string | null
          marks: number | null
          options: Json | null
          question_text: string | null
          question_text_bn: string | null
          sort_order: number | null
          test_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admission_test_questions_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "admission_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      committee_members_public: {
        Row: {
          allow_overlap: boolean | null
          committee_id: string | null
          created_at: string | null
          deleted_at: string | null
          designation: string | null
          designation_en: string | null
          id: string | null
          is_active: boolean | null
          joining_date: string | null
          name: string | null
          name_en: string | null
          occupation: string | null
          occupation_en: string | null
          photo_url: string | null
          sort_order: number | null
          staff_id: string | null
          updated_at: string | null
        }
        Insert: {
          allow_overlap?: boolean | null
          committee_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          designation?: string | null
          designation_en?: string | null
          id?: string | null
          is_active?: boolean | null
          joining_date?: string | null
          name?: string | null
          name_en?: string | null
          occupation?: string | null
          occupation_en?: string | null
          photo_url?: string | null
          sort_order?: number | null
          staff_id?: string | null
          updated_at?: string | null
        }
        Update: {
          allow_overlap?: boolean | null
          committee_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          designation?: string | null
          designation_en?: string | null
          id?: string | null
          is_active?: boolean | null
          joining_date?: string | null
          name?: string | null
          name_en?: string | null
          occupation?: string | null
          occupation_en?: string | null
          photo_url?: string | null
          sort_order?: number | null
          staff_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "committee_members_committee_id_fkey"
            columns: ["committee_id"]
            isOneToOne: false
            referencedRelation: "committees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "committee_members_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      committee_staff_ids: {
        Row: {
          staff_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "committee_members_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      online_exam_questions_public: {
        Row: {
          exam_id: string | null
          id: string | null
          marks: number | null
          options: Json | null
          question_text: string | null
          question_text_bn: string | null
          question_type: string | null
          sort_order: number | null
        }
        Relationships: [
          {
            foreignKeyName: "online_exam_questions_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "online_exams"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_directory: {
        Row: {
          code: string | null
          created_at: string | null
          deleted_at: string | null
          department: string | null
          designation: string | null
          email: string | null
          id: string | null
          joining_date: string | null
          name_bn: string | null
          name_en: string | null
          phone: string | null
          photo_url: string | null
          source: string | null
          staff_category: string | null
          status: string | null
          user_id: string | null
        }
        Relationships: []
      }
      students_public: {
        Row: {
          class_id: string | null
          division_id: string | null
          id: string | null
          name_bn: string | null
          name_en: string | null
          photo_url: string | null
          registration_no: string | null
          roll_number: string | null
          session_id: string | null
          status: string | null
          student_id: string | null
        }
        Insert: {
          class_id?: string | null
          division_id?: string | null
          id?: string | null
          name_bn?: string | null
          name_en?: string | null
          photo_url?: string | null
          registration_no?: string | null
          roll_number?: string | null
          session_id?: string | null
          status?: string | null
          student_id?: string | null
        }
        Update: {
          class_id?: string | null
          division_id?: string | null
          id?: string | null
          name_bn?: string | null
          name_en?: string | null
          photo_url?: string | null
          registration_no?: string | null
          roll_number?: string | null
          session_id?: string | null
          status?: string | null
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "academic_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      acquire_user_create_lock:
        | { Args: { _email: string; _phone: string }; Returns: undefined }
        | {
            Args: { _email: string; _phone: string; _timeout_ms?: number }
            Returns: Json
          }
      add_audit_device: {
        Args: {
          _device_id: string
          _label?: string
          _notes?: string
          _user_id?: string
        }
        Returns: {
          added_by: string | null
          created_at: string
          device_id: string
          id: string
          is_active: boolean
          label: string | null
          notes: string | null
          revoked_at: string | null
          revoked_by: string | null
          updated_at: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "authorized_audit_devices"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      add_complaint_reply: {
        Args: { p_email: string; p_message: string; p_ticket: string }
        Returns: Json
      }
      approve_admission_test_merit: {
        Args: { p_test_id: string }
        Returns: {
          academic_session_id: string | null
          class_id: string | null
          closes_at: string | null
          created_at: string | null
          deleted_at: string | null
          description: string | null
          description_bn: string | null
          duration_minutes: number
          id: string
          instructions: string | null
          instructions_bn: string | null
          is_published: boolean | null
          merit_approval_status: string
          merit_decided_at: string | null
          merit_decided_by: string | null
          merit_rejection_reason: string | null
          merit_submitted_at: string | null
          merit_submitted_by: string | null
          opens_at: string | null
          pass_mark: number
          show_result_immediately: boolean | null
          shuffle_questions: boolean | null
          title: string
          title_bn: string
          total_marks: number
          updated_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "admission_tests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      approve_device_for_routes: {
        Args: { _device_id: string; _notes?: string; _routes: string[] }
        Returns: Json
      }
      approve_device_request: {
        Args: { _notes?: string; _request_id: string }
        Returns: Json
      }
      approve_merit_list: {
        Args: { p_class_id: string; p_exam_session_id: string }
        Returns: {
          class_id: string
          created_at: string
          decided_at: string | null
          decided_by: string | null
          exam_session_id: string
          id: string
          rejection_reason: string | null
          status: string
          submitted_at: string
          submitted_by: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "merit_list_approvals"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      approve_result_publish: {
        Args: { p_exam_session_id: string }
        Returns: undefined
      }
      assert_no_function_overloads: {
        Args: { fn_names: string[] }
        Returns: undefined
      }
      backfill_salary_workflow_names: {
        Args: never
        Returns: {
          seeded_config: boolean
          updated_count: number
        }[]
      }
      build_formatted_id: {
        Args: {
          p_include_year: boolean
          p_padding: number
          p_prefix: string
          p_separator: string
          p_serial: number
          p_year: number
        }
        Returns: string
      }
      can_access_storage_object: {
        Args: { _bucket: string; _object_path: string; _user_id: string }
        Returns: boolean
      }
      canonical_module_roles: {
        Args: { _menu_path: string }
        Returns: string[]
      }
      change_student_type: {
        Args: { p_new_type: string; p_reason?: string; p_student_id: string }
        Returns: {
          changed_by: string | null
          changed_by_email: string | null
          changed_by_name: string | null
          created_at: string
          id: string
          new_type: string
          old_type: string | null
          reason: string | null
          student_id: string
        }
        SetofOptions: {
          from: "*"
          to: "student_type_audit"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      check_duplicate_birth_reg: {
        Args: { p_birth_reg: string }
        Returns: {
          admission_session: string
          registration_no: string
          roll_number: string
          student_id: string
        }[]
      }
      check_rate_limit: {
        Args: { _action: string; _key: string; _scope: string }
        Returns: Json
      }
      check_user_duplicates: {
        Args: {
          _email: string
          _full_name: string
          _nid?: string
          _phone: string
        }
        Returns: Json
      }
      decrypt_numeric: { Args: { p_cipher: string }; Returns: number }
      decrypt_value: { Args: { p_cipher: string }; Returns: string }
      diff_result_signatories: {
        Args: { cleaned: Json; orig: Json }
        Returns: Json
      }
      encrypt_numeric: { Args: { p_value: number }; Returns: string }
      encrypt_value: { Args: { p_plain: string }; Returns: string }
      enforce_approve_permission: {
        Args: { _menu_path: string }
        Returns: undefined
      }
      ensure_result_print_footer_defaults: { Args: never; Returns: undefined }
      generate_administrative_officer_id: {
        Args: { p_year?: number }
        Returns: string
      }
      generate_staff_id: {
        Args: { p_category_key: string; p_joining_year?: number }
        Returns: string
      }
      get_complaint_by_ticket: {
        Args: { p_email: string; p_ticket: string }
        Returns: Json
      }
      get_data_sensitivity_map: {
        Args: never
        Returns: {
          column_name: string
          data_type: string
          notes: string
          protection: string
          sensitivity: string
          table_name: string
        }[]
      }
      get_device_reregister_status: { Args: never; Returns: Json }
      get_emailjs_public_key: {
        Args: never
        Returns: {
          public_key: string
          service_id: string
          template_id: string
        }[]
      }
      get_encryption_key: { Args: never; Returns: string }
      get_hostel_attendance_roster: {
        Args: { p_person_type: string }
        Returns: {
          class_id: string
          id: string
          name_bn: string
          name_en: string
          person_code: string
          person_type: string
          session_id: string
        }[]
      }
      get_messageable_users: {
        Args: never
        Returns: {
          designation: string
          full_name: string
          role: string
          source: string
          user_id: string
        }[]
      }
      get_next_admission_roll: {
        Args: { p_class_id: string; p_session_id: string }
        Returns: string
      }
      get_next_receipt_serial: { Args: never; Returns: string }
      get_or_create_direct_conversation: {
        Args: { _other_user: string }
        Returns: string
      }
      get_or_create_receipt_token: {
        Args: { _receipt_id: string; _receipt_type: string }
        Returns: string
      }
      get_or_create_salary_memo: {
        Args: { p_month_year: string }
        Returns: string
      }
      get_otp_requirements: {
        Args: never
        Returns: {
          is_enabled: boolean
          require_for_email_change: boolean
          require_for_login: boolean
          require_for_password_change: boolean
          require_for_password_reset: boolean
          role_overrides: Json
        }[]
      }
      get_parent_fee_payments: {
        Args: { _parent_account_id: string; _student_uuid: string }
        Returns: {
          amount: number
          created_at: string
          fee_type_id: string
          fee_type_name: string
          fee_type_name_bn: string
          id: string
          month: string
          paid_amount: number
          paid_at: string
          receipt_number: string
          status: string
          student_id: string
          year: number
        }[]
      }
      get_parent_messages: {
        Args: { p_account_id: string }
        Returns: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          parent_account_id: string | null
          parent_thread_id: string | null
          read_at: string | null
          sender_name: string | null
          sender_type: string
          student_id: string | null
          subject: string
          updated_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "parent_messages"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_password_protection_info: { Args: never; Returns: Json }
      get_public_principal: {
        Args: never
        Returns: {
          designation: string
          name_bn: string
          name_en: string
          photo_url: string
        }[]
      }
      get_public_tables: {
        Args: never
        Returns: {
          table_name: string
        }[]
      }
      get_request_ip: { Args: never; Returns: string }
      get_request_ua: { Args: never; Returns: string }
      get_resolved_print_footer: {
        Args: { p_class_id?: string; p_exam_id?: string }
        Returns: Json
      }
      get_student_type_history: {
        Args: { p_student_id: string }
        Returns: {
          changed_by: string | null
          changed_by_email: string | null
          changed_by_name: string | null
          created_at: string
          id: string
          new_type: string
          old_type: string | null
          reason: string | null
          student_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "student_type_audit"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_user_role: { Args: { _user_id: string }; Returns: string }
      get_whatsapp_public_config: {
        Args: never
        Returns: {
          away_message: string
          business_account_id: string
          business_hours: string
          button_label: string
          button_position: string
          cloud_api_enabled: boolean
          default_language: string
          id: string
          phone_number: string
          phone_number_id: string
          route_mode: string
          route_patterns: string[]
          show_floating_button: boolean
          welcome_message: string
        }[]
      }
      has_any_menu_permission: {
        Args: { _action: string; _paths: string[]; _user_id: string }
        Returns: boolean
      }
      has_menu_permission: {
        Args: { _action: string; _menu_path: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_inventory_stock: {
        Args: { p_amount: number; p_item_id: string }
        Returns: undefined
      }
      is_accounts_staff: { Args: { _user_id: string }; Returns: boolean }
      is_chat_admin: { Args: { _user: string }; Returns: boolean }
      is_conversation_participant: {
        Args: { _conv: string; _user: string }
        Returns: boolean
      }
      is_staff_member: { Args: { _user_id: string }; Returns: boolean }
      is_valid_result_signatories: { Args: { v: Json }; Returns: boolean }
      link_administrative_officer_by_email: {
        Args: never
        Returns: {
          address: string | null
          created_at: string
          date_of_birth: string | null
          deleted_at: string | null
          department: string | null
          department_id: string | null
          designation: string | null
          duty_end_time: string | null
          duty_start_time: string | null
          education: string | null
          email: string | null
          employment_type: string | null
          experience: string | null
          extra_data: Json | null
          id: string
          joining_date: string | null
          name_bn: string
          name_en: string | null
          nid: string | null
          office_room: string | null
          officer_id: string | null
          phone: string | null
          photo_url: string | null
          previous_institute: string | null
          religion: string | null
          residence_type: string | null
          responsibilities: string | null
          salary: number | null
          salary_encrypted: string | null
          sort_order: number | null
          status: string | null
          updated_at: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "administrative_officers"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      list_blocked_device_attempts: {
        Args: { _limit?: number; _only_blocked?: boolean; _search?: string }
        Returns: {
          alert_type: string
          attempt_count: number
          blocked_at: string
          blocked_reason: string
          city: string
          country: string
          device_id: string
          ip_address: string
          is_blocked: boolean
          last_attempt_at: string
          reason: string
          upazila: string
          user_agent: string
          user_id: string
          village: string
        }[]
      }
      list_committee_members_public: {
        Args: { p_committee_id?: string }
        Returns: {
          committee_id: string
          designation: string
          designation_en: string
          id: string
          name: string
          name_en: string
          photo_url: string
          sort_order: number
        }[]
      }
      list_device_approval_requests: {
        Args: { _status?: string }
        Returns: {
          city: string
          country: string
          created_at: string
          device_id: string
          device_model: string
          id: string
          ip_address: string
          region: string
          status: string
          upazila: string
          user_agent: string
          user_email: string
          user_id: string
          user_name: string
          village: string
        }[]
      }
      list_device_block_history: {
        Args: { _device_id: string; _limit?: number }
        Returns: {
          action: string
          city: string | null
          country: string | null
          device_id: string
          id: string
          ip_address: string | null
          notes: string | null
          performed_at: string
          performed_by: string | null
          reason: string
          upazila: string | null
          user_agent: string | null
          user_id: string | null
          village: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "device_block_history"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      list_device_route_approvals: {
        Args: { _device_id: string }
        Returns: {
          approved_by: string
          created_at: string
          notes: string
          route_path: string
        }[]
      }
      list_function_overloads: {
        Args: never
        Returns: {
          function_name: string
          overload_count: number
          signatures: string[]
        }[]
      }
      list_staff_devices: {
        Args: never
        Returns: {
          approval_status: string
          browser: string
          city: string
          country: string
          created_at: string
          device_id: string
          device_model: string
          first_seen_at: string
          id: string
          is_active: boolean
          isp: string
          label: string
          last_anomaly: string
          last_anomaly_at: string
          last_ip: string
          last_seen_at: string
          latitude: number
          longitude: number
          os: string
          region: string
          upazila: string
          user_agent: string
          user_email: string
          user_id: string
          user_name: string
          village: string
        }[]
      }
      list_staff_directory: {
        Args: never
        Returns: {
          designation: string
          id: string
          name_bn: string
          name_en: string
          photo_url: string
          staff_category: string
        }[]
      }
      log_admin_name_request: {
        Args: {
          _correlation_id: string
          _duration_ms: number
          _error_code: string
          _error_message: string
          _filters: Json
          _result_count: number
          _source_path: string
          _sql_path: string
        }
        Returns: string
      }
      log_security_event: {
        Args: {
          p_bucket_id?: string
          p_event_type: string
          p_ip?: string
          p_metadata?: Json
          p_object_path?: string
          p_reason?: string
          p_resource?: string
          p_status?: number
          p_user_agent?: string
        }
        Returns: string
      }
      lookup_student_admission: {
        Args: { p_reg_no: string }
        Returns: {
          admission_session: string
          id: string
          registration_no: string
          roll_number: string
          student_id: string
        }[]
      }
      lookup_student_for_fee: {
        Args: { p_dob?: string; p_reg_no: string }
        Returns: {
          class_id: string
          division_id: string
          id: string
          name_bn: string
          name_en: string
          photo_url: string
          registration_no: string
          roll_number: string
          session_id: string
          student_id: string
        }[]
      }
      match_students_for_parent: {
        Args: { p_nid: string; p_phone: string }
        Returns: {
          match_reason: string
          name_bn: string
          name_en: string
          student_id: string
          student_uuid: string
        }[]
      }
      permanent_block_device: {
        Args: { _device_id: string; _notes?: string; _reason: string }
        Returns: Json
      }
      public_find_exam_student:
        | {
            Args: { p_roll: string; p_session_id: string }
            Returns: {
              class_id: string
              student_id: string
            }[]
          }
        | {
            Args: { p_class_id?: string; p_roll: string; p_session_id: string }
            Returns: {
              class_id: string
              division_id: string
              marks: Json
              merit_rank: number
              name_bn: string
              name_en: string
              photo_url: string
              registration_no: string
              roll_number: string
              session_id: string
              student_id: string
            }[]
          }
      reconcile_fee_payment: {
        Args: {
          p_actor_id?: string
          p_amount: number
          p_fee_assignment_ids?: string[]
          p_method?: string
          p_parent_account_id?: string
          p_source?: string
          p_source_record_id?: string
          p_student_id: string
          p_trx_id?: string
        }
        Returns: {
          allocated: number
          fee_payment_id: string
          new_status: string
        }[]
      }
      refresh_parent_student_links:
        | { Args: { p_account_id: string }; Returns: string[] }
        | {
            Args: {
              p_account_id: string
              p_source?: string
              p_triggered_by_student?: string
            }
            Returns: string[]
          }
      register_user_device: {
        Args: {
          _device_id: string
          _ip?: string
          _label?: string
          _user_agent?: string
        }
        Returns: {
          approval_status: string
          browser: string | null
          city: string | null
          country: string | null
          created_at: string
          device_id: string
          device_model: string | null
          first_seen_at: string
          home_city: string | null
          home_country: string | null
          home_upazila: string | null
          id: string
          is_active: boolean
          isp: string | null
          label: string | null
          last_anomaly: string | null
          last_anomaly_at: string | null
          last_ip: string | null
          last_seen_at: string
          latitude: number | null
          longitude: number | null
          os: string | null
          region: string | null
          revoked_at: string | null
          upazila: string | null
          updated_at: string
          user_agent: string | null
          user_id: string
          village: string | null
        }
        SetofOptions: {
          from: "*"
          to: "user_devices"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reject_admission_test_merit: {
        Args: { p_reason: string; p_test_id: string }
        Returns: {
          academic_session_id: string | null
          class_id: string | null
          closes_at: string | null
          created_at: string | null
          deleted_at: string | null
          description: string | null
          description_bn: string | null
          duration_minutes: number
          id: string
          instructions: string | null
          instructions_bn: string | null
          is_published: boolean | null
          merit_approval_status: string
          merit_decided_at: string | null
          merit_decided_by: string | null
          merit_rejection_reason: string | null
          merit_submitted_at: string | null
          merit_submitted_by: string | null
          opens_at: string | null
          pass_mark: number
          show_result_immediately: boolean | null
          shuffle_questions: boolean | null
          title: string
          title_bn: string
          total_marks: number
          updated_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "admission_tests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reject_device_request: {
        Args: { _notes?: string; _request_id: string }
        Returns: Json
      }
      reject_merit_list: {
        Args: {
          p_class_id: string
          p_exam_session_id: string
          p_reason: string
        }
        Returns: {
          class_id: string
          created_at: string
          decided_at: string | null
          decided_by: string | null
          exam_session_id: string
          id: string
          rejection_reason: string | null
          status: string
          submitted_at: string
          submitted_by: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "merit_list_approvals"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reject_result_publish: {
        Args: { p_exam_session_id: string; p_reason: string }
        Returns: undefined
      }
      request_device_reregistration: {
        Args: {
          _city?: string
          _country?: string
          _device_id: string
          _device_model?: string
          _ip?: string
          _latitude?: number
          _longitude?: number
          _region?: string
          _upazila?: string
          _user_agent?: string
          _village?: string
        }
        Returns: Json
      }
      resolve_actor_name: { Args: { _uid: string }; Returns: string }
      resync_canonical_module_roles: {
        Args: never
        Returns: {
          menu_path: string
          new_roles: string[]
          old_roles: string[]
        }[]
      }
      resync_canonical_module_roles_for_path: {
        Args: { _menu_path: string }
        Returns: {
          added_roles: string[]
          changed: boolean
          menu_path: string
          new_roles: string[]
          old_roles: string[]
          removed_roles: string[]
        }[]
      }
      reverse_fee_allocations: {
        Args: {
          p_actor_id?: string
          p_source: string
          p_source_record_id: string
        }
        Returns: number
      }
      revoke_audit_device: {
        Args: { _device_uuid: string }
        Returns: {
          added_by: string | null
          created_at: string
          device_id: string
          id: string
          is_active: boolean
          label: string | null
          notes: string | null
          revoked_at: string | null
          revoked_by: string | null
          updated_at: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "authorized_audit_devices"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      revoke_device_route_approval: {
        Args: { _device_id: string; _route_path: string }
        Returns: Json
      }
      revoke_staff_device: {
        Args: { _device_uuid: string; _reason?: string }
        Returns: Json
      }
      revoke_user_device: {
        Args: { _device_uuid: string }
        Returns: {
          approval_status: string
          browser: string | null
          city: string | null
          country: string | null
          created_at: string
          device_id: string
          device_model: string | null
          first_seen_at: string
          home_city: string | null
          home_country: string | null
          home_upazila: string | null
          id: string
          is_active: boolean
          isp: string | null
          label: string | null
          last_anomaly: string | null
          last_anomaly_at: string | null
          last_ip: string | null
          last_seen_at: string
          latitude: number | null
          longitude: number | null
          os: string | null
          region: string | null
          revoked_at: string | null
          upazila: string | null
          updated_at: string
          user_agent: string | null
          user_id: string
          village: string | null
        }
        SetofOptions: {
          from: "*"
          to: "user_devices"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rotate_parent_session: { Args: { p_account_id: string }; Returns: string }
      rotate_receipt_token: {
        Args: { _receipt_id: string; _receipt_type: string }
        Returns: string
      }
      rpc_finish_exam_attempt: {
        Args: {
          p_attempt_id: string
          p_parent_account_id?: string
          p_student_account_id?: string
        }
        Returns: undefined
      }
      rpc_start_exam_attempt: {
        Args: {
          p_exam_id: string
          p_parent_account_id?: string
          p_student_account_id?: string
          p_student_id: string
        }
        Returns: string
      }
      rpc_submit_exam_answer: {
        Args: {
          p_answer: Json
          p_attempt_id: string
          p_parent_account_id?: string
          p_question_id: string
          p_student_account_id?: string
        }
        Returns: undefined
      }
      rpc_update_exam_attempt: {
        Args: {
          p_attempt_id: string
          p_attempt_token: string
          p_status?: string
          p_tab_switch_count?: number
        }
        Returns: undefined
      }
      set_device_home_location: {
        Args: {
          _city: string
          _country: string
          _device_uuid: string
          _upazila: string
        }
        Returns: Json
      }
      submit_admission_test_attempt: {
        Args: {
          p_applicant_address?: string
          p_applicant_email?: string
          p_applicant_guardian?: string
          p_applicant_name: string
          p_applicant_nid_birth?: string
          p_applicant_phone: string
          p_test_id: string
        }
        Returns: string
      }
      submit_admission_test_merit_for_approval: {
        Args: { p_test_id: string }
        Returns: {
          academic_session_id: string | null
          class_id: string | null
          closes_at: string | null
          created_at: string | null
          deleted_at: string | null
          description: string | null
          description_bn: string | null
          duration_minutes: number
          id: string
          instructions: string | null
          instructions_bn: string | null
          is_published: boolean | null
          merit_approval_status: string
          merit_decided_at: string | null
          merit_decided_by: string | null
          merit_rejection_reason: string | null
          merit_submitted_at: string | null
          merit_submitted_by: string | null
          opens_at: string | null
          pass_mark: number
          show_result_immediately: boolean | null
          shuffle_questions: boolean | null
          title: string
          title_bn: string
          total_marks: number
          updated_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "admission_tests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_merit_list_for_approval: {
        Args: { p_class_id: string; p_exam_session_id: string }
        Returns: {
          class_id: string
          created_at: string
          decided_at: string | null
          decided_by: string | null
          exam_session_id: string
          id: string
          rejection_reason: string | null
          status: string
          submitted_at: string
          submitted_by: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "merit_list_approvals"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_result_publish_for_approval: {
        Args: { p_exam_session_id: string }
        Returns: undefined
      }
      unblock_device: {
        Args: { _device_id: string; _notes?: string; _reason: string }
        Returns: Json
      }
      undo_committee_change: {
        Args: {
          p_audit_id: string
          p_expected_deleted?: boolean
          p_expected_is_active?: boolean
        }
        Returns: Json
      }
      update_device_location: {
        Args: {
          _browser: string
          _city: string
          _country: string
          _device_id: string
          _device_model: string
          _ip: string
          _isp: string
          _latitude: number
          _longitude: number
          _os: string
          _region: string
          _upazila: string
          _user_id: string
          _village: string
        }
        Returns: Json
      }
      validate_parent_session: {
        Args: { p_account_id: string; p_session_token: string }
        Returns: boolean
      }
      validate_password_strength: {
        Args: { p_password: string }
        Returns: Json
      }
      verify_audit_device: {
        Args: {
          _device_id: string
          _endpoint?: string
          _ip?: string
          _user_agent?: string
        }
        Returns: Json
      }
      verify_donation_attempt: {
        Args: {
          _amount: number
          _client_ip?: string
          _donor_id: string
          _phone: string
          _trx_id: string
        }
        Returns: Json
      }
      verify_donation_payment: {
        Args: { _amount: number; _donor_id?: string; _trx_id: string }
        Returns: Json
      }
      verify_receipt_admin: { Args: { _token: string }; Returns: Json }
      verify_receipt_public: { Args: { _token: string }; Returns: Json }
      verify_user_device: {
        Args: {
          _device_id: string
          _endpoint?: string
          _ip?: string
          _user_agent?: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "staff"
        | "teacher"
        | "super_admin"
        | "administrative"
        | "support"
        | "general"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: [
        "admin",
        "staff",
        "teacher",
        "super_admin",
        "administrative",
        "support",
        "general",
      ],
    },
  },
} as const
