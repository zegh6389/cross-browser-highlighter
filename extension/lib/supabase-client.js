/**
 * Supabase Client for Browser Extension
 * Handles authentication and API calls to Supabase
 */

class SupabaseClient {
  constructor() {
    this.url = window.HIGHLIGHTER_CONFIG?.SUPABASE_URL || '';
    this.anonKey = window.HIGHLIGHTER_CONFIG?.SUPABASE_ANON_KEY || '';
    this.accessToken = null;
    this.user = null;
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    
    // Load saved auth state
    const result = await chrome.storage.local.get(['auth_state']);
    if (result.auth_state) {
      this.accessToken = result.auth_state.accessToken;
      this.user = result.auth_state.user;
    }
    
    this.initialized = true;
    Logger.info('SupabaseClient initialized', { hasAuth: !!this.accessToken });
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!this.accessToken && !!this.user;
  }

  /**
   * Get current user
   */
  getUser() {
    return this.user;
  }

  /**
   * Set auth state (called after token exchange)
   */
  async setAuthState(user, accessToken = null) {
    this.user = user;
    this.accessToken = accessToken;
    
    await chrome.storage.local.set({
      auth_state: {
        user,
        accessToken,
        updatedAt: Date.now(),
      },
    });
    
    Logger.info('Auth state updated', { userId: user?.id });
  }

  /**
   * Clear auth state (logout)
   */
  async clearAuthState() {
    this.user = null;
    this.accessToken = null;
    
    await chrome.storage.local.remove(['auth_state']);
    Logger.info('Auth state cleared');
  }

  /**
   * Make an authenticated API request
   */
  async request(endpoint, options = {}) {
    const url = `${this.url}${endpoint}`;
    
    const headers = {
      'Content-Type': 'application/json',
      'apikey': this.anonKey,
      ...options.headers,
    };
    
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }
    
    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(error.message || `HTTP ${response.status}`);
      }
      
      return response.json();
    } catch (error) {
      Logger.error('Supabase request failed', { endpoint, error: error.message });
      throw error;
    }
  }

  /**
   * Call a Supabase RPC function
   */
  async rpc(functionName, params = {}) {
    return this.request(`/rest/v1/rpc/${functionName}`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /**
   * Query a table
   */
  async from(table) {
    const self = this;
    return {
      select: async (columns = '*') => {
        return self.request(`/rest/v1/${table}?select=${columns}`);
      },
      insert: async (data) => {
        return self.request(`/rest/v1/${table}`, {
          method: 'POST',
          headers: { 'Prefer': 'return=representation' },
          body: JSON.stringify(data),
        });
      },
      update: async (data, match) => {
        const query = Object.entries(match)
          .map(([k, v]) => `${k}=eq.${v}`)
          .join('&');
        return self.request(`/rest/v1/${table}?${query}`, {
          method: 'PATCH',
          headers: { 'Prefer': 'return=representation' },
          body: JSON.stringify(data),
        });
      },
      delete: async (match) => {
        const query = Object.entries(match)
          .map(([k, v]) => `${k}=eq.${v}`)
          .join('&');
        return self.request(`/rest/v1/${table}?${query}`, {
          method: 'DELETE',
        });
      },
    };
  }
}

// Create singleton instance
const supabaseClient = new SupabaseClient();

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.supabaseClient = supabaseClient;
}
