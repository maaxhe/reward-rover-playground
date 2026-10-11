import type { LevelNumber } from "@/lib/levelProgression";

/** Which element a coach popup points at (matches `data-tutorial="…"` in the UI). */
export type CoachTarget =
  | "objective"
  | "guide"
  | "start"
  | "board"
  | "explore"
  | "alpha"
  | "gamma"
  | "tool-obstacle"
  | "tool-reward"
  | "tool-punishment"
  | "tool-portal"
  | "gridsize"
  | "policy"
  | "autorestart";

export interface CoachSlide {
  target: CoachTarget;
  title: { de: string; en: string };
  text: { de: string; en: string };
}

const objective: CoachSlide = {
  target: "objective",
  title: { de: "Deine Aufgabe", en: "Your task" },
  text: {
    de: "Hier steht, was du in diesem Level schaffen musst. Die Haken zeigen dir, was schon erledigt ist.",
    en: "This is what you have to achieve in this level. The ticks show what is already done.",
  },
};

const start: CoachSlide = {
  target: "start",
  title: { de: "Rover starten ▶️", en: "Start the rover ▶️" },
  text: {
    de: "Klicke auf Start. Der Rover läuft los und lernt von Runde zu Runde, bis er den kürzesten Weg zum Ziel kennt.",
    en: "Click Start. The rover sets off and learns run after run until it knows the shortest way to the goal.",
  },
};

const explore: CoachSlide = {
  target: "explore",
  title: { de: "Neugier ε (Exploration)", en: "Curiosity ε (exploration)" },
  text: {
    de: "Dieser Regler heißt in der Fachsprache „Exploration“, hier sagen wir Neugier. Stell dir ein Restaurant vor: Bestellst du immer dein Lieblingsgericht (wenig Neugier) oder probierst du mal etwas Neues (viel Neugier)? Zu niedrig: der Rover bleibt bei seinem ersten Weg. Zu hoch: er läuft weiter zufällig. Probier etwas dazwischen.",
    en: "In technical terms this slider is called “exploration”, here we say curiosity. Think of a restaurant: do you always order your favourite (little curiosity) or try something new (lots of curiosity)? Too low: the rover sticks to its first path. Too high: it keeps wandering randomly. Try something in between.",
  },
};

const policy: CoachSlide = {
  target: "policy",
  title: { de: "Policy-Pfeile ➡️", en: "Policy arrows ➡️" },
  text: {
    de: "Die Policy ist die Strategie des Rovers. Jeder Pfeil zeigt, in welche Richtung er auf diesem Feld nach seinem bisherigen Wissen gehen würde. Mit jeder Runde zeigen sie besser den Weg zum Ziel. Hier kannst du sie ein- und ausschalten.",
    en: "The policy is the rover's strategy. Each arrow shows which way it would go from that tile based on what it has learned. With every run they trace the way to the goal better. Switch them on or off here.",
  },
};

const autorestart: CoachSlide = {
  target: "autorestart",
  title: { de: "Auto-Restart 🔁", en: "Auto-restart 🔁" },
  text: {
    de: "Ist dieser Schalter an, startet der Rover nach jedem Ziel von selbst neu und lernt ohne Klicken weiter. Hier schaltest du es ein und aus.",
    en: "When this switch is on, the rover restarts by itself after every goal and keeps learning without clicking. Turn it on or off here.",
  },
};

const startAndGoal: CoachSlide = {
  target: "board",
  title: { de: "Start und Ziel", en: "Start and goal" },
  text: {
    de: "Der Rover startet unten links, das Ziel ist oben rechts. Dazwischen liegen Mauern, Belohnungen und Strafen. Du musst hier nichts mehr bauen: Stelle die Regler passend ein und schau, wie er seinen Weg findet.",
    en: "The rover starts at the bottom left, the goal is at the top right. In between are walls, rewards and penalties. You do not have to build anything here: set the dials well and watch it find its way.",
  },
};

const placeOnBoard = (tool: string, toolEn: string): CoachSlide => ({
  target: "board",
  title: { de: "Aufs Feld klicken", en: "Click on the board" },
  text: {
    de: `Klicke jetzt auf ein freies Feld im Spielfeld, um dort ${tool} zu setzen. Du kannst auch mit gedrückter Maustaste über mehrere Felder ziehen. Ein zweiter Klick auf dasselbe Feld nimmt es wieder weg.`,
    en: `Now click an empty tile on the board to place ${toolEn} there. You can also hold the mouse button and drag across several tiles. Clicking the same tile again removes it.`,
  },
});

const guide: CoachSlide = {
  target: "guide",
  title: { de: "Wie lernt der Rover? 📖", en: "How does the rover learn? 📖" },
  text: {
    de: "Klicke auf diesen Button, wenn du verstehen willst, was hinter dem Lernen steckt. Die Erklärung ist kurz, anschaulich und hat kleine Rover zum Ausprobieren. Du kannst sie jederzeit wieder öffnen.",
    en: "Click this button if you want to understand what is behind the learning. The guide is short, visual and has little rovers to play with. You can reopen it any time.",
  },
};

