import { memo, ReactNode, useMemo } from "react";
import { cn } from "@/lib/utils";

export type TileType = "empty" | "obstacle" | "reward" | "punishment" | "goal" | "portal";

const formatter = new Intl.NumberFormat("de-DE", {
  maximumFractionDigits: 2,
});

export interface TileProps {
  x: number;
  y: number;
  type: TileType;
  value: number;
  showValues: boolean;
  isAgent: boolean;
  isGoal: boolean;
  tileSize: number;
  ariaLabel: string;
  onClick?: (x: number, y: number) => void;
  onMouseDown?: () => void;
  onMouseEnter?: () => void;
  /** Kept for callers that still pass emoji; the board now draws shapes (see .rr-* in index.css). */
  icon?: ReactNode;
  /** Draw the rover inside this tile (boards without a separate animated rover overlay). */
  showAgent?: boolean;
  visits?: number;
  showHeatmap?: boolean;
  maxVisits?: number;
  bestAction?: string; // "up", "down", "left", "right"
  showActions?: boolean;
  rewardAnimation?: "reward" | "punishment" | null;
}

const TileComponent = ({
  x,
  y,
  type,
  value,
  showValues,
  isAgent,
  isGoal,
  tileSize,
  ariaLabel,
  onClick,
  onMouseDown,
  onMouseEnter,
  showAgent = false,
  visits = 0,
  showHeatmap = false,
  maxVisits = 1,
  bestAction,
  showActions = false,
  rewardAnimation,
}: TileProps) => {
  // Pfeil-Symbol basierend auf bester Aktion
  const getArrowIcon = (action?: string) => {
    if (!action) return null;
    switch (action) {
      case "up": return "↑";
      case "down": return "↓";
      case "left": return "←";
      case "right": return "→";
      default: return null;
    }
  };

  // Berechne Heatmap-Farbe basierend auf Besuchshäufigkeit
  const heatmapOverlay = useMemo(() => {
    if (!showHeatmap || visits === 0 || type === "obstacle") return undefined;
    const intensity = Math.min(visits / Math.max(maxVisits, 1), 1);
    // Von transparent (0 visits) zu rot (max visits)
    return `rgba(255, 0, 0, ${intensity * 0.6})`;
  }, [showHeatmap, visits, maxVisits, type]);

  const badgeClass = useMemo(() => {
    if (!showValues) return undefined;
    const isDark = isAgent || type === "obstacle" || type === "punishment" || type === "reward" || type === "goal";
    const isEmpty = type === "empty" && !isAgent && !isGoal;
    return cn("tile-value-badge", !isDark && !isEmpty && "light", isEmpty && "empty");
  }, [showValues, type, isAgent, isGoal]);

  const displayValue = useMemo(() => formatter.format(value), [value]);

  const handleClick = () => {
    if (onClick) onClick(x, y);
  };

  const handleMouseDown = () => {
    if (onMouseDown) onMouseDown();
  };

  const handleMouseEnter = () => {
    if (onMouseEnter) onMouseEnter();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!onClick) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick(x, y);
    }
  };

  return (
    <div
      role={onClick ? "button" : "presentation"}
      tabIndex={onClick ? 0 : -1}
      aria-label={ariaLabel}
      className={cn(
        "tile-focus relative flex select-none items-center justify-center transition-all duration-200",
        type === "obstacle" ? "rr-wall" : "rr-cell",
        onClick && "hover:brightness-125 cursor-pointer",
        "focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-primary"
      )}
      style={{
        width: tileSize,
        height: tileSize,
        borderRadius: tileSize > 32 ? "6px" : "4px",
      }}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseEnter={handleMouseEnter}
      onKeyDown={handleKeyDown}
    >
      {/* Heatmap Overlay */}
      {heatmapOverlay && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundColor: heatmapOverlay,
            borderRadius: tileSize > 32 ? "6px" : "4px",
          }}
        />
      )}
      {showValues && <span className={badgeClass}>{displayValue}</span>}
      {/* Aktions-Pfeil */}
      {showActions && bestAction && !isAgent && type !== "obstacle" && type !== "portal" && type !== "goal" && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{
            fontSize: tileSize > 40 ? "2rem" : tileSize > 32 ? "1.5rem" : "1.25rem",
            color: "rgba(143, 193, 189, 0.9)",
            fontWeight: "bold",
            textShadow: "0 0 4px rgba(0,0,0,0.5)",
          }}
        >
          {getArrowIcon(bestAction)}
        </div>
      )}
      {/* Reward/Punishment Animation */}
      {rewardAnimation && (
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center pointer-events-none z-10",
            rewardAnimation === "reward" ? "animate-reward-pop" : "animate-punishment-pop"
          )}
          style={{
            fontSize: tileSize > 40 ? "2.5rem" : tileSize > 32 ? "2rem" : "1.5rem",
          }}
        >
          {rewardAnimation === "reward" ? "❤️" : "💔"}
        </div>
      )}
      {isGoal || type === "goal" ? <span className="rr-goal" aria-hidden /> : null}
      {!isGoal && type === "reward" ? <span className="rr-candy" aria-hidden /> : null}
      {!isGoal && type === "punishment" ? <span className="rr-trap" aria-hidden /> : null}
      {!isGoal && type === "portal" ? <span className="rr-portal" aria-hidden /> : null}
      {showAgent && isAgent ? <span className="rr-rover" aria-hidden /> : null}
    </div>
  );
};

const areEqual = (prev: TileProps, next: TileProps) => {
  if (prev.type !== next.type) return false;
  if (prev.isAgent !== next.isAgent) return false;
  if (prev.isGoal !== next.isGoal) return false;
  if (prev.showValues !== next.showValues) return false;
  if (prev.showHeatmap !== next.showHeatmap) return false;
  if (prev.showActions !== next.showActions) return false;
  if (prev.bestAction !== next.bestAction) return false;
  if (prev.visits !== next.visits) return false;
  if (prev.maxVisits !== next.maxVisits) return false;
  if (prev.tileSize !== next.tileSize) return false;
  if (Math.round(prev.value * 100) !== Math.round(next.value * 100)) return false;
  if (prev.showAgent !== next.showAgent) return false;
  if (prev.rewardAnimation !== next.rewardAnimation) return false;
  if (!!prev.onMouseEnter !== !!next.onMouseEnter) return false;
  if (!!prev.onMouseDown !== !!next.onMouseDown) return false;
  if (!!prev.onClick !== !!next.onClick) return false;
  return true;
};

export const Tile = memo(TileComponent, areEqual);
