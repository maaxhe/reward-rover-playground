import { useRef } from "react";
import { Link } from "react-router-dom";
import { LEVEL_CONFIGS } from "@/lib/levelProgression";
import { useStrecke } from "@/hooks/useStrecke";
import "./LevelStrecke.css";

interface Props {
  translate: (de: string, en: string) => string;
}

/**
 * Die Level als Haltestellen an der grünen Linie. Mit JavaScript fährt eine kleine Bahn (der Rover) von oben ein,
 * hält an jeder Haltestelle und verschwindet unten (nicht bei "Bewegung reduzieren"). Ohne JavaScript: normale Liste.
 * Maße kommen aus LevelStrecke.css: --sx = Mitte der Linie, --sy = Höhe des Rings.
 */
export function LevelStrecke({ translate }: Props) {
  const ref = useRef<HTMLUListElement>(null);
  useStrecke(ref);
  const levels = Object.values(LEVEL_CONFIGS).sort((a, b) => a.level - b.level);

  return (
    <ul ref={ref} data-strecke className="level-strecke">
      {levels.map((l) => (
        <li key={l.level}>
          <Link className="halt" to="/spiel">
            <span className="halt-titel">
              {l.level}. {translate(l.name, l.nameEn)}
            </span>
            <span className="halt-text">{translate(l.description, l.descriptionEn)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
