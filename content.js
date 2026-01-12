/**
 * Main Content Script
 * Handles interaction, highlighting, and storage.
 */

const STORAGE_KEY_PREFIX = "highlights:";
const appliedHighlightIds = new Set();

if (window.hasHighlighter) {
    if (typeof Logger !== 'undefined') {
        Logger.info("Content Script already loaded, skipping init", { url: window.location.href });
    }
    // Script already loaded, stop execution
    // However, in a module/script context, we can't easily "return" from top level unless inside a function.
    // But we can wrap the init logic in a check.
} else {
    window.hasHighlighter = true;

    if (typeof Logger !== 'undefined') {
        Logger.info("Content Script Loaded", { url: window.location.href });
    }

    initializeHighlighter();
}

function initializeHighlighter() {
// --- Core Highlighting Logic ---

/**
 * Wraps a Range in a <mark> element.
 * @param {Range} range 
 * @param {string} color 
 * @param {string} id 
 * @param {object} opts - Optional { note, noteColor }
 */
function wrapRange(range, color, id, opts = {}) {
  const mark = document.createElement("mark");
  mark.className = `web-highlighter-mark color-${color}`;
  mark.dataset.highlightId = id;
  
  if (opts.note) {
    mark.dataset.note = opts.note;
    mark.dataset.noteColor = opts.noteColor || 'yellow';
  }

  mark.addEventListener("click", (e) => {
    e.stopPropagation();
    e.preventDefault();
    showNoteEditor(id, e.clientX, e.clientY + window.scrollY);
  });

  mark.addEventListener("mouseenter", (e) => {
    const note = mark.dataset.note;
    if (note) {
      showNoteTooltip(note, mark.dataset.noteColor || 'yellow', e.clientX, e.clientY + window.scrollY);
    }
  });

  mark.addEventListener("mouseleave", () => {
    hideNoteTooltip();
  });
  
  // extractContents removes the content, we want to surround it.
  // surroundContents is strict (fails if range splits non-text nodes).
  // A safer way is to use a TreeWalker or extract + append, but surroundContents works for simple text selections.
  
  try {
    mark.appendChild(range.extractContents());
    range.insertNode(mark);
  } catch (e) {
    Logger.warn("Complex range highlighting failed", { error: e.message });
  }
}

/**
 * Creates a highlight from the current selection.
 * @param {string} color 
 */
async function highlightSelection(color) {
  const selection = window.getSelection();
  
  if (!selection.rangeCount) {
      Logger.warn("No selection range found");
      return;
  }

  const range = selection.getRangeAt(0);
  
  if (range.collapsed) {
      Logger.warn("Selection is collapsed (empty)");
      return;
  }

  Logger.info("Creating anchor for selection");
  const anchor = Anchoring.createAnchor(range);
  const id = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : 'id-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);

  // 1. Apply visual highlight
  wrapRange(range, color, id);
  selection.removeAllRanges();

  // 2. Persist
  await saveHighlight(window.location.href, {
    id,
    color,
    anchor,
    createdAt: Date.now()
  });
}

/**
 * Applies a saved highlight to the DOM.
 * @param {Object} highlight 
 */
function applyHighlight(highlight) {
  if (!highlight || !highlight.id) return;
  if (appliedHighlightIds.has(highlight.id)) {
    return; // Already applied earlier (avoids duplicate marks)
  }

  const range = Anchoring.restoreAnchor(highlight.anchor);
  if (range) {
    wrapRange(range, highlight.color, highlight.id, {
      note: highlight.note,
      noteColor: highlight.noteColor
    });
    appliedHighlightIds.add(highlight.id);
  } else {
    Logger.warn("Could not restore highlight", { id: highlight.id });
  }
}

// --- Storage Logic ---

async function getHighlights(url) {
  const normalizedUrl = Utils.normalizeUrl(url);
  const key = STORAGE_KEY_PREFIX + normalizedUrl;
  const result = await chrome.storage.local.get(key);
  return result[key] || [];
}

async function saveHighlight(url, highlightData) {
  const normalizedUrl = Utils.normalizeUrl(url);
  const highlights = await getHighlights(normalizedUrl);
  highlights.push(highlightData);
  
  const key = STORAGE_KEY_PREFIX + normalizedUrl;
  try {
    await chrome.storage.local.set({ [key]: highlights });
  } catch (e) {
    Logger.error("Failed to save highlight (Quota exceeded?)", { error: e.message });
    alert("Storage full! Could not save highlight.");
  }
}

async function updateHighlight(id, updates) {
  try {
      const url = Utils.normalizeUrl(window.location.href);
      const highlights = await getHighlights(url);
      const index = highlights.findIndex(h => h.id === id);
      
      if (index !== -1) {
        highlights[index] = { ...highlights[index], ...updates };
        const key = STORAGE_KEY_PREFIX + url;
        await chrome.storage.local.set({ [key]: highlights });
        
        // Update DOM
        const mark = document.querySelector(`mark[data-highlight-id="${id}"]`);
        if (mark) {
          if (updates.note !== undefined) mark.dataset.note = updates.note;
          if (updates.noteColor) mark.dataset.noteColor = updates.noteColor;
        }
      } else {
          console.warn("Highlight ID not found in storage:", id);
          throw new Error("Highlight not found in storage. Please refresh the page.");
      }
  } catch (e) {
      console.error("updateHighlight failed:", e);
      throw e;
  }
}

// --- Note UI Logic ---

let currentEditor = null;
let currentTooltip = null;

function showNoteEditor(id, x, y) {
  if (currentEditor && currentEditor.parentNode) {
    document.body.removeChild(currentEditor);
    currentEditor = null;
  }

  const mark = document.querySelector(`mark[data-highlight-id="${id}"]`);
  const existingNote = mark.dataset.note || "";
  const existingColor = mark.dataset.noteColor || "yellow";

  const editor = document.createElement("div");
  editor.className = "web-highlighter-note-editor";
  editor.style.left = x + "px";
  editor.style.top = (y + 10) + "px"; // Offset slightly

  // Colors
  const colors = ["yellow", "green", "blue", "pink"];
  let selectedColor = existingColor;

  const colorContainer = document.createElement("div");
  colorContainer.className = "web-highlighter-note-colors";
  
  colors.forEach(c => {
    const swatch = document.createElement("div");
    swatch.className = `web-highlighter-color-swatch note-color-${c} ${c === selectedColor ? 'selected' : ''}`;
    swatch.onclick = () => {
        selectedColor = c;
        editor.querySelectorAll('.web-highlighter-color-swatch').forEach(s => s.classList.remove('selected'));
        swatch.classList.add('selected');
    };
    colorContainer.appendChild(swatch);
  });

  const textarea = document.createElement("textarea");
  textarea.value = existingNote;
  textarea.placeholder = "Add a note...";

  const btnContainer = document.createElement("div");
  btnContainer.className = "web-highlighter-note-buttons";

  const saveBtn = document.createElement("button");
  saveBtn.className = "web-highlighter-btn web-highlighter-btn-save";
  saveBtn.textContent = "Save";
  
  saveBtn.onclick = async (e) => {
    e.stopPropagation();
    const text = textarea.value.trim();
    try {
        if (text) {
            await updateHighlight(id, { note: text, noteColor: selectedColor });
        } else {
            delete mark.dataset.note;
            delete mark.dataset.noteColor;
            await updateHighlight(id, { note: "", noteColor: selectedColor }); 
        }
        
        if (editor.parentNode) {
            document.body.removeChild(editor);
        }
        currentEditor = null;
        document.removeEventListener('click', closeHandler);
    } catch (err) {
        alert("Error saving note: " + err.message);
    }
  };

  const cancelBtn = document.createElement("button");
  cancelBtn.className = "web-highlighter-btn web-highlighter-btn-cancel";
  cancelBtn.textContent = "Cancel";
  cancelBtn.onclick = (e) => {
    e.stopPropagation();
    if (editor.parentNode) {
        document.body.removeChild(editor);
    }
    currentEditor = null;
    document.removeEventListener('click', closeHandler);
  };

  btnContainer.appendChild(cancelBtn);
  btnContainer.appendChild(saveBtn);

  editor.appendChild(textarea);
  editor.appendChild(colorContainer);
  editor.appendChild(btnContainer);

  document.body.appendChild(editor);
  currentEditor = editor;
  
  // Close on click outside
  const closeHandler = (e) => {
      if (currentEditor && !currentEditor.contains(e.target) && e.target !== mark) {
          document.body.removeChild(currentEditor);
          currentEditor = null;
          document.removeEventListener('click', closeHandler);
      }
  };
  // Timeout to avoid immediate trigger from the click that opened it
  setTimeout(() => document.addEventListener('click', closeHandler), 0);
}

function showNoteTooltip(text, color, x, y) {
  if (currentTooltip) {
      document.body.removeChild(currentTooltip);
  }
  
  const tooltip = document.createElement("div");
  tooltip.className = `web-highlighter-note-tooltip note-color-${color}`;
  tooltip.textContent = text;
  tooltip.style.left = x + "px";
  tooltip.style.top = (y + 20) + "px";
  
  document.body.appendChild(tooltip);
  currentTooltip = tooltip;
}

function hideNoteTooltip() {
  if (currentTooltip) {
      document.body.removeChild(currentTooltip);
      currentTooltip = null;
  }
}

async function loadAndApplyHighlights() {
  syncAppliedHighlightIdsFromDom();
  const highlights = await getHighlights(window.location.href);
  for (const h of highlights) {
    applyHighlight(h);
  }
}

function removeHighlightFromDom(id) {
  if (!id) return;
  document.querySelectorAll(`mark.web-highlighter-mark[data-highlight-id="${id}"]`).forEach(mark => {
    const parent = mark.parentNode;
    if (!parent) return;
    while (mark.firstChild) {
      parent.insertBefore(mark.firstChild, mark);
    }
    parent.removeChild(mark);
  });
  appliedHighlightIds.delete(id);
}

function syncAppliedHighlightIdsFromDom() {
  appliedHighlightIds.clear();
  document.querySelectorAll("mark.web-highlighter-mark[data-highlight-id]").forEach(mark => {
    const id = mark.dataset.highlightId;
    if (id) {
      appliedHighlightIds.add(id);
    }
  });
}

async function undoLastHighlight() {
  const url = Utils.normalizeUrl(window.location.href);
  const key = STORAGE_KEY_PREFIX + url;
  const result = await chrome.storage.local.get(key);
  const highlights = result[key] || [];
  if (!highlights.length) {
    Logger.info("No highlights to undo");
    return;
  }

  const last = highlights.pop();
  await chrome.storage.local.set({ [key]: highlights });
  removeHighlightFromDom(last.id);
  Logger.info("Undo last highlight", { id: last.id });
}

// --- Event Listeners ---

// Listen for messages from background script (Context Menu)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle PING to check if content script is loaded
  if (message.action === "PING") {
    sendResponse({ status: "PONG" });
    return true;
  }
  
  if (message.action === "HIGHLIGHT_SELECTION") {
    Logger.info("Received highlight command", { color: message.color });
    
    // Send immediate acknowledgement
    sendResponse({status: "processing"});

    highlightSelection(message.color).then(() => {
        Logger.info("Highlight applied successfully");
    }).catch(err => {
      Logger.error("Highlighting failed", { error: err.message, stack: err.stack });
    });
  }
  
  return true; // Keep message channel open for async response
});

