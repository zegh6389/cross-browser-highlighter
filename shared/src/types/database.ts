/**
 * Database types - Generated from Supabase schema
 * Run `pnpm db:gen-types` to regenerate after schema changes
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'customer' | 'admin';

export type SubscriptionStatus =
  | 'active'
  | 'canceled'
  | 'past_due'
  | 'trialing'
  | 'incomplete'
  | 'incomplete_expired'
  | 'unpaid'
  | 'paused';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          role: UserRole;
          stripe_customer_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
          stripe_customer_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
          stripe_customer_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          stripe_subscription_id: string;
          stripe_price_id: string;
          status: SubscriptionStatus;
          current_period_start: string | null;
          current_period_end: string | null;
          cancel_at_period_end: boolean;
          canceled_at: string | null;
          trial_start: string | null;
          trial_end: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          stripe_subscription_id: string;
          stripe_price_id: string;
          status?: SubscriptionStatus;
          current_period_start?: string | null;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
          canceled_at?: string | null;
          trial_start?: string | null;
          trial_end?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          stripe_subscription_id?: string;
          stripe_price_id?: string;
          status?: SubscriptionStatus;
          current_period_start?: string | null;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
          canceled_at?: string | null;
          trial_start?: string | null;
          trial_end?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      highlights: {
        Row: {
          id: string;
          user_id: string;
          url: string;
          normalized_url: string;
          page_title: string | null;
          text: string;
          color: string;
          word_count: number;
          anchor: Json;
          note: string | null;
          note_color: string | null;
          local_id: string | null;
          synced_at: string | null;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          url: string;
          normalized_url: string;
          page_title?: string | null;
          text: string;
          color?: string;
          word_count?: number;
          anchor: Json;
          note?: string | null;
          note_color?: string | null;
          local_id?: string | null;
          synced_at?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          url?: string;
          normalized_url?: string;
          page_title?: string | null;
          text?: string;
          color?: string;
          word_count?: number;
          anchor?: Json;
          note?: string | null;
          note_color?: string | null;
          local_id?: string | null;
          synced_at?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      usage_tracking: {
        Row: {
          id: string;
          user_id: string;
          total_word_count: number;
          synced_word_count: number;
          total_highlights_count: number;
          synced_highlights_count: number;
          last_highlight_at: string | null;
          last_sync_at: string | null;
          period_start: string | null;
          period_word_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          total_word_count?: number;
          synced_word_count?: number;
          total_highlights_count?: number;
          synced_highlights_count?: number;
          last_highlight_at?: string | null;
          last_sync_at?: string | null;
          period_start?: string | null;
          period_word_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          total_word_count?: number;
          synced_word_count?: number;
          total_highlights_count?: number;
          synced_highlights_count?: number;
          last_highlight_at?: string | null;
          last_sync_at?: string | null;
          period_start?: string | null;
          period_word_count?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      admin_activation_codes: {
        Row: {
          id: string;
          code_hash: string;
          created_by: string | null;
          used_by: string | null;
          used_at: string | null;
          expires_at: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          code_hash: string;
          created_by?: string | null;
          used_by?: string | null;
          used_at?: string | null;
          expires_at: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          code_hash?: string;
          created_by?: string | null;
          used_by?: string | null;
          used_at?: string | null;
          expires_at?: string;
          description?: string | null;
          created_at?: string;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          user_id: string | null;
          action: string;
          entity_type: string | null;
          entity_id: string | null;
          metadata: Json;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          action: string;
          entity_type?: string | null;
          entity_id?: string | null;
          metadata?: Json;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          action?: string;
          entity_type?: string | null;
          entity_id?: string | null;
          metadata?: Json;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
      };
      extension_auth_tokens: {
        Row: {
          id: string;
          user_id: string;
          token_hash: string;
          expires_at: string;
          used_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          token_hash: string;
          expires_at: string;
          used_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          token_hash?: string;
          expires_at?: string;
          used_at?: string | null;
          created_at?: string;
        };
      };
    };
    Functions: {
      has_active_subscription: {
        Args: { p_user_id: string };
        Returns: boolean;
      };
      can_user_sync: {
        Args: { p_user_id: string; p_word_count?: number };
        Returns: {
          can_sync: boolean;
          current_words: number;
          limit_words: number | null;
          remaining_words: number | null;
          has_subscription: boolean;
        }[];
      };
      generate_admin_activation_code: {
        Args: {
          p_created_by: string;
          p_expires_in_days?: number;
          p_description?: string | null;
        };
        Returns: string;
      };
      validate_and_use_activation_code: {
        Args: { p_code: string; p_user_id: string };
        Returns: boolean;
      };
      is_activation_code_valid: {
        Args: { p_code: string };
        Returns: boolean;
      };
      generate_extension_token: {
        Args: { p_user_id: string };
        Returns: string;
      };
      exchange_extension_token: {
        Args: { p_token: string };
        Returns: {
          user_id: string | null;
          email: string | null;
          role: UserRole | null;
          is_valid: boolean;
        }[];
      };
      log_audit_event: {
        Args: {
          p_user_id: string;
          p_action: string;
          p_entity_type?: string | null;
          p_entity_id?: string | null;
          p_metadata?: Json;
          p_ip_address?: string | null;
          p_user_agent?: string | null;
        };
        Returns: string;
      };
    };
    Enums: {
      user_role: UserRole;
      subscription_status: SubscriptionStatus;
    };
  };
}

// Convenience type aliases
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

export type Subscription = Database['public']['Tables']['subscriptions']['Row'];
export type SubscriptionInsert = Database['public']['Tables']['subscriptions']['Insert'];
export type SubscriptionUpdate = Database['public']['Tables']['subscriptions']['Update'];

export type Highlight = Database['public']['Tables']['highlights']['Row'];
export type HighlightInsert = Database['public']['Tables']['highlights']['Insert'];
export type HighlightUpdate = Database['public']['Tables']['highlights']['Update'];

export type UsageTracking = Database['public']['Tables']['usage_tracking']['Row'];
export type AuditLog = Database['public']['Tables']['audit_logs']['Row'];
