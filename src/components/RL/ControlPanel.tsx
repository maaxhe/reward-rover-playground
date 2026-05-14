import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, RotateCcw, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ControlPanelProps = {
  isPlayground: boolean;
  isRunning: boolean;
  episode: number;
  totalReward: number;
  currentSteps: number;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onUndo?: () => void;
  canUndo?: boolean;
  translate: (de: string, en: string) => string;
  numberFormatter: Intl.NumberFormat;
  children?: React.ReactNode; // Additional controls
};

export function ControlPanel({
  isPlayground,
  isRunning,
  episode,
  totalReward,
  currentSteps,
  onStart,
  onPause,
  onReset,
  onUndo,
  canUndo,
  translate,
  numberFormatter,
  children,
}: ControlPanelProps) {
  return (
    <div className="space-y-4">
      {/* Main Controls Card */}
      <Card className="p-4 bg-card/60 border-border/50">
        <h2 className="text-lg font-semibold mb-4">
          {translate("Controls", "Controls")}
        </h2>

        {/* Play/Pause and Reset Buttons */}
        <div className="space-y-3">
          <Button
            className="w-full font-semibold py-6"
            size="lg"
            onClick={isRunning ? onPause : onStart}
          >
            {isRunning ? (
              <>
                <Pause className="mr-2 h-5 w-5" />
                {translate("Pause", "Pause")}
              </>
            ) : (
              <>
                <Play className="mr-2 h-5 w-5" />
                {translate("Start", "Start")}
              </>
            )}
          </Button>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 font-semibold"
              onClick={onReset}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              {translate("Reset", "Reset")}
            </Button>
            {onUndo && (
              <Button
                variant="outline"
                className="flex-1 font-semibold"
                onClick={onUndo}
                disabled={!canUndo}
              >
                <Undo2 className="mr-2 h-4 w-4" />
                {translate("Undo", "Undo")}
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Stats Card */}
      <Card className="p-4 bg-card/60 border-border/50">
        <h2 className="text-lg font-semibold mb-3">
          {translate("Stats", "Stats")}
        </h2>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label className="text-muted-foreground">
              {translate("Episode", "Episode")}
            </Label>
            <Badge variant="secondary">{episode}</Badge>
          </div>
          <div className="flex justify-between items-center">
            <Label className="text-muted-foreground">
              {translate("Reward", "Reward")}
            </Label>
            <Badge
              variant="secondary"
              className={cn(
                totalReward >= 0 ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
              )}
            >
              {numberFormatter.format(totalReward)}
            </Badge>
          </div>
          {!isPlayground && (
            <div className="flex justify-between items-center">
              <Label className="text-muted-foreground">
                {translate("Steps", "Steps")}
              </Label>
              <Badge variant="secondary">{currentSteps}</Badge>
            </div>
          )}
        </div>
      </Card>

      {/* Additional Controls Slot */}
      {children && <div className="space-y-4">{children}</div>}
    </div>
  );
}
