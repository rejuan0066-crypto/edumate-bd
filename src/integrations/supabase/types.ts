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
    PostgrestVersion: "14.4"
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
      divisions: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
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
      donors: {
        Row: {
          address: string | null
          created_at: string | null
          deleted_at: string | null
          donation_amount: number | null
          donation_date: string | null
          donation_type: string | null
          email: string | null
          id: string
          name_bn: string
          name_en: string | null
          notes: string | null
          phone: string | null
          purpose: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          deleted_at?: string | null
          donation_amount?: number | null
          donation_date?: string | null
          donation_type?: string | null
          email?: string | null
          id?: string
          name_bn: string
          name_en?: string | null
          notes?: string | null
          phone?: string | null
          purpose?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          deleted_at?: string | null
          donation_amount?: number | null
          donation_date?: string | null
          donation_type?: string | null
          email?: string | null
          id?: string
          name_bn?: string
          name_en?: string | null
          notes?: string | null
          phone?: string | null
          purpose?: string | null
          status?: string | null
          updated_at?: string | null
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
      institutions: {
        Row: {
          address: string | null
          address_en: string | null
          created_at: string | null
          email: string | null
          id: string
          is_default: boolean | null
          logo_url: string | null
          name: string
          name_en: string | null
          other_info: string | null
          other_info_en: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          address_en?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_default?: boolean | null
          logo_url?: string | null
          name: string
          name_en?: string | null
          other_info?: string | null
          other_info_en?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          address_en?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_default?: boolean | null
          logo_url?: string | null
          name?: string
          name_en?: string | null
          other_info?: string | null
          other_info_en?: string | null
          phone?: string | null
          updated_at?: string | null
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
      library_issuances: {
        Row: {
          book_condition: string
          book_id: string
          created_at: string | null
          distribution_type: string
          distributor_name: string | null
          id: string
          issued_by: string | null
          issued_date: string
          notes: string | null
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
          book_id: string
          created_at?: string | null
          distribution_type?: string
          distributor_name?: string | null
          id?: string
          issued_by?: string | null
          issued_date?: string
          notes?: string | null
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
          book_id?: string
          created_at?: string | null
          distribution_type?: string
          distributor_name?: string | null
          id?: string
          issued_by?: string | null
          issued_date?: string
          notes?: string | null
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
        ]
      }
      online_exam_attempts: {
        Row: {
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
          password_hash: string
          phone: string | null
          rejection_reason: string | null
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
          password_hash: string
          phone?: string | null
          rejection_reason?: string | null
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
          password_hash?: string
          phone?: string | null
          rejection_reason?: string | null
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
        ]
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
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          fee_type: string
          id: string
          notes: string | null
          payer_name: string | null
          payer_phone: string | null
          payment_method: string | null
          status: string
          student_id: string | null
          transaction_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          fee_type: string
          id?: string
          notes?: string | null
          payer_name?: string | null
          payer_phone?: string | null
          payment_method?: string | null
          status?: string
          student_id?: string | null
          transaction_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          fee_type?: string
          id?: string
          notes?: string | null
          payer_name?: string | null
          payer_phone?: string | null
          payment_method?: string | null
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
      results: {
        Row: {
          created_at: string | null
          division_id: string | null
          exam_id: string
          gpa: number | null
          grade: string | null
          id: string
          marks: number | null
          student_id: string
          subject_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          division_id?: string | null
          exam_id: string
          gpa?: number | null
          grade?: string | null
          id?: string
          marks?: number | null
          student_id: string
          subject_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          division_id?: string | null
          exam_id?: string
          gpa?: number | null
          grade?: string | null
          id?: string
          marks?: number | null
          student_id?: string
          subject_id?: string
          updated_at?: string | null
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
      salary_records: {
        Row: {
          absence_deduction: number | null
          absent_days: number | null
          advance_deduction: number | null
          base_salary: number
          bonus: number | null
          created_at: string | null
          deleted_at: string | null
          id: string
          late_days: number | null
          late_deduction: number | null
          month_year: string
          net_salary: number
          other_allowance: number | null
          other_deduction: number | null
          overtime: number | null
          paid_at: string | null
          present_days: number | null
          remarks: string | null
          staff_id: string
          status: string | null
          updated_at: string | null
          working_days: number | null
        }
        Insert: {
          absence_deduction?: number | null
          absent_days?: number | null
          advance_deduction?: number | null
          base_salary?: number
          bonus?: number | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          late_days?: number | null
          late_deduction?: number | null
          month_year: string
          net_salary?: number
          other_allowance?: number | null
          other_deduction?: number | null
          overtime?: number | null
          paid_at?: string | null
          present_days?: number | null
          remarks?: string | null
          staff_id: string
          status?: string | null
          updated_at?: string | null
          working_days?: number | null
        }
        Update: {
          absence_deduction?: number | null
          absent_days?: number | null
          advance_deduction?: number | null
          base_salary?: number
          bonus?: number | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          late_days?: number | null
          late_deduction?: number | null
          month_year?: string
          net_salary?: number
          other_allowance?: number | null
          other_deduction?: number | null
          overtime?: number | null
          paid_at?: string | null
          present_days?: number | null
          remarks?: string | null
          staff_id?: string
          status?: string | null
          updated_at?: string | null
          working_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "salary_records_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_savings: {
        Row: {
          created_at: string
          duration_months: number
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
          duration_months?: number
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
          duration_months?: number
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
          staff_category?: string
          staff_data?: Json | null
          staff_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
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
          table_name: string
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
          table_name: string
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
          table_name?: string
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
      user_permissions: {
        Row: {
          approval_add: boolean
          approval_delete: boolean
          approval_edit: boolean
          approval_view: boolean
          can_add: boolean
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
          approval_delete?: boolean
          approval_edit?: boolean
          approval_view?: boolean
          can_add?: boolean
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
          approval_delete?: boolean
          approval_edit?: boolean
          approval_view?: boolean
          can_add?: boolean
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_staff_id: {
        Args: { p_category_key: string; p_joining_year?: number }
        Returns: string
      }
      get_next_receipt_serial: { Args: never; Returns: string }
      get_public_tables: {
        Args: never
        Returns: {
          table_name: string
        }[]
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
