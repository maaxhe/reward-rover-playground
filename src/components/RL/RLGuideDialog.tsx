import type { ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

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

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="space-y-3">
    <h3 className="text-2xl font-extrabold tracking-tight text-foreground">{title}</h3>
    <div className="space-y-4 text-lg leading-8 text-foreground/80">{children}</div>
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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl gap-0 overflow-hidden rounded-3xl p-0">
        <div className="max-h-[90vh] space-y-10 overflow-y-auto px-6 py-8 sm:px-10 sm:py-10">
          <header className="space-y-3">
            <DialogTitle className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              {t("Wie ein Rover lernt, ohne dass ihm jemand den Weg zeigt", "How a rover learns without anyone showing it the way")}
            </DialogTitle>
            <DialogDescription className="text-lg leading-8 text-muted-foreground">
              {t(
                "Zehn Minuten Lesezeit, keine Vorkenntnisse nötig. Du kannst jederzeit zurück zum Spiel und ausprobieren, was hier steht.",
                "Ten minutes of reading, no background needed. You can jump back to the game any time and try what you read.",
              )}
            </DialogDescription>
          </header>

          <Section title={t("Die Grundidee: Ausprobieren und merken", "The basic idea: try things and remember")}>
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
          </Section>

          <Section title={t("Das Restaurant-Problem", "The restaurant problem")}>
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

          <Section title={t("Die drei Regler", "The three dials")}>
            <Dial
              symbol="ε"
              name={t("Neugier (Epsilon)", "Curiosity (epsilon)")}
              line={t(
                "Wie oft folgt der Rover einer Laune statt seinem Wissen? Bei 0,2 geht er jeden fünften Schritt in eine zufällige Richtung.",
                "How often does the rover follow a whim instead of what it knows? At 0.2 it takes a random step every fifth move.",
              )}
              tip={t(
                "Zu niedrig: Er bleibt auf dem ersten Weg hängen, den er findet. Zu hoch: Er irrt weiter herum, obwohl er den Weg längst kennt.",
                "Too low: it sticks to the first path it finds. Too high: it keeps wandering even though it already knows the way.",
              )}
            />
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
            <Dial
              symbol="γ"
              name={t("Weitsicht (Gamma)", "Foresight (gamma)")}
              line={t(
                "Wie viel zählt für den Rover, was erst später kommt? Bei 0,9 lohnt sich ein Umweg, wenn am Ende das Ziel wartet. Bei 0 denkt er nur an das Feld direkt vor sich.",
                "How much does the rover care about what comes later? At 0.9 a detour is worth it if the goal waits at the end. At 0 it only thinks about the tile right in front of it.",
              )}
              tip={t(
                "Ein kleines γ macht den Rover zum Naschkatzen: Die nahe Süßigkeit schlägt das ferne Ziel.",
                "A small γ turns the rover into a sweet tooth: the nearby candy beats the distant goal.",
              )}
            />
          </Section>

          <Section title={t("Was bei jedem Schritt passiert", "What happens on every step")}>
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

          <Section title={t("Wo du das im Alltag findest", "Where you meet this in real life")}>
            <ul className="list-disc space-y-2 pl-6 marker:text-primary">
              <li>{t("Spiele-KIs, die durch Millionen Partien gegen sich selbst besser werden.", "Game AIs that improve by playing millions of matches against themselves.")}</li>
              <li>{t("Roboter, die Greifen und Laufen durch Üben lernen, statt jede Bewegung einprogrammiert zu bekommen.", "Robots that learn grasping and walking by practising instead of having every move programmed.")}</li>
              <li>{t("Stromnetze, die Angebot und Nachfrage laufend abgleichen.", "Power grids that keep balancing supply and demand.")}</li>
              <li>{t("Sprachmodelle, die mit menschlichem Feedback als Belohnung nachtrainiert werden.", "Language models fine-tuned with human feedback as the reward.")}</li>
            </ul>
          </Section>

          <Section title={t("Probier das aus", "Try this")}>
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
