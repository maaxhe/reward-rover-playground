import { useMemo } from "react";
import { LineChart, type Point } from "@/components/RL/LineChart";
import { ParamTimeline } from "@/pages/classroom/ParamTimeline";
import {
  diagnose,
  movingAverage,
  segmentBySettings,
  toParamLog,
  type HintId,
} from "@/lib/rl/trainingInsights";
import type { EpisodeStats } from "@/lib/rl/types";

interface Props {
  history: EpisodeStats[];
  translate: (de: string, en: string) => string;
}

const SMOOTHING_WINDOW = 5;
/** A setting needs a few episodes before its average says anything. */
const MIN_EPISODES_FOR_BEST = 3;
const MAX_TABLE_ROWS = 5;

const HINTS: Record<HintId, [string, string]> = {
  "need-data": [
    "Lass den Rover mit einer Einstellung mindestens 5–10 Episoden laufen, dann kann ich etwas dazu sagen.",
    "Let the rover run at least 5–10 episodes with one setting, then I can say something about it.",
  ],
  improving: [
    "Die Wege werden kürzer: Der Rover lernt gerade mit dieser Einstellung. Nicht anfassen.",
    "Routes are getting shorter: the rover is learning with this setting. Leave it alone.",
  ],
  stuck: [
    "Die Kurve ist flach geblieben. Entweder hat der Rover seinen Weg schon, oder er kommt nicht weiter. Prüfe ε (probiert er noch Neues?) und γ (sieht er das Ziel überhaupt?).",
    "The curve stayed flat. Either the rover already has its route or it is stuck. Check ε (is it still trying new things?) and γ (can it see the goal at all?).",
  ],
  worse: [
    "Die Wege werden länger statt kürzer. Das passiert oft, wenn ε hoch oder α sehr groß ist: Der Rover vergisst Gelerntes oder rennt zu viel zufällig herum.",
    "Routes are getting longer instead of shorter. That often happens with a high ε or a very large α: the rover forgets what it learned or wanders too randomly.",
  ],
  jumpy: [
    "Die Kurve springt stark von Episode zu Episode. Ein kleineres ε und α macht sie ruhiger.",
    "The curve jumps a lot from episode to episode. A smaller ε and α will calm it down.",
  ],
  "eps-high": [
    "ε ist hoch: Mehr als jeder zweite Schritt ist Zufall. Gut zum Erkunden am Anfang, aber der Rover kann sein Wissen kaum nutzen. Senke ε, sobald er das Ziel einmal gefunden hat.",
    "ε is high: more than every second step is random. Good for exploring early on, but the rover can barely use what it knows. Lower ε once it has found the goal.",
  ],
  "eps-low": [
    "ε ist sehr niedrig: Der Rover bleibt fast immer bei dem, was er schon kennt. Wenn es nicht besser wird, erhöhe ε kurz, damit er neue Wege findet.",
    "ε is very low: the rover almost always sticks to what it knows. If it is not improving, raise ε for a while so it finds new routes.",
  ],
  "alpha-high": [
    "α ist groß: Jede neue Erfahrung überschreibt viel vom alten Wissen. Das macht die Werte unruhig.",
    "α is large: every new experience overwrites a lot of the old knowledge. That makes the values unstable.",
  ],
  "alpha-low": [
    "α ist sehr klein: Der Rover lernt sicher, aber langsam. Du brauchst viele Episoden.",
    "α is very small: the rover learns safely but slowly. You need a lot of episodes.",
  ],
  "gamma-low": [
    "γ ist klein: Der Rover denkt kurzsichtig, ein weit entferntes Ziel zählt kaum. Bei langen Wegen erhöhe γ.",
    "γ is small: the rover is short-sighted, a distant goal barely counts. For long routes, raise γ.",
  ],
  "gamma-high": [
    "γ ist sehr hoch: Der Rover plant weit voraus, braucht aber länger, bis sich der Wert bis zum Start durchgesprochen hat.",
    "γ is very high: the rover plans far ahead, but it takes longer for the value to spread back to the start.",
  ],
};

const fmt = (v: number, digits = 2) => v.toFixed(digits).replace(/\.?0+$/, "");

/**
 * Training curves plus a reading guide: how long each run took, which ε/α/γ it ran with, how well
 * each setting did, and what the numbers suggest. Built so you can see what a slider actually does.
 */
