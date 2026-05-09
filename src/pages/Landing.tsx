import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Trophy, Zap, Globe, User, Lock } from "lucide-react";
import { toast } from "sonner";
import { LEVELS } from "@/components/RL/levelConfig";

const CHEAT_CODE = "blauwal";

function isFreeModeUnlocked() {
  return (
    parseInt(localStorage.getItem("rrp_level") || "1", 10) >= LEVELS.length ||
    localStorage.getItem("rrp_freemode") === "1"
  );
}

export function Landing() {
  const navigate = useNavigate();
  const unlockedLevel = parseInt(localStorage.getItem("rrp_level") || "1", 10);
  const episodesEver = parseInt(localStorage.getItem("rrp_episodes") || "0", 10);
  const levelDef = LEVELS[Math.min(unlockedLevel - 1, LEVELS.length - 1)];

  const [freeModeUnlocked, setFreeModeUnlocked] = useState(isFreeModeUnlocked);
  const cheatBuffer = useRef("");

  useEffect(() => {
    if (freeModeUnlocked) return;

    const handleKey = (e: KeyboardEvent) => {
      // Only track printable single characters
      if (e.key.length !== 1) return;
      cheatBuffer.current = (cheatBuffer.current + e.key.toLowerCase()).slice(
        -CHEAT_CODE.length
      );
      if (cheatBuffer.current === CHEAT_CODE) {
        localStorage.setItem("rrp_freemode", "1");
        setFreeModeUnlocked(true);
        toast.success("🐋 Blauwal-Code aktiviert!", {
          description: "Free Mode ist jetzt freigeschaltet.",
          duration: 5000,
        });
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [freeModeUnlocked]);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--gradient-main)" }}
    >
      {/* Top bar */}
      <header className="flex justify-end gap-1 p-4">
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors">
          <Globe className="w-4 h-4" />
          DE
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors">
          <User className="w-4 h-4" />
          Login
        </button>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-center gap-10 px-6 pb-12">
        {/* Hero */}
        <div className="text-center space-y-3">
          <div className="text-7xl select-none">🤖</div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Reward Rover
          </h1>
          <p className="text-muted-foreground text-lg">
            Entdecke wie KI durch Belohnung lernt
          </p>
        </div>

        {/* Mode buttons */}
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-lg">
          {/* Level Mode */}
          <button
            onClick={() => navigate("/level")}
            className="flex-1 flex flex-col items-center gap-4 p-8 rounded-2xl border-2 border-primary/40 bg-primary/5 hover:bg-primary/15 hover:border-primary transition-all group cursor-pointer"
          >
            <Trophy className="w-9 h-9 text-primary group-hover:scale-110 transition-transform" />
            <div className="text-center">
              <div className="text-xl font-bold">Level Mode</div>
              <div className="text-sm text-muted-foreground mt-1">
                Schalte Features frei
              </div>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <Badge className="bg-primary/80 text-primary-foreground px-3">
                {levelDef.emoji} Level {unlockedLevel} / 8
              </Badge>
              {episodesEver > 0 ? (
                <span className="text-xs text-muted-foreground">
                  {episodesEver} Episode{episodesEver !== 1 ? "n" : ""} gespielt
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">Neu starten</span>
              )}
            </div>
          </button>

          {/* Free Mode — locked or unlocked */}
          {freeModeUnlocked ? (
            <button
              onClick={() => navigate("/free")}
              className="flex-1 flex flex-col items-center gap-4 p-8 rounded-2xl border-2 border-border hover:border-accent/50 hover:bg-accent/5 transition-all group cursor-pointer"
            >
              <Zap className="w-9 h-9 group-hover:scale-110 transition-transform" />
              <div className="text-center">
                <div className="text-xl font-bold">Free Mode</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Alle Features frei
                </div>
              </div>
              <Badge variant="secondary" className="px-3">
                Keine Einschränkungen
              </Badge>
            </button>
          ) : (
            <div className="flex-1 flex flex-col items-center gap-4 p-8 rounded-2xl border-2 border-border/30 bg-white/[0.02] cursor-not-allowed opacity-50 select-none">
              <div className="relative">
                <Zap className="w-9 h-9 text-muted-foreground/50" />
                <Lock className="w-4 h-4 absolute -bottom-1 -right-1 text-muted-foreground/70" />
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-muted-foreground">
                  Free Mode
                </div>
                <div className="text-sm text-muted-foreground/60 mt-1">
                  Alle Features frei
                </div>
              </div>
              <div className="flex flex-col items-center gap-1">
                <Badge variant="outline" className="px-3 text-muted-foreground/60 border-muted-foreground/20">
                  Gesperrt
                </Badge>
                <span className="text-xs text-muted-foreground/40 text-center mt-1">
                  Alle 8 Level abschließen
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Level progress strip */}
        {unlockedLevel > 1 && (
          <div className="w-full max-w-lg">
            <p className="text-xs text-muted-foreground text-center mb-2">
              Dein Fortschritt
            </p>
            <div className="flex gap-1 justify-center">
              {LEVELS.map((l) => (
                <div
                  key={l.level}
                  title={`Level ${l.level} – ${l.name}`}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all
                    ${
                      l.level < unlockedLevel
                        ? "bg-primary/30 text-primary"
                        : l.level === unlockedLevel
                        ? "bg-primary/60 text-primary-foreground ring-2 ring-primary"
                        : "bg-white/5 text-muted-foreground/30"
                    }`}
                >
                  {l.level <= unlockedLevel ? l.emoji : "🔒"}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
