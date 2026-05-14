import React, { createContext, useContext, ReactNode } from "react";
import type { LevelNumber } from "@/lib/levelProgression";

interface LevelContextType {
  levelMode: boolean;
  currentLevel: LevelNumber;
}

const defaultValue: LevelContextType = {
  levelMode: false,
  currentLevel: 1,
};

const LevelContext = createContext<LevelContextType>(defaultValue);

interface LevelProviderProps {
  children: ReactNode;
  levelMode: boolean;
  currentLevel: LevelNumber;
}

export function LevelProvider({ children, levelMode, currentLevel }: LevelProviderProps) {
  return (
    <LevelContext.Provider value={{ levelMode, currentLevel }}>
      {children}
    </LevelContext.Provider>
  );
}

export function useLevel() {
  return useContext(LevelContext);
}
