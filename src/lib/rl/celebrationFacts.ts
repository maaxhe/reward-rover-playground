import type { Language } from "@/lib/rl/types";

export const CELEBRATION_FACTS: Array<Record<Language, string>> = [
    {
      de: "Q-Learning gehört zu den Temporal-Difference-Methoden. Der Rover lernt also aus dem Unterschied zwischen dem, was er erwartet hat, und dem, was passiert ist.",
      en: "Did you know? Q-learning is part of the temporal-difference family of methods.",
    },
    {
      de: "Mit demselben Prinzip lernen Spiel-Agenten, schwierige Bosskämpfe in Videospielen zu schaffen.",
      en: "RL powers game agents that learn to defeat tough bosses in modern video games.",
    },
    {
      de: "Selbstfahrende Autos üben mit Reinforcement Learning in Simulationen, bevor sie auf die Straße kommen.",
      en: "Self-driving car developers use RL to improve driving behavior in simulation.",
    },
    {
      de: "AlphaGo von DeepMind hat mit Reinforcement Learning die besten Go-Spieler der Welt geschlagen.",
      en: "DeepMind's AlphaGo used RL to defeat world champion Go players.",
    },
    {
      de: "Auch Empfehlungssysteme lernen so, was du dir als Nächstes ansehen könntest.",
      en: "Recommendation systems use RL to decide which product you might like next.",
    },
    {
      de: "Forschende erproben Reinforcement Learning, um Stromnetze im Gleichgewicht zu halten.",
      en: "RL is being researched and piloted to keep power grids balanced.",
    },
    {
      de: "Roboterarme lernen so, Dinge genau zu greifen, auch wenn sie die Form noch nie gesehen haben.",
      en: "Industrial robot arms train with RL to grasp unfamiliar objects precisely.",
    },
    {
      de: "In der Medizin wird erforscht, ob sich Dosierungen so an einzelne Patient:innen anpassen lassen.",
      en: "Healthcare researchers explore RL to adapt treatment dosing plans.",
    },
    {
      de: "In der Finanzwelt testen solche Agenten Handelsstrategien an simulierten Märkten.",
      en: "Finance teams experiment with RL agents in simulated markets to test strategies.",
    },
    {
      de: "Reinforcement Learning kann sogar die Einstellungen anderer KI-Modelle optimieren.",
      en: "RL can automate hyperparameter tuning for other AI models.",
    },
    {
      de: "Mit „Schritt“ macht der Rover genau einen Schritt. So kannst du jede Entscheidung einzeln nachvollziehen.",
      en: "Use the step button to replay every decision the rover makes.",
    },
    {
      de: "Mit den Pfeiltasten (↑↓←→) kannst du den Rover kurz in eine Richtung schubsen.",
      en: "Tip: Press arrow keys (↑↓←→) to influence the rover's movement direction!",
    },
    {
      de: "Mit der Leertaste hältst du das Training an und lässt es weiterlaufen.",
      en: "Shortcut: Press Space to pause and resume training.",
    },
    {
      de: "Mit der Taste R setzt du das Feld zurück und fängst von vorn an.",
      en: "Tip: Press 'R' to reset the playfield and start fresh.",
    },
    {
      de: "Schalte in den Einstellungen die Policy-Pfeile ein. Dann siehst du, in welche Richtung der Rover auf jedem Feld gehen würde.",
      en: "Enable policy arrows in settings to see which direction the rover prefers!",
    },
    {
      de: "Die Q-Werte zeigen, wie viel der Rover von einem Feld hält. Je höher, desto besser.",
      en: "Q-values show how valuable the rover considers each tile – higher is better!",
    },
    {
      de: "Wenig Neugier heißt: Der Rover macht meistens das, was er schon gelernt hat.",
      en: "Low exploration rate = more use of learned strategy (exploitation).",
    },
    {
      de: "Viel Neugier heißt: Der Rover probiert öfter zufällig neue Wege aus.",
      en: "High exploration rate = more random decisions (exploring new paths).",
    },
    {
      de: "Die Lernrate (α) bestimmt, wie stark eine neue Erfahrung das überschreibt, was der Rover bisher dachte.",
      en: "Alpha (learning rate) controls how much new experiences override old values.",
    },
    {
      de: "Die Weitsicht (γ) bestimmt, wie wichtig dem Rover Belohnungen sind, die erst später kommen.",
      en: "Gamma (discount factor) controls how much future rewards matter.",
    },
    {
      de: "Die Heatmap zeigt dir, auf welchen Feldern der Rover am häufigsten war.",
      en: "Tip: The heatmap shows which tiles the rover visited most often!",
    },
    {
      de: "Mit Strg+Z machst du eine Änderung am Feld rückgängig.",
      en: "Use the undo function (Ctrl+Z) to revert changes to the playfield!",
    },
    {
      de: "Probier die vorgefertigten Welten aus. Da sind ein paar knifflige dabei.",
      en: "Try the preset levels – they offer exciting pre-made challenges!",
    },
    {
      de: "Im Vergleichsmodus lässt du zwei Lernstrategien gegeneinander antreten.",
      en: "In comparison mode, you can pit two different learning strategies against each other!",
    },
    {
      de: "Portale kommen paarweise: Wer in eins läuft, kommt beim anderen wieder heraus. Das Teleport-Feld schickt den Rover dagegen auf ein zufälliges Feld.",
      en: "Portals come in pairs: step into one and you come out of the other. The teleport tile, by contrast, sends the rover to a random tile – use both strategically!",
    },
    {
      de: "Das Ziel bringt normalerweise 100 Punkte.",
      en: "Reaching the goal grants a default reward of 100 points!",
    },
    {
      de: "Jeder Schritt kostet den Rover einen Punkt. Deshalb lohnen sich kurze Wege.",
      en: "Each step costs the rover -1 point – shorter paths are rewarded!",
    },
    {
      de: "In der Bestenliste siehst du deine besten Läufe.",
      en: "Tip: Watch the leaderboard to track your best episodes!",
    },
    {
      de: "Der Rover lernt durch Versuch und Irrtum. Wir Menschen machen das oft genauso.",
      en: "The rover learns through trial-and-error – just like humans do!",
    },
    {
      de: "Nach ein paar Läufen erkennt der Rover Muster und findet kürzere Wege.",
      en: "After several episodes, the rover recognizes patterns and finds more efficient routes!",
    },
    {
      de: "In den Einstellungen kannst du das Feld größer machen. Dann wird es schwieriger.",
      en: "Tip: Change the field size in settings for new challenges!",
    },
    {
      de: "Im freien Spiel baust du eigene Welten mit Mauern und Belohnungen.",
      en: "In playground mode, you can design custom levels with obstacles and rewards!",
    },
    {
      de: "Speedrun-Modus: Schaff es ins Ziel, bevor die Zeit abläuft.",
      en: "Speedrun mode: Reach the goal before time runs out!",
    },
    {
      de: "Die Verlaufsdiagramme zeigen, wie der Rover mit der Zeit besser wird.",
      en: "Progress charts show how performance improves over time!",
    },
    {
      de: "Schalte Heatmap und Policy-Pfeile zusammen ein. Dann siehst du am besten, was der Rover gelernt hat.",
      en: "Tip: Combine heatmap and policy arrows for maximum learning insight!",
    },
    {
      de: "Challenge-Modus im Zufallsmodus: Bau das Feld um, während der Rover lernt.",
      en: "Challenge mode in random mode: Design the level while the rover learns!",
    },
    {
      de: "Der Rover merkt sich keine Karte. Er speichert nur Werte für jedes Feld.",
      en: "Did you know? The rover stores no map, just values per tile!",
    },
    {
      de: "Reinforcement Learning ist einer der drei großen Bereiche des maschinellen Lernens.",
      en: "Reinforcement learning is one of the three main branches of machine learning!",
    },
    {
      de: "Die Q-Tabelle ändert sich mit jedem Schritt. Du siehst dem Rover also live beim Lernen zu.",
      en: "The Q-table updates with each step – live learning in action!",
    },
    {
      de: "Probier verschiedene Werte für Lernrate und Weitsicht aus. Der Rover lernt dann jedes Mal anders.",
      en: "Tip: Experiment with different alpha and gamma values for different learning styles!",
    },
    {
      de: "Manchmal nimmt der Rover absichtlich einen schlechteren Weg. So findet er Strategien, die er sonst nie entdeckt hätte.",
      en: "The rover sometimes deliberately chooses suboptimal paths to discover new strategies!",
    },
    {
      de: "Auch echte Roboter lernen so schwierige Bewegungen.",
      en: "RL is also used in robotics to learn complex movement sequences!",
    },
    {
      de: "Die Erklärung oben rechts zeigt dir die Grundlagen. Gut, wenn du gerade erst anfängst.",
      en: "The tutorial feature explains all the basics – perfect for beginners!",
    },
    {
      de: "In den Einstellungen findest du die Formel, mit der der Rover rechnet.",
      en: "Tip: Check out the RL formula in settings to understand the math!",
    },
    {
      de: "Die Legende zeigt, was die Felder bedeuten.",
      en: "The legend shows all tile types and their meaning – very helpful!",
    },
    {
      de: "Im freien Spiel kannst du mit gedrückter Maus mehrere Felder hintereinander setzen.",
      en: "Use the mouse to place multiple tiles in a row in playground mode!",
    },
    {
      de: "Im dunklen Modus ist das Feld bei langen Sitzungen angenehmer für die Augen.",
      en: "Dark mode is easier on your eyes during long training sessions!",
    },
    {
      de: "Du kannst jederzeit zwischen Deutsch und Englisch wechseln.",
      en: "Tip: Switch between German and English to use the app in your preferred language!",
    },
    {
      de: "Die Statistik zeigt Durchschnittswerte über alle Läufe.",
      en: "Statistics show you average values across all episodes!",
    },
    {
      de: "Je mehr Läufe der Rover macht, desto besser wird seine Strategie.",
      en: "The more episodes the rover completes, the better its strategy becomes!",
    },
  ];
