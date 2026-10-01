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
    <Card className="p-4 border-border/40 bg-card/60 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold">
          {translate(`Aufgabe für Level ${level}`, `Task for level ${level}`)}
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            {translate(config.name, config.nameEn)}
          </span>
        </h3>
        {status.solved && (
          <span className="text-sm font-semibold text-primary">
            {translate("Geschafft!", "Solved!")}
          </span>
        )}
      </div>
      <ul className="space-y-1.5">
        {status.requirements.map((req) => (
          <li key={req.id} className="flex items-start gap-2 text-sm">
            <span
              aria-hidden
              className={cn(
                "mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border text-[10px]",
                req.done ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/50",
              )}
            >
              {req.done ? "✓" : ""}
            </span>
            <span className={cn(req.done && "text-muted-foreground line-through")}>
              {translate(req.de, req.en)}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground leading-relaxed">{translate(hint.de, hint.en)}</p>
    </Card>
  );
}
