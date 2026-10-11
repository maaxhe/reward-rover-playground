import React, { createContext, useContext, ReactNode } from "react";
import type { LevelNumber } from "@/lib/levelProgression";

interface LevelContextType {
  levelMode: boolean;
  currentLevel: LevelNumber;
  /** Called when the rover solves the current level (reaches the goal). */
  onLevelSolved?: () => void;
  /** Jumps to the next level (only offered after the current one is solved). */
  onNextLevel?: () => void;
}

const defaultValue: LevelContextType = {
  levelMode: false,
  currentLevel: 1,
  onLevelSolved: undefined,
  onNextLevel: undefined,
};

const LevelContext = createContext<LevelContextType>(defaultValue);

interface LevelProviderProps {
  children: ReactNode;
  levelMode: boolean;
  currentLevel: LevelNumber;
  onLevelSolved?: () => void;
  onNextLevel?: () => void;
}

export function LevelProvider({ children, levelMode, currentLevel, onLevelSolved, onNextLevel }: LevelProviderProps) {
  return (
    <LevelContext.Provider value={{ levelMode, currentLevel, onLevelSolved, onNextLevel }}>
      {children}
    </LevelContext.Provider>
  );
}

export function useLevel() {
  return useContext(LevelContext);
}
