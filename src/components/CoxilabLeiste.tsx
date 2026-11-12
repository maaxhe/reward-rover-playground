import { useLocation } from "react-router-dom";
import "./CoxilabLeiste.css";

// Schmale Leiste über jedem Rover-Bildschirm: Rückweg zu coxilab.de und Umsteigen zu den anderen Werkzeugen.
// Das Spiel darunter behält sein eigenes Aussehen. Die Farben sind die Linienfarben des coxilab-Liniennetzes.
const LINIEN = [
  { id: "d", name: "Dilemma", href: "https://dilemma.coxilab.de/", farbe: "#e88080" },
  { id: "p", name: "KI-Berufs-Puzzle", href: "https://jobs.coxilab.de/", farbe: "#9a86dc" },
  { id: "r", name: "Reward Rover", href: "https://rover.coxilab.de/", farbe: "#5cb68e" },
  { id: "h", name: "Handzeichen", href: "https://handzeichen.com/lehrkraefte", farbe: "#ee9a5a" },
];

export const CoxilabLeiste = () => {
  const { pathname } = useLocation();
  // Auf dem Beamer und im laufenden Klassenspiel braucht jeder den ganzen Bildschirm.
  if (pathname.startsWith("/klasse/beamer") || pathname.startsWith("/klasse/play")) return null;
  const en = typeof document !== "undefined" && document.documentElement.lang.startsWith("en");
  return (
    <nav className="cx-leiste" aria-label="coxilab">
      <a className="cx-zurueck" href="https://coxilab.de/">← coxilab</a>
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
    </nav>
  );
};
