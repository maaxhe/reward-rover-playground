import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Props {
  translate: (de: string, en: string) => string;
  /** Portals only exist in Free Mode, so Level Mode can leave them out. */
  showPortal?: boolean;
}

/** Always-visible explanation of the board symbols; lives in the far-left sidebar next to the game. */
export function GameLegend({ translate, showPortal = true }: Props) {
  const items = [
    { label: translate("Rover", "Rover"), shape: "rr-rover", emoji: "🤖", description: translate("Der lernende Rover – beobachte seine Entscheidungen!", "The learning rover – watch its decisions unfold!") },
    { label: translate("Ziel", "Goal"), shape: "rr-goal", emoji: "🎯", description: translate("Hier gibt's die größte Belohnung.", "Maximum reward lives here.") },
    { label: translate("Belohnung", "Reward"), shape: "rr-candy", emoji: "🍬", description: translate("Positive Rewards – der Rover mag diese Felder.", "Positive rewards – the rover loves these tiles.") },
    { label: translate("Strafe", "Penalty"), shape: "rr-trap", emoji: "⚡", description: translate("Negative Rewards – besser vermeiden.", "Negative rewards – better avoid them.") },
    { label: translate("Mauer", "Wall"), shape: "rr-wall", emoji: "🧱", description: translate("Unpassierbar – hier kommt keiner durch.", "Solid – nobody passes through here.") },
    ...(showPortal
      ? [{ label: translate("Portal", "Portal"), shape: "rr-portal", emoji: "🌀", description: translate("Teleportiert zu einem anderen Portal.", "Teleports to another portal.") }]
      : []),
  ];

  return (
    <Card className="rounded-lg border-border/40 bg-card/60 p-5">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-foreground">
        {translate("Legende", "Legend")}
      </h3>
      <ul className="space-y-2.5">
        {items.map((item) => (
          <li key={item.label} className="flex items-start gap-3">
            <span className={cn("legend-dot mt-0.5 rounded-md", item.shape === "rr-wall" ? "rr-wall" : "rr-cell")} aria-hidden>
              <span className={item.shape} style={item.shape === "rr-wall" ? { display: "none" } : undefined} />
            </span>
            <span className="text-sm leading-snug">
              <span className="font-semibold text-foreground">{item.label}</span>
              <span className="block text-xs text-muted-foreground">{item.description}</span>
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
