import { useEffect } from "react";
import { Link } from "react-router-dom";
import "@fontsource-variable/bricolage-grotesque";
import "./landing.css";

/**
 * Privacy notice. Written from what the code actually does (accounts, classroom rooms, browser
 * storage, Umami script). It is a solid starting point, not legal advice: have the points marked
 * in the comments checked against your hosting setup (server logs, Umami region).
 */
const Datenschutz = () => {
  useEffect(() => {
    document.title = "Datenschutzerklärung – Reward Rover";
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
          <h1 style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>Datenschutzerklärung</h1>
          <p style={{ color: "var(--muted)" }}>Stand: Oktober 2026</p>

          <h2 className="legal-h">1. Wer verantwortlich ist</h2>
          <p>
            Maximilian E. Herrmann, Osnabrück, Deutschland
            <br />
            E-Mail: <a href="mailto:contact@maximilianherrmann.com">contact@maximilianherrmann.com</a>
          </p>

          <h2 className="legal-h">2. Kurz gesagt</h2>
          <p>
            Reward Rover kommt ohne Werbung und ohne Tracking-Cookies aus. Du kannst das Spiel und die
            Klassen-Challenge ohne Account nutzen. Gespeichert wird nur, was für die jeweilige Funktion nötig
            ist. Das steht unten im Einzelnen.
          </p>

          <h2 className="legal-h">3. Besuch der Website (Server-Logdaten)</h2>
          <p>
            Beim Aufruf der Seite verarbeitet der Server technisch notwendige Daten: IP-Adresse, Datum und
            Uhrzeit, aufgerufene Adresse, Statuscode und Browser-Kennung. Das ist nötig, um die Seite
            auszuliefern und Missbrauch abzuwehren (Art. 6 Abs. 1 lit. f DSGVO). Die Logdaten werden nur
            kurzzeitig vorgehalten und nicht mit anderen Daten zusammengeführt.
          </p>

          <h2 className="legal-h">4. Account (optional)</h2>
          <p>
            Wenn du dir einen Account anlegst, speichern wir deinen Nutzernamen, dein Passwort (nur als
            Hash, nie im Klartext), deinen Level-Fortschritt und die Umgebungen, die du selbst speicherst.
            Eine E-Mail-Adresse ist dafür nicht nötig. Rechtsgrundlage ist die Vertragserfüllung (Art. 6
            Abs. 1 lit. b DSGVO). Es gibt keine Passwort-Zurücksetzen-Funktion, merke dir das Passwort
            also gut. Auf Wunsch lösche ich deinen Account samt Daten, schreib dazu einfach eine E-Mail.
          </p>
          <p>
            Zum Angemeldetbleiben legt die Seite ein Zugangstoken im Speicher deines Browsers ab
            (localStorage, wenn du „Angemeldet bleiben“ wählst, sonst sessionStorage). Es ist kein Cookie
            und wird nicht an Dritte gesendet.
          </p>

          <h2 className="legal-h">5. Klassen-Challenge</h2>
          <p>
            Beim Beitritt zu einem Raum gibst du einen Spielernamen an. Bitte verwende keinen echten Namen,
            ein Spitzname reicht. Gespeichert werden der Spielername, der Lernstand deines Rovers
            (eine Tabelle mit Zahlen) und dein Ergebnis. Die Daten liegen nur im Arbeitsspeicher des
            Servers, werden spätestens nach 24 Stunden gelöscht und gehen bei einem Neustart des Servers
            sofort verloren. Es gibt keine Anmeldung und keine E-Mail-Adresse.
          </p>
          <p>
            Die Lehrkraft, die den Raum erstellt, sieht die Spielernamen und Ergebnisse ihres Raums.
            Rechtsgrundlage ist unser berechtigtes Interesse an einem funktionierenden Angebot (Art. 6
            Abs. 1 lit. f DSGVO). Wird die Challenge im Unterricht genutzt, entscheidet die Schule über den
            Einsatz im Rahmen ihrer eigenen Vorgaben.
          </p>

          <h2 className="legal-h">6. Speicher im Browser</h2>
          <p>
            Im Browser werden Einstellungen und Spielstände abgelegt, damit nach einem Neuladen nichts
            verloren geht: freigeschaltete Level, ein gemerkter Raumbeitritt in der Klassen-Challenge, die
            Information, dass du die Einführung gesehen hast, und die Wahl des Farbschemas. Diese Daten
            verlassen deinen Browser nicht, außer beim Login (dann wird der Fortschritt mit deinem Account
            abgeglichen). Du kannst sie jederzeit in den Browser-Einstellungen löschen.
          </p>

          <h2 className="legal-h">7. Reichweitenmessung (Umami)</h2>
          <p>
            Ich nutze den Analysedienst Umami (Umami Cloud), um zu sehen, wie oft die Seite aufgerufen wird.
            Umami arbeitet ohne Cookies und ohne Nutzerprofile, die Aufrufe werden nur zusammengezählt.
            Dafür lädt dein Browser ein Skript von <code>cloud.umami.is</code>, dabei wird technisch bedingt
            deine IP-Adresse an Umami übermittelt. Rechtsgrundlage ist mein berechtigtes Interesse an der
            Verbesserung des Angebots (Art. 6 Abs. 1 lit. f DSGVO). Du kannst widersprechen, indem du das
            Laden des Skripts in deinem Browser blockierst.
          </p>

          <h2 className="legal-h">8. Schriften und externe Inhalte</h2>
          <p>
            Die Schrift ist auf dem eigenen Server gespeichert. Es werden keine Google Fonts und keine
            Social-Media-Plugins geladen.
          </p>

          <h2 className="legal-h">9. Deine Rechte</h2>
          <p>
            Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung,
            Datenübertragbarkeit und Widerspruch (Art. 15 bis 21 DSGVO). Schreib dazu eine E-Mail an die
            oben genannte Adresse. Außerdem kannst du dich bei einer Datenschutz-Aufsichtsbehörde
            beschweren, zum Beispiel bei der Landesbeauftragten für den Datenschutz Niedersachsen.
          </p>

          <h2 className="legal-h">10. Änderungen</h2>
          <p>
            Wenn sich das Angebot ändert, passe ich diese Erklärung an. Die aktuelle Fassung steht immer hier.
          </p>

          <p style={{ marginTop: "2rem" }}>
            <Link to="/impressum">Impressum</Link>
          </p>
        </main>
      </div>
    </div>
  );
};

export default Datenschutz;
