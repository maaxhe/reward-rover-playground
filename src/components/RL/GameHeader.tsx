import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Mode = "playground" | "random" | "comparison";

type GameHeaderProps = {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  isMobile: boolean;
  translate: (de: string, en: string) => string;
};

export function GameHeader({
  mode,
  onModeChange,
  isMobile,
  translate,
}: GameHeaderProps) {
  const modes: Array<{ key: Mode; label: string; disabled: boolean }> = [
    { key: "playground", label: translate("Playground", "Playground"), disabled: false },
    { key: "random", label: translate("Random Mode", "Random Mode"), disabled: isMobile },
    { key: "comparison", label: translate("Comparison", "Comparison"), disabled: isMobile },
  ];

  return (
    <div className="flex gap-2">
      {modes.map((m) => (
        <Button
          key={m.key}
          variant={mode === m.key ? "default" : "outline"}
          size="sm"
          onClick={() => !m.disabled && onModeChange(m.key)}
          disabled={m.disabled}
          className={cn(
            "font-semibold transition-all",
            m.disabled && "cursor-not-allowed opacity-50"
          )}
        >
          {m.label}
        </Button>
      ))}
    </div>
  );
}
