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
    <Card className="p-5 bg-card/60 border-border/40 rounded-lg">
      {/* Level Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            {translate("Level", "Level")} {currentLevel} / {totalLevels}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            {currentLevel <= 5 ? config.name : config.nameEn}
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-primary">{progress.toFixed(0)}%</div>
          <p className="text-xs text-muted-foreground">
            {translate("Fortschritt", "Progress")}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-background/60 rounded-full h-3 overflow-hidden border border-border/40 mb-4">
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
            🎉 {translate("Alle Level abgeschlossen!", "All levels completed!")}
          </p>
        </div>
      )}
    </Card>
  );
}
