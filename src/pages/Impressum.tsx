import { useEffect } from "react";
import { Link } from "react-router-dom";
import "@fontsource-variable/bricolage-grotesque";
import "./landing.css";

/**
 * Provider details (§ 5 DDG). Name, place and e-mail are taken from the existing imprint on
 * maximilianherrmann.com/impressum.html. A street address is legally expected as well:
 * fill `street` in and it appears.
 */
const PROVIDER = {
  name: "Maximilian E. Herrmann",
  street: "", // e.g. "Musterstraße 1" — leave empty until filled in
  city: "Osnabrück, Deutschland",
  email: "contact@maximilianherrmann.com",
  site: "maximilianherrmann.com",
};

const Impressum = () => {
  useEffect(() => {
    document.title = "Impressum – Reward Rover";
  }, []);

  return (
    <div className="landing">
      <div className="wrap" style={{ maxWidth: "44rem" }}>
        <header className="topbar">
          <Link to="/" className="wordmark">Reward Rover</Link>
          <nav aria-label="Hauptmenü">
            <Link to="/spiel">Spielen</Link>
            <Link to="/klasse">Klassen-Challenge</Link>
          </nav>
        </header>

        <main style={{ padding: "2rem 0 4rem" }}>
          <h1 style={{ fontSize: "2.5rem", marginBottom: "2rem" }}>Impressum</h1>

          <h2 className="legal-h">Angaben gemäß § 5 DDG</h2>
          <p>
            <strong>{PROVIDER.name}</strong>
            <br />
            {PROVIDER.street && (
              <>
                {PROVIDER.street}
                <br />
              </>
            )}
            {PROVIDER.city}
          </p>

          <h2 className="legal-h">Kontakt</h2>
          <p>
            E-Mail: <a href={`mailto:${PROVIDER.email}`}>{PROVIDER.email}</a>
            <br />
            Website: <a href={`https://${PROVIDER.site}`}>{PROVIDER.site}</a>
          </p>

          <h2 className="legal-h">Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
          <p>
            {PROVIDER.name}
            <br />
            {PROVIDER.city}
          </p>

          <h2 className="legal-h">Haftung für Inhalte</h2>
          <p>
            Als Diensteanbieter bin ich für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen
            verantwortlich. Nach §§ 8 bis 10 DDG bin ich jedoch nicht verpflichtet, übermittelte oder gespeicherte
            fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit
            hinweisen. Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den
            allgemeinen Gesetzen bleiben unberührt. Eine Haftung ist erst ab Kenntnis einer konkreten
            Rechtsverletzung möglich; bei Bekanntwerden entsprechender Rechtsverletzungen entferne ich diese
            Inhalte umgehend.
          </p>

          <h2 className="legal-h">Haftung für Links</h2>
          <p>
            Dieses Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte ich keinen Einfluss habe.
            Für diese fremden Inhalte kann ich keine Gewähr übernehmen; verantwortlich ist stets der jeweilige
            Anbieter. Bei Bekanntwerden von Rechtsverletzungen entferne ich solche Links umgehend.
          </p>

          <h2 className="legal-h">Urheberrecht</h2>
          <p>
            Die von mir erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht.
            Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des
            Urheberrechts bedürfen der schriftlichen Zustimmung des jeweiligen Autors. Der Quellcode von Reward
            Rover ist öffentlich auf{" "}
            <a href="https://github.com/maaxhe/reward-rover-playground" rel="noopener noreferrer">GitHub</a>{" "}
            einsehbar; maßgeblich ist die dort angegebene Lizenz.
          </p>

          <h2 className="legal-h">Streitschlichtung</h2>
          <p>
            Ich bin nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer
            Verbraucherschlichtungsstelle teilzunehmen.
          </p>
        </main>
      </div>
    </div>
  );
};

export default Impressum;
