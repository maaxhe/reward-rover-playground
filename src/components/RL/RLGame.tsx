import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ToWorkerMsg, FromWorkerMsg, SnapshotPayload } from "../../workers/rlWorker";
import type { CSSProperties } from "react";
import { useLevel } from "@/contexts/LevelContext";
import { getUnlockedFeatures } from "@/lib/levelProgression";
import { SIMULATION_SPEEDS, type SimulationSpeed } from "@/lib/rl/simulation";
import { CELEBRATION_FACTS } from "@/lib/rl/celebrationFacts";
import { PRESET_LEVELS, type GridConfig, type PresetLevel } from "@/lib/rl/presets";
import { evaluateObjective } from "@/lib/levelObjectives";
import { LevelObjectivePanel } from "./LevelObjectivePanel";
import { RLGuideDialog } from "./RLGuideDialog";
import { ControlBar, PlaygroundControls, RandomControls, ScrollIndicator } from "./RLGameControls";
import type { LevelNumber } from "@/lib/levelProgression";
import { LEVEL_COACH } from "@/lib/levelCoach";
import { RewardHistoryChart } from "./RewardHistoryChart";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Tile, TileType } from "./Tile";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { ChevronDown, ChevronUp, Gamepad2, Info, Pause, Play, Target } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Position, PlaygroundState, ComparisonRoverState } from "@/lib/rl/types";
import { runComparisonRoverStep } from "@/lib/rl/comparisonStep";
import { getBestActionDirection } from "@/lib/rl/qLearning";
import { createEmptyGrid, cloneGrid } from "@/lib/rl/gridUtils";
import { getEpisodeTitle, GOAL_REWARD, DEFAULT_TILE_OPTION as LIB_DEFAULT_TILE_OPTION } from "@/lib/rl/constants";
import {
  AUTH_TOKEN_KEY,
  AUTH_USER_KEY,
  AuthUser,
  BONUS_DETAILS,
  BONUS_INTERVAL,
  ChallengeTile,
  ComparisonState,
  EpisodeStats,
  GRID_PIXEL_TARGET,
  LEVELS,
  LevelKey,
  Mode,
  TILE_ICONS,
  TILE_LABELS,
  TILE_SIZE_LABELS,
  TILE_SIZE_MAP,
  TUTORIAL_STORAGE_KEY,
  LEVEL_COACH_STORAGE_KEY,
  TileSizeOption,
  TileState,
  buildSpeedrunState,
  computeEpisodeSummary,
  computeMoveStats,
  createComparisonState,
  createInitialPlaygroundState,
  createLevelPlaygroundState,
  createRandomModeState,
  levelValue,
  pickWeightedBonus,
  runPlaygroundStep,
  runRandomModeStep,
  safeLocalStorageGet,
  safeSessionStorageGet,
} from "./rlGameModel";
import type { PlaceableTile, RandomModeState } from "./rlGameModel";
export type { PlaygroundState, RandomModeState, PlaceableTile } from "./rlGameModel";

interface RLGameProps {
  /** Learning parameters are owned by the surrounding layout (left sidebar) and passed in. */
  explorationRate?: number;
  alpha?: number;
  gamma?: number;
  /** Reports the login token (or null after logout) so the layout can sync level progress to the account. */
  onAuthTokenChange?: (token: string | null) => void;
  /** Lets the layout lock its global sliders while Comparison Mode (own per-rover sliders) is active. */
  onComparisonActiveChange?: (active: boolean) => void;
}

