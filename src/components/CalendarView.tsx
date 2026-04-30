import * as React from "react";
import { memo, useState } from "react";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  eachDayOfInterval,
  parseISO,
  isSameYear
} from "date-fns";
import { ChevronLeft, ChevronRight, PieChart, Activity, Zap, Users, Eraser, TrendingDown } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn, formatCurrency, EXPENSE_COLOR } from "../lib/utils";
import { CalendarData, User } from "../types";

export const getSplitGradient = (workDays: any[], calendarUsers: any[] = []) => {
  if (workDays.length === 0) return "transparent";
  
  const colors = [...new Set(workDays.map(wd => {
    if (!wd) return "#3B82F6";
    const calendarUser = (calendarUsers || []).find(u => u && u.id === wd.userId);
    return calendarUser ? calendarUser.color : (wd.userId || "#3B82F6");
  }))].filter(c => typeof c === 'string' && c.startsWith('#'));
  
  if (colors.length === 1) return colors[0];

  const step = 100 / colors.length;
  let gradient = "linear-gradient(to right, ";
  colors.forEach((color, i) => {
    gradient += `${color} ${i * step}%, ${color} ${(i + 1) * step}%${i === colors.length - 1 ? "" : ", "}`;
  });
  gradient += ")";
  return gradient;
};

interface CalendarViewProps {
  currentMonth: Date;
  setCurrentMonth: (d: Date) => void;
  calendarData: CalendarData;
  updateCalendar: (d: CalendarData) => void;
  user: User;
  onDateClick: (d: Date) => void;
  primaryColor: string;
  isDarkMode: boolean;
  t: (key: string) => string;
  currentLocale: any;
  calendarMode: 'work' | 'expenses';
  setCalendarMode: (m: 'work' | 'expenses') => void;
}

