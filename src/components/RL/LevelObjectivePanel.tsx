import { useEffect, useState } from "react";
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
    <section
      data-tutorial="objective"
      className={cn("space-y-3 border-l-4 py-1 pl-4", status.solved ? "border-emerald-500" : "border-primary")}
    >
      <h3 className="font-semibold text-foreground">
        {translate(`Level ${level}: ${config.name}`, `Level ${level}: ${config.nameEn}`)}
        {status.solved && <span className="ml-2 text-sm font-medium text-emerald-500">{translate("gelöst", "solved")}</span>}
      </h3>
      <ul className="space-y-1.5">
        {status.requirements.map((req) => (
          <li key={req.id} className={cn("flex items-start gap-2 text-sm", req.done ? "text-muted-foreground line-through" : "text-foreground")}>
            <span aria-hidden className="mt-0.5 w-4 flex-shrink-0 text-center">{req.done ? "✓" : "○"}</span>
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
            <p className="text-sm leading-relaxed text-foreground/80">{translate(hint.de, hint.en)}</p>
          )}
        </div>
      )}
    </section>
  );
}
