import { cn } from "@/lib/utils";
import { useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { RLGame } from "./RLGame";
import { ParametersPanel } from "./ParametersPanel";
import { FeedbackNote } from "./FeedbackNote";
import { LevelProgressBar } from "./LevelProgressBar";
import { LevelUnlocksCard } from "./LevelUnlocksCard";
import { GameLegend } from "./GameLegend";
import { RLGuideButton } from "./RLGuideDialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { LevelProvider } from "@/contexts/LevelContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getUnlockedFeatures } from "@/lib/levelProgression";
import type { LevelNumber } from "@/lib/levelProgression";
import { api } from "@/lib/api";

/** Static info cards fold away on phones (tap to open) and stay fully visible on larger screens. */
/** Collapsible sidebar card on every screen size. `summary` stays visible while folded. */
function Fold({
  title,
  summary,
  open,
  onToggle,
  children,
}: {
  title: string;
  summary?: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="mt-3 border-t border-border/60">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 py-3 text-left text-sm font-semibold text-foreground"
      >
        <span>{title}</span>
        <span className="flex items-center gap-2">
          {!open && summary && <span className="text-xs font-medium text-muted-foreground">{summary}</span>}
          <span className={cn("text-muted-foreground transition-transform", open && "rotate-180")} aria-hidden>▾</span>
        </span>
      </button>
      {open && <div className="pb-3">{children}</div>}
    </div>
  );
}

const FOLD_INTRO_KEY = "rr-fold-intro";
/** The cards stay open this long on the first visit so the explanation can be read, then fold away. */
const FOLD_INTRO_MS = 15_000;

