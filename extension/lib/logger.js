/**
 * Simple Logger to persist logs to chrome.storage for debugging UI.
 */
const Logger = {
  MAX_LOGS: 100,
  STORAGE_KEY: "debug_logs",

  async log(level, message, details = null) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      details: details ? JSON.stringify(details) : null,
      context: (typeof window !== 'undefined' && window.document) ? "Content" : "Background"
    };

    console.log(`[${entry.context}] ${level}: ${message}`, details || "");

    try {
      // Fetch existing logs
      // Note: In high-frequency logging, this race condition is risky, but fine for debugging.
      const result = await chrome.storage.local.get(this.STORAGE_KEY);
      const logs = result[this.STORAGE_KEY] || [];
      
      logs.unshift(entry); // Add to top
      
      if (logs.length > this.MAX_LOGS) {
        logs.length = this.MAX_LOGS;
      }

      await chrome.storage.local.set({ [this.STORAGE_KEY]: logs });
    } catch (e) {
      console.error("Failed to save log:", e);
    }
  },

  info(message, details) { this.log("INFO", message, details); },
  warn(message, details) { this.log("WARN", message, details); },
  error(message, details) { this.log("ERROR", message, details); },
  
  async clear() {
    await chrome.storage.local.remove(this.STORAGE_KEY);
  }
};

// Expose globally
if (typeof window !== 'undefined') {
    window.Logger = Logger;
}
// For Service Workers (Background)
if (typeof self !== 'undefined') {
    self.Logger = Logger;
}
