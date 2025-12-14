import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { apiRequest } from "@/lib/queryClient";

type Language = {
  code: string;
  name: string;
  nativeName: string;
};

const LANGUAGES: Language[] = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "es", name: "Spanish", nativeName: "Español" },
  { code: "fr", name: "French", nativeName: "Français" },
  { code: "de", name: "German", nativeName: "Deutsch" },
  { code: "it", name: "Italian", nativeName: "Italiano" },
  { code: "pt", name: "Portuguese", nativeName: "Português" },
  { code: "zh", name: "Chinese", nativeName: "中文" },
  { code: "ja", name: "Japanese", nativeName: "日本語" },
  { code: "ko", name: "Korean", nativeName: "한국어" },
  { code: "ar", name: "Arabic", nativeName: "العربية" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी" },
  { code: "ru", name: "Russian", nativeName: "Русский" },
];

// Simple translation function (can be expanded with i18n library later)
const translations: Record<string, Record<string, string>> = {
  en: {
    "dashboard": "Dashboard",
    "tools": "Tools",
    "analytics": "Analytics",
    "settings": "Settings",
    "team": "Team",
    "welcome": "Welcome",
  },
  es: {
    "dashboard": "Panel",
    "tools": "Herramientas",
    "analytics": "Analíticas",
    "settings": "Configuración",
    "team": "Equipo",
    "welcome": "Bienvenido",
  },
  fr: {
    "dashboard": "Tableau de bord",
    "tools": "Outils",
    "analytics": "Analytiques",
    "settings": "Paramètres",
    "team": "Équipe",
    "welcome": "Bienvenue",
  },
  // Add more translations as needed
};

type LanguageContextType = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
  languages: Language[];
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [language, setLanguageState] = useState<Language>(LANGUAGES[0]);

  // Load language preference from user settings or localStorage
  useEffect(() => {
    const savedLanguage = localStorage.getItem("language");
    if (savedLanguage) {
      const found = LANGUAGES.find(l => l.code === savedLanguage);
      if (found) {
        setLanguageState(found);
      }
    } else if (user?.language) {
      const found = LANGUAGES.find(l => l.code === user.language);
      if (found) {
        setLanguageState(found);
      }
    } else {
      // Detect browser language
      const browserLang = navigator.language.split("-")[0];
      const found = LANGUAGES.find(l => l.code === browserLang);
      if (found) {
        setLanguageState(found);
      }
    }
  }, [user]);

  const setLanguage = async (newLanguage: Language) => {
    setLanguageState(newLanguage);
    localStorage.setItem("language", newLanguage.code);
    document.documentElement.lang = newLanguage.code;
    
    // Update user preference in database if logged in
    if (user) {
      try {
        await apiRequest("PATCH", "/api/auth/profile", { language: newLanguage.code });
      } catch (error) {
        console.error("Failed to update language preference:", error);
      }
    }
  };

  const t = (key: string): string => {
    return translations[language.code]?.[key] || translations.en[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, languages: LANGUAGES }}>
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