export function RLGame({ explorationRate = 0.2, alpha = 0.1, gamma = 0.85, onAuthTokenChange, onComparisonActiveChange }: RLGameProps = {}) {
  const { levelMode, currentLevel, onLevelSolved, onNextLevel } = useLevel();
  const [levelSolvedDialog, setLevelSolvedDialog] = useState<number | null>(null);
  // Breite des Spielbereichs: das Feld schrumpft, damit die Settings-Spalte nie zu schmal wird.
  const layoutRef = useRef<HTMLDivElement | null>(null);
  const [layoutWidth, setLayoutWidth] = useState(0);
  useEffect(() => {
    const el = layoutRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([entry]) => setLayoutWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const [goalFlash, setGoalFlash] = useState<{ x: number; y: number; key: number } | null>(null);
  const unlockedFeatures = levelMode ? getUnlockedFeatures(currentLevel as LevelNumber) : null;
  const unlockedFeaturesRef = useRef(unlockedFeatures);
  unlockedFeaturesRef.current = unlockedFeatures;

  const placementModeRef = useRef<PlaceableTile>("obstacle");
  // Free Mode: "set goal" armed → the next tile click moves the goal there.
  const settingGoalRef = useRef(false);
  const [settingGoal, setSettingGoalState] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const setSettingGoal = useCallback((value: boolean) => {
    settingGoalRef.current = value;
    setSettingGoalState(value);
  }, []);
  const challengeModeRef = useRef<ChallengeTile | null>(null);
  const consoleScrollRef = useRef<HTMLDivElement>(null);
  const settingsScrollRef = useRef<HTMLDivElement>(null);
  // Web Worker for the playground training loop
  const rlWorkerRef = useRef<Worker | null>(null);
  // True while we are applying a snapshot from the worker (to avoid re-syncing it back)
  const workerSnapshotRef = useRef(false);
  const { language, setLanguage, isEnglish, translate } = useLanguage();
  const [mode, setMode] = useState<Mode>("playground");
  useEffect(() => {
    onComparisonActiveChange?.(mode === "comparison");
  }, [mode, onComparisonActiveChange]);
  const [tileSize, setTileSize] = useState<TileSizeOption>(LIB_DEFAULT_TILE_OPTION);
  const [levelKey, setLevelKey] = useState<LevelKey>("level1");
  const [placementMode, setPlacementModeState] = useState<PlaceableTile>("obstacle");
  const [challengeMode, setChallengeModeState] = useState<ChallengeTile | null>(null);
  const [simulationSpeed, setSimulationSpeed] = useState<SimulationSpeed>("1x");
  const [comparisonSpeed, setComparisonSpeed] = useState<SimulationSpeed>("1x");
  const [showValues, setShowValues] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(true);
  const [showStatistics, setShowStatistics] = useState(true);
  const [showActions, setShowActions] = useState(true);
  // Level Mode has fixed rules: rewards stay on the board and pay less on every repeat hit (see rewardDecay).
  // Only Free Mode lets the player choose whether eaten tiles disappear.
  const [consumeRewardsSetting, setConsumeRewards] = useState(false);
  const consumeRewards = levelMode ? false : consumeRewardsSetting;
  const [isAutoRestartEnabled, setIsAutoRestartEnabled] = useState(false);
  const [showRewardHistory, setShowRewardHistory] = useState(true);
  const [showQValuesInfo, setShowQValuesInfo] = useState(false);
  const [showHeatmapInfo, setShowHeatmapInfo] = useState(false);
  const [showConsumeRewardsInfo, setShowConsumeRewardsInfo] = useState(false);

  const [showComparisonLeftAlphaInfo, setShowComparisonLeftAlphaInfo] = useState(false);
  const [showComparisonLeftGammaInfo, setShowComparisonLeftGammaInfo] = useState(false);
  const [showComparisonLeftExplorationInfo, setShowComparisonLeftExplorationInfo] = useState(false);
  const [showComparisonRightAlphaInfo, setShowComparisonRightAlphaInfo] = useState(false);
  const [showComparisonRightGammaInfo, setShowComparisonRightGammaInfo] = useState(false);
  const [showComparisonRightExplorationInfo, setShowComparisonRightExplorationInfo] = useState(false);
  const [comparisonPresetsOpen, setComparisonPresetsOpen] = useState(false);
  const [showActionsInfo, setShowActionsInfo] = useState(false);
  const [showRLBasics, setShowRLBasics] = useState(true);
  const [showRLFormula, setShowRLFormula] = useState(false);
  const [showRLExamples, setShowRLExamples] = useState(false);
  const [showRLLoop, setShowRLLoop] = useState(false);
  const [showRLParameters, setShowRLParameters] = useState(false);
  const [showRLSettings, setShowRLSettings] = useState(false);
  const [showRandomStatsCard, setShowRandomStatsCard] = useState(false);
  const [showPlaygroundStatsCard, setShowPlaygroundStatsCard] = useState(false);
  const [showConsolePanel, setShowConsolePanel] = useState(true);
  const [showSettingsPanel, setShowSettingsPanel] = useState(true);
  const [isReplaying, setIsReplaying] = useState(false);
  const [replayEpisode, setReplayEpisode] = useState<EpisodeStats | null>(null);
  const [replayStep, setReplayStep] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [episodeHistory, setEpisodeHistory] = useState<Array<{ episode: number; reward: number; steps: number }>>([]);
  const [undoStack, setUndoStack] = useState<TileState[][][]>([]);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [rewardAnimation, setRewardAnimation] = useState<{ x: number; y: number; type: "reward" | "punishment" } | null>(null);
  const [leftRewardAnimation, setLeftRewardAnimation] = useState<{ x: number; y: number; type: "reward" | "punishment" } | null>(null);
  const [rightRewardAnimation, setRightRewardAnimation] = useState<{ x: number; y: number; type: "reward" | "punishment" } | null>(null);
  const [celebration, setCelebration] = useState<{
    title: string;
    steps: number;
    reward: number;
    rank: number;
    fact: string;
  } | null>(null);
  const [directionBias, setDirectionBias] = useState<Position | null>(null);
  const [speedrunEnabled, setSpeedrunEnabled] = useState(false);
  const [rlDialogOpen, setRlDialogOpen] = useState(false);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authIsRegistering, setAuthIsRegistering] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(() => {
    const localToken = safeLocalStorageGet(AUTH_TOKEN_KEY);
    if (localToken) return true;
    const sessionToken = safeSessionStorageGet(AUTH_TOKEN_KEY);
    if (sessionToken) return false;
    return true;
  });
  const [authToken, setAuthToken] = useState<string | null>(() => {
    return safeLocalStorageGet(AUTH_TOKEN_KEY) ?? safeSessionStorageGet(AUTH_TOKEN_KEY);
  });
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => {
    const raw = safeLocalStorageGet(AUTH_USER_KEY) ?? safeSessionStorageGet(AUTH_USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  });
  const [hasLoadedGlobalEnv, setHasLoadedGlobalEnv] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [environmentName, setEnvironmentName] = useState("");
  const [saveEnvError, setSaveEnvError] = useState<string | null>(null);
  const [isSavingEnv, setIsSavingEnv] = useState(false);
  const [isLoadingEnvs, setIsLoadingEnvs] = useState(false);
  const [savedEnvironments, setSavedEnvironments] = useState<
    Array<{ id: number; name: string; gridConfig: GridConfig; progressData: unknown; createdAt: string }>
  >([]);
  const simulationDelayMs =
    SIMULATION_SPEEDS.find((speed) => speed.key === simulationSpeed)?.delayMs ?? SIMULATION_SPEEDS[0].delayMs;
  const comparisonDelayMs =
    SIMULATION_SPEEDS.find((speed) => speed.key === comparisonSpeed)?.delayMs ?? SIMULATION_SPEEDS[0].delayMs;
  const apiBase = import.meta.env.VITE_API_BASE ?? "";
  const isAdmin = authUser?.role === "admin";
  useEffect(() => {
    onAuthTokenChange?.(authToken);
  }, [authToken, onAuthTokenChange]);
  const introToggleLabel = showIntro
    ? translate("Anleitung ausblenden", "Hide guide")
    : translate("Anleitung & Infos anzeigen", "Show guide & info");

  useEffect(() => {
    if (isAutoRestartEnabled) {
      setCelebration(null);
    }
  }, [isAutoRestartEnabled]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const persist = rememberMe ? window.localStorage : window.sessionStorage;
      const clear = rememberMe ? window.sessionStorage : window.localStorage;
      if (authToken) {
        persist.setItem(AUTH_TOKEN_KEY, authToken);
      } else {
        persist.removeItem(AUTH_TOKEN_KEY);
      }
      clear.removeItem(AUTH_TOKEN_KEY);
    } catch (e) {
      console.warn("Could not persist auth token", e);
    }
  }, [authToken, rememberMe]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const persist = rememberMe ? window.localStorage : window.sessionStorage;
      const clear = rememberMe ? window.sessionStorage : window.localStorage;
      if (authUser) {
        persist.setItem(AUTH_USER_KEY, JSON.stringify(authUser));
      } else {
        persist.removeItem(AUTH_USER_KEY);
      }
      clear.removeItem(AUTH_USER_KEY);
    } catch (e) {
      console.warn("Could not persist auth user", e);
    }
  }, [authUser, rememberMe]);

  const applyAuthPayload = useCallback(
    (payload: { token?: string; user?: AuthUser }, title?: { de: string; en: string }) => {
      if (!payload?.token || !payload?.user) {
        setAuthError(translate("Unerwartete Antwort vom Server.", "Unexpected server response."));
        return;
      }
      setAuthToken(payload.token);
      setAuthUser(payload.user);
      setAuthDialogOpen(false);
      setAuthPassword("");
      toast({
        title: title ? translate(title.de, title.en) : translate("Willkommen zurück!", "Welcome back!"),
        description: translate("Du bist jetzt eingeloggt.", "You are now logged in."),
      });
    },
    [translate],
  );

  const handleLogout = useCallback(() => {
    setAuthToken(null);
    setAuthUser(null);
    setAuthPassword("");
    setAuthUsername("");
    setAuthError(null);
  }, []);

  const handleAuthSubmit = useCallback(async () => {
    const trimmedUsername = authUsername.trim();
    if (!trimmedUsername || !authPassword) {
      setAuthError(translate("Bitte Nutzername und Passwort eingeben.", "Enter username and password."));
      return;
    }

    if (authIsRegistering && authPassword.length < 6) {
      setAuthError(translate("Das Passwort braucht mindestens 6 Zeichen.", "The password needs at least 6 characters."));
      return;
    }
    setAuthError(null);
    try {
      const endpoint = authIsRegistering ? "/api/auth/register" : "/api/auth/login";
      const response = await fetch(`${apiBase}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: trimmedUsername, password: authPassword }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        if (response.status === 404) {
          setAuthError(
            translate(
              "API nicht erreichbar. Starte den Server oder prüfe die URL.",
              "API not reachable. Start the server or check the URL.",
            ),
          );
          return;
        }
        setAuthError(
          errorBody.error ||
            (authIsRegistering
              ? translate("Registrierung fehlgeschlagen.", "Registration failed.")
              : translate("Login fehlgeschlagen.", "Login failed.")),
        );
        return;
      }

      const payload = await response.json();
      applyAuthPayload(
        payload,
        authIsRegistering
          ? { de: "Account erstellt!", en: "Account created!" }
          : { de: "Willkommen zurück!", en: "Welcome back!" },
      );
    } catch (error) {
      setAuthError(translate("Server nicht erreichbar.", "Server not reachable."));
    }
  }, [authIsRegistering, authPassword, authUsername, apiBase, applyAuthPayload, translate]);

  const buildGridConfigFromState = useCallback((state: PlaygroundState): GridConfig => {
    const tiles: GridConfig["tiles"] = [];
    state.grid.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell.type === "empty" || cell.type === "goal") return;
        tiles.push({ x, y, type: cell.type });
      });
    });
    return {
      size: state.grid.length,
      tiles,
      agent: state.agent,
      goal: state.goal,
    };
  }, []);

  // Tutorial Slides
  const tutorialSlides = useMemo(() => [
    {
      target: "board",
      title: translate("Willkommen bei Reward Rover", "Welcome to Reward Rover"),
      content: translate(
        "Entdecke, wie Reinforcement Learning funktioniert! Der Rover lernt eigenständig, welche Wege zum Ziel führen.",
        "Discover how reinforcement learning works! The rover learns on its own which paths lead to the goal."
      ),
    },
    {
      target: "start",
      title: translate("Der Start-Button ▶️", "The Start Button ▶️"),
      content: translate(
        "Drücke den Start-Button im linken Panel, um den Lernprozess zu starten. Der Rover beginnt dann, das Spielfeld zu erkunden.",
        "Press the Start button in the left panel to begin the learning process. The rover will then start exploring the playfield."
      ),
    },
    {
      target: "board",
      title: translate("Pfeiltasten = Impulse geben! ⌨️", "Arrow Keys = Give Hints! ⌨️"),
      content: translate(
        "WICHTIG: Die Pfeiltasten steuern den Rover NICHT direkt! Sie geben ihm nur kurzfristige Impulse in eine Richtung. Der Rover entscheidet weiterhin selbst und lernt dabei.",
        "IMPORTANT: Arrow keys do NOT control the rover directly! They only give short-term directional hints. The rover still makes its own decisions and keeps learning."
      ),
      bullets: [
        translate("⚠️ Der Rover trifft weiterhin eigene Entscheidungen", "⚠️ The rover still makes its own decisions"),
        translate("Der Impuls wirkt nur beim Drücken der Taste", "The hint only works while pressing the key"),
        translate("Der Lernprozess läuft weiter", "The learning process continues"),
      ],
    },
    {
      target: "tools",
      title: translate("Gestalte das Spielfeld", "Design the Playfield"),
      content: translate(
        "Nutze die Platzierungs-Tools links, um Hindernisse, Belohnungen oder Strafen zu platzieren. Experimentiere und beobachte, wie der Rover lernt!",
        "Use the placement tools on the left to place obstacles, rewards, or penalties. Experiment and watch how the rover learns!"
      ),
    },
  ], [translate]);

  // Tutorial functions
  const closeTutorial = useCallback(() => {
    setTutorialOpen(false);
    try {
      localStorage.setItem(TUTORIAL_STORAGE_KEY, "true");
    } catch (e) {
      console.warn("Could not save tutorial status", e);
    }
  }, []);

  const nextTutorialStep = useCallback(() => {
    if (tutorialStep < tutorialSlides.length - 1) {
      setTutorialStep(prev => prev + 1);
    } else {
      closeTutorial();
    }
  }, [tutorialStep, tutorialSlides.length, closeTutorial]);

  const prevTutorialStep = useCallback(() => {
    if (tutorialStep > 0) {
      setTutorialStep(prev => prev - 1);
    }
  }, [tutorialStep]);

  // Level coach: short popups per level that point at what to click. Shown once per level, replayable via the help button.
  const [coachStep, setCoachStep] = useState<number | null>(null);
  const coachSlides = levelMode ? LEVEL_COACH[currentLevel as LevelNumber] ?? [] : [];
  const closeCoach = useCallback(() => {
    setCoachStep(null);
    try {
      const seen: number[] = JSON.parse(localStorage.getItem(LEVEL_COACH_STORAGE_KEY) ?? "[]");
      if (!seen.includes(currentLevel)) localStorage.setItem(LEVEL_COACH_STORAGE_KEY, JSON.stringify([...seen, currentLevel]));
    } catch (e) {
      console.warn("Could not save coach status", e);
    }
  }, [currentLevel]);
  // Level 1: once per session, show the "How does the rover learn?" guide first, then the hint popups.
  // "Once per session" = once per browser tab session (sessionStorage), so a reload does not repeat it.
  const SESSION_KEY = "rr-level1-intro-session";
  const introSeenThisSession = (() => {
    try {
      return sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      return false;
    }
  })();
  const level1IntroDone = useRef(introSeenThisSession);
  const level1GuideShown = useRef(introSeenThisSession);
  const level1GuideSeenOpen = useRef(false);
  useEffect(() => {
    if (!levelMode || currentLevel !== 1 || tutorialOpen || mode !== "playground" || level1GuideShown.current) return;
    try {
      // The general tutorial opens in its own effect; wait for it instead of stacking dialogs.
      if (!localStorage.getItem(TUTORIAL_STORAGE_KEY)) return;
    } catch {
      /* ignore */
    }
    level1GuideShown.current = true;
    setRlDialogOpen(true);
  }, [levelMode, currentLevel, tutorialOpen, mode]);
  // Hint popups open on the first visit of a level; level 1 shows them once per session, right after the guide.
  useEffect(() => {
    if (rlDialogOpen) level1GuideSeenOpen.current = true;
    if (!levelMode || tutorialOpen || rlDialogOpen || mode !== "playground") {
      setCoachStep(null);
      return;
    }
    if (currentLevel === 1) {
      if (!level1GuideSeenOpen.current) return;
      if (!level1IntroDone.current) {
        level1IntroDone.current = true;
        try {
          sessionStorage.setItem(SESSION_KEY, "1");
        } catch {
          /* ignore */
        }
        setCoachStep(0);
      }
      return;
    }
    try {
      const seen: number[] = JSON.parse(localStorage.getItem(LEVEL_COACH_STORAGE_KEY) ?? "[]");
      setCoachStep(seen.includes(currentLevel) ? null : 0);
    } catch {
      setCoachStep(0);
    }
  }, [levelMode, currentLevel, tutorialOpen, rlDialogOpen, mode]);
  // The coach is part of the level UI, close it when the rover is started on purpose.
  const activeCoachSlide = coachStep !== null ? coachSlides[coachStep] : undefined;

  // Highlight the element the current slide talks about.
  const highlightTarget = tutorialOpen ? tutorialSlides[tutorialStep]?.target : activeCoachSlide?.target;
  useEffect(() => {
    if (!highlightTarget) return;
    const els = Array.from(document.querySelectorAll<HTMLElement>(`[data-tutorial="${highlightTarget}"]`));
    els.forEach((el) => el.classList.add("tutorial-spotlight"));
    (els.find((el) => el.offsetParent !== null) ?? els[0])?.scrollIntoView({ block: "center", behavior: "smooth" });
    return () => els.forEach((el) => el.classList.remove("tutorial-spotlight"));
  }, [highlightTarget]);

  // Check if tutorial was already seen
  useEffect(() => {
    try {
      const seen = localStorage.getItem(TUTORIAL_STORAGE_KEY);
      if (!seen) {
        setTutorialOpen(true);
      }
    } catch (e) {
      console.warn("Could not check tutorial status", e);
    }
  }, []);

  // Clear animation after it plays
  useEffect(() => {
    if (rewardAnimation) {
      const timer = setTimeout(() => {
        setRewardAnimation(null);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [rewardAnimation]);

  useEffect(() => {
    if (leftRewardAnimation) {
      const timer = setTimeout(() => {
        setLeftRewardAnimation(null);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [leftRewardAnimation]);

  useEffect(() => {
    if (rightRewardAnimation) {
      const timer = setTimeout(() => {
        setRightRewardAnimation(null);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [rightRewardAnimation]);


  const tileLabels = useMemo(() => TILE_LABELS[language], [language]);
  const sizeLabels = useMemo(() => TILE_SIZE_LABELS[language], [language]);
  const numberFormatter = useMemo(
    () => new Intl.NumberFormat(isEnglish ? "en-US" : "de-DE", { maximumFractionDigits: 2 }),
    [isEnglish],
  );
  const baseFieldSize = TILE_SIZE_MAP[tileSize];
  const levelConfig = LEVELS[levelKey];
  const levelName = isEnglish ? levelConfig.nameEn : levelConfig.name;
  const levelDescription = isEnglish ? levelConfig.descriptionEn : levelConfig.description;

  const [playgroundState, setPlaygroundState] = useState<PlaygroundState>(() =>
    levelMode
      ? createLevelPlaygroundState(currentLevel as LevelNumber)
      : createInitialPlaygroundState(baseFieldSize, true)
  );
  const [randomState, setRandomState] = useState<RandomModeState>(() =>
    createRandomModeState(levelConfig, baseFieldSize)
  );
  const [comparisonState, setComparisonState] = useState<ComparisonState>(() =>
    createComparisonState(baseFieldSize)
  );
  const leftMoveStats = useMemo(
    () => computeMoveStats(comparisonState.left),
    [comparisonState.left],
  );
  const rightMoveStats = useMemo(
    () => computeMoveStats(comparisonState.right),
    [comparisonState.right],
  );
  const formatMovesValue = useCallback(
    (value: number | null) => (value !== null ? numberFormatter.format(value) : "–"),
    [numberFormatter],
  );
  const formatStepsValue = useCallback(
    (value: number | null) => (value !== null ? value.toFixed(1) : "–"),
    [],
  );
  const formatRewardValue = useCallback(
    (value: number | null) => (value !== null ? numberFormatter.format(value) : "–"),
    [numberFormatter],
  );
  const getLeadClasses = useCallback(
    (left: number | null, right: number | null, lowerIsBetter = true): [string, string] => {
      if (left === null || right === null) {
        return ["text-muted-foreground", "text-muted-foreground"];
      }
      if (left === right) {
        return ["text-foreground font-semibold", "text-foreground font-semibold"];
      }
      const leftIsWinning = lowerIsBetter ? left < right : left > right;
      return [
        leftIsWinning ? "text-emerald-500 font-semibold" : "text-muted-foreground",
        leftIsWinning ? "text-muted-foreground" : "text-emerald-500 font-semibold",
      ];
    },
    [],
  );
  const moveComparisonMessage = useMemo(() => {
    const leftEpisodes = leftMoveStats.episodes;
    const rightEpisodes = rightMoveStats.episodes;
    if (leftEpisodes === 0 && rightEpisodes === 0) {
      return translate(
        "Noch keine abgeschlossenen Episoden – lass beide Rover laufen, um ihre Züge zu vergleichen.",
        "No completed episodes yet – start both rovers to compare their moves.",
      );
    }
    if (leftMoveStats.average === null || rightMoveStats.average === null) {
      return translate(
        "Mindestens ein Rover hat noch keine Episode abgeschlossen.",
        "At least one rover hasn't completed an episode yet.",
      );
    }
    const leftAverage = leftMoveStats.average;
    const rightAverage = rightMoveStats.average;
    const formattedLeftAvg = numberFormatter.format(leftAverage);
    const formattedRightAvg = numberFormatter.format(rightAverage);
    if (Math.abs(leftAverage - rightAverage) < 0.01) {
      return translate(
        `Beide Rover bewegen sich gleich schnell (Ø ${formattedLeftAvg} Züge).`,
        `Both rovers move at the same speed (Ø ${formattedLeftAvg} moves).`,
      );
    }
    if (leftAverage < rightAverage) {
      return translate(
        `${comparisonState.left.name} ist derzeit effizienter (Ø ${formattedLeftAvg} vs. ${formattedRightAvg} Züge).`,
        `${comparisonState.left.name} is currently more efficient (Ø ${formattedLeftAvg} vs ${formattedRightAvg} moves).`,
      );
    }
    return translate(
      `${comparisonState.right.name} ist derzeit effizienter (Ø ${formattedRightAvg} vs. ${formattedLeftAvg} Züge).`,
      `${comparisonState.right.name} is currently more efficient (Ø ${formattedRightAvg} vs ${formattedLeftAvg} moves).`,
    );
  }, [
    translate,
    comparisonState.left.name,
    comparisonState.right.name,
    leftMoveStats.average,
    rightMoveStats.average,
    leftMoveStats.episodes,
    rightMoveStats.episodes,
    numberFormatter,
  ]);

  const loadSavedEnvironments = useCallback(async () => {
    if (!authToken) return;
    setIsLoadingEnvs(true);
    try {
      const response = await fetch(`${apiBase}/api/load`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!response.ok) {
        setIsLoadingEnvs(false);
        return;
      }
      const payload = await response.json();
      setSavedEnvironments(
        (payload?.items ?? []).map((item: { id: number; name: string | null; gridConfig: GridConfig; progressData: unknown; createdAt: string }) => ({
          id: item.id,
          name: item.name || translate("Unbenannt", "Untitled"),
          gridConfig: item.gridConfig,
          progressData: item.progressData ?? null,
          createdAt: item.createdAt,
        })),
      );
    } catch {
      // ignore load errors
    } finally {
      setIsLoadingEnvs(false);
    }
  }, [apiBase, authToken, translate]);

  useEffect(() => {
    if (!authToken) {
      setSavedEnvironments([]);
      return;
    }
    loadSavedEnvironments();
  }, [authToken, loadSavedEnvironments]);

  const handleSaveEnvironment = useCallback(async () => {
    const trimmed = environmentName.trim();
    if (!trimmed) {
      setSaveEnvError(translate("Bitte gib einen Namen ein.", "Please enter a name."));
      return;
    }
    if (!authToken) {
      setAuthDialogOpen(true);
      return;
    }
    setSaveEnvError(null);
    setIsSavingEnv(true);
    try {
      const gridConfig = buildGridConfigFromState(playgroundState);
      const response = await fetch(`${apiBase}/api/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ name: trimmed, gridConfig }),
      });
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        setSaveEnvError(errorBody.error || translate("Speichern fehlgeschlagen.", "Save failed."));
        return;
      }
      setEnvironmentName("");
      await loadSavedEnvironments();
      toast({
        title: translate("Umgebung gespeichert", "Environment saved"),
        description: translate("Du findest sie in deinen Umgebungen.", "You can find it in your environments."),
      });
    } catch {
      setSaveEnvError(translate("Server nicht erreichbar.", "Server not reachable."));
    } finally {
      setIsSavingEnv(false);
    }
  }, [
    apiBase,
    authToken,
    buildGridConfigFromState,
    environmentName,
    loadSavedEnvironments,
    playgroundState,
    translate,
  ]);
  const moveComparisonRows = useMemo(
    () => [
      {
        key: "current",
        label: translate("Aktuelle Züge", "Current moves"),
        left: leftMoveStats.current,
        right: rightMoveStats.current,
        lowerIsBetter: true,
      },
      {
        key: "average",
        label: translate("Ø Züge (niedriger besser)", "Avg. moves (lower is better)"),
        left: leftMoveStats.average,
        right: rightMoveStats.average,
        lowerIsBetter: true,
      },
      {
        key: "best",
        label: translate("Beste Züge", "Best moves"),
        left: leftMoveStats.best,
        right: rightMoveStats.best,
        lowerIsBetter: true,
      },
      {
        key: "episodes",
        label: translate("Abgeschlossene Runs", "Completed runs"),
        left: leftMoveStats.episodes,
        right: rightMoveStats.episodes,
        lowerIsBetter: false,
      },
    ],
    [
      translate,
      leftMoveStats.current,
      leftMoveStats.average,
      leftMoveStats.best,
      leftMoveStats.episodes,
      rightMoveStats.current,
      rightMoveStats.average,
      rightMoveStats.best,
      rightMoveStats.episodes,
    ],
  );

  const randomStatsSummary = useMemo(
    () => computeEpisodeSummary(randomState.episodeHistory),
    [randomState.episodeHistory],
  );

  const playgroundStatsSummary = useMemo(
    () => computeEpisodeSummary(playgroundState.episodeHistory),
    [playgroundState.episodeHistory],
  );

  const randomLeaderboardEntries = useMemo(
    () =>
      [...randomState.episodeHistory].sort((a, b) => {
        if (a.steps !== b.steps) return a.steps - b.steps;
        return b.reward - a.reward;
      }),
    [randomState.episodeHistory],
  );

  const playgroundLeaderboardEntries = useMemo(
    () =>
      [...playgroundState.episodeHistory].sort((a, b) => {
        if (a.steps !== b.steps) return a.steps - b.steps;
        return b.reward - a.reward;
      }),
    [playgroundState.episodeHistory],
  );

  const gridRef = useRef<HTMLDivElement>(null);
  const lastCelebratedEpisodeRef = useRef<{ random: number; playground: number }>({ random: 0, playground: 0 });

  const changePlacementMode = useCallback((nextMode: PlaceableTile) => {
    placementModeRef.current = nextMode;
    setPlacementModeState(nextMode);
    settingGoalRef.current = false;
    setSettingGoalState(false);
  }, []);

  useEffect(() => {
    if (mode === "random") {
      gridRef.current?.focus();
    }
    setDirectionBias(null);
  }, [mode]);

  useEffect(() => {
    const biasMap: Record<string, Position> = {
      ArrowUp: { x: 0, y: -1 },
      ArrowDown: { x: 0, y: 1 },
      ArrowLeft: { x: -1, y: 0 },
      ArrowRight: { x: 1, y: 0 },
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }

      // Handle Space for Play/Pause
      if (event.key === " " || event.code === "Space") {
        event.preventDefault();
        if (mode === "playground") {
          if (playgroundState.isRunning) {
            handlePlaygroundPause();
          } else {
            handlePlaygroundStart();
          }
        } else if (mode === "random") {
          if (randomState.isRunning) {
            handleRandomPause();
          } else {
            handleRandomStart();
          }
        } else if (mode === "comparison") {
          // Toggle both sides in comparison mode
          if (comparisonState.left.isRunning || comparisonState.right.isRunning) {
            handleComparisonPause();
          } else {
            handleComparisonStart();
          }
        }
        return;
      }

      // Handle R for Reset
      if (event.key === "r" || event.key === "R") {
        event.preventDefault();
        if (mode === "playground") {
          handlePlaygroundReset();
        } else if (mode === "random") {
          handleRandomReset();
        } else if (mode === "comparison") {
          handleComparisonReset();
        }
        return;
      }

      const bias = biasMap[event.key];
      if (!bias) return;
      event.preventDefault();
      setDirectionBias(bias);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (biasMap[event.key]) {
        setDirectionBias(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [mode, playgroundState.isRunning, randomState.isRunning, comparisonState.left.isRunning, comparisonState.right.isRunning]);

  // ── Web Worker: lifecycle (create once, destroy on unmount) ─────────────────
  useEffect(() => {
    const worker = new Worker(
      new URL("../../workers/rlWorker.ts", import.meta.url),
      { type: "module" },
    );
    rlWorkerRef.current = worker;

    worker.onmessage = (event: MessageEvent<FromWorkerMsg>) => {
      const msg = event.data;
      if (msg.type !== "SNAPSHOT") return;
      const { state: workerState, rewardTileMoved } = msg.payload as SnapshotPayload;

      workerSnapshotRef.current = true;
      setPlaygroundState(workerState);

      // Reward/punishment tile animation
      if (rewardTileMoved) {
        setRewardAnimation({ x: rewardTileMoved.x, y: rewardTileMoved.y, type: rewardTileMoved.tileType as "reward" | "punishment" });
      }

      // Stop replay when episode completes (currentSteps reset to 0)
      if (workerState.currentSteps === 0 && !workerState.isRunning) {
        // isRunning=false after goal → check if was replaying
        setIsReplaying((prev) => {
          if (prev) {
            setTimeout(() => {
              setIsReplaying(false);
              setReplayEpisode(null);
            }, 500);
          }
          return prev;
        });
      }
    };

    return () => {
      worker.terminate();
      rlWorkerRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Web Worker: sync params whenever they change ──────────────────────────
  useEffect(() => {
    const worker = rlWorkerRef.current;
    if (!worker) return;
    const msg: ToWorkerMsg = {
      type: "UPDATE_PARAMS",
      params: {
        explorationRate: isReplaying ? 0 : explorationRate,
        alpha,
        gamma,
        consumeRewards,
        rewardDecay: levelMode,
        autoRestart: isAutoRestartEnabled && !isReplaying,
        directionBias,
      },
    };
    worker.postMessage(msg);
  }, [explorationRate, alpha, gamma, consumeRewards, levelMode, isAutoRestartEnabled, directionBias, isReplaying]);

  // ── Web Worker: sync speed ────────────────────────────────────────────────
  useEffect(() => {
    const worker = rlWorkerRef.current;
    if (!worker) return;
    const msg: ToWorkerMsg = { type: "SET_DELAY", delayMs: isReplaying ? 400 : simulationDelayMs };
    worker.postMessage(msg);
  }, [simulationDelayMs, isReplaying]);

  // ── Web Worker: sync grid changes caused by the user (tile placement etc.) ─
  // Skip if the change originated from a worker snapshot to avoid loops.
  useEffect(() => {
    if (mode !== "playground" || !playgroundState.isRunning) return;
    if (workerSnapshotRef.current) {
      workerSnapshotRef.current = false;
      return;
    }
    const worker = rlWorkerRef.current;
    if (!worker) return;
    const msg: ToWorkerMsg = { type: "SYNC_STATE", state: playgroundState };
    worker.postMessage(msg);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playgroundState.grid]);

  // ── Web Worker: start / pause training loop ───────────────────────────────
  useEffect(() => {
    if (mode !== "playground") return;
    const worker = rlWorkerRef.current;
    if (!worker) return;

    if (playgroundState.isRunning) {
      // Sync latest state + params to worker before starting
      const initMsg: ToWorkerMsg = {
        type: "INIT",
        state: playgroundState,
        params: {
          explorationRate: isReplaying ? 0 : explorationRate,
          alpha,
          gamma,
          consumeRewards,
          rewardDecay: levelMode,
          autoRestart: isAutoRestartEnabled && !isReplaying,
          directionBias,
        },
        delayMs: isReplaying ? 400 : simulationDelayMs,
      };
      worker.postMessage(initMsg);
      worker.postMessage({ type: "START" } as ToWorkerMsg);
    } else {
      worker.postMessage({ type: "PAUSE" } as ToWorkerMsg);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, playgroundState.isRunning]);

  useEffect(() => {
    if (mode !== "random" || !randomState.isRunning) return;
    const interval = window.setInterval(() => {
      setRandomState((prev) => {
        const next = runRandomModeStep(
          prev,
          explorationRate,
          directionBias,
          consumeRewards,
          alpha,
          gamma,
          isAutoRestartEnabled,
        );

        // Check if agent moved to a reward or punishment tile
        const tileType = next.grid[next.agent.y][next.agent.x].type;
        const hasMoved = prev.agent.x !== next.agent.x || prev.agent.y !== next.agent.y;
        if (hasMoved && (tileType === "reward" || tileType === "punishment")) {
          setRewardAnimation({ x: next.agent.x, y: next.agent.y, type: tileType });
        }
        return next;
      });
    }, 220);
    return () => window.clearInterval(interval);
  }, [mode, randomState.isRunning, explorationRate, directionBias, consumeRewards, alpha, gamma, isAutoRestartEnabled]);

  useEffect(() => {
    if (mode !== "comparison" || (!comparisonState.left.isRunning && !comparisonState.right.isRunning)) return;
    const interval = window.setInterval(() => {
      setComparisonState((prev) => {
        const nextLeft = prev.left.isRunning ? runComparisonRoverStep(prev.left, consumeRewards) : prev.left;
        const nextRight = prev.right.isRunning ? runComparisonRoverStep(prev.right, consumeRewards) : prev.right;

        // Check for reward/punishment animations on left side
        if (prev.left.isRunning && (nextLeft.agent.x !== prev.left.agent.x || nextLeft.agent.y !== prev.left.agent.y)) {
          const tileType = prev.left.grid[nextLeft.agent.y][nextLeft.agent.x].type;
          if (tileType === "reward" || tileType === "punishment") {
            setLeftRewardAnimation({ x: nextLeft.agent.x, y: nextLeft.agent.y, type: tileType });
          }
        }

        // Check for reward/punishment animations on right side
        if (prev.right.isRunning && (nextRight.agent.x !== prev.right.agent.x || nextRight.agent.y !== prev.right.agent.y)) {
          const tileType = prev.right.grid[nextRight.agent.y][nextRight.agent.x].type;
          if (tileType === "reward" || tileType === "punishment") {
            setRightRewardAnimation({ x: nextRight.agent.x, y: nextRight.agent.y, type: tileType });
          }
        }

        return { left: nextLeft, right: nextRight };
      });
    }, comparisonDelayMs);
    return () => window.clearInterval(interval);
  }, [mode, comparisonState.left.isRunning, comparisonState.right.isRunning, consumeRewards, comparisonDelayMs]);

  useEffect(() => {
    if (mode !== "random") return;

    const grantBonus = () => {
      const nextType = pickWeightedBonus();
      setRandomState((prev) => ({
        ...prev,
        activeBonus: nextType,
        bonusReady: true,
        bonusCountdown: BONUS_INTERVAL,
        latestDrop: nextType,
      }));
      challengeModeRef.current = null;
      setChallengeModeState(null);
    };

    grantBonus();
    const interval = window.setInterval(grantBonus, 10000);
    return () => window.clearInterval(interval);
  }, [mode]);

  useEffect(() => {
    if (mode !== "random") return;
    const timer = window.setInterval(() => {
      setRandomState((prev) => {
        if (prev.bonusCountdown <= 0) return prev;
        return { ...prev, bonusCountdown: prev.bonusCountdown - 1 };
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [mode]);

  useEffect(() => {
    if (!randomState.speedrun.active || !randomState.isRunning) return;
    const timer = window.setInterval(() => {
      setRandomState((prev) => {
        if (!prev.speedrun.active || !prev.isRunning) return prev;
        if (prev.speedrun.timeLeft <= 1) {
          const failureStat: EpisodeStats = {
            episode: prev.episode + 1,
            steps: prev.currentSteps,
            reward: prev.totalReward,
            success: false,
            mode: "speedrun",
            stage: prev.speedrun.stage,
            timeLimit: prev.speedrun.timeLimit,
            timeUsed: prev.speedrun.timeLimit,
          };
          const newHistory = [...prev.episodeHistory.slice(-19), failureStat];
          const baseSize = prev.speedrun.baseSize;
          const stageState = buildSpeedrunState(0, baseSize, prev.episode + 1, newHistory);
          return stageState;
        }
        return {
          ...prev,
          speedrun: {
            ...prev.speedrun,
            timeLeft: prev.speedrun.timeLeft - 1,
          },
        };
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [randomState.speedrun.active, randomState.isRunning]);

  useEffect(() => {
    if (!randomState.speedrun.active || !randomState.speedrun.pendingStage) return;
    setRandomState((prev) => {
      if (!prev.speedrun.active || !prev.speedrun.pendingStage) return prev;
      const stageState = buildSpeedrunState(
        prev.speedrun.stage,
        prev.speedrun.baseSize,
        prev.episode,
        prev.episodeHistory,
      );
      return stageState;
    });
  }, [randomState.speedrun.active, randomState.speedrun.pendingStage]);

  const handleTilePlacement = useCallback(
    (x: number, y: number) => {
      if (mode === "playground" && settingGoalRef.current) {
        settingGoalRef.current = false;
        setSettingGoalState(false);
        setCelebration(null);
        lastCelebratedEpisodeRef.current.playground = 0;
        setPlaygroundState((prev) => {
          if ((x === prev.spawn.x && y === prev.spawn.y) || (x === prev.goal.x && y === prev.goal.y)) {
            return prev;
          }
          const grid = cloneGrid(prev.grid);
          grid[prev.goal.y][prev.goal.x] = { type: "empty", qValue: 0, visits: 0, value: 0 };
          grid[y][x] = { type: "goal", qValue: GOAL_REWARD, visits: 0, value: levelValue("goal") };
          setUndoStack([cloneGrid(grid)]);
          // The old Q-values pointed at the old goal, so learning starts over.
          return {
            ...prev,
            goal: { x, y },
            grid,
            agent: { ...prev.spawn },
            isRunning: false,
            episode: 0,
            totalReward: 0,
            currentSteps: 0,
            episodeHistory: [],
            portalCooldowns: {},
            pendingPortalTeleport: null,
            qTable: {},
            consumedTiles: [],
            tileVisits: {},
          };
        });
        return;
      }
      if (mode === "playground") {
        const selectedType = placementModeRef.current;
        // Im Level-Modus nur Felder platzieren, die schon freigeschaltet sind (der Button kann grau sein, der gewählte Typ bleibt trotzdem gesetzt).
        const features = unlockedFeaturesRef.current;
        if (features) {
          const allowed =
            selectedType === "obstacle" ? features.canPlaceWalls
            : selectedType === "reward" ? features.canPlaceRewards
            : selectedType === "punishment" ? features.canPlacePunishments
            : selectedType === "portal" ? features.canPlacePortals
            : true;
          if (!allowed) return;
        }
        setPlaygroundState((prev) => {
          if ((x === prev.agent.x && y === prev.agent.y) || (x === prev.goal.x && y === prev.goal.y)) {
            return prev;
          }
          const grid = cloneGrid(prev.grid);
          const current = grid[y][x];
          // Beim Dragging immer platzieren, nicht togglen
          const nextType = isDragging ? selectedType : (current.type === selectedType ? "empty" : selectedType);

          // Prüfe ob sich was ändert
          if (current.type === nextType) {
            return prev;
          }

          // Speichere vorherigen Zustand für Undo
          setUndoStack(stack => [...stack.slice(-19), cloneGrid(prev.grid)]);

          grid[y][x] = {
            ...current,
            type: nextType,
            value: levelValue(nextType),
            qValue: nextType === "empty" ? 0 : current.qValue,
            visits: nextType === "empty" ? 0 : current.visits,
          };
          return { ...prev, grid };
        });
      } else if (mode === "random" && challengeModeRef.current) {
        const selectedChallenge = challengeModeRef.current;
        let consumed = false;
        setRandomState((prev) => {
          if (
            !prev.bonusReady ||
            !prev.activeBonus ||
            prev.activeBonus !== selectedChallenge ||
            (x === prev.agent.x && y === prev.agent.y) ||
            prev.goals.some((g) => g.x === x && g.y === y)
          ) {
            return prev;
          }

          const grid = cloneGrid(prev.grid);
          const current = grid[y][x];

          if (selectedChallenge === "obstacle" && current.type === "obstacle") {
            grid[y][x] = { type: "empty", qValue: 0, visits: 0, value: 0 };
            consumed = true;
            return {
              ...prev,
              grid,
              bonusReady: false,
              latestDrop: null,
            };
          }

          if (current.type === selectedChallenge) {
            return prev;
          }

          grid[y][x] = {
            type: selectedChallenge,
            qValue: 0,
            visits: 0,
            value: levelValue(selectedChallenge),
          };

          consumed = true;
          return {
            ...prev,
            grid,
            bonusReady: false,
            latestDrop: null,
          };
        });
        if (consumed) {
          challengeModeRef.current = null;
          setChallengeModeState(null);
        }
      }
    },
    [mode, isDragging]
  );

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;

    const previousGrid = undoStack[undoStack.length - 1];
    // Keep the first entry (initial/loaded state) in the stack so environment stays stable
    if (undoStack.length > 1) {
      setUndoStack(stack => stack.slice(0, -1));
    }
    setPlaygroundState(prev => ({
      ...prev,
      grid: cloneGrid(previousGrid),
    }));
  }, [undoStack]);

  const handleMouseDown = useCallback(() => {
    if (
      mode === "playground" ||
      mode === "comparison" ||
      (mode === "random" && challengeModeRef.current)
    ) {
      setIsDragging(true);
    }
  }, [mode]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

const handleActiveBonusClick = useCallback(() => {
  if (mode !== "random") return;
  const bonus = randomState.activeBonus;
  if (!bonus || !randomState.bonusReady) return;

    if (bonus === "teleport") {
      let consumed = false;
      setRandomState((prev) => {
        if (!prev.bonusReady || prev.activeBonus !== "teleport") return prev;
        const grid = prev.grid;
        const validTiles: Position[] = [];
        for (let y = 0; y < grid.length; y++) {
          for (let x = 0; x < grid.length; x++) {
            if (grid[y][x].type !== "obstacle" && !prev.goals.some((g) => g.x === x && g.y === y)) {
              validTiles.push({ x, y });
            }
          }
        }
        if (validTiles.length === 0) {
          consumed = true;
          return { ...prev, bonusReady: false, latestDrop: null };
        }
        const currentPos = prev.agent;
        const nonCurrent = validTiles.filter((tile) => tile.x !== currentPos.x || tile.y !== currentPos.y);
        const farThreshold = Math.max(4, Math.floor(prev.grid.length / 3));
        const farTiles = nonCurrent.filter(
          (tile) => Math.abs(tile.x - currentPos.x) + Math.abs(tile.y - currentPos.y) >= farThreshold,
        );
        const candidates = farTiles.length > 0 ? farTiles : nonCurrent.length > 0 ? nonCurrent : validTiles;
        if (candidates.length === 0) {
          consumed = true;
          return { ...prev, bonusReady: false, latestDrop: null };
        }
        consumed = true;
        const newPos = candidates[Math.floor(Math.random() * candidates.length)];
        return {
          ...prev,
          agent: newPos,
          bonusReady: false,
          latestDrop: null,
        };
      });
      if (consumed) {
        challengeModeRef.current = null;
        setChallengeModeState(null);
      }
      return;
    }

    const challengeType = bonus as ChallengeTile;
    const nextMode = challengeModeRef.current === challengeType ? null : challengeType;
    challengeModeRef.current = nextMode;
    setChallengeModeState(nextMode);
  }, [mode, randomState.activeBonus, randomState.bonusReady]);

  useEffect(() => {
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, [handleMouseUp]);

  useEffect(() => {
    if (mode !== "random") return;
    if (randomState.episode === 0) return;
    const latest = randomState.episodeHistory[randomState.episodeHistory.length - 1];
    if (!latest || !latest.success) return;
    if (latest.episode <= lastCelebratedEpisodeRef.current.random) return;
    if (isAutoRestartEnabled) {
      lastCelebratedEpisodeRef.current.random = latest.episode;
      setCelebration(null);
      return;
    }
    lastCelebratedEpisodeRef.current.random = latest.episode;
    const title = getEpisodeTitle(latest.episode, language);
    const sortedHistory = [...randomState.episodeHistory].sort((a, b) => {
      if (b.reward !== a.reward) return b.reward - a.reward;
      return a.steps - b.steps;
    });
    const rankIndex = sortedHistory.findIndex((entry) => entry.episode === latest.episode);
    const rank = rankIndex === -1 ? sortedHistory.length : rankIndex + 1;
    const fact = CELEBRATION_FACTS[Math.floor(Math.random() * CELEBRATION_FACTS.length)][language];
    toast({
      title: translate("Mission geschafft", "Mission Complete"),
      description: translate(
        `Du hast ${title} in ${latest.steps} Zügen geknackt. Schau ins Leaderboard!`,
        `You conquered ${title} in ${latest.steps} moves. Check the leaderboard!`,
      ),
    });
    requestAnimationFrame(() => {
      setCelebration({ title, steps: latest.steps, reward: latest.reward, rank, fact });
    });
  }, [mode, randomState.episodeHistory, randomState.episode, translate, language, isAutoRestartEnabled]);

  useEffect(() => {
    if (mode !== "playground") return;
    if (playgroundState.episode === 0) return;
    const latest = playgroundState.episodeHistory[playgroundState.episodeHistory.length - 1];
    if (!latest || !latest.success) return;
    if (latest.episode <= lastCelebratedEpisodeRef.current.playground) return;
    // Show the rover on the goal for a moment; the model already reset it to the start.
    setGoalFlash({ x: playgroundState.goal.x, y: playgroundState.goal.y, key: latest.episode });
    if (isAutoRestartEnabled) {
      lastCelebratedEpisodeRef.current.playground = latest.episode;
      setCelebration(null);
      return;
    }
    lastCelebratedEpisodeRef.current.playground = latest.episode;
    const title = getEpisodeTitle(latest.episode, language);
    const sortedHistory = [...playgroundState.episodeHistory].sort((a, b) => {
      if (b.reward !== a.reward) return b.reward - a.reward;
      return a.steps - b.steps;
    });
    const rankIndex = sortedHistory.findIndex((entry) => entry.episode === latest.episode);
    const rank = rankIndex === -1 ? sortedHistory.length : rankIndex + 1;
    const fact = CELEBRATION_FACTS[Math.floor(Math.random() * CELEBRATION_FACTS.length)][language];
    toast({
      title: translate("Mission geschafft", "Mission Complete"),
      description: translate(
        `Du hast ${title} in ${latest.steps} Zügen gemeistert. Schau ins Leaderboard!`,
        `You completed ${title} in ${latest.steps} moves. Check the leaderboard!`,
      ),
    });
    requestAnimationFrame(() => {
      setCelebration({ title, steps: latest.steps, reward: latest.reward, rank, fact });
    });
  }, [mode, playgroundState.episodeHistory, playgroundState.episode, translate, language, isAutoRestartEnabled]);

  // Level Mode: a level counts as solved when its objective is met (learned behaviour,
  // not a single lucky run), then the next level unlocks.
  const objectiveStatus = useMemo(
    () =>
      levelMode
        ? evaluateObjective({
            level: currentLevel as LevelNumber,
            grid: playgroundState.grid,
            spawn: playgroundState.spawn,
            goal: playgroundState.goal,
            history: playgroundState.episodeHistory,
            alpha,
            gamma,
          })
        : null,
    [levelMode, currentLevel, playgroundState.grid, playgroundState.spawn, playgroundState.goal, playgroundState.episodeHistory, alpha, gamma],
  );
  useEffect(() => {
    if (!goalFlash) return;
    const id = window.setTimeout(() => setGoalFlash(null), 900);
    return () => window.clearTimeout(id);
  }, [goalFlash]);
  const solvedLevelRef = useRef<number | null>(null);
  useEffect(() => {
    if (!objectiveStatus?.solved || solvedLevelRef.current === currentLevel) return;
    solvedLevelRef.current = currentLevel;
    onLevelSolved?.();
    // Pause and show a clear call to action instead of a toast that is easy to miss.
    setPlaygroundState((prev) => ({ ...prev, isRunning: false }));
    setLevelSolvedDialog(currentLevel);
  }, [objectiveStatus?.solved, currentLevel, onLevelSolved, translate]);

  const handlePlaygroundStart = () =>
    setPlaygroundState((prev) => ({ ...prev, isRunning: true }));

  const handlePlaygroundPause = () =>
    setPlaygroundState((prev) => ({ ...prev, isRunning: false }));

  const handlePlaygroundStep = () => {
    const worker = rlWorkerRef.current;
    if (worker) {
      // Sync latest state + params to worker, then request one step
      const initMsg: ToWorkerMsg = {
        type: "INIT",
        state: { ...playgroundState, isRunning: false },
        params: { explorationRate, alpha, gamma, consumeRewards, rewardDecay: levelMode, autoRestart: false, directionBias },
        delayMs: simulationDelayMs,
      };
      worker.postMessage(initMsg);
      worker.postMessage({ type: "STEP_ONCE" } as ToWorkerMsg);
    } else {
      // Fallback: run on main thread
      setPlaygroundState((prev) => {
        const next = runPlaygroundStep({ ...prev, isRunning: true }, explorationRate, directionBias, consumeRewards, alpha, gamma, false, levelMode);
        return { ...next, isRunning: prev.isRunning };
      });
    }
  };

  const handlePlaygroundReset = useCallback(() => {
    const nextSize = TILE_SIZE_MAP[tileSize];
    setCelebration(null);
    setUndoStack([]);
    setIsReplaying(false);
    setReplayEpisode(null);
    lastCelebratedEpisodeRef.current.playground = 0;
    setPlaygroundState(
      levelMode
        ? createLevelPlaygroundState(currentLevel as LevelNumber)
        : createInitialPlaygroundState(nextSize, false),
    );
  }, [tileSize, levelMode, currentLevel]);

  // Level Mode: switching to another level (or (re-)entering Level Mode at all,
  // e.g. coming back from Free Mode) loads that level's own small world, so
  // each level is a genuine, populated challenge instead of a blank grid.
  const prevLevelRef = useRef<number>(currentLevel);
  const wasLevelModeRef = useRef<boolean>(levelMode);
  useEffect(() => {
    if (!levelMode) {
      prevLevelRef.current = currentLevel;
      wasLevelModeRef.current = false;
      return;
    }
    if (currentLevel !== prevLevelRef.current || !wasLevelModeRef.current) {
      handlePlaygroundReset();
    }
    prevLevelRef.current = currentLevel;
    wasLevelModeRef.current = true;
  }, [currentLevel, levelMode, handlePlaygroundReset]);

  // Entering Level Mode always lands on the Playground grid — Random/Comparison
  // mode carry their own ungated hyperparameter sliders and would let a player
  // skip level restrictions if the mode was left on one of them from Free Mode.
  useEffect(() => {
    if (levelMode && mode !== "playground") {
      setMode("playground");
    }
  }, [levelMode, mode]);

  const handleReplayBest = useCallback(() => {
    if (mode === "playground" && playgroundState.episodeHistory.length > 0) {
      // Find the best successful episode
      const successfulEpisodes = playgroundState.episodeHistory.filter(ep => ep.success);
      if (successfulEpisodes.length === 0) {
        toast({
          title: translate("Keine erfolgreiche Episode", "No successful episode"),
          description: translate(
            "Es gibt noch keine erfolgreiche Episode zum Abspielen. Lass den Rover erst das Ziel erreichen!",
            "There's no successful episode to replay yet. Let the rover reach the goal first!"
          ),
        });
        return;
      }

      // Sort by reward (highest first), then by steps (lowest first)
      const bestEpisode = [...successfulEpisodes].sort((a, b) => {
        if (b.reward !== a.reward) return b.reward - a.reward;
        return a.steps - b.steps;
      })[0];

      setReplayEpisode(bestEpisode);
      setIsReplaying(true);
      setPlaygroundState(prev => ({
        ...prev,
        agent: { x: Math.min(1, prev.grid.length - 1), y: Math.min(1, prev.grid.length - 1) },
        currentSteps: 0,
        isRunning: true,
      }));

      toast({
        title: translate("Replay Started", "🎬 Replay started"),
        description: translate(
          `Zeige beste Episode: ${bestEpisode.steps} Schritte, ${numberFormatter.format(bestEpisode.reward)} Reward`,
          `Showing best episode: ${bestEpisode.steps} steps, ${numberFormatter.format(bestEpisode.reward)} reward`
        ),
      });
    }
  }, [mode, playgroundState.episodeHistory, translate]);

  const handleStopReplay = useCallback(() => {
    setIsReplaying(false);
    setReplayEpisode(null);
    setPlaygroundState(prev => ({ ...prev, isRunning: false }));
  }, []);

  const buildGridFromConfig = useCallback((config: GridConfig) => {
    const grid = createEmptyGrid(config.size);

    // Platziere Tiles
    config.tiles.forEach(({ x, y, type }) => {
      if (!grid[y] || !grid[y][x]) return;
      grid[y][x] = {
        type,
        qValue: 0,
        visits: 0,
        value: levelValue(type),
      };
    });

    const agent = config.agent || { x: 0, y: config.size - 1 };
    const goal = config.goal || { x: config.size - 1, y: 0 };

    grid[goal.y][goal.x] = {
      type: "goal",
      qValue: GOAL_REWARD,
      visits: 0,
      value: levelValue("goal"),
    };

    return { grid, agent, goal };
  }, []);

  const applyGridConfig = useCallback((config: GridConfig) => {
    setCelebration(null);
    setIsReplaying(false);
    setReplayEpisode(null);
    lastCelebratedEpisodeRef.current.playground = 0;
    const sizeOptionEntry = (Object.entries(TILE_SIZE_MAP) as Array<[TileSizeOption, number]>).find(
      ([, value]) => value === config.size,
    );
    const targetSize = sizeOptionEntry?.[0] ?? "s";
    setTileSize(targetSize);

    const { grid, agent, goal } = buildGridFromConfig(config);

    // Save initial grid state so undo returns to loaded environment instead of clearing it
    setUndoStack([cloneGrid(grid)]);

    setPlaygroundState({
      agent,
      goal,
      spawn: agent,
      grid,
      isRunning: false,
      episode: 0,
      totalReward: 0,
      currentSteps: 0,
      episodeHistory: [],
      portalCooldowns: {},
      pendingPortalTeleport: null,
      qTable: {},
    });
  }, [buildGridFromConfig]);

  const handleLoadPreset = useCallback((preset: PresetLevel) => {
    applyGridConfig(preset);
  }, [applyGridConfig]);

  const handleClearEnvironment = useCallback(() => {
    setSettingGoal(false);
    setConfirmClear(false);
    applyGridConfig({
      size: playgroundState.grid.length,
      tiles: [],
      agent: playgroundState.spawn,
      goal: playgroundState.goal,
    });
  }, [applyGridConfig, playgroundState.grid.length, playgroundState.spawn, playgroundState.goal, setSettingGoal]);

  const applyComparisonConfig = useCallback((config: GridConfig) => {
    const sizeOptionEntry = (Object.entries(TILE_SIZE_MAP) as Array<[TileSizeOption, number]>).find(
      ([, value]) => value === config.size,
    );
    const targetSize = sizeOptionEntry?.[0] ?? "s";
    setTileSize(targetSize);

    const { grid, agent, goal } = buildGridFromConfig(config);
    const leftGrid = cloneGrid(grid);
    const rightGrid = cloneGrid(grid);
    const leftAgent = { ...agent };
    const rightAgent = { ...agent };
    const leftGoal = { ...goal };
    const rightGoal = { ...goal };

    setLeftRewardAnimation(null);
    setRightRewardAnimation(null);
    setComparisonState((prev) => ({
      left: {
        ...prev.left,
        agent: leftAgent,
        goal: leftGoal,
        spawn: leftAgent,
        grid: leftGrid,
        isRunning: false,
        episode: 0,
        totalReward: 0,
        currentSteps: 0,
        episodeHistory: [],
        portalCooldowns: {},
        qTable: {},
      },
      right: {
        ...prev.right,
        agent: rightAgent,
        goal: rightGoal,
        spawn: rightAgent,
        grid: rightGrid,
        isRunning: false,
        episode: 0,
        totalReward: 0,
        currentSteps: 0,
        episodeHistory: [],
        portalCooldowns: {},
        qTable: {},
      },
    }));
  }, [buildGridFromConfig]);

  const handleLoadComparisonPreset = useCallback((preset: PresetLevel) => {
    applyComparisonConfig(preset);
  }, [applyComparisonConfig]);

  const getPreviewTileClass = useCallback((type: TileType | "goal" | "agent") => {
    switch (type) {
      case "reward":
        return "bg-tile-reward";
      case "punishment":
        return "bg-tile-punishment";
      case "obstacle":
        return "bg-tile-obstacle";
      case "portal":
        return "bg-tile-portal";
      case "goal":
        return "bg-tile-goal";
      case "agent":
        return "bg-tile-agent";
      default:
        return "bg-tile-empty";
    }
  }, []);

  const renderEnvironmentPreview = useCallback(
    (config: GridConfig) => {
      const size = config.size;
      const tileSize = Math.max(6, Math.floor(80 / size));
      const tileLookup = new Map<string, TileType>();
      config.tiles.forEach((tile) => {
        tileLookup.set(`${tile.x}-${tile.y}`, tile.type);
      });

      return (
        <div
          className="grid bg-tile-bg rounded-md overflow-hidden"
          style={{
            gridTemplateColumns: `repeat(${size}, ${tileSize}px)`,
            gridTemplateRows: `repeat(${size}, ${tileSize}px)`,
            gap: "1px",
          }}
        >
          {Array.from({ length: size * size }, (_, index) => {
            const x = index % size;
            const y = Math.floor(index / size);
            const isAgent = config.agent?.x === x && config.agent?.y === y;
            const isGoal = config.goal?.x === x && config.goal?.y === y;
            const tileType = isGoal ? "goal" : isAgent ? "agent" : tileLookup.get(`${x}-${y}`) || "empty";
            return (
              <div
                key={`${x}-${y}`}
                className={cn("rounded-[2px]", getPreviewTileClass(tileType))}
                style={{ width: tileSize, height: tileSize }}
              />
            );
          })}
        </div>
      );
    },
    [getPreviewTileClass],
  );

  const handlePublishGlobal = useCallback(async () => {
    if (!authToken) {
      setAuthDialogOpen(true);
      return;
    }
    if (!isAdmin) {
      toast({
        title: translate("Nur für Admins", "Admins only"),
        description: translate(
          "Du brauchst Admin-Rechte, um eine globale Challenge zu veröffentlichen.",
          "You need admin rights to publish a global challenge.",
        ),
      });
      return;
    }

    const config = buildGridConfigFromState(playgroundState);
    try {
      const response = await fetch(`${apiBase}/api/admin/global-env`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ config }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.error || "Publish failed");
      }

      toast({
        title: translate("Global Challenge veröffentlicht", "Global challenge published"),
        description: translate(
          "Dein Setup ist jetzt die Challenge des Tages.",
          "Your setup is now the challenge of the day.",
        ),
      });
    } catch (error) {
      toast({
        title: translate("Veröffentlichung fehlgeschlagen", "Publish failed"),
        description: translate(
          "Bitte prüfe die Serververbindung und versuche es erneut.",
          "Check the server connection and try again.",
        ),
      });
    }
  }, [apiBase, authToken, buildGridConfigFromState, isAdmin, playgroundState, translate]);

  const handleLoadEnvironment = useCallback((gridConfig: GridConfig, progressData: unknown) => {
    if (gridConfig) {
      applyGridConfig(gridConfig);
    }
    const history = (progressData as { episodeHistory?: EpisodeStats[] } | null)?.episodeHistory;
    if (history) {
      setPlaygroundState((prev) => ({ ...prev, episodeHistory: history }));
    }
  }, [applyGridConfig]);

  const handleLoadSavedEnvironment = useCallback(
    (env: { name: string; gridConfig: GridConfig; progressData: unknown }) => {
      if (levelMode) return;
      handleLoadEnvironment(env.gridConfig, env.progressData);
      toast({
        title: translate("Umgebung geladen", "Environment loaded"),
        description: translate(
          `"${env.name}" ist bereit im Playground.`,
          `"${env.name}" is ready in the playground.`,
        ),
      });
    },
    [handleLoadEnvironment, translate, levelMode],
  );

  useEffect(() => {
    if (hasLoadedGlobalEnv) return;
    // Don't auto-load global env on initial page load to preserve "zwei wege" preset for small field
    // Users can manually load saved environments if needed
    setHasLoadedGlobalEnv(true);
  }, [hasLoadedGlobalEnv]);

  const handleTileSizeChange = useCallback(
    (size: TileSizeOption) => {
      if (size === tileSize) return;
      const nextSize = TILE_SIZE_MAP[size];
      setTileSize(size);
      setCelebration(null);
      setPlaygroundState(createInitialPlaygroundState(nextSize, false));
      setComparisonState(createComparisonState(nextSize));
      if (speedrunEnabled) {
        setRandomState((prev) =>
          buildSpeedrunState(prev.speedrun.stage, nextSize, prev.episode, prev.episodeHistory),
        );
      } else {
        setRandomState(createRandomModeState(LEVELS[levelKey], nextSize));
      }
    },
    [tileSize, levelKey, speedrunEnabled]
  );

  const handleModeChange = (targetMode: Mode) => {
    // Level Mode only ever shows the Playground grid — Random/Comparison
    // mode expose their own hyperparameter sliders and grids that aren't
    // gated by level progress, which would let players skip levels and
    // see "locked" learning parameters. Free Mode is unrestricted.
    if (levelMode && targetMode !== "playground") return;
    setMode(targetMode);
    setCelebration(null);
    // Reset celebration tracking when switching modes
    lastCelebratedEpisodeRef.current.playground = 0;
    lastCelebratedEpisodeRef.current.random = 0;

    // Stop all running modes
    setPlaygroundState((prev) => ({ ...prev, isRunning: false }));
    setRandomState((prev) => ({ ...prev, isRunning: false }));
    setComparisonState((prev) => ({
      left: { ...prev.left, isRunning: false },
      right: { ...prev.right, isRunning: false },
    }));

    if (targetMode === "random") {
      if (speedrunEnabled) {
        setRandomState((prev) =>
          buildSpeedrunState(prev.speedrun.stage, baseFieldSize, prev.episode, prev.episodeHistory),
        );
      } else {
        setRandomState(createRandomModeState(LEVELS[levelKey], baseFieldSize));
      }
    } else if (targetMode === "playground") {
      if (speedrunEnabled) {
        setSpeedrunEnabled(false);
        setRandomState((prev) => {
          const baseState = createRandomModeState(LEVELS[levelKey], baseFieldSize);
          return {
            ...baseState,
            episode: prev.episode,
            episodeHistory: prev.episodeHistory,
            speedrun: {
              active: false,
              stage: 0,
              timeLeft: 0,
              timeLimit: 0,
              pendingStage: false,
              baseSize: baseFieldSize,
            },
          };
        });
      }
    } else if (targetMode === "comparison") {
      // Reset comparison state
      setComparisonState(createComparisonState(baseFieldSize));
    }
  };

  const handleComparisonStart = useCallback(() => {
    setComparisonState((prev) => ({
      left: prev.left.isRunning
        ? prev.left
        : {
            ...prev.left,
            isRunning: true,
          },
      right: prev.right.isRunning
        ? prev.right
        : {
            ...prev.right,
            isRunning: true,
          },
    }));
  }, []);

  const handleComparisonPause = useCallback(() => {
    setComparisonState((prev) => ({
      left: prev.left.isRunning ? { ...prev.left, isRunning: false } : prev.left,
      right: prev.right.isRunning ? { ...prev.right, isRunning: false } : prev.right,
    }));
  }, []);

  const handleComparisonReset = useCallback(() => {
    setComparisonState(createComparisonState(baseFieldSize));
  }, [baseFieldSize]);

  const handleComparisonTilePlacement = useCallback(
    (x: number, y: number) => {
      const selectedType = placementModeRef.current;
      if (!selectedType) return;

      setComparisonState((prev) => {
        const applyPlacement = (rover: ComparisonRoverState) => {
          if ((x === rover.agent.x && y === rover.agent.y) || (x === rover.goal.x && y === rover.goal.y)) {
            return rover;
          }

          const grid = cloneGrid(rover.grid);
          const current = grid[y][x];
          const nextType = isDragging ? selectedType : (current.type === selectedType ? "empty" : selectedType);

          if (current.type === nextType) {
            return rover;
          }

          grid[y][x] = {
            ...current,
            type: nextType,
            value: levelValue(nextType),
            qValue: nextType === "empty" ? 0 : current.qValue,
            visits: nextType === "empty" ? 0 : current.visits,
          };

          return {
            ...rover,
            grid,
          };
        };

        const updatedLeft = applyPlacement(prev.left);
        const updatedRight = applyPlacement(prev.right);

        if (updatedLeft === prev.left && updatedRight === prev.right) {
          return prev;
        }

        return {
          left: updatedLeft,
          right: updatedRight,
        };
      });
    },
    [isDragging],
  );

  useEffect(() => {
    if (mode !== "comparison") return;
    setComparisonState((prev) => {
      const leftNeedsUpdate =
        prev.left.alpha !== alpha ||
        prev.left.gamma !== gamma ||
        prev.left.explorationRate !== explorationRate;
      const rightNeedsUpdate =
        prev.right.alpha !== alpha ||
        prev.right.gamma !== gamma ||
        prev.right.explorationRate !== explorationRate;

      if (!leftNeedsUpdate && !rightNeedsUpdate) {
        return prev;
      }

      return {
        left: leftNeedsUpdate ? { ...prev.left, alpha, gamma, explorationRate } : prev.left,
        right: rightNeedsUpdate ? { ...prev.right, alpha, gamma, explorationRate } : prev.right,
      };
    });
  }, [mode, alpha, gamma, explorationRate]);

  const handleLevelChange = useCallback((value: LevelKey) => {
    if (speedrunEnabled) return;
    setCelebration(null);
    setLevelKey(value);
    setRandomState(createRandomModeState(LEVELS[value], baseFieldSize));
  }, [baseFieldSize, speedrunEnabled]);

  const handleSpeedrunToggle = useCallback(
    (checked: boolean) => {
      setCelebration(null);
      const baseSize = baseFieldSize;
      if (checked) {
        setSpeedrunEnabled(true);
        challengeModeRef.current = null;
        setChallengeModeState(null);
        setRandomState((prev) =>
          buildSpeedrunState(0, baseSize, prev.episode, prev.episodeHistory),
        );
      } else {
        setSpeedrunEnabled(false);
        challengeModeRef.current = null;
        setChallengeModeState(null);
        setRandomState((prev) => {
          const baseState = createRandomModeState(LEVELS[levelKey], baseSize);
          return {
            ...baseState,
            episode: prev.episode,
            episodeHistory: prev.episodeHistory,
            speedrun: {
              active: false,
              stage: 0,
              timeLeft: 0,
              timeLimit: 0,
              pendingStage: false,
              baseSize,
            },
          };
        });
      }
    },
    [levelKey, baseFieldSize],
  );

  const handleRandomStart = () => {
    setCelebration(null);
    setRandomState((prev) => {
      if (prev.isRunning) return prev;
      const agentAtSpawn = prev.agent.x === prev.spawn.x && prev.agent.y === prev.spawn.y;
      return {
        ...prev,
        agent: agentAtSpawn ? prev.agent : { ...prev.spawn },
        isRunning: true,
        speedrun: prev.speedrun.active
          ? {
              ...prev.speedrun,
              timeLeft: prev.speedrun.timeLimit,
            }
          : prev.speedrun,
      };
    });
  };

  const handleRandomPause = () =>
    setRandomState((prev) => ({ ...prev, isRunning: false }));

  const handleRandomStep = () =>
    setRandomState((prev) => {
      const next = runRandomModeStep(
        { ...prev, isRunning: true },
        explorationRate,
        directionBias,
        consumeRewards,
        alpha,
        gamma,
      );
      return {
        ...next,
        isRunning: prev.isRunning,
        speedrun: {
          ...next.speedrun,
          timeLeft: prev.speedrun.timeLeft,
        },
      };
    });

  const handleRandomReset = () => {
    setCelebration(null);
    lastCelebratedEpisodeRef.current.random = 0;
    const baseSize = baseFieldSize;
    if (speedrunEnabled) {
      setRandomState((prev) =>
        buildSpeedrunState(0, baseSize, prev.episode, prev.episodeHistory),
      );
    } else {
      setRandomState(createRandomModeState(LEVELS[levelKey], baseSize));
    }
  };

  const activeGrid = mode === "playground" ? playgroundState.grid : randomState.grid;
  const activeQTable = mode === "playground" ? playgroundState.qTable : randomState.qTable;
  const gridSize = activeGrid.length;
  // Nebeneinander (ab lg): zwei Seitenspalten à min. 260 px, 2×24 px Abstand, ~80 px Rahmen um das Feld.
  const SIDE_COLUMN_MIN = 260;
  const sideBySide = layoutWidth > 0 && typeof window !== "undefined" && window.innerWidth >= 1024;
  const gridPixelTarget = sideBySide
    ? Math.max(280, Math.min(GRID_PIXEL_TARGET[tileSize], layoutWidth - 2 * SIDE_COLUMN_MIN - 48 - 80))
    : GRID_PIXEL_TARGET[tileSize];
  const tileSizePx = Math.max(24, Math.floor(gridPixelTarget / Math.max(gridSize, 1)));
  const TILE_GAP = 3;
  const gridPixelDimension = tileSizePx * gridSize + TILE_GAP * (gridSize - 1);

  // Zusätzlicher Platz basierend auf Feldgröße: s=320px, m=200px, l=150px
  // Bei l: genug für Header + Grid + padding ohne scrollen
  const cardHeightExtra = tileSize === 's' ? 320 : tileSize === 'm' ? 200 : 150;
  const cardHeight = gridPixelDimension + cardHeightExtra;

  // Grid-Layout: Bei größeren Feldern wird die Playground-Spalte breiter
  const gridCols = tileSize === 's'
    ? 'lg:grid-cols-[minmax(260px,1fr)_auto_minmax(260px,1fr)]'
    : tileSize === 'm'
    ? 'lg:grid-cols-[minmax(260px,0.7fr)_auto_minmax(260px,0.7fr)]'
    : 'lg:grid-cols-[minmax(260px,0.5fr)_auto_minmax(260px,0.5fr)]';

  const leftComparisonGridSize = comparisonState.left.grid.length;
  const rightComparisonGridSize = comparisonState.right.grid.length;
  const leftComparisonTileSizePx = Math.max(
    24,
    Math.floor(GRID_PIXEL_TARGET[tileSize] / Math.max(leftComparisonGridSize, 1)),
  );
  const rightComparisonTileSizePx = Math.max(
    24,
    Math.floor(GRID_PIXEL_TARGET[tileSize] / Math.max(rightComparisonGridSize, 1)),
  );
  const leftComparisonMaxVisits = useMemo(
    () => {
      if (!showHeatmap) return 1;
      const visits = comparisonState.left.grid.flat().map((cell) => cell.visits);
      return Math.max(...visits, 1);
    },
    [comparisonState.left.grid, showHeatmap],
  );
  const rightComparisonMaxVisits = useMemo(
    () => {
      if (!showHeatmap) return 1;
      const visits = comparisonState.right.grid.flat().map((cell) => cell.visits);
      return Math.max(...visits, 1);
    },
    [comparisonState.right.grid, showHeatmap],
  );
  const randomGridSize = randomState.grid.length;
  const randomObstacleCount = randomState.grid.reduce(
    (acc, row) => acc + row.filter((cell) => cell.type === "obstacle").length,
    0,
  );
  const randomRewardCount = randomState.grid.reduce(
    (acc, row) => acc + row.filter((cell) => cell.type === "reward").length,
    0,
  );
  const randomPunishmentCount = randomState.grid.reduce(
    (acc, row) => acc + row.filter((cell) => cell.type === "punishment").length,
    0,
  );
  const activeBonus = randomState.activeBonus;
  const bonusDetail = activeBonus ? BONUS_DETAILS[activeBonus] : null;
  const isPlaceableBonus = activeBonus !== null && activeBonus !== "teleport";
  const isBonusArmed = isPlaceableBonus && challengeMode === activeBonus;
  const bonusButtonVariant: "default" | "outline" = !randomState.bonusReady
    ? "outline"
    : isPlaceableBonus
      ? isBonusArmed
        ? "default"
      : "outline"
    : "default";
  const bonusDisabled = !randomState.bonusReady;
  const randomLeaderboardFiltered = speedrunEnabled
    ? randomLeaderboardEntries.filter((entry) => entry.mode === "speedrun")
      : randomLeaderboardEntries.filter((entry) => entry.mode !== "speedrun");
  const activeLeaderboardEntries =
    mode === "random" ? randomLeaderboardFiltered : playgroundLeaderboardEntries;
  const leaderboardTitle =
    mode === "random"
      ? speedrunEnabled
        ? translate("Speedrun-Bestenliste", "Speedrun Leaderboard")
        : translate("Zufallsmodus-Bestenliste", "Random Mode Leaderboard")
      : translate("Playground-Bestenliste", "Playground Leaderboard");
  const leaderboardEmptyText = mode === "random"
    ? speedrunEnabled
      ? translate(
          "Starte den Speedrun, um deinen ersten Eintrag zu erzielen.",
          "Start the speedrun to record your first entry.",
        )
      : translate(
          "Spiele eine Episode, um deinen ersten Eintrag freizuschalten.",
          "Complete an episode to unlock your first entry.",
        )
    : translate(
        "Spiele eine Episode, um deinen ersten Eintrag freizuschalten.",
        "Complete an episode to unlock your first entry.",
      );
  const gridStyle: React.CSSProperties = {
    gridTemplateColumns: `repeat(${gridSize}, ${tileSizePx}px)`,
    gridTemplateRows: `repeat(${gridSize}, ${tileSizePx}px)`,
  };

  const randomHud = mode === "random" && (
    <Card className="rounded-3xl border border-border bg-card/95 p-6 shadow-medium text-foreground backdrop-blur-sm transition-colors duration-200 hover:border-primary/30">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-3">
          <h3 className="text-lg font-bold gradient-text">
            {translate("🎲 Zufallsmodus", "🎲 Random Mode")}
          </h3>
          <p className="text-base text-muted-foreground max-w-2xl leading-relaxed">
            {translate(
              "Der Rover lernt in zufällig generierten Welten. Beobachte, wie er selbstständig Strategien entwickelt!",
              "Watch the rover learn inside procedurally generated worlds – every run is a fresh challenge!",
            )}
          </p>
          <p className="text-sm text-muted-foreground/80">{levelDescription}</p>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Label className="text-sm font-semibold text-muted-foreground">
                {translate("Speedrun-Modus", "Speedrun mode")}
              </Label>
              <Switch
                checked={speedrunEnabled}
                onCheckedChange={handleSpeedrunToggle}
                aria-label={translate("Speedrun umschalten", "Toggle speedrun mode")}
              />
            </div>
            {speedrunEnabled && (
              <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="bg-red-500/10 text-red-400 border-red-400/30">
                    ⏱ {randomState.speedrun.timeLeft}s
                  </Badge>
                  <Badge variant="secondary" className="bg-foreground/10 text-foreground border-foreground/20">
                    {translate("Stufe", "Stage")} {(randomState.speedrun.stage ?? 0) + 1}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {translate(
                    "Die Zeit läuft weiter, bis der Rover das Ziel erreicht – jede Stufe wird dichter und schwieriger.",
                    "The clock keeps ticking until the rover hits the goal – each stage is denser and harder.",
                  )}
                </p>
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
            {levelName}
          </Badge>
          <Badge variant="secondary" className="bg-foreground/10 text-foreground border-foreground/15 font-semibold">
            {randomGridSize} × {randomGridSize}
          </Badge>
          <Badge variant="secondary">
            {translate("Episode", "Episode")} {randomState.episode}
          </Badge>
          <Badge variant="secondary" className="bg-foreground/10 text-foreground border-foreground/15">
            👣 {randomState.currentSteps}
          </Badge>
          <Badge
            variant="secondary"
            className={
              randomState.totalReward >= 0
                ? "bg-green-500/10 text-green-400"
                : "bg-red-500/10 text-red-400"
            }
          >
            {numberFormatter.format(randomState.totalReward)}
          </Badge>
          <Badge variant="secondary">🍬 {randomRewardCount}</Badge>
          <Badge variant="secondary">⚡ {randomPunishmentCount}</Badge>
          <Badge variant="secondary">🧱 {randomObstacleCount}</Badge>
        </div>
      </div>
      <div className="mt-4 rounded-2xl border border-border/40 bg-background/70">
        <button
          type="button"
          onClick={() => setShowRandomStatsCard((prev) => !prev)}
          className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:text-primary"
        >
          <span>{translate("Zufallsmodus-Statistik", "Random Mode Statistics")}</span>
          {showRandomStatsCard ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {showRandomStatsCard && (
          <div className="border-t border-border/40 px-4 py-3 text-sm text-muted-foreground">
            {randomStatsSummary.count === 0 ? (
              <p>{translate("Noch keine Daten – starte eine Episode, um Statistiken zu sehen.", "No data yet — run an episode to gather statistics.")}</p>
            ) : (
              <div className="grid gap-2">
                <div className="flex justify-between">
                  <span>{translate("Gesamt-Episoden", "Total episodes")}</span>
                  <span className="font-semibold text-foreground">{randomStatsSummary.count}</span>
                </div>
                <div className="flex justify-between">
                  <span>{translate("Ø Schritte", "Avg. steps")}</span>
                  <span className="font-semibold text-foreground">{formatStepsValue(randomStatsSummary.avgSteps)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{translate("Ø Reward", "Avg. reward")}</span>
                  <span className="font-semibold text-foreground">{formatRewardValue(randomStatsSummary.avgReward)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{translate("Bester Reward", "Best reward")}</span>
                  <span className="font-semibold text-foreground">{formatRewardValue(randomStatsSummary.bestReward)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{translate("Schnellste Episode", "Fastest episode")}</span>
                  <span className="font-semibold text-foreground">{formatStepsValue(randomStatsSummary.bestSteps)}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );

  const currentSlide = tutorialSlides[tutorialStep];

  return (
    <>
      {/* Tutorial Dialog */}
      <Dialog open={tutorialOpen} onOpenChange={setTutorialOpen} modal={false}>
        <DialogContent
          hideOverlay
          onInteractOutside={(e) => e.preventDefault()}
          className="max-w-2xl top-auto bottom-4 translate-y-0 data-[state=open]:slide-in-from-top-0 data-[state=closed]:slide-out-to-top-0 shadow-2xl border-primary/40"
        >
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-2xl font-bold">{currentSlide?.title}</DialogTitle>
              <div className="flex items-center gap-2 rounded-full border border-border/60 bg-card/70 px-3 py-1.5">
                <span className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <span role="img" aria-hidden>
                    🇬🇧
                  </span>
                  {translate("English", "English")}
                </span>
                <Switch
                  id="tutorial-language-toggle"
                  checked={isEnglish}
                  onCheckedChange={(checked) => setLanguage(checked ? "en" : "de")}
                  aria-label={translate("Sprache umschalten", "Toggle language")}
                />
              </div>
            </div>
            <DialogDescription className="text-base leading-relaxed pt-2">
              {currentSlide?.content}
            </DialogDescription>
          </DialogHeader>

          {currentSlide?.bullets && (
            <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-6 py-3">
              {currentSlide.bullets.map((bullet, idx) => (
                <li key={idx} className="leading-relaxed">{bullet}</li>
              ))}
            </ul>
          )}

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              {translate("Schritt", "Step")} {tutorialStep + 1} / {tutorialSlides.length}
            </div>
            <div className="flex gap-2">
              {tutorialStep > 0 && (
                <Button variant="outline" onClick={prevTutorialStep}>
                  {translate("Zurück", "Back")}
                </Button>
              )}
              <Button variant="ghost" onClick={closeTutorial}>
                {translate("Später", "Skip")}
              </Button>
              <Button onClick={nextTutorialStep}>
                {tutorialStep < tutorialSlides.length - 1
                  ? translate("Weiter", "Next")
                  : translate("Los geht's!", "Let's go!")
                }
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Level coach: short hint popups per level */}
      <Dialog open={coachStep !== null && !!activeCoachSlide} onOpenChange={(open) => !open && closeCoach()} modal={false}>
        <DialogContent
          hideOverlay
          onInteractOutside={(e) => e.preventDefault()}
          className="max-w-xl top-auto bottom-4 translate-y-0 data-[state=open]:slide-in-from-top-0 data-[state=closed]:slide-out-to-top-0 shadow-2xl border-primary/40"
        >
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {activeCoachSlide && translate(activeCoachSlide.title.de, activeCoachSlide.title.en)}
            </DialogTitle>
            <DialogDescription className="text-base leading-relaxed pt-1">
              {activeCoachSlide && translate(activeCoachSlide.text.de, activeCoachSlide.text.en)}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between pt-3 border-t">
            <div className="text-sm text-muted-foreground">
              {translate("Hilfe", "Hint")} {(coachStep ?? 0) + 1} / {coachSlides.length}
            </div>
            <div className="flex gap-2">
              {(coachStep ?? 0) > 0 && (
                <Button variant="outline" onClick={() => setCoachStep((s) => Math.max(0, (s ?? 0) - 1))}>
                  {translate("Zurück", "Back")}
                </Button>
              )}
              <Button variant="ghost" onClick={closeCoach}>
                {translate("Schließen", "Close")}
              </Button>
              <Button
                onClick={() =>
                  (coachStep ?? 0) < coachSlides.length - 1 ? setCoachStep((s) => (s ?? 0) + 1) : closeCoach()
                }
              >
                {(coachStep ?? 0) < coachSlides.length - 1 ? translate("Weiter", "Next") : translate("Verstanden!", "Got it!")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={authDialogOpen}
        onOpenChange={(open) => {
          setAuthDialogOpen(open);
          if (!open) {
            setAuthError(null);
            setAuthPassword("");
          }
        }}
      >
        <DialogContent className="max-w-md bg-card border border-border shadow-2xl p-8 text-foreground">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white">
              {authIsRegistering
                ? translate("Account erstellen", "Create account")
                : translate("Login", "Login")}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {translate(
                "Nur Nutzername und Passwort. Dein Level-Fortschritt wird gespeichert und folgt dir auf jedes Gerät.",
                "Just a username and password. Your level progress is saved and follows you to any device.",
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label
                htmlFor="auth-username"
                className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
              >
                {translate("Nutzername", "Username")}
              </Label>
              <Input
                id="auth-username"
                onKeyDown={(event) => event.key === "Enter" && handleAuthSubmit()}
                value={authUsername}
                onChange={(event) => setAuthUsername(event.target.value)}
                placeholder="max"
                className="h-12 rounded-lg bg-muted border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/80 focus-visible:border-transparent"
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="auth-password"
                className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
              >
                {translate("Passwort", "Password")}
              </Label>
              <Input
                id="auth-password"
                onKeyDown={(event) => event.key === "Enter" && handleAuthSubmit()}
                type="password"
                value={authPassword}
                onChange={(event) => setAuthPassword(event.target.value)}
                className="h-12 rounded-lg bg-muted border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/80 focus-visible:border-transparent"
              />
            </div>
            {authIsRegistering && (
              <p
                role="note"
                className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200"
              >
                {translate(
                  "Merk dir dein Passwort gut! Es gibt keine „Passwort vergessen“-Funktion. Ohne Passwort ist dein Fortschritt nicht mehr erreichbar. Mindestens 6 Zeichen.",
                  "Remember your password! There is no “forgot password” option. Without it your progress can't be recovered. At least 6 characters.",
                )}
              </p>
            )}
            <div className="flex items-center gap-2">
              <Checkbox
                id="remember-me"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked === true)}
                className="border-slate-600 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <Label htmlFor="remember-me" className="text-sm text-foreground/80">
                {translate("Eingeloggt bleiben", "Stay signed in")}
              </Label>
            </div>
            {authError && <p className="text-xs text-red-400">{authError}</p>}
            <div className="space-y-3">
              <Button
                onClick={handleAuthSubmit}
                className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold transition-colors"
              >
                {authIsRegistering ? translate("Registrieren", "Register") : translate("Login", "Login")}
              </Button>
              <button
                type="button"
                onClick={() => setAuthIsRegistering((prev) => !prev)}
                className="mx-auto text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {authIsRegistering
                  ? translate("Schon registriert? ", "Already registered? ")
                  : translate("Neu hier? ", "New here? ")}
                <span className="text-primary/90 hover:text-primary">
                  {authIsRegistering ? translate("Login", "Login") : translate("Registrieren", "Register")}
                </span>
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="bg-[var(--gradient-main)] pb-12">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 pt-6">
        {/* Hero Section */}
        <div className="rounded-3xl border border-border bg-card/95 p-8 ">
          <div className="flex items-center gap-3 mb-4">
            <Target className="h-8 w-8 text-primary" />
            <h1 className="text-4xl md:text-5xl font-bold gradient-text">Reward Rover</h1>
          </div>

          <p className="text-xl text-muted-foreground leading-relaxed mb-6 max-w-4xl">
            {isEnglish ? (
              <>
                Experience <strong className="text-foreground gradient-text">reinforcement learning</strong> across three modes.
                Compare strategies, explore random worlds, and build your own playground.
              </>
            ) : (
              <>
                Erlebe <strong className="text-foreground gradient-text">Reinforcement Learning</strong> in drei Modi.
                Vergleiche Strategien, erkunde Zufallswelten und baue deinen eigenen Playground.
              </>
            )}
          </p>

          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setShowIntro((prev) => !prev)}
                className="font-semibold flex items-center gap-2"
              >
                {introToggleLabel}
                <ChevronDown
                  className={cn("h-4 w-4 transition-transform duration-200", showIntro ? "rotate-180" : "")}
                />
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {authUser ? (
                <>
                  <Badge variant="secondary" className="bg-foreground/10 text-foreground border-foreground/15">
                    {authUser.username}
                  </Badge>
                  {isAdmin && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open("/admin", "_blank")}
                    >
                      {translate("Admin Panel", "Admin Panel")}
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={handleLogout}>
                    {translate("Logout", "Logout")}
                  </Button>
                </>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setAuthDialogOpen(true)}>
                  {translate("Login", "Login")}
                </Button>
              )}
              <div className="flex items-center gap-2 rounded-full border border-border/60 bg-card/70 px-3 py-1.5">
                <span className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <span role="img" aria-hidden>
                    🇬🇧
                  </span>
                  {translate("English UI", "English UI")}
                </span>
                <Switch
                  id="language-toggle"
                  checked={isEnglish}
                  onCheckedChange={(checked) => setLanguage(checked ? "en" : "de")}
                  aria-label={translate("Sprache umschalten", "Toggle language")}
                />
              </div>
            </div>
          </div>

          <RLGuideDialog open={rlDialogOpen} onOpenChange={setRlDialogOpen} translate={translate} />

          <Collapsible open={showIntro} onOpenChange={setShowIntro}>
            <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
              <div className="grid md:grid-cols-2 gap-6 pt-3">
                <Card className="rounded-2xl border border-border bg-secondary/40 p-5 shadow-soft transform transition-transform transition-colors duration-300 hover:-translate-y-1 hover:border-primary/50 hover:bg-primary/10 hover:shadow-sm">
                  <h3 className="text-lg font-bold text-foreground mb-2 flex items-center gap-2">
                    {translate(
                      "Exploration vs. Exploitation",
                      "🎯 Exploration vs. Exploitation",
                    )}
                  </h3>
                  <p className="text-base text-muted-foreground leading-relaxed">
                    {isEnglish ? (
                      <>
                        Imagine visiting a restaurant: exploitation means
                        <strong className="text-foreground"> ordering your favourite dish </strong>
                        every time – safe and familiar. Exploration means
                        <strong className="text-foreground"> trying something new </strong>
                        – maybe you discover something even better! The rover has to strike the same balance:
                        rely on learned strategies or explore unknown territory.
                      </>
                    ) : (
                      <>
                        Stell dir vor, du gehst in ein Restaurant: Ausbeuten (Exploitation) bedeutet,
                        <strong className="text-foreground"> immer dein Lieblingsgericht </strong>
                        zu bestellen – sicher und vertraut. Entdecken (Exploration) heißt,
                        <strong className="text-foreground"> mutig etwas Neues zu probieren </strong>
                        – vielleicht entdeckst du etwas noch Besseres! Der Rover muss genau diese Balance finden:
                        Nutzt er, was er schon weiß, oder wagt er neue Wege?
                      </>
                    )}
                  </p>
                </Card>
                <Card className="rounded-2xl border border-border bg-secondary/40 p-5 shadow-soft transform transition-transform transition-colors duration-300 hover:-translate-y-1 hover:border-primary/50 hover:bg-primary/10 hover:shadow-sm">
                  <h3 className="text-lg font-bold text-foreground mb-2 flex items-center gap-2">
                    {translate("Three Modes to Explore", "🚀 Three modes to explore")}
                  </h3>
                  <div className="text-base text-muted-foreground leading-relaxed space-y-2">
                    <p>
                      <strong className="text-foreground">
                        {translate("Playground:", "Playground:")}
                      </strong>{" "}
                      {translate(
                        "Baue deine eigene Welt und platziere Mauern, Belohnungen oder Strafen ganz nach deinen Regeln.",
                        "Build your own world and place walls, rewards, or penalties however you like.",
                      )}
                    </p>
                    <p>
                      <strong className="text-foreground">
                        {translate("Zufallsmodus:", "Random mode:")}
                      </strong>{" "}
                      {translate(
                        "Lass den Rover in prozedural erzeugten Labyrinthen trainieren – jede Episode ist anders.",
                        "Let the rover train inside procedurally generated mazes – every episode is different.",
                      )}
                    </p>
                    <p>
                      <strong className="text-foreground">
                        {translate("Vergleichsmodus:", "Comparison mode:")}
                      </strong>{" "}
                      {translate(
                        "Starte zwei Rover mit unterschiedlichen Hyperparametern und beobachte ihre Fortschritte im direkten Vergleich.",
                        "Launch two rovers with different hyperparameters and watch their progress side by side.",
                      )}
                    </p>
                  </div>
                </Card>
              </div>
              <div className="flex justify-end pt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRlDialogOpen(true)}
                  className="text-xs"
                >
                  📖 {translate("Erklärung: Wie lernt der Rover?", "Guide: How does the rover learn?")}
                </Button>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {levelMode && objectiveStatus && (
          <>
            <LevelObjectivePanel
              level={currentLevel as LevelNumber}
              status={objectiveStatus}
              translate={translate}
            />
            {coachSlides.length > 0 && coachStep === null && (
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={() => setCoachStep(0)}>
                  💡 {translate("Hilfe zu diesem Level zeigen", "Show help for this level")}
                </Button>
              </div>
            )}
          </>
        )}

        <ControlBar
          mode={mode}
          onModeChange={handleModeChange}
          translate={translate}
          levelMode={levelMode}
        />

        {mode === "comparison" && (
            <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant={placementMode === "reward" ? "default" : "outline"}
                  onClick={() => changePlacementMode("reward")}
                  className="flex items-center gap-2 font-semibold"
                >
                  <span aria-hidden>🍬</span>
                  {translate("Belohnung platzieren", "Place reward")}
                </Button>
                <Button
                  variant={placementMode === "punishment" ? "default" : "outline"}
                  onClick={() => changePlacementMode("punishment")}
                  className="flex items-center gap-2 font-semibold"
                >
                  <span aria-hidden>⚡</span>
                  {translate("Strafe platzieren", "Place penalty")}
                </Button>
                <Button
                  variant={comparisonState.left.isRunning && comparisonState.right.isRunning ? "secondary" : "default"}
                  onClick={handleComparisonStart}
                  className="flex items-center gap-2 font-semibold"
                >
                  <span aria-hidden>▶️</span>
                  {translate("Beide starten", "Start both")}
                </Button>
                <Button
                  variant={comparisonState.left.isRunning || comparisonState.right.isRunning ? "default" : "outline"}
                  onClick={handleComparisonPause}
                  className="flex items-center gap-2 font-semibold"
                >
                  <span aria-hidden>⏸️</span>
                  {translate("Beide pausieren", "Pause both")}
                </Button>
              </div>
              <Button
                variant="outline"
                onClick={handleComparisonReset}
                className="flex items-center gap-2 font-semibold"
              >
                {translate("Restart", "Restart comparison")}
              </Button>
            </div>
            <div className="grid gap-3 md:grid-cols-[2fr_1fr]">
              <Card className="rounded-lg border border-border/40 bg-secondary/20 p-4">
                <Collapsible open={comparisonPresetsOpen} onOpenChange={setComparisonPresetsOpen} className="space-y-2">
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-between rounded-xl border border-border/40 bg-background/60 font-semibold text-base"
                    >
                      <span>{translate("🎯 Preset-Levels", "🎯 Preset Levels")}</span>
                      <ChevronDown
                        className={cn("h-4 w-4 transition-transform duration-200", comparisonPresetsOpen ? "rotate-180" : "")}
                      />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {PRESET_LEVELS.map((preset) => (
                        <TooltipProvider key={preset.key}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleLoadComparisonPreset(preset)}
                                className="text-xs font-semibold h-auto py-2"
                              >
                                {preset.name[language]}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">{preset.description[language]}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
              <Card className="rounded-lg border border-border/40 bg-secondary/20 p-4">
                <Label className="text-base font-semibold text-foreground">
                  {translate("🚀 Geschwindigkeit", "🚀 Speed")}
                </Label>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {SIMULATION_SPEEDS.map((option) => (
                    <Button
                      key={option.key}
                      variant={comparisonSpeed === option.key ? "default" : "outline"}
                      size="sm"
                      onClick={() => setComparisonSpeed(option.key)}
                      className="text-xs font-semibold"
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </Card>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
            {/* Left Rover */}
            <Card className="rounded-3xl border border-border bg-card/95 p-4 shadow-medium text-foreground backdrop-blur-sm max-h-[calc(100vh-12rem)] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-primary">{comparisonState.left.name}</h2>
                <Button
                  variant={comparisonState.left.isRunning ? "secondary" : "default"}
                  onClick={() =>
                    setComparisonState((prev) => ({
                      ...prev,
                      left: { ...prev.left, isRunning: !prev.left.isRunning },
                    }))
                  }
                >
                  {comparisonState.left.isRunning ?
                    <><Pause className="mr-2 h-5 w-5" />{translate("Pause", "Pause")}</> :
                    <><Play className="mr-2 h-5 w-5" />{translate("Start", "Start")}</>
                  }
                </Button>
              </div>

              <div className="mb-4 space-y-3 text-sm">
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <div className="flex items-center gap-1.5">
                      <span>{translate("Exploration:", "Exploration:")}</span>
                      <button
                        onClick={() => setShowComparisonLeftExplorationInfo(!showComparisonLeftExplorationInfo)}
                        className="text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                        aria-label="Toggle info"
                      >
                        <Info className="h-4 w-4" />
                      </button>
                    </div>
                    <span className="font-bold">{Math.round(comparisonState.left.explorationRate * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={comparisonState.left.explorationRate}
                    onChange={(e) =>
                      setComparisonState((prev) => ({
                        ...prev,
                        left: { ...prev.left, explorationRate: e.target.valueAsNumber },
                      }))
                    }
                    className="input-slider w-full"
                    style={{ "--slider-value": comparisonState.left.explorationRate } as CSSProperties}
                  />
                  <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                    <span className="font-medium">
                      {translate("← Ausbeutung", "← Exploitation")}
                    </span>
                    <span className="font-medium">
                      {translate("Entdeckung →", "Exploration →")}
                    </span>
                  </div>
                  {showComparisonLeftExplorationInfo && (
                    <p className="text-sm text-muted-foreground leading-relaxed pl-1 animate-in fade-in duration-200">
                      {translate(
                        "Bestimmt, wie oft der Rover neue Wege ausprobiert statt bekannte Routen zu nutzen. Hohe Werte = mehr Entdecken, niedrige Werte = mehr Ausbeuten bereits gelernter Strategien.",
                        "Determines how often the rover tries new paths instead of using known routes. Higher values explore more, lower values exploit known strategies."
                      )}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <div className="flex items-center gap-1.5">
                      <span>{translate("Lernrate (α):", "Learning rate (α):")}</span>
                      <button
                        onClick={() => setShowComparisonLeftAlphaInfo(!showComparisonLeftAlphaInfo)}
                        className="text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                        aria-label="Toggle info"
                      >
                        <Info className="h-4 w-4" />
                      </button>
                    </div>
                    <span className="font-bold">{comparisonState.left.alpha.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={0.01}
                    max={0.5}
                    step={0.01}
                    value={comparisonState.left.alpha}
                    onChange={(e) =>
                      setComparisonState((prev) => ({
                        ...prev,
                        left: { ...prev.left, alpha: e.target.valueAsNumber },
                      }))
                    }
                    className="input-slider w-full"
                    style={{ "--slider-value": comparisonState.left.alpha / 0.5 } as CSSProperties}
                  />
                  {showComparisonLeftAlphaInfo && (
                    <p className="text-sm text-muted-foreground leading-relaxed pl-1 animate-in fade-in duration-200">
                      {translate(
                        "Bestimmt, wie stark neue Erfahrungen alte Werte überschreiben. Hohe Werte = schnelles Lernen, niedrige Werte = stabiles Lernen.",
                        "Determines how much new experiences override old values. High values = fast learning, low values = stable learning."
                      )}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <div className="flex items-center gap-1.5">
                      <span>{translate("Discount (γ):", "Discount (γ):")}</span>
                      <button
                        onClick={() => setShowComparisonLeftGammaInfo(!showComparisonLeftGammaInfo)}
                        className="text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                        aria-label="Toggle info"
                      >
                        <Info className="h-4 w-4" />
                      </button>
                    </div>
                    <span className="font-bold">{comparisonState.left.gamma.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={0.99}
                    step={0.01}
                    value={comparisonState.left.gamma}
                    onChange={(e) =>
                      setComparisonState((prev) => ({
                        ...prev,
                        left: { ...prev.left, gamma: e.target.valueAsNumber },
                      }))
                    }
                    className="input-slider w-full"
                    style={{ "--slider-value": comparisonState.left.gamma } as CSSProperties}
                  />
                  {showComparisonLeftGammaInfo && (
                    <p className="text-sm text-muted-foreground leading-relaxed pl-1 animate-in fade-in duration-200">
                      {translate(
                        "Gewichtet zukünftige Belohnungen. Hohe Werte = langfristige Planung, niedrige Werte = kurzfristige Belohnungen bevorzugen.",
                        "Weights future rewards. High values = long-term planning, low values = prefer immediate rewards."
                      )}
                    </p>
                  )}
                </div>
                <div className="flex justify-between pt-2 border-t border-border/30">
                  <span>{translate("Episode:", "Episode:")}</span>
                  <span className="font-bold">{comparisonState.left.episode}</span>
                </div>
                <div className="flex justify-between">
                  <span>{translate("Gesamt-Belohnung:", "Total reward:")}</span>
                  <span className="font-bold">{comparisonState.left.totalReward.toFixed(0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{translate("Aktuelle Züge:", "Current moves:")}</span>
                  <span className="font-bold tabular-nums">{formatMovesValue(leftMoveStats.current)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{translate("Ø Züge (niedriger besser):", "Avg. moves (lower is better):")}</span>
                  <span className="font-bold tabular-nums">{formatMovesValue(leftMoveStats.average)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{translate("Beste Züge:", "Best moves:")}</span>
                  <span className="font-bold tabular-nums">{formatMovesValue(leftMoveStats.best)}</span>
                </div>
              </div>

              <div
                className="relative mx-auto overflow-hidden"
                style={{
                  width: leftComparisonTileSizePx * leftComparisonGridSize + (leftComparisonGridSize - 1),
                  height: leftComparisonTileSizePx * leftComparisonGridSize + (leftComparisonGridSize - 1),
                  borderRadius: "8px",
                }}
              >
                <div
                  className="grid bg-tile-bg"
                  style={{
                    gridTemplateColumns: `repeat(${leftComparisonGridSize}, ${leftComparisonTileSizePx}px)`,
                    gridTemplateRows: `repeat(${leftComparisonGridSize}, ${leftComparisonTileSizePx}px)`,
                    gap: "1px",
                  }}
                >
                  {comparisonState.left.grid.flatMap((row, y) =>
                    row.map((cell, x) => {
                      const isAgent = comparisonState.left.agent.x === x && comparisonState.left.agent.y === y;
                      const isGoal = comparisonState.left.goal.x === x && comparisonState.left.goal.y === y;
                      const tileType = isGoal ? "goal" : isAgent ? "empty" : cell.type;
                      const value = showValues ? cell.qValue : cell.value;
                      const icon = isAgent ? "" : isGoal ? TILE_ICONS.goal : TILE_ICONS[cell.type];
                      const showValue =
                        showValues &&
                        !isAgent &&
                        tileType !== "obstacle" &&
                        tileType !== "portal";
                      const ariaLabel = isEnglish
                        ? `${tileLabels[cell.type]} at tile (${x + 1}, ${y + 1}), value ${numberFormatter.format(value)}${isAgent ? ", Rover" : ""}${isGoal ? ", Goal" : ""}`
                        : `${tileLabels[cell.type]} bei Feld (${x + 1}, ${y + 1}), Wert ${numberFormatter.format(value)}${isAgent ? ", Agent" : ""}${isGoal ? ", Ziel" : ""}`;
                      return (
                        <Tile
                          key={`left-${x}-${y}`}
                          x={x}
                          y={y}
                          type={tileType}
                          value={value}
                          showValues={showValue}
                          isAgent={isAgent}
                          isGoal={isGoal}
                          tileSize={leftComparisonTileSizePx}
                          ariaLabel={ariaLabel}
                          icon={icon}
                          visits={cell.visits}
                          showHeatmap={showHeatmap}
                          maxVisits={leftComparisonMaxVisits}
                          bestAction={showActions ? getBestActionDirection(comparisonState.left.grid, { x, y }, comparisonState.left.qTable) : undefined}
                          showActions={showActions}
                          onClick={mode === "comparison" ? handleComparisonTilePlacement : undefined}
                          onMouseDown={mode === "comparison" ? handleMouseDown : undefined}
                          onMouseEnter={
                            mode === "comparison"
                              ? () => {
                                  if (isDragging) {
                                    handleComparisonTilePlacement(x, y);
                                  }
                                }
                              : undefined
                          }
                          rewardAnimation={leftRewardAnimation && leftRewardAnimation.x === x && leftRewardAnimation.y === y ? leftRewardAnimation.type : null}
                        />
                      );
                    })
                  )}
                </div>
                <div
                  className="absolute pointer-events-none"
                  style={{
                    left: comparisonState.left.agent.x * leftComparisonTileSizePx,
                    top: comparisonState.left.agent.y * leftComparisonTileSizePx,
                    width: leftComparisonTileSizePx,
                    height: leftComparisonTileSizePx,
                    transition: "left 0.3s ease-out, top 0.3s ease-out",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize:
                      leftComparisonTileSizePx > 40
                        ? "2.5rem"
                        : leftComparisonTileSizePx > 32
                          ? "2rem"
                          : "1.5rem",
                    zIndex: 10,
                  }}
                  aria-hidden
                >
                  <span className="rr-rover" />
                </div>
              </div>
            </Card>

            {/* Right Rover */}
            <Card className="rounded-3xl border border-border bg-card/95 p-4 shadow-medium text-foreground backdrop-blur-sm max-h-[calc(100vh-12rem)] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-primary">{comparisonState.right.name}</h2>
                <Button
                  variant={comparisonState.right.isRunning ? "secondary" : "default"}
                  onClick={() =>
                    setComparisonState((prev) => ({
                      ...prev,
                      right: { ...prev.right, isRunning: !prev.right.isRunning },
                    }))
                  }
                >
                  {comparisonState.right.isRunning ?
                    <><Pause className="mr-2 h-5 w-5" />{translate("Pause", "Pause")}</> :
                    <><Play className="mr-2 h-5 w-5" />{translate("Start", "Start")}</>
                  }
                </Button>
              </div>

              <div className="mb-4 space-y-3 text-sm">
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <div className="flex items-center gap-1.5">
                      <span>{translate("Exploration:", "Exploration:")}</span>
                      <button
                        onClick={() => setShowComparisonRightExplorationInfo(!showComparisonRightExplorationInfo)}
                        className="text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                        aria-label="Toggle info"
                      >
                        <Info className="h-4 w-4" />
                      </button>
                    </div>
                    <span className="font-bold">{Math.round(comparisonState.right.explorationRate * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={comparisonState.right.explorationRate}
                    onChange={(e) =>
                      setComparisonState((prev) => ({
                        ...prev,
                        right: { ...prev.right, explorationRate: e.target.valueAsNumber },
                      }))
                    }
                    className="input-slider w-full"
                    style={{ "--slider-value": comparisonState.right.explorationRate } as CSSProperties}
                  />
                  <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                    <span className="font-medium">
                      {translate("← Ausbeutung", "← Exploitation")}
                    </span>
                    <span className="font-medium">
                      {translate("Entdeckung →", "Exploration →")}
                    </span>
                  </div>
                  {showComparisonRightExplorationInfo && (
                    <p className="text-sm text-muted-foreground leading-relaxed pl-1 animate-in fade-in duration-200">
                      {translate(
                        "Bestimmt, wie oft der Rover neue Wege ausprobiert statt bekannte Routen zu nutzen. Hohe Werte = mehr Entdecken, niedrige Werte = mehr Ausbeuten bereits gelernter Strategien.",
                        "Determines how often the rover tries new paths instead of using known routes. Higher values explore more, lower values exploit known strategies."
                      )}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <div className="flex items-center gap-1.5">
                      <span>{translate("Lernrate (α):", "Learning rate (α):")}</span>
                      <button
                        onClick={() => setShowComparisonRightAlphaInfo(!showComparisonRightAlphaInfo)}
                        className="text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                        aria-label="Toggle info"
                      >
                        <Info className="h-4 w-4" />
                      </button>
                    </div>
                    <span className="font-bold">{comparisonState.right.alpha.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={0.01}
                    max={0.5}
                    step={0.01}
                    value={comparisonState.right.alpha}
                    onChange={(e) =>
                      setComparisonState((prev) => ({
                        ...prev,
                        right: { ...prev.right, alpha: e.target.valueAsNumber },
                      }))
                    }
                    className="input-slider w-full"
                    style={{ "--slider-value": comparisonState.right.alpha / 0.5 } as CSSProperties}
                  />
                  {showComparisonRightAlphaInfo && (
                    <p className="text-sm text-muted-foreground leading-relaxed pl-1 animate-in fade-in duration-200">
                      {translate(
                        "Bestimmt, wie stark neue Erfahrungen alte Werte überschreiben. Hohe Werte = schnelles Lernen, niedrige Werte = stabiles Lernen.",
                        "Determines how much new experiences override old values. High values = fast learning, low values = stable learning."
                      )}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <div className="flex items-center gap-1.5">
                      <span>{translate("Discount (γ):", "Discount (γ):")}</span>
                      <button
                        onClick={() => setShowComparisonRightGammaInfo(!showComparisonRightGammaInfo)}
                        className="text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                        aria-label="Toggle info"
                      >
                        <Info className="h-4 w-4" />
                      </button>
                    </div>
                    <span className="font-bold">{comparisonState.right.gamma.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={0.99}
                    step={0.01}
                    value={comparisonState.right.gamma}
                    onChange={(e) =>
                      setComparisonState((prev) => ({
                        ...prev,
                        right: { ...prev.right, gamma: e.target.valueAsNumber },
                      }))
                    }
                    className="input-slider w-full"
                    style={{ "--slider-value": comparisonState.right.gamma } as CSSProperties}
                  />
                  {showComparisonRightGammaInfo && (
                    <p className="text-sm text-muted-foreground leading-relaxed pl-1 animate-in fade-in duration-200">
                      {translate(
                        "Gewichtet zukünftige Belohnungen. Hohe Werte = langfristige Planung, niedrige Werte = kurzfristige Belohnungen bevorzugen.",
                        "Weights future rewards. High values = long-term planning, low values = prefer immediate rewards."
                      )}
                    </p>
                  )}
                </div>
                <div className="flex justify-between pt-2 border-t border-border/30">
                  <span>{translate("Episode:", "Episode:")}</span>
                  <span className="font-bold">{comparisonState.right.episode}</span>
                </div>
                <div className="flex justify-between">
                  <span>{translate("Gesamt-Belohnung:", "Total reward:")}</span>
                  <span className="font-bold">{comparisonState.right.totalReward.toFixed(0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{translate("Aktuelle Züge:", "Current moves:")}</span>
                  <span className="font-bold tabular-nums">{formatMovesValue(rightMoveStats.current)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{translate("Ø Züge (niedriger besser):", "Avg. moves (lower is better):")}</span>
                  <span className="font-bold tabular-nums">{formatMovesValue(rightMoveStats.average)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{translate("Beste Züge:", "Best moves:")}</span>
                  <span className="font-bold tabular-nums">{formatMovesValue(rightMoveStats.best)}</span>
                </div>
              </div>

              <div
                className="relative mx-auto overflow-hidden"
                style={{
                  width: rightComparisonTileSizePx * rightComparisonGridSize + (rightComparisonGridSize - 1),
                  height: rightComparisonTileSizePx * rightComparisonGridSize + (rightComparisonGridSize - 1),
                  borderRadius: "8px",
                }}
              >
                <div
                  className="grid bg-tile-bg"
                  style={{
                    gridTemplateColumns: `repeat(${rightComparisonGridSize}, ${rightComparisonTileSizePx}px)`,
                    gridTemplateRows: `repeat(${rightComparisonGridSize}, ${rightComparisonTileSizePx}px)`,
                    gap: "1px",
                  }}
                >
                  {comparisonState.right.grid.flatMap((row, y) =>
                    row.map((cell, x) => {
                      const isAgent = comparisonState.right.agent.x === x && comparisonState.right.agent.y === y;
                      const isGoal = comparisonState.right.goal.x === x && comparisonState.right.goal.y === y;
                      const tileType = isGoal ? "goal" : isAgent ? "empty" : cell.type;
                      const value = showValues ? cell.qValue : cell.value;
                      const icon = isAgent ? "" : isGoal ? TILE_ICONS.goal : TILE_ICONS[cell.type];
                      const showValue =
                        showValues &&
                        !isAgent &&
                        tileType !== "obstacle" &&
                        tileType !== "portal";
                      const ariaLabel = isEnglish
                        ? `${tileLabels[cell.type]} at tile (${x + 1}, ${y + 1}), value ${numberFormatter.format(value)}${isAgent ? ", Rover" : ""}${isGoal ? ", Goal" : ""}`
                        : `${tileLabels[cell.type]} bei Feld (${x + 1}, ${y + 1}), Wert ${numberFormatter.format(value)}${isAgent ? ", Agent" : ""}${isGoal ? ", Ziel" : ""}`;
                      return (
                        <Tile
                          key={`right-${x}-${y}`}
                          x={x}
                          y={y}
                          type={tileType}
                          value={value}
                          showValues={showValue}
                          isAgent={isAgent}
                          isGoal={isGoal}
                          tileSize={rightComparisonTileSizePx}
                          ariaLabel={ariaLabel}
                          icon={icon}
                          visits={cell.visits}
                          showHeatmap={showHeatmap}
                          maxVisits={rightComparisonMaxVisits}
                          bestAction={showActions ? getBestActionDirection(comparisonState.right.grid, { x, y }, comparisonState.right.qTable) : undefined}
                          showActions={showActions}
                          onClick={mode === "comparison" ? handleComparisonTilePlacement : undefined}
                          onMouseDown={mode === "comparison" ? handleMouseDown : undefined}
                          onMouseEnter={
                            mode === "comparison"
                              ? () => {
                                  if (isDragging) {
                                    handleComparisonTilePlacement(x, y);
                                  }
                                }
                              : undefined
                          }
                          rewardAnimation={rightRewardAnimation && rightRewardAnimation.x === x && rightRewardAnimation.y === y ? rightRewardAnimation.type : null}
                        />
                      );
                    })
                  )}
                </div>
                <div
                  className="absolute pointer-events-none"
                  style={{
                    left: comparisonState.right.agent.x * rightComparisonTileSizePx,
                    top: comparisonState.right.agent.y * rightComparisonTileSizePx,
                    width: rightComparisonTileSizePx,
                    height: rightComparisonTileSizePx,
                    transition: "left 0.3s ease-out, top 0.3s ease-out",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize:
                      rightComparisonTileSizePx > 40
                        ? "2.5rem"
                        : rightComparisonTileSizePx > 32
                          ? "2rem"
                          : "1.5rem",
                    zIndex: 10,
                  }}
                  aria-hidden
                >
                  <span className="rr-rover" />
                </div>
              </div>
            </Card>
            <Card className="md:col-span-2 rounded-3xl border border-border bg-card/95 p-6 shadow-medium text-foreground backdrop-blur-sm">
              <div className="flex flex-col gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {translate("🔍 Move-Vergleich", "🔍 Move comparison")}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {moveComparisonMessage}
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <div className="grid grid-cols-[minmax(170px,1fr)_repeat(2,minmax(110px,1fr))] gap-x-3 gap-y-2 text-sm">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {translate("Metrik", "Metric")}
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-center">
                      {comparisonState.left.name}
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-center">
                      {comparisonState.right.name}
                    </span>
                    {moveComparisonRows.map((row) => {
                      const [leftClass, rightClass] = getLeadClasses(row.left, row.right, row.lowerIsBetter);
                      return (
                        <div className="contents" key={row.key}>
                          <span className="text-foreground">{row.label}</span>
                          <span className={cn("text-center tabular-nums", leftClass)}>
                            {formatMovesValue(row.left)}
                          </span>
                          <span className={cn("text-center tabular-nums", rightClass)}>
                            {formatMovesValue(row.right)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

        {levelSolvedDialog !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
            <Card className="relative w-full max-w-md border-primary/40 bg-card p-8 text-center shadow-sm">
              <div className="space-y-4">
                <h2 className="text-3xl font-black text-primary">
                  {translate("Level geschafft!", "Level solved!")}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {levelSolvedDialog >= 10
                    ? translate("Du hast alle Level gemeistert. Der Free Mode ist freigeschaltet!", "You mastered every level. Free Mode is unlocked!")
                    : translate(`Der Rover hat gelernt, das Ziel zuverlässig zu finden. Level ${levelSolvedDialog + 1} ist freigeschaltet.`, `The rover learned to find the goal reliably. Level ${levelSolvedDialog + 1} is unlocked.`)}
                </p>
                <div className="flex flex-wrap justify-center gap-3 pt-2">
                  {levelSolvedDialog < 10 && (
                    <Button
                      onClick={() => {
                        setLevelSolvedDialog(null);
                        setCelebration(null);
                        onNextLevel?.();
                      }}
                    >
                      {translate(`Weiter zu Level ${levelSolvedDialog + 1}`, `Continue to level ${levelSolvedDialog + 1}`)}
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setLevelSolvedDialog(null);
                      setCelebration(null);
                    }}
                  >
                    {translate("Hier bleiben", "Stay here")}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {celebration && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4">
            <Card className="relative w-full max-w-xl overflow-hidden border-primary/40 bg-card/95 p-8 text-center shadow-sm">
              <div className="absolute -top-10 -left-10 h-32 w-32 rounded-full bg-primary/30 blur-3xl" />
              <div className="absolute -bottom-12 -right-12 h-36 w-36 rounded-full bg-accent/30 blur-3xl" />
              <div className="relative space-y-4">
                <h2 className="text-3xl md:text-4xl font-black text-primary drop-shadow">
                  {translate("Glückwunsch!", "Congratulations!")}
                </h2>
                <p className="text-sm uppercase tracking-wide text-primary/80">
                  {translate("Mission", "Mission")} #{celebration.rank}
                </p>
                <h3 className="text-lg font-semibold text-foreground">
                  {celebration.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {translate(
                    `Du hast es in ${celebration.steps} Zügen mit einem Reward von ${numberFormatter.format(celebration.reward)} geschafft. Schau in der Bestenliste nach deinem Rang!`,
                    `Finished in ${celebration.steps} moves with a reward of ${numberFormatter.format(celebration.reward)}. Check the leaderboard to see your rank!`,
                  )}
                </p>
                <p className="text-sm text-primary font-semibold">
                  💡 {celebration.fact}
                </p>
                <div className="flex flex-wrap justify-center gap-3 pt-2">
                  <Badge variant="secondary" className="px-4 py-2 text-sm font-semibold">
                    #{celebration.rank}
                  </Badge>
                  <Badge variant="secondary" className="px-4 py-2 text-sm font-semibold">
                    {numberFormatter.format(celebration.reward)}
                  </Badge>
                </div>
                {!isAutoRestartEnabled && (
                  <div className="rounded-lg border border-primary/30 bg-primary/10 p-3 text-sm text-foreground">
                    <p>
                      {translate(
                        "Tipp: Mit Auto-Restart startet der Rover nach jedem Ziel von selbst neu – so lernt er ohne Klicken weiter.",
                        "Tip: With auto restart the rover starts over by itself after every goal, so it keeps learning without extra clicks.",
                      )}
                    </p>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="mt-2"
                      onClick={() => {
                        setIsAutoRestartEnabled(true);
                        setCelebration(null);
                        if (mode === "playground") setPlaygroundState((prev) => ({ ...prev, isRunning: true }));
                        else if (mode === "random") setRandomState((prev) => ({ ...prev, isRunning: true }));
                      }}
                    >
                      {translate("Auto-Restart einschalten", "Turn on auto restart")}
                    </Button>
                  </div>
                )}
                <Button className="mt-4" onClick={() => setCelebration(null)}>
                  {translate("Weiter geht's", "Keep exploring")}
                </Button>
              </div>
            </Card>
          </div>
        )}

        {randomHud}
        {mode === "playground" && (
          <Card className="rounded-3xl border border-border bg-card/95 p-6 shadow-medium text-foreground backdrop-blur-sm transition-colors duration-200 hover:border-primary/30">
            <button
              type="button"
              onClick={() => setShowPlaygroundStatsCard((prev) => !prev)}
              className="flex w-full items-center justify-between text-left text-sm font-semibold text-foreground"
            >
              <span>{translate("Playground-Statistik", "Playground Statistics")}</span>
              {showPlaygroundStatsCard ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {showPlaygroundStatsCard && (
              <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                {playgroundStatsSummary.count === 0 ? (
                  <p>{translate("Noch keine Daten – starte eine Episode, um Statistiken zu sehen.", "No data yet — run an episode to gather statistics.")}</p>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span>{translate("Gesamt-Episoden", "Total episodes")}</span>
                      <span className="font-semibold text-foreground">{playgroundStatsSummary.count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{translate("Ø Schritte", "Avg. steps")}</span>
                      <span className="font-semibold text-foreground">{formatStepsValue(playgroundStatsSummary.avgSteps)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{translate("Ø Reward", "Avg. reward")}</span>
                      <span className="font-semibold text-foreground">{formatRewardValue(playgroundStatsSummary.avgReward)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{translate("Bester Reward", "Best reward")}</span>
                      <span className="font-semibold text-foreground">{formatRewardValue(playgroundStatsSummary.bestReward)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{translate("Schnellste Episode", "Fastest episode")}</span>
                      <span className="font-semibold text-foreground">{formatStepsValue(playgroundStatsSummary.bestSteps)}</span>
                    </div>
                  </>
                )}
              </div>
            )}
          </Card>
        )}

        <div className="relative" ref={layoutRef}>
          <div
            className={cn("flex flex-col gap-6 lg:grid lg:items-stretch transition-opacity", gridCols)}
            aria-disabled={mode === "comparison"}
          >
          <div className="relative order-2 lg:order-1">
            <Card
              ref={consoleScrollRef}
              className={cn(
                "flex flex-col gap-4 rounded-3xl border border-border bg-card/95 p-6 shadow-medium text-foreground backdrop-blur-sm overflow-y-auto transition-all duration-200 hover:border-primary/30",
                "h-auto lg:min-h-[var(--console-height)]",
                mode === "comparison" && "pointer-events-none opacity-40 grayscale",
              )}
              style={{
                ["--console-height" as string]: `${cardHeight}px`,
              }}
            >
              <button
                onClick={() => setShowConsolePanel(!showConsolePanel)}
                className="flex items-center justify-between w-full text-left lg:pointer-events-none"
              >
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Gamepad2 className="h-6 w-6 text-primary" />
                  <span className="gradient-text">
                    {translate("Konsole", "Console")}
                  </span>
                </h2>
                <ChevronDown className={cn("h-5 w-5 transition-transform lg:hidden", showConsolePanel && "rotate-180")} />
              </button>
              {showConsolePanel && (
              <>
            {mode === "playground" && (
              <Badge variant="secondary" className="self-start bg-foreground/10 text-foreground border-foreground/15 font-semibold">
                👣 {playgroundState.currentSteps}
              </Badge>
            )}

            {mode === "playground" ? (
              <PlaygroundControls
                state={playgroundState}
                onStart={handlePlaygroundStart}
                onPause={handlePlaygroundPause}
                onStep={handlePlaygroundStep}
                onReset={handlePlaygroundReset}
                onUndo={handleUndo}
                canUndo={undoStack.length > 0}
                onReplay={handleReplayBest}
                isReplaying={isReplaying}
                onStopReplay={handleStopReplay}
                placementMode={placementMode}
                onPlacementModeChange={changePlacementMode}
                simulationSpeed={simulationSpeed}
                onSimulationSpeedChange={setSimulationSpeed}
                canPublishGlobal={isAdmin}
                onPublishGlobal={handlePublishGlobal}
                showValues={showValues}
                onShowValuesChange={setShowValues}
                translate={translate}
                numberFormatter={numberFormatter}
                language={language}
                showStatistics={showStatistics}
                setShowStatistics={setShowStatistics}
                levelMode={levelMode}
                unlockedFeatures={unlockedFeatures}
              />
            ) : (
              <RandomControls
                state={randomState}
                onStart={handleRandomStart}
                onPause={handleRandomPause}
                onStep={handleRandomStep}
                onReset={handleRandomReset}
                translate={translate}
                numberFormatter={numberFormatter}
                isSpeedrun={randomState.speedrun.active}
              />
            )}

            {/* Verlaufsdiagramm (im Playground sitzt es in der Statistik-Kachel) */}
            {mode !== "playground" && randomState.episodeHistory.length > 0 && (
              <Collapsible open={showRewardHistory} onOpenChange={setShowRewardHistory}>
                <Card className="rounded-lg border border-border/40 bg-card/50 p-4">
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between cursor-pointer">
                      <h3 className="text-base font-bold text-foreground">
                        {translate("Reward-Verlauf", "Reward History")}
                      </h3>
                      {showRewardHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                    <div className="mt-3">
                      <RewardHistoryChart history={randomState.episodeHistory} translate={translate} />
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            )}

            {mode === "random" && (
              <Card className="rounded-lg border border-border/40 bg-card/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-foreground">
                    {translate("⚡ Live-Challenge", "⚡ Live challenge")}
                  </h3>
                  <Badge variant="outline" className="text-sm font-semibold">
                    {translate("wechsel alle 10s", "rotates every 10s")}
                  </Badge>
                </div>
                {bonusDetail ? (
                  <>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {bonusDetail.actionHint[language]}
                    </p>
                    <Button
                      variant={bonusButtonVariant}
                      size="sm"
                      disabled={bonusDisabled}
                      onClick={handleActiveBonusClick}
                      className="flex w-full items-center justify-center gap-2 text-base font-semibold"
                    >
                      <span aria-hidden>{bonusDetail.icon}</span>
                      <span>{bonusDetail.label[language]}</span>
                    </Button>
                    <p className="text-sm text-muted-foreground text-center">
                      {translate("Nächste Belohnung in", "Next bonus in")}
                      {" "}
                      {randomState.bonusCountdown}s
                    </p>
                    {!randomState.bonusReady && (
                      <p className="text-sm text-muted-foreground tracking-wide uppercase text-center">
                        {translate("Belohnung verbraucht – neue Belohnung erscheint gleich.", "Reward spent – new reward arrives soon.")}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {translate("Belohnung wird vorbereitet...", "Preparing next bonus...")}
                  </p>
                )}
              </Card>
            )}

            <Card className="rounded-lg border border-border/40 bg-secondary/20 p-4 space-y-3">
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setShowLeaderboard(!showLeaderboard)}
              >
                <h3 className="text-base font-bold text-foreground">
                  {leaderboardTitle}
                </h3>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-foreground/10 text-foreground border-foreground/15 font-semibold">
                    {activeLeaderboardEntries.length}
                  </Badge>
                  {showLeaderboard ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </div>
              {showLeaderboard && (activeLeaderboardEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {leaderboardEmptyText}
                </p>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {activeLeaderboardEntries.map((entry, index) => {
                    const detailText = entry.mode === "speedrun"
                      ? translate(
                          `${entry.steps} Züge • ${numberFormatter.format(entry.reward)} Punkte • ${entry.timeUsed ?? entry.timeLimit ?? 0}s`,
                          `${entry.steps} moves • ${numberFormatter.format(entry.reward)} reward • ${entry.timeUsed ?? entry.timeLimit ?? 0}s`,
                        )
                      : translate(
                          `${entry.steps} Züge • ${numberFormatter.format(entry.reward)} Punkte`,
                          `${entry.steps} moves • ${numberFormatter.format(entry.reward)} reward`,
                        );
                    return (
                      <div
                        key={`leaderboard-left-${entry.episode}-${entry.steps}-${entry.mode}`}
                        className="flex items-center justify-between rounded-xl border border-border/40 bg-background/60 px-3 py-2 text-sm"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-base font-bold text-primary min-w-[1.5rem] text-center">
                            #{index + 1}
                          </span>
                          <div className="flex flex-col gap-1">
                            <span className="font-semibold">{getEpisodeTitle(entry.episode, language)}</span>
                            <span className="text-sm text-muted-foreground">
                              {detailText}
                            </span>
                            {!entry.success && (
                              <span className="text-xs uppercase tracking-wide text-red-400">
                                {translate("Fehlversuch", "Failed attempt")}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {entry.mode === "speedrun" && (
                            <Badge variant="outline" className="px-3 py-1 text-xs font-semibold">
                              ⏱ {entry.timeUsed ?? entry.timeLimit ?? 0}s
                            </Badge>
                          )}
                          {entry.mode === "speedrun" && (
                            <Badge variant="outline" className="px-3 py-1 text-xs font-semibold">
                              {translate("Stufe", "Stage")} {(entry.stage ?? 0) + 1}
                            </Badge>
                          )}
                          <Badge
                            variant="secondary"
                            className={cn(
                              "px-4 py-2 text-sm font-semibold",
                              entry.reward >= 0 && entry.success ? "bg-green-500/10 text-green-400" : entry.success ? "bg-foreground/10 text-foreground" : "bg-red-500/10 text-red-400",
                            )}
                          >
                            {numberFormatter.format(entry.reward)}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </Card>
              </>
              )}

          </Card>
          <ScrollIndicator containerRef={consoleScrollRef} />
          </div>

          <div className="order-1 lg:order-2 w-full overflow-x-hidden">
          <Card
            style={{ height: `${cardHeight}px` }}
            className={cn(
              "flex flex-col rounded-3xl border border-border bg-card/95 p-6 shadow-medium text-foreground backdrop-blur-sm w-full lg:w-fit mx-auto overflow-y-auto transition-colors duration-200 hover:border-primary/30",
              mode === "comparison" && "pointer-events-none opacity-40 grayscale",
            )}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold gradient-text">
                {translate("🎮 Playground", "🎮 Playground")}
              </h2>
            </div>

            <div
              ref={gridRef}
              data-tutorial="board"
              tabIndex={0}
              role="application"
              aria-label={translate("Reward Rover Spielfeld", "Reward Rover playfield")}
              className="rounded-2xl border border-border/50 bg-background/80 p-4 shadow-soft focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow w-full max-w-full mx-auto"
              style={{
                maxWidth: gridPixelDimension + 40,
                aspectRatio: "1 / 1",
              }}
              onMouseDown={() => gridRef.current?.focus()}
            >
              <div className="relative">
                <div className="grid" style={{ ...gridStyle, gap: TILE_GAP }}>
                {(() => {
                  // Berechne maxVisits für Heatmap
                  const maxVisits = showHeatmap
                    ? Math.max(...activeGrid.flat().map(cell => cell.visits), 1)
                    : 1;

                  return activeGrid.map((row, y) =>
                  row.map((cell, x) => {
                    const isAgent =
                      mode === "playground"
                        ? playgroundState.agent.x === x && playgroundState.agent.y === y
                        : randomState.agent.x === x && randomState.agent.y === y;
                    const isGoal =
                      mode === "playground"
                        ? playgroundState.goal.x === x && playgroundState.goal.y === y
                        : randomState.goals.some((goal) => goal.x === x && goal.y === y);
                    const tileType = isGoal ? "goal" : (isAgent ? "empty" : cell.type);
                    const icon = isAgent ? "" : isGoal ? "🎯" : TILE_ICONS[cell.type];
                    const value = showValues ? cell.qValue : cell.value;
                    const showValue =
                      showValues &&
                      !isAgent &&
                      tileType !== "obstacle" &&
                      tileType !== "portal";
                    const ariaLabel = isEnglish
                      ? `${tileLabels[cell.type]} at tile (${x + 1}, ${y + 1}), value ${numberFormatter.format(value)}${isAgent ? ", Rover" : ""}${isGoal ? ", Goal" : ""}`
                      : `${tileLabels[cell.type]} bei Feld (${x + 1}, ${y + 1}), Wert ${numberFormatter.format(value)}${isAgent ? ", Agent" : ""}${isGoal ? ", Ziel" : ""}`;
                    return (
                      <Tile
                        key={`${x}-${y}`}
                        x={x}
                        y={y}
                        type={tileType}
                        value={value}
                        showValues={showValue}
                        isAgent={isAgent}
                        isGoal={isGoal}
                        tileSize={tileSizePx}
                        ariaLabel={ariaLabel}
                        icon={icon}
                        visits={cell.visits}
                        showHeatmap={showHeatmap}
                        maxVisits={maxVisits}
                        bestAction={showActions ? getBestActionDirection(activeGrid, { x, y }, activeQTable) : undefined}
                        showActions={showActions}
                        onClick={mode === "playground" || (mode === "random" && challengeMode) ? handleTilePlacement : undefined}
                        onMouseDown={mode === "playground" || (mode === "random" && challengeMode) ? handleMouseDown : undefined}
                        onMouseEnter={(mode === "playground" || (mode === "random" && challengeMode)) && isDragging ? () => handleTilePlacement(x, y) : undefined}
                        rewardAnimation={rewardAnimation && rewardAnimation.x === x && rewardAnimation.y === y ? rewardAnimation.type : null}
                      />
                    );
                  })
                );
                })()}
              </div>
              {/* Animated Rover */}
              <div
                className="absolute pointer-events-none"
                style={{
                  left: (mode === "playground" ? playgroundState.agent.x : randomState.agent.x) * (tileSizePx + TILE_GAP),
                  top: (mode === "playground" ? playgroundState.agent.y : randomState.agent.y) * (tileSizePx + TILE_GAP),
                  width: tileSizePx,
                  height: tileSizePx,
                  transition: "left 0.3s ease-out, top 0.3s ease-out",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: tileSizePx > 40 ? "2.5rem" : tileSizePx > 32 ? "2rem" : "1.5rem",
                  zIndex: 10,
                }}
                aria-hidden
              >
                <span className="rr-rover" />
              </div>
              {mode === "playground" && goalFlash && (
                <div
                  key={goalFlash.key}
                  className="absolute pointer-events-none flex items-center justify-center"
                  style={{
                    left: goalFlash.x * (tileSizePx + TILE_GAP),
                    top: goalFlash.y * (tileSizePx + TILE_GAP),
                    width: tileSizePx,
                    height: tileSizePx,
                    zIndex: 11,
                  }}
                  aria-hidden
                >
                  <span className="absolute inset-0 rounded-lg bg-primary/50 animate-ping" />
                  <span className="rr-rover" />
                </div>
              )}
            </div>
            </div>

            {mode === "playground" && !levelMode && (
              <div className="mt-4 space-y-4 hidden lg:block">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">
                    {translate("Umgebung speichern", "Save environment")}
                  </Label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      value={environmentName}
                      onChange={(event) => setEnvironmentName(event.target.value)}
                      placeholder={translate("Name eingeben…", "Enter name…")}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleSaveEnvironment}
                      disabled={isSavingEnv}
                      variant="secondary"
                      className="font-semibold"
                    >
                      {isSavingEnv ? translate("Speichert…", "Saving…") : translate("Speichern", "Save")}
                    </Button>
                  </div>
                  {saveEnvError && <p className="text-xs text-red-500">{saveEnvError}</p>}
                  {!authUser && (
                    <p className="text-xs text-muted-foreground">
                      {translate(
                        "Zum Speichern bitte einloggen.",
                        "Please log in to save environments.",
                      )}
                    </p>
                  )}
                </div>

              </div>
            )}
          </Card>

          {/* Mobile Play Button - Only visible on mobile devices */}
          <div className="lg:hidden mt-4 mx-auto w-full max-w-md px-4">
            {mode === "playground" ? (
              <Button
                data-tutorial="start"
                className="w-full font-semibold shadow-lg"
                size="lg"
                onClick={playgroundState.isRunning ? handlePlaygroundPause : handlePlaygroundStart}
              >
                {playgroundState.isRunning ? <Pause className="mr-2 h-5 w-5" /> : <Play className="mr-2 h-5 w-5" />}
                {playgroundState.isRunning ? translate("Pause", "Pause") : translate("Start", "Start")}
              </Button>
            ) : (
              <Button
                className="w-full font-semibold shadow-lg"
                size="lg"
                onClick={randomState.isRunning ? handleRandomPause : handleRandomStart}
              >
                {randomState.isRunning ? <Pause className="mr-2 h-5 w-5" /> : <Play className="mr-2 h-5 w-5" />}
                {randomState.isRunning ? translate("Pause", "Pause") : translate("Start", "Start")}
              </Button>
            )}
          </div>
          </div>

          <div className="relative order-3 lg:order-3">
            <Card
              ref={settingsScrollRef}
              className={cn(
                "flex flex-col gap-4 rounded-3xl border border-border bg-card/95 p-6 shadow-medium text-foreground backdrop-blur-sm overflow-y-auto transition-all duration-200 hover:border-primary/30",
                "h-auto lg:min-h-[var(--settings-height)]"
              )}
              style={{
                ["--settings-height" as string]: `${cardHeight}px`,
              }}
            >
              <button
                onClick={() => setShowSettingsPanel(!showSettingsPanel)}
                className="flex items-center justify-between w-full text-left lg:pointer-events-none"
              >
                <h2 className="text-xl font-bold gradient-text">
                  {translate("Einstellungen", "Settings")}
                </h2>
                <ChevronDown className={cn("h-5 w-5 transition-transform lg:hidden", showSettingsPanel && "rotate-180")} />
              </button>

            {showSettingsPanel && (
            <>
            <Card className="rounded-lg border border-border/40 bg-secondary/20 p-4 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <h3 className="text-lg font-bold text-foreground">
                  {translate("Q-Werte & Exploration", "Q-Values & Exploration")}
                </h3>
                <div className="flex flex-col items-end gap-3">
                  <div className="space-y-1">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <Label htmlFor="show-actions-settings" className="text-xs font-semibold leading-tight">
                          {translate("Policy-Pfeile anzeigen", "Show policy arrows")}
                        </Label>
                        <button
                          onClick={() => setShowActionsInfo(!showActionsInfo)}
                          className="text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                          aria-label="Toggle info"
                        >
                          <Info className="h-3 w-3" />
                        </button>
                      </div>
                      <Switch
                        id="show-actions-settings"
                        checked={showActions}
                        onCheckedChange={setShowActions}
                        aria-label={translate("Policy-Pfeile umschalten", "Toggle policy arrows")}
                      />
                    </div>
                    {showActionsInfo && (
                      <p className="text-xs text-muted-foreground leading-relaxed pl-1 animate-in fade-in duration-200">
                        {translate(
                          "Zeigt Pfeile, die die bevorzugte Bewegungsrichtung des Rovers für jedes Feld anzeigen.",
                          "Shows arrows indicating the rover's preferred direction for each tile.",
                        )}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <Label htmlFor="show-values-settings" className="text-xs font-semibold leading-tight">
                          {translate("Q-Werte anzeigen", "Show Q-values")}
                        </Label>
                        <button
                          onClick={() => setShowQValuesInfo(!showQValuesInfo)}
                          className="text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                          aria-label="Toggle info"
                        >
                          <Info className="h-3 w-3" />
                        </button>
                      </div>
                      <Switch
                        id="show-values-settings"
                        checked={showValues}
                        onCheckedChange={setShowValues}
                        aria-label={translate("Q-Werte umschalten", "Toggle Q-values")}
                      />
                    </div>
                    {showQValuesInfo && (
                      <p className="text-xs text-muted-foreground leading-relaxed pl-1 animate-in fade-in duration-200">
                        {translate(
                          "Blendet die gelernten Werte direkt auf den Feldern ein.",
                          "Overlays the learned Q-values directly on the grid.",
                        )}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <Label htmlFor="show-heatmap-settings" className="text-xs font-semibold leading-tight">
                          {translate("Heatmap anzeigen", "Show heatmap")}
                        </Label>
                        <button
                          onClick={() => setShowHeatmapInfo(!showHeatmapInfo)}
                          className="text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                          aria-label="Toggle info"
                        >
                          <Info className="h-3 w-3" />
                        </button>
                      </div>
                      <Switch
                        id="show-heatmap-settings"
                        checked={showHeatmap}
                        onCheckedChange={setShowHeatmap}
                        aria-label={translate("Heatmap umschalten", "Toggle heatmap")}
                      />
                    </div>
                    {showHeatmapInfo && (
                      <p className="text-xs text-muted-foreground leading-relaxed pl-1 animate-in fade-in duration-200">
                        {translate(
                          "Färbt Felder basierend auf Besuchshäufigkeit ein.",
                          "Colors tiles based on visit frequency.",
                        )}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <Label htmlFor="consume-rewards-settings" className="text-xs font-semibold leading-tight">
                          {translate("Belohnungen verschwinden", "Consume rewards")}
                        </Label>
                        <button
                          onClick={() => setShowConsumeRewardsInfo(!showConsumeRewardsInfo)}
                          className="text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                          aria-label="Toggle info"
                        >
                          <Info className="h-3 w-3" />
                        </button>
                      </div>
                      <Switch
                        id="consume-rewards-settings"
                        checked={consumeRewards}
                        disabled={levelMode}
                        onCheckedChange={setConsumeRewards}
                        aria-label={translate("Belohnungen/Strafen verschwinden umschalten", "Toggle consume rewards")}
                      />
                    </div>
                    {showConsumeRewardsInfo && (
                      <p className="text-xs text-muted-foreground leading-relaxed pl-1 animate-in fade-in duration-200">
                        {levelMode
                          ? translate(
                              "In Levels bleiben Belohnungen und Strafen liegen. Jeder weitere Treffer im selben Durchlauf zählt nur halb so viel – so kann der Rover sie nicht endlos abgrasen.",
                              "In levels rewards and penalties stay on the board. Every repeat hit in the same episode pays half as much, so the rover can't farm them forever.",
                            )
                          : translate(
                              "Belohnungen und Strafen verschwinden nach dem Einsammeln.",
                              "Rewards and penalties disappear after collection.",
                            )}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                      <Label htmlFor="auto-restart-settings" className="text-xs font-semibold leading-tight">
                        {translate("Auto-Restart bei Ziel", "Auto-restart at goal")}
                      </Label>
                      <Switch
                        id="auto-restart-settings"
                        checked={isAutoRestartEnabled}
                        onCheckedChange={setIsAutoRestartEnabled}
                        aria-label={translate("Auto-Restart umschalten", "Toggle auto-restart")}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <Card data-tutorial="gridsize" className="rounded-lg border border-border/40 bg-secondary/20 p-4">
              <h3 className="text-lg font-bold text-foreground mb-1">
                {translate("📏 Feld-Größe", "📏 Grid size")}
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                {translate(
                  "Legt fest, wie viele Felder das Spielfeld besitzt.",
                  "Controls how many tiles the grid contains.",
                )}
              </p>
              <div className="flex flex-col gap-2">
                {(Object.keys(TILE_SIZE_MAP) as TileSizeOption[]).map((sizeKey) => (
                  <Button
                    key={sizeKey}
                    variant={tileSize === sizeKey ? "default" : "outline"}
                    onClick={() => handleTileSizeChange(sizeKey)}
                    disabled={
                      levelMode &&
                      (!unlockedFeatures?.canChangeGridSize || (sizeKey === "l" && !unlockedFeatures?.canUseLargeGrid))
                    }
                    className="rounded-lg text-base font-semibold w-full justify-between px-4"
                  >
                    <span>{sizeLabels[sizeKey]}</span>
                    <span className="text-sm opacity-70">
                      {TILE_SIZE_MAP[sizeKey]}×{TILE_SIZE_MAP[sizeKey]}
                    </span>
                  </Button>
                ))}
              </div>
              {levelMode && !unlockedFeatures?.canChangeGridSize && (
                <p className="text-xs text-muted-foreground italic mt-3">
                  🔒 {translate("Schalte Level 5 frei, um das Feld auf Mittel zu stellen.", "Reach level 5 to switch to the medium board.")}
                </p>
              )}
              {levelMode && unlockedFeatures?.canChangeGridSize && !unlockedFeatures?.canUseLargeGrid && (
                <p className="text-xs text-muted-foreground italic mt-3">
                  🔒 {translate("Schalte Level 7 frei, um das große Feld zu nutzen.", "Reach level 7 to use the large board.")}
                </p>
              )}
            </Card>

            {/* Saved environments are Free Mode only: loading one in a level would replace the level world. */}
            {!levelMode && (
              <Card className="rounded-lg border border-border/40 bg-secondary/20 p-4 space-y-3 hidden lg:block">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-foreground">
                    {translate("Meine Umgebungen", "My environments")}
                  </h3>
                  {authUser && (
                    <Badge variant="secondary" className="bg-foreground/10 text-foreground border-foreground/15">
                      {savedEnvironments.length}
                    </Badge>
                  )}
                </div>
                {isLoadingEnvs ? (
                  <p className="text-xs text-muted-foreground">
                    {translate("Umgebungen werden geladen…", "Loading environments…")}
                  </p>
                ) : !authUser ? (
                  <p className="text-xs text-muted-foreground">
                    {translate(
                      "Zum Anzeigen deiner Umgebungen bitte einloggen.",
                      "Log in to see your environments.",
                    )}
                  </p>
                ) : savedEnvironments.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {translate(
                      "Noch keine gespeicherten Umgebungen.",
                      "No saved environments yet.",
                    )}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {savedEnvironments.map((env) => (
                      <div
                        key={env.id}
                        className="flex items-center gap-3 rounded-xl border border-border/40 bg-background/60 p-3"
                      >
                        {renderEnvironmentPreview(env.gridConfig)}
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-foreground">{env.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {env.gridConfig.size} × {env.gridConfig.size}
                          </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => handleLoadSavedEnvironment(env)}>
                          {translate("Laden", "Load")}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {mode === "playground" && !levelMode && (
              <Card className="rounded-lg border border-border/40 bg-secondary/20 p-4 space-y-3">
                <h3 className="text-lg font-bold text-foreground">
                  {translate("Welt bearbeiten", "Edit world")}
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={settingGoal ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSettingGoal(!settingGoal)}
                    className="text-xs font-semibold h-auto py-2"
                  >
                    {settingGoal ? translate("Abbrechen", "Cancel") : translate("🎯 Ziel versetzen", "🎯 Move goal")}
                  </Button>
                  <Button
                    variant={confirmClear ? "destructive" : "outline"}
                    size="sm"
                    onClick={() => {
                      if (confirmClear) {
                        handleClearEnvironment();
                      } else {
                        setConfirmClear(true);
                        window.setTimeout(() => setConfirmClear(false), 3000);
                      }
                    }}
                    className="text-xs font-semibold h-auto py-2"
                  >
                    {confirmClear ? translate("Wirklich leeren?", "Really clear?") : translate("🗑 Umgebung leeren", "🗑 Clear world")}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {settingGoal
                    ? translate("Klicke jetzt auf ein Feld im Spielfeld, dort steht dann das Ziel.", "Now click a tile on the board to put the goal there.")
                    : translate(
                        "Ziel versetzen oder alles leeren. Beides setzt das Gelernte zurück.",
                        "Move the goal or wipe the board. Both reset what the rover has learned.",
                      )}
                </p>
              </Card>
            )}

            {mode === "playground" && !levelMode && (
              <Card className="rounded-lg border border-border/40 bg-secondary/20 p-4 space-y-3">
                <h3 className="text-lg font-bold text-foreground">
                  {translate("Preset-Levels", "Preset levels")}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {translate(
                    "Fertige Welten zum Ausprobieren – ersetzt das aktuelle Feld.",
                    "Ready-made worlds to try out – replaces the current grid.",
                  )}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {PRESET_LEVELS.map((preset) => (
                    <TooltipProvider key={preset.key}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleLoadPreset(preset)}
                            className="text-xs font-semibold h-auto py-2"
                          >
                            {preset.name[language]}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">{preset.description[language]}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                </div>
              </Card>
            )}

            {mode === "random" && (
              <>
                <Card className="rounded-lg border border-border/40 bg-card/50 p-4 space-y-3">
                  <h3 className="text-base font-bold text-foreground">
                    {translate("🎲 Zufallsmodus-Einstellungen", "🎲 Random mode settings")}
                  </h3>
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 w-fit">
                    {levelName}
                  </Badge>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {translate(
                      "Wähle den Schwierigkeitsgrad und platziere Herausforderungen live im Feld.",
                      "Pick the difficulty and drop live challenges onto the grid.",
                    )}
                  </p>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      {translate("Level wählen", "Select level")}
                    </Label>
                    <div className="flex flex-col gap-2">
                      {Object.values(LEVELS).map((level) => {
                        const name = isEnglish ? level.nameEn : level.name;
                        const description = isEnglish ? level.descriptionEn : level.description;
                        return (
                          <Button
                            key={level.key}
                            variant={levelKey === level.key ? "default" : "outline"}
                            onClick={() => handleLevelChange(level.key)}
                            disabled={speedrunEnabled}
                            className="w-full justify-start text-left h-auto py-3 px-4 whitespace-normal"
                          >
                            <div className="flex flex-col items-start gap-1">
                              <span className="font-semibold text-sm">{name}</span>
                              <span className="text-sm opacity-80 font-normal leading-snug text-left break-words">
                                {description}
                              </span>
                            </div>
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                </Card>

              </>
            )}

            {mode === "random" && (
              <Card className="rounded-lg border border-border/40 bg-card/50 p-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  💡 <strong className="text-foreground">Level:</strong>{" "}
                  {translate(
                    "Höhere Level vergrößern das Feld und erhöhen die Dichte von Hindernissen, Belohnungen und Strafen – eine echte Herausforderung!",
                    "Higher levels expand the grid and increase the density of walls, rewards, and penalties – a serious challenge!",
                  )}
                </p>
              </Card>
            )}
            </>
            )}

          </Card>
          <ScrollIndicator containerRef={settingsScrollRef} />
          </div>
        </div>
          {mode === "comparison" && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-4">
              <div className="max-w-xl rounded-3xl border border-dashed border-border/70 bg-background/90 px-6 py-4 text-center text-sm font-semibold text-muted-foreground shadow-inner">
                {translate(
                  "Vergleichsmodus aktiv: Platzierungen wirken auf beide Spielfelder.",
                  "Comparison mode active: placements sync across both boards.",
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
