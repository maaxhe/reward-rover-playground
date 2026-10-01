export type SimulationSpeed = "1x" | "2x" | "5x" | "max";

export const SIMULATION_SPEEDS: Array<{ key: SimulationSpeed; label: string; delayMs: number }> = [
  { key: "1x", label: "1x", delayMs: 220 },
  { key: "2x", label: "2x", delayMs: 110 },
  { key: "5x", label: "5x", delayMs: 44 },
  { key: "max", label: "Max", delayMs: 20 },
];
