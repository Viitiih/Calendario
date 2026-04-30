import * as React from "react";
import { memo, useMemo } from "react";
import { 
  isSameMonth, 
  parseISO,
  isSameYear
} from "date-fns";
import { 
  Plus, 
  Target, 
  TrendingUp, 
  PieChart, 
  Zap, 
  ChevronRight 
} from "lucide-react";
import { cn, formatCurrency, EXPENSE_COLOR } from "../lib/utils";
import { CalendarData, User } from "../types";
import { CircularProgressbarWithChildren, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';

interface GoalsViewProps {
  calendarData: CalendarData;
  user: User;
  isDarkMode: boolean;
  primaryColor: string;
  onUpdateUser: (updates: Partial<User>) => void;
  t: (key: string) => string;
}

export const GoalsView = memo(({ 
  calendarData, 
  user, 
  isDarkMode, 
  primaryColor, 
  onUpdateUser, 
  t 
}: GoalsViewProps) => {
  const stats = useMemo(() => {
    const monthWorkDays = (calendarData.workDays || []).filter(wd => {
      const d = parseISO(wd.date);
      return isSameMonth(d, new Date()) && isSameYear(d, new Date());
    });
    
    const monthExpenses = (calendarData.expenses || []).filter(e => isSameMonth(parseISO(e.date), new Date()));
    const monthIncomes = (calendarData.incomes || []).filter(i => isSameMonth(parseISO(i.date), new Date()));
    
    const gross = monthWorkDays.reduce((acc, curr) => acc + (curr.value || 0), 0) + monthIncomes.reduce((acc, curr) => acc + (curr.value || 0), 0);
    const expenses = monthExpenses.reduce((acc, curr) => acc + (curr.value || 0) * (curr.quantity || 1), 0);
    
    const currentAmount = user.showExpensesInGoals ? (gross - expenses) : gross;
    const progress = user.monthlyGoal ? (currentAmount / user.monthlyGoal) * 100 : 0;
    
    return { gross, expenses, currentAmount, progress };
  }, [calendarData, user.monthlyGoal, user.showExpensesInGoals]);

  return (
    <div className="space-y-6">
      {/* Target Progress Card */}
      <div className={cn(
        "rounded-[40px] p-8 border transition-all duration-300 relative overflow-hidden",
        isDarkMode ? "bg-[#111111] border-white/5" : "bg-white border-slate-200 shadow-xl"
      )}>
        <div className="flex flex-col items-center justify-center space-y-8">
          <div className="w-56 h-56 relative">
            <CircularProgressbarWithChildren
              value={stats.progress}
              strokeWidth={12}
              styles={buildStyles({
                pathColor: primaryColor,
                trailColor: isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                strokeLinecap: "round",
                pathTransitionDuration: 1
              })}
            >
              <div className="flex flex-col items-center justify-center text-center px-4">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">{t('net_balance')}</span>
                <span className={cn("text-2xl sm:text-3xl font-black tracking-tighter", isDarkMode ? "text-white" : "text-slate-900")}>
                  {Math.round(stats.progress)}%
                </span>
                <span className="text-[10px] font-bold text-slate-500 mt-1">
                  {formatCurrency(stats.currentAmount)}
                </span>
              </div>
            </CircularProgressbarWithChildren>
          </div>

          <div className="w-full space-y-6">
            <div className="flex justify-between items-center px-2">
              <div className="space-y-1">
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none">{t('monthly_goal')}</p>
                 <p className={cn("text-lg sm:text-xl font-black", isDarkMode ? "text-slate-200" : "text-slate-900")}>{formatCurrency(user.monthlyGoal || 0)}</p>
              </div>
              <button 
                onClick={() => {
                  const val = prompt(t('monthly_goal'), (user.monthlyGoal || 0).toString());
                  if (val !== null) onUpdateUser({ monthlyGoal: parseFloat(val) || 0 });
                }}
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90",
                  isDarkMode ? "bg-white/5 text-white" : "bg-slate-100 text-slate-600"
                )}
              >
                <Plus size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className={cn(
                "p-4 rounded-2xl border transition-all",
                isDarkMode ? "bg-white/5 border-white/5" : "bg-slate-50 border-slate-100"
              )}>
                 <div className="flex items-center gap-2 mb-1.5">
                  <TrendingUp size={14} className="text-emerald-500" />
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">{t('gross')}</span>
                </div>
                <p className={cn("text-sm font-black", isDarkMode ? "text-white" : "text-slate-900")}>{formatCurrency(stats.gross)}</p>
              </div>
              <div className={cn(
                "p-4 rounded-2xl border transition-all",
                isDarkMode ? "bg-white/5 border-white/5" : "bg-slate-50 border-slate-100"
              )}>
                 <div className="flex items-center gap-2 mb-1.5">
                  <PieChart size={14} style={{ color: EXPENSE_COLOR }} />
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">{t('expenses')}</span>
                </div>
                <p className={cn("text-sm font-black", isDarkMode ? "text-white" : "text-slate-900")}>{formatCurrency(stats.expenses)}</p>
              </div>
            </div>

            <button 
              onClick={() => onUpdateUser({ showExpensesInGoals: !user.showExpensesInGoals })}
              className={cn(
                "w-full p-4 rounded-2xl border flex items-center justify-between transition-all active:scale-95",
                isDarkMode ? "bg-black/40 border-white/5" : "bg-white border-slate-100"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center",
                  user.showExpensesInGoals ? "bg-emerald-500/10 text-emerald-500" : "bg-slate-400/10 text-slate-400"
                )}>
                  <Zap size={16} />
                </div>
                <span className={cn("text-xs font-bold", isDarkMode ? "text-slate-300" : "text-slate-700")}>{t('show_expenses')}</span>
              </div>
              <div className={cn(
                "w-12 h-6 rounded-full transition-all relative",
                user.showExpensesInGoals ? "bg-emerald-500" : "bg-slate-700"
              )}>
                <div className={cn(
                  "absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm",
                  user.showExpensesInGoals ? "left-7" : "left-1"
                )} />
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
