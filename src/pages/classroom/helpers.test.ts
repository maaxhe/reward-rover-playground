import { describe, it, expect } from "vitest";
import { buildCustomWorld } from "../../../server/lib/competition.js";
import { LEVEL_NUMBERS, levelToCustomWorld } from "@/lib/competition/levelWorld";
import { formatParams } from "./shared";
import { roundCsv } from "./exportCsv";
import type { LeaderboardRow } from "@/lib/competition/api";

describe("classroom helpers", () => {
  it("every level world is accepted by the server as a classroom world", () => {
    for (const level of LEVEL_NUMBERS) {
      const world = buildCustomWorld(levelToCustomWorld(level));
      expect(world, `level ${level}`).not.toBeNull();
      expect(world.tiles.every((t: { type: string }) => t.type !== "portal")).toBe(true);
    }
  });

  it("server rejects broken custom worlds", () => {
    const ok = { size: 5, agent: { x: 0, y: 0 }, goal: { x: 4, y: 4 }, tiles: [] };
    expect(buildCustomWorld(ok)).not.toBeNull();
    expect(buildCustomWorld({ ...ok, goal: { x: 0, y: 0 } })).toBeNull();
    expect(buildCustomWorld({ ...ok, size: 30 })).toBeNull();
    expect(buildCustomWorld({ ...ok, tiles: [{ x: 9, y: 0, type: "reward" }] })).toBeNull();
    expect(buildCustomWorld({ ...ok, tiles: [{ x: 1, y: 1, type: "portal" }] })).toBeNull();
    // goal walled in
    expect(buildCustomWorld({ ...ok, tiles: [{ x: 3, y: 4, type: "obstacle" }, { x: 4, y: 3, type: "obstacle" }] })).toBeNull();
  });

  it("formats the parameter summary", () => {
    expect(formatParams({ epsilon: [0.35, 0.05], alpha: [0.4, 0.4], gamma: [0.9, 0.9], changes: 3 })).toBe("ε 0,35 → 0,05 · α 0,4 · γ 0,9 · 3× geändert");
    expect(formatParams({ epsilon: [0.3, 0.3], alpha: [0.3, 0.3], gamma: [0.9, 0.9], changes: 0 })).toBe("ε 0,3 · α 0,3 · γ 0,9");
  });

  it("exports the round as CSV with BOM, semicolons and defused names", () => {
    const rows: LeaderboardRow[] = [
      { id: "a", name: "=Anna;x", episodes: 12, submitted: true, totalReward: 20, steps: 9, reachedGoal: true, rank: 1, params: { epsilon: [0.3, 0.05], alpha: [0.3, 0.3], gamma: [0.9, 0.9], changes: 2 } },
      { id: "b", name: "Ben", episodes: 0, submitted: false, totalReward: null, steps: null, reachedGoal: false, rank: null },
    ];
    const csv = roundCsv(rows);
    expect(csv.startsWith("﻿Platz;Name;Punkte")).toBe(true);
    expect(csv).toContain('"\'=Anna;x"');
    expect(csv).toContain(";0,3;0,05;0,3;0,3;0,9;0,9;2");
    expect(csv.split("\r\n")).toHaveLength(4);
  });
});
