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
      className={cn(
        "space-y-3 border-2 p-4 shadow-md",
        status.solved ? "border-primary bg-primary/15" : "border-primary/60 bg-primary/10",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-bold text-primary">
          {translate(`Aufgabe für Level ${level}`, `Task for level ${level}`)}
          <span className="ml-2 text-sm font-medium text-foreground/70">
            {translate(config.name, config.nameEn)}
          </span>
        </h3>
        {status.solved && (
          <span className="rounded-full bg-primary px-3 py-0.5 text-sm font-bold text-primary-foreground">
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
                ? "border-primary bg-primary/20 text-foreground"
                : "border-primary/40 bg-background text-foreground",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold",
                req.done ? "border-primary bg-primary text-primary-foreground" : "border-primary/60",
              )}
            >
              {req.done ? "✓" : ""}
            </span>
            <span>{translate(req.de, req.en)}</span>
          </li>
        ))}
      </ul>
      <p className="text-xs leading-relaxed text-foreground/70">💡 {translate(hint.de, hint.en)}</p>
    </Card>
  );
}
