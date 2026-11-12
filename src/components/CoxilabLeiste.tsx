import { useState } from "react";
import { useLocation } from "react-router-dom";
import { currentTheme, setTheme, type Theme } from "@/lib/theme";
import "./CoxilabLeiste.css";

// Schmale Leiste über jedem Rover-Bildschirm: Rückweg zu coxilab.de, Umsteigen zu den anderen Werkzeugen
// und der Schalter für Hell und Dunkel. Die Farben der Pillen sind die Linienfarben des coxilab-Liniennetzes.
const LINIEN = [
  { id: "d", name: "Dilemma", href: "https://dilemma.coxilab.de/", farbe: "#e88080" },
  { id: "p", name: "KI-Berufs-Puzzle", href: "https://jobs.coxilab.de/", farbe: "#9a86dc" },
  { id: "r", name: "Reward Rover", href: "https://rover.coxilab.de/", farbe: "#5cb68e" },
  { id: "h", name: "Handzeichen", href: "https://handzeichen.com/lehrkraefte", farbe: "#ee9a5a" },
];

const Sonne = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);
const Mond = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" />
  </svg>
);

export const CoxilabLeiste = () => {
  const { pathname } = useLocation();
  const [theme, setT] = useState<Theme>(currentTheme());
  // Auf dem Beamer und im laufenden Klassenspiel braucht jeder den ganzen Bildschirm.
  if (pathname.startsWith("/klasse/beamer") || pathname.startsWith("/klasse/play")) return null;
  const en = typeof document !== "undefined" && document.documentElement.lang.startsWith("en");
  const wahl = (t: Theme) => {
    setTheme(t);
    setT(t);
  };
  return (
    <nav className="cx-leiste" aria-label="coxilab">
      <a className="cx-zurueck" href="https://coxilab.de/">coxilab</a>
      <span className="cx-info">{en ? "Switch to:" : "Umsteigen:"}</span>
      <ul>
        {LINIEN.map((l) => (
          <li key={l.id}>
            <a href={l.href} aria-current={l.id === "r" ? "page" : undefined} style={{ ["--lf" as string]: l.farbe }}>
              <i aria-hidden="true">{l.id.toUpperCase()}</i>
              <span>{l.name}</span>
            </a>
          </li>
        ))}
      </ul>
      <div className="cx-theme" role="group" aria-label={en ? "Colour scheme" : "Farbschema"}>
        <button type="button" aria-pressed={theme === "light"} onClick={() => wahl("light")} title={en ? "Light" : "Hell"}>
          <Sonne /><span>{en ? "Light" : "Hell"}</span>
        </button>
        <button type="button" aria-pressed={theme === "dark"} onClick={() => wahl("dark")} title={en ? "Dark" : "Dunkel"}>
          <Mond /><span>{en ? "Dark" : "Dunkel"}</span>
        </button>
      </div>
    </nav>
  );
};
