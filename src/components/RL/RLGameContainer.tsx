import React from "react";
import { RLGame } from "./RLGame";

/**
 * Container-Wrapper für RLGame mit neuer Layout-Struktur
 * Wird diese Komponente statt RLGame direkt nutzen für das neue Design
 */
export function RLGameContainer() {
  return (
    <div className="min-h-screen bg-background">
      <RLGame />
    </div>
  );
}
