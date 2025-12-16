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
  { code: "ur", name: "Urdu", nativeName: "اردو" },
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
    "total_tools": "Total Tools",
    "monthly_spend": "Monthly Spend",
    "yearly_projection": "Yearly Projection",
    "no_tools": "No tools added yet",
    "recent_tools": "Recent Tools",
    "view_all": "View All Tools",
    "all_tools": "All Tools",
    "tools_count": "{count} tools in your collection",
    "add_tool": "Add Tool",
    "search": "Search...",
    "categories": "Categories",
    "usage": "Usage",
    "cost": "Cost",
    "renewal": "Renewal",
    "insights": "Insights into your SaaS spending and usage",
    "overview": "Overview of your tools and subscriptions"
  },
  es: {
    "dashboard": "Panel",
    "tools": "Herramientas",
    "analytics": "Analíticas",
    "settings": "Configuración",
    "team": "Equipo",
    "welcome": "Bienvenido",
    "total_tools": "Herramientas Totales",
    "monthly_spend": "Gasto Mensual",
    "yearly_projection": "Proyección Anual",
    "no_tools": "No hay herramientas añadidas",
    "recent_tools": "Herramientas Recientes",
    "view_all": "Ver Todas",
    "all_tools": "Todas las Herramientas",
    "tools_count": "{count} herramientas en tu colección",
    "add_tool": "Añadir Herramienta",
    "search": "Buscar...",
    "categories": "Categorías",
    "usage": "Uso",
    "cost": "Costo",
    "renewal": "Renovación",
    "insights": "Información sobre tus gastos y uso de SaaS",
    "overview": "Resumen de tus herramientas y suscripciones"
  },
  fr: {
    "dashboard": "Tableau de bord",
    "tools": "Outils",
    "analytics": "Analytiques",
    "settings": "Paramètres",
    "team": "Équipe",
    "welcome": "Bienvenue",
    "total_tools": "Total des Outils",
    "monthly_spend": "Dépenses Mensuelles",
    "yearly_projection": "Projection Annuelle",
    "no_tools": "Aucun outil ajouté",
    "recent_tools": "Outils Récents",
    "view_all": "Voir Tout",
    "all_tools": "Tous les Outils",
    "tools_count": "{count} outils dans votre collection",
    "add_tool": "Ajouter un Outil",
    "search": "Chercher...",
    "categories": "Catégories",
    "usage": "Utilisation",
    "cost": "Coût",
    "renewal": "Renouvellement",
    "insights": "Aperçu de vos dépenses et de l'utilisation SaaS",
    "overview": "Aperçu de vos outils et abonnements"
  },
};

// add minimal translations for Hindi and Urdu
translations.hi = {
  "dashboard": "डैशबोर्ड",
  "tools": "उपकरण",
  "analytics": "विश्लेषिकी",
  "settings": "सेटिंग्स",
  "team": "टीम",
  "welcome": "स्वागत है",
  "total_tools": "कुल उपकरण",
  "monthly_spend": "मासिक खर्च",
  "yearly_projection": "वार्षिक प्रक्षेपण",
  "no_tools": "कोई उपकरण नहीं जोड़ा गया",
  "recent_tools": "हाल के उपकरण",
  "view_all": "सभी देखें",
  "all_tools": "सभी उपकरण",
  "tools_count": "आपके संग्रह में {count} उपकरण",
  "add_tool": "उपकरण जोड़ें",
  "search": "खोजें...",
  "categories": "श्रेणियाँ",
  "usage": "उपयोग",
  "cost": "लागत",
  "renewal": "नवीनीकरण",
  "insights": "आपके SaaS खर्च और उपयोग की जानकारी",
  "overview": "आपके उपकरणों और सदस्यता का अवलोकन"
};

translations.ur = {
  "dashboard": "ڈیش بورڈ",
  "tools": "ٹولز",
  "analytics": "تجزیات",
  "settings": "ترتیبات",
  "team": "ٹیم",
  "welcome": "خوش آمدید",
  "total_tools": "کل ٹولز",
  "monthly_spend": "ماہانہ خرچ",
  "yearly_projection": "سالانہ تخمینہ",
  "no_tools": "کوئی ٹول شامل نہیں کیا گیا",
  "recent_tools": "حالیہ ٹولز",
  "view_all": "سب دیکھیں",
  "all_tools": "تمام ٹولز",
  "tools_count": "آپ کے مجموعہ میں {count} ٹولز",
  "add_tool": "ٹول شامل کریں",
  "search": "تلاش کریں...",
  "categories": "زمرہ جات",
  "usage": "استعمال",
  "cost": "لاگت",
  "renewal": "تجدید",
  "insights": "آپ کے SaaS اخراجات اور استعمال کے بارے میں بصیرت",
  "overview": "آپ کے ٹولز اور سبسکرپشنز کا جائزہ"
};

type LanguageContextType = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
  languages: Language[];
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { user, setUser } = useAuth();
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
        const updatedUser = { ...user, language: newLanguage.code };
        setUser(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));
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









