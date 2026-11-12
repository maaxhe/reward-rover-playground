// Hell/Dunkel. Standard ist Hell. Die Wahl steht in localStorage ("rr-theme"), index.html setzt sie vor dem ersten Zeichnen.
export type Theme = "light" | "dark";
const KEY = "rr-theme";

export const currentTheme = (): Theme =>
  typeof document !== "undefined" && document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";

export const setTheme = (t: Theme) => {
  document.documentElement.setAttribute("data-theme", t);
  try {
    localStorage.setItem(KEY, t);
  } catch {
    /* ohne Speicher gilt die Wahl nur für diese Sitzung */
  }
};
