/**
 * Highlight Sync Service
 * Manages syncing highlights between local storage and cloud
 */

class SyncService {
  constructor() {
    this.syncQueue = [];
    this.isSyncing = false;
    this.syncTimeout = null;
    this.usageCache = null;
  }

  /**
   * Initialize sync service
   */
  async init() {
    // Load sync queue from storage
    const result = await chrome.storage.local.get(['sync_queue', 'usage_cache']);
    this.syncQueue = result.sync_queue || [];
    this.usageCache = result.usage_cache || null;
    
    Logger.info('SyncService initialized', { 
      queueSize: this.syncQueue.length,
      usage: this.usageCache 
    });
    
    // Process any pending syncs
    if (this.syncQueue.length > 0 && window.supabaseClient?.isAuthenticated()) {
      this.scheduleSync();
    }
  }

  /**
   * Add highlight to sync queue
   */
  async queueHighlight(highlight, url) {
    const normalizedUrl = Utils.normalizeUrl(url);
    
    const syncItem = {
      localId: highlight.id,
      url: url,
      normalizedUrl: normalizedUrl,
      pageTitle: document.title,
      text: highlight.anchor.text,
      color: highlight.color,
      anchor: highlight.anchor,
      note: highlight.note,
      noteColor: highlight.noteColor,
      createdAt: new Date(highlight.createdAt).toISOString(),
      queuedAt: Date.now(),
    };
    
    // Check if already in queue (update instead of duplicate)
    const existingIndex = this.syncQueue.findIndex(item => item.localId === highlight.id);
    if (existingIndex >= 0) {
      this.syncQueue[existingIndex] = syncItem;
    } else {
      this.syncQueue.push(syncItem);
    }
    
    // Save queue to storage
    await chrome.storage.local.set({ sync_queue: this.syncQueue });
    
    Logger.info('Highlight queued for sync', { localId: highlight.id });
    
    // Schedule sync
    this.scheduleSync();
  }

  /**
   * Remove highlight from sync (for deletions)
   */
  async removeFromSync(highlightId) {
    this.syncQueue = this.syncQueue.filter(item => item.localId !== highlightId);
    await chrome.storage.local.set({ sync_queue: this.syncQueue });
  }

  /**
   * Schedule a sync with debouncing
   */
  scheduleSync() {
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
    }
    
    const debounceMs = window.HIGHLIGHTER_CONFIG?.SYNC_DEBOUNCE_MS || 5000;
    
    this.syncTimeout = setTimeout(() => {
      this.performSync();
    }, debounceMs);
  }

  /**
   * Perform the actual sync
   */
  async performSync() {
    if (this.isSyncing) {
      Logger.info('Sync already in progress, skipping');
      return;
    }
    
    if (!window.supabaseClient?.isAuthenticated()) {
      Logger.info('Not authenticated, skipping sync');
      return;
    }
    
    if (this.syncQueue.length === 0) {
      Logger.info('Nothing to sync');
      return;
    }
    
    this.isSyncing = true;
    Logger.info('Starting sync', { count: this.syncQueue.length });
    
    try {
      const batchSize = window.HIGHLIGHTER_CONFIG?.SYNC_BATCH_SIZE || 50;
      const batch = this.syncQueue.slice(0, batchSize);
      
      // Call sync API
      const webAppUrl = window.HIGHLIGHTER_CONFIG?.WEB_APP_URL || 'http://localhost:3000';
      const response = await fetch(`${webAppUrl}/api/highlights/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ highlights: batch }),
        credentials: 'include', // Include cookies for session
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Sync failed');
      }
      
      // Remove synced items from queue
      const syncedIds = new Set(result.synced.map(s => s.localId));
      this.syncQueue = this.syncQueue.filter(item => !syncedIds.has(item.localId));
      
      // Update local highlights with server IDs
      for (const synced of result.synced) {
        await this.updateLocalHighlightServerId(synced.localId, synced.serverId);
      }
      
      // Update usage cache
      this.usageCache = result.usage;
      await chrome.storage.local.set({ 
        sync_queue: this.syncQueue,
        usage_cache: this.usageCache,
      });
      
      Logger.info('Sync completed', {
        synced: result.synced.length,
        failed: result.failed.length,
        remaining: this.syncQueue.length,
        usage: result.usage,
      });
      
      // Handle limit exceeded
      if (result.limitExceeded) {
        this.notifyLimitExceeded();
      }
      
      // Log failures
      if (result.failed.length > 0) {
        Logger.warn('Some highlights failed to sync', { failed: result.failed });
      }
      
      // Continue syncing if more items remain
      if (this.syncQueue.length > 0) {
        this.scheduleSync();
      }
      
    } catch (error) {
      Logger.error('Sync failed', { error: error.message });
      
      // Retry after delay
      setTimeout(() => this.scheduleSync(), 30000);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Update local highlight with server ID after sync
   */
  async updateLocalHighlightServerId(localId, serverId) {
    // This marks the highlight as synced locally
    // Implementation depends on your storage structure
    // For now, we'll store a mapping
    const result = await chrome.storage.local.get(['synced_highlights_map']);
    const map = result.synced_highlights_map || {};
    map[localId] = serverId;
    await chrome.storage.local.set({ synced_highlights_map: map });
  }

  /**
   * Notify user that limit was exceeded
   */
  notifyLimitExceeded() {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Sync Limit Reached',
      message: 'You\'ve reached your free highlight limit. Upgrade to Pro for unlimited syncing.',
      buttons: [{ title: 'Upgrade' }],
    });
  }

  /**
   * Get current usage
   */
  getUsage() {
    return this.usageCache;
  }

  /**
   * Check if user can sync more highlights
   */
  canSync(additionalWords = 0) {
    if (!this.usageCache) return true; // Optimistic if no data
    if (this.usageCache.hasSubscription) return true;
    
    const remaining = this.usageCache.remainingWords || 0;
    return remaining >= additionalWords;
  }

  /**
   * Force immediate sync
   */
  async forceSync() {
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
    }
    await this.performSync();
  }
}

// Create singleton instance
const syncService = new SyncService();

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.syncService = syncService;
}
