// Runs in <head> before the page is painted, so a saved theme
// is applied immediately and the page doesn't flash the wrong colours.
(() => {
  try {
    const saved = localStorage.getItem("portfolio.theme.v1");
    if (saved === "light" || saved === "dark") {
      document.documentElement.dataset.theme = saved;
    }
  } catch {
    // Storage unavailable: fall back to the system theme.
  }
})();
