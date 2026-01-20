/**
 * Type-safe database query helpers
 * These helpers provide proper TypeScript types for Supabase queries
 */

import type {
  Profile,
  Subscription,
  Highlight,
  UsageTracking,
  Database,
} from '@web-highlighter/shared';

// Re-export types for convenience
export type { Profile, Subscription, Highlight, UsageTracking, Database };

// Type for subscription with relation to profile
export interface SubscriptionWithStatus {
  status: string;
  current_period_end: string | null;
}

// Type for usage tracking subset
export interface UsageStats {
  synced_word_count: number;
  synced_highlights_count: number;
}

// Type for user with relations
export interface UserWithRelations extends Profile {
  subscriptions: SubscriptionWithStatus | SubscriptionWithStatus[] | null;
  usage_tracking: UsageStats | UsageStats[] | null;
}

// Type for activation code
export interface ActivationCode {
  id: string;
  code_hash: string;
  created_at: string;
  expires_at: string;
  used_at: string | null;
  creator: { email: string; full_name: string | null } | null;
  user: { email: string; full_name: string | null } | null;
}

// Type for recent user (subset)
export interface RecentUser {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  created_at: string;
}

/**
 * Type assertion helper for profile queries
 */
export function asProfile(data: unknown): Profile | null {
  return data as Profile | null;
}

/**
 * Type assertion helper for subscription queries
 */
export function asSubscription(data: unknown): Subscription | null {
  return data as Subscription | null;
}

/**
 * Type assertion helper for highlights array
 */
export function asHighlights(data: unknown): Highlight[] {
  return (data || []) as Highlight[];
}

/**
 * Type assertion helper for usage tracking
 */
export function asUsageTracking(data: unknown): UsageTracking | null {
  return data as UsageTracking | null;
}

/**
 * Type assertion helper for users with relations
 */
export function asUsersWithRelations(data: unknown): UserWithRelations[] {
  return (data || []) as UserWithRelations[];
}

/**
 * Type assertion for recent users
 */
export function asRecentUsers(data: unknown): RecentUser[] {
  return (data || []) as RecentUser[];
}

/**
 * Type assertion for activation codes
 */
export function asActivationCodes(data: unknown): ActivationCode[] {
  return (data || []) as ActivationCode[];
}

/**
 * Type assertion for usage stats array
 */
export function asUsageStatsArray(data: unknown): UsageStats[] {
  return (data || []) as UsageStats[];
}

/**
 * Type assertion for subscription data array
 */
export function asSubscriptionArray(data: unknown): { stripe_price_id: string | null; status: string }[] {
  return (data || []) as { stripe_price_id: string | null; status: string }[];
}
