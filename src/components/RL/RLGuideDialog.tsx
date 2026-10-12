import { useRef, useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RealRobots } from "@/components/RL/RealRobots";
import { GuideDemo } from "@/components/RL/GuideDemo";
import { RlhfDemo } from "@/components/RL/RlhfDemo";
import { DEMO_WORLD } from "@/components/landing/LiveRover";
import { useLanguage } from "@/contexts/LanguageContext";
import type { CompetitionWorld } from "@/lib/competition/world";

/** Candy right next to the start, the goal far away: how far ahead the rover looks decides where it ends up. */
const FORESIGHT_WORLD: CompetitionWorld = {
  size: 7,
  agent: { x: 0, y: 3 },
  goal: { x: 6, y: 3 },
  tiles: [
    { x: 1, y: 2, type: "reward" },
    { x: 1, y: 4, type: "reward" },
    { x: 3, y: 3, type: "obstacle" },
    { x: 3, y: 2, type: "obstacle" },
    { x: 3, y: 4, type: "obstacle" },
  ],
};

const CHAPTERS = [
  { id: "idee", de: "Grundidee", en: "Basic idea" },
  { id: "restaurant", de: "Restaurant-Problem", en: "Restaurant problem" },
  { id: "epsilon", de: "ε Neugier", en: "ε Curiosity" },
  { id: "alpha", de: "α Lernrate", en: "α Learning rate" },
  { id: "gamma", de: "γ Weitsicht", en: "γ Foresight" },
  { id: "formel", de: "Die Formel", en: "The formula" },
  { id: "llm", de: "KI-Chat & RLHF", en: "AI chat & RLHF" },
  { id: "alltag", de: "Im Alltag", en: "Real life" },
] as const;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  translate: (de: string, en: string) => string;
}

const Shape = ({ kind }: { kind: "rr-rover" | "rr-candy" | "rr-trap" | "rr-goal" }) => (
  <span className="rr-cell relative inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md" aria-hidden>
    <span className={kind} />
  </span>
);

const Section = ({ id, title, children }: { id: string; title: string; children: ReactNode }) => (
  <section id={`guide-${id}`} className="scroll-mt-6 space-y-5">
    <h3 className="text-3xl font-extrabold tracking-tight text-foreground">{title}</h3>
    <div className="space-y-5 text-lg leading-8 text-foreground/80">{children}</div>
  </section>
);

const Dial = ({ symbol, name, line, tip }: { symbol: string; name: string; line: string; tip: string }) => (
  <div className="grid gap-x-5 gap-y-1 rounded-2xl border border-border bg-secondary/40 p-5 sm:grid-cols-[4.5rem_1fr]">
    <div className="text-5xl font-extrabold leading-none text-primary">{symbol}</div>
    <div className="space-y-1">
      <h4 className="text-xl font-bold text-foreground">{name}</h4>
      <p>{line}</p>
      <p className="text-base text-muted-foreground">{tip}</p>
    </div>
  </div>
);

