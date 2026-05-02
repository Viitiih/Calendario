import * as React from "react";
import { useState, useEffect, useMemo, useRef, useCallback, Suspense } from "react";
import { isSameDay, parseISO, format } from "date-fns";
import { ptBR, enUS, es, fr, it, de } from "date-fns/locale";
import { CalendarDays, DollarSign, TrendingUp, Share2 } from "lucide-react";
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
  UserFinances,
} from "./lib/calendarService";

import { User, CalendarData, Expense, Income, FinanceRecord } from "./types";
import { LoginScreen } from "./components/LoginScreen";
import { PendingScreen } from "./components/PendingScreen";
import { CalendarView } from "./components/CalendarView";

const FinanceView = React.lazy(() =>
  import("./components/FinanceView").then((mod) => ({ default: mod.FinanceView }))
);
const GoalsView = React.lazy(() =>
  import("./components/GoalsView").then((mod) => ({ default: mod.GoalsView }))
);
const ShareView = React.lazy(() =>
  import("./components/ShareView").then((mod) => ({ default: mod.ShareView }))
);
const DayModal = React.lazy(() =>
  import("./components/DayModal").then((mod) => ({ default: mod.DayModal }))
);
const SettingsComponent = React.lazy(() => import("./components/Settings"));

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
  const [inviteError, setInviteError] = useState<string | null>(null);
  const updateCalendar = useCallback(async (newData: CalendarData) => {
    setCalendarData(newData);
    await fbUpdateCalendar(newData);
  }, []);

  useEffect(() => {
    if (!calendarId || !user) return;

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
            const updated: CalendarData = {
              ...data,
              pendingUsers: [
                ...(data.pendingUsers || []),
                { id: user.id, name: user.name, color: user.color },
              ],
            };
            await fbUpdateCalendar(updated);
            data = updated;
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
  }, [calendarId, user?.id]);

  useEffect(() => {
    if (!calendarId || !user) return;
    const unsubscribe = subscribeToUserFinances(calendarId, user.id, (data) => {
      setUserFinances(data);
    });
    return () => unsubscribe();
  }, [calendarId, user?.id]);

  const handleValidateInvite = useCallback(
    async (code: string): Promise<boolean> => {
      setIsLoading(true);
      setInviteError(null);
      try {
        const cal = await getCalendarByInviteCode(code);
        if (cal) {
          setCalendarId(cal.id);
          localStorage.setItem("worksync_calendar_id", cal.id);
          return true;
        } else {
          setInviteError(t("invalid_invite_code"));
          return false;
        }
      } catch (err) {
        console.error("Erro ao validar convite:", err);
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
      handleValidateInvite(inviteCode).then((success) => {
        if (success) window.history.replaceState({}, "", window.location.pathname);
      });
    }
  }, [handleValidateInvite]);

  const handleLogin = useCallback((name: string, color: string) => {
    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      color,
      syncTheme: true,
      themeColor: color,
      darkMode: false,
    };
    setUser(newUser);
    localStorage.setItem("worksync_user", JSON.stringify(newUser));
  }, []);

  const handleLogout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("worksync_user");
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

      const newWorkDays = [...(calendarData.workDays || [])];
      workDays.forEach((wd) => {
        const idx = newWorkDays.findIndex((w) => w.id === wd.id);
        if (idx >= 0) newWorkDays[idx] = wd;
        else newWorkDays.push(wd);
      });
      updateCalendar({ ...calendarData, workDays: newWorkDays });

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
    [calendarId, user, calendarData, userFinances, updateCalendar]
  );

  const handleTabChange = (newTab: "calendar" | "finance" | "share" | "goals" | "settings") => {
    const allTabs: typeof newTab[] = ["calendar", "finance", "goals", "share", "settings"];
    const available = allTabs.filter((t) => t !== "goals" || user?.showGoals);
    const newIndex = available.indexOf(newTab);
    const currentIndex = available.indexOf(activeTab as any);
    if (newIndex !== -1 && currentIndex !== -1) {
      setDirection(newIndex > currentIndex ? 1 : -1);
    }
    setActiveTab(newTab);
  };

  const primaryColor = useMemo(() => {
    if (!user) return "#2563eb";
    return user.syncTheme ? user.color : user.themeColor || "#2563eb";
  }, [user]);

  const isDarkMode = user ? user.darkMode || false : true;

  const isMember = useMemo(
    () => (calendarData.users || []).some((u) => u.id === user?.id),
    [calendarData.users, user?.id]
  );

  const isPending = useMemo(
    () => !isMember && (calendarData.pendingUsers || []).some((u) => u.id === user?.id),
    [calendarData.pendingUsers, isMember, user?.id]
  );

  const isAdmin = useMemo(
    () => calendarData.ownerId === user?.id,
    [calendarData.ownerId, user?.id]
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
  }, [isDarkMode]);

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

  if (!isMember && !isLoading && calendarData.ownerId) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }
  return (
    <div className={cn("min-h-screen flex flex-col transition-all duration-300 pb-24 selection:bg-blue-500/30 overflow-x-hidden", isDarkMode ? "bg-[#050505] text-white selection:text-blue-200" : "bg-[#FAFAFA] text-slate-900 selection:text-blue-900")}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className={cn("absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full blur-[120px] opacity-20 transition-colors duration-1000", isDarkMode ? "bg-blue-900/40" : "bg-blue-100/60")} />
        <div className={cn("absolute -bottom-[10%] -right-[5%] w-[60%] h-[60%] rounded-full blur-[100px] opacity-10 transition-colors duration-1000", isDarkMode ? "bg-purple-900/30" : "bg-purple-100/40")} />
      </div>

      <header className={cn("px-4 sm:px-6 py-4 sm:py-5 sticky top-0 z-40 flex justify-between items-center transition-all duration-300 backdrop-blur-2xl border-b", isDarkMode ? "bg-black/60 border-white/[0.03] shadow-[0_4px_20px_-10px_rgba(0,0,0,0.5)]" : "bg-white/70 border-slate-200/60 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)]")}>
        <div className="flex flex-col group cursor-default">
          <h1 className="font-display font-black text-2xl tracking-tighter transition-all group-hover:tracking-normal duration-200">
            <span className={cn("text-gradient bg-linear-to-br", isDarkMode ? "from-white via-slate-200 to-slate-400" : "from-slate-900 via-slate-700 to-slate-600")}>WorkSync</span>
          </h1>
          <p className="text-[8px] sm:text-[10px] font-black tracking-[0.25em] text-blue-500/60 uppercase">{calendarData.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => handleTabChange("calendar")} className={cn("w-10 h-10 rounded-2xl flex items-center justify-center transition-all active:scale-90 hover:scale-105", isDarkMode ? "bg-white/[0.03] text-slate-400 hover:text-white border border-white/[0.05] hover:bg-white/[0.08]" : "bg-white text-slate-500 border border-slate-200/60 shadow-soft hover:bg-slate-50 hover:text-slate-900")}>
            <CalendarDays size={18} strokeWidth={2} />
          </button>
          <button onClick={() => handleTabChange("settings")} className="w-10 h-10 rounded-2xl flex items-center justify-center text-white text-sm font-black border shadow-lg transition-all active:scale-90 hover:scale-110 hover:rotate-3" style={{ backgroundColor: user.color, borderColor: isDarkMode ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.08)", boxShadow: `0 8px 16px -4px ${user.color}44` }}>
            {(user.name || "U").charAt(0).toUpperCase()}
          </button>
        </div>
      </header>

      <main ref={mainRef} className="flex-1 w-full max-w-[500px] mx-auto px-4 sm:px-6 relative z-10 pb-[120px] min-h-[100dvh]">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={activeTab}
            custom={direction}
            initial={{ opacity: 0, x: direction * 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -20 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.1}
            onDragEnd={(_, info) => {
              const threshold = 50;
              const allTabs: typeof activeTab[] = ["calendar", "finance", "goals", "share", "settings"];
              const available = allTabs.filter((t) => t !== "goals" || user.showGoals);
              const currentIndex = available.indexOf(activeTab as any);
              if (info.offset.x > threshold && currentIndex > 0) handleTabChange(available[currentIndex - 1]);
              else if (info.offset.x < -threshold && currentIndex < available.length - 1) handleTabChange(available[currentIndex + 1]);
            }}
            className="w-full"
          >
            {activeTab === "calendar" ? (
              <CalendarView currentMonth={currentMonth} setCurrentMonth={setCurrentMonth} calendarData={calendarData} updateCalendar={updateCalendar} user={user} onDateClick={(date) => { setSelectedDate(date); setIsModalOpen(true); }} primaryColor={primaryColor} isDarkMode={isDarkMode} t={t} currentLocale={currentLocale} calendarMode={calendarMode} setCalendarMode={setCalendarMode} />
            ) : activeTab === "finance" ? (
              <Suspense fallback={<div className="py-16 text-center text-sm text-slate-500">Carregando finanças...</div>}>
                <FinanceView
                  calendarData={{ ...calendarData, expenses: userFinances.expenses, incomes: userFinances.incomes, registrosFinanceiros: userFinances.registrosFinanceiros }}
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
                <ShareView calendarId={calendarId} calendarData={calendarData} updateCalendar={updateCalendar} primaryColor={primaryColor} isDarkMode={isDarkMode} isAdmin={isAdmin} t={t} />
              </Suspense>
            ) : (
              <Suspense fallback={<div className="py-16 text-center text-sm text-slate-500">Carregando configurações...</div>}>
                <SettingsComponent user={user} onUpdateUser={handleUpdateUser} onLogout={handleLogout} isDarkMode={isDarkMode} calendarId={calendarId} inviteCode={calendarData.inviteCode || calendarId} calendarUsers={calendarData.users || []} language={language} onUpdateLanguage={(lang) => { setLanguage(lang); handleUpdateUser({ language: lang }); }} t={t} />
              </Suspense>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <nav className={cn("fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-[480px] h-[76px] px-6 flex justify-around items-center z-[100] transition-all duration-300 backdrop-blur-3xl rounded-[32px] border", isDarkMode ? "bg-[#090909]/80 border-white/[0.05] shadow-[0_20px_40px_rgba(0,0,0,0.6)]" : "bg-white/80 border-slate-200/60 shadow-[0_20px_40px_rgba(0,0,0,0.08)]")}>
        {[
          { id: "calendar", icon: CalendarDays, label: t("calendar") },
          { id: "finance", icon: DollarSign, label: t("finance") },
          ...(user?.showGoals ? [{ id: "goals", icon: TrendingUp, label: t("meta_financeira") }] : []),
          { id: "share", icon: Share2, label: t("share") },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => handleTabChange(tab.id as any)} className={cn("relative flex flex-col items-center justify-center gap-1 group transition-all duration-200", isActive ? "scale-110" : "opacity-40 hover:opacity-100")}>
              <div className={cn("p-3 rounded-2xl transition-all duration-200", isActive ? "bg-blue-500/10 text-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.2)]" : "text-slate-500")} style={isActive ? { color: primaryColor, backgroundColor: `${primaryColor}15` } : {}}>
                <tab.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              {isActive && <motion.div layoutId="active-dot" className="w-1 h-1 rounded-full absolute -bottom-2" style={{ backgroundColor: primaryColor }} />}
              {tab.id === "share" && (calendarData.pendingUsers || []).length > 0 && (
                <div className="absolute top-1 right-1 w-4 h-4 bg-amber-500 rounded-full border-2 border-white dark:border-black flex items-center justify-center text-[8px] font-black text-white">
                  {(calendarData.pendingUsers || []).length}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      <AnimatePresence>
        {isModalOpen && selectedDate && (
          <Suspense fallback={<div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/80 text-white">Carregando...</div>}>
            <DayModal
              date={selectedDate}
              user={user}
              calendarData={{ ...calendarData, expenses: userFinances.expenses, incomes: userFinances.incomes }}
              updateCalendar={updateCalendar}
              onClose={() => setIsModalOpen(false)}
              initialTab={calendarMode === "expenses" ? "expenses" : "commitments"}
              onSave={(workDays, expenses, incomes = []) => {
                const affectedWorkDates = workDays.map((wd) => format(parseISO(wd.date), "yyyy-MM-dd"));
                const updatedWorkDays = [...(calendarData.workDays || [])].filter((wd) => {
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
                onSaveDay(workDays, expenses, incomes);
                setCalendarData((prev) => ({ ...prev, workDays: [...updatedWorkDays, ...workDays] }));
                setUserFinances((prev) => ({ ...prev, expenses: [...updatedExpenses, ...expenses], incomes: [...updatedIncomes, ...incomes] }));
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
