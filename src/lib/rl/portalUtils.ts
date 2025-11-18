import type { Position, TileState } from "./types";
import { PORTAL_COOLDOWN_STEPS } from "./constants";

/**
 * Finds all portal positions in the grid
 */
export const findPortals = (grid: TileState[][]): Position[] => {
  const portals: Position[] = [];
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      if (grid[y][x].type === "portal") {
        portals.push({ x, y });
      }
    }
  }
  return portals;
};

/**
 * Teleports through a portal to a random other portal
 */
export const teleportThroughPortal = (grid: TileState[][], currentPos: Position): Position => {
  const portals = findPortals(grid);
  if (portals.length < 2) return currentPos;

  // Filter out current portal
  const otherPortals = portals.filter(p => !(p.x === currentPos.x && p.y === currentPos.y));
  if (otherPortals.length === 0) return currentPos;

  // Randomly select a portal
  const targetPortal = otherPortals[Math.floor(Math.random() * otherPortals.length)];
  return targetPortal;
};

/**
 * Generates a key for a portal position
 */
export const getPortalKey = (pos: Position): string => `${pos.x},${pos.y}`;

/**
 * Decrements all portal cooldowns by 1, removing those that reach 0
 */
export const decrementPortalCooldowns = (cooldowns: Record<string, number>): Record<string, number> => {
  const next: Record<string, number> = {};
  for (const [key, value] of Object.entries(cooldowns)) {
    if (value > 1) {
      next[key] = value - 1;
    }
  }
  return next;
};

/**
 * Sets cooldowns for the given portal positions
 */
export const withPortalCooldowns = (
  cooldowns: Record<string, number>,
  positions: Position[],
  duration = PORTAL_COOLDOWN_STEPS
): Record<string, number> => {
  if (positions.length === 0) return cooldowns;
  const next = { ...cooldowns };
  positions.forEach((pos) => {
    next[getPortalKey(pos)] = duration;
  });
  return next;
};

/**
 * Checks if a portal is on cooldown
 */
export const isPortalOnCooldown = (cooldowns: Record<string, number>, pos: Position): boolean => {
  const value = cooldowns[getPortalKey(pos)];
  return typeof value === "number" && value > 0;
};
