importScripts('lib/logger.js');

// Log when service worker starts
Logger.info("=== SERVICE WORKER STARTED ===", { timestamp: new Date().toISOString() });

// List of URL patterns where Chrome blocks extension script injection
// These are NOT policy-based - they are Chrome's built-in security restrictions
const RESTRICTED_URL_PATTERNS = [
  /^chrome:\/\//,              // Chrome internal pages
  /^chrome-extension:\/\//,    // Other extension pages  
  /^edge:\/\//,                // Edge internal pages
  /^comet:\/\//,               // Comet internal pages
  /^about:/,                   // About pages
  /^view-source:/,             // View source pages
  /^chrome\.google\.com\/webstore/,  // Chrome Web Store
  /^chromewebstore\.google\.com/,    // Chrome Web Store (new URL)
  /^addons\.mozilla\.org/,     // Firefox Add-ons (if running on Firefox)
];

function isRestrictedUrl(url) {
  if (!url) return true;
  return RESTRICTED_URL_PATTERNS.some(pattern => pattern.test(url));
}

function getOriginPattern(url) {
  try {
    return new URL(url).origin + "/*";
  } catch (e) {
    return null;
  }
}

function isCometBrowser() {
  const ua = (typeof navigator !== 'undefined' && navigator.userAgent) ? navigator.userAgent.toLowerCase() : '';
  const brands = (typeof navigator !== 'undefined' && navigator.userAgentData && navigator.userAgentData.brands)
    ? navigator.userAgentData.brands.map(b => (b.brand || '').toLowerCase()).join(' ')
    : '';
  return ua.includes('comet') || brands.includes('comet');
}

function getExtensionsSettingsUrl() {
  const ua = (typeof navigator !== 'undefined' && navigator.userAgent) ? navigator.userAgent : '';
  if (isCometBrowser()) return "comet://extensions";
  if (/Edg/i.test(ua)) return "edge://extensions";
  if (/Brave/i.test(ua)) return "brave://extensions";
  return "chrome://extensions";
}

async function ensureSitePermission(tabUrl) {
  const originPattern = getOriginPattern(tabUrl);
  if (!originPattern) {
    Logger.warn("Could not derive origin for permission check", { tabUrl });
    return { granted: false, originPattern: null };
  }

  // Extra origins for sites that commonly redirect (e.g., perplexity.ai)
  const extraOrigins = [];
  try {
    const url = new URL(tabUrl);
    if (url.hostname.includes("perplexity.ai")) {
      extraOrigins.push("https://www.perplexity.ai/*", "https://perplexity.ai/*");
    }
  } catch (e) {
    // ignore
  }

  const originsToCheck = [originPattern, ...extraOrigins];

  try {
    const hasPermission = await chrome.permissions.contains({ origins: originsToCheck });
    Logger.info("Permission check", { url: tabUrl, originsToCheck, hasPermission });
    if (hasPermission) {
      return { granted: true, originPattern, originsToCheck };
    }

    Logger.warn("No permission for this origin, attempting to request...", { originsToCheck });
    const granted = await chrome.permissions.request({ origins: originsToCheck });
    Logger.info("Permission request result", { originsToCheck, granted });
    return { granted, originPattern, originsToCheck, requested: true };
  } catch (err) {
    Logger.error("Permission check/request failed", { error: err.message, originsToCheck, url: tabUrl });
    return { granted: false, originPattern, originsToCheck, error: err };
  }
}

// Create context menu on installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "highlight-yellow",
    title: "Highlight Yellow",
    contexts: ["selection"]
  });

  chrome.contextMenus.create({
    id: "highlight-green",
    title: "Highlight Green",
    contexts: ["selection"]
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId.startsWith("highlight-")) {
    const color = info.menuItemId.split("-")[1];
    
    // Check if URL is restricted BEFORE trying to inject
    if (isRestrictedUrl(tab.url)) {
      Logger.warn("Cannot highlight on this page", { 
        reason: "Chrome restricts extensions on this page type for security",
        url: tab.url 
      });
      return;
    }

    // Send message to content script
    Logger.info(`Sending highlight command: ${color}`, { tabId: tab.id });
    sendMessageToTab(tab.id, tab.url, {
      action: "HIGHLIGHT_SELECTION",
      color: color
    });
  }
});

