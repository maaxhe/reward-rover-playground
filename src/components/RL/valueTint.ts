import { GOAL_REWARD } from "@/lib/rl/constants";

/** Overlay colour for a planned tile value: warm gold for good news, cool blue for bad, clear for "no idea yet". */
export const valueTint = (value: number): string => {
  if (Math.abs(value) < 0.05) return "transparent";
  if (value > 0) return `rgba(245, 190, 40, ${Math.min(0.12 + (value / GOAL_REWARD) * 0.7, 0.85).toFixed(2)})`;
  return `rgba(90, 120, 200, ${Math.min(0.1 + (-value / GOAL_REWARD) * 0.5, 0.55).toFixed(2)})`;
};

export const ARROWS = { up: "↑", down: "↓", left: "←", right: "→" } as const;

export const formatPlanned = (value: number): string => (Math.abs(value) >= 10 ? value.toFixed(0) : value.toFixed(1));
