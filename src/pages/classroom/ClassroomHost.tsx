import { useCallback, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CompetitionBoard, useTileSize } from "@/components/RL/CompetitionBoard";
import { competitionApi, sessionStore, type LeaderboardRow, type Replay } from "@/lib/competition/api";
import { worldToState } from "@/lib/competition/world";
import { ClassroomShell, Leaderboard, MEDALS, formatCountdown } from "./shared";
import { ReplayBoard } from "./ReplayBoard";
import { useRoom, useTick } from "./useRoom";

const ClassroomHost = () => {
  const { code = "" } = useParams();
  const hostKey = useMemo(() => sessionStore.getHostKey(code), [code]);
  const { room, error, refresh, serverNow } = useRoom(code);
  const tileSize = useTileSize(8, 44, 80);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selected, setSelected] = useState<LeaderboardRow | null>(null);
  const [replay, setReplay] = useState<Replay | null>(null);
  useTick(500);

  const act = useCallback(
    async (fn: () => Promise<unknown>) => {
      setBusy(true);
      setActionError(null);
      try {
        await fn();
        await refresh();
      } catch (e) {
        setActionError(e instanceof Error ? e.message : "Fehler");
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );

  const showReplay = async (row: LeaderboardRow) => {
    setSelected(row);
    try {
      setReplay(await competitionApi.replay(code, row.id));
    } catch (e) {
      setReplay(null);
      setActionError(e instanceof Error ? e.message : "Fehler");
    }
  };

  if (!hostKey) {
    return (
      <ClassroomShell>
        <p className="mb-4">Dieser Browser hat den Raum {code} nicht erstellt, daher gibt es hier keine Steuerung.</p>
        <Button asChild><Link to="/klasse">Zurück</Link></Button>
      </ClassroomShell>
    );
  }
  if (!room) {
    return <ClassroomShell>{error ? <p className="text-destructive">{error === "Room not found" ? "Raum nicht gefunden oder abgelaufen." : error}</p> : <p>Lade Raum…</p>}</ClassroomShell>;
  }

  const joinUrl = `${window.location.origin}/klasse?code=${room.code}`;
  const remainingMs = room.trainingEndsAt - serverNow();
  const submittedCount = room.leaderboard.filter((r) => r.submitted).length;
  const top3 = room.leaderboard.filter((r) => r.rank && r.rank <= 3);

  return (
    <ClassroomShell wide>
      <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
        <div className="space-y-4">
          <Card className="rounded-lg border-border/40 bg-card/60 p-5">
            <p className="text-sm text-muted-foreground">Raum-Code · {joinUrl.replace(/^https?:\/\//, "")}</p>
            <p className="text-6xl font-extrabold tracking-[0.3em] gradient-text">{room.code}</p>
            <p className="mt-2 text-sm">
              {room.playerCount} {room.playerCount === 1 ? "Person" : "Personen"} · Training {room.trainingMs / 60000} Min · Budget {room.episodeBudget} Episoden
            </p>
          </Card>

          <Card className="flex flex-wrap items-center gap-3 rounded-lg border-border/40 bg-card/60 p-4">
            {room.phase === "lobby" && (
              <Button size="lg" disabled={busy || room.playerCount === 0} onClick={() => act(() => competitionApi.start(code, hostKey))}>
                ▶ Training starten
              </Button>
            )}
            {room.phase === "training" && (
              <>
                <span className="text-3xl font-bold tabular-nums text-primary">⏱ {formatCountdown(remainingMs)}</span>
                <span className="text-sm text-muted-foreground">{submittedCount} von {room.playerCount} haben schon gewertet</span>
                <Button variant="outline" disabled={busy} onClick={() => act(() => competitionApi.finish(code, hostKey))}>
                  Jetzt beenden
                </Button>
              </>
            )}
            {room.phase === "finished" && <span className="text-xl font-bold">🏁 Beendet – tippe auf einen Namen für den Replay</span>}
            {actionError && <span className="text-sm text-destructive">{actionError}</span>}
          </Card>

          {room.phase === "finished" && top3.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-3">
              {top3.map((row) => (
                <Card key={row.id} className="rounded-lg border-border/40 bg-card/60 p-4 text-center">
                  <div className="text-4xl">{MEDALS[(row.rank ?? 1) - 1]}</div>
                  <div className="truncate text-lg font-bold">{row.name}</div>
                  <div className="text-sm tabular-nums">{row.totalReward} Pkt{row.reachedGoal ? ` · ${row.steps} Schritte` : ""}</div>
                </Card>
              ))}
            </div>
          )}

          <Leaderboard
            rows={room.leaderboard}
            onSelect={room.phase === "finished" ? showReplay : undefined}
            selectedId={selected?.id}
            onKick={(row) => act(() => competitionApi.kick(code, hostKey, row.id))}
          />
        </div>

        <div className="space-y-3">
          {room.phase === "finished" && replay ? (
            <ReplayBoard world={room.world} replay={replay} />
          ) : (
            <>
              <h2 className="text-sm font-semibold uppercase tracking-wide">Die Welt</h2>
              <CompetitionBoard
                grid={worldToState(room.world).grid}
                agent={room.world.agent}
                goal={room.world.goal}
                tileSize={tileSize}
                label="Wettbewerbs-Welt"
              />
            </>
          )}
        </div>
      </div>
    </ClassroomShell>
  );
};

export default ClassroomHost;
