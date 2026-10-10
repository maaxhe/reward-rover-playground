import { Card } from "@/components/ui/card";
import { LineChart, type Point } from "@/components/RL/LineChart";

export interface EpisodeRecord {
  episode: number;
  steps: number;
  reward: number;
}

export interface TestRecord {
  episode: number;
  reward: number;
  reachedGoal: boolean;
}

interface Props {
  episodes: EpisodeRecord[];
  tests: TestRecord[];
  /** Length of the shortest possible path, drawn as a reference line. */
  shortest: number;
  /** Server-side best so far, if any. */
  bestServerReward: number | null;
}

const avg = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);
const fmt = (v: number | null, digits = 0) => (v === null ? "–" : v.toFixed(digits).replace(".", ","));

/** What a student sees about their own training: four numbers and two learning curves. */
export function TrainingStats({ episodes, tests, shortest, bestServerReward }: Props) {
  const last10 = episodes.slice(-10);
  const bestSteps = episodes.length ? Math.min(...episodes.map((e) => e.steps)) : null;
  const bestReward = episodes.length ? Math.max(...episodes.map((e) => e.reward)) : null;
  const stepData: Point[] = episodes.map((e) => ({ x: e.episode, y: e.steps }));
  const testData: Point[] = tests.map((t) => ({ x: t.episode, y: t.reward }));
  const latestTest = tests[tests.length - 1];

  const tiles: Array<{ label: string; value: string; note?: string }> = [
    { label: "Ø Schritte (letzte 10)", value: fmt(avg(last10.map((e) => e.steps)), 1), note: `Ideal: ${shortest}` },
    { label: "Kürzester Lauf", value: bestSteps === null ? "–" : `${bestSteps}`, note: "Schritte" },
    { label: "Bester Lauf", value: bestReward === null ? "–" : fmt(bestReward, 0), note: "Punkte beim Training" },
    {
      label: "Test-Score jetzt",
      value: latestTest ? `${latestTest.reward}` : "–",
      note: latestTest ? (latestTest.reachedGoal ? "Ziel erreicht" : "Ziel nicht erreicht") : undefined,
    },
  ];

  return (
    <Card className="space-y-4 rounded-lg border-border/40 bg-card/60 p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide">Deine Statistik</h2>

      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-lg border border-border/50 bg-background/60 p-2.5">
            <dt className="text-xs text-muted-foreground">{tile.label}</dt>
            <dd className="text-2xl font-bold tabular-nums leading-tight">{tile.value}</dd>
            {tile.note && <p className="text-xs text-muted-foreground">{tile.note}</p>}
          </div>
        ))}
      </dl>

      <LineChart
        title="Schritte pro Episode (weniger ist besser)"
        ariaLabel={`Schritte pro Episode. Letzte Episode: ${stepData[stepData.length - 1]?.y ?? "keine"} Schritte, kürzester möglicher Weg: ${shortest}.`}
        data={stepData}
        xLabel="Episode"
        reference={{ y: shortest, label: `kürzester Weg: ${shortest}` }}
        emptyText="Starte das Training, dann erscheint hier deine Lernkurve."
        tooltip={(p) => `Episode ${p.x}: ${p.y} Schritte`}
        tableHeaders={["Episode", "Schritte"]}
      />

      <LineChart
        title="Test-Score über das Training (höher ist besser)"
        ariaLabel={`Test-Score im Verlauf. Aktuell: ${latestTest?.reward ?? "noch keiner"} Punkte.`}
        data={testData}
        xLabel="Episode"
        emptyText="Nach ein paar Episoden siehst du, wie gut dein Rover im Test wäre."
        tooltip={(p) => `Nach Episode ${p.x}: ${p.y} Punkte im Test`}
        tableHeaders={["Episode", "Test-Score"]}
      />

      {bestServerReward !== null && (
        <p className="text-xs text-muted-foreground">
          Beste Wertung auf dem Server: <b className="text-foreground">{bestServerReward} Punkte</b>
        </p>
      )}
    </Card>
  );
}
