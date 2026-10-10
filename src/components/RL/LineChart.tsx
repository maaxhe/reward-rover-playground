import { useId, useMemo, useState } from "react";

export interface Point {
  x: number;
  y: number;
}

interface Props {
  title: string;
  /** Plain-language description for screen readers; the table view repeats the numbers. */
  ariaLabel: string;
  data: Point[];
  xLabel: string;
  yFormat?: (v: number) => string;
  /** A hairline for a target value (e.g. the shortest possible path). */
  reference?: { y: number; label: string };
  /** Shown when there are fewer than two points. */
  emptyText: string;
  tooltip: (p: Point) => string;
  tableHeaders: [string, string];
}

const W = 320;
const H = 130;
const PAD = { l: 34, r: 12, t: 10, b: 22 };

/** One-series line chart: 2 px line, hairline grid, hover crosshair + tooltip, and a table view. */
export function LineChart({ title, ariaLabel, data, xLabel, yFormat = String, reference, emptyText, tooltip, tableHeaders }: Props) {
  const id = useId();
  const [hover, setHover] = useState<number | null>(null);

  const geometry = useMemo(() => {
    if (data.length < 2) return null;
    const xs = data.map((d) => d.x);
    const ys = data.map((d) => d.y).concat(reference ? [reference.y] : []);
    const xMin = Math.min(...xs);
    const xMax = Math.max(...xs);
    let yMin = Math.min(...ys);
    let yMax = Math.max(...ys);
    if (yMin === yMax) {
      yMin -= 1;
      yMax += 1;
    }
    const span = yMax - yMin;
    yMin -= span * 0.08;
    yMax += span * 0.08;
    const sx = (x: number) => PAD.l + ((x - xMin) / Math.max(1, xMax - xMin)) * (W - PAD.l - PAD.r);
    const sy = (y: number) => PAD.t + (1 - (y - yMin) / (yMax - yMin)) * (H - PAD.t - PAD.b);
    const ticks = [0, 0.5, 1].map((t) => yMin + (yMax - yMin) * t);
    return { sx, sy, ticks, xMin, xMax };
  }, [data, reference]);

  if (!geometry) {
    return (
      <figure className="space-y-1">
        <figcaption className="text-sm font-semibold">{title}</figcaption>
        <p className="rounded-md border border-dashed border-border/60 p-3 text-xs text-muted-foreground">{emptyText}</p>
      </figure>
    );
  }

  const { sx, sy, ticks, xMin, xMax } = geometry;
  const path = data.map((d, i) => `${i === 0 ? "M" : "L"}${sx(d.x).toFixed(1)},${sy(d.y).toFixed(1)}`).join(" ");
  const last = data[data.length - 1];
  const active = hover !== null ? data[hover] : null;

  const onMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * W;
    let best = 0;
    let bestDist = Infinity;
    data.forEach((d, i) => {
      const dist = Math.abs(sx(d.x) - x);
      if (dist < bestDist) {
        best = i;
        bestDist = dist;
      }
    });
    setHover(best);
  };

  return (
    <figure className="space-y-1">
      <figcaption className="text-sm font-semibold">{title}</figcaption>
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full touch-none"
          role="img"
          aria-label={ariaLabel}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.l} x2={W - PAD.r} y1={sy(t)} y2={sy(t)} className="stroke-border" strokeWidth={1} />
              <text x={PAD.l - 5} y={sy(t) + 3} textAnchor="end" className="fill-muted-foreground" fontSize={9}>
                {yFormat(Math.round(t * 10) / 10)}
              </text>
            </g>
          ))}
          {reference && (
            <g>
              <line x1={PAD.l} x2={W - PAD.r} y1={sy(reference.y)} y2={sy(reference.y)} className="stroke-muted-foreground" strokeWidth={1} />
              <text x={W - PAD.r} y={sy(reference.y) - 3} textAnchor="end" className="fill-muted-foreground" fontSize={9}>
                {reference.label}
              </text>
            </g>
          )}
          <text x={PAD.l} y={H - 6} className="fill-muted-foreground" fontSize={9}>{xMin}</text>
          <text x={W - PAD.r} y={H - 6} textAnchor="end" className="fill-muted-foreground" fontSize={9}>{xMax}</text>
          <text x={(PAD.l + W - PAD.r) / 2} y={H - 6} textAnchor="middle" className="fill-muted-foreground" fontSize={9}>{xLabel}</text>

          <path d={path} fill="none" className="stroke-primary" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

          {/* current value: direct label at the line's end */}
          <circle cx={sx(last.x)} cy={sy(last.y)} r={4.5} className="fill-primary stroke-card" strokeWidth={2} />
          <text x={sx(last.x) - 7} y={sy(last.y) - 8} textAnchor="end" className="fill-foreground" fontSize={10} fontWeight={600}>
            {yFormat(last.y)}
          </text>

          {active && (
            <g pointerEvents="none">
              <line x1={sx(active.x)} x2={sx(active.x)} y1={PAD.t} y2={H - PAD.b} className="stroke-muted-foreground" strokeWidth={1} />
              <circle cx={sx(active.x)} cy={sy(active.y)} r={4.5} className="fill-primary stroke-card" strokeWidth={2} />
            </g>
          )}
        </svg>
        {active && (
          <div
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md"
            style={{
              left: `${Math.min(88, Math.max(12, (sx(active.x) / W) * 100))}%`,
              top: `${(sy(active.y) / H) * 100 - 4}%`,
            }}
          >
            {tooltip(active)}
          </div>
        )}
      </div>
      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer">Als Tabelle anzeigen</summary>
        <table className="mt-1 w-full" aria-describedby={id}>
          <thead>
            <tr>
              <th className="text-left font-semibold">{tableHeaders[0]}</th>
              <th className="text-right font-semibold">{tableHeaders[1]}</th>
            </tr>
          </thead>
          <tbody>
            {data.slice(-30).map((d) => (
              <tr key={d.x}>
                <td>{d.x}</td>
                <td className="text-right tabular-nums">{yFormat(d.y)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <span id={id} className="sr-only">{title}, letzte 30 Werte</span>
      </details>
    </figure>
  );
}
