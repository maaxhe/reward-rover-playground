import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { competitionApi, type PlayerSession, type VoteState } from "@/lib/competition/api";

interface OptionRowProps {
  title: string;
  unit: string;
  options: number[];
  tally: Record<string, number>;
  selected?: number;
  disabled?: boolean;
  onPick?: (value: number) => void;
}

const OptionRow = ({ title, unit, options, tally, selected, disabled, onPick }: OptionRowProps) => {
  const max = Math.max(1, ...options.map((o) => tally[o] ?? 0));
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            disabled={disabled || !onPick}
            onClick={() => onPick?.(o)}
            aria-pressed={selected === o}
            className={cn(
              "relative min-h-12 overflow-hidden rounded-lg border px-3 py-2 text-left transition-colors",
              selected === o ? "border-primary bg-primary/15" : "border-border/60 bg-card/60",
              onPick && !disabled && "hover:bg-secondary/50 active:scale-[0.98]",
            )}
          >
            <span
              className="absolute inset-y-0 left-0 bg-primary/20"
              style={{ width: `${((tally[o] ?? 0) / max) * 100}%` }}
              aria-hidden
            />
            <span className="relative flex items-baseline justify-between gap-2">
              <span className="font-bold">{o} {unit}</span>
              <span className="text-xs tabular-nums text-muted-foreground">{tally[o] ?? 0}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

/** Students vote on training time and episode budget – only visible while the teacher has opened the vote. */
export const PlayerVoteCard = ({ code, session, vote, onVoted }: { code: string; session: PlayerSession; vote: VoteState; onVoted?: () => void }) => {
  const [error, setError] = useState<string | null>(null);
  const pick = async (choice: { minutes?: number; budget?: number }) => {
    try {
      await competitionApi.vote(code, session, choice);
      setError(null);
      onVoted?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
    }
  };
  return (
    <Card className="space-y-4 rounded-lg border-primary/40 bg-card/60 p-4">
      <div>
        <h2 className="text-lg font-bold">Stimmt ab!</h2>
        <p className="text-sm text-muted-foreground">Wie lange sollen wir trainieren und wie viele Episoden darf jede:r nutzen? Du kannst deine Stimme ändern, bis die Lehrkraft entscheidet.</p>
      </div>
      <OptionRow
        title="Trainingszeit"
        unit="Min"
        options={vote.minutesOptions}
        tally={vote.tally.minutes}
        selected={vote.mine?.minutes}
        onPick={(value) => pick({ minutes: value })}
      />
      <OptionRow
        title="Episoden-Budget"
        unit="Episoden"
        options={vote.budgetOptions}
        tally={vote.tally.budget}
        selected={vote.mine?.budget}
        onPick={(value) => pick({ budget: value })}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </Card>
  );
};

/** Teacher side: open/close the vote, watch the tally live, adopt the winners. */
export const HostVoteCard = ({
  code,
  hostKey,
  vote,
  playerCount,
  onChanged,
  onError,
}: {
  code: string;
  hostKey: string;
  vote: VoteState;
  playerCount: number;
  onChanged: () => Promise<void> | void;
  onError: (message: string | null) => void;
}) => {
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      onError(null);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Fehler");
    }
    await onChanged();
    setBusy(false);
  };

  return (
    <Card className="space-y-4 rounded-lg border-border/40 bg-card/60 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">Abstimmung</h2>
        {vote.open ? (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={busy || vote.voters === 0} onClick={() => run(async () => { await competitionApi.applyVote(code, hostKey); })}>
              Ergebnis übernehmen & schließen
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => competitionApi.openVote(code, hostKey, false))}>
              Schließen
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => run(() => competitionApi.openVote(code, hostKey, true, true))}>
            Abstimmung freigeben
          </Button>
        )}
      </div>
      {vote.open ? (
        <>
          <p className="text-sm text-muted-foreground">{vote.voters} von {playerCount} haben abgestimmt. Bei Gleichstand bleibt der aktuelle Wert, sonst gewinnt die kleinere Option.</p>
          <OptionRow title="Trainingszeit" unit="Min" options={vote.minutesOptions} tally={vote.tally.minutes} />
          <OptionRow title="Episoden-Budget" unit="Episoden" options={vote.budgetOptions} tally={vote.tally.budget} />
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Die Schüler:innen können nur abstimmen, wenn du es freigibst. Sie wählen Trainingszeit und Episoden-Budget, du übernimmst das Ergebnis.
        </p>
      )}
    </Card>
  );
};