export const CalendarView = memo(({ 
  currentMonth, 
  setCurrentMonth, 
  calendarData, 
  updateCalendar,
  user, 
  onDateClick, 
  primaryColor, 
  isDarkMode, 
  t, 
  currentLocale,
  calendarMode,
  setCalendarMode
}: CalendarViewProps) => {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const [isEraseMode, setIsEraseMode] = useState(false);

  const nextMonth = () => setCurrentMonth(addDays(monthEnd, 1));
  const prevMonth = () => setCurrentMonth(addDays(monthStart, -1));

  const handleDayClick = (day: Date) => {
    if (!day) return;
    if (isEraseMode) {
      const remainingWorkDays = (calendarData.workDays || []).filter(wd => {
        if (!wd || !wd.date) return true;
        return !isSameDay(parseISO(wd.date), day) || wd.userId !== user.id;
      });
      updateCalendar({ ...calendarData, workDays: remainingWorkDays });
    } else {
      onDateClick(day);
    }
  };

  const dayDataMap = React.useMemo(() => {
    const map: Record<string, { work: any[], study: any[], expenses: any[] }> = {};
    
    (calendarData.workDays || []).forEach(wd => {
      if (!wd || !wd.date) return;
      const dateKey = wd.date.split('T')[0]; // Use YYYY-MM-DD
      if (!map[dateKey]) map[dateKey] = { work: [], study: [], expenses: [] };
      if (wd.type === 'study') {
        map[dateKey].study.push(wd);
      } else {
        map[dateKey].work.push(wd);
      }
    });

    (calendarData.expenses || []).forEach(e => {
      if (!e || !e.date) return;
      const dateKey = e.date.split('T')[0];
      if (!map[dateKey]) map[dateKey] = { work: [], study: [], expenses: [] };
      map[dateKey].expenses.push(e);
    });

    return map;
  }, [calendarData.workDays, calendarData.expenses]);

  const stats = React.useMemo(() => {
    const monthWorkDays = (calendarData.workDays || []).filter(wd => {
      if (!wd || !wd.date) return false;
      const d = parseISO(wd.date);
      return isSameMonth(d, currentMonth) && isSameYear(d, currentMonth);
    });
    
    const totalValue = monthWorkDays.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);
    const totalHours = monthWorkDays.reduce((acc, curr) => {
      let durationMinutes = 0;
      
      if (curr.startTime && curr.endTime && typeof curr.startTime === 'string' && typeof curr.endTime === 'string') {
        const [h1, m1] = curr.startTime.split(':').map(Number);
        const [h2, m2] = curr.endTime.split(':').map(Number);
        durationMinutes = (h2 * 60 + (m2 || 0)) - (h1 * 60 + (m1 || 0));
        if (durationMinutes < 0) durationMinutes += 24 * 60;
      } else if (curr.hours && typeof curr.hours === 'string') {
        const parts = curr.hours.split("-");
        if (parts.length === 2) {
          try {
            const [h1, m1] = parts[0].trim().split(":").map(Number);
            const [h2, m2] = parts[1].trim().split(":").map(Number);
            durationMinutes = (h2 * 60 + (m2 || 0)) - (h1 * 60 + (m1 || 0));
            if (durationMinutes < 0) durationMinutes += 24 * 60;
          } catch (e) {}
        }
      }
      
      return acc + (durationMinutes / 60);
    }, 0);

    return { totalValue, totalHours: Math.round(totalHours * 10) / 10, count: monthWorkDays.length };
  }, [calendarData.workDays, currentMonth]);

  return (
    <div className="space-y-6">
      {/* Mini Dashboard */}
      <AnimatePresence>
        {isEraseMode && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={cn(
              "p-4 rounded-3xl border text-center relative overflow-hidden",
              isDarkMode ? "bg-rose-500/10 border-rose-500/20 text-rose-400" : "bg-rose-50 border-rose-100 text-rose-600"
            )}
          >
            <div className="flex items-center justify-center gap-3">
              <Eraser size={16} className="animate-bounce" />
              <p className="text-[10px] font-black uppercase tracking-widest">{t('erase_mode_on')}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: PieChart, label: t('total_hours'), value: `${stats.totalHours}h`, color: 'blue' },
          { icon: Zap, label: t('gross'), value: formatCurrency(stats.totalValue), color: 'emerald' },
          { icon: Activity, label: t('days'), value: stats.count, color: 'purple' }
        ].map((item, id) => (
          <div key={id} className={cn(
            "p-3 rounded-2xl border transition-all duration-200 hover:scale-[1.02] active:scale-95 group",
            isDarkMode ? "bg-white/[0.03] border-white/[0.05] hover:bg-white/[0.06]" : "bg-white border-slate-200/60 shadow-soft hover:shadow-premium"
          )}>
            <div className={cn(
              "w-7 h-7 rounded-lg flex items-center justify-center mb-2 transition-transform duration-200 group-hover:scale-110",
              item.color === 'blue' ? "bg-blue-500/10 text-blue-500" :
              item.color === 'emerald' ? "bg-emerald-500/10 text-emerald-500" :
              "bg-purple-500/10 text-purple-500"
            )}>
              <item.icon size={14} strokeWidth={2.5} />
            </div>
            <p className="tech-label opacity-40 mb-1">{item.label}</p>
            <p className={cn(
              "text-xs font-tech font-bold tracking-tight",
              isDarkMode ? "text-slate-100" : "text-slate-900"
            )}>{item.value}</p>
          </div>
        ))}
      </div>

      <motion.div 
        layout
        className={cn(
          "rounded-[40px] border p-6 transition-all duration-300 relative overflow-hidden",
          isDarkMode 
            ? "bg-black/40 border-white/[0.03] shadow-2xl" 
            : "bg-white border-slate-200/60 shadow-premium"
        )}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={(_, info) => {
          const swipeThreshold = 50;
          if (info.offset.x < -swipeThreshold) {
            nextMonth();
          } else if (info.offset.x > swipeThreshold) {
            prevMonth();
          }
        }}
      >
        {/* Subtle pattern background for calendar card */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

        <div className="flex flex-col gap-6 mb-8 relative z-10 w-full overflow-hidden">
          {/* Row 1: Month + Year and Navigation Arrows */}
          <div className="flex justify-between items-center w-full">
            <div className="flex flex-col group min-w-0 flex-1">
              <AnimatePresence mode="wait">
                <motion.h2 
                  key={currentMonth.toISOString()}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className={cn(
                    "text-2xl sm:text-3xl font-display font-black capitalize tracking-tighter truncate transition-all group-hover:tracking-normal duration-200",
                    isDarkMode ? "text-white" : "text-slate-900"
                  )}
                >
                  {format(currentMonth, "MMMM", { locale: currentLocale })}
                </motion.h2>
              </AnimatePresence>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-1 h-1 rounded-full bg-blue-500" />
                <p className="tech-label tracking-[0.3em] text-[10px]">
                  {format(currentMonth, "yyyy")}
                </p>
              </div>
            </div>

            <div className="flex gap-2 bg-slate-500/5 p-1 rounded-2xl border border-white/5 shrink-0">
              <button 
                onClick={prevMonth} 
                className={cn(
                  "p-2.5 rounded-xl transition-all active:scale-90 hover:bg-white/10",
                  isDarkMode ? "text-slate-400 hover:text-white" : "text-slate-400 hover:text-slate-900"
                )}
              >
                <ChevronLeft size={18} strokeWidth={2.5} />
              </button>
              <button 
                onClick={nextMonth} 
                className={cn(
                  "p-2.5 rounded-xl transition-all active:scale-90 hover:bg-white/10",
                  isDarkMode ? "text-slate-400 hover:text-white" : "text-slate-400 hover:text-slate-900"
                )}
              >
                <ChevronRight size={18} strokeWidth={2.5} />
              </button>
            </div>
          </div>

          {/* Row 2: Tabs (Work/Expenses) and Action Button */}
          <div className="flex items-center gap-2 w-full">
            <div className={cn(
              "flex flex-1 items-center gap-2 p-1 rounded-full border transition-all relative overflow-x-auto no-scrollbar whitespace-nowrap",
              isDarkMode ? "bg-white/5 border-white/5" : "bg-slate-100 border-slate-200"
            )}>
              <button
                onClick={(e) => { e.stopPropagation(); setCalendarMode('work'); }}
                className={cn(
                  "relative flex-1 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all z-10 shrink-0",
                  calendarMode === 'work'
                    ? (isDarkMode ? "text-white" : "text-white")
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                )}
              >
                <span className="relative z-10">{t('work')}</span>
                {calendarMode === 'work' && (
                  <motion.div 
                    layoutId="mode-pill"
                    className="absolute inset-0 rounded-full shadow-sm z-0"
                    style={{ backgroundColor: primaryColor }}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setCalendarMode('expenses'); }}
                className={cn(
                  "relative flex-1 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all z-10 shrink-0",
                  calendarMode === 'expenses'
                    ? (isDarkMode ? "text-white" : "text-white")
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                )}
              >
                <span className="relative z-10">Finanças</span>
                {calendarMode === 'expenses' && (
                  <motion.div 
                    layoutId="mode-pill"
                    className="absolute inset-0 rounded-full shadow-sm z-0"
                    style={{ backgroundColor: EXPENSE_COLOR }}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </button>
            </div>

            <button
              onClick={(e) => { e.stopPropagation(); setIsEraseMode(!isEraseMode); }}
              className={cn(
                "flex items-center justify-center w-10 h-10 rounded-full border transition-all shrink-0",
                isEraseMode 
                  ? "bg-rose-500 border-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.5)]" 
                  : (isDarkMode ? "bg-white/5 border-white/5 text-slate-400 hover:bg-white/10" : "bg-white border-slate-200 text-slate-400 hover:bg-slate-50 shadow-sm")
              )}
            >
              <Eraser size={16} className={isEraseMode ? "animate-pulse" : ""} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-1.5 text-[10px] sm:text-xs text-center mb-1">
          {days.slice(0, 7).map((day, i) => {
            const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
            return (
              <div key={`header-${i}`} className="font-bold opacity-60 py-1.5 sm:py-2 truncate">
                {WEEKDAYS[day.getDay()]}
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-7 gap-y-1.5 gap-x-1 sm:gap-y-3 sm:gap-x-1.5 mb-2 relative z-10">
          {days.map(day => {
            const dateKey = format(day, "yyyy-MM-dd");
            const data = dayDataMap[dateKey] || { work: [], study: [], expenses: [] };
            
            const isWorkDay = data.work.length > 0;
            const isStudyDay = data.study.length > 0;
            const hasExpenses = data.expenses.length > 0;
            const isCurrentMonth = isSameMonth(day, monthStart);
            const isToday = isSameDay(day, new Date());
            
            return (
              <motion.button
                key={day.toISOString()}
                onClick={(e) => { e.stopPropagation(); handleDayClick(day); }}
                whileTap={{ scale: 0.95 }}
                animate={{ 
                  opacity: !isCurrentMonth && !(calendarMode === 'work' ? (isWorkDay || isStudyDay) : hasExpenses) ? 0.1 : 1,
                  scale: !isCurrentMonth && !(calendarMode === 'work' ? (isWorkDay || isStudyDay) : hasExpenses) ? 0.9 : 1,
                }}
                transition={{ duration: 0.2 }}
                className={cn(
                  "relative aspect-square rounded-2xl transition-all duration-200 group",
                  isToday ? (isDarkMode ? "bg-white/10 ring-2 ring-white/30" : "bg-slate-100 ring-2 ring-blue-500/20") : (isDarkMode ? "bg-white/[0.02]" : "bg-white"),
                  isEraseMode && isWorkDay ? "ring-2 ring-rose-500 ring-offset-2 ring-offset-transparent shadow-[0_0_15px_rgba(244,63,94,0.3)] zoom-in-[1.02]" : ""
                )}
              >
                <div className={cn(
                  "absolute inset-0 rounded-2xl transition-opacity duration-200 opacity-0 group-hover:opacity-100",
                  isDarkMode ? "bg-white/5" : "bg-slate-500/5"
                )} />

                <span className={cn(
                  "text-xs font-display font-black transition-all absolute top-1 left-2 z-10 drop-shadow-sm",
                  isToday ? (isDarkMode ? "text-white" : "text-blue-600") : (isDarkMode ? "text-slate-500" : "text-slate-400"),
                  "group-hover:scale-110"
                )}>
                  {format(day, "d")}
                </span>

                {/* Indicators container */}
                <div className="absolute bottom-1 left-1 flex flex-wrap gap-1 z-10 max-w-[90%] pointer-events-none">
                  <AnimatePresence mode="popLayout">
                    {/* Work dots (One per entry) */}
                    {calendarMode === 'work' && data.work.map((wd, idx) => {
                        const u = (calendarData.users || []).find(u => u && u.id === wd.userId);
                        const color = (u ? u.color : wd.userId) || "#3B82F6";
                        return (
                          <motion.div 
                            key={`work-${wd.id || idx}`}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 500, damping: 30, delay: idx * 0.05 }}
                            className="w-2 h-2 rounded-full shadow-sm border border-black/5"
                            style={{ backgroundColor: color }}
                          />
                        );
                      })}

                    {/* Study dots */}
                    {calendarMode === 'work' && data.study.map((wd, idx) => (
                        <motion.div 
                          key={`study-${wd.id || idx}`}
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{ type: "spring", stiffness: 500, damping: 30, delay: idx * 0.05 }}
                          className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.4)] border border-blue-300/30"
                        />
                      ))}

                    {/* Expense dots */}
                    {calendarMode === 'expenses' && data.expenses.map((e, idx) => (
                        <motion.div 
                          key={`exp-${e.id || idx}`}
                          initial={{ scale: 0, opacity: 0, rotate: 45 }}
                          animate={{ scale: 1, opacity: 1, rotate: 45 }}
                          exit={{ scale: 0, opacity: 0, rotate: 45 }}
                          transition={{ type: "spring", stiffness: 500, damping: 30, delay: idx * 0.05 }}
                          className="w-1.5 h-1.5 rounded-[1px] border border-white/10"
                          style={{ 
                            backgroundColor: EXPENSE_COLOR,
                            boxShadow: `0 0 8px ${EXPENSE_COLOR}66`
                          }}
                        />
                      ))}
                  </AnimatePresence>
                </div>

                <AnimatePresence>
                  {calendarMode === 'work' && isWorkDay && data.work[0]?.startTime && data.work[0]?.endTime && (
                    <motion.div 
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="absolute top-1 right-2 text-right pointer-events-none z-10"
                    >
                      <span className="text-[7px] font-black tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap text-slate-500">
                        {data.work[0].startTime} - {data.work[0].endTime}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </div>
      </motion.div>
      
      {/* Calendar Members Overlay */}
      <div className="flex flex-wrap items-center gap-2 px-2 pb-10">
        <Users size={14} className="text-slate-400 mr-2" />
        {(calendarData.users || []).map(u => (
          <div 
            key={u.id}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all",
              isDarkMode ? "bg-white/5 border-white/5 text-slate-300" : "bg-white border-slate-100 text-slate-600 shadow-xs"
            )}
          >
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: u.color }} />
            {u.name}
            {u.id === user.id && <span className="opacity-40">({t('me')})</span>}
          </div>
        ))}
      </div>
    </div>
  );
});
