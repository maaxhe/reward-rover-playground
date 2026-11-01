import { describe, expect, it } from "vitest";
import { diagnose, jumpiness, movingAverage, segmentBySettings, stepTrend, toParamLog } from "./trainingInsights";
import type { EpisodeStats } from "./types";

const ep = (episode: number, steps: number, epsilon = 0.2, alpha = 0.1, gamma = 0.85): EpisodeStats => ({
  episode,
  steps,
  reward: 100 - steps,
  success: true,
  mode: "playground",
  epsilon,
  alpha,
  gamma,
});

const run = (stepCounts: number[], ...params: [number?, number?, number?]) =>
  stepCounts.map((s, i) => ep(i + 1, s, ...params));

describe("movingAverage", () => {
  it("averages a trailing window and is shorter at the start", () => {
    expect(movingAverage([10, 20, 30, 40], 2)).toEqual([10, 15, 25, 35]);
  });
});

describe("segmentBySettings", () => {
  it("groups consecutive episodes with the same settings", () => {
    const history = [...run([30, 20, 10]), ...run([8, 6], 0.05).map((e, i) => ({ ...e, episode: 4 + i }))];
    const segments = segmentBySettings(history);
    expect(segments).toHaveLength(2);
    expect(segments[0]).toMatchObject({ epsilon: 0.2, from: 1, to: 3, episodes: 3, avgSteps: 20 });
    expect(segments[1]).toMatchObject({ epsilon: 0.05, from: 4, to: 5, episodes: 2, avgSteps: 7 });
  });

  it("treats float noise from a slider as the same setting", () => {
    const history = [ep(1, 10, 0.1 + 0.2), ep(2, 12, 0.3)];
    expect(segmentBySettings(history)).toHaveLength(1);
  });

  it("skips episodes saved before settings were recorded", () => {
    const old: EpisodeStats = { episode: 1, steps: 9, reward: 1, success: true, mode: "playground" };
    expect(segmentBySettings([old])).toEqual([]);
  });
});

describe("toParamLog", () => {
  it("emits [fromEpisode, ε, α, γ] per change, zero-based like the classroom log", () => {
    const history = [...run([10, 10]), ep(3, 5, 0.05, 0.3, 0.9)];
    expect(toParamLog(history)).toEqual([
      [0, 0.2, 0.1, 0.85],
      [2, 0.05, 0.3, 0.9],
    ]);
  });
});

describe("stepTrend", () => {
  it("needs at least six episodes", () => {
    expect(stepTrend([5, 4, 3])).toBeNull();
  });
  it("detects improving, flat and worse runs", () => {
    expect(stepTrend([40, 38, 30, 12, 10, 9])).toBe("improving");
    expect(stepTrend([10, 11, 10, 10, 11, 10])).toBe("flat");
    expect(stepTrend([9, 10, 12, 30, 35, 40])).toBe("worse");
  });
});

describe("jumpiness", () => {
  it("is near zero for a steady run and large for a jumpy one", () => {
    expect(jumpiness([10, 10, 10, 10, 10])).toBe(0);
    expect(jumpiness([5, 50, 6, 60, 4, 55])).toBeGreaterThan(0.5);
  });
});

describe("diagnose", () => {
  it("asks for more data on a fresh setting", () => {
    expect(diagnose(run([30, 20]))).toEqual(["need-data"]);
  });

  it("only judges the episodes since the last settings change", () => {
    const history = [...run([50, 48, 52, 49, 51, 50, 49, 50]), ...run([30, 20]).map((e, i) => ({ ...e, episode: 9 + i, epsilon: 0.05 }))];
    expect(diagnose(history)).toEqual(["need-data"]);
  });

  it("reports improvement and warns about a very high ε", () => {
    const hints = diagnose(run([60, 55, 40, 20, 12, 10], 0.7));
    expect(hints).toContain("improving");
    expect(hints).toContain("eps-high");
  });

  it("flags a stuck run with tiny ε", () => {
    const hints = diagnose(run(Array(12).fill(40), 0.02));
    expect(hints).toContain("stuck");
    expect(hints).toContain("eps-low");
  });

  it("never returns more than the limit", () => {
    expect(diagnose(run([9, 80, 12, 90, 8, 100, 9, 85, 10, 95, 9, 90], 0.8, 0.5, 0.3), 2).length).toBeLessThanOrEqual(2);
  });
});
