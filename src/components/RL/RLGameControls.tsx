import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { UnlockedFeatures } from "@/lib/levelProgression";
import type { Language, Mode } from "@/lib/rl/types";
import { PRESET_LEVELS, type PresetLevel } from "@/lib/rl/presets";
import { SIMULATION_SPEEDS, type SimulationSpeed } from "@/lib/rl/simulation";
import type { PlaceableTile, PlaygroundState, RandomModeState } from "./RLGame";
import { ChevronDown, ChevronUp, Pause, Play, RotateCcw, Undo2 } from "lucide-react";

type PlaygroundControlsProps = {
  state: PlaygroundState;
  onStart: () => void;
  onPause: () => void;
  onStep: () => void;
  onReset: () => void;
  onUndo: () => void;
  canUndo: boolean;
  onReplay?: () => void;
  isReplaying?: boolean;
  onStopReplay?: () => void;
  onLoadPreset: (preset: PresetLevel) => void;
  placementMode: PlaceableTile;
  onPlacementModeChange: (type: PlaceableTile) => void;
  simulationSpeed: SimulationSpeed;
  onSimulationSpeedChange: (speed: SimulationSpeed) => void;
  canPublishGlobal: boolean;
  onPublishGlobal: () => void;
  showValues: boolean;
  onShowValuesChange: (show: boolean) => void;
  translate: (de: string, en: string) => string;
  numberFormatter: Intl.NumberFormat;
  language: Language;
  isSpeedrun?: boolean;
  showStatistics: boolean;
  setShowStatistics: (show: boolean) => void;
  levelMode: boolean;
  unlockedFeatures: UnlockedFeatures | null;
};

