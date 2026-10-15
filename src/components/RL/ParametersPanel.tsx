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
  /** Comparison Mode has its own sliders per rover, so these global ones do nothing there. */
  disabled?: boolean;
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
  disabled = false,
  translate,
}: ParametersPanelProps) {
  const alphaLocked = isLevelMode && !canAdjustAlpha;
  const gammaLocked = isLevelMode && !canAdjustGamma;

  return (
    <Card
      className={cn("border-0 border-t border-border/60 bg-transparent p-0 pt-4 shadow-none rounded-none transition-opacity", disabled && "pointer-events-none opacity-40 grayscale")}
      aria-disabled={disabled}
    >
      <h3 className="text-sm font-semibold mb-4 text-foreground">
        {translate("Lernparameter", "Learning Parameters")}
      </h3>
      {disabled && (
        <p className="mb-3 text-xs text-muted-foreground">
          {translate("Im Vergleichsmodus stellst du α, γ und ε direkt bei jedem Rover ein.", "In comparison mode you set α, γ and ε on each rover directly.")}
        </p>
      )}

      <div className="space-y-4">
        {/* Exploration Rate */}
        <div data-tutorial="explore" className="space-y-2">
          <div className="flex justify-between items-center">
            <Label className="text-xs font-medium">
              {translate("Neugier (ε)", "Curiosity (ε)")}
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
            disabled={disabled}
            className="input-slider w-full"
            style={{ "--slider-value": explorationRate } as React.CSSProperties}
          />
          <p className="text-xs text-muted-foreground">
            {translate("Auch „Exploration“ genannt: Wie oft probiert der Rover etwas Neues aus? Wie im Restaurant: Lieblingsgericht oder mal was anderes?", "Also called “exploration”: how often does the rover try something new? Like in a restaurant: your favourite dish or something different?")}
          </p>
        </div>

        {/* Alpha (Learning Rate) */}
        <div
          data-tutorial="alpha"
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
            disabled={alphaLocked || disabled}
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
          data-tutorial="gamma"
          className={cn(
            "space-y-2 transition-opacity",
            gammaLocked && "opacity-50 pointer-events-none"
          )}
        >
          <div className="flex justify-between items-center">
            <Label className="text-xs font-medium">
              {gammaLocked && <span className="mr-1">🔒</span>}
              {translate("Weitsicht (γ)", "Foresight (γ)")}
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
            disabled={gammaLocked || disabled}
            className="input-slider w-full"
            style={{ "--slider-value": gamma } as React.CSSProperties}
          />
          <p className="text-xs text-muted-foreground">
            {gammaLocked
              ? translate("🔒 Schalte Level 3 frei.", "🔒 Reach level 3 to unlock.")
              : translate(
                  "Auch „Discount-Faktor“ genannt (dasselbe!): Denkt der Rover kurz- oder langfristig?",
                  "Also called “discount factor” (the same thing!): does the rover think short or long term?"
                )}
          </p>
        </div>
      </div>
    </Card>
  );
}
