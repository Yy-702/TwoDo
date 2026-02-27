export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type TodoPriority = "low" | "medium" | "high";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_path: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          avatar_path?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          avatar_path?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      spaces: {
        Row: {
          id: string;
          name: string;
          type: "personal" | "shared";
          owner_user_id: string;
          invite_code: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          type: "personal" | "shared";
          owner_user_id: string;
          invite_code?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          type?: "personal" | "shared";
          owner_user_id?: string;
          invite_code?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      space_members: {
        Row: {
          space_id: string;
          user_id: string;
          role: "owner" | "member";
          joined_at: string;
        };
        Insert: {
          space_id: string;
          user_id: string;
          role?: "owner" | "member";
          joined_at?: string;
        };
        Update: {
          space_id?: string;
          user_id?: string;
          role?: "owner" | "member";
          joined_at?: string;
        };
        Relationships: [];
      };
      space_photos: {
        Row: {
          id: string;
          space_id: string;
          uploaded_by: string;
          object_path: string;
          mime_type: string;
          size_bytes: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          space_id: string;
          uploaded_by: string;
          object_path: string;
          mime_type: string;
          size_bytes: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          space_id?: string;
          uploaded_by?: string;
          object_path?: string;
          mime_type?: string;
          size_bytes?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      shared_space_close_requests: {
        Row: {
          space_id: string;
          initiator_user_id: string;
          partner_user_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          space_id: string;
          initiator_user_id: string;
          partner_user_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          space_id?: string;
          initiator_user_id?: string;
          partner_user_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      shared_space_archives: {
        Row: {
          id: string;
          original_space_id: string;
          initiator_user_id: string;
          confirmer_user_id: string;
          closed_at: string;
          member_user_ids: string[];
          snapshot: Json;
        };
        Insert: {
          id?: string;
          original_space_id: string;
          initiator_user_id: string;
          confirmer_user_id: string;
          closed_at?: string;
          member_user_ids?: string[];
          snapshot: Json;
        };
        Update: {
          id?: string;
          original_space_id?: string;
          initiator_user_id?: string;
          confirmer_user_id?: string;
          closed_at?: string;
          member_user_ids?: string[];
          snapshot?: Json;
        };
        Relationships: [];
      };
      todos: {
        Row: {
          id: string;
          space_id: string;
          title: string;
          description: string | null;
          due_at: string | null;
          priority: TodoPriority;
          assignee_user_id: string | null;
          is_completed: boolean;
          completed_at: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          space_id: string;
          title: string;
          description?: string | null;
          due_at?: string | null;
          priority?: TodoPriority;
          assignee_user_id?: string | null;
          is_completed?: boolean;
          completed_at?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          space_id?: string;
          title?: string;
          description?: string | null;
          due_at?: string | null;
          priority?: TodoPriority;
          assignee_user_id?: string | null;
          is_completed?: boolean;
          completed_at?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      rpc_ensure_personal_space: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      rpc_create_shared_space: {
        Args: {
          space_name: string;
        };
        Returns: string;
      };
      rpc_join_shared_space: {
        Args: {
          invite_code: string;
        };
        Returns: string;
      };
      rpc_get_my_shared_space_context: {
        Args: Record<PropertyKey, never>;
        Returns: {
          space_id: string;
          owner_user_id: string;
          invite_code: string | null;
          member_count: number;
          close_request_initiator_user_id: string | null;
          close_request_created_at: string | null;
        }[];
      };
      rpc_request_close_shared_space: {
        Args: {
          target_space_id: string;
        };
        Returns: string;
      };
      rpc_confirm_close_shared_space: {
        Args: {
          target_space_id: string;
        };
        Returns: string;
      };
      rpc_cancel_close_shared_space: {
        Args: {
          target_space_id: string;
        };
        Returns: string;
      };
      rpc_get_space_member_profiles: {
        Args: {
          target_space_id: string;
        };
        Returns: {
          user_id: string;
          display_name: string | null;
          avatar_path: string | null;
          role: string;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