async function sendMessageToTab(tabId, tabUrl, message) {
  Logger.info("sendMessageToTab called", { tabId, tabUrl, action: message.action });

  const permissionResult = await ensureSitePermission(tabUrl);
  if (!permissionResult.granted) {
    const settingsUrl = getExtensionsSettingsUrl();
    Logger.error("Site access not granted for tab", { 
      tabId, 
      tabUrl, 
      originPattern: permissionResult.originPattern,
      settingsUrl 
    });
    return;
  }
  
  // First try to ping the content script to see if it's already loaded
  try {
    Logger.info("Pinging content script...");
    const response = await chrome.tabs.sendMessage(tabId, { action: "PING" });
    if (response && response.status === "PONG") {
      // Content script is loaded, send the actual message
      await chrome.tabs.sendMessage(tabId, message);
      Logger.info("Message delivered successfully (content script was already loaded)");
      return;
    }
  } catch (pingErr) {
    // Content script not loaded, will try to inject
    Logger.info("Content script not responding, will attempt injection...", { pingError: pingErr.message });
  }
  
  try {
    Logger.info("Trying direct message send...");
    await chrome.tabs.sendMessage(tabId, message);
    Logger.info("Message delivered successfully");
  } catch (err) {
    Logger.warn("Direct message failed, attempting to inject content scripts...", { error: err.message });
    try {
      Logger.info("Calling injectScripts...");
      await injectScripts(tabId, tabUrl);
      Logger.info("Scripts injected, retrying message...");

      // Retry sending message
      await chrome.tabs.sendMessage(tabId, message);
      Logger.info("Message delivered after injection");
    } catch (retryErr) {
      const msg = retryErr.message;
      Logger.error("Injection or retry failed", { 
        errorMessage: msg,
        errorName: retryErr.name,
        url: tabUrl
      });
      
      // Check if it's a Chrome-restricted page (NOT a policy issue)
      if (msg.includes("ExtensionsSettings policy") || 
          msg.includes("Cannot access contents of url") ||
          msg.includes("Cannot access") ||
          msg.includes("cannot be scripted")) {
        Logger.error("Cannot highlight on this page", { 
          reason: "Chrome security restriction (not a registry policy)",
          error: msg,
          url: tabUrl,
          note: "This is normal for chrome://, extension pages, and Chrome Web Store"
        });
      } else {
        Logger.error("Failed to send message after injection", { error: msg });
      }
    }
  }
}

async function injectScripts(tabId, tabUrl) {
  try {
    // First, check if we can access the tab at all
    const tab = await chrome.tabs.get(tabId);
    const targetUrl = tab?.url || tabUrl || '';
    Logger.info("Attempting injection", { 
      tabId: tabId, 
      url: targetUrl,
      status: tab?.status,
      tabTitle: tab?.title
    });

    if (isRestrictedUrl(targetUrl)) {
      throw new Error(`Cannot inject scripts into protected page: ${targetUrl}`);
    }

    // Try injecting CSS first
    Logger.info("Injecting CSS...");
    try {
      await chrome.scripting.insertCSS({
        target: { tabId: tabId },
        files: ["styles/highlighter.css"]
      });
      Logger.info("CSS injected successfully");
    } catch (cssErr) {
      Logger.error("CSS injection failed", { error: cssErr.message });
      throw cssErr;
    }

    // Inject scripts
    Logger.info("Injecting scripts...");
    try {
      const result = await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ["lib/logger.js", "lib/anchoring.js", "content.js"],
        injectImmediately: true
      });
      Logger.info("Scripts injected successfully", { result: JSON.stringify(result) });
    } catch (scriptErr) {
      Logger.error("Script injection failed", { error: scriptErr.message });
      throw scriptErr;
    }
  } catch (err) {
    // Provide more helpful error messages
    const msg = err.message || '';
    Logger.error("Injection error details", { 
      message: msg, 
      name: err.name,
      stack: err.stack 
    });
    
    if (msg.includes('ExtensionsSettings') || msg.includes('policy') || msg.includes('cannot be scripted')) {
      const settingsUrl = getExtensionsSettingsUrl();
      throw new Error(`Script injection blocked by the browser. Fix steps:
1) Open ${settingsUrl}
2) Find "Web Highlighter" and click "Details"
3) Set "Site access" to "On all sites" (allow for the current site if prompted)
4) Reload the target page and try again`);
    }
    throw new Error(`Script injection failed: ${err.message}`);
  }
}

chrome.commands.onCommand.addListener(async (command) => {
  const colorMap = {
    "highlight-yellow": "yellow",
    "highlight-green": "green"
  };

  const color = colorMap[command];
  if (!color) {
    return;
  }

  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs?.[0];
    if (!tab || !tab.id) {
      Logger.warn("Keyboard shortcut fired but no active tab was found", { command });
      return;
    }

    if (!tab.url) {
      Logger.warn("Keyboard shortcut ignored because tab URL is not available", { command, tabId: tab.id });
      return;
    }

    await sendMessageToTab(tab.id, tab.url, {
      action: "HIGHLIGHT_SELECTION",
      color: color
    });
  } catch (err) {
    Logger.error("Failed to run keyboard shortcut command", { command, error: err?.message || err });
  }
});
