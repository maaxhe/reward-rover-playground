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
    de: "Das hier musst du in diesem Level schaffen. Was schon klappt, bekommt einen Haken.",
    en: "This is what you need to do in this level. Anything you've done gets a tick.",
  },
};

const start: CoachSlide = {
  target: "start",
  title: { de: "Rover starten", en: "Start the rover" },
  text: {
    de: "Drück auf Start. Der Rover läuft los, am Anfang ziemlich planlos. Mit jeder Runde merkt er sich mehr, bis er den kürzesten Weg kennt.",
    en: "Hit Start. The rover sets off, pretty cluelessly at first. Every run it remembers a bit more, until it knows the shortest way.",
  },
};

const explore: CoachSlide = {
  target: "explore",
  title: { de: "Neugier ε (Exploration)", en: "Curiosity ε (exploration)" },
  text: {
    de: "Das ist die Neugier (Fachwort: Exploration). Wie im Restaurant: Nimmst du immer dein Lieblingsessen oder probierst du auch mal was Neues? Bei zu wenig Neugier bleibt der Rover auf seinem ersten Weg kleben. Bei zu viel läuft er nur noch rum. Such dir was in der Mitte.",
    en: "This is curiosity (the technical word is exploration). Like in a restaurant: do you always order your favourite, or try something new now and then? With too little, the rover sticks to its first path. With too much, it just wanders. Pick something in the middle.",
  },
};

const policy: CoachSlide = {
  target: "policy",
  title: { de: "Policy-Pfeile", en: "Policy arrows" },
  text: {
    de: "Die Pfeile zeigen, wohin der Rover auf dem jeweiligen Feld gehen würde, so wie er es bisher gelernt hat. Je länger er übt, desto besser zeigen sie zum Ziel. Hier kannst du sie an- und ausmachen.",
    en: "The arrows show where the rover would go from each tile, based on what it has learned so far. The more it practises, the better they point to the goal. Switch them on or off here.",
  },
};

const autorestart: CoachSlide = {
  target: "autorestart",
  title: { de: "Auto-Restart", en: "Auto-restart" },
  text: {
    de: "Ist das an, fängt der Rover nach jedem Ziel von selbst wieder an. Du musst nicht jedes Mal klicken.",
    en: "When this is on, the rover starts over by itself after every goal. No clicking needed.",
  },
};

const startAndGoal: CoachSlide = {
  target: "board",
  title: { de: "Start und Ziel", en: "Start and goal" },
  text: {
    de: "Der Rover startet unten links, das Ziel ist oben rechts. Dazwischen liegen Mauern, Belohnungen und Strafen. Bauen musst du hier nichts. Dreh an den Reglern und schau, ob er den Weg findet.",
    en: "The rover starts bottom left, the goal is top right. In between: walls, rewards and penalties. You don't have to build anything. Turn the dials and see if it finds the way.",
  },
};

const placeOnBoard = (tool: string, toolEn: string): CoachSlide => ({
  target: "board",
  title: { de: "Aufs Feld klicken", en: "Click on the board" },
  text: {
    de: `Tipp jetzt auf ein freies Feld, um ${tool} zu setzen. Du kannst auch über mehrere Felder ziehen. Nochmal auf dasselbe Feld tippen nimmt es wieder weg.`,
    en: `Now tap an empty tile to place ${toolEn}. You can also drag across several tiles. Tapping the same tile again removes it.`,
  },
});

const guide: CoachSlide = {
  target: "guide",
  title: { de: "Wie lernt der Rover? 📖", en: "How does the rover learn? 📖" },
  text: {
    de: "Wenn du wissen willst, wie der Rover überhaupt lernt: Hier ist die Erklärung, mit kleinen Rovern zum Ausprobieren. Du kannst sie jederzeit wieder aufmachen.",
    en: "Want to know how the rover learns at all? This is the explanation, with little rovers to play with. You can open it again any time.",
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
        de: "Zieh die Lernrate auf mindestens 0,5. Je höher α, desto schneller vergisst der Rover Altes zugunsten von Neuem.",
        en: "Drag the learning rate to at least 0.5. The higher α, the faster the rover drops old knowledge for new.",
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
        de: "Weitsicht und „Discount-Faktor“ sind dasselbe. Der Regler sagt, wie weit der Rover vorausdenkt. Stell γ auf mindestens 0,9, dann geht er lieber zum Ziel als zur kleinen Belohnung am Rand.",
        en: "Foresight and “discount factor” are the same thing. The dial says how far ahead the rover thinks. Set γ to at least 0.9 and it will go for the goal instead of the small reward on the side.",
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
        de: "Such dir zuerst das Werkzeug „Belohnung“ aus.",
        en: "First pick the “Reward” tool.",
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
        de: "Hier wählst du, was du setzt. Tipp auf „Strafe“ und danach aufs Spielfeld.",
        en: "This is where you choose what to place. Tap “Penalty”, then tap the board.",
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
        de: "Such dir zuerst das Werkzeug „Mauer“ aus.",
        en: "First pick the “Wall” tool.",
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
        de: "Tipp hier auf eine andere Größe, zum Beispiel „Mittel“. Das Feld wird neu gebaut und der Rover fängt von vorn an.",
        en: "Tap another size here, for example “Medium”. The board is rebuilt and the rover starts from scratch.",
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
        de: "Such dir zuerst das Werkzeug „Portal“ aus. Portale gibt es nur als Paar. Wer in das eine läuft, kommt beim anderen wieder raus.",
        en: "First pick the “Portal” tool. Portals come in pairs. Walk into one and you come out of the other.",
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
        de: "Zu viel α und der Rover wird hektisch, zu wenig und er braucht ewig. Probier aus, was passt.",
        en: "Too much α and the rover gets jumpy, too little and it takes forever. Try what works.",
      },
    },
    {
      target: "gamma",
      title: { de: "Weitsicht γ (Diskontfaktor)", en: "Foresight γ (discount factor)" },
      text: {
        de: "Ein hohes γ lässt ihn weit vorausplanen. Meistens ist hoch hier eine gute Wahl.",
        en: "A high γ makes it plan far ahead. High is usually a good pick here.",
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
        de: "Jetzt kommt alles zusammen: Neugier, Lernrate, Weitsicht. Schau nach jedem Lauf, ob die Schritte weniger werden, und dreh dann nur an einem Regler.",
        en: "Now it all comes together: curiosity, learning rate, foresight. After each run check whether the steps go down, then change just one dial.",
      },
    },
    start,
  ],
};
