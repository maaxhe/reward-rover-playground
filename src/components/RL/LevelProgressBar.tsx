import { LevelNumber, getLevelConfig } from "@/lib/levelProgression";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type LevelProgressBarProps = {
  currentLevel: LevelNumber;
  translate: (de: string, en: string) => string;
};

export function LevelProgressBar({ currentLevel, translate }: LevelProgressBarProps) {
  const config = getLevelConfig(currentLevel);
  const totalLevels = 10;
  const progress = (currentLevel / totalLevels) * 100;

  return (
    <Card className="border-0 bg-transparent p-0 shadow-none">
      {/* Level Header */}
      <p className="mb-3 text-sm text-foreground">{currentLevel <= 5 ? config.name : config.nameEn}</p>

      {/* Progress Bar */}
      <div className="w-full bg-background/60 rounded-full h-2 overflow-hidden mb-3">
        <div
          className="h-full bg-gradient-to-r from-primary/60 to-primary rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Level Description */}
      <p className="text-xs text-muted-foreground leading-relaxed">
        {config.description}
      </p>

      {/* Completion Status */}
      {currentLevel === 10 && (
        <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/30">
          <p className="text-xs font-semibold text-primary">
            {translate("Alle Level abgeschlossen!", "All levels completed!")}
          </p>
        </div>
      )}
    </Card>
  );
}
