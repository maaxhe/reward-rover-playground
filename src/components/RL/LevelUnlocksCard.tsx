import { LevelNumber, getUnlockedFeatures } from "@/lib/levelProgression";
import { Card } from "@/components/ui/card";
import { Check, Lock } from "lucide-react";

type LevelUnlocksCardProps = {
  currentLevel: LevelNumber;
  translate: (de: string, en: string) => string;
};

const FEATURE_LABELS = {
  de: {
    canPlaceWalls: "Mauern platzieren",
    canPlaceRewards: "Belohnungen platzieren",
    canPlacePunishments: "Strafen platzieren",
    canPlacePortals: "Portale nutzen",
    canChangeGridSize: "Gittergröße ändern",
    canAdjustAlpha: "Lernrate (α)",
    canAdjustGamma: "Diskontfaktor (γ)",
  },
  en: {
    canPlaceWalls: "Place walls",
    canPlaceRewards: "Place rewards",
    canPlacePunishments: "Place penalties",
    canPlacePortals: "Use portals",
    canChangeGridSize: "Change grid size",
    canAdjustAlpha: "Learning rate (α)",
    canAdjustGamma: "Discount factor (γ)",
  },
};

export function LevelUnlocksCard({ currentLevel, translate }: LevelUnlocksCardProps) {
  const unlocked = getUnlockedFeatures(currentLevel);
  const isEnglish = translate("test", "test") === "test";
  const labels = isEnglish ? FEATURE_LABELS.en : FEATURE_LABELS.de;

  const features: Array<[keyof typeof unlocked, string]> = [
    ["canAdjustAlpha", labels.canAdjustAlpha],
    ["canAdjustGamma", labels.canAdjustGamma],
    ["canPlaceRewards", labels.canPlaceRewards],
    ["canPlacePunishments", labels.canPlacePunishments],
    ["canPlaceWalls", labels.canPlaceWalls],
    ["canChangeGridSize", labels.canChangeGridSize],
    ["canPlacePortals", labels.canPlacePortals],
  ];

  return (
    <Card className="p-5 bg-card/60 border-border/40 rounded-lg">
      <h3 className="text-sm font-semibold mb-4 uppercase tracking-wide text-foreground">
        {translate("Freigeschaltet", "Unlocked")}
      </h3>

      <div className="space-y-2">
        {features.map(([key, label]) => {
          const isUnlocked = unlocked[key];
          return (
            <div
              key={key}
              className={`flex items-center gap-3 text-xs py-2 px-2 rounded ${
                isUnlocked
                  ? "bg-primary/10 text-foreground"
                  : "bg-background/40 text-muted-foreground"
              }`}
            >
              {isUnlocked ? (
                <Check className="h-4 w-4 text-primary flex-shrink-0" />
              ) : (
                <Lock className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />
              )}
              <span className={isUnlocked ? "font-medium" : "opacity-60"}>
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
