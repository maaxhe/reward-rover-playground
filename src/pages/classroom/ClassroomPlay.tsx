import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { CompetitionBoard, useTileSize } from "@/components/RL/CompetitionBoard";
import { stepPlayground } from "@/lib/rl/playgroundStep";
import type { PlaygroundState } from "@/lib/rl/types";
import { competitionApi, sessionStore, type LeaderboardRow, type Replay, type SubmitResult } from "@/lib/competition/api";
import { runTest, worldToState, type CompetitionWorld } from "@/lib/competition/world";
import { ClassroomShell, Leaderboard, formatCountdown } from "./shared";
import { ReplayBoard } from "./ReplayBoard";
import { useRoom, useTick } from "./useRoom";

const FAST_STEPS_PER_TICK = 300;
const TICK_MS = 60;
const SUBMIT_EVERY_MS = 3000;

const ClassroomPlay = () => {
  const { code = "" } = useParams();
  const session = useMemo(() => sessionStore.getPlayer(code), [code]);
  const { room, error, serverNow } = useRoom(code, session);
  useTick(500);

  if (!session) {
    return (
      <ClassroomShell>
        <p className="mb-4">Du bist diesem Raum noch nicht beigetreten.</p>
        <Button asChild>
          <Link to={`/klasse?code=${code}`}>Jetzt beitreten</Link>
        </Button>
      </ClassroomShell>
    );
  }
  if (!room) {
    return <ClassroomShell>{error ? <p className="text-destructive">{error === "Room not found" ? "Raum nicht gefunden – ist der Code richtig?" : error}</p> : <p>Lade Raum…</p>}</ClassroomShell>;
  }
  if (!room.me) {
    return (
      <ClassroomShell>
        <p className="mb-4">Du wurdest aus diesem Raum entfernt.</p>
        <Button asChild>
          <Link to="/klasse">Zurück</Link>
        </Button>
      </ClassroomShell>
    );
  }

  return (
    <ClassroomShell wide>
      <Trainer
        code={code}
        session={session}
        world={room.world}
        phase={room.phase}
        episodeBudget={room.episodeBudget}
        remainingMs={room.trainingEndsAt - serverNow()}
        leaderboard={room.leaderboard}
        meId={room.me.id}
        myRank={room.me.rank}
        playerCount={room.playerCount}
      />
    </ClassroomShell>
  );
};

interface TrainerProps {
  code: string;
  session: { playerId: string; token: string };
  world: CompetitionWorld;
  phase: "lobby" | "training" | "finished";
  episodeBudget: number;
  remainingMs: number;
  leaderboard: LeaderboardRow[];
  meId: string;
  myRank: number | null;
  playerCount: number;
}