export function TrainingInsights({ history, translate: t }: Props) {
  const view = useMemo(() => {
    const steps = history.map((e) => e.steps);
    const smooth = movingAverage(steps, SMOOTHING_WINDOW);
    const raw: Point[] = history.map((e) => ({ x: e.episode, y: e.steps }));
    const avg: Point[] = history.map((e, i) => ({ x: e.episode, y: Math.round(smooth[i] * 10) / 10 }));
    const segments = segmentBySettings(history);
    const eligible = segments.filter((s) => s.episodes >= MIN_EPISODES_FOR_BEST);
    const best = eligible.length > 1 ? eligible.reduce((a, b) => (b.avgSteps < a.avgSteps ? b : a)) : null;
    return { raw, avg, segments, best, hints: diagnose(history), log: toParamLog(history) };
  }, [history]);

  if (history.length === 0) return null;

  const last = history[history.length - 1];
  const rows = view.segments.slice(-MAX_TABLE_ROWS);
  const hasSettings = view.log.length > 0;

  return (
    <div className="space-y-5">
      <LineChart
        title={t("Schritte pro Episode (weniger = besser)", "Steps per episode (fewer = better)")}
        ariaLabel={t(
          `Schritte pro Episode. Letzte Episode: ${last.steps} Schritte.`,
          `Steps per episode. Last episode: ${last.steps} steps.`,
        )}
        data={view.raw}
        overlay={{ data: view.avg, label: t(`Gleitender Schnitt (${SMOOTHING_WINDOW} Episoden)`, `Moving average (${SMOOTHING_WINDOW} episodes)`) }}
        xLabel={t("Episode", "Episode")}
        emptyText={t("Nach zwei Episoden erscheint hier deine Lernkurve.", "Your learning curve appears here after two episodes.")}
        tooltip={(p) => t(`Episode ${p.x}: ${p.y} Schritte`, `Episode ${p.x}: ${p.y} steps`)}
        tableHeaders={[t("Episode", "Episode"), t("Schritte", "Steps")]}
      />

      {hasSettings && (
        <section className="space-y-1">
          <h4 className="text-sm font-semibold">{t("Deine Einstellungen im Verlauf", "Your settings over time")}</h4>
          <ParamTimeline
            log={view.log}
            lastEpisode={last.episode}
            labels={[t("ε Neugier", "ε exploration"), t("α Lernrate", "α learning rate"), t("γ Weitsicht", "γ foresight")]}
            ariaLabel={t(
              `Verlauf von ε, α und γ über ${last.episode} Episoden, ${view.log.length - 1} Änderungen`,
              `ε, α and γ over ${last.episode} episodes, ${view.log.length - 1} changes`,
            )}
          />
          <p className="text-xs text-muted-foreground">
            {t(
              "Dreh an einem Regler und schau, was die Kurve darüber danach macht.",
              "Move a slider and watch what the curve above does afterwards.",
            )}
          </p>
        </section>
      )}

      {rows.length > 1 && (
        <section className="space-y-1">
          <h4 className="text-sm font-semibold">{t("Welche Einstellung lief wie gut?", "How well did each setting do?")}</h4>
          <table className="w-full text-xs">
            <thead className="text-muted-foreground">
              <tr>
                <th className="text-left font-medium">ε / α / γ</th>
                <th className="text-right font-medium">{t("Episoden", "Episodes")}</th>
                <th className="text-right font-medium">{t("Ø Schritte", "Avg. steps")}</th>
                <th className="text-right font-medium">{t("Ø Reward", "Avg. reward")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => {
                const isBest = view.best === s;
                return (
                  <tr key={s.from} className={isBest ? "font-semibold text-foreground" : "text-muted-foreground"}>
                    <td className="py-0.5 tabular-nums">
                      {fmt(s.epsilon)} / {fmt(s.alpha)} / {fmt(s.gamma)}
                    </td>
                    <td className="text-right tabular-nums">{s.episodes}</td>
                    <td className="text-right tabular-nums">
                      {s.avgSteps.toFixed(1)}
                      {isBest && <span className="ml-1">{t("← beste", "← best")}</span>}
                    </td>
                    <td className="text-right tabular-nums">{Math.round(s.avgReward)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      <section className="space-y-1">
        <h4 className="text-sm font-semibold">{t("Was die Kurve gerade sagt", "What the curve says right now")}</h4>
        <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
          {view.hints.map((id) => (
            <li key={id}>{t(...HINTS[id])}</li>
          ))}
        </ul>
      </section>

      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer font-medium text-foreground">{t("Was machen ε, α und γ?", "What do ε, α and γ do?")}</summary>
        <dl className="mt-1 space-y-1">
          <div>
            <dt className="inline font-semibold text-foreground">ε </dt>
            <dd className="inline">
              {t(
                "– Neugier: Anteil der Schritte, die zufällig statt nach bestem Wissen gewählt werden. Hoch = viel Erkunden, niedrig = Wissen nutzen.",
                "– exploration: share of steps chosen at random instead of by best knowledge. High = explore, low = exploit.",
              )}
            </dd>
          </div>
          <div>
            <dt className="inline font-semibold text-foreground">α </dt>
            <dd className="inline">
              {t(
                "– Lernrate: Wie stark eine neue Erfahrung das alte Wissen überschreibt. Groß = schnell, aber unruhig.",
                "– learning rate: how strongly a new experience overwrites old knowledge. Large = fast but unstable.",
              )}
            </dd>
          </div>
          <div>
            <dt className="inline font-semibold text-foreground">γ </dt>
            <dd className="inline">
              {t(
                "– Weitsicht: Wie viel späterer Reward heute noch zählt. Nahe 1 = plant weit voraus, nahe 0 = nur das Nächste zählt.",
                "– foresight: how much later reward still counts today. Near 1 = plans far ahead, near 0 = only the next step counts.",
              )}
            </dd>
          </div>
        </dl>
      </details>
    </div>
  );
}
