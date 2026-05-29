// Visible-at-startup log: if you don't see this in the SW DevTools console,
// the SW didn't load. (Open chrome://extensions → "service worker" link on
// the Interview Copilot card to see SW logs.)
console.log('[bg] service worker loaded');

// CRITICAL: Chrome remembers setPanelBehavior across SW restarts and even
// extension reloads. An earlier version of this extension called
// setPanelBehavior({ openPanelOnActionClick: true }) which makes Chrome
// auto-open the side panel on icon click — silently, *without* firing
// chrome.action.onClicked. That suppresses the activeTab grant that
// chrome.tabCapture requires. We explicitly reset to false so onClicked fires
// and activeTab is granted on every icon click.
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: false })
  .then(() => console.log('[bg] setPanelBehavior reset to openPanelOnActionClick=false'))
  .catch((err) => console.error('[bg] setPanelBehavior reset failed', err));

// Open the side panel explicitly on every action-icon click. This is the path
// that grants activeTab on the click-time tab.
//
// IMPORTANT: chrome.sidePanel.open() must be called synchronously in the
// listener — any `await` before it consumes the user-gesture context and the
// call fails with "sidePanel.open() may only be called in response to a user
// gesture." So we keep the listener non-async and fire-and-forget both calls,
// handling errors via .catch().
chrome.action.onClicked.addListener((tab) => {
  console.log('[bg] action.onClicked', {
    tabId: tab.id,
    url: tab.url,
    windowId: tab.windowId,
  });
  if (typeof tab.id !== 'number') return;

  // Open the panel first, synchronously, to keep the gesture context alive.
  chrome.sidePanel
    .open({ tabId: tab.id })
    .catch((err) => console.error('[bg] sidePanel.open failed', err));

  // Storage write can happen after; not gesture-sensitive.
  chrome.storage.session
    .set({
      lastInvokedTab: {
        id: tab.id,
        url: tab.url ?? null,
        windowId: tab.windowId ?? null,
        at: Date.now(),
      },
    })
    .catch((err) => console.error('[bg] storage.session.set failed', err));
});
