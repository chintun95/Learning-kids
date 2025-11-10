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
      Achievements: {
        Row: {
          description: string | null
          id: string
          title: string
          user_id: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          title: string
          user_id?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      answer_log: {
        Row: {
          answered_at: string
          game_name: string | null
          id: string
          is_correct: boolean
          question_id: string | null
          user_id: string
        }
        Insert: {
          answered_at?: string
          game_name?: string | null
          id?: string
          is_correct: boolean
          question_id?: string | null
          user_id: string
        }
        Update: {
          answered_at?: string
          game_name?: string | null
          id?: string
          is_correct?: boolean
          question_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "answer_log_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answer_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      Child: {
        Row: {
          activitystatus: string
          dateofbirth: string
          emergencycontact_id: string | null
          firstname: string
          id: string
          lastname: string
          parent_id: string | null
          profilepicture: string | null
          profilepin: string | null
          user_id: string | null
        }
        Insert: {
          activitystatus: string
          dateofbirth: string
          emergencycontact_id?: string | null
          firstname: string
          id?: string
          lastname: string
          parent_id?: string | null
          profilepicture?: string | null
          profilepin?: string | null
          user_id?: string | null
        }
        Update: {
          activitystatus?: string
          dateofbirth?: string
          emergencycontact_id?: string | null
          firstname?: string
          id?: string
          lastname?: string
          parent_id?: string | null
          profilepicture?: string | null
          profilepin?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Child_emergencycontact_id_fkey"
            columns: ["emergencycontact_id"]
            isOneToOne: false
            referencedRelation: "EmergencyContact"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Child_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "Parent"
            referencedColumns: ["id"]
          },
        ]
      }
      ChildAchievement: {
        Row: {
          achievementinfo: string
          childid: string
          dateearned: string
          id: string
          user_id: string | null
        }
        Insert: {
          achievementinfo: string
          childid: string
          dateearned?: string
          id?: string
          user_id?: string | null
        }
        Update: {
          achievementinfo?: string
          childid?: string
          dateearned?: string
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "childachievement_achievementinfo_fkey"
            columns: ["achievementinfo"]
            isOneToOne: false
            referencedRelation: "Achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "childachievement_childid_fkey"
            columns: ["childid"]
            isOneToOne: false
            referencedRelation: "Child"
            referencedColumns: ["id"]
          },
        ]
      }
      device_tokens: {
        Row: {
          platform: string | null
          token: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          platform?: string | null
          token: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          platform?: string | null
          token?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      EmergencyContact: {
        Row: {
          city: string
          id: string
          name: string
          phonenumber: string
          relationship: string
          state: string
          streetaddress: string
          user_id: string | null
          zipcode: string | null
        }
        Insert: {
          city: string
          id?: string
          name: string
          phonenumber: string
          relationship: string
          state: string
          streetaddress: string
          user_id?: string | null
          zipcode?: string | null
        }
        Update: {
          city?: string
          id?: string
          name?: string
          phonenumber?: string
          relationship?: string
          state?: string
          streetaddress?: string
          user_id?: string | null
          zipcode?: string | null
        }
        Relationships: []
      }
      Parent: {
        Row: {
          childrenunderaccount: number | null
          emailaddress: string
          firstname: string
          id: string
          lastname: string
          user_id: string | null
        }
        Insert: {
          childrenunderaccount?: number | null
          emailaddress: string
          firstname: string
          id?: string
          lastname: string
          user_id?: string | null
        }
        Update: {
          childrenunderaccount?: number | null
          emailaddress?: string
          firstname?: string
          id?: string
          lastname?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          child_age: number
          child_name: string
          created_at: string | null
          id: string
          parent_name: string
          phone_number: string
          user_id: string
        }
        Insert: {
          child_age: number
          child_name: string
          created_at?: string | null
          id?: string
          parent_name: string
          phone_number: string
          user_id: string
        }
        Update: {
          child_age?: number
          child_name?: string
          created_at?: string | null
          id?: string
          parent_name?: string
          phone_number?: string
          user_id?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          correct_answer: string
          id: string
          options: Json
          parent_id: string
          question: string
          question_type: string | null
        }
        Insert: {
          correct_answer: string
          id?: string
          options: Json
          parent_id: string
          question: string
          question_type?: string | null
        }
        Update: {
          correct_answer?: string
          id?: string
          options?: Json
          parent_id?: string
          question?: string
          question_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      Session: {
        Row: {
          activitytype: string
          childid: string
          date: string
          endtime: string | null
          id: string
          sessiondetails: string | null
          sessionstatus: string
          starttime: string
          user_id: string | null
        }
        Insert: {
          activitytype: string
          childid: string
          date: string
          endtime?: string | null
          id?: string
          sessiondetails?: string | null
          sessionstatus: string
          starttime: string
          user_id?: string | null
        }
        Update: {
          activitytype?: string
          childid?: string
          date?: string
          endtime?: string | null
          id?: string
          sessiondetails?: string | null
          sessionstatus?: string
          starttime?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_childid_fkey"
            columns: ["childid"]
            isOneToOne: false
            referencedRelation: "Child"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          id: string
          question_limit: number | null
          user_id: string
        }
        Insert: {
          id?: string
          question_limit?: number | null
          user_id: string
        }
        Update: {
          id?: string
          question_limit?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
