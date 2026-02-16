window.TaktykiModule = {
  init: async () => {
    await window.TaktykiUI.init();
    if (window.TaktykiLive) {
      await window.TaktykiLive.init();
    }
  },
  highlightPin: (pinId) => window.TaktykiSidebar.highlightPin(pinId),
  unhighlightPin: (pinId) => window.TaktykiSidebar.unhighlightPin(pinId),
  centerOnPin: (pinId) => window.TaktykiSidebar.centerOnPin(pinId),
};

document.addEventListener("DOMContentLoaded", () => {
  window.TaktykiModule.init();
});
