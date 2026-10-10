import { useCallback, useEffect, useRef, useState } from "react";
import { competitionApi, type PlayerSession, type RoomState } from "@/lib/competition/api";

/** Polls the room every 2 s and tracks the server/client clock offset for countdowns. */
export const useRoom = (code: string, session?: PlayerSession | null) => {
  const [room, setRoom] = useState<RoomState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const sessionRef = useRef(session);
  sessionRef.current = session;

  const refresh = useCallback(async () => {
    try {
      const data = await competitionApi.getRoom(code, sessionRef.current);
      setRoom(data);
      setOffset(data.serverNow - Date.now());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
    }
  }, [code]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 2000);
    return () => clearInterval(id);
  }, [refresh]);

  const serverNow = () => Date.now() + offset;
  return { room, error, refresh, serverNow };
};

/** Re-renders every `ms` so countdowns tick. */
export const useTick = (ms = 500) => {
  const [, setN] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setN((n) => n + 1), ms);
    return () => clearInterval(id);
  }, [ms]);
};
