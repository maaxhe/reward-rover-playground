# 🚀 Reward Rover  
*(English version below)*

**Reward Rover** ist mein Versuch, Reinforcement Learning greifbar zu machen.  
Nicht in Form von endlosen Formeln oder komplizierten Papers, sondern als interaktives Spiel.  
Ein kleiner Rover läuft über ein Grid, stolpert in Mauern, kassiert Strafen oder findet Belohnungen – und lernt dabei mit jeder Episode, bessere Entscheidungen zu treffen.

Du kannst den **Reward Rover** direkt hier testen:
- [https://rl-agent.maximleopold.com/](https://rl-agent.maximleopold.com/)
- [https://rl-agent.coxilab.de/](https://rl-agent.coxilab.de/)

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
- Web Workers (Q-Learning läuft off-thread für flüssige UI)  
- Vitest (Unit Tests für den RL-Algorithmus)  

---

## Installation & Start

Falls du selbst spielen möchtest:

```bash
git clone https://github.com/maaxhe/reward-rover-playground.git
cd reward-rover-playground
npm install
npm run dev
```


Danach findest du das Projekt unter http://localhost:5173.

---

## Persönliche Note

Dieses Projekt ist nicht „von Hand“ aus dem Nichts entstanden.
Ich habe beim Bauen KI-Tools zur Unterstützung genutzt – für Boilerplate-Code, UI-Ideen und Debugging.
Mir war wichtig, zu zeigen: Man muss heute nicht alles selbst tippen, um spannende Dinge zu erschaffen.
Die Kunst liegt darin, die Werkzeuge klug einzusetzen und daraus etwas Eigenes zu formen.

Reward Rover ist für mich genau das: ein Lernprojekt, das moderne Tools mit meiner eigenen Idee verbindet.
Ich baue es, weil ich glaube, dass wir bessere Debatten über KI führen können, wenn wir verstehen, wie sie lernt.
Und weil es einfach Spaß macht, dem Rover beim Scheitern und besser Werden zuzuschauen.

– Maxim Leopold

---

## Mehr von mir

Du findest den Reward Rover auch direkt auf meiner Website:
👉 https://www.maximleopold.com

Dort teile ich außerdem Artikel, Projekte und Gedanken rund um Neuroscience, KI und Gesellschaft.

---

# 🚀 Reward Rover (English Version)

Reward Rover is my attempt to make Reinforcement Learning tangible.
Not through endless formulas or dense research papers, but as an interactive game.
A small rover moves across a grid, bumps into walls, collects penalties, finds rewards – and learns to make better decisions with every episode.

You can try the **Reward Rover** directly here:
- [https://rl-agent.maximleopold.com/](https://rl-agent.maximleopold.com/)
- [https://rl-agent.coxilab.de/](https://rl-agent.coxilab.de/)

---

## Why this project?

Over the past years, I’ve spent a lot of time working on AI – from neural networks to the latest language models.
But what fascinates me most is the core question: How do machines actually learn?
Reinforcement Learning (RL) feels like one of the most honest paradigms, because it’s so close to the way we humans learn: trial and error, small rewards, big mistakes – and slowly a strategy emerges.

That’s what Reward Rover is meant to show.
No abstract buzzword, but an experience:
You can literally watch an agent turn “mistakes” into something useful.
And once you understand how this process works, you also understand a bit better how AI systems “see” their world – and why they sometimes make surprisingly good (or dumb) choices.

---

## Features

- **Exploration vs. Exploitation**  
  The central trade-off in RL: Does the rover stick to safe paths or try something new?  
  With every run, its behavior changes – and you can watch live.  

- **Three Modes**  
  - **Playground:** Build your own world, place walls, rewards, penalties, and portals.  
  - **Random Mode:** Let automatically generated worlds be created – different every time.  
  - **Comparison Mode:** Start two rovers simultaneously with different hyperparameters (exploration rate, learning rate, gamma) and see who learns faster.  

- **Q-Learning explained live**  
  - Q-values can be displayed as numbers or a heatmap.  
  - You can directly adjust the parameters:  
    - **Exploration rate (ε):** How curious is the rover?  
    - **Learning rate (α):** How strongly do new experiences overwrite old values?  
    - **Discount factor (γ):** Does it think short-term or long-term?  

- **Levels & Statistics**  
  - Build your own maps or load preset levels.  
  - After each episode, you get feedback: rewards, penalties, steps, time.  
  - High scores are saved so you can compare progress.  

---

## How to play
	1.	Run the project locally or open the hosted version.
	2.	Choose a mode: Playground, Random, or Comparison.
	3.	Place a few walls or just try the presets.
	4.	Click Start – and watch the rover get smarter with each step.
	5.	Adjust parameters and see how its behavior changes.

---

## Why it matters

We talk a lot about “artificial intelligence” these days.
But it’s often unclear how machines really learn, why they sometimes generalize astonishingly well, and why they fail so spectacularly in other cases.
RL provides a key: it shows that intelligence doesn’t come from magic, but from feedback, structure, and countless trials.

Understanding this helps us see where today’s AI has limits – and where breakthroughs might come next.
For me, Reward Rover is a small step in that direction: a tool to show how learning works, and to make conversations about AI more transparent.

---

## Tech Stack
- React + TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Web Workers (Q-Learning runs off-thread for a smooth UI)
- Vitest (unit tests for the RL algorithm)

---

## Installation & Run

If you want to try it yourself:

```bash
git clone https://github.com/maaxhe/reward-rover-playground.git
cd reward-rover-playground
npm install
npm run dev
```

Then open http://localhost:5173.

---

## Personal note

This project wasn’t created “by hand” from scratch.
I built it with the help of AI tools – for boilerplate code, UI ideas, and debugging.
For me, the important part was to show that you don’t have to type every single line yourself to build something meaningful.
The art lies in using the tools wisely and shaping something of your own.

Reward Rover is exactly that for me: a learning project that combines modern tools with my own ideas.
I built it because I believe we can have better debates about AI once we actually understand how it learns.
And also because it’s just fun to watch the rover fail and improve.

– Maxim Leopold

---

## More from me

You can also try the Reward Rover directly on my website:
👉 https://www.maximleopold.com

There I share articles, projects, and thoughts on neuroscience, AI, and society.
