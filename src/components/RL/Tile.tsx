import { memo, ReactNode, useMemo } from "react";
import { cn } from "@/lib/utils";

export type TileType = "empty" | "obstacle" | "reward" | "punishment" | "goal" | "portal";

const formatter = new Intl.NumberFormat("de-DE", {
  maximumFractionDigits: 2,
});

const TILE_STYLE: Record<TileType, { background: string; text: string }> = {
  empty: { background: "var(--tile-bg)", text: "var(--tile-text-on-light)" },
  obstacle: { background: "var(--tile-obstacle)", text: "var(--tile-text-on-dark)" },
  reward: { background: "var(--tile-reward)", text: "var(--tile-text-on-dark)" },
  punishment: { background: "var(--tile-punishment)", text: "var(--tile-text-on-dark)" },
  goal: { background: "var(--tile-goal)", text: "var(--tile-text-on-dark)" },
  portal: { background: "var(--tile-portal)", text: "var(--tile-text-on-dark)" },
};

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
  icon?: ReactNode;
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
  icon,
}: TileProps) => {
  const style = TILE_STYLE[type];

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
        "tile-outline",
        !isAgent && !isGoal && type === "empty" && "bg-tile-empty",
        !isAgent && type === "reward" && "bg-tile-reward",
        !isAgent && type === "punishment" && "bg-tile-punishment",
        !isAgent && type === "obstacle" && "bg-tile-obstacle",
        !isAgent && type === "portal" && "bg-tile-portal",
        !isAgent && isGoal && "bg-tile-goal",
        isAgent && "bg-tile-agent text-white shadow-lg",
        isGoal && "shadow-md",
        onClick && "hover:scale-105 hover:brightness-110 cursor-pointer",
        "focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-primary"
      )}
      style={{
        width: tileSize,
        height: tileSize,
        borderRadius: tileSize > 32 ? "6px" : "4px",
        backgroundColor: isAgent ? "var(--tile-agent)" : isGoal ? "var(--tile-goal)" : style.background,
        color: isAgent ? "var(--tile-text-on-dark)" : style.text,
      }}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseEnter={handleMouseEnter}
      onKeyDown={handleKeyDown}
    >
      {showValues && <span className={badgeClass}>{displayValue}</span>}
      <span
        className="pointer-events-none select-none transition-transform duration-200"
        style={{ fontSize: tileSize > 40 ? "1.5rem" : tileSize > 32 ? "1.25rem" : "1rem" }}
        aria-hidden
      >
        {icon}
      </span>
    </div>
  );
};

const areEqual = (prev: TileProps, next: TileProps) => {
  if (prev.type !== next.type) return false;
  if (prev.isAgent !== next.isAgent) return false;
  if (prev.isGoal !== next.isGoal) return false;
  if (prev.showValues !== next.showValues) return false;
  if (prev.tileSize !== next.tileSize) return false;
  if (Math.round(prev.value * 100) !== Math.round(next.value * 100)) return false;
  if (prev.icon !== next.icon) return false;
  return true;
};

export const Tile = memo(TileComponent, areEqual);
