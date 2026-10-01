import type { Language } from "@/lib/rl/types";

export const CELEBRATION_FACTS: Array<Record<Language, string>> = [
    {
      de: "Wusstest du? Q-Learning gehört zur Familie der Temporal-Difference-Methoden.",
      en: "Did you know? Q-learning is part of the temporal-difference family of methods.",
    },
    {
      de: "RL treibt Game-Agents an, die in modernen Videospielen schwierige Bosskämpfe meistern.",
      en: "RL powers game agents that learn to defeat tough bosses in modern video games.",
    },
    {
      de: "Selbstfahrende Autos setzen RL ein, um sichere und effiziente Routen zu planen.",
      en: "Self-driving cars rely on RL to plan safe and efficient routes.",
    },
    {
      de: "DeepMinds AlphaGo nutzte RL, um menschliche Go-Weltmeister zu schlagen.",
      en: "DeepMind's AlphaGo used RL to defeat world champion Go players.",
    },
    {
      de: "Empfehlungssysteme lernen per RL, welche Produkte du als Nächstes spannend findest.",
      en: "Recommendation systems use RL to decide which product you might like next.",
    },
    {
      de: "RL hilft dabei, Stromnetze im Gleichgewicht zu halten – in Echtzeit.",
      en: "Power-grid controllers use RL to keep supply and demand balanced in real time.",
    },
    {
      de: "Roboterarme trainieren mit RL, um Objekte präzise zu greifen – auch bei neuen Formen.",
      en: "Industrial robot arms train with RL to grasp unfamiliar objects precisely.",
    },
    {
      de: "In der Medizin unterstützt RL adaptive Dosierungspläne für Behandlungen.",
      en: "Healthcare researchers explore RL to adapt treatment dosing plans.",
    },
    {
      de: "RL-Agenten testen in der Finanzwelt Handelsstrategien unter simulierten Märkten.",
      en: "Finance teams experiment with RL agents in simulated markets to test strategies.",
    },
    {
      de: "Hyperparameter-Tuning für andere KI-Modelle kann durch RL automatisiert werden.",
      en: "RL can automate hyperparameter tuning for other AI models.",
    },
    {
      de: "Nutze den Step-Button, um jede Entscheidungsfolge des Rovers nachzuvollziehen.",
      en: "Use the step button to replay every decision the rover makes.",
    },
    {
      de: "Tipp: Drücke die Pfeiltasten (↑↓←→), um die Bewegungsrichtung des Rovers zu beeinflussen!",
      en: "Tip: Press arrow keys (↑↓←→) to influence the rover's movement direction!",
    },
    {
      de: "Shortcut: Mit der Leertaste kannst du das Training pausieren und fortsetzen.",
      en: "Shortcut: Press Space to pause and resume training.",
    },
    {
      de: "Tipp: Drücke 'R', um das Spielfeld zurückzusetzen und von vorne zu beginnen.",
      en: "Tip: Press 'R' to reset the playfield and start fresh.",
    },
    {
      de: "Aktiviere die Policy-Pfeile in den Einstellungen, um zu sehen, welche Richtung der Rover bevorzugt!",
      en: "Enable policy arrows in settings to see which direction the rover prefers!",
    },
    {
      de: "Die Q-Werte zeigen, wie wertvoll der Rover jedes Feld einschätzt – höher ist besser!",
      en: "Q-values show how valuable the rover considers each tile – higher is better!",
    },
    {
      de: "Niedrige Exploration Rate = mehr Nutzung der gelernten Strategie (Exploitation).",
      en: "Low exploration rate = more use of learned strategy (exploitation).",
    },
    {
      de: "Hohe Exploration Rate = mehr zufällige Entscheidungen (Exploration neuer Wege).",
      en: "High exploration rate = more random decisions (exploring new paths).",
    },
    {
      de: "Alpha (Lernrate) bestimmt, wie stark neue Erfahrungen alte Werte überschreiben.",
      en: "Alpha (learning rate) controls how much new experiences override old values.",
    },
    {
      de: "Gamma (Discount-Faktor) bestimmt, wie wichtig zukünftige Belohnungen sind.",
      en: "Gamma (discount factor) controls how much future rewards matter.",
    },
    {
      de: "Tipp: Die Heatmap zeigt dir, welche Felder der Rover am häufigsten besucht hat!",
      en: "Tip: The heatmap shows which tiles the rover visited most often!",
    },
    {
      de: "Nutze die Undo-Funktion (Strg+Z), um Änderungen am Spielfeld rückgängig zu machen!",
      en: "Use the undo function (Ctrl+Z) to revert changes to the playfield!",
    },
    {
      de: "Probiere die Preset-Levels aus – sie bieten spannende vorgefertigte Herausforderungen!",
      en: "Try the preset levels – they offer exciting pre-made challenges!",
    },
    {
      de: "Im Vergleichsmodus kannst du zwei verschiedene Lernstrategien gegeneinander antreten lassen!",
      en: "In comparison mode, you can pit two different learning strategies against each other!",
    },
    {
      de: "Portale teleportieren den Rover zu einem zufälligen freien Feld – nutze sie strategisch!",
      en: "Portals teleport the rover to a random free tile – use them strategically!",
    },
    {
      de: "Die Belohnung für das Erreichen des Ziels beträgt standardmäßig 100 Punkte!",
      en: "Reaching the goal grants a default reward of 100 points!",
    },
    {
      de: "Jeder Schritt kostet den Rover -1 Punkt – kurze Wege werden dadurch belohnt!",
      en: "Each step costs the rover -1 point – shorter paths are rewarded!",
    },
    {
      de: "Tipp: Beobachte die Bestenliste, um deine besten Episoden nachzuverfolgen!",
      en: "Tip: Watch the leaderboard to track your best episodes!",
    },
    {
      de: "Der Rover lernt durch Trial-and-Error – genau wie wir Menschen!",
      en: "The rover learns through trial-and-error – just like humans do!",
    },
    {
      de: "Nach mehreren Episoden erkennt der Rover Muster und findet effizientere Routen!",
      en: "After several episodes, the rover recognizes patterns and finds more efficient routes!",
    },
    {
      de: "Tipp: Ändere die Feldgröße in den Einstellungen für neue Herausforderungen!",
      en: "Tip: Change the field size in settings for new challenges!",
    },
    {
      de: "Im Playground-Modus kannst du eigene Level mit Hindernissen und Belohnungen gestalten!",
      en: "In playground mode, you can design custom levels with obstacles and rewards!",
    },
    {
      de: "Speedrun-Modus: Schaffe es zum Ziel, bevor die Zeit abläuft!",
      en: "Speedrun mode: Reach the goal before time runs out!",
    },
    {
      de: "Die Verlaufsdiagramme zeigen dir, wie sich die Performance über Zeit verbessert!",
      en: "Progress charts show how performance improves over time!",
    },
    {
      de: "Tipp: Kombiniere Heatmap und Policy-Pfeile für maximalen Einblick ins Lernen!",
      en: "Tip: Combine heatmap and policy arrows for maximum learning insight!",
    },
    {
      de: "Challenge-Modus im Zufallsmodus: Gestalte das Level während der Rover lernt!",
      en: "Challenge mode in random mode: Design the level while the rover learns!",
    },
    {
      de: "Wusstest du? Der Rover speichert keine Karte, sondern nur Werte pro Feld!",
      en: "Did you know? The rover stores no map, just values per tile!",
    },
    {
      de: "Reinforcement Learning ist einer der drei Hauptzweige des Machine Learning!",
      en: "Reinforcement learning is one of the three main branches of machine learning!",
    },
    {
      de: "Die Q-Tabelle wird mit jedem Schritt aktualisiert – Live-Learning in Aktion!",
      en: "The Q-table updates with each step – live learning in action!",
    },
    {
      de: "Tipp: Experimentiere mit verschiedenen Alpha- und Gamma-Werten für unterschiedliche Lernstile!",
      en: "Tip: Experiment with different alpha and gamma values for different learning styles!",
    },
    {
      de: "Der Rover wählt manchmal bewusst suboptimale Wege, um neue Strategien zu entdecken!",
      en: "The rover sometimes deliberately chooses suboptimal paths to discover new strategies!",
    },
    {
      de: "RL wird auch in der Robotik verwendet, um komplexe Bewegungsabläufe zu lernen!",
      en: "RL is also used in robotics to learn complex movement sequences!",
    },
    {
      de: "Die Tutorial-Funktion erklärt dir alle Grundlagen – perfekt für Einsteiger!",
      en: "The tutorial feature explains all the basics – perfect for beginners!",
    },
    {
      de: "Tipp: Schau dir die RL-Formel in den Einstellungen an, um die Mathematik zu verstehen!",
      en: "Tip: Check out the RL formula in settings to understand the math!",
    },
    {
      de: "Die Legende zeigt dir alle Feldtypen und ihre Bedeutung – sehr hilfreich!",
      en: "The legend shows all tile types and their meaning – very helpful!",
    },
    {
      de: "Mit der Maus kannst du im Playground-Modus mehrere Felder hintereinander platzieren!",
      en: "Use the mouse to place multiple tiles in a row in playground mode!",
    },
    {
      de: "Der Dark-Mode schont deine Augen bei langen Trainings-Sessions!",
      en: "Dark mode is easier on your eyes during long training sessions!",
    },
    {
      de: "Tipp: Wechsle zwischen Deutsch und Englisch, um die App in deiner Lieblingssprache zu nutzen!",
      en: "Tip: Switch between German and English to use the app in your preferred language!",
    },
    {
      de: "Die Statistiken zeigen dir Durchschnittswerte über alle Episoden hinweg!",
      en: "Statistics show you average values across all episodes!",
    },
    {
      de: "Je mehr Episoden der Rover absolviert, desto besser wird seine Strategie!",
      en: "The more episodes the rover completes, the better its strategy becomes!",
    },
  ];
