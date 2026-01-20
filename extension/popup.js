const STORAGE_KEY_PREFIX = "highlights:";

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function loadHighlights() {
  const tab = await getActiveTab();
  if (!tab.url) return;

  const normalizedUrl = Utils.normalizeUrl(tab.url);
  const key = STORAGE_KEY_PREFIX + normalizedUrl;
  const result = await chrome.storage.local.get(key);
  const highlights = result[key] || [];
  
  renderHighlights(highlights);
}

function renderHighlights(highlights) {
  const container = document.getElementById("highlights-list");
  container.innerHTML = "";

  if (highlights.length === 0) {
    container.innerHTML = '<div class="empty-state">No highlights on this page.</div>';
    return;
  }

  highlights.forEach(h => {
    const el = document.createElement("div");
    el.className = `highlight-item color-${h.color}`;
    el.innerHTML = `
      <div class="highlight-text" title="${h.anchor.text}">${h.anchor.text}</div>
      <button class="delete-btn" data-id="${h.id}">&times;</button>
    `;
    container.appendChild(el);
  });

  // Add listeners
  document.querySelectorAll(".delete-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      deleteHighlight(e.target.dataset.id);
    });
  });
}

async function deleteHighlight(id) {
  const tab = await getActiveTab();
  const normalizedUrl = Utils.normalizeUrl(tab.url);
  const key = STORAGE_KEY_PREFIX + normalizedUrl;
  
  const result = await chrome.storage.local.get(key);
  let highlights = result[key] || [];
  
  highlights = highlights.filter(h => h.id !== id);
  
  await chrome.storage.local.set({ [key]: highlights });
  loadHighlights(); // Refresh UI
  
  // Notify content script to remove it (optional enhancement)
  // chrome.tabs.sendMessage(tab.id, { action: "REMOVE_HIGHLIGHT", id });
}

async function clearAll() {
  const tab = await getActiveTab();
  const key = STORAGE_KEY_PREFIX + tab.url;
  
  await chrome.storage.local.remove(key);
  loadHighlights();
}

// --- Logs Logic ---
const LOGS_KEY = "debug_logs";

async function loadLogs() {
  const result = await chrome.storage.local.get(LOGS_KEY);
  const logs = result[LOGS_KEY] || [];
  renderLogs(logs);
}

function renderLogs(logs) {
  const container = document.getElementById("logs-list");
  container.innerHTML = "";

  if (logs.length === 0) {
    container.innerHTML = '<div class="empty-state">No logs recorded.</div>';
    return;
  }

  logs.forEach(log => {
    const el = document.createElement("div");
    el.className = `log-item ${log.level}`;
    const time = new Date(log.timestamp).toLocaleTimeString();
    el.innerHTML = `
      <div class="log-meta">[${time}] [${log.context}] ${log.level}</div>
      <div class="log-msg">${log.message}</div>
      ${log.details ? `<div class="log-details" style="white-space:pre-wrap;margin-top:4px;color:#555;">${log.details}</div>` : ''}
    `;
    container.appendChild(el);
  });
}

async function clearLogs() {
  await chrome.storage.local.remove(LOGS_KEY);
  loadLogs();
}

// --- Tabs Logic ---
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    // UI toggle
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
    
    btn.classList.add("active");
    const target = btn.dataset.tab;
    document.getElementById(`tab-${target}`).classList.add("active");

    // Load data
    if (target === "highlights") loadHighlights();
    if (target === "logs") loadLogs();
  });
});

document.getElementById("clear-all").addEventListener("click", clearAll);
document.getElementById("clear-logs").addEventListener("click", clearLogs);

// Init
loadHighlights();
