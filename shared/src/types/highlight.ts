/**
 * Highlight types shared between extension and web app
 */

import type { Json } from './database';

/**
 * Anchor data for restoring highlight position in DOM
 * Compatible with existing extension format
 */
export interface HighlightAnchor {
  text: string;
  prefix?: string;
  suffix?: string;
  textBefore?: string;
  textAfter?: string;
  // XPath or CSS selector for the container element
  selector?: string;
  // Character offsets
  startOffset?: number;
  endOffset?: number;
}

/**
 * Highlight colors available in the extension
 */
export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink';

/**
 * Local highlight format (stored in chrome.storage)
 */
export interface LocalHighlight {
  id: string;
  color: HighlightColor;
  anchor: HighlightAnchor;
  note?: string;
  noteColor?: HighlightColor;
  createdAt: number; // Unix timestamp
  // Sync status
  synced?: boolean;
  syncedAt?: number;
  // Server ID (after first sync)
  serverId?: string;
}

/**
 * Highlight for API sync requests
 */
export interface SyncHighlightRequest {
  localId: string;
  url: string;
  normalizedUrl: string;
  pageTitle?: string;
  text: string;
  color: HighlightColor;
  anchor: HighlightAnchor;
  note?: string;
  noteColor?: HighlightColor;
  createdAt: string; // ISO timestamp
}

/**
 * Sync response from server
 */
export interface SyncHighlightResponse {
  success: boolean;
  serverId?: string;
  error?: string;
  limitExceeded?: boolean;
}

/**
 * Bulk sync request
 */
export interface BulkSyncRequest {
  highlights: SyncHighlightRequest[];
}

/**
 * Bulk sync response
 */
export interface BulkSyncResponse {
  synced: Array<{
    localId: string;
    serverId: string;
  }>;
  failed: Array<{
    localId: string;
    error: string;
  }>;
  usage: {
    currentWords: number;
    limitWords: number | null;
    remainingWords: number | null;
    hasSubscription: boolean;
  };
}

/**
 * Highlight display format for dashboard
 */
export interface DisplayHighlight {
  id: string;
  url: string;
  normalizedUrl: string;
  pageTitle: string | null;
  text: string;
  color: HighlightColor;
  wordCount: number;
  note: string | null;
  noteColor: HighlightColor | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Group highlights by URL for display
 */
export interface HighlightGroup {
  url: string;
  normalizedUrl: string;
  pageTitle: string | null;
  highlights: DisplayHighlight[];
  totalWordCount: number;
}