export const LEVEL_COACH: Record<LevelNumber, CoachSlide[]> = {
  1: [guide, objective, start, policy, autorestart, explore],
  2: [
    objective,
    {
      target: "alpha",
      title: { de: "Lernrate (α)", en: "Learning rate (α)" },
      text: {
        de: "Ziehe den Regler für die Lernrate auf mindestens 0,5. Je höher α, desto stärker überschreibt neue Erfahrung das alte Wissen.",
        en: "Drag the learning rate slider to at least 0.5. The higher α, the more new experience overwrites old knowledge.",
      },
    },
    start,
  ],
  3: [
    objective,
    {
      target: "gamma",
      title: { de: "Weitsicht γ (Diskontfaktor)", en: "Foresight γ (discount factor)" },
      text: {
        de: "Weitsicht und „Discount-Faktor“ sind dasselbe: Dieser Regler bestimmt, wie weit der Rover vorausdenkt. Stelle γ auf mindestens 0,9. Dann denkt der Rover weit voraus und wählt den Weg zum Ziel statt der kleinen Belohnung am Rand.",
        en: "Foresight and “discount factor” are the same thing: this dial decides how far ahead the rover thinks. Set γ to at least 0.9. The rover then thinks far ahead and picks the path to the goal over the small reward on the side.",
      },
    },
    start,
  ],
  4: [
    objective,
    {
      target: "tool-reward",
      title: { de: "Werkzeug: Belohnung", en: "Tool: Reward" },
      text: {
        de: "Wähle zuerst das Werkzeug „Belohnung“ im Platzierungs-Modus.",
        en: "First pick the “Reward” tool in the placement mode.",
      },
    },
    placeOnBoard("eine Belohnung", "a reward"),
    start,
  ],
  5: [
    objective,
    {
      target: "tool-punishment",
      title: { de: "Werkzeug: Strafe", en: "Tool: Penalty" },
      text: {
        de: "Hier wählst du aus, was du setzt: Klicke im Platzierungs-Modus auf den Knopf „Strafe“. Danach tippst du aufs Spielfeld.",
        en: "This is where you choose what to place: click the “Penalty” button in the placement mode. Then tap the board.",
      },
    },
    placeOnBoard("eine Strafe, am besten auf den kürzesten Weg,", "a penalty, ideally on the shortest path,"),
    start,
  ],
  6: [
    objective,
    {
      target: "tool-obstacle",
      title: { de: "Werkzeug: Mauer", en: "Tool: Wall" },
      text: {
        de: "Wähle zuerst das Werkzeug „Mauer“ im Platzierungs-Modus.",
        en: "First pick the “Wall” tool in the placement mode.",
      },
    },
    placeOnBoard("zwei Mauern", "two walls"),
    start,
  ],
  7: [
    objective,
    {
      target: "gridsize",
      title: { de: "Feld-Größe ändern", en: "Change the grid size" },
      text: {
        de: "Klicke hier auf eine andere Größe, zum Beispiel „Mittel“. Dann entsteht ein neues Feld und der Rover fängt von vorn an.",
        en: "Click another size here, for example “Medium”. A new board appears and the rover starts from scratch.",
      },
    },
    start,
  ],
  8: [
    objective,
    {
      target: "tool-portal",
      title: { de: "Werkzeug: Portal", en: "Tool: Portal" },
      text: {
        de: "Wähle zuerst das Werkzeug „Portal“. Portale kommen immer als Paar: Wer in das eine hineinläuft, kommt am anderen heraus.",
        en: "First pick the “Portal” tool. Portals come in pairs: step into one and you come out of the other.",
      },
    },
    placeOnBoard("ein Portal (dann das zweite, damit es ein Paar wird)", "a portal (then the second one to make a pair)"),
    start,
  ],
  9: [
    objective,
    startAndGoal,
    explore,
    {
      target: "alpha",
      title: { de: "Lernrate (α)", en: "Learning rate (α)" },
      text: {
        de: "Zu viel α macht den Rover sprunghaft, zu wenig macht ihn langsam. Hier kannst du nachjustieren.",
        en: "Too much α makes the rover erratic, too little makes it slow. Fine-tune it here.",
      },
    },
    {
      target: "gamma",
      title: { de: "Weitsicht γ (Diskontfaktor)", en: "Foresight γ (discount factor)" },
      text: {
        de: "Ein hohes γ lässt ihn weit vorausplanen. Für kurze, direkte Wege reicht oft ein hoher Wert.",
        en: "A high γ makes it plan far ahead. For short, direct routes a high value usually works.",
      },
    },
    start,
  ],
  10: [
    objective,
    startAndGoal,
    explore,
    {
      target: "alpha",
      title: { de: "Alle Regler gehören dir", en: "All the knobs are yours" },
      text: {
        de: "Für die Meisterprüfung kombinierst du Neugier, Lernrate und Weitsicht. Beobachte nach jedem Lauf, ob die Schritte weniger werden, und drehe dann gezielt nach.",
        en: "For the master test you combine curiosity, learning rate and foresight. After each run check whether the steps shrink, then adjust deliberately.",
      },
    },
    start,
  ],
};
