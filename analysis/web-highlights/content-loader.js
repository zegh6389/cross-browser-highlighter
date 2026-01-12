requestIdleCallback(() => {
  (async function () {
    try {
      await import(chrome.runtime.getURL('content.js'));
    } catch (error) {
      console.error('Failed to load content script:', error);
    }
  })();
});
