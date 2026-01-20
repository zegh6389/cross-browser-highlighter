/**
 * User types for frontend
 */

import type { UserRole, SubscriptionStatus } from './database';

/**
 * User session data
 */
export interface UserSession {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  role: UserRole;
}

/**
 * User profile with subscription info
 */
export interface UserProfile extends UserSession {
  subscription: UserSubscription | null;
  usage: UserUsage;
  createdAt: Date;
}

/**
 * Subscription summary
 */
export interface UserSubscription {
  status: SubscriptionStatus;
  planName: string;
  priceId: string;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
}

/**
 * Usage summary
 */
export interface UserUsage {
  syncedWordCount: number;
  syncedHighlightsCount: number;
  limitWords: number | null; // null = unlimited (has subscription)
  remainingWords: number | null;
  canSync: boolean;
  lastSyncAt: Date | null;
}

/**
 * Admin user view (extended profile data)
 */
export interface AdminUserView {
  id: string;
  email: string;
  fullName: string | null;
  role: UserRole;
  subscriptionStatus: SubscriptionStatus | null;
  totalHighlights: number;
  totalWords: number;
  createdAt: Date;
  lastActiveAt: Date | null;
}

/**
 * Extension auth token exchange result
 */
export interface ExtensionAuthResult {
  success: boolean;
  user?: UserSession;
  accessToken?: string;
  refreshToken?: string;
  error?: string;
}