const Trainer = ({ code, session, world, phase, episodeBudget, remainingMs, leaderboard, meId, myRank, playerCount }: TrainerProps) => {
  const tileSize = useTileSize(world.size, 52, 48);
  const stateRef = useRef<PlaygroundState>(worldToState(world));
  const [view, setView] = useState<PlaygroundState>(stateRef.current);
  const usedBase = useRef(sessionStore.getUsedEpisodes(code));
  const [params, setParams] = useState({ explorationRate: 0.3, alpha: 0.3, gamma: 0.9 });
  const paramsRef = useRef(params);
  paramsRef.current = params;
  const [running, setRunning] = useState(false);
  const [fast, setFast] = useState(true);
  const [showArrows, setShowArrows] = useState(true);
  const [serverResult, setServerResult] = useState<SubmitResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [selected, setSelected] = useState<LeaderboardRow | null>(null);
  const [replay, setReplay] = useState<Replay | null>(null);
  const [replayError, setReplayError] = useState<string | null>(null);

  const used = usedBase.current + view.episode;
  const budgetLeft = Math.max(0, episodeBudget - used);
  const trainingOpen = phase === "training" && remainingMs > 0;
  const canTrain = trainingOpen && budgetLeft > 0;

  // ── Training loop ──────────────────────────────────────────────────────────
  const lastSubmittedEpisode = useRef(-1);
  useEffect(() => {
    if (!running || !canTrain) return;
    const id = setInterval(() => {
      let s = stateRef.current;
      const n = fast ? FAST_STEPS_PER_TICK : 1;
      for (let i = 0; i < n; i += 1) {
        if (usedBase.current + s.episode >= episodeBudget) break;
        s = stepPlayground({ ...s, isRunning: true }, { ...paramsRef.current, consumeRewards: true, autoRestart: true, directionBias: null }).nextState;
      }
      stateRef.current = s;
      setView(s);
      if (usedBase.current + s.episode >= episodeBudget) setRunning(false);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [running, canTrain, fast, episodeBudget]);

  useEffect(() => {
    if (!canTrain && running) setRunning(false);
  }, [canTrain, running]);

  useEffect(() => {
    sessionStore.setUsedEpisodes(code, usedBase.current + view.episode);
  }, [code, view.episode]);

  // ── Submit current Q-table so the server can run the fair test ─────────────
  const submit = useCallback(async () => {
    const s = stateRef.current;
    try {
      const result = await competitionApi.submit(code, session, s.qTable, Math.min(episodeBudget, usedBase.current + s.episode));
      lastSubmittedEpisode.current = s.episode;
      setServerResult(result);
      setSubmitError(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Fehler";
      if (msg !== "Too fast") setSubmitError(msg);
    }
  }, [code, session, episodeBudget]);

  const finalSent = useRef(false);
  useEffect(() => {
    if (phase !== "training") return;
    const id = setInterval(() => {
      if (stateRef.current.episode !== lastSubmittedEpisode.current) submit();
    }, SUBMIT_EVERY_MS);
    return () => clearInterval(id);
  }, [phase, submit]);

  useEffect(() => {
    if (phase === "training" && remainingMs <= 0 && !finalSent.current) {
      finalSent.current = true;
      submit();
    }
  }, [phase, remainingMs, submit]);

  // ── Replays after the competition ──────────────────────────────────────────
  const showReplay = useCallback(
    async (row: LeaderboardRow) => {
      setSelected(row);
      setReplayError(null);
      try {
        setReplay(await competitionApi.replay(code, row.id));
      } catch (e) {
        setReplay(null);
        setReplayError(e instanceof Error ? e.message : "Fehler");
      }
    },
    [code],
  );
  const autoReplayDone = useRef(false);
  useEffect(() => {
    if (phase === "finished" && !autoReplayDone.current) {
      autoReplayDone.current = true;
      const mine = leaderboard.find((r) => r.id === meId);
      if (mine?.submitted) showReplay(mine);
    }
  }, [phase, leaderboard, meId, showReplay]);

  const preview = useMemo(() => runTest(world, view.qTable), [world, view.qTable]);

  const reset = () => {
    usedBase.current += stateRef.current.episode;
    stateRef.current = worldToState(world);
    setView(stateRef.current);
    lastSubmittedEpisode.current = -1;
    setRunning(false);
  };

  const setParam = (key: keyof typeof params) => (v: number[]) => setParams((p) => ({ ...p, [key]: v[0] }));

  return (
    <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge phase={phase} remainingMs={remainingMs} />
          <span className="text-sm text-muted-foreground">
            Episoden: <b className="text-foreground">{Math.min(used, episodeBudget)}</b> / {episodeBudget}
          </span>
          {myRank && (
            <span className="text-sm">
              Platz <b>{myRank}</b> von {leaderboard.filter((r) => r.submitted).length}
            </span>
          )}
        </div>

        {phase === "finished" && replay ? (
          <ReplayBoard world={world} replay={replay} />
        ) : (
          <CompetitionBoard
            grid={view.grid}
            agent={view.agent}
            goal={world.goal}
            tileSize={tileSize}
            showArrows={showArrows}
            qTable={view.qTable}
            label="Spielfeld"
          />
        )}
        {replayError && <p className="text-sm text-destructive">{replayError}</p>}

        {phase === "lobby" && (
          <Card className="rounded-lg border-border/40 bg-card/60 p-4 text-sm">
            ⏳ Warte auf die Lehrkraft … {playerCount} {playerCount === 1 ? "Person ist" : "Personen sind"} im Raum. Sobald das Training startet, siehst du hier deine Regler.
          </Card>
        )}
      </div>

      <div className="space-y-4">
        {phase === "training" && (
          <Card className="space-y-4 rounded-lg border-border/40 bg-card/60 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide">Lernparameter</h2>
            <ParamSlider id="eps" label="Neugier ε" hint="Wie oft probiert der Rover Neues?" value={params.explorationRate} min={0} max={1} step={0.05} onChange={setParam("explorationRate")} />
            <ParamSlider id="alpha" label="Lernrate α" hint="Wie stark überschreiben neue Erfahrungen alte?" value={params.alpha} min={0.05} max={1} step={0.05} onChange={setParam("alpha")} />
            <ParamSlider id="gamma" label="Weitsicht γ" hint="Kurzfristig oder langfristig denken?" value={params.gamma} min={0} max={0.99} step={0.01} onChange={setParam("gamma")} />

            <div className="flex flex-wrap gap-2">
              <Button disabled={!canTrain} onClick={() => setRunning((r) => !r)}>
                {running ? "⏸ Pause" : budgetLeft === 0 ? "Budget aufgebraucht" : "▶ Trainieren"}
              </Button>
              <Button variant="outline" onClick={reset} disabled={view.episode === 0 && Object.keys(view.qTable).length === 0}>
                ↺ Neu starten
              </Button>
              <Button variant="secondary" disabled={!trainingOpen} onClick={submit}>
                ✓ Jetzt werten
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <div className="flex items-center gap-2">
                <Switch id="fast" checked={fast} onCheckedChange={setFast} />
                <Label htmlFor="fast" className="text-sm">Schnell</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="arrows" checked={showArrows} onCheckedChange={setShowArrows} />
                <Label htmlFor="arrows" className="text-sm">Pfeile (bester Zug)</Label>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              „Neu starten“ löscht das Gelernte, verbrauchte Episoden kommen aber nicht zurück.
            </p>
          </Card>
        )}

        {phase !== "lobby" && (
          <Card className="space-y-1 rounded-lg border-border/40 bg-card/60 p-4 text-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide">Test-Lauf</h2>
            <p>
              Dein Rover jetzt (ohne Zufall):{" "}
              <b>{preview.totalReward} Pkt</b> · {preview.reachedGoal ? `🎯 ${preview.steps} Schritte` : "erreicht das Ziel nicht"}
            </p>
            {serverResult && (
              <p className="text-muted-foreground">
                Server hat gewertet: {serverResult.totalReward} Pkt · bester Lauf: <b>{serverResult.bestReward} Pkt</b>
              </p>
            )}
            {submitError && <p className="text-destructive">{submitError}</p>}
          </Card>
        )}

        <Leaderboard rows={leaderboard} meId={meId} onSelect={phase === "finished" ? showReplay : undefined} selectedId={selected?.id} />
        {phase === "finished" && <p className="text-xs text-muted-foreground">Tippe auf einen Namen, um dessen Test-Lauf abzuspielen.</p>}
      </div>
    </div>
  );
};

const StatusBadge = ({ phase, remainingMs }: { phase: string; remainingMs: number }) => {
  if (phase === "lobby") return <span className="rounded-full bg-secondary px-3 py-1 text-sm font-semibold">Lobby</span>;
  if (phase === "finished" || remainingMs <= 0) return <span className="rounded-full bg-secondary px-3 py-1 text-sm font-semibold">🏁 Beendet</span>;
  return <span className="rounded-full bg-primary/15 px-3 py-1 text-sm font-bold tabular-nums text-primary">⏱ {formatCountdown(remainingMs)}</span>;
};

interface ParamSliderProps {
  id: string;
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number[]) => void;
}
const ParamSlider = ({ id, label, hint, value, min, max, step, onChange }: ParamSliderProps) => (
  <div className="space-y-1">
    <div className="flex items-baseline justify-between">
      <Label htmlFor={id} className="font-semibold">{label}</Label>
      <span className="text-sm tabular-nums">{value.toFixed(2)}</span>
    </div>
    <Slider id={id} value={[value]} min={min} max={max} step={step} onValueChange={onChange} />
    <p className="text-xs text-muted-foreground">{hint}</p>
  </div>
);

export default ClassroomPlay;
