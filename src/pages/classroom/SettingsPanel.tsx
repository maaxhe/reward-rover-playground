import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { competitionApi, type RoomSettings } from "@/lib/competition/api";

interface Props {
  code: string;
  hostKey: string;
  settings: RoomSettings;
  seed: number;
  onChanged: () => Promise<void> | void;
  onError: (message: string | null) => void;
}

interface Row {
  key: keyof RoomSettings;
  label: string;
  hint: string;
  min: number;
  max: number;
  step: number;
  unit?: string;
}

/** Rough time a full budget takes at normal (not "Schnell") speed: ~16 steps/s, episodes of ≈ 0.9 × tiles steps. */
const estimateMinutes = (s: RoomSettings) => {
  const minutes = (s.episodeBudget * s.size * s.size * 0.9) / 16 / 60;
  return `Im normalen Tempo dauert das etwa ${minutes < 1 ? "unter 1" : Math.round(minutes * 2) / 2} Min (grobe Schätzung).`;
};

/** Lobby-only world and round settings. Edits are applied (debounced) so the preview next to it stays live. */
export const SettingsPanel = ({ code, hostKey, settings, seed, onChanged, onError }: Props) => {
  const [draft, setDraft] = useState<RoomSettings | null>(null);
  const [seedInput, setSeedInput] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const shown = draft ?? settings;

  const rows: Row[] = [
    { key: "trainingMinutes", label: "Trainingszeit", hint: "Wie lange dürfen alle üben?", min: 1, max: 30, step: 1, unit: "Min" },
    { key: "episodeBudget", label: "Episoden-Budget", hint: "Weniger Episoden: ε, α und γ zählen mehr.", min: 10, max: 500, step: 10 },
    { key: "size", label: "Feldgröße", hint: "Größere Welten sind schwerer zu lernen.", min: 5, max: 12, step: 1 },
    { key: "obstacles", label: "Mauern", hint: "Mehr Mauern: verwinkelter.", min: 0, max: Math.floor(shown.size * shown.size * 0.3), step: 1 },
    { key: "rewards", label: "Belohnungen", hint: "Verlockende Umwege.", min: 0, max: 12, step: 1 },
    { key: "punishments", label: "Strafen", hint: "Fallen auf dem Weg.", min: 0, max: 12, step: 1 },
    { key: "minDistance", label: "Abstand Start–Ziel", hint: "Mindestlänge des Wegs (Felder).", min: 2, max: 2 * shown.size - 4, step: 1 },
  ];

  const apply = (patch: Partial<RoomSettings> & { reroll?: boolean; seed?: number }) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        await competitionApi.updateSettings(code, hostKey, patch);
        onError(null);
      } catch (e) {
        onError(e instanceof Error ? e.message : "Fehler");
      }
      await onChanged();
      setDraft(null);
    }, 450);
  };

  useEffect(() => () => clearTimeout(timer.current), []);

  const change = (key: keyof RoomSettings, value: number) => {
    const next = { ...shown, [key]: value };
    setDraft(next);
    apply(next);
  };

  return (
    <Card className="space-y-4 rounded-lg border-border/40 bg-card/60 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">⚙ Einstellungen</h2>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            setDraft(shown);
            apply({ ...shown, reroll: true });
          }}
        >
          🎲 Welt neu würfeln
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.key} className="space-y-1">
            <div className="flex items-baseline justify-between">
              <Label htmlFor={`s-${row.key}`} className="font-semibold">{row.label}</Label>
              <span className="text-sm tabular-nums">
                {row.key === "size" ? `${shown.size}×${shown.size}` : `${shown[row.key]}${row.unit ? ` ${row.unit}` : ""}`}
              </span>
            </div>
            <Slider
              id={`s-${row.key}`}
              value={[Math.min(row.max, Math.max(row.min, shown[row.key]))]}
              min={row.min}
              max={row.max}
              step={row.step}
              onValueChange={(v) => change(row.key, v[0])}
            />
            <p className="text-xs text-muted-foreground">
              {row.key === "episodeBudget" ? `${row.hint} ${estimateMinutes(shown)}` : row.hint}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3 border-t border-border/40 pt-3">
        <div className="space-y-1">
          <Label htmlFor="seed" className="text-sm font-semibold">Welt-Nummer (Seed)</Label>
          <Input
            id="seed"
            inputMode="numeric"
            className="w-44 tabular-nums"
            placeholder={String(seed)}
            value={seedInput}
            onChange={(e) => setSeedInput(e.target.value.replace(/\D/g, "").slice(0, 10))}
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={!seedInput}
          onClick={() => {
            setDraft(shown);
            apply({ ...shown, seed: Number(seedInput) });
            setSeedInput("");
          }}
        >
          Laden
        </Button>
        <p className="basis-full text-xs text-muted-foreground">
          Aktuelle Welt: <b className="tabular-nums">{seed}</b>. Dieselbe Nummer und dieselben Einstellungen ergeben immer dieselbe Welt, z. B. für die nächste Klasse.
        </p>
      </div>
    </Card>
  );
};
