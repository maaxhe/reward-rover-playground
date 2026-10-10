import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import "@fontsource-variable/bricolage-grotesque";
import "./landing.css";
import { LanguageProvider, useLanguage } from "@/contexts/LanguageContext";
import { LiveRover } from "@/components/landing/LiveRover";

const REPO_URL = "https://github.com/maaxhe/reward-rover-playground";

const LandingContent = () => {
  const { translate, isEnglish, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const [code, setCode] = useState("");

  useEffect(() => {
    document.title = translate(
      "Reward Rover – Reinforcement Learning zum Anfassen",
      "Reward Rover – reinforcement learning you can touch",
    );
  }, [translate]);

  const join = (event: FormEvent) => {
    event.preventDefault();
    navigate(code.length === 4 ? `/klasse?code=${code}` : "/klasse");
  };

  return (
    <div className="landing">
      <div className="wrap">
        <header className="topbar">
          <Link to="/" className="wordmark">Reward Rover</Link>
          <nav aria-label={translate("Hauptmenü", "Main menu")}>
            <Link to="/spiel">{translate("Spielen", "Play")}</Link>
            <Link to="/klasse">{translate("Klassen-Challenge", "Classroom")}</Link>
            <button type="button" className="lang" onClick={() => setLanguage(isEnglish ? "de" : "en")} aria-label={translate("Switch to English", "Auf Deutsch wechseln")}>
              {isEnglish ? "DE" : "EN"}
            </button>
          </nav>
        </header>

        <section className="hero">
          <div>
            <h1>{translate("Ein kleiner Rover, der durch Ausprobieren lernt.", "A small rover that learns by trying things out.")}</h1>
            <p className="lede">
              {translate(
                "Reward Rover macht Reinforcement Learning greifbar. Du siehst zu, wie ein Agent aus Fehlern klüger wird, und drehst selbst an den Stellschrauben: seiner ",
                "Reward Rover makes reinforcement learning tangible. You watch an agent get smarter from its mistakes, and you turn the dials yourself: its ",
              )}
              <b>{translate("Neugier", "curiosity")}</b>
              {translate(", seiner ", ", its ")}
              <b>{translate("Lernrate", "learning rate")}</b>
              {translate(" und seiner ", " and its ")}
              <b>{translate("Weitsicht", "foresight")}</b>.
            </p>
            <div className="cta-row">
              <Link to="/spiel" className="btn btn-primary">{translate("Mit Level 1 anfangen", "Start with level 1")}</Link>
              <Link to="/klasse" className="btn btn-ghost">{translate("Eine Klasse einladen", "Invite a class")}</Link>
            </div>
          </div>
          <LiveRover translate={translate} />
        </section>

        <section className="section" aria-labelledby="ways">
          <h2 id="ways">{translate("Wo möchtest du anfangen?", "Where do you want to start?")}</h2>
          <ul className="ways">
            <li className="way">
              <h3>{translate("Level", "Levels")}</h3>
              <p>
                {translate(
                  "Zehn Level, jedes bringt eine neue Idee mit. Du startest auf einem 5×5-Feld und baust dir Schritt für Schritt ein Gefühl dafür auf, warum der Rover tut, was er tut. ",
                  "Ten levels, each one adds a new idea. You start on a 5×5 board and build a feel, step by step, for why the rover does what it does. ",
                )}
                <b>{translate("Jedes Level hat eine Aufgabe, die er wirklich gelernt haben muss.", "Every level has a task he has to have really learned.")}</b>
              </p>
              <div className="way-action">
                <Link to="/spiel" className="btn btn-primary">{translate("Zu den Leveln", "To the levels")}</Link>
              </div>
            </li>

            <li className="way">
              <h3>{translate("Freies Spiel", "Free play")}</h3>
              <p>
                {translate(
                  "Eine eigene Welt bauen: Mauern, Belohnungen, Strafen, Portale, und das Ziel dorthin, wo du es haben willst. Der Modus ist offen, sobald du Level 10 gelöst hast.",
                  "Build your own world: walls, rewards, penalties, portals, and the goal wherever you like. The mode opens once you have solved level 10.",
                )}
              </p>
              <div className="way-action">
                <Link to="/spiel" className="btn btn-ghost">{translate("Zum Spiel", "To the game")}</Link>
              </div>
            </li>

            <li className="way is-class">
              <h3>{translate("Klassen-Challenge", "Classroom challenge")}</h3>
              <p>
                {translate(
                  "Für den Unterricht. Die Lehrkraft öffnet einen Raum, alle treten mit Code oder QR-Code bei, ohne Account. Alle trainieren auf derselben Welt, am Ende zählt ein fairer Test-Lauf. ",
                  "For lessons. The teacher opens a room, everyone joins with a code or QR code, no account needed. Everyone trains on the same world, and a fair test run decides. ",
                )}
                <b>{translate("Es gewinnt, wer die meisten Punkte holt; bei Gleichstand der kürzere Weg.", "Most points win; on a tie, the shorter path.")}</b>
              </p>
              <div className="way-action">
                <form className="join-form" onSubmit={join}>
                  <input
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="1234"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    aria-label={translate("Raum-Code", "Room code")}
                  />
                  <button type="submit" className="btn btn-primary">{translate("Beitreten", "Join")}</button>
                </form>
                <Link to="/klasse" className="btn btn-ghost">{translate("Raum erstellen", "Create a room")}</Link>
                <p className="way-note">
                  {translate(
                    "Gespeichert werden nur Spielernamen. Räume löschen sich nach 24 Stunden.",
                    "Only player names are stored. Rooms delete themselves after 24 hours.",
                  )}
                </p>
              </div>
            </li>
          </ul>
        </section>

        <section className="section note" aria-labelledby="why">
          <h2 id="why">{translate("Warum es das gibt", "Why this exists")}</h2>
          <div className="note-body">
            <p>
              {translate(
                "Ich beschäftige mich seit Jahren mit KI, von neuronalen Netzen bis zu Sprachmodellen. Am meisten fasziniert mich aber die einfache Frage dahinter: Wie lernen Maschinen überhaupt?",
                "I have worked with AI for years, from neural networks to language models. What fascinates me most is the simple question behind it: how do machines learn at all?",
              )}
            </p>
            <p>
              {translate(
                "Reinforcement Learning ist dafür das ehrlichste Beispiel, weil es unserem eigenen Lernen so nah ist: Versuch und Irrtum, kleine Belohnungen, große Rückschläge, und irgendwann eine Strategie. Reward Rover soll genau das spürbar machen, ohne dass vorher eine Formel dasteht.",
                "Reinforcement learning is the most honest example, because it is so close to how we learn ourselves: trial and error, small rewards, big setbacks, and eventually a strategy. Reward Rover is meant to make exactly that tangible, with no formula standing in the way first.",
              )}
            </p>
            <p className="sign">{translate("Max", "Max")}</p>
          </div>
        </section>
      </div>

      <footer>
        <div className="wrap">
          <span>Reward Rover</span>
          <span>
            <Link to="/spiel">{translate("Spielen", "Play")}</Link>
            {" · "}
            <Link to="/klasse">{translate("Klassen-Challenge", "Classroom")}</Link>
            {" · "}
            <a href={REPO_URL} rel="noopener noreferrer">{translate("Quellcode", "Source code")}</a>
            {" · "}
            <Link to="/impressum">{translate("Impressum", "Imprint")}</Link>
          </span>
        </div>
      </footer>
    </div>
  );
};

const Landing = () => (
  <LanguageProvider>
    <LandingContent />
  </LanguageProvider>
);

export default Landing;
