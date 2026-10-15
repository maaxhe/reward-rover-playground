import type { EpisodeStats } from "@/lib/rl/types";

interface Props {
  history: EpisodeStats[];
  /** Fewest steps from start to goal on the current board, Infinity when blocked. */
  shortest: number;
  translate: (de: string, en: string) => string;
}

/** One line from the rover about its last run, so results read like someone talking instead of a status bar. */
export function RoverSays({ history, shortest, translate: t }: Props) {
  const last = history[history.length - 1];
  const pick = (options: Array<[string, string]>) => {
    const [de, en] = options[(last?.episode ?? 0) % options.length];
    return t(de, en);
  };

  let line: string;
  if (!last) {
    line = t("Ich kenne das Feld noch nicht. Drück Start.", "I don't know this board yet. Hit Start.");
  } else if (!last.success) {
    line = pick([
      ["Sackgasse. Das mach ich nicht nochmal.", "Dead end. Not doing that again."],
      ["Hm, hier war ich schon mal. Ohne Erfolg.", "Hm, I've been here before. No luck."],
      ["Das war nichts. Nächster Versuch.", "That wasn't it. Next try."],
    ]);
  } else if (history.filter((h) => h.success).length === 1) {
    line = t("Da war das Ziel! Den Weg merke ich mir.", "There was the goal! I'll remember the way.");
  } else if (Number.isFinite(shortest) && last.steps <= Math.ceil(shortest * 1.15)) {
    line = t(`${last.steps} Schritte. Viel kürzer geht es kaum.`, `${last.steps} steps. It barely gets shorter.`);
  } else if (Number.isFinite(shortest)) {
    line = t(
      `Angekommen, aber mit ${last.steps} Schritten. Es geht mit ${shortest}.`,
      `Made it, but in ${last.steps} steps. It can be done in ${shortest}.`,
    );
  } else {
    line = t(`Angekommen nach ${last.steps} Schritten.`, `Made it after ${last.steps} steps.`);
  }

  return (
    <p className="max-w-xs border-l-2 border-primary pl-3 text-sm italic text-foreground/80" aria-live="polite">
      {line}
    </p>
  );
}
