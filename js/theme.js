/* Apply before paint; theme preference never touches investigation data. */
(() => {
  let theme;
  try {
    theme = localStorage.getItem("graphos.theme");
  } catch {
    /* private browsing */
  }
  document.documentElement.dataset.theme =
    theme === "light" || theme === "dark"
      ? theme
      : matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
  let motion;
  try {
    motion = localStorage.getItem("graphos.motion");
  } catch {
    /* private browsing */
  }
  document.documentElement.dataset.motion =
    motion === "full" || motion === "reduce"
      ? motion
      : matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "reduce"
        : "full";
})();
