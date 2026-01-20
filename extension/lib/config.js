/**
 * Extension Configuration
 * Contains all settings for the Web Highlighter extension
 */

const CONFIG = {
  // Supabase configuration
  // These values should be replaced during build/deployment
  SUPABASE_URL: '__SUPABASE_URL__', // Replace with your Supabase URL
  SUPABASE_ANON_KEY: '__SUPABASE_ANON_KEY__', // Replace with your Supabase anon key
  
  // Web app URL for authentication
  WEB_APP_URL: '__WEB_APP_URL__', // e.g., https://app.highlighter.com
  
  // Usage limits
  WORD_LIMIT_FREE: 300,
  
  // Sync settings
  SYNC_DEBOUNCE_MS: 5000, // Wait 5 seconds after last change before syncing
  SYNC_BATCH_SIZE: 50, // Max highlights per sync request
  
  // Storage keys
  STORAGE_KEY_AUTH: 'auth_state',
  STORAGE_KEY_SYNC_QUEUE: 'sync_queue',
  STORAGE_KEY_USAGE: 'usage_cache',
};

// For development, you can override these values
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
  // Running as extension - check for dev overrides
  chrome.storage.local.get(['dev_config'], (result) => {
    if (result.dev_config) {
      Object.assign(CONFIG, result.dev_config);
    }
  });
}

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.HIGHLIGHTER_CONFIG = CONFIG;
}
