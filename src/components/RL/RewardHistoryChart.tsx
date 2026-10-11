import type { EpisodeStats } from "@/lib/rl/types";

interface Props {
  history: EpisodeStats[];
  translate: (de: string, en: string) => string;
}

/** Reward per episode for the last 20 episodes. */
export function RewardHistoryChart({ history, translate }: Props) {
  const displayHistory = history.slice(-20);
  if (displayHistory.length === 0) return null;

  const width = 100;
  const height = 100;
  const padding = 5;
  const maxReward = Math.max(...displayHistory.map((h) => h.reward), 1);
  const minReward = Math.min(...displayHistory.map((h) => h.reward), 0);
  const range = maxReward - minReward || 1;
  const coords = displayHistory.map((stat, i) => ({
    x: padding + (i / Math.max(displayHistory.length - 1, 1)) * (width - 2 * padding),
    y: height - padding - ((stat.reward - minReward) / range) * (height - 2 * padding),
  }));

  return (
    <div>
      <div className="relative h-40 w-full rounded-lg bg-background/50 p-2">
        {displayHistory.length >= 2 && (
          <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full">
            <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="currentColor" strokeWidth="0.2" opacity="0.2" />
            <polyline
              points={coords.map((c) => `${c.x},${c.y}`).join(" ")}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="1"
              strokeLinejoin="round"
            />
            {coords.map((c, i) => (
              <circle key={i} cx={c.x} cy={c.y} r="1" fill="hsl(var(--primary))" />
            ))}
          </svg>
        )}
      </div>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        {translate(`Reward der letzten ${displayHistory.length} Episoden`, `Reward of the last ${displayHistory.length} episodes`)}
      </p>
    </div>
  );
}
