/* Keep the theme button label focused on the action:
   light page => "Dark Mode", dark page => "Light Mode". */
(() => {
  const root = document.documentElement;

  function syncThemeButton() {
    const button = document.getElementById("themeToggle");
    if (!button) return;

    const isDark = root.dataset.theme === "dark";
    button.textContent = isDark ? "☀️ Light Mode" : "🌙 Dark Mode";
    button.setAttribute(
      "aria-label",
      isDark ? "Light Mode bekapcsolása" : "Dark Mode bekapcsolása"
    );
    button.setAttribute("title", isDark ? "Light Mode" : "Dark Mode");
  }

  syncThemeButton();

  const observer = new MutationObserver((mutations) => {
    if (mutations.some((item) => item.attributeName === "data-theme")) {
      syncThemeButton();
    }
  });

  observer.observe(root, {
    attributes: true,
    attributeFilter: ["data-theme"]
  });
})();
