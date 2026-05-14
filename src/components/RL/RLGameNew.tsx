import { useState, useCallback, useEffect } from "react";
import { RLGame } from "./RLGame";
import { ParametersPanel } from "./ParametersPanel";
import { LevelProgressBar } from "./LevelProgressBar";
import { LevelUnlocksCard } from "./LevelUnlocksCard";
import { useLanguage } from "@/contexts/LanguageContext";
import { LevelProvider } from "@/contexts/LevelContext";
import { Button } from "@/components/ui/button";
import { getUnlockedFeatures } from "@/lib/levelProgression";
import type { LevelNumber } from "@/lib/levelProgression";

export function RLGameNew() {
  const { translate } = useLanguage();
  const [explorationRate, setExplorationRate] = useState(0.2);
  const [alpha, setAlpha] = useState(0.1);
  const [gamma, setGamma] = useState(0.85);
  const [mode, setMode] = useState<"levels" | "free">("levels");
  const [currentLevel, setCurrentLevel] = useState<LevelNumber>(1);
  const [freeModeUnlocked, setFreeModeUnlocked] = useState(false);

  // Cheat code: type "blauwal" to unlock Free Mode
  useEffect(() => {
    let keySequence = "";
    const handleKeyPress = (e: KeyboardEvent) => {
      keySequence += e.key.toLowerCase();
      if (keySequence.length > 10) {
        keySequence = keySequence.slice(-10);
      }
      if (keySequence.includes("blauwal")) {
        setFreeModeUnlocked(true);
        keySequence = "";
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, []);

  const canAccessFreeMode = freeModeUnlocked || currentLevel === 10;
  const isLevelMode = mode === "levels";
  const unlockedFeatures = getUnlockedFeatures(currentLevel);

  const goToLevel = (level: number) => {
    const clamped = Math.max(1, Math.min(10, level)) as LevelNumber;
    setCurrentLevel(clamped);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Mode Selector */}
      <div className="border-b border-border/40 bg-card/30 px-8 py-4 sticky top-0 z-30">
        <div className="flex gap-3">
          <Button
            variant={mode === "levels" ? "default" : "outline"}
            onClick={() => setMode("levels")}
            className="font-semibold"
          >
            {translate("Level-Modus", "Level Mode")}
          </Button>
          <Button
            variant={mode === "free" ? "default" : "outline"}
            onClick={() => setMode("free")}
            className="font-semibold"
            disabled={!canAccessFreeMode && mode !== "free"}
          >
            {translate("Free Mode", "Free Mode")}
            {!canAccessFreeMode && <span className="ml-2 text-xs">🔒</span>}
          </Button>
        </div>
      </div>

      {/* Main Content - 2 Column Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Parameters & Progress */}
        <div className="w-72 flex-shrink-0 border-r border-border/40 bg-card/20 p-6 overflow-y-auto">
          {!isLevelMode && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMode("levels")}
                className="w-full font-semibold mb-6"
              >
                ← {translate("Zurück zu Level-Modus", "Back to Level Mode")}
              </Button>
            </>
          )}
          {isLevelMode && (
            <>
              <LevelProgressBar currentLevel={currentLevel} translate={translate} />
              <div className="mt-3 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToLevel(currentLevel - 1)}
                  disabled={currentLevel <= 1}
                  className="flex-1 font-semibold"
                >
                  ← {translate("Level", "Level")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToLevel(currentLevel + 1)}
                  disabled={currentLevel >= 10}
                  className="flex-1 font-semibold"
                >
                  {translate("Level", "Level")} →
                </Button>
              </div>
              <div className="mt-6" />
              <LevelUnlocksCard currentLevel={currentLevel} translate={translate} />
              <div className="mt-6" />
            </>
          )}
          <ParametersPanel
            explorationRate={explorationRate}
            alpha={alpha}
            gamma={gamma}
            onExplorationRateChange={setExplorationRate}
            onAlphaChange={setAlpha}
            onGammaChange={setGamma}
            isLevelMode={isLevelMode}
            canAdjustAlpha={unlockedFeatures.canAdjustAlpha}
            canAdjustGamma={unlockedFeatures.canAdjustGamma}
            translate={translate}
          />
        </div>

        {/* Right Content - Game */}
        <div className="flex-1 overflow-auto">
          <LevelProvider levelMode={isLevelMode} currentLevel={currentLevel}>
            <RLGame />
          </LevelProvider>
        </div>
      </div>
    </div>
  );
}
