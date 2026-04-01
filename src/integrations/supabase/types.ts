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
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
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
      divisions: {
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
      exams: {
        Row: {
          created_at: string | null
          division_id: string | null
          exam_session: string
          exam_type: string
          exam_year: number
          id: string
          is_published: boolean | null
          name: string
          name_bn: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          division_id?: string | null
          exam_session: string
          exam_type: string
          exam_year: number
          id?: string
          is_published?: boolean | null
          name: string
          name_bn: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          division_id?: string | null
          exam_session?: string
          exam_type?: string
          exam_year?: number
          id?: string
          is_published?: boolean | null
          name?: string
          name_bn?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exams_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          name_bn: string
          project_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          name_bn: string
          project_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_bn?: string
          project_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_categories_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "expense_projects"
            referencedColumns: ["id"]
          },
        ]
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
      expense_projects: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          name_bn: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          name_bn: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_bn?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category_id: string
          created_at: string | null
          description: string | null
          expense_date: string
          has_receipt: boolean | null
          id: string
          month_year: string
          project_id: string
          quantity: number | null
          receipt_url: string | null
          updated_at: string | null
        }
        Insert: {
          amount?: number
          category_id: string
          created_at?: string | null
          description?: string | null
          expense_date?: string
          has_receipt?: boolean | null
          id?: string
          month_year: string
          project_id: string
          quantity?: number | null
          receipt_url?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          category_id?: string
          created_at?: string | null
          description?: string | null
          expense_date?: string
          has_receipt?: boolean | null
          id?: string
          month_year?: string
          project_id?: string
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
            foreignKeyName: "expenses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "expense_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_payments: {
        Row: {
          amount: number
          created_at: string | null
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
          created_at?: string | null
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
          created_at?: string | null
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
          created_at: string | null
          division_id: string | null
          fee_category: string
          id: string
          is_active: boolean | null
          name: string
          name_bn: string
          updated_at: string | null
        }
        Insert: {
          amount?: number
          created_at?: string | null
          division_id?: string | null
          fee_category?: string
          id?: string
          is_active?: boolean | null
          name: string
          name_bn: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          division_id?: string | null
          fee_category?: string
          id?: string
          is_active?: boolean | null
          name?: string
          name_bn?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fee_types_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
        ]
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
          created_at: string | null
          email: string | null
          id: string
          is_default: boolean | null
          logo_url: string | null
          name: string
          name_en: string | null
          other_info: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_default?: boolean | null
          logo_url?: string | null
          name: string
          name_en?: string | null
          other_info?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_default?: boolean | null
          logo_url?: string | null
          name?: string
          name_en?: string | null
          other_info?: string | null
          phone?: string | null
          updated_at?: string | null
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
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      results: {
        Row: {
          created_at: string | null
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
            foreignKeyName: "results_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
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
      salary_records: {
        Row: {
          absence_deduction: number | null
          absent_days: number | null
          advance_deduction: number | null
          base_salary: number
          bonus: number | null
          created_at: string | null
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
      staff: {
        Row: {
          address: string | null
          created_at: string | null
          date_of_birth: string | null
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
          staff_data: Json | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          date_of_birth?: string | null
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
          staff_data?: Json | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          date_of_birth?: string | null
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
          staff_data?: Json | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
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
          division_id: string | null
          email: string | null
          father_name: string | null
          father_nid: string | null
          father_occupation: string | null
          father_phone: string | null
          gender: string | null
          guardian_phone: string | null
          id: string
          is_orphan: boolean | null
          is_poor: boolean | null
          mother_name: string | null
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
          division_id?: string | null
          email?: string | null
          father_name?: string | null
          father_nid?: string | null
          father_occupation?: string | null
          father_phone?: string | null
          gender?: string | null
          guardian_phone?: string | null
          id?: string
          is_orphan?: boolean | null
          is_poor?: boolean | null
          mother_name?: string | null
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
          division_id?: string | null
          email?: string | null
          father_name?: string | null
          father_nid?: string | null
          father_occupation?: string | null
          father_phone?: string | null
          gender?: string | null
          guardian_phone?: string | null
          id?: string
          is_orphan?: boolean | null
          is_poor?: boolean | null
          mother_name?: string | null
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
            foreignKeyName: "subjects_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
        ]
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
      app_role: "admin" | "staff" | "teacher"
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
      app_role: ["admin", "staff", "teacher"],
    },
  },
} as const
