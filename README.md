# 🚀 Reward Rover

**Reward Rover** ist mein Versuch, Reinforcement Learning greifbar zu machen.  
Nicht in Form von endlosen Formeln oder komplizierten Papers, sondern als interaktives Spiel.  
Ein kleiner Rover läuft über ein Grid, stolpert in Mauern, kassiert Strafen oder findet Belohnungen – und lernt dabei mit jeder Episode, bessere Entscheidungen zu treffen.

---

## Warum dieses Projekt?

Ich habe mich in den letzten Jahren viel mit KI beschäftigt – von neuronalen Netzen bis zu den neuesten Sprachmodellen.  
Aber was mich am meisten fasziniert, ist der Kern: **Wie lernen Maschinen überhaupt?**  
Reinforcement Learning (RL) ist für mich eines der ehrlichsten Paradigmen, weil es so nah an unserem eigenen Lernen dran ist: Versuch und Irrtum, kleine Belohnungen, große Rückschläge – und langsam entsteht eine Strategie.  

Reward Rover soll genau das zeigen.  
Kein abstraktes Buzzword, sondern eine Erfahrung:  
Du siehst einem Agenten dabei zu, wie er aus „Fehlern“ etwas Sinnvolles macht.  
Und wenn man versteht, wie dieser Prozess funktioniert, versteht man auch ein Stück besser, wie KI-Systeme ihre Welt „sehen“ und warum sie manchmal überraschend gute (oder dumme) Entscheidungen treffen.  

---

## Features

- **Exploration vs. Exploitation**  
  Der zentrale Trade-off im RL: Bleibt der Rover bei sicheren Wegen oder probiert er Neues?  
  Mit jedem Lauf verändert sich sein Verhalten – und du kannst live zuschauen.  

- **Drei Modi**  
  - **Playground:** Baue deine eigene Welt, platziere Mauern, Rewards, Strafen und Portale.  
  - **Zufallsmodus:** Lass dir automatisch generierte Welten erstellen – jedes Mal anders.  
  - **Vergleichsmodus:** Starte zwei Rover gleichzeitig mit unterschiedlichen Hyperparametern (Explorationsrate, Lernrate, Gamma) und sieh, wer schneller lernt.  

- **Q-Learning live erklärt**  
  - Q-Werte lassen sich als Zahlen oder Heatmap einblenden.  
  - Du kannst direkt an den Stellschrauben drehen:  
    - **Explorationsrate (ε):** Wie neugierig ist der Rover?  
    - **Lernrate (α):** Wie stark überschreiben neue Erfahrungen alte Werte?  
    - **Discount-Faktor (γ):** Denkt er kurzfristig oder langfristig?  

- **Levels & Statistik**  
  - Eigene Karten bauen oder Preset-Levels laden.  
  - Nach jeder Episode gibt’s Feedback: Rewards, Strafen, Schritte, Zeit.  
  - Highscores werden gespeichert, damit du Fortschritte vergleichen kannst.  

---

## Wie man spielt

1. Starte das Projekt lokal oder öffne die gehostete Version.  
2. Wähle einen Modus: Playground, Zufall oder Vergleich.  
3. Platziere ein paar Hindernisse oder probier gleich die Preset-Levels.  
4. Klick auf **Start** – und schau, wie der Rover mit jedem Zug schlauer wird.  
5. Passe Parameter an und beobachte, wie sich das Verhalten verändert.  

Es macht einen Unterschied, ob der Rover vorsichtig, gierig oder langfristig denkend unterwegs ist.  
Und genau das ist der Kern von RL: Entscheidungen unter Unsicherheit.  

---

## Warum ist das wichtig?

Wir reden heute viel über „künstliche Intelligenz“.  
Doch oft bleibt unklar, wie Maschinen eigentlich lernen, warum sie manchmal erstaunlich gut generalisieren und in anderen Momenten spektakulär scheitern.  
RL liefert hier einen Schlüssel: Es zeigt, dass Intelligenz nicht aus Zauberei entsteht, sondern aus Feedback, Struktur und unzähligen Versuchen.  

Wenn wir das begreifen, können wir auch besser einschätzen, wo die Grenzen heutiger KI liegen – und wo vielleicht die nächsten Durchbrüche kommen.  
Reward Rover ist für mich ein kleiner Schritt in diese Richtung: ein Tool, das zeigt, wie Lernen funktioniert, und das Diskussionen über KI transparenter macht.  

---

## Tech-Stack

- React + TypeScript  
- Vite  
- Tailwind CSS  
- shadcn/ui  

---

## Installation & Start

Falls du selbst spielen möchtest:

```bash
git clone https://github.com/maaxhe/reward-rover-playground.git
cd reward-rover-playground
npm install
npm run dev
