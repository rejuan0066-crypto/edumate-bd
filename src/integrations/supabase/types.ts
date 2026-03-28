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
      staff: {
        Row: {
          address: string | null
          created_at: string | null
          department: string | null
          designation: string | null
          email: string | null
          id: string
          joining_date: string | null
          name_bn: string
          name_en: string | null
          phone: string | null
          photo_url: string | null
          salary: number | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          department?: string | null
          designation?: string | null
          email?: string | null
          id?: string
          joining_date?: string | null
          name_bn: string
          name_en?: string | null
          phone?: string | null
          photo_url?: string | null
          salary?: number | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          department?: string | null
          designation?: string | null
          email?: string | null
          id?: string
          joining_date?: string | null
          name_bn?: string
          name_en?: string | null
          phone?: string | null
          photo_url?: string | null
          salary?: number | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      students: {
        Row: {
          address: string | null
          admission_date: string | null
          created_at: string | null
          date_of_birth: string | null
          division_id: string | null
          email: string | null
          father_name: string | null
          gender: string | null
          guardian_phone: string | null
          id: string
          mother_name: string | null
          name_bn: string
          name_en: string | null
          phone: string | null
          photo_url: string | null
          residence_type: string | null
          roll_number: string | null
          status: string | null
          student_category: string | null
          student_id: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          admission_date?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          division_id?: string | null
          email?: string | null
          father_name?: string | null
          gender?: string | null
          guardian_phone?: string | null
          id?: string
          mother_name?: string | null
          name_bn: string
          name_en?: string | null
          phone?: string | null
          photo_url?: string | null
          residence_type?: string | null
          roll_number?: string | null
          status?: string | null
          student_category?: string | null
          student_id: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          admission_date?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          division_id?: string | null
          email?: string | null
          father_name?: string | null
          gender?: string | null
          guardian_phone?: string | null
          id?: string
          mother_name?: string | null
          name_bn?: string
          name_en?: string | null
          phone?: string | null
          photo_url?: string | null
          residence_type?: string | null
          roll_number?: string | null
          status?: string | null
          student_category?: string | null
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
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
