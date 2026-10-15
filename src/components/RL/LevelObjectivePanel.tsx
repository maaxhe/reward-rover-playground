import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getLevelConfig } from "@/lib/levelProgression";
import { LEVEL_OBJECTIVES, type ObjectiveStatus } from "@/lib/levelObjectives";
import type { LevelNumber } from "@/lib/levelProgression";
import { cn } from "@/lib/utils";

interface Props {
  level: LevelNumber;
  status: ObjectiveStatus;
  translate: (de: string, en: string) => string;
  /** Number of finished episodes; used to notice when the player makes no progress. */
  episodes: number;
  /** Replays the step-by-step help popups of this level (null when the level has none). */
  onShowHelp: (() => void) | null;
}

/** After this long without a new finished episode the tip button starts nudging. */
const STUCK_AFTER_MS = 60_000;

export function LevelObjectivePanel({ level, status, translate, episodes, onShowHelp }: Props) {
  const config = getLevelConfig(level);
  const hint = LEVEL_OBJECTIVES[level].hint;
  const [hintOpen, setHintOpen] = useState(false);
  const [stuck, setStuck] = useState(false);

  // The tip stays tucked away until needed; a new level starts fresh.
  useEffect(() => {
    setHintOpen(false);
    setStuck(false);
  }, [level]);

  // Stuck = unsolved and no new episode for a minute. Any progress resets the timer.
  useEffect(() => {
    setStuck(false);
    if (status.solved) return;
    const id = window.setTimeout(() => setStuck(true), STUCK_AFTER_MS);
    return () => window.clearTimeout(id);
  }, [level, episodes, status.solved]);

  return (
    <Card
      data-tutorial="objective"
      className={cn(
        "space-y-3 border-2 p-4 shadow-md",
        status.solved
          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/15"
          : "border-amber-400 bg-amber-50 dark:border-amber-500/70 dark:bg-amber-500/10",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-bold text-amber-900 dark:text-amber-300">
          {translate(`Aufgabe für Level ${level}`, `Task for level ${level}`)}
          <span className="ml-2 text-sm font-medium text-foreground/70">
            {translate(config.name, config.nameEn)}
          </span>
        </h3>
        {status.solved && (
          <span className="rounded-full bg-emerald-600 px-3 py-0.5 text-sm font-bold text-white">
            {translate("Geschafft!", "Solved!")}
          </span>
        )}
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {status.requirements.map((req) => (
          <li
            key={req.id}
            className={cn(
              "flex items-start gap-3 rounded-lg border-2 px-3 py-2.5 text-sm font-medium shadow-sm transition-colors",
              req.done
                ? "border-emerald-500 bg-emerald-100 text-emerald-950 dark:bg-emerald-500/20 dark:text-emerald-50"
                : "border-amber-400 bg-amber-100 text-amber-950 dark:border-amber-500/60 dark:bg-amber-500/15 dark:text-amber-50",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold",
                req.done ? "border-emerald-600 bg-emerald-600 text-white" : "border-amber-500",
              )}
            >
              {req.done ? "✓" : ""}
            </span>
            <span>{translate(req.de, req.en)}</span>
          </li>
        ))}
      </ul>
      {!status.solved && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={stuck && !hintOpen ? "default" : "outline"}
              className={cn(stuck && !hintOpen && "animate-pulse")}
              onClick={() => setHintOpen((open) => !open)}
              aria-expanded={hintOpen}
            >
              {hintOpen
                ? translate("Tipp verbergen", "Hide tip")
                : stuck
                  ? translate("Komme nicht weiter? Tipp", "Stuck? Get a tip")
                  : translate("Tipp", "Tip")}
            </Button>
            {onShowHelp && (
              <Button type="button" size="sm" variant="outline" onClick={onShowHelp}>
                {translate("Schritt für Schritt erklären", "Walk me through it")}
              </Button>
            )}
          </div>
          {hintOpen && (
            <p className="text-sm leading-relaxed text-amber-900 dark:text-amber-100">{translate(hint.de, hint.en)}</p>
          )}
        </div>
      )}
    </Card>
  );
}
