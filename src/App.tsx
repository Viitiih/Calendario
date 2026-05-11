import { getLocalCalendar, saveLocalCalendar, mergeCalendars, copyWorkDaysToCalendar } from "./lib/localCalendar";
import * as React from "react";
import { useState, useEffect, useMemo, useRef, useCallback, Suspense } from "react";
import { isSameDay, parseISO, format } from "date-fns";
import { ptBR, enUS, es, fr, it, de } from "date-fns/locale";
import { CalendarDays, DollarSign, TrendingUp, Share2, WifiOff, Settings as SettingsIcon } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "./lib/utils";
import { translations, Language } from "./translations";
import {
  createCalendar,
  getCalendar,
  getCalendarByInviteCode,
  updateCalendar as fbUpdateCalendar,
  subscribeToCalendar,
  subscribeToUserFinances,
  saveUserFinances,
  getUserFinances,
  UserFinances,
} from "./lib/calendarService";
import { getGoogleRedirectResult } from "./lib/authService";
import { User, CalendarData, Expense, Income, FinanceRecord } from "./types";
import { LoginScreen } from "./components/LoginScreen";
import { PendingScreen } from "./components/PendingScreen";
import { CalendarView } from "./components/CalendarView";

const loadFinanceView = () => import("./components/FinanceView").then((mod) => ({ default: mod.FinanceView }));
const loadGoalsView = () => import("./components/GoalsView").then((mod) => ({ default: mod.GoalsView }));
const loadShareView = () => import("./components/ShareView").then((mod) => ({ default: mod.ShareView }));
const loadDayModal = () => import("./components/DayModal").then((mod) => ({ default: mod.DayModal }));
const loadSettings = () => import("./components/Settings");

const FinanceView = React.lazy(loadFinanceView);
const GoalsView = React.lazy(loadGoalsView);
const ShareView = React.lazy(loadShareView);
const DayModal = React.lazy(loadDayModal);
const SettingsComponent = React.lazy(loadSettings);

const preloadHeavySections = () => {
  void loadFinanceView();
  void loadGoalsView();
  void loadShareView();
  void loadDayModal();
  void loadSettings();
};

