import { useLocation } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { RLGuideButton } from "./RLGuideDialog";

/** "Erklärung" on every page. The classroom pages and the game carry their own button in the header, the beamer view stays clean. */
export function FloatingGuide() {
  const { pathname } = useLocation();
  if (pathname.startsWith("/klasse") || pathname === "/spiel") return null;
  return (
    <LanguageProvider>
      <div className="fixed bottom-4 right-4 z-40">
        <RLGuideButton compact size="default" variant="default" className="rounded-full px-5 text-base shadow-xl ring-2 ring-white/20" />
      </div>
    </LanguageProvider>
  );
}
