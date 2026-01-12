# Chrome Extension - Restricted Pages Documentation

## Understanding the "ExtensionsSettings policy" Error

### The Error Message
```
Cannot highlight on this page (Browser Restriction)
{"error":"Script injection failed: This page cannot be scripted due to an ExtensionsSettings policy."}
```

### Root Cause Analysis

**This is NOT a registry policy issue!**

The error message is misleading. Despite mentioning "ExtensionsSettings policy", this error occurs because Chrome has **built-in security restrictions** that prevent ANY extension from injecting scripts into certain protected pages.

### Pages Where Extensions Are Blocked (by Chrome design)

| URL Pattern | Description |
|------------|-------------|
| chrome:// | Chrome internal pages (settings, extensions, etc.) |
| chrome-extension:// | Other extension pages |
| edge:// | Edge internal pages |
| about: | About pages |
| view-source: | View source pages |
| chrome.google.com/webstore | Chrome Web Store |

### Registry Check Results

All Chrome policy registry locations were verified clean:

| Registry Path | Status |
|--------------|--------|
| HKLM\SOFTWARE\Policies\Google\Chrome | CLEAN |
| HKCU\SOFTWARE\Policies\Google\Chrome | CLEAN |
| HKLM\SOFTWARE\WOW6432Node\Policies\Google\Chrome | CLEAN |

### Solution Applied

The background.js was updated to:
1. Pre-check URLs before attempting script injection
2. Better error messages that correctly identify Chrome security restrictions
3. Graceful handling of restricted pages

### Testing

Will Work: Regular websites (https://example.com)
Will NOT Work: chrome:// pages, Chrome Web Store (by design)
