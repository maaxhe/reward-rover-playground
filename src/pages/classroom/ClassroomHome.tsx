import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { competitionApi, sessionStore } from "@/lib/competition/api";
import { ClassroomShell } from "./shared";

const ClassroomHome = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const linkCode = /^\d{4}$/.test(params.get("code") ?? "") ? (params.get("code") as string) : null;
  const [code, setCode] = useState(params.get("code") ?? "");
  // Opened from the teacher's QR code: only ask for a name. "Anderer Code" brings back the full page.
  const [showFull, setShowFull] = useState(false);
  const [name, setName] = useState("");
  const [minutes, setMinutes] = useState(5);
  const [budget, setBudget] = useState(30);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Klassen-Challenge · Reward Rover";
  }, []);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setBusy(false);
    }
  };

  const join = () =>
    run(async () => {
      const clean = code.trim();
      const existing = sessionStore.getPlayer(clean);
      if (existing) {
        navigate(`/klasse/play/${clean}`);
        return;
      }
      const session = await competitionApi.join(clean, name);
      sessionStore.setPlayer(clean, session);
      navigate(`/klasse/play/${clean}`);
    });

  const create = () =>
    run(async () => {
      const room = await competitionApi.createRoom(password, { trainingMinutes: minutes, episodeBudget: budget });
      sessionStore.setHostKey(room.code, room.hostKey);
      navigate(`/klasse/host/${room.code}`);
    });

  if (linkCode && !showFull) {
    const returning = Boolean(sessionStore.getPlayer(linkCode));
    return (
      <ClassroomShell>
        <form
          className="mx-auto mt-8 max-w-sm space-y-5 text-center"
          onSubmit={(e) => {
            e.preventDefault();
            if (!busy && (returning || name.trim().length >= 2)) void join();
          }}
        >
          <p className="text-sm uppercase tracking-widest text-muted-foreground">Raum</p>
          <p className="text-6xl font-extrabold tracking-widest text-primary">{linkCode}</p>
          {!returning && (
            <>
              <Label htmlFor="nick" className="sr-only">Spielername</Label>
              <Input
                id="nick"
                autoFocus
                maxLength={20}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Dein Name"
                className="h-14 text-center text-xl md:text-xl"
              />
            </>
          )}
          <Button type="submit" size="lg" className="w-full" disabled={busy || (!returning && name.trim().length < 2)}>
            {returning ? "Weiter" : "Los geht’s"}
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button type="button" onClick={() => setShowFull(true)} className="text-xs text-muted-foreground underline underline-offset-2">
            Anderer Code oder Raum erstellen
          </button>
        </form>
      </ClassroomShell>
    );
  }

  return (
    <ClassroomShell>
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="space-y-4 rounded-lg border-border/40 bg-card/60 p-5">
          <h2 className="text-xl font-bold">🎮 Mitspielen</h2>
          <p className="text-sm text-muted-foreground">
            Gib den Raum-Code deiner Lehrkraft ein und wähle einen Spielernamen. Dafür brauchst du keinen Account.
          </p>
          <div className="space-y-2">
            <Label htmlFor="code">Raum-Code</Label>
            <Input
              id="code"
              inputMode="numeric"
              maxLength={4}
              placeholder="1234"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="text-center text-2xl tracking-widest md:text-2xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nick">Spielername</Label>
            <Input className="md:text-base" id="nick" maxLength={20} value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Rover-Fan" />
          </div>
          <Button className="w-full" disabled={busy || code.length !== 4 || (name.trim().length < 2 && !sessionStore.getPlayer(code))} onClick={join}>
            Beitreten
          </Button>
        </Card>

        <Card className="space-y-4 rounded-lg border-border/40 bg-card/60 p-5">
          <h2 className="text-xl font-bold">🧑‍🏫 Raum erstellen (Lehrkraft)</h2>
          <p className="text-sm text-muted-foreground">
            Alle trainieren ihren Rover auf derselben Welt. Am Ende zählt ein fairer Test-Lauf, den der Server nachrechnet. Die Welt stellst du danach in der Lobby ein.
          </p>
          <div className="space-y-2">
            <Label htmlFor="minutes">Trainingszeit (Minuten)</Label>
            <Input className="md:text-base" id="minutes" type="number" min={1} max={30} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="budget">Episoden-Budget pro Person</Label>
            <Input className="md:text-base" id="budget" type="number" min={10} max={500} step={10} value={budget} onChange={(e) => setBudget(Number(e.target.value))} />
            <p className="text-xs text-muted-foreground">
              Weniger Episoden heißt: Die Wahl von ε, α und γ entscheidet stärker über das Ergebnis.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="teacher-pw">Lehrkraft-Passwort</Label>
            <Input className="md:text-base" id="teacher-pw" type="password" autoComplete="off" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button className="w-full" variant="secondary" disabled={busy || !password} onClick={create}>
            Raum erstellen
          </Button>
        </Card>
      </div>
      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
      <p className="mt-6 text-xs text-muted-foreground">
        Es werden nur Spielernamen gespeichert, keine E-Mail-Adressen. Räume werden nach 24 Stunden automatisch gelöscht.
      </p>
    </ClassroomShell>
  );
};

export default ClassroomHome;