export const PlaygroundControls = ({
  state,
  onStart,
  onPause,
  onStep,
  onReset,
  onUndo,
  canUndo,
  onReplay,
  isReplaying = false,
  onStopReplay,
  onLoadPreset,
  placementMode,
  onPlacementModeChange,
  simulationSpeed,
  onSimulationSpeedChange,
  canPublishGlobal,
  onPublishGlobal,
  showValues,
  onShowValuesChange,
  translate,
  numberFormatter,
  language,
  isSpeedrun = false,
  showStatistics,
  setShowStatistics,
  levelMode,
  unlockedFeatures,
}: PlaygroundControlsProps) => {
  const [presetsOpen, setPresetsOpen] = useState(false);

  return (
    <div className="space-y-5">
      <div>
        <Button className="w-full font-semibold" size="lg" onClick={state.isRunning ? onPause : onStart}>
          {state.isRunning ? <Pause className="mr-2 h-5 w-5" /> : <Play className="mr-2 h-5 w-5" />}
          {state.isRunning ? translate("Pause", "Pause") : translate("Start", "Start")}
        </Button>
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" size="lg" onClick={onStep} className="flex-1 font-semibold">
          {translate("Step", "Step")}
        </Button>
        <Button variant="outline" size="lg" onClick={onReset} className="flex-1 font-semibold">
          <RotateCcw className="mr-2 h-4 w-4" />
          {translate("Zurück", "Reset")}
        </Button>
      </div>
      <div className="space-y-2">
        <Button
          variant="outline"
          size="lg"
          onClick={onUndo}
          disabled={!canUndo}
          className="w-full font-semibold"
        >
          <Undo2 className="mr-2 h-4 w-4" />
          {translate("Rückgängig", "Undo")}
        </Button>
        {onReplay && onStopReplay && (
          <Button
            variant={isReplaying ? "destructive" : "secondary"}
            size="lg"
            onClick={isReplaying ? onStopReplay : onReplay}
            className="w-full font-semibold"
          >
            {isReplaying ? "⏹️" : "🎬"}
            <span className="ml-2">{isReplaying ? translate("Stop", "Stop") : translate("Replay", "Replay")}</span>
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <Label className="text-base font-semibold text-foreground">
          {translate("Geschwindigkeit", "Speed")}
        </Label>
        <div className="grid grid-cols-4 gap-2">
          {SIMULATION_SPEEDS.map((option) => (
            <Button
              key={option.key}
              variant={simulationSpeed === option.key ? "default" : "outline"}
              size="sm"
              onClick={() => onSimulationSpeedChange(option.key)}
              className="text-xs font-semibold"
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      <Collapsible open={presetsOpen} onOpenChange={setPresetsOpen} className="space-y-2">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-between rounded-xl border border-border/40 bg-background/60 font-semibold text-base"
          >
            <span>{translate("Preset Levels", "Preset Levels")}</span>
            <ChevronDown
              className={cn("h-4 w-4 transition-transform duration-200", presetsOpen ? "rotate-180" : "")}
            />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
          <div className="mt-2 grid grid-cols-2 gap-2">
            {PRESET_LEVELS.map((preset) => (
              <TooltipProvider key={preset.key}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onLoadPreset(preset)}
                      className="text-xs font-semibold h-auto py-2"
                    >
                      {preset.name[language]}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">{preset.description[language]}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      <div className="space-y-2">
      <Label className="text-base font-semibold text-foreground">
        {translate("Platzierungs-Modus", "Placement Mode")}
      </Label>
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant={placementMode === "obstacle" ? "default" : "outline"}
          onClick={() => onPlacementModeChange("obstacle")}
          disabled={levelMode && !unlockedFeatures?.canPlaceWalls}
          className="text-sm font-semibold"
        >
          {translate("Mauer", "Wall")}
        </Button>
        <Button
          variant={placementMode === "reward" ? "default" : "outline"}
          onClick={() => onPlacementModeChange("reward")}
          disabled={levelMode && !unlockedFeatures?.canPlaceRewards}
          className="text-sm font-semibold"
        >
          {translate("Belohnung", "Reward")}
        </Button>
        <Button
          variant={placementMode === "punishment" ? "default" : "outline"}
          onClick={() => onPlacementModeChange("punishment")}
          disabled={levelMode && !unlockedFeatures?.canPlacePunishments}
          className="text-sm font-semibold"
        >
          {translate("Strafe", "Penalty")}
        </Button>
        <Button
          variant={placementMode === "portal" ? "default" : "outline"}
          onClick={() => onPlacementModeChange("portal")}
          disabled={levelMode && !unlockedFeatures?.canPlacePortals}
          className="text-sm font-semibold"
        >
          {translate("Portal", "Portal")}
        </Button>
      </div>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      <Badge variant="secondary" className="py-2 justify-center text-sm">
        <span className="font-semibold">{translate("Episode:", "Episode:")}</span> {state.episode}
      </Badge>
      <Badge
        variant="secondary"
        className={cn(
          "py-2 justify-center text-sm",
          state.totalReward >= 0 ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400",
        )}
      >
        <span className="font-semibold">{translate("Reward:", "Reward:")}</span>{" "}
        {numberFormatter.format(state.totalReward)}
      </Badge>
      <Badge variant="secondary" className="py-2 justify-center text-sm">
        <span className="font-semibold">{translate("Steps:", "Steps:")}</span> {state.currentSteps}
      </Badge>
    </div>

    {/* Live-Statistiken */}
    {state.episodeHistory.length > 0 && (
      <Card className="rounded-lg border border-border/40 bg-secondary/20 p-4">
        <div
          className="flex items-center justify-between cursor-pointer mb-2"
          onClick={() => setShowStatistics(!showStatistics)}
        >
          <h3 className="text-sm font-bold text-foreground">
            {translate("Statistics", "Statistics")}
          </h3>
          {showStatistics ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
        {showStatistics && (<div className="space-y-2 text-xs text-muted-foreground">
          <div className="flex justify-between">
            <span>{translate("Ø Episode-Länge:", "Avg. episode length:")}</span>
            <span className="font-semibold text-foreground">
              {(state.episodeHistory.reduce((sum, e) => sum + e.steps, 0) / state.episodeHistory.length).toFixed(1)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>{translate("Ø Reward:", "Avg. reward:")}</span>
            <span className="font-semibold text-foreground">
              {numberFormatter.format(state.episodeHistory.reduce((sum, e) => sum + e.reward, 0) / state.episodeHistory.length)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>{translate("Best Reward:", "Best reward:")}</span>
            <span className="font-semibold text-green-400">
              {numberFormatter.format(Math.max(...state.episodeHistory.map(e => e.reward)))}
            </span>
          </div>
        </div>)}
      </Card>
    )}
  </div>
  );
};

type RandomControlsProps = {
  state: RandomModeState;
  onStart: () => void;
  onPause: () => void;
  onStep: () => void;
  onReset: () => void;
  translate: (de: string, en: string) => string;
  numberFormatter: Intl.NumberFormat;
  isSpeedrun: boolean;
};

export const RandomControls = ({
  state,
  onStart,
  onPause,
  onStep,
  onReset,
  translate,
  numberFormatter,
  isSpeedrun,
}: RandomControlsProps) => (
  <div className="space-y-5">
    <div>
      <Button className="w-full font-semibold" size="lg" onClick={state.isRunning ? onPause : onStart}>
        {state.isRunning ? <Pause className="mr-2 h-5 w-5" /> : <Play className="mr-2 h-5 w-5" />}
        {state.isRunning ? translate("Pause", "Pause") : translate("Start", "Start")}
      </Button>
    </div>
    <div className="flex gap-2">
      <Button variant="secondary" size="lg" onClick={onStep} className="flex-1 font-semibold">
        {translate("Step", "Step")}
      </Button>
      <Button variant="outline" size="lg" onClick={onReset} className="flex-1 font-semibold">
        <RotateCcw className="mr-2 h-4 w-4" />
        {translate("Zurück", "Reset")}
      </Button>
    </div>

    <div className="grid grid-cols-2 gap-2">
      <Badge variant="secondary" className="py-2 justify-center text-sm">
        <span className="font-semibold">{translate("Episode:", "Episode:")}</span> {state.episode}
      </Badge>
      <Badge
        variant="secondary"
        className={cn(
          "py-2 justify-center text-sm",
          state.totalReward >= 0 ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400",
        )}
      >
        <span className="font-semibold">{translate("Reward:", "Reward:")}</span>{" "}
        {numberFormatter.format(state.totalReward)}
      </Badge>
    </div>
  </div>
);

type ScrollIndicatorProps = {
  containerRef: React.RefObject<HTMLDivElement>;
};

export const ScrollIndicator = ({ containerRef }: ScrollIndicatorProps) => {
  const [showTopIndicator, setShowTopIndicator] = useState(false);
  const [showBottomIndicator, setShowBottomIndicator] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const checkScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const scrollThreshold = 20;

      // Zeige unten Indikator wenn man nach unten scrollen kann (man ist oben)
      const canScrollDown = scrollTop < scrollHeight - clientHeight - scrollThreshold;
      setShowBottomIndicator(canScrollDown);

      // Zeige oben Indikator wenn man nach oben scrollen kann (man ist unten)
      const canScrollUp = scrollTop > scrollThreshold;
      setShowTopIndicator(canScrollUp);
    };

    const handleScroll = () => {
      setIsScrolling(true);

      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
        checkScroll();
      }, 800);
    };

    // Initial check with small delay to ensure proper measurement
    setTimeout(checkScroll, 100);

    container.addEventListener('scroll', handleScroll, { passive: true });

    // Check on content changes
    const resizeObserver = new ResizeObserver(() => {
      setTimeout(checkScroll, 50);
    });
    resizeObserver.observe(container);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      resizeObserver.disconnect();
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [containerRef]);

  return (
    <>
      {showTopIndicator && !isScrolling && (
        <div className="absolute top-0 left-0 right-0 flex justify-center pointer-events-none z-20">
          <div className="bg-gradient-to-b from-card/95 via-card/80 to-transparent pb-6 pt-2 px-4">
            <ChevronUp className="h-5 w-5 text-muted-foreground/50 animate-bounce" />
          </div>
        </div>
      )}
      {showBottomIndicator && !isScrolling && (
        <div className="absolute bottom-0 left-0 right-0 flex justify-center pointer-events-none z-20">
          <div className="bg-gradient-to-t from-card/95 via-card/80 to-transparent pt-6 pb-2 px-4">
            <ChevronDown className="h-5 w-5 text-muted-foreground/50 animate-bounce" />
          </div>
        </div>
      )}
    </>
  );
};

type ControlBarProps = {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  translate: (de: string, en: string) => string;
  /** Level Mode only ever shows Playground — Random/Comparison would bypass level gating. */
  levelMode?: boolean;
};

export const ControlBar = ({
  mode,
  onModeChange,
  translate,
  levelMode = false,
}: ControlBarProps) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  if (levelMode) return null;

  return (
    <div className="rounded-lg border border-border/40 bg-card/60 p-4 backdrop-blur-sm text-foreground">
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button
          variant={mode === "playground" ? "default" : "outline"}
          onClick={() => onModeChange("playground")}
          className="rounded-lg font-semibold"
        >
          {translate("Playground", "Playground")}
        </Button>
        <div className="relative">
          <Button
            variant={mode === "random" ? "default" : "outline"}
            onClick={() => !isMobile && onModeChange("random")}
            className={cn("rounded-lg font-semibold", isMobile && "cursor-not-allowed opacity-50")}
            disabled={isMobile}
          >
            {translate("Zufallsmodus", "Random Mode")}
          </Button>
          {isMobile && (
            <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs text-muted-foreground">
              {translate("Nur auf Desktop", "Desktop only")}
            </div>
          )}
        </div>
        <div className="relative">
          <Button
            variant={mode === "comparison" ? "default" : "outline"}
            onClick={() => !isMobile && onModeChange("comparison")}
            className={cn("rounded-lg font-semibold", isMobile && "cursor-not-allowed opacity-50")}
            disabled={isMobile}
          >
            {translate("Vergleichsmodus", "Comparison Mode")}
          </Button>
          {isMobile && (
            <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs text-muted-foreground">
              {translate("Nur auf Desktop", "Desktop only")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