/** The long-form "what is reinforcement learning" guide, written as a short article rather than an accordion. */
export function RLGuideDialog({ open, onOpenChange, translate: t }: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const go = (id: string) => scroller.current?.querySelector(`#guide-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[94vh] w-[96vw] max-w-6xl gap-0 overflow-hidden rounded-3xl p-0">
        <nav className="hidden w-52 flex-shrink-0 flex-col gap-1 border-r border-border bg-secondary/30 p-5 pt-10 lg:flex" aria-label={t("Kapitel", "Chapters")}>
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">{t("Kapitel", "Chapters")}</p>
          {CHAPTERS.map((c, i) => (
            <button
              key={c.id}
              type="button"
              onClick={() => go(c.id)}
              className="rounded-lg px-3 py-2 text-left text-sm font-semibold text-foreground/80 transition-colors hover:bg-primary/15 hover:text-foreground"
            >
              <span className="mr-2 text-muted-foreground">{i + 1}</span>
              {t(c.de, c.en)}
            </button>
          ))}
        </nav>
        <div ref={scroller} className="min-w-0 flex-1 space-y-16 overflow-y-auto overflow-x-hidden px-5 py-8 sm:px-10 sm:py-10">
          <header className="space-y-3">
            <DialogTitle className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              {t("Wie ein Rover lernt, ohne dass ihm jemand den Weg zeigt", "How a rover learns without anyone showing it the way")}
            </DialogTitle>
            <DialogDescription className="text-lg leading-8 text-muted-foreground">
              {t(
                "Zehn Minuten Lesezeit, keine Vorkenntnisse nötig. Die Rover unten laufen wirklich: Du kannst an den Reglern drehen und sofort sehen, was passiert.",
                "Ten minutes of reading, no background needed. The rovers below really run: turn the dials and see what happens right away.",
              )}
            </DialogDescription>
          </header>

          <Section id="idee" title={t("Die Grundidee: Ausprobieren und merken", "The basic idea: try things and remember")}>
            <p>
              {t(
                "Der Rover bekommt keine Landkarte und keine Anleitung. Er darf nur Schritte machen und merkt danach, ob es sich gelohnt hat. Eine Süßigkeit auf dem Feld gibt Punkte, eine Falle kostet Punkte, und jeder Schritt kostet ein bisschen Zeit.",
                "The rover gets no map and no instructions. It can only take steps and then notice whether it paid off. Candy on a tile earns points, a trap costs points, and every step costs a little time.",
              )}
            </p>
            <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-secondary/40 p-4 text-base">
              <span className="flex items-center gap-3"><Shape kind="rr-candy" /> {t("gibt Punkte", "earns points")}</span>
              <span className="flex items-center gap-3"><Shape kind="rr-trap" /> {t("kostet Punkte", "costs points")}</span>
              <span className="flex items-center gap-3"><Shape kind="rr-goal" /> {t("das Ziel, die größte Belohnung", "the goal, the biggest reward")}</span>
            </div>
            <p>
              {t(
                "Nach vielen Runden hat er sich gemerkt, welcher Schritt auf welchem Feld sich langfristig am meisten lohnt. Genau diese Merkliste nennt man Q-Tabelle, und die Pfeile im Spielfeld zeigen dir, was gerade darin steht.",
                "After many runs it has remembered which step on which tile pays off most in the long run. That list of memories is called the Q-table, and the arrows on the board show you what is in it right now.",
              )}
            </p>
            <GuideDemo
              world={DEMO_WORLD}
              initial={{ epsilon: 0.25, alpha: 0.4, gamma: 0.95 }}
              nudge={{ de: "Schau zu, wie nach und nach Pfeile erscheinen. Mit „Schneller“ oder „Von vorn“ kannst du das Lernen beschleunigen oder neu starten.", en: "Watch the arrows appear one by one. “Faster” and “Start over” let you speed up or restart the learning." }}
              translate={t}
              caption={({ episode, lastSteps, shortest }) =>
                episode === 0
                  ? t("Der Rover kennt die Welt noch nicht und probiert einfach los. Schau zu, wie nach und nach Pfeile erscheinen.", "The rover knows nothing yet and just tries things. Watch the arrows appear one by one.")
                  : t(
                      `Runde ${episode}: ${lastSteps} Schritte bis zum Ziel, der kürzeste Weg wären ${shortest}. Die Pfeile zeigen, was er bisher für den besten Schritt hält.`,
                      `Run ${episode}: ${lastSteps} steps to the goal, the shortest path is ${shortest}. The arrows show what it currently thinks is the best step.`,
                    )
              }
            />
          </Section>

          <Section id="restaurant" title={t("Das Restaurant-Problem", "The restaurant problem")}>
            <p>
              {t(
                "Stell dir vor, du gehst jeden Tag in dasselbe Restaurant. Bestellst du immer dein Lieblingsgericht, bist du auf der sicheren Seite. Probierst du etwas Neues, ist es vielleicht enttäuschend, aber vielleicht ist es dein neues Lieblingsessen.",
                "Imagine going to the same restaurant every day. If you always order your favourite, you are safe. If you try something new, it might disappoint you, or it might become your new favourite.",
              )}
            </p>
            <p>
              {t(
                "Dieses Hin und Her heißt in der Fachsprache Ausnutzen und Erkunden. Jedes Lernsystem muss es lösen, und genau darum geht es bei den drei Reglern im Spiel.",
                "Researchers call this tension exploiting versus exploring. Every learning system has to deal with it, and it is exactly what the three dials in the game are about.",
              )}
            </p>
          </Section>

          <Section id="epsilon" title={t("ε: Wie neugierig ist der Rover?", "ε: How curious is the rover?")}>
            <Dial
              symbol="ε"
              name={t("Neugier (Epsilon, in der Fachsprache „Exploration“)", "Curiosity (epsilon, technically “exploration”)")}
              line={t(
                "Wie oft folgt der Rover einer Laune statt seinem Wissen? Bei 0,2 geht er jeden fünften Schritt in eine zufällige Richtung. Wie im Restaurant: Meist bestellst du dein Lieblingsgericht, aber ab und zu probierst du etwas Neues.",
                "How often does the rover follow a whim instead of what it knows? At 0.2 it takes a random step every fifth move. Like in a restaurant: usually you order your favourite, but now and then you try something new.",
              )}
              tip={t(
                "Zu niedrig: Er bleibt auf dem ersten Weg hängen, den er findet. Zu hoch: Er irrt weiter herum, obwohl er den Weg längst kennt.",
                "Too low: it sticks to the first path it finds. Too high: it keeps wandering even though it already knows the way.",
              )}
            />
            <GuideDemo
              world={DEMO_WORLD}
              initial={{ epsilon: 0.8, alpha: 0.5, gamma: 0.95 }}
              nudge={{ de: "Zieh die Neugier ε auf 0 und schau, ob der Rover bei einem schlechten Weg hängen bleibt. Dann auf 1: lernt er noch etwas?", en: "Drag curiosity ε to 0 and see whether the rover gets stuck on a poor path. Then to 1: does it still learn anything?" }}
              dials={["epsilon"]}
              translate={t}
              caption={({ settings, episode }) =>
                episode < 3
                  ? t("Zieh ε hin und her und schau auf die Schritte pro Runde.", "Move ε back and forth and watch the steps per run.")
                  : settings.epsilon > 0.6
                    ? t("Sehr neugierig: Der Rover torkelt viel herum, auch wenn er den Weg schon ahnt. Die Rundenzeiten bleiben lang.", "Very curious: the rover stumbles around a lot even when it senses the way. Run times stay long.")
                    : settings.epsilon < 0.05
                      ? t("Fast gar nicht neugierig: Er hält an dem fest, was er zuerst gefunden hat. Das kann ein Umweg sein.", "Hardly curious at all: it clings to whatever it found first. That may be a detour.")
                      : t("Eine Prise Neugier: meist dem Wissen folgen, ab und zu etwas Neues probieren.", "A pinch of curiosity: mostly follow what it knows, now and then try something new.")
              }
            />
          </Section>

          <Section id="alpha" title={t("α: Wie schnell lernt der Rover um?", "α: How fast does the rover change its mind?")}>
            <Dial
              symbol="α"
              name={t("Lernrate (Alpha)", "Learning rate (alpha)")}
              line={t(
                "Wie stark überschreibt eine neue Erfahrung das, was der Rover schon wusste? Bei 1 vergisst er das Alte sofort, bei 0,1 ändert er seine Meinung nur ein bisschen.",
                "How strongly does a new experience overwrite what the rover already knew? At 1 it forgets the old at once, at 0.1 it changes its mind only a little.",
              )}
              tip={t(
                "In einer Welt, die sich nie ändert, darf α hoch sein. Wackelige Erfahrungen glättet ein kleiner Wert.",
                "In a world that never changes, α can be high. A small value smooths out unreliable experiences.",
              )}
            />
            <GuideDemo
              world={DEMO_WORLD}
              initial={{ epsilon: 0.2, alpha: 0.05, gamma: 0.95 }}
              nudge={{ de: "Zieh die Lernrate α hoch und runter und vergleiche, wie schnell die Schritte pro Runde sinken.", en: "Drag the learning rate α up and down and compare how fast the steps per run drop." }}
              dials={["alpha"]}
              translate={t}
              caption={({ settings }) =>
                settings.alpha < 0.15
                  ? t("Kleines α: Die Pfeile erscheinen langsam und vorsichtig. Es dauert, bis sich der Rover sicher ist.", "Small α: arrows appear slowly and cautiously. It takes a while until the rover is sure.")
                  : settings.alpha > 0.8
                    ? t("Großes α: Jede neue Erfahrung überschreibt fast alles. Schnell gelernt, aber die Pfeile springen leicht um.", "Large α: every new experience overwrites almost everything. Quick to learn, but arrows flip easily.")
                    : t("Mittleres α: ein guter Mittelweg zwischen schnell und stabil. Drück „Von vorn“ und vergleiche die Anzahl Runden bis zum Bestwert.", "Medium α: a good balance of fast and steady. Press “Start over” and compare how many runs it takes to reach the best.")
              }
            />
          </Section>

          <Section id="gamma" title={t("γ: Wie weit denkt der Rover voraus?", "γ: How far ahead does the rover think?")}>
            <Dial
              symbol="γ"
              name={t("Weitsicht (Gamma, auch „Discount-Faktor“)", "Foresight (gamma, also “discount factor”)")}
              line={t(
                "Wie viel zählt für den Rover, was erst später kommt? Bei 0,9 lohnt sich ein Umweg, wenn am Ende das Ziel wartet. Bei 0 denkt er nur an das Feld direkt vor sich.",
                "How much does the rover care about what comes later? At 0.9 a detour is worth it if the goal waits at the end. At 0 it only thinks about the tile right in front of it.",
              )}
              tip={t(
                "Ein kleines γ macht den Rover zum Naschkatzen: Die nahe Süßigkeit schlägt das ferne Ziel.",
                "A small γ turns the rover into a sweet tooth: the nearby candy beats the distant goal.",
              )}
            />
            <GuideDemo
              world={FORESIGHT_WORLD}
              initial={{ epsilon: 0.3, alpha: 0.5, gamma: 0.1 }}
              nudge={{ de: "Zieh die Weitsicht γ auf 0 und dann auf 1. Läuft der Rover zum Bonbon oder zum Ziel?", en: "Drag foresight γ to 0 and then to 1. Does the rover go for the candy or for the goal?" }}
              dials={["gamma"]}
              consumeRewards={false}
              translate={t}
              caption={({ settings }) =>
                settings.gamma < 0.3
                  ? t("Kleines γ: Die Pfeile reichen nur bis zu den Süßigkeiten neben dem Start. Das ferne Ziel ist für ihn unsichtbar.", "Small γ: the arrows only reach the candy next to the start. The distant goal is invisible to it.")
                  : settings.gamma > 0.8
                    ? t("Großes γ: Das Wissen über das Ziel wandert Feld für Feld rückwärts bis zum Start. Jetzt lohnt sich der Weg.", "Large γ: knowledge about the goal travels tile by tile back to the start. Now the trip is worth it.")
                    : t("Dreh γ langsam hoch und beobachte, wie weit die Pfeile in Richtung Ziel wachsen. Mit „Von vorn“ startest du neu.", "Slowly raise γ and watch how far the arrows grow towards the goal. “Start over” resets.")
              }
            />
          </Section>

          <Section id="formel" title={t("Was bei jedem Schritt passiert", "What happens on every step")}>
            <p>
              {t(
                "Nach jedem Schritt aktualisiert der Rover seine Merkliste mit einer einzigen Regel. In Worten: neuer Wert = alter Wert + Lernrate × (was ich bekommen habe + Weitsicht × das Beste, was von dort aus noch kommt − alter Wert).",
                "After every step the rover updates its memory with a single rule. In words: new value = old value + learning rate × (what I got + foresight × the best that can still come from there − old value).",
              )}
            </p>
            <pre className="overflow-x-auto rounded-2xl border border-border bg-secondary/40 p-5 text-lg text-foreground">
              Q(s, a) ← Q(s, a) + α · [ r + γ · maxₐ′ Q(s′, a′) − Q(s, a) ]
            </pre>
            <p className="text-base text-muted-foreground">
              {t(
                "s ist das Feld, auf dem er steht, a der Schritt, den er macht, r die Belohnung dafür und s′ das Feld, auf dem er landet. Das ist Q-Learning.",
                "s is the tile it stands on, a the step it takes, r the reward for it and s′ the tile it lands on. This is Q-learning.",
              )}
            </p>
          </Section>

          <Section id="llm" title={t("Auch ChatGPT & Co. lernen so: RLHF", "ChatGPT & co. learn like this too: RLHF")}>
            <p>
              {t(
                "Ein Sprachmodell lernt zuerst nur, Text weiterzuschreiben. Damit es auch hilfreich antwortet, kommt ein zweiter Schritt dazu: Menschen vergleichen zwei Antworten und wählen die bessere. Das ist die Belohnung. Das Fachwort dafür ist RLHF, Reinforcement Learning from Human Feedback.",
                "A language model first only learns to continue text. To make it answer helpfully, a second step follows: people compare two answers and pick the better one. That is the reward. The technical term is RLHF, reinforcement learning from human feedback.",
              )}
            </p>
            <p>
              {t(
                "Der Rover und das Modell funktionieren gleich: Eine Antwort ist wie ein Schritt, dein Daumen ist die Belohnung, und die Wahrscheinlichkeit, mit der das Modell etwas sagt, ist wie die Pfeile im Spielfeld. Probier es selbst: Du bist der Mensch.",
                "The rover and the model work alike: an answer is like a step, your thumbs-up is the reward, and the probability that the model says something is like the arrows on the board. Try it yourself: you are the human.",
              )}
            </p>
            <RlhfDemo translate={t} />
            <p className="text-base text-muted-foreground">
              {t(
                "In echt bewerten Menschen tausende Antworten. Daraus lernt ein eigenes Belohnungsmodell, das danach Millionen Antworten automatisch bewertet. Hier siehst du die Idee stark vereinfacht.",
                "In reality people rate thousands of answers. A separate reward model learns from them and then rates millions of answers automatically. Here you see the idea in a very simplified form.",
              )}
            </p>
          </Section>

          <Section id="alltag" title={t("Wo du das im Alltag findest", "Where you meet this in real life")}>
            <ul className="list-disc space-y-2 pl-6 marker:text-primary">
              <li>{t("Spiele-KIs, die durch Millionen Partien gegen sich selbst besser werden.", "Game AIs that improve by playing millions of matches against themselves.")}</li>
              <li>{t("Roboter, die Greifen und Laufen durch Üben lernen, statt jede Bewegung einprogrammiert zu bekommen.", "Robots that learn grasping and walking by practising instead of having every move programmed.")}</li>
              <li>{t("Stromnetze, die Angebot und Nachfrage laufend abgleichen.", "Power grids that keep balancing supply and demand.")}</li>
              <li>{t("Sprachmodelle, die mit menschlichem Feedback als Belohnung nachtrainiert werden.", "Language models fine-tuned with human feedback as the reward.")}</li>
            </ul>
          </Section>

          <Section id="roboter" title={t("Echte Roboter, gleiches Prinzip", "Real robots, same principle")}>
            <RealRobots />
          </Section>

          <Section id="probieren" title={t("Probier das aus", "Try this")}>
            <ol className="list-decimal space-y-2 pl-6 marker:font-bold marker:text-primary">
              <li>{t("Stelle ε auf 0 und starte. Bleibt der Rover auf einem schlechten Weg hängen?", "Set ε to 0 and start. Does the rover get stuck on a poor path?")}</li>
              <li>{t("Stelle ε auf 1. Lernt er überhaupt etwas?", "Set ε to 1. Does it learn anything at all?")}</li>
              <li>{t("Setze γ auf 0 und platziere eine Belohnung am Rand. Wird der Rover zum Naschkater?", "Set γ to 0 and put a reward on the side. Does the rover turn into a sweet tooth?")}</li>
            </ol>
          </Section>
        </div>
      </DialogContent>
    </Dialog>
  );
}


/** Opens the explainer. Works anywhere inside a LanguageProvider (game sidebar and classroom header). */
export function RLGuideButton({ className, variant = "outline", size = "sm", compact = false }: { className?: string; variant?: "outline" | "default" | "ghost"; size?: "sm" | "default"; compact?: boolean }) {
  const { translate } = useLanguage();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant={variant} size={size} className={className} data-tutorial="guide" onClick={() => setOpen(true)}>
        📖 {compact ? translate("Erklärung", "Guide") : translate("Wie lernt der Rover? Erklärung", "How does the rover learn? Guide")}
      </Button>
      <RLGuideDialog open={open} onOpenChange={setOpen} translate={translate} />
    </>
  );
}
