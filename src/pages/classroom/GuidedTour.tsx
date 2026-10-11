import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export interface TourStep {
  /** id of the element to highlight (missing elements are simply skipped) */
  target: string;
  title: string;
  text: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    target: "tour-board",
    title: "Das ist deine Welt",
    text: "Der Rover startet hier und soll das Ziel finden. Mauern versperren den Weg, Belohnungen geben Pluspunkte, Strafen kosten Punkte.",
  },
  {
    target: "tour-arrows",
    title: "Die Pfeile",
    text: "Sie zeigen, welchen Zug der Rover gerade für den besten hält. Am Anfang sind es keine, denn er weiß noch nichts.",
  },
  {
    target: "tour-params",
    title: "Die drei Regler",
    text: "Neugier ε: wie oft er Neues probiert. Lernrate α: wie stark neue Erfahrung zählt. Weitsicht γ: wie weit er vorausdenkt. Du darfst sie jederzeit verstellen, probier es aus!",
  },
  {
    target: "tour-buttons",
    title: "Los geht's",
    text: "Mit „Trainieren“ lernt der Rover. „Jetzt werten“ schickt ihn in den Wettbewerb, „Neu starten“ löscht alles Gelernte und gibt dir alle Episoden zurück.",
  },
  {
    target: "tour-leaderboard",
    title: "Die Rangliste",
    text: "Der Server testet jeden Rover ohne Zufall. Wer die meisten Punkte holt, gewinnt. Danach siehst du, wie die anderen ihre Regler benutzt haben.",
  },
];

const STORAGE_KEY = "rr-class-tour-done";

export const tourAlreadySeen = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
};
export const markTourSeen = () => {
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* private mode: the tour just shows again next time */
  }
};

/** Short step-by-step intro for the first start. Non-blocking: the clock keeps running, the sliders stay usable. */
export const GuidedTour = ({ step, onStep, onClose }: { step: number; onStep: (n: number) => void; onClose: () => void }) => {
  const current = TOUR_STEPS[step];

  useEffect(() => {
    const el = document.getElementById(current.target);
    if (!el) return;
    el.classList.add("tour-highlight");
    el.scrollIntoView?.({ block: "center", behavior: "smooth" });
    return () => el.classList.remove("tour-highlight");
  }, [current.target]);

  const last = step === TOUR_STEPS.length - 1;
  return (
    <Card
      role="dialog"
      aria-label="Kurz-Tour"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-lg space-y-3 border-primary/60 bg-card p-4 shadow-2xl"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-bold">{current.title}</h2>
        <span className="text-xs tabular-nums text-muted-foreground">{step + 1} / {TOUR_STEPS.length}</span>
      </div>
      <p className="text-base leading-snug">{current.text}</p>
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={onClose}>Überspringen</Button>
        <div className="flex gap-2">
          {step > 0 && <Button variant="outline" className="h-11" onClick={() => onStep(step - 1)}>Zurück</Button>}
          <Button className="h-11 px-6" onClick={() => (last ? onClose() : onStep(step + 1))}>{last ? "Alles klar" : "Weiter"}</Button>
        </div>
      </div>
    </Card>
  );
};
