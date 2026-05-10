import { createContext, useContext, useState, type ReactNode } from "react";

type Language = "de" | "en";

type LanguageContextType = {
  language: Language;
  setLanguage: (language: Language) => void;
  isEnglish: boolean;
  translate: (de: string, en: string) => string;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>("de");
  const isEnglish = language === "en";
  const translate = (de: string, en: string) => (isEnglish ? en : de);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, isEnglish, translate }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
