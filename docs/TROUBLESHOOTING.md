# Web Highlighter - Troubleshooting Guide

## Error: "Script injection failed: This page cannot be scripted due to an ExtensionsSettings policy"

This error message is **misleading**. Despite mentioning "policy", this error typically occurs for one of these reasons:

### 1. Extension Site Access Not Granted

**Most Common Cause**: Chrome Manifest V3 extensions require explicit permission to run on sites.

**Solution**:
1. Go to `chrome://extensions/`
2. Find "Web Highlighter" and click "Details"
3. Under "Site access", ensure it says "On all sites"
4. If it says "On click" or "On specific sites", click and change to "On all sites"
5. On Comet or other Chromium-based browsers, the extensions page may be `comet://extensions` or `edge://extensions` (Chrome URLs usually redirect)
6. The extension now also requests site access automatically when you use the context menu; if you see the permission prompt, click "Allow" for the site you're on

### 2. Extension Needs Reload After Changes

**Solution**:
1. Go to `chrome://extensions/`
2. Click the refresh/reload button on "Web Highlighter"
3. Close ALL Chrome tabs and reopen them
4. Try highlighting again

### 3. Chrome Cache Issues

**Solution**:
1. Go to `chrome://extensions/`
2. Toggle the extension OFF
3. Wait 5 seconds
4. Toggle the extension ON
5. Refresh the target page (Ctrl+Shift+R for hard refresh)

### 4. Content Security Policy (CSP) on Target Site

Some websites (like perplexity.ai, banking sites, etc.) have strict Content-Security-Policy headers that may interfere with extension scripts.

**Solution**:
This is a limitation on certain sites. The extension should work on most sites, but some highly-secured sites may block content script injection.

### 5. Chrome Update Required

**Solution**:
1. Go to `chrome://settings/help`
2. Ensure Chrome is up to date
3. Restart Chrome

### 6. Extension Corruption

**Solution**:
1. Go to `chrome://extensions/`
2. Remove "Web Highlighter"
3. Re-add the extension by clicking "Load unpacked" and selecting the extension folder

---

## Error: "Error restoring anchor: [object DOMException]"

This error occurs when trying to restore saved highlights and the DOM structure has changed since the highlight was created.

### Root Cause:
- Stored XPath offsets may exceed current node text length
- Page content changed since highlight was saved
- Dynamic content loaded differently

### Solution (v1.0.1+):
This was fixed in version 1.0.1 with safe offset clamping:
- Offsets are now validated against actual node length
- Invalid offsets are clamped to valid bounds
- Graceful fallback if nodes cannot be found

If you still see this error, reload the extension from `chrome://extensions/`

---

## Debugging: Check Service Worker Logs

To see detailed extension logs:

1. Go to `chrome://extensions/`
2. Enable "Developer mode" (toggle at top-right)
3. Find "Web Highlighter" and click "service worker" link
4. This opens DevTools for the service worker
5. Look for logs starting with:
   - `=== SERVICE WORKER STARTED ===`
   - `[sendMessageToTab]`
   - `[injectScripts]`

---

## Verifying Extension Permissions

### Check via Chrome UI:
1. Right-click the extension icon in toolbar
2. Click "Manage extension"
3. Scroll to "Site access"
4. Ensure "On all sites" is selected

### Check via Console (Developer Tools):
1. Open Chrome DevTools (F12)
2. Go to Console tab
3. Type: `chrome.runtime.getManifest().host_permissions`
4. Should show: `["<all_urls>"]`

---

## Registry Policy Check (Windows)

If you suspect enterprise policies are blocking:

1. Open PowerShell as Administrator
2. Run: `reg query "HKLM\SOFTWARE\Policies\Google\Chrome" /s`
3. Run: `reg query "HKCU\SOFTWARE\Policies\Google\Chrome" /s`
4. If these return data, contact your IT administrator

---

## Known Site-Specific Issues

### Sites that may block extensions:
- **perplexity.ai** - Strict CSP may interfere
- **Banking sites** - High security restrictions
- **Chrome internal pages** (`chrome://`, `chrome-extension://`)
- **Chrome Web Store** pages
- **PDF viewer**

### Testing Extension Works:
1. Open `test-page.html` from extension folder
2. Try highlighting text on the test page
3. If it works there but not on other sites, the issue is site-specific

---

## Still Not Working?

If the extension works on some sites but not others:
- The issue is likely site-specific Content Security Policy
- Try the extension on a simple site like `example.com` to verify it works

If the extension doesn't work on ANY site:
1. Check chrome://extensions for any error indicators (red warning)
2. Click "Errors" button if visible to see specific error messages
3. Ensure "Developer mode" is enabled in chrome://extensions
4. Check Service Worker logs for specific error details
