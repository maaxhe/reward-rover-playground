import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import type { LeaderboardRow } from "@/lib/competition/api";

export const ClassroomShell = ({ children, wide = false }: { children: ReactNode; wide?: boolean }) => (
  <LanguageProvider>
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/klasse" className="text-xl font-bold gradient-text">
            Reward Rover · Klassen-Challenge
          </Link>
          <nav className="flex gap-4 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground">Startseite</Link>
            <Link to="/spiel" className="hover:text-foreground">Zum Spiel</Link>
          </nav>
        </div>
      </header>
      <main className={cn("mx-auto px-4 py-6", wide ? "max-w-6xl" : "max-w-3xl")}>{children}</main>
      <footer className="mx-auto max-w-6xl px-4 pb-8 text-xs text-muted-foreground">
        <Link to="/impressum" className="underline underline-offset-2 hover:text-foreground">Impressum</Link>
        {" · "}
        <Link to="/datenschutz" className="underline underline-offset-2 hover:text-foreground">Datenschutz</Link>
      </footer>
    </div>
  </LanguageProvider>
);

export const formatCountdown = (ms: number) => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};

export const MEDALS = ["🥇", "🥈", "🥉"];

interface LeaderboardProps {
  rows: LeaderboardRow[];
  meId?: string;
  onSelect?: (row: LeaderboardRow) => void;
  selectedId?: string | null;
  onKick?: (row: LeaderboardRow) => void;
}

export const Leaderboard = ({ rows, meId, onSelect, selectedId, onKick }: LeaderboardProps) => (
  <Card className="overflow-hidden rounded-lg border-border/40 bg-card/60">
    {rows.length === 0 ? (
      <p className="p-4 text-sm text-muted-foreground">Noch niemand beigetreten.</p>
    ) : (
      <ol className="divide-y divide-border/40">
        {rows.map((row) => (
          <li
            key={row.id}
            className={cn(
              "flex items-center gap-3 px-4 py-2",
              row.id === meId && "bg-primary/10",
              selectedId === row.id && "ring-2 ring-inset ring-primary",
              onSelect && row.submitted && "cursor-pointer hover:bg-secondary/40",
            )}
            onClick={() => onSelect && row.submitted && onSelect(row)}
          >
            <span className="w-8 text-center text-lg font-bold tabular-nums">
              {row.rank ? (MEDALS[row.rank - 1] ?? row.rank) : "–"}
            </span>
            <span className="flex-1 truncate font-semibold">
              {row.name}
              {row.id === meId && <span className="ml-2 text-xs text-muted-foreground">(du)</span>}
            </span>
            {row.submitted ? (
              <span className="text-right text-sm tabular-nums">
                <span className="font-bold">{row.totalReward}</span> Pkt ·{" "}
                {row.reachedGoal ? `🎯 ${row.steps} Schritte` : "kein Ziel"}
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">trainiert noch…</span>
            )}
            {onKick && (
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onKick(row);
                }}
                aria-label={`${row.name} entfernen`}
              >
                ✕
              </button>
            )}
          </li>
        ))}
      </ol>
    )}
  </Card>
);
