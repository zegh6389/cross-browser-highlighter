# Web Highlighter - Testing Documentation

## Version: 1.0.1
## Last Updated: 2025-12-04

---

## Test Results Summary

| Component | Status | Notes |
|-----------|--------|-------|
| Local test page | ✅ PASS | Extension works on test-page.html |
| Chrome policies | ✅ CLEAN | No blocking policies found |
| Site access | ✅ OK | Set to "On all sites" |
| Anchor restoration | ✅ FIXED | DOMException now handled |
| perplexity.ai | ❌ FAIL | Site-specific issue (CSP?) |

---

## Bug Fixes Applied

### BUG-001: DOMException in anchoring.js (FIXED)

**Error**: `Error restoring anchor: [object DOMException]` at lib/anchoring.js:64

**Root Cause**: 
- `range.setStart()` and `range.setEnd()` throw DOMException when offset exceeds node length
- Page DOM changes after highlight was saved cause invalid offsets

**Fix Applied** (anchoring.js line 42-75):
```javascript
// Before: Direct offset use
range.setStart(startNode, anchor.startOffset);
range.setEnd(endNode, anchor.endOffset);

// After: Safe offset clamping
const startMaxOffset = startNode.nodeType === Node.TEXT_NODE ? 
    startNode.textContent.length : startNode.childNodes.length;
const endMaxOffset = endNode.nodeType === Node.TEXT_NODE ? 
    endNode.textContent.length : endNode.childNodes.length;

const safeStartOffset = Math.min(Math.max(0, anchor.startOffset || 0), startMaxOffset);
const safeEndOffset = Math.min(Math.max(0, anchor.endOffset || 0), endMaxOffset);

range.setStart(startNode, safeStartOffset);
range.setEnd(endNode, safeEndOffset);
```

**Validation**:
- ☐ Test on test-page.html with saved highlights
- ☐ Test with dynamically changed content
- ☐ Verify no DOMException in console

---

### BUG-002: Script Injection Failure on perplexity.ai (INVESTIGATING)

**Error**: `Cannot highlight on this page (Browser Restriction)`
**Secondary Error**: `Script injection failed: This page cannot be scripted due to an ExtensionsSettings policy`

**Investigation Results**:
1. ✅ Registry policies checked - ALL CLEAN
2. ✅ Chrome managed preferences - NOT FOUND
3. ✅ Site access - "On all sites" confirmed
4. ✅ Chrome version - 142.0.7444.177 (latest)
5. ✅ Extension works on test-page.html
6. ❌ Still fails on perplexity.ai

**Possible Causes**:
- Site's Content Security Policy (CSP) blocking scripts
- Chrome permission withholding for specific domains
- Site using Trusted Types API

**Next Steps**:
- Check Service Worker logs for detailed error
- Check perplexity.ai page for CSP headers
- Test on other sites (example.com, wikipedia.org)

---

## Registry/Policy Analysis

**Date**: 2025-12-04
**Chrome Version**: 142.0.7444.177

| Registry Path | Status | Details |
|---------------|--------|---------|
| HKLM\SOFTWARE\Policies\Google\Chrome | EMPTY | Key exists but no values |
| HKCU\SOFTWARE\Policies\Google\Chrome | NOT FOUND | No user policies |
| HKLM\SOFTWARE\Policies\Google\Chrome\ExtensionSettings | NOT FOUND | No extension policies |

**Conclusion**: No enterprise/group policies blocking the extension.

---

## Code Changes Made

### background.js

**Changes**:
1. Added `RESTRICTED_URL_PATTERNS` array for URL pre-checking
2. Added `isRestrictedUrl()` function
3. Added PING/PONG mechanism for content script detection
4. Added detailed logging in `sendMessageToTab()`
5. Added permission checking in `injectScripts()`
6. Added `=== SERVICE WORKER STARTED ===` log

**Backup**: background.js.bak

### content.js

**Changes**:
1. Added PING action handler that responds with PONG status

### lib/anchoring.js

**Changes**:
1. Added null check for anchor parameter
2. Added safe offset calculation
3. Improved error message logging

---

## Test Procedures

### Test 1: Basic Highlighting (Local Test Page)

1. Open `test-page.html` from extension folder
2. Select some text
3. Right-click and select "Highlight"
4. **Expected**: Text should be highlighted

### Test 2: Highlight Persistence

1. Create highlight on test-page.html
2. Close and reopen the tab
3. **Expected**: Highlight should be restored without errors

### Test 3: External Site (Wikipedia)

1. Open https://www.wikipedia.org
2. Navigate to an article
3. Select text and highlight
4. **Expected**: Highlight should work

### Test 4: Problematic Site (perplexity.ai)

1. Open https://www.perplexity.ai
2. Try to highlight text
3. Check Service Worker logs
4. **Expected**: Currently fails - need CSP investigation

---

## Service Worker Debug Output

To view detailed logs:

1. Go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "service worker" link for Web Highlighter
4. Look for these log patterns:

```
=== SERVICE WORKER STARTED ===
[sendMessageToTab] Starting for tab: XXX url: https://...
[sendMessageToTab] Tab info - id: XXX, url: https://...
[injectScripts] Starting injection for tab: XXX url: https://...
```

---

## Environment Information

- **OS**: Windows 11
- **Browser**: Chrome 142.0.7444.177
- **Extension Path**: C:\Users\Awais\Desktop\cross-browser-highlighter\
- **Manifest Version**: V3