export function RLGameNew() {
  const { translate } = useLanguage();
  // First visit of a session: Level and Legend start open with an explanation, then fold away on their own.
  const [foldIntro, setFoldIntro] = useState(() => {
    try {
      return sessionStorage.getItem(FOLD_INTRO_KEY) !== "1";
    } catch {
      return true;
    }
  });
  const [folds, setFolds] = useState({ level: foldIntro, unlocks: foldIntro, legend: foldIntro });
  const touchedFolds = useRef(new Set<string>());
  const toggleFold = (key: "level" | "unlocks" | "legend") => {
    touchedFolds.current.add(key);
    setFolds((f) => ({ ...f, [key]: !f[key] }));
  };
  useEffect(() => {
    if (!foldIntro) return;
    try {
      sessionStorage.setItem(FOLD_INTRO_KEY, "1");
    } catch {
      /* ignore */
    }
    const id = window.setTimeout(() => {
      setFolds((f) => ({
        level: touchedFolds.current.has("level") ? f.level : false,
        unlocks: touchedFolds.current.has("unlocks") ? f.unlocks : false,
        legend: touchedFolds.current.has("legend") ? f.legend : false,
      }));
      setFoldIntro(false);
    }, FOLD_INTRO_MS);
    return () => window.clearTimeout(id);
  }, [foldIntro]);
  const [explorationRate, setExplorationRate] = useState(0.2);
  const [alpha, setAlpha] = useState(0.1);
  const [gamma, setGamma] = useState(0.85);
  const [mode, setMode] = useState<"levels" | "free">("levels");
  const [comparisonActive, setComparisonActive] = useState(false);
  const [currentLevel, setCurrentLevel] = useState<LevelNumber>(1);
  const [freeModeUnlocked, setFreeModeUnlocked] = useState(false);
  // Highest level the player has unlocked by solving the previous one.
  // Reaches 11 once level 10 is solved, which unlocks Free Mode.
  const [maxUnlockedLevel, setMaxUnlockedLevel] = useState(1);

  const tokenRef = useRef<string | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);

  const MAX_UNLOCK_KEY = "rr-max-unlocked-level";
  const FREE_MODE_KEY = "rr-free-mode-unlocked";

  const readLocalProgress = () => {
    const n = parseInt(window.localStorage.getItem(MAX_UNLOCK_KEY) ?? "1", 10);
    return {
      level: Number.isNaN(n) ? 1 : Math.max(1, Math.min(11, n)),
      freemode: window.localStorage.getItem(FREE_MODE_KEY) === "true",
    };
  };

  // Merge local and server progress (max wins), apply it locally and push it back.
  const syncProgress = useCallback(async (token: string) => {
    try {
      const local = readLocalProgress();
      const merged = await api.updateProgress(token, {
        level: local.level,
        freemode_unlocked: local.freemode ? 1 : 0,
      });
      window.localStorage.setItem(MAX_UNLOCK_KEY, String(merged.level));
      setMaxUnlockedLevel(Math.min(11, Math.max(1, merged.level)));
      if (merged.freemode_unlocked) {
        window.localStorage.setItem(FREE_MODE_KEY, "true");
        setFreeModeUnlocked(true);
      }
    } catch {
      // Offline or token expired: progress stays local, so just keep playing.
    }
  }, []);

  // RLGame owns the login; it tells us whenever the token changes so progress can follow the account.
  const handleAuthTokenChange = useCallback(
    (token: string | null) => {
      tokenRef.current = token;
      setLoggedIn(token !== null);
      if (token) void syncProgress(token);
    },
    [syncProgress],
  );

  // Restore saved progress on mount (after hydration to avoid SSR mismatch).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedUnlock = window.localStorage.getItem(MAX_UNLOCK_KEY);
    if (storedUnlock) {
      const n = parseInt(storedUnlock, 10);
      if (!Number.isNaN(n) && n >= 1) setMaxUnlockedLevel(Math.min(11, n));
    }
    if (window.localStorage.getItem(FREE_MODE_KEY) === "true") {
      setFreeModeUnlocked(true);
    }
  }, []);

  // Keep the latest level in a ref so the (stable) solve handler always sees it.
  const currentLevelRef = useRef(currentLevel);
  useEffect(() => {
    currentLevelRef.current = currentLevel;
  }, [currentLevel]);

  // Called from RLGame when the rover reaches the goal in Level Mode.
  const handleLevelSolved = useCallback(() => {
    setMaxUnlockedLevel((prev) => {
      const next = Math.min(11, Math.max(prev, currentLevelRef.current + 1));
      if (next !== prev && typeof window !== "undefined") {
        window.localStorage.setItem(MAX_UNLOCK_KEY, String(next));
        if (tokenRef.current) {
          api.updateProgress(tokenRef.current, { level: next }).catch(() => {});
        }
      }
      return next;
    });
  }, []);

  // Cheat code: type "blauwal" to unlock Free Mode
  useEffect(() => {
    let keySequence = "";
    const handleKeyPress = (e: KeyboardEvent) => {
      keySequence += e.key.toLowerCase();
      if (keySequence.length > 10) {
        keySequence = keySequence.slice(-10);
      }
      if (keySequence.includes("blauwal")) {
        setFreeModeUnlocked(true);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(FREE_MODE_KEY, "true");
        }
        keySequence = "";
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, []);

  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState("");
  const [pwError, setPwError] = useState(false);
  const submitPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.trim().toLowerCase() === "blauwal") {
      setFreeModeUnlocked(true);
      window.localStorage.setItem(FREE_MODE_KEY, "true");
      setPwOpen(false);
      setPw("");
      setPwError(false);
      setMode("free");
    } else {
      setPwError(true);
    }
  };

  const canAccessFreeMode = freeModeUnlocked || maxUnlockedLevel > 10;
  const isLevelMode = mode === "levels";
  const unlockedFeatures = getUnlockedFeatures(currentLevel);
  // The next level is only reachable once the current one has been solved.
  const nextLevelLocked = currentLevel >= maxUnlockedLevel;

  const goToLevel = (level: number) => {
    const clamped = Math.max(1, Math.min(10, level)) as LevelNumber;
    // Never allow jumping past the highest unlocked level.
    if (clamped > maxUnlockedLevel) return;
    setCurrentLevel(clamped);
  };

  // Wipes saved level/free-mode progress (e.g. from earlier testing) so
  // locking can be re-verified from a clean slate without opening DevTools.
  const resetProgress = () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(MAX_UNLOCK_KEY);
      window.localStorage.removeItem(FREE_MODE_KEY);
    }
    setMaxUnlockedLevel(1);
    setFreeModeUnlocked(false);
    setCurrentLevel(1);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Mode Selector */}
      <div className="border-b border-border/40 bg-background px-4 md:px-8 py-3 md:py-4 md:sticky md:top-0 z-30">
        <div className="grid grid-cols-2 items-center gap-2 md:flex md:flex-wrap md:gap-3">
          <Link to="/" className="col-span-2 mr-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
            ← {translate("Startseite", "Home")}
          </Link>
          <Button
            variant={mode === "levels" ? "default" : "outline"}
            onClick={() => setMode("levels")}
            className="w-full font-semibold md:w-auto"
          >
            {translate("Level-Modus", "Level Mode")}
          </Button>
          <Button
            variant={mode === "free" ? "default" : "outline"}
            onClick={() => (canAccessFreeMode ? setMode("free") : setPwOpen(true))}
            className="w-full font-semibold md:w-auto"
          >
            {translate("Free Mode", "Free Mode")}
            {!canAccessFreeMode && <span className="ml-2 text-xs">🔒</span>}
          </Button>
          <Button asChild variant="outline" className="w-full font-semibold md:ml-auto md:w-auto">
            <Link to="/klasse">{translate("Klassen-Modus", "Classroom")}</Link>
          </Button>
          <RLGuideButton size="default" variant="default" className="w-full font-semibold md:w-auto" />
        </div>
      </div>

      <Dialog open={pwOpen} onOpenChange={(o) => { setPwOpen(o); if (!o) { setPw(""); setPwError(false); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Free Mode 🔒</DialogTitle>
            <DialogDescription>
              {translate(
                "Gib das Passwort ein, oder löse alle 10 Level.",
                "Enter the password, or solve all 10 levels.",
              )}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitPassword} className="flex flex-col gap-3">
            <Input
              type="password"
              autoFocus
              value={pw}
              onChange={(e) => { setPw(e.target.value); setPwError(false); }}
              placeholder={translate("Passwort", "Password")}
              aria-label={translate("Passwort", "Password")}
            />
            {pwError && <p className="text-sm text-destructive" role="alert">{translate("Falsches Passwort.", "Wrong password.")}</p>}
            <Button type="submit">{translate("Freischalten", "Unlock")}</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Main Content - 2 Column Layout */}
      <div className="flex flex-1 flex-col md:flex-row md:overflow-hidden">
        {/* Left Sidebar - Parameters & Progress */}
        <div className="w-full md:w-72 flex-shrink-0 border-b md:border-b-0 md:border-r border-border/40 bg-card/20 p-4 md:p-6 md:overflow-y-auto">
          {!isLevelMode && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMode("levels")}
                className="w-full font-semibold mb-6"
              >
                ← {translate("Zurück zu Level-Modus", "Back to Level Mode")}
              </Button>
            </>
          )}
          {isLevelMode && (
            <>
              {foldIntro && (
                <p className="mb-3 border-l-2 border-primary pl-3 text-xs leading-relaxed text-foreground/90">
                  {translate(
                    "Hier links steht, in welchem Level du bist, was du schon benutzen darfst und was die Symbole auf dem Feld bedeuten. In ein paar Sekunden klappt das zusammen. Tipp auf den Titel, dann ist es wieder da.",
                    "On the left you see which level you're in, what you can already use and what the symbols on the board mean. This folds up in a few seconds. Tap a title to bring it back.",
                  )}
                </p>
              )}
              <Fold
                title={`${translate("Level", "Level")} ${currentLevel} / 10`}
                summary={`${Math.round((currentLevel / 10) * 100)}%`}
                open={folds.level}
                onToggle={() => toggleFold("level")}
              >
                <LevelProgressBar currentLevel={currentLevel} translate={translate} />
              </Fold>
              <div className="mt-3 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToLevel(currentLevel - 1)}
                  disabled={currentLevel <= 1}
                  className="flex-1 font-semibold"
                >
                  ← {translate("Level", "Level")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToLevel(currentLevel + 1)}
                  disabled={currentLevel >= 10 || nextLevelLocked}
                  className="flex-1 font-semibold"
                >
                  {translate("Level", "Level")} →
                  {nextLevelLocked && currentLevel < 10 && <span className="ml-1 text-xs">🔒</span>}
                </Button>
              </div>
              {nextLevelLocked && (
                <p className="mt-2 text-xs text-muted-foreground">
                  🔒{" "}
                  {currentLevel >= 10
                    ? translate(
                        "Erreiche das Ziel, um den Free Mode freizuschalten.",
                        "Reach the goal to unlock Free Mode.",
                      )
                    : translate(
                        "Bring den Rover ins Ziel, um das nächste Level freizuschalten.",
                        "Get the rover to the goal to unlock the next level.",
                      )}
                </p>
              )}
              <Fold
                title={translate("Das schaltest du frei", "What you unlock")}
                open={folds.unlocks}
                onToggle={() => toggleFold("unlocks")}
              >
                <LevelUnlocksCard currentLevel={currentLevel} translate={translate} />
              </Fold>
              {!loggedIn && (maxUnlockedLevel > 1 || freeModeUnlocked) && (
                <button
                  type="button"
                  onClick={resetProgress}
                  className="mt-3 text-xs text-muted-foreground/70 hover:text-muted-foreground underline underline-offset-2"
                >
                  {translate("Fortschritt zurücksetzen", "Reset progress")}
                </button>
              )}
              <div className="mt-6" />
            </>
          )}
          <ParametersPanel
            explorationRate={explorationRate}
            alpha={alpha}
            gamma={gamma}
            onExplorationRateChange={setExplorationRate}
            onAlphaChange={setAlpha}
            onGammaChange={setGamma}
            isLevelMode={isLevelMode}
            canAdjustAlpha={unlockedFeatures.canAdjustAlpha}
            canAdjustGamma={unlockedFeatures.canAdjustGamma}
            disabled={comparisonActive}
            translate={translate}
          />
          <RLGuideButton className="my-4 w-full font-semibold" />
          <Fold title={translate("Legende", "Legend")} open={folds.legend} onToggle={() => toggleFold("legend")}>
            <GameLegend translate={translate} showPortal={!isLevelMode || unlockedFeatures.canPlacePortals} />
          </Fold>
          <FeedbackNote level={isLevelMode ? currentLevel : undefined} translate={translate} />
        </div>

        {/* Right Content - Game */}
        <div className="flex-1 min-w-0 md:overflow-auto">
          <LevelProvider levelMode={isLevelMode} currentLevel={currentLevel} onLevelSolved={handleLevelSolved} onNextLevel={() => goToLevel(currentLevel + 1)}>
            <RLGame explorationRate={explorationRate} alpha={alpha} gamma={gamma} onAuthTokenChange={handleAuthTokenChange} onComparisonActiveChange={setComparisonActive} />
          </LevelProvider>
        </div>
      </div>
      <footer className="border-t border-border/40 px-4 py-2 text-xs text-muted-foreground md:px-8">
        <Link to="/impressum" className="underline underline-offset-2 hover:text-foreground">
          {translate("Impressum", "Imprint")}
        </Link>
        {" · "}
        <Link to="/datenschutz" className="underline underline-offset-2 hover:text-foreground">
          {translate("Datenschutz", "Privacy")}
        </Link>
        {" · "}
        {translate("Mit Unterstützung von Claude (Anthropic) entwickelt", "Built with the help of Claude (Anthropic)")}
      </footer>
    </div>
  );
}
