import React from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type ParametersPanelProps = {
  explorationRate: number;
  alpha: number;
  gamma: number;
  onExplorationRateChange: (value: number) => void;
  onAlphaChange: (value: number) => void;
  onGammaChange: (value: number) => void;
  isLevelMode: boolean;
  canAdjustAlpha: boolean;
  canAdjustGamma: boolean;
  translate: (de: string, en: string) => string;
};

export function ParametersPanel({
  explorationRate,
  alpha,
  gamma,
  onExplorationRateChange,
  onAlphaChange,
  onGammaChange,
  isLevelMode,
  canAdjustAlpha,
  canAdjustGamma,
  translate,
}: ParametersPanelProps) {
  const alphaLocked = isLevelMode && !canAdjustAlpha;
  const gammaLocked = isLevelMode && !canAdjustGamma;

  return (
    <Card className="p-5 bg-card/60 border-border/40 rounded-lg">
      <h3 className="text-sm font-semibold mb-4 uppercase tracking-wide text-foreground">
        {translate("Lernparameter", "Learning Parameters")}
      </h3>

      <div className="space-y-4">
        {/* Exploration Rate */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label className="text-xs font-medium">
              {translate("Exploration (ε)", "Exploration (ε)")}
            </Label>
            <span className="text-xs font-semibold text-primary">
              {Math.round(explorationRate * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={explorationRate}
            onChange={(e) => onExplorationRateChange(e.target.valueAsNumber)}
            className="input-slider w-full"
            style={{ "--slider-value": explorationRate } as React.CSSProperties}
          />
          <p className="text-xs text-muted-foreground">
            {translate("Wie viel erkundet der Rover?", "How much does the rover explore?")}
          </p>
        </div>

        {/* Alpha (Learning Rate) */}
        <div
          className={cn(
            "space-y-2 transition-opacity",
            alphaLocked && "opacity-50 pointer-events-none"
          )}
        >
          <div className="flex justify-between items-center">
            <Label className="text-xs font-medium">
              {alphaLocked && <span className="mr-1">🔒</span>}
              {translate("Lernrate (α)", "Learning Rate (α)")}
            </Label>
            <span className="text-xs font-semibold text-primary">{alpha.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min={0.01}
            max={0.5}
            step={0.01}
            value={alpha}
            onChange={(e) => onAlphaChange(e.target.valueAsNumber)}
            disabled={alphaLocked}
            className="input-slider w-full"
            style={{ "--slider-value": alpha / 0.5 } as React.CSSProperties}
          />
          <p className="text-xs text-muted-foreground">
            {alphaLocked
              ? translate("🔒 Schalte Level 2 frei.", "🔒 Reach level 2 to unlock.")
              : translate("Wie schnell lernt der Rover?", "How fast does the rover learn?")}
          </p>
        </div>

        {/* Gamma (Discount Factor) */}
        <div
          className={cn(
            "space-y-2 transition-opacity",
            gammaLocked && "opacity-50 pointer-events-none"
          )}
        >
          <div className="flex justify-between items-center">
            <Label className="text-xs font-medium">
              {gammaLocked && <span className="mr-1">🔒</span>}
              {translate("Diskontfaktor (γ)", "Discount Factor (γ)")}
            </Label>
            <span className="text-xs font-semibold text-primary">{gamma.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min={0}
            max={0.99}
            step={0.01}
            value={gamma}
            onChange={(e) => onGammaChange(e.target.valueAsNumber)}
            disabled={gammaLocked}
            className="input-slider w-full"
            style={{ "--slider-value": gamma } as React.CSSProperties}
          />
          <p className="text-xs text-muted-foreground">
            {gammaLocked
              ? translate("🔒 Schalte Level 3 frei.", "🔒 Reach level 3 to unlock.")
              : translate(
                  "Denkt der Rover kurz- oder langfristig?",
                  "Does the rover think short or long term?"
                )}
          </p>
        </div>
      </div>
    </Card>
  );
}
