import type { LeaderboardRow, TotalsRow } from "@/lib/competition/api";

const cell = (value: string | number | null | undefined) => {
  const text = value === null || value === undefined ? "" : String(value);
  // Quote when needed; a leading =,+,-,@ would be read as a formula by spreadsheets, so it is defused.
  const safe = /^[=+\-@]/.test(text) && Number.isNaN(Number(text)) ? `'${text}` : text;
  return /[";\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

const num = (n: number | undefined) => (n === undefined ? "" : String(n).replace(".", ","));

/** Round results as CSV (semicolon separated, UTF-8 with BOM) so German Excel opens it correctly. */
export const roundCsv = (rows: LeaderboardRow[], totals?: TotalsRow[] | null) => {
  const header = [
    "Platz", "Name", "Punkte", "Schritte", "Ziel erreicht", "Episoden",
    "ε Start", "ε Ende", "α Start", "α Ende", "γ Start", "γ Ende", "Parameter geändert (mal)",
    ...(totals ? ["Gesamtpunkte"] : []),
  ];
  const lines = rows.map((r) => {
    const t = totals?.find((x) => x.id === r.id);
    return [
      r.rank, r.name, r.totalReward, r.reachedGoal ? r.steps : "", r.submitted ? (r.reachedGoal ? "ja" : "nein") : "",
      r.episodes,
      num(r.params?.epsilon[0]), num(r.params?.epsilon[1]),
      num(r.params?.alpha[0]), num(r.params?.alpha[1]),
      num(r.params?.gamma[0]), num(r.params?.gamma[1]),
      r.params?.changes ?? "",
      ...(totals ? [t?.total ?? ""] : []),
    ];
  });
  return `\uFEFF${[header, ...lines].map((l) => l.map(cell).join(";")).join("\r\n")}\r\n`;
};

export const downloadCsv = (filename: string, content: string) => {
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
