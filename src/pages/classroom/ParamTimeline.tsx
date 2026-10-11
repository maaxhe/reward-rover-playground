import type { ParamLog } from "@/lib/competition/api";

const SERIES = [
  { key: 1, label: "ε Neugier", color: "#f59e0b" },
  { key: 2, label: "α Lernrate", color: "#38bdf8" },
  { key: 3, label: "γ Weitsicht", color: "#a78bfa" },
] as const;

const W = 320;
const H = 110;
const PAD = { l: 26, r: 8, t: 8, b: 18 };

/** Step chart of ε, α and γ over the training episodes (values are held until the next change). */
export const ParamTimeline = ({ log }: { log: ParamLog }) => {
  const lastEpisode = Math.max(1, log[log.length - 1][0] + 1);
  const x = (episode: number) => PAD.l + (episode / lastEpisode) * (W - PAD.l - PAD.r);
  const y = (value: number) => PAD.t + (1 - value) * (H - PAD.t - PAD.b);

  const pathFor = (key: 1 | 2 | 3) => {
    let d = "";
    log.forEach((entry, i) => {
      const px = x(entry[0]);
      d += i === 0 ? `M${px},${y(entry[key])}` : `H${px}V${y(entry[key])}`;
    });
    return `${d}H${x(lastEpisode)}`;
  };

  return (
    <div className="space-y-1">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full max-w-sm"
        role="img"
        aria-label={`Verlauf der Lernparameter über ${lastEpisode} Episoden, ${log.length - 1} Änderungen`}
      >
        {[0, 0.5, 1].map((v) => (
          <g key={v}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} stroke="currentColor" strokeOpacity={0.15} />
            <text x={PAD.l - 4} y={y(v) + 3} textAnchor="end" fontSize={9} fill="currentColor" fillOpacity={0.6}>
              {v}
            </text>
          </g>
        ))}
        <text x={PAD.l} y={H - 4} fontSize={9} fill="currentColor" fillOpacity={0.6}>0</text>
        <text x={W - PAD.r} y={H - 4} textAnchor="end" fontSize={9} fill="currentColor" fillOpacity={0.6}>
          Episode {lastEpisode}
        </text>
        {SERIES.map((s) => (
          <path key={s.key} d={pathFor(s.key)} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" />
        ))}
      </svg>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {SERIES.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1">
            <span className="inline-block h-2 w-4 rounded-full" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
};
