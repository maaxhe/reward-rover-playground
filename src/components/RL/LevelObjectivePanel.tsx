import { Card } from "@/components/ui/card";
import { getLevelConfig } from "@/lib/levelProgression";
import { LEVEL_OBJECTIVES, type ObjectiveStatus } from "@/lib/levelObjectives";
import type { LevelNumber } from "@/lib/levelProgression";
import { cn } from "@/lib/utils";

interface Props {
  level: LevelNumber;
  status: ObjectiveStatus;
  translate: (de: string, en: string) => string;
}

export function LevelObjectivePanel({ level, status, translate }: Props) {
  const config = getLevelConfig(level);
  const hint = LEVEL_OBJECTIVES[level].hint;

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
      <p className="text-xs leading-relaxed text-amber-900/80 dark:text-amber-100/80">💡 {translate(hint.de, hint.en)}</p>
    </Card>
  );
}
