export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'user' | 'admin' | 'super_admin';
export type UserStatus = 'active' | 'inactive' | 'suspended';
export type ProcessingStatus = 'queued' | 'processing' | 'completed' | 'failed';
export type ImageSlot = 'image_1' | 'image_2';
export type AiScreeningStatus = 'authentic' | 'suspected_ai' | 'inconclusive';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          avatar_path: string | null;
          status: UserStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          avatar_path?: string | null;
          status?: UserStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          avatar_path?: string | null;
          status?: UserStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          id: string;
          user_id: string;
          role: UserRole;
          assigned_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role?: UserRole;
          assigned_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          role?: UserRole;
          assigned_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      comparisons: {
        Row: {
          id: string;
          user_id: string;
          similarity_score: number;
          raw_cosine_score: number | null;
          similarity_category: string;
          model_version: string;
          processing_status: ProcessingStatus;
          image_retention_consent: boolean;
          image_quality_status: string;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          similarity_score: number;
          raw_cosine_score?: number | null;
          similarity_category: string;
          model_version?: string;
          processing_status?: ProcessingStatus;
          image_retention_consent?: boolean;
          image_quality_status?: string;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          similarity_score?: number;
          raw_cosine_score?: number | null;
          similarity_category?: string;
          model_version?: string;
          processing_status?: ProcessingStatus;
          image_retention_consent?: boolean;
          image_quality_status?: string;
          metadata?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
      comparison_images: {
        Row: {
          id: string;
          comparison_id: string;
          user_id: string;
          image_slot: ImageSlot;
          storage_path: string;
          retention_status: boolean;
          created_at: string;
          expires_at: string | null;
        };
        Insert: {
          id?: string;
          comparison_id: string;
          user_id: string;
          image_slot: ImageSlot;
          storage_path: string;
          retention_status?: boolean;
          created_at?: string;
          expires_at?: string | null;
        };
        Update: {
          id?: string;
          comparison_id?: string;
          user_id?: string;
          image_slot?: ImageSlot;
          storage_path?: string;
          retention_status?: boolean;
          created_at?: string;
          expires_at?: string | null;
        };
        Relationships: [];
      };
      inference_jobs: {
        Row: {
          id: string;
          comparison_id: string | null;
          user_id: string;
          job_status: ProcessingStatus;
          processing_stage: string;
          worker_reference: string | null;
          started_at: string | null;
          completed_at: string | null;
          error_code: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          comparison_id?: string | null;
          user_id: string;
          job_status?: ProcessingStatus;
          processing_stage?: string;
          worker_reference?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          error_code?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          comparison_id?: string | null;
          user_id?: string;
          job_status?: ProcessingStatus;
          processing_stage?: string;
          worker_reference?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          error_code?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      ai_screening_results: {
        Row: {
          id: string;
          comparison_id: string;
          image_slot: ImageSlot;
          screening_status: AiScreeningStatus;
          confidence_score: number;
          model_version: string;
          details: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          comparison_id: string;
          image_slot: ImageSlot;
          screening_status?: AiScreeningStatus;
          confidence_score?: number;
          model_version?: string;
          details?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          comparison_id?: string;
          image_slot?: ImageSlot;
          screening_status?: AiScreeningStatus;
          confidence_score?: number;
          model_version?: string;
          details?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
      model_evaluations: {
        Row: {
          id: string;
          model_name: string;
          model_version: string;
          dataset_version: string;
          roc_auc: number;
          eer: number;
          far: number;
          frr: number;
          thresholds: Json | null;
          evaluation_date: string;
        };
        Insert: {
          id?: string;
          model_name: string;
          model_version: string;
          dataset_version: string;
          roc_auc: number;
          eer: number;
          far: number;
          frr: number;
          thresholds?: Json | null;
          evaluation_date?: string;
        };
        Update: {
          id?: string;
          model_name?: string;
          model_version?: string;
          dataset_version?: string;
          roc_auc?: number;
          eer?: number;
          far?: number;
          frr?: number;
          thresholds?: Json | null;
          evaluation_date?: string;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          actor_id: string | null;
          action: string;
          event_type: string;
          target_reference: string | null;
          severity: string;
          ip_address: string | null;
          user_agent: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id?: string | null;
          action: string;
          event_type: string;
          target_reference?: string | null;
          severity?: string;
          ip_address?: string | null;
          user_agent?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          actor_id?: string | null;
          action?: string;
          event_type?: string;
          target_reference?: string | null;
          severity?: string;
          ip_address?: string | null;
          user_agent?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_admin: {
        Args: { user_id: string };
        Returns: boolean;
      };
      is_super_admin: {
        Args: { user_id: string };
        Returns: boolean;
      };
    };
    Enums: {
      user_role_type: UserRole;
      user_status_type: UserStatus;
      processing_status_type: ProcessingStatus;
      image_slot_type: ImageSlot;
      ai_screening_status_type: AiScreeningStatus;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
