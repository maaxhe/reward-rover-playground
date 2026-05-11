import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { LEVELS } from "./levelConfig";
import { api } from "@/lib/api";
import { RLGame } from "./RLGame";

function syncProgress(level: number, episodes: number) {
  const token = localStorage.getItem("rrp_token");
  if (!token) return;
  api
    .updateProgress(token, {
      level,
      episodes,
      freemode_unlocked: localStorage.getItem("rrp_freemode") === "1" ? 1 : 0,
    })
    .catch(() => {});
}

export function RLGameLevel() {
  const navigate = useNavigate();

  const [unlockedLevel, setUnlockedLevel] = useState(() =>
    parseInt(localStorage.getItem("rrp_level") || "1", 10)
  );
  const [episodesEver, setEpisodesEver] = useState(() =>
    parseInt(localStorage.getItem("rrp_episodes") || "0", 10)
  );
  const prevEpisodesRef = useRef(episodesEver);

  const levelDef = LEVELS[Math.min(unlockedLevel - 1, LEVELS.length - 1)];

  const handleEpisodeCompleted = () => {
    setEpisodesEver((prev) => {
      const next = prev + 1;
      localStorage.setItem("rrp_episodes", String(next));
      syncProgress(unlockedLevel, next);
      return next;
    });
  };

  useEffect(() => {
    if (episodesEver === prevEpisodesRef.current) return;
    prevEpisodesRef.current = episodesEver;
    if (unlockedLevel >= LEVELS.length) return;
    const currentDef = LEVELS[unlockedLevel - 1];
    if (episodesEver >= currentDef.unlockAt) {
      const newLevel = unlockedLevel + 1;
      const newDef = LEVELS[newLevel - 1];
      setUnlockedLevel(newLevel);
      localStorage.setItem("rrp_level", String(newLevel));
      syncProgress(newLevel, episodesEver);
      toast.success(`🎉 Level ${newLevel} freigeschaltet!`, {
        description: `${newDef.emoji} ${newDef.name} – Neu: ${newDef.newFeature}`,
        duration: 6000,
      });
    }
  }, [episodesEver, unlockedLevel]);

  const prevThreshold = unlockedLevel > 1 ? LEVELS[unlockedLevel - 2].unlockAt : 0;
  const nextThreshold = levelDef.unlockAt;
  const isFinalLevel = nextThreshold === Infinity;
  const progressPercent = isFinalLevel
    ? 100
    : Math.min(
        100,
        ((episodesEver - prevThreshold) / (nextThreshold - prevThreshold)) * 100
      );
  const episodesToNext = isFinalLevel ? 0 : Math.max(0, nextThreshold - episodesEver);

  const nextDef = !isFinalLevel ? LEVELS[unlockedLevel] : null;

  return (
    <RLGame
      levelMode={{
        features: levelDef.features,
        levelNum: levelDef.level,
        levelName: levelDef.name,
        levelEmoji: levelDef.emoji,
        levelTagline: levelDef.tagline,
        isFinalLevel,
        episodesEver,
        nextThreshold,
        progressPercent,
        nextFeature: nextDef?.newFeature ?? null,
        nextFeatureEmoji: nextDef?.emoji ?? null,
        episodesToNext,
        onNavigateBack: () => navigate("/"),
        onEpisodeCompleted: handleEpisodeCompleted,
      }}
    />
  );
}
