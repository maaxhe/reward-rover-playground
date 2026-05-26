import React, { createContext, useContext, ReactNode } from "react";
import type { LevelNumber } from "@/lib/levelProgression";

interface LevelContextType {
  levelMode: boolean;
  currentLevel: LevelNumber;
  /** Called when the rover solves the current level (reaches the goal). */
  onLevelSolved?: () => void;
}

const defaultValue: LevelContextType = {
  levelMode: false,
  currentLevel: 1,
  onLevelSolved: undefined,
};

const LevelContext = createContext<LevelContextType>(defaultValue);

interface LevelProviderProps {
  children: ReactNode;
  levelMode: boolean;
  currentLevel: LevelNumber;
  onLevelSolved?: () => void;
}

export function LevelProvider({ children, levelMode, currentLevel, onLevelSolved }: LevelProviderProps) {
  return (
    <LevelContext.Provider value={{ levelMode, currentLevel, onLevelSolved }}>
      {children}
    </LevelContext.Provider>
  );
}

export function useLevel() {
  return useContext(LevelContext);
}
