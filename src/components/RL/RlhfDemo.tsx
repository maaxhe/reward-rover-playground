import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Answer = { de: string; en: string; quality: number };

const PROMPT = { de: "Erkläre in einem Satz: Was ist ein Rover?", en: "Explain in one sentence: what is a rover?" };

const ANSWERS: Answer[] = [
  { de: "Ein Rover ist ein kleiner Roboter, der durch Ausprobieren lernt, wie er sein Ziel erreicht.", en: "A rover is a small robot that learns by trial and error how to reach its goal.", quality: 3 },
  { de: "Rover. Roboter. Fertig.", en: "Rover. Robot. Done.", quality: 1 },
  { de: "Also, äh, ein Rover ist, wie soll ich sagen, in der Geschichte gab es da ja ganz viele verschiedene …", en: "Well, um, a rover is, how shall I put it, throughout history there were so many different …", quality: 0 },
  { de: "Ein Rover ist ein Haustier mit vier Beinen.", en: "A rover is a pet with four legs.", quality: 0 },
];

const softmax = (scores: number[]) => {
  const exps = scores.map((s) => Math.exp(s));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
};

const sample = (probs: number[], exclude?: number) => {
  const weights = probs.map((p, i) => (i === exclude ? 0 : p));
  let r = Math.random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return weights.length - 1;
};

const drawPair = (scores: number[]): [number, number] => {
  const probs = softmax(scores);
  const a = sample(probs);
  return [a, sample(probs, a)];
};

const STEP = 0.7;

/** Tiny RLHF toy: the "model" shows two answers, a human picks one, and the picked style becomes more likely. */
export function RlhfDemo({ translate: t }: { translate: (de: string, en: string) => string }) {
  const [scores, setScores] = useState<number[]>(() => ANSWERS.map(() => 0));
  const [pair, setPair] = useState<[number, number]>(() => drawPair(ANSWERS.map(() => 0)));
  const [rounds, setRounds] = useState(0);
  const [touched, setTouched] = useState(false);

  const probs = softmax(scores);

  const choose = (winner: number, loser: number, from: number[] = scores) => {
    const next = from.map((s, i) => (i === winner ? s + STEP : i === loser ? s - STEP : s));
    return next;
  };

  const pick = (winner: number) => {
    setTouched(true);
    const loser = winner === pair[0] ? pair[1] : pair[0];
    const next = choose(winner, loser);
    setScores(next);
    setRounds((r) => r + 1);
    setPair(drawPair(next));
  };

  const autoRounds = () => {
    setTouched(true);
    let cur = scores;
    let p = pair;
    for (let i = 0; i < 10; i++) {
      const [a, b] = p;
      const better = ANSWERS[a].quality >= ANSWERS[b].quality ? a : b;
      cur = choose(better, better === a ? b : a, cur);
      p = drawPair(cur);
    }
    setScores(cur);
    setRounds((r) => r + 10);
    setPair(p);
  };

  const reset = () => {
    const zero = ANSWERS.map(() => 0);
    setScores(zero);
    setPair(drawPair(zero));
    setRounds(0);
  };

  const steps = [
    { icon: "💬", de: "Das Modell antwortet", en: "The model answers" },
    { icon: "👍", de: "Ein Mensch wählt die bessere Antwort", en: "A human picks the better answer" },
    { icon: "🏆", de: "Das gibt Belohnung", en: "That earns reward" },
    { icon: "📈", de: "Gute Antworten werden wahrscheinlicher", en: "Good answers become more likely" },
  ];

  return (
    <div className="space-y-5 rounded-lg border border-border bg-secondary/30 p-5">
      <ol className="grid gap-2 sm:grid-cols-4">
        {steps.map((s, i) => (
          <li key={s.de} className="flex items-center gap-3 rounded-xl bg-background/60 p-3 text-sm font-semibold">
            <span className="text-2xl" aria-hidden>{s.icon}</span>
            <span><span className="mr-1 text-muted-foreground">{i + 1}.</span>{t(s.de, s.en)}</span>
          </li>
        ))}
      </ol>

      <div className="rounded-xl bg-background/60 p-4 text-base">
        <span className="text-muted-foreground">{t("Frage an das Modell:", "Question to the model:")}</span>{" "}
        <strong className="text-foreground">{t(PROMPT.de, PROMPT.en)}</strong>
      </div>

      <div className="space-y-2">
        <p className={cn("text-sm font-semibold", !touched && "text-primary")}>
          {t("👉 Welche Antwort ist besser? Klick sie an.", "👉 Which answer is better? Click it.")}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {pair.map((idx, slot) => (
            <button
              key={`${rounds}-${slot}`}
              type="button"
              onClick={() => pick(idx)}
              className={cn(
                "rounded-xl border border-border bg-background/70 p-4 text-left text-base leading-7 transition-colors hover:border-primary hover:bg-primary/10",
                !touched && "tutorial-spotlight",
              )}
            >
              <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground">{slot === 0 ? "A" : "B"}</span>
              {t(ANSWERS[idx].de, ANSWERS[idx].en)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
          {t("So wahrscheinlich gibt das Modell jetzt jede Antwort", "How likely the model is to give each answer now")}
        </p>
        {ANSWERS.map((a, i) => (
          <div key={a.de} className="grid grid-cols-[1fr_3rem] items-center gap-3 text-sm">
            <div className="space-y-1">
              <p className="truncate text-foreground/80">{t(a.de, a.en)}</p>
              <div className="h-3 overflow-hidden rounded-full bg-background/80">
                <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${Math.round(probs[i] * 100)}%` }} />
              </div>
            </div>
            <span className="text-right font-bold text-primary">{Math.round(probs[i] * 100)}%</span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={autoRounds}>
          {t("10 Runden wie ein Mensch bewerten", "Rate 10 rounds like a human")}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={reset}>
          {t("Von vorn", "Start over")}
        </Button>
        <span className="ml-auto text-sm text-muted-foreground">{t("Bewertungen", "Ratings")}: {rounds}</span>
      </div>

      <p className="text-base leading-7 text-foreground/80">
        {rounds === 0
          ? t("Am Anfang ist dem Modell jede Antwort gleich recht. Es hat noch keine Belohnung bekommen.", "At the start every answer is equally fine to the model. It has not been rewarded yet.")
          : probs[0] > 0.6
            ? t("Nach genug Bewertungen gibt das Modell fast immer die hilfreiche Antwort. Genau so wird aus einem Textgenerator ein Assistent.", "After enough ratings the model almost always gives the helpful answer. That is how a text generator becomes an assistant.")
            : t("Jede Wahl wirkt wie die Belohnung beim Rover: Was gelobt wird, wird häufiger. Weiter bewerten!", "Every pick works like the rover's reward: what gets praised becomes more frequent. Keep rating!")}
      </p>
    </div>
  );
}
