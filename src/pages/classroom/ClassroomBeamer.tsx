import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { useTileSize } from "@/components/RL/CompetitionBoard";
import { competitionApi, sessionStore, type Replay } from "@/lib/competition/api";
import { levelLabel } from "@/lib/competition/levelWorld";
import { MEDALS, formatCountdown, formatParams } from "./shared";
import { ReplayBoard } from "./ReplayBoard";
import { downloadCsv, roundCsv } from "./exportCsv";
import { useRoom, useTick } from "./useRoom";

const MAX_ROWS = 10;

/**
 * Projector view for the teacher: big leaderboard and countdown, and the three best test runs playing on a loop.
 * Open it in a second window (needs the browser that created the room).
 */
const ClassroomBeamer = () => {
  const { code = "" } = useParams();
  const hostKey = useMemo(() => sessionStore.getHostKey(code), [code]);
  const { room, error, serverNow } = useRoom(code);
  const [replays, setReplays] = useState<Record<string, Replay>>({});
  useTick(500);

  const top3 = useMemo(() => (room ? room.leaderboard.filter((r) => r.rank && r.rank <= 3) : []), [room]);
  const top3Key = top3.map((r) => `${r.id}:${r.totalReward}:${r.steps}`).join("|");
  const phase = room?.phase;
  useEffect(() => {
    if (!hostKey || !top3.length || phase === "lobby") return;
    let cancelled = false;
    Promise.all(top3.map((r) => competitionApi.replay(code, r.id, hostKey).then((rep) => [r.id, rep] as const).catch(() => null))).then((pairs) => {
      if (!cancelled) setReplays(Object.fromEntries(pairs.filter((p): p is readonly [string, Replay] => p !== null)));
    });
    return () => {
      cancelled = true;
    };
    // top3Key captures everything that makes a refetch necessary.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, hostKey, top3Key, phase]);

  const tileSize = useTileSize((room?.world.size ?? 8) * 3, 40, (w) => Math.round(w * 0.5) + 80);

  if (!hostKey) {
    return (
      <div className="min-h-screen bg-background p-8 text-foreground">
        <p className="mb-4">Die Beamer-Ansicht geht nur in dem Browser, der den Raum {code} erstellt hat.</p>
        <Button asChild><Link to="/klasse">Zurück</Link></Button>
      </div>
    );
  }
  if (!room) {
    return <div className="min-h-screen bg-background p-8 text-foreground">{error ? (error === "Room not found" ? "Raum nicht gefunden oder abgelaufen." : error) : "Lade Raum…"}</div>;
  }

  const joinUrl = `${window.location.origin}/klasse?code=${room.code}`;
  const remainingMs = room.trainingEndsAt - serverNow();
  const rows = room.leaderboard.slice(0, MAX_ROWS);
  const finished = room.phase === "finished";

  return (
    <div className="min-h-screen bg-background p-6 text-foreground lg:p-10">
      <header className="mb-6 flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="text-3xl font-extrabold gradient-text lg:text-5xl">
          Reward Rover · Runde {room.round}
          {room.levelId ? <span className="ml-3 text-xl font-semibold text-muted-foreground lg:text-2xl">Level {room.levelId}: {levelLabel(room.levelId)}</span> : null}
        </h1>
        {room.phase === "training" && <span className="text-5xl font-extrabold tabular-nums text-primary lg:text-7xl">⏱ {formatCountdown(remainingMs)}</span>}
        {finished && <span className="text-4xl font-extrabold lg:text-5xl">🏁 Beendet</span>}
        {room.phase === "lobby" && <span className="text-3xl font-bold lg:text-4xl">Gleich geht's los</span>}
      </header>

      {room.phase === "lobby" ? (
        <div className="flex flex-wrap items-center gap-10">
          <div className="rounded-2xl bg-white p-5 shadow-lg">
            <QRCodeSVG value={joinUrl} size={Math.min(360, Math.round(window.innerHeight * 0.5))} level="M" marginSize={0} aria-label={`QR-Code zum Beitreten: ${joinUrl}`} />
          </div>
          <div className="min-w-0 flex-1 space-y-4">
            <p className="text-xl text-muted-foreground lg:text-2xl">Scannen oder Code eingeben auf {joinUrl.replace(/^https?:\/\//, "").split("?")[0]}</p>
            <p className="text-8xl font-extrabold tracking-[0.3em] gradient-text lg:text-9xl">{room.code}</p>
            <p className="text-2xl font-semibold">
              {room.playerCount} {room.playerCount === 1 ? "Person" : "Personen"} · {room.settings.trainingMinutes} Min · {room.settings.episodeBudget} Episoden
            </p>
            <ul className="flex flex-wrap gap-2">
              {room.leaderboard.map((r) => (
                <li key={r.id} className="rounded-full bg-secondary px-4 py-1.5 text-lg font-semibold">{r.name}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_auto]">
          <div className="space-y-6">
            <ol className="space-y-2">
              {rows.map((row) => (
                <li key={row.id} className="flex items-center gap-4 rounded-xl border border-border/40 bg-card/60 px-5 py-3">
                  <span className="w-14 text-center text-4xl font-bold tabular-nums">{row.rank ? (MEDALS[row.rank - 1] ?? row.rank) : "–"}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-3xl font-bold">{row.name}</span>
                    {row.params && <span className="block truncate text-base text-muted-foreground">{formatParams(row.params)}</span>}
                  </span>
                  {row.submitted ? (
                    <span className="text-right text-2xl tabular-nums">
                      <span className="font-extrabold">{row.totalReward}</span> Pkt
                      <span className="block text-base text-muted-foreground">{row.reachedGoal ? `🎯 ${row.steps} Schritte` : "kein Ziel"}</span>
                    </span>
                  ) : (
                    <span className="text-xl text-muted-foreground">trainiert noch…</span>
                  )}
                </li>
              ))}
            </ol>
            {room.leaderboard.length > MAX_ROWS && <p className="text-lg text-muted-foreground">… und {room.leaderboard.length - MAX_ROWS} weitere</p>}

            {finished && room.totals && (
              <div className="rounded-xl border border-border/40 bg-card/60 p-5">
                <h2 className="mb-3 text-2xl font-bold">Gesamtwertung nach {room.round} Runden</h2>
                <ol className="grid gap-x-8 gap-y-1 text-2xl md:grid-cols-2">
                  {room.totals.slice(0, 8).map((t) => (
                    <li key={t.id} className="flex justify-between gap-4">
                      <span className="truncate">{MEDALS[t.rank - 1] ?? `${t.rank}.`} {t.name}</span>
                      <span className="font-bold tabular-nums">{t.total}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold uppercase tracking-wide text-muted-foreground">Die besten Test-Läufe</h2>
            <div className="flex gap-4">
              {top3.map((row) => {
                const replay = replays[row.id];
                return (
                  <div key={row.id} className="min-w-0">
                    {replay ? (
                      <ReplayBoard world={room.world} replay={replay} tileSize={tileSize} loop compact />
                    ) : (
                      <p className="text-muted-foreground">{row.name} …</p>
                    )}
                  </div>
                );
              })}
              {top3.length === 0 && <p className="text-xl text-muted-foreground">Sobald jemand wertet, siehst du hier die Läufe.</p>}
            </div>
            {finished && (
              <Button variant="outline" onClick={() => downloadCsv(`reward-rover-${room.code}-runde-${room.round}.csv`, roundCsv(room.leaderboard, room.totals))}>
                ⬇ Ergebnisse als CSV
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassroomBeamer;
