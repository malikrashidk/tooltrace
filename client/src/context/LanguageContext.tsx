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
  de: {
    "dashboard": "Dashboard",
    "tools": "Tools",
    "analytics": "Analysen",
    "settings": "Einstellungen",
    "team": "Team",
    "welcome": "Willkommen",
    "total_tools": "Gesamtanzahl Tools",
    "monthly_spend": "Monatliche Ausgaben",
    "yearly_projection": "Jährliche Prognose",
    "no_tools": "Noch keine Tools hinzugefügt",
    "recent_tools": "Neueste Tools",
    "view_all": "Alle ansehen",
    "all_tools": "Alle Tools",
    "tools_count": "{count} Tools in Ihrer Sammlung",
    "add_tool": "Tool hinzufügen",
    "search": "Suchen...",
    "categories": "Kategorien",
    "usage": "Nutzung",
    "cost": "Kosten",
    "renewal": "Erneuerung",
    "insights": "Einblicke in Ihre SaaS-Ausgaben und -Nutzung",
    "overview": "Übersicht über Ihre Tools und Abonnements"
  },
  it: {
    "dashboard": "Dashboard",
    "tools": "Strumenti",
    "analytics": "Analisi",
    "settings": "Impostazioni",
    "team": "Team",
    "welcome": "Benvenuto",
    "total_tools": "Strumenti Totali",
    "monthly_spend": "Spesa Mensile",
    "yearly_projection": "Proiezione Annuale",
    "no_tools": "Nessuno strumento aggiunto",
    "recent_tools": "Strumenti Recenti",
    "view_all": "Vedi Tutti",
    "all_tools": "Tutti gli Strumenti",
    "tools_count": "{count} strumenti nella tua collezione",
    "add_tool": "Aggiungi Strumento",
    "search": "Cerca...",
    "categories": "Categorie",
    "usage": "Utilizzo",
    "cost": "Costo",
    "renewal": "Rinnovo",
    "insights": "Approfondimenti sulle spese e l'utilizzo SaaS",
    "overview": "Panoramica dei tuoi strumenti e abbonamenti"
  },
  pt: {
    "dashboard": "Painel",
    "tools": "Ferramentas",
    "analytics": "Análises",
    "settings": "Configurações",
    "team": "Equipe",
    "welcome": "Bem-vindo",
    "total_tools": "Total de Ferramentas",
    "monthly_spend": "Gasto Mensal",
    "yearly_projection": "Projeção Anual",
    "no_tools": "Nenhuma ferramenta adicionada",
    "recent_tools": "Ferramentas Recentes",
    "view_all": "Ver Tudo",
    "all_tools": "Todas as Ferramentas",
    "tools_count": "{count} ferramentas em sua coleção",
    "add_tool": "Adicionar Ferramenta",
    "search": "Pesquisar...",
    "categories": "Categorias",
    "usage": "Uso",
    "cost": "Custo",
    "renewal": "Renovação",
    "insights": "Insights sobre seus gastos e uso de SaaS",
    "overview": "Visão geral de suas ferramentas e assinaturas"
  },
  zh: {
    "dashboard": "仪表板",
    "tools": "工具",
    "analytics": "分析",
    "settings": "设置",
    "team": "团队",
    "welcome": "欢迎",
    "total_tools": "工具总数",
    "monthly_spend": "月度支出",
    "yearly_projection": "年度预测",
    "no_tools": "尚未添加工具",
    "recent_tools": "最近的工具",
    "view_all": "查看全部",
    "all_tools": "所有工具",
    "tools_count": "您的收藏中有 {count} 个工具",
    "add_tool": "添加工具",
    "search": "搜索...",
    "categories": "类别",
    "usage": "使用情况",
    "cost": "成本",
    "renewal": "续费",
    "insights": "SaaS 支出和使用情况的见解",
    "overview": "您的工具和订阅概览"
  },
  ja: {
    "dashboard": "ダッシュボード",
    "tools": "ツール",
    "analytics": "分析",
    "settings": "設定",
    "team": "チーム",
    "welcome": "ようこそ",
    "total_tools": "ツール総数",
    "monthly_spend": "月間支出",
    "yearly_projection": "年間予測",
    "no_tools": "ツールはまだ追加されていません",
    "recent_tools": "最近のツール",
    "view_all": "すべて表示",
    "all_tools": "すべてのツール",
    "tools_count": "コレクション内のツール数: {count}",
    "add_tool": "ツールを追加",
    "search": "検索...",
    "categories": "カテゴリ",
    "usage": "使用状況",
    "cost": "コスト",
    "renewal": "更新",
    "insights": "SaaSの支出と使用状況に関する洞察",
    "overview": "ツールとサブスクリプションの概要"
  },
  ko: {
    "dashboard": "대시보드",
    "tools": "도구",
    "analytics": "분석",
    "settings": "설정",
    "team": "팀",
    "welcome": "환영합니다",
    "total_tools": "총 도구",
    "monthly_spend": "월간 지출",
    "yearly_projection": "연간 예상",
    "no_tools": "추가된 도구가 없습니다",
    "recent_tools": "최근 도구",
    "view_all": "모두 보기",
    "all_tools": "모든 도구",
    "tools_count": "컬렉션에 {count}개의 도구가 있습니다",
    "add_tool": "도구 추가",
    "search": "검색...",
    "categories": "카테고리",
    "usage": "사용",
    "cost": "비용",
    "renewal": "갱신",
    "insights": "SaaS 지출 및 사용에 대한 통찰력",
    "overview": "도구 및 구독 개요"
  },
  ru: {
    "dashboard": "Панель управления",
    "tools": "Инструменты",
    "analytics": "Аналитика",
    "settings": "Настройки",
    "team": "Команда",
    "welcome": "Добро пожаловать",
    "total_tools": "Всего инструментов",
    "monthly_spend": "Ежемесячные расходы",
    "yearly_projection": "Годовой прогноз",
    "no_tools": "Инструменты еще не добавлены",
    "recent_tools": "Недавние инструменты",
    "view_all": "Посмотреть все",
    "all_tools": "Все инструменты",
    "tools_count": "{count} инструментов в вашей коллекции",
    "add_tool": "Добавить инструмент",
    "search": "Поиск...",
    "categories": "Категории",
    "usage": "Использование",
    "cost": "Стоимость",
    "renewal": "Продление",
    "insights": "Инсайты о ваших расходах и использовании SaaS",
    "overview": "Обзор ваших инструментов и подписок"
  },
  ar: {
    "dashboard": "لوحة القيادة",
    "tools": "الأدوات",
    "analytics": "التحليلات",
    "settings": "الإعدادات",
    "team": "الفريق",
    "welcome": "أهلاً بك",
    "total_tools": "إجمالي الأدوات",
    "monthly_spend": "الإنفاق الشهري",
    "yearly_projection": "التوقعات السنوية",
    "no_tools": "لم تتم إضافة أدوات بعد",
    "recent_tools": "الأدوات الحديثة",
    "view_all": "عرض الكل",
    "all_tools": "جميع الأدوات",
    "tools_count": "{count} أدوات في مجموعتك",
    "add_tool": "إضافة أداة",
    "search": "بحث...",
    "categories": "الفئات",
    "usage": "الاستخدام",
    "cost": "التكلفة",
    "renewal": "التجديد",
    "insights": "رؤى حول إنفاق واستخدام SaaS",
    "overview": "نظرة عامة على أدواتك واشتراكاتك"
  },
  hi: {
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
  },
  ur: {
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
  }
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
    
    // Set text direction for RTL languages
    if (newLanguage.code === 'ar' || newLanguage.code === 'ur') {
      document.documentElement.dir = 'rtl';
    } else {
      document.documentElement.dir = 'ltr';
    }

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
