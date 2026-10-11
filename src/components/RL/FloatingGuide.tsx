import { useLocation } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { RLGuideButton } from "./RLGuideDialog";

/** "Erklärung" on every page. The classroom pages carry their own button in the header, the beamer view stays clean. */
export function FloatingGuide() {
  const { pathname } = useLocation();
  if (pathname.startsWith("/klasse")) return null;
  return (
    <LanguageProvider>
      <div className="fixed bottom-4 right-4 z-40">
        <RLGuideButton compact variant="default" className="shadow-lg" />
      </div>
    </LanguageProvider>
  );
}
