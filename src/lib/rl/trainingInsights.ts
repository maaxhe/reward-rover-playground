import type { EpisodeStats } from "./types";

export interface SettingsSegment {
  epsilon: number;
  alpha: number;
  gamma: number;
  /** First and last episode number that ran with this setting. */
  from: number;
  to: number;
  episodes: number;
  avgSteps: number;
  avgReward: number;
}

export type Trend = "improving" | "flat" | "worse";

const round2 = (v: number) => Math.round(v * 100) / 100;
const mean = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);

/** Trailing moving average over `window` episodes (shorter at the start). */
export const movingAverage = (values: number[], window: number): number[] =>
  values.map((_, i) => mean(values.slice(Math.max(0, i - window + 1), i + 1)));

/** Episodes without a recorded setting (older saves) are skipped. */
const withSettings = (history: EpisodeStats[]) =>
  history.filter((e) => e.epsilon !== undefined && e.alpha !== undefined && e.gamma !== undefined);

/**
 * Groups consecutive episodes that ran with the same ε/α/γ, so "which setting worked how well"
 * becomes a short table instead of a guess from a curve.
 */
export const segmentBySettings = (history: EpisodeStats[]): SettingsSegment[] => {
  const segments: Array<SettingsSegment & { steps: number[]; rewards: number[] }> = [];
  for (const e of withSettings(history)) {
    const key = [round2(e.epsilon!), round2(e.alpha!), round2(e.gamma!)];
    const last = segments[segments.length - 1];
    if (last && last.epsilon === key[0] && last.alpha === key[1] && last.gamma === key[2]) {
      last.steps.push(e.steps);
      last.rewards.push(e.reward);
      last.to = e.episode;
    } else {
      segments.push({
        epsilon: key[0],
        alpha: key[1],
        gamma: key[2],
        from: e.episode,
        to: e.episode,
        episodes: 0,
        avgSteps: 0,
        avgReward: 0,
        steps: [e.steps],
        rewards: [e.reward],
      });
    }
  }
  return segments.map(({ steps, rewards, ...s }) => ({
    ...s,
    episodes: steps.length,
    avgSteps: mean(steps),
    avgReward: mean(rewards),
  }));
};

/** Compares the first and last third of a run of step counts (fewer steps = better). */
export const stepTrend = (steps: number[]): Trend | null => {
  if (steps.length < 6) return null;
  const third = Math.floor(steps.length / 3);
  const early = mean(steps.slice(0, third));
  const late = mean(steps.slice(-third));
  if (late < early * 0.8) return "improving";
  if (late > early * 1.2) return "worse";
  return "flat";
};

/** Coefficient of variation of the last `n` step counts: how jumpy the curve is. */
export const jumpiness = (steps: number[], n = 10): number => {
  const recent = steps.slice(-n);
  const m = mean(recent);
  if (recent.length < 4 || m === 0) return 0;
  const variance = mean(recent.map((s) => (s - m) ** 2));
  return Math.sqrt(variance) / m;
};

export type HintId =
  | "need-data"
  | "improving"
  | "stuck"
  | "worse"
  | "jumpy"
  | "eps-high"
  | "eps-low"
  | "alpha-high"
  | "alpha-low"
  | "gamma-low"
  | "gamma-high";

/**
 * Plain-language pointers for the current setting, based on the episodes since the last change.
 * At most `limit` hints, most informative first.
 */
export const diagnose = (history: EpisodeStats[], limit = 3): HintId[] => {
  const segments = segmentBySettings(history);
  const current = segments[segments.length - 1];
  if (!current || current.episodes < 5) return ["need-data"];

  const recent = withSettings(history).slice(-current.episodes).map((e) => e.steps);
  const trend = stepTrend(recent);
  const hints: HintId[] = [];

  if (trend === "improving") hints.push("improving");
  if (trend === "worse") hints.push("worse");
  if (trend === "flat" && current.episodes >= 10) hints.push("stuck");
  if (jumpiness(recent) > 0.5) hints.push("jumpy");

  if (current.epsilon >= 0.5) hints.push("eps-high");
  else if (current.epsilon <= 0.05 && trend !== "improving") hints.push("eps-low");
  if (current.alpha >= 0.4) hints.push("alpha-high");
  else if (current.alpha <= 0.03) hints.push("alpha-low");
  if (current.gamma <= 0.5) hints.push("gamma-low");
  else if (current.gamma >= 0.97) hints.push("gamma-high");

  return hints.slice(0, limit);
};

/** [fromEpisode, ε, α, γ] entries for every change, in the shape ParamTimeline expects. */
export const toParamLog = (history: EpisodeStats[]): Array<[number, number, number, number]> =>
  segmentBySettings(history).map((s) => [s.from - 1, s.epsilon, s.alpha, s.gamma]);