export default function App() {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem("worksync_language");
    if (saved) return saved as Language;
    const browserLang = navigator.language.split("-")[0];
    const supported: Language[] = ["pt", "en", "es", "fr", "it", "de"];
    return supported.includes(browserLang as Language) ? (browserLang as Language) : "pt";
  });

  const t = useCallback(
    (key: keyof (typeof translations)["pt"]) => {
      const langObj = translations[language] || translations.pt;
      const value = (langObj as any)[key] || (translations.pt as any)[key];
      return typeof value === "string" ? value : String(key);
    },
    [language]
  );

  const currentLocale = useMemo(() => {
    const locales: Record<Language, any> = { pt: ptBR, en: enUS, es, fr, it, de };
    return locales[language] || ptBR;
  }, [language]);

  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("worksync_user");
    if (!saved) return null;
    try {
      const parsed = JSON.parse(saved);
      if (parsed?.id) return parsed as User;
    } catch {}
    return null;
  });

  const cameFromInvite = useMemo(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return !!urlParams.get("invite");
  }, []);

  const [calendarId, setCalendarId] = useState<string>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlId = urlParams.get("calendarId");
    if (urlId) {
      localStorage.setItem("worksync_calendar_id", urlId);
      return urlId;
    }
    const saved = localStorage.getItem("worksync_calendar_id");
    if (saved && saved !== "default-calendar") return saved;
    const newId = `cal_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem("worksync_calendar_id", newId);
    return newId;
  });

  const [calendarMode2, setCalendarMode2] = useState<"personal" | "shared">(() => {
    return (localStorage.getItem("worksync_active_mode") as "personal" | "shared") || "personal";
  });

  const [localCalendarData, setLocalCalendarData] = useState<CalendarData>({
    id: "local_temp",
    name: "Meu Calendário Pessoal",
    workDays: [],
    expenses: [],
    incomes: [],
    registrosFinanceiros: [],
    templates: [],
  });

  const [calendarData, setCalendarData] = useState<CalendarData>({
    id: calendarId,
    name: "Meu Calendário",
    inviteCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
    workDays: [],
    expenses: [],
    templates: [],
  });

  const [userFinances, setUserFinances] = useState<UserFinances>({
    expenses: [],
    incomes: [],
    registrosFinanceiros: [],
  });

  const [calendarMode, setCalendarMode] = useState<"work" | "expenses">("work");
  const [activeTab, setActiveTab] = useState<"calendar" | "finance" | "share" | "goals" | "settings">("calendar");
  const [direction, setDirection] = useState(0);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Bloquear scroll do body quando o modal estiver aberto (sem bloquear scroll interno)
  useEffect(() => {
    if (isModalOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
    } else {
      const scrollY = document.body.style.top;
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      if (scrollY) window.scrollTo(0, -parseInt(scrollY, 10));
    }
    return () => {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
    };
  }, [isModalOpen]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const [inviteError, setInviteError] = useState<string | null>(null);
  const lastPendingNotificationRef = useRef(0);

  const updateCalendar = useCallback(async (newData: CalendarData) => {
    setCalendarData(newData);
    await fbUpdateCalendar(newData);
  }, []);

  const updateLocalCalendar = useCallback((newData: CalendarData) => {
    if (!user) return;
    setLocalCalendarData(newData);
    saveLocalCalendar(user.id, newData);
  }, [user]);

  useEffect(() => {
    const checkRedirect = async () => {
      try {
        const firebaseUser = await getGoogleRedirectResult();
        if (!firebaseUser) return;
        const savedUser = localStorage.getItem("worksync_user");
        let userColor = "#6366f1";
        if (savedUser) {
          try {
            const p = JSON.parse(savedUser);
            if (p.color) userColor = p.color;
          } catch {}
        }
        const newUser: User = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || "Usuário",
          color: userColor,
          syncTheme: true,
          themeColor: userColor,
          darkMode: false,
        };
        setUser(newUser);
        localStorage.setItem("worksync_user", JSON.stringify(newUser));
      } catch (err) {
        console.error("Erro no redirect do Google:", err);
      }
    };
    checkRedirect();
  }, []);

  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    import("./lib/firebase").then(({ auth }) => {
      const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
        if (!firebaseUser && user) {
          // Usuário tem sessão local mas não tem Firebase Auth — faz login anônimo
          try {
            const { loginAnonymously } = await import("./lib/authService");
            const anonUser = await loginAnonymously();
            const updatedUser = { ...user, id: anonUser.uid };
            setUser(updatedUser);
            localStorage.setItem("worksync_user", JSON.stringify(updatedUser));
          } catch (e) {
            console.warn("[Auth] Falha no login anônimo:", e);
          }
        }
        setAuthReady(true);
        unsubscribe();
      });
    });
  }, []);

  useEffect(() => {
    if (!calendarId || !user || !authReady) return;

    const initAndSubscribe = async () => {
      setIsLoading(true);
      try {
        let data = await getCalendar(calendarId);

        if (!data) {
          data = await createCalendar(calendarId, user.id, user.name, user.color);
        } else {
          const isMember = (data.users || []).some((u) => u.id === user.id);
          const isPending = (data.pendingUsers || []).some((u) => u.id === user.id);

          if (!isMember && !isPending) {
            if (cameFromInvite) {
              const updated: CalendarData = {
                ...data,
                pendingUsers: [
                  ...(data.pendingUsers || []),
                  { id: user.id, name: user.name, color: user.color },
                ],
              };
              await fbUpdateCalendar(updated);
              data = updated;
            } else {
              const updated: CalendarData = {
                ...data,
                users: [
                  ...(data.users || []),
                  { id: user.id, name: user.name, color: user.color },
                ],
              };
              await fbUpdateCalendar(updated);
              data = updated;
            }
          }
        }

        setCalendarData(data);
      } catch (err) {
        console.error("Erro ao inicializar calendário:", err);
      } finally {
        setIsLoading(false);
      }
    };

    initAndSubscribe();

    const unsubscribe = subscribeToCalendar(calendarId, (data) => {
      setCalendarData(data);
    });

    return () => unsubscribe();
  }, [calendarId, user?.id, authReady]);

  useEffect(() => {
    if (!calendarId || !user || !authReady) return;
    const unsubscribe = subscribeToUserFinances(calendarId, user.id, (data) => {
      setUserFinances(data);
    });
    return () => unsubscribe();
  }, [calendarId, user?.id, authReady]);

  useEffect(() => {
    if (!user) return;
    const local = getLocalCalendar(user.id);
    setLocalCalendarData(local);
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;

    const preload = () => preloadHeavySections();
    const win = window as typeof window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    if (win.requestIdleCallback) {
      const idleId = win.requestIdleCallback(preload, { timeout: 1800 });
      return () => win.cancelIdleCallback?.(idleId);
    }

    const timeoutId = window.setTimeout(preload, 700);
    return () => window.clearTimeout(timeoutId);
  }, [user?.id]);

  const handleValidateInvite = useCallback(
    async (code: string): Promise<boolean> => {
      setIsLoading(true);
      setInviteError(null);
      try {
        const cal = await getCalendarByInviteCode(code);
        if (cal) {
          setCalendarId(cal.id);
          localStorage.setItem("worksync_calendar_id", cal.id);
          localStorage.setItem("worksync_came_from_invite", "true");
          return true;
        } else {
          setInviteError(t("invalid_invite_code"));
          return false;
        }
      } catch (err) {
        setInviteError(t("invalid_invite_code"));
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [t]
  );

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const inviteCode = urlParams.get("invite");
    if (inviteCode) {
      localStorage.setItem("worksync_came_from_invite", "true");
      handleValidateInvite(inviteCode).then((success) => {
        if (success) window.history.replaceState({}, "", window.location.pathname);
      });
    }
  }, [handleValidateInvite]);

  const handleLogin = useCallback((name: string, color: string, firebaseUid?: string) => {
    const newUser: User = {
      id: firebaseUid || Math.random().toString(36).substr(2, 9),
      name,
      color,
      syncTheme: true,
      themeColor: color,
      darkMode: false,
    };
    setUser(newUser);
    localStorage.setItem("worksync_user", JSON.stringify(newUser));
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      const { logoutUser } = await import("./lib/authService");
      await logoutUser();
    } catch {}
    setUser(null);
    localStorage.removeItem("worksync_user");
    localStorage.removeItem("worksync_came_from_invite");
  }, []);

  const handleUpdateUser = useCallback(
    async (updates: Partial<User>) => {
      if (!user) return;
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      localStorage.setItem("worksync_user", JSON.stringify(updatedUser));
      if (updates.color || updates.name) {
        const updatedUsers = (calendarData.users || []).map((u) =>
          u.id === user.id ? { ...u, name: updatedUser.name, color: updatedUser.color } : u
        );
        updateCalendar({ ...calendarData, users: updatedUsers });
      }
    },
    [user, calendarData, updateCalendar]
  );

  const handleSwitchMode = useCallback((mode: "personal" | "shared") => {
    setCalendarMode2(mode);
    localStorage.setItem("worksync_active_mode", mode);
  }, []);

  const handleCopyToShared = useCallback(() => {
    const updated = copyWorkDaysToCalendar(localCalendarData, calendarData);
    updateCalendar(updated);
  }, [localCalendarData, calendarData, updateCalendar]);

  const handleCopyToLocal = useCallback(() => {
    const updated = copyWorkDaysToCalendar(calendarData, localCalendarData);
    updateLocalCalendar(updated);
  }, [localCalendarData, calendarData, updateLocalCalendar]);

  const handleSync = useCallback(() => {
    if (!user) return;
    const merged = mergeCalendars(localCalendarData, calendarData);
    updateCalendar(merged);
    updateLocalCalendar(merged);
  }, [localCalendarData, calendarData, updateCalendar, updateLocalCalendar, user]);

  const handleExportExcel = useCallback(async () => {
    if (!user) return;

    try {
      const { exportCalendarExcel } = await import("./lib/excelExport");
      const activeUsers = calendarMode2 === "personal"
        ? [{ id: user.id, name: user.name, color: user.color }]
        : ((calendarData.users && calendarData.users.length > 0)
            ? calendarData.users
            : [{ id: user.id, name: user.name, color: user.color }]);

      const activeCalendar = calendarMode2 === "personal"
        ? {
            ...localCalendarData,
            users: activeUsers,
          }
        : calendarData;

      const financesByUserId: Record<string, UserFinances> = {};

      if (calendarMode2 === "shared") {
        const entries = await Promise.all(activeUsers.map(async (member) => {
          if (member.id === user.id) return [member.id, userFinances] as const;
          try {
            return [member.id, await getUserFinances(calendarId, member.id)] as const;
          } catch (err) {
            console.warn(`Não foi possível carregar finanças de ${member.name}.`, err);
            return [member.id, { expenses: [], incomes: [], registrosFinanceiros: [] }] as const;
          }
        }));
        entries.forEach(([memberId, finances]) => { financesByUserId[memberId] = finances; });
      } else {
        financesByUserId[user.id] = userFinances;
      }

      exportCalendarExcel({
        calendarData: activeCalendar,
        users: activeUsers,
        financesByUserId,
        currentMonth,
        fileName: `calendario_${format(currentMonth, "yyyy-MM")}.xlsx`,
      });
    } catch (err) {
      console.error("Erro ao exportar Excel:", err);
      alert("Não foi possível exportar o Excel. Tente novamente.");
    }
  }, [calendarData, calendarId, calendarMode2, currentMonth, localCalendarData, user, userFinances]);

  const onAddFinanceRecord = useCallback(
    async (record: any, type: string) => {
      if (!calendarId || !user) return;
      let updated = { ...userFinances };
      if ("tipo" in record && "valor" in record) {
        updated.registrosFinanceiros = [...(updated.registrosFinanceiros || []), record];
      } else if (type === "expense") {
        updated.expenses = [...(updated.expenses || []), record];
      } else {
        updated.incomes = [...(updated.incomes || []), record];
      }
      setUserFinances(updated);
      await saveUserFinances(calendarId, user.id, updated);
    },
    [calendarId, user, userFinances]
  );

  const onSaveDay = useCallback(
    async (workDays: any[], expenses: any[], incomes: any[] = []) => {
      if (!calendarId || !user) return;
      const activeCalendar = calendarMode2 === "personal" ? localCalendarData : calendarData;
      const newWorkDays = [...(activeCalendar.workDays || [])];
      workDays.forEach((wd) => {
        const idx = newWorkDays.findIndex((w) => w.id === wd.id);
        if (idx >= 0) newWorkDays[idx] = wd;
        else newWorkDays.push(wd);
      });
      if (calendarMode2 === "personal") {
        updateLocalCalendar({ ...localCalendarData, workDays: newWorkDays });
      } else {
        updateCalendar({ ...calendarData, workDays: newWorkDays });
      }
      const newExpenses = [...(userFinances.expenses || [])];
      const newIncomes = [...(userFinances.incomes || [])];
      expenses.forEach((exp) => {
        const idx = newExpenses.findIndex((e) => e.id === exp.id);
        if (idx >= 0) newExpenses[idx] = exp;
        else newExpenses.push(exp);
      });
      incomes.forEach((inc) => {
        const idx = newIncomes.findIndex((i) => i.id === inc.id);
        if (idx >= 0) newIncomes[idx] = inc;
        else newIncomes.push(inc);
      });
      const updatedFinances = { ...userFinances, expenses: newExpenses, incomes: newIncomes };
      setUserFinances(updatedFinances);
      await saveUserFinances(calendarId, user.id, updatedFinances);
    },
    [calendarId, user, calendarData, localCalendarData, calendarMode2, userFinances, updateCalendar, updateLocalCalendar]
  );

  const handleTabChange = useCallback((newTab: "calendar" | "finance" | "share" | "goals" | "settings") => {
    const allTabs: typeof newTab[] = ["calendar", "finance", "goals", "share", "settings"];
    const available = allTabs.filter((t) => t !== "goals" || user?.showGoals);
    const newIndex = available.indexOf(newTab);
    const currentIndex = available.indexOf(activeTab as any);

    if (newIndex !== -1 && currentIndex !== -1) {
      setDirection(newIndex > currentIndex ? 1 : -1);
    }

    React.startTransition(() => {
      setActiveTab(newTab);
    });
  }, [activeTab, user?.showGoals]);

  const primaryColor = useMemo(() => {
    if (!user) return "#2563eb";
    return user.syncTheme ? user.color : user.themeColor || "#2563eb";
  }, [user]);

  const isDarkMode = user ? user.darkMode || false : true;

  const isMember = useMemo(
    () => (calendarData.users || []).some((u) => u.id === user?.id),
    [calendarData.users, user?.id]
  );

  const isPending = useMemo(() => {
    const cameFromInviteStored = localStorage.getItem("worksync_came_from_invite") === "true";
    return (
      cameFromInviteStored &&
      !isMember &&
      (calendarData.pendingUsers || []).some((u) => u.id === user?.id)
    );
  }, [calendarData.pendingUsers, isMember, user?.id]);

  const isAdmin = useMemo(
    () => calendarData.ownerId === user?.id,
    [calendarData.ownerId, user?.id]
  );

  useEffect(() => {
    const pendingCount = calendarData.pendingUsers?.length || 0;
    if (!user?.notificationsEnabled || !isAdmin || pendingCount === 0) return;
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    if (lastPendingNotificationRef.current === pendingCount) return;

    lastPendingNotificationRef.current = pendingCount;
    new Notification("Nova solicitação no calendário", {
      body: pendingCount === 1
        ? "Há 1 pessoa aguardando aprovação."
        : `Há ${pendingCount} pessoas aguardando aprovação.`,
    });
  }, [calendarData.pendingUsers?.length, isAdmin, user?.notificationsEnabled]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
  }, [isDarkMode]);

  const activeCalendarForView = useMemo(() => {
    if (!user) return calendarData;
    if (calendarMode2 === "personal") {
      return {
        ...localCalendarData,
        users: [{ id: user.id, name: user.name, color: user.color }],
      };
    }
    return calendarData;
  }, [calendarMode2, localCalendarData, calendarData, user?.id, user?.name, user?.color]);

  const calendarWithUserFinances = useMemo(() => ({
    ...calendarData,
    expenses: userFinances.expenses,
    incomes: userFinances.incomes,
    registrosFinanceiros: userFinances.registrosFinanceiros,
  }), [calendarData, userFinances.expenses, userFinances.incomes, userFinances.registrosFinanceiros]);

  const dayModalCalendarData = useMemo(() => {
    const baseCalendar = calendarMode2 === "personal" ? localCalendarData : calendarData;
    return {
      ...baseCalendar,
      expenses: userFinances.expenses,
      incomes: userFinances.incomes,
    };
  }, [calendarMode2, localCalendarData, calendarData, userFinances.expenses, userFinances.incomes]);

  const mainRef = useRef<HTMLElement>(null);

  if (!user) {
    return (
      <LoginScreen
        onLogin={handleLogin}
        onValidateInvite={handleValidateInvite}
        isLoading={isLoading}
        inviteError={inviteError}
        calendarUsers={calendarData.users || []}
        t={t}
      />
    );
  }

  if (isPending) {
    return (
      <PendingScreen
        user={user}
        isDarkMode={isDarkMode}
        primaryColor={primaryColor}
        onLogout={handleLogout}
        t={t}
      />
    );
  }

  if (!isMember && isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className={cn("min-h-screen flex flex-col transition-all duration-500 pb-24 selection:bg-blue-500/30 overflow-x-hidden relative", isDarkMode ? "bg-[#050505] text-white selection:text-blue-200" : "bg-[#FAFAFA] text-slate-900 selection:text-blue-900")}>
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 py-2 px-4 text-xs font-black text-white"
          style={{ background: "linear-gradient(90deg, #f59e0b, #d97706)" }}>
          <WifiOff size={13} />
          Você está offline — alterações serão sincronizadas quando a conexão voltar
        </div>
      )}

      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
        <div
          className={cn("hidden sm:block absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full blur-[56px] opacity-12 transition-colors duration-500", isDarkMode ? "bg-blue-900/30" : "bg-blue-100/50")}
        />
        <div
          className={cn("hidden sm:block absolute -bottom-[10%] -right-[5%] w-[60%] h-[60%] rounded-full blur-[56px] opacity-10 transition-colors duration-500", isDarkMode ? "bg-purple-900/25" : "bg-purple-100/35")}
        />
      </div>

      <header className={cn("px-3 sm:px-6 py-3 sm:py-5 sticky top-0 z-40 flex flex-wrap justify-between items-center gap-3 transition-all duration-200 backdrop-blur-sm sm:backdrop-blur-xl border-b", isDarkMode ? "bg-black/60 border-white/[0.03] shadow-[0_4px_20px_-10px_rgba(0,0,0,0.5)]" : "bg-white/70 border-slate-200/60 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)]")}>
        <div className="flex min-w-0 flex-1 flex-col group cursor-default order-1">
          <h1 className="font-display font-black text-xl sm:text-2xl tracking-tighter transition-all group-hover:tracking-normal duration-200 leading-none">
            <span className={cn("text-gradient bg-linear-to-br", isDarkMode ? "from-white via-slate-200 to-slate-400" : "from-slate-900 via-slate-700 to-slate-600")}>WorkSync</span>
          </h1>
          <p className="max-w-[180px] truncate text-[7px] min-[390px]:text-[8px] sm:text-[10px] font-black tracking-[0.16em] sm:tracking-[0.25em] text-blue-500/60 uppercase">
            {calendarMode2 === "personal" ? "Pessoal" : calendarData.name}
          </p>
        </div>

        <div className={cn("order-3 w-full sm:order-2 sm:w-auto flex items-center rounded-xl p-0.5 text-[10px] min-[390px]:text-[11px] font-bold gap-0.5", isDarkMode ? "bg-white/[0.05]" : "bg-slate-100")}>
          <button
            onClick={() => handleSwitchMode("personal")}
            className={cn("flex-1 sm:flex-none min-w-0 px-2.5 sm:px-3 py-2 sm:py-1.5 rounded-lg transition-all duration-200 whitespace-nowrap", calendarMode2 === "personal" ? "text-white shadow-sm" : isDarkMode ? "text-slate-500 hover:text-slate-300" : "text-slate-400 hover:text-slate-600")}
            style={calendarMode2 === "personal" ? { backgroundColor: primaryColor } : {}}
          >
            Pessoal
          </button>
          <button
            onClick={() => handleSwitchMode("shared")}
            className={cn("flex-1 sm:flex-none min-w-0 px-2.5 sm:px-3 py-2 sm:py-1.5 rounded-lg transition-all duration-200 whitespace-nowrap", calendarMode2 === "shared" ? "text-white shadow-sm" : isDarkMode ? "text-slate-500 hover:text-slate-300" : "text-slate-400 hover:text-slate-600")}
            style={calendarMode2 === "shared" ? { backgroundColor: primaryColor } : {}}
          >
            Compartilhado
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3 order-2 sm:order-3">
          <button onClick={() => handleTabChange("calendar")} className={cn("w-10 h-10 shrink-0 rounded-2xl flex items-center justify-center transition-all active:scale-90 hover:scale-105", isDarkMode ? "bg-white/[0.03] text-slate-400 hover:text-white border border-white/[0.05] hover:bg-white/[0.08]" : "bg-white text-slate-500 border border-slate-200/60 shadow-soft hover:bg-slate-50 hover:text-slate-900")}>
            <CalendarDays size={18} strokeWidth={2} />
          </button>
          <button onClick={() => handleTabChange("settings")} className="w-10 h-10 shrink-0 rounded-2xl flex items-center justify-center text-white text-sm font-black border shadow-lg transition-all active:scale-90 hover:scale-110 hover:rotate-3" style={{ backgroundColor: user.color, borderColor: isDarkMode ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.08)", boxShadow: `0 8px 16px -4px ${user.color}44` }}>
            {(user.name || "U").charAt(0).toUpperCase()}
          </button>
        </div>
      </header>

      <main ref={mainRef} className="flex-1 w-full max-w-[500px] mx-auto px-3 min-[390px]:px-4 sm:px-6 relative z-10 pb-[calc(110px+env(safe-area-inset-bottom))] min-h-[100dvh]">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={activeTab}
            custom={direction}
            initial={{ opacity: 0, x: direction * 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -20 }}
            transition={{ type: "tween", duration: 0.2, ease: "easeOut" }}
            className="w-full"
          >
            {activeTab === "calendar" ? (
              <CalendarView
                currentMonth={currentMonth}
                setCurrentMonth={setCurrentMonth}
                calendarData={activeCalendarForView}
                updateCalendar={calendarMode2 === "personal" ? updateLocalCalendar : updateCalendar}
                user={user}
                onDateClick={(date) => { setSelectedDate(date); setIsModalOpen(true); }}
                primaryColor={primaryColor}
                isDarkMode={isDarkMode}
                t={t}
                currentLocale={currentLocale}
                calendarMode={calendarMode}
                setCalendarMode={setCalendarMode}
                isLoading={isLoading}
              />
            ) : activeTab === "finance" ? (
              <Suspense fallback={<div className="py-16 text-center text-sm text-slate-500">Carregando finanças...</div>}>
                <FinanceView
                  calendarData={calendarWithUserFinances}
                  updateCalendar={updateCalendar}
                  onAddFinanceRecord={onAddFinanceRecord}
                  primaryColor={primaryColor}
                  isDarkMode={isDarkMode}
                  t={t}
                  currentLocale={currentLocale}
                  currentMonth={currentMonth}
                />
              </Suspense>
            ) : activeTab === "goals" ? (
              <Suspense fallback={<div className="py-16 text-center text-sm text-slate-500">Carregando metas...</div>}>
                <GoalsView calendarData={calendarData} user={user} isDarkMode={isDarkMode} primaryColor={primaryColor} onUpdateUser={handleUpdateUser} t={t} />
              </Suspense>
            ) : activeTab === "share" ? (
              <Suspense fallback={<div className="py-16 text-center text-sm text-slate-500">Carregando compartilhamento...</div>}>
                <ShareView
                  calendarId={calendarId}
                  calendarData={calendarData}
                  updateCalendar={updateCalendar}
                  primaryColor={primaryColor}
                  isDarkMode={isDarkMode}
                  isAdmin={isAdmin}
                  t={t}
                  onCopyToShared={handleCopyToShared}
                  onCopyToLocal={handleCopyToLocal}
                  onSync={handleSync}
                  onJoinCalendar={handleValidateInvite}
                />
              </Suspense>
            ) : (
              <Suspense fallback={<div className="py-16 text-center text-sm text-slate-500">Carregando configurações...</div>}>
                <SettingsComponent user={user} onUpdateUser={handleUpdateUser} onLogout={handleLogout} isDarkMode={isDarkMode} calendarId={calendarId} inviteCode={calendarData.inviteCode || calendarId} calendarUsers={calendarData.users || []} language={language} onUpdateLanguage={(lang) => { setLanguage(lang); handleUpdateUser({ language: lang }); }} onExportExcel={handleExportExcel} t={t} />
              </Suspense>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <nav className={cn("fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] sm:bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-0.75rem)] sm:w-[calc(100%-2rem)] max-w-[480px] h-[68px] sm:h-[76px] px-2 min-[390px]:px-3 sm:px-6 flex justify-around items-center z-[100] transition-all duration-200 backdrop-blur-sm sm:backdrop-blur-xl rounded-[28px] sm:rounded-[32px] border", isDarkMode ? "bg-[#090909]/80 border-white/[0.05] shadow-[0_20px_40px_rgba(0,0,0,0.6)]" : "bg-white/80 border-slate-200/60 shadow-[0_20px_40px_rgba(0,0,0,0.08)]", isModalOpen && "hidden")}>
        {[
          { id: "calendar", icon: CalendarDays, label: t("calendar") },
          { id: "finance", icon: DollarSign, label: t("finance") },
          ...(user?.showGoals ? [{ id: "goals", icon: TrendingUp, label: t("meta_financeira") }] : []),
          { id: "share", icon: Share2, label: t("share") },
          { id: "settings", icon: SettingsIcon, label: "Config" },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <motion.button key={tab.id} whileTap={{ scale: 0.88 }} onClick={() => handleTabChange(tab.id as any)} className={cn("relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 sm:gap-1 group transition-all duration-200", isActive ? "scale-110" : "opacity-40 hover:opacity-100")}>
              <div className={cn("p-2.5 min-[390px]:p-3 rounded-2xl transition-all duration-200", isActive ? "bg-blue-500/10 text-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.2)]" : "text-slate-500")} style={isActive ? { color: primaryColor, backgroundColor: `${primaryColor}15` } : {}}>
                <tab.icon className="w-5 h-5 min-[390px]:w-[22px] min-[390px]:h-[22px]" strokeWidth={isActive ? 2.5 : 2} />
              </div>
              {isActive && <motion.div layoutId="active-dot" className="w-1 h-1 rounded-full absolute -bottom-2" style={{ backgroundColor: primaryColor }} />}
              {tab.id === "share" && (calendarData.pendingUsers || []).length > 0 && (
                <div className="absolute top-1 right-1 w-4 h-4 bg-amber-500 rounded-full border-2 border-white dark:border-black flex items-center justify-center text-[8px] font-black text-white">
                  {(calendarData.pendingUsers || []).length}
                </div>
              )}
            </motion.button>
          );
        })}
      </nav>

      <AnimatePresence>
        {isModalOpen && selectedDate && (
          <Suspense fallback={<div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/80 text-white">Carregando...</div>}>
            <DayModal
              date={selectedDate}
              user={user}
              calendarData={dayModalCalendarData}
              updateCalendar={calendarMode2 === "personal" ? updateLocalCalendar : updateCalendar}
              onClose={() => setIsModalOpen(false)}
              initialTab={calendarMode === "expenses" ? "expenses" : "commitments"}
              onSave={(workDays, expenses, incomes = []) => {
                const activeCalendar = calendarMode2 === "personal" ? localCalendarData : calendarData;
                const affectedWorkDates = workDays.map((wd) => format(parseISO(wd.date), "yyyy-MM-dd"));
                const updatedWorkDays = [...(activeCalendar.workDays || [])].filter((wd) => {
                  const wdDateStr = format(parseISO(wd.date), "yyyy-MM-dd");
                  const isAffected = affectedWorkDates.includes(wdDateStr);
                  if (isAffected && wd.userId === user.id) {
                    const hasSameType = workDays.some((nwd) =>
                      format(parseISO(nwd.date), "yyyy-MM-dd") === wdDateStr &&
                      (nwd.type === wd.type || (!nwd.type && wd.type === "work") || (!wd.type && nwd.type === "work"))
                    );
                    return !hasSameType;
                  }
                  return true;
                });
                const updatedExpenses = [...(userFinances.expenses || [])].filter((e) => !isSameDay(parseISO(e.date), selectedDate));
                const updatedIncomes = [...(userFinances.incomes || [])].filter((i) => !isSameDay(parseISO(i.date), selectedDate));

                if (calendarMode2 === "personal") {
                  updateLocalCalendar({ ...localCalendarData, workDays: [...updatedWorkDays, ...workDays] });
                } else {
                  updateCalendar({ ...calendarData, workDays: [...updatedWorkDays, ...workDays] });
                }

                const updatedFinances = {
                  ...userFinances,
                  expenses: [...updatedExpenses, ...expenses],
                  incomes: [...updatedIncomes, ...incomes],
                };
                setUserFinances(updatedFinances);
                if (user) saveUserFinances(calendarId, user.id, updatedFinances);
                setIsModalOpen(false);
              }}
              primaryColor={primaryColor}
              isDarkMode={isDarkMode}
              t={t}
              currentLocale={currentLocale}
            />
          </Suspense>
        )}
      </AnimatePresence>
    </div>
  );
}
