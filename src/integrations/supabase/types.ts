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
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      bridge_heartbeats: {
        Row: {
          host_name: string
          id: string
          last_error: string | null
          last_seen_at: string
          metadata: Json | null
          running_count: number
          started_at: string
          status: string
          version: string | null
        }
        Insert: {
          host_name: string
          id?: string
          last_error?: string | null
          last_seen_at?: string
          metadata?: Json | null
          running_count?: number
          started_at?: string
          status?: string
          version?: string | null
        }
        Update: {
          host_name?: string
          id?: string
          last_error?: string | null
          last_seen_at?: string
          metadata?: Json | null
          running_count?: number
          started_at?: string
          status?: string
          version?: string | null
        }
        Relationships: []
      }
      executions: {
        Row: {
          duration_seconds: number | null
          error_message: string | null
          finished_at: string | null
          id: string
          log_output: string | null
          robot_id: string
          source_host: string | null
          started_at: string
          status: string
          triggered_by: string
        }
        Insert: {
          duration_seconds?: number | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          log_output?: string | null
          robot_id: string
          source_host?: string | null
          started_at?: string
          status?: string
          triggered_by?: string
        }
        Update: {
          duration_seconds?: number | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          log_output?: string | null
          robot_id?: string
          source_host?: string | null
          started_at?: string
          status?: string
          triggered_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "executions_robot_id_fkey"
            columns: ["robot_id"]
            isOneToOne: false
            referencedRelation: "robots"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_emoji: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          avatar_emoji?: string
          created_at?: string
          id: string
          name?: string
        }
        Update: {
          avatar_emoji?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      roadmap: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          name: string
          priority: string
          status: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          priority?: string
          status?: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          priority?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      roadmap_steps: {
        Row: {
          created_at: string
          done: boolean
          id: string
          position: number
          roadmap_id: string
          title: string
        }
        Insert: {
          created_at?: string
          done?: boolean
          id?: string
          position?: number
          roadmap_id: string
          title: string
        }
        Update: {
          created_at?: string
          done?: boolean
          id?: string
          position?: number
          roadmap_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "roadmap_steps_roadmap_id_fkey"
            columns: ["roadmap_id"]
            isOneToOne: false
            referencedRelation: "roadmap"
            referencedColumns: ["id"]
          },
        ]
      }
      robots: {
        Row: {
          category: string
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          name: string
          script_path: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          script_path?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          script_path?: string | null
        }
        Relationships: []
      }
      schedules: {
        Row: {
          created_at: string
          cron_expression: string | null
          frequency: string
          id: string
          is_active: boolean
          next_run_at: string | null
          robot_id: string
        }
        Insert: {
          created_at?: string
          cron_expression?: string | null
          frequency?: string
          id?: string
          is_active?: boolean
          next_run_at?: string | null
          robot_id: string
        }
        Update: {
          created_at?: string
          cron_expression?: string | null
          frequency?: string
          id?: string
          is_active?: boolean
          next_run_at?: string | null
          robot_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedules_robot_id_fkey"
            columns: ["robot_id"]
            isOneToOne: false
            referencedRelation: "robots"
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: { Args: { _user_id: string }; Returns: string }
      has_any_users: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "viewer"
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
      app_role: ["admin", "viewer"],
    },
  },
} as const