// Initial load
loadAndApplyHighlights();

// --- Dynamic Content Handling (Simple Mutation Observer) ---
// Debounce logic to avoid performance hits
let timeout;
const observer = new MutationObserver((mutations) => {
  clearTimeout(timeout);
  timeout = setTimeout(() => {
     // Re-apply highlights that might have been lost or for new content
     // Note: A smarter diffing strategy would be better, but re-running load is a safe baseline
     loadAndApplyHighlights(); 
  }, 1000);
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

// --- Keyboard Shortcuts ---
// Alt + A -> yellow highlight, Alt + S -> green highlight, Ctrl+Z -> undo last highlight.

function isEditableTarget(target) {
  if (!target) return false;
  const tag = target.tagName;
  if (!tag) return false;
  const editableTags = ["INPUT", "TEXTAREA", "SELECT", "OPTION"];
  if (editableTags.includes(tag)) return true;
  if (target.isContentEditable) return true;
  return false;
}

window.addEventListener("keydown", (e) => {
  if (isEditableTarget(e.target)) return;

  const isUndoShortcut = (e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "z";
  if (isUndoShortcut) {
    e.preventDefault();
    undoLastHighlight();
    return;
  }

  if (e.altKey && !e.ctrlKey && !e.metaKey) {
    const key = e.key.toLowerCase();
    if (key === "q") {
      e.preventDefault();
      highlightSelection("yellow");
    } else if (key === "w") {
      e.preventDefault();
      highlightSelection("green");
    }
  }
});
} // End of initializeHighlighter
