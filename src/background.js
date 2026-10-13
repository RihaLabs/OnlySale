// OnlySale – background script
// Its only job: when the toolbar button is clicked, tell the page to open/close the overlay.

const api = globalThis.browser || globalThis.chrome;

api.action.onClicked.addListener((tab) => {
  // If the page is not a supported site, there is no listener and this fails quietly.
  api.tabs.sendMessage(tab.id, { type: "onlysale-toggle" }).catch(() => {});
});
