import * as React from "react";
import { memo, useState, useMemo } from "react";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  isSameMonth, 
  parseISO,
  isSameYear,
  isSameDay,
  startOfDay,
  endOfDay
} from "date-fns";
import { 
  Plus, 
  Search, 
  Filter, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  ChevronDown,
  X,
  Wallet,
  Check,
  Download,
  Calendar
} from "lucide-react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { cn, formatCurrency, EXPENSE_COLOR } from "../lib/utils";
import { CalendarData, Expense, Income, FinanceRecord } from "../types";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, getCategoryIcon, getCategoryColor } from "../constants";

interface FinanceViewProps {
  calendarData: CalendarData;
  updateCalendar: (d: CalendarData) => void;
  onAddFinanceRecord?: (record: any, type: "expense" | "income") => void;
  primaryColor: string;
  isDarkMode: boolean;
  t: (key: string) => string;
  currentLocale: any;
  currentMonth: Date;
}

export const FinanceView = memo(({ 
  calendarData, 
  updateCalendar, 
  onAddFinanceRecord,
  primaryColor, 
  isDarkMode, 
  t,
  currentMonth
}: FinanceViewProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  
  // State for date filters
  const [dateFilterType, setDateFilterType] = useState<"month" | "day" | "custom">("month");
  const [dateFilterDay, setDateFilterDay] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [dateFilterStart, setDateFilterStart] = useState(() => format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [dateFilterEnd, setDateFilterEnd] = useState(() => format(endOfMonth(new Date()), "yyyy-MM-dd"));
  
  // State for adding new transactions directly from finance view
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<"expense" | "income">("expense");
  const [newItemName, setNewItemName] = useState("");
  const [newItemValue, setNewItemValue] = useState("");
  const [newItemDate, setNewItemDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [newItemCategory, setNewItemCategory] = useState("food");
  const [showFeedback, setShowFeedback] = useState(false);
  const [formError, setFormError] = useState("");
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

  const allTransactions = useMemo(() => {
    const list: FinanceRecord[] = [];
    if (calendarData.registrosFinanceiros) {
      list.push(...calendarData.registrosFinanceiros);
    }
    if (calendarData.expenses) {
      calendarData.expenses.forEach(e => {
        list.push({
          id: e.id,
          tipo: "gasto",
          descricao: e.name || "Sem Nome",
          valor: Math.abs((e.value || 0) * (e.quantity || 1)),
          categoria: e.category || "outros",
          data: e.date
        });
      });
    }
    if (calendarData.incomes) {
      calendarData.incomes.forEach(i => {
        list.push({
          id: i.id,
          tipo: "receber",
          descricao: i.name || "Sem Nome",
          valor: Math.abs(i.value || 0),
          categoria: i.category || "outros",
          data: i.date
        });
      });
    }
    return list;
  }, [calendarData.registrosFinanceiros, calendarData.expenses, calendarData.incomes]);

  const monthTransactions = useMemo(() => {
    return allTransactions.filter(r => {
      const d = parseISO(r.data);
      return isSameMonth(d, currentMonth) && isSameYear(d, currentMonth);
    });
  }, [allTransactions, currentMonth]);

  const periodTransactions = useMemo(() => {
    return allTransactions.filter(r => {
      const d = parseISO(r.data);
      if (dateFilterType === "month") {
        return isSameMonth(d, currentMonth) && isSameYear(d, currentMonth);
      } else if (dateFilterType === "day") {
        try {
          const filterDay = parseISO(dateFilterDay);
          return isSameDay(d, filterDay);
        } catch { return true; }
      } else if (dateFilterType === "custom") {
        try {
          const start = startOfDay(parseISO(dateFilterStart));
          const end = endOfDay(parseISO(dateFilterEnd));
          return d.getTime() >= start.getTime() && d.getTime() <= end.getTime();
        } catch { return true; }
      }
      return true;
    });
  }, [allTransactions, currentMonth, dateFilterType, dateFilterDay, dateFilterStart, dateFilterEnd]);

  const stats = useMemo(() => {
    const now = new Date();
    // Use end of today as the boundary for "realized" vs "future"
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    let realizedWork = 0;
    let futureWork = 0;

    (calendarData.workDays || []).forEach(wd => {
      const d = parseISO(wd.date);
      let inPeriod = false;
      if (dateFilterType === "month") {
        inPeriod = isSameMonth(d, currentMonth) && isSameYear(d, currentMonth);
      } else if (dateFilterType === "day") {
        try {
          const filterDay = parseISO(dateFilterDay);
          inPeriod = isSameDay(d, filterDay);
        } catch {}
      } else if (dateFilterType === "custom") {
        try {
           const start = startOfDay(parseISO(dateFilterStart));
           const end = endOfDay(parseISO(dateFilterEnd));
           inPeriod = d.getTime() >= start.getTime() && d.getTime() <= end.getTime();
        } catch {}
      }

      if (inPeriod) {
        if (d <= endOfToday) {
          realizedWork += (wd.value || 0);
        } else {
          futureWork += (wd.value || 0);
        }
      }
    });

    let realizedExtra = 0;
    let futureExtra = 0;
    let totalExpenses = 0;

    periodTransactions.forEach(r => {
      if (r.tipo === "gasto") {
        totalExpenses += r.valor;
      } else {
        const d = parseISO(r.data);
        if (d <= endOfToday) {
          realizedExtra += r.valor;
        } else {
          futureExtra += r.valor;
        }
      }
    });
    
    const realizedGross = realizedWork + realizedExtra;
    const futureGross = futureWork + futureExtra;
    const currentNet = realizedGross - totalExpenses; // Subtracts the absolute value of expenses
    const estimatedTotal = currentNet + futureGross;
    
    return { 
      gross: realizedGross + futureGross, // total gross for backward compatibility
      totalExpenses, 
      currentNet, 
      futureGross,
      estimatedTotal
    };
  }, [calendarData.workDays, periodTransactions, currentMonth, dateFilterType, dateFilterDay, dateFilterStart, dateFilterEnd]);

  const filteredTransactions = monthTransactions.filter(r => {
    const matchesSearch = r.descricao.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === "all" || r.categoria === activeCategory;
    const matchesType = (transactionType === "expense" && r.tipo === "gasto") || (transactionType === "income" && r.tipo === "receber");
    return matchesSearch && matchesCategory && matchesType;
  }).sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  const handleSaveTransaction = () => {
    if (!newItemName) {
      setFormError("A descrição do registro é obrigatória.");
      return;
    }
    if (!newItemValue) {
      setFormError("O valor não existe ou é inválido.");
      return;
    }
    
    const rawDigits = newItemValue.replace(/\D/g, '');
    const valueNum = rawDigits ? parseInt(rawDigits, 10) / 100 : Number.NaN;
    if (isNaN(valueNum) || valueNum <= 0) {
      setFormError("O valor não existe ou é inválido. Informar valor maior que zero.");
      return;
    }
    
    if (!transactionType) {
      setFormError("Você deve escolher entre 'Gasto' ou 'A Receber'.");
      return;
    }
    
    setFormError("");

    let recordDate;
    if (newItemDate) {
      recordDate = parseISO(newItemDate);
      if (isNaN(recordDate.getTime())) recordDate = new Date();
    } else {
      recordDate = new Date();
      if (!isSameMonth(currentMonth, recordDate) || !isSameYear(currentMonth, recordDate)) {
        recordDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1, 12, 0, 0);
      }
    }

    const newRecord: FinanceRecord = {
      id: Math.random().toString(36).substr(2, 9),
      tipo: transactionType === "expense" ? "gasto" : "receber",
      descricao: newItemName,
      valor: valueNum,
      categoria: newItemCategory,
      data: recordDate.toISOString()
    };

    if (onAddFinanceRecord) {
      onAddFinanceRecord(newRecord, transactionType);
    }

    setNewItemName("");
    setNewItemValue("");
    setNewItemDate(new Date().toISOString().substring(0, 10));
    setNewItemCategory(transactionType === "expense" ? "food" : "salary");
    setIsAddModalOpen(false);
    
    setShowFeedback(true);
    setTimeout(() => setShowFeedback(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Finance Summary Card */}
      <div className={cn(
        "rounded-[32px] sm:rounded-[40px] p-5 sm:p-8 border transition-all duration-300 relative overflow-hidden",
        isDarkMode 
          ? "bg-black/40 border-white/[0.03] shadow-2xl" 
          : "bg-white border-slate-200/60 shadow-premium"
      )}>
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '16px 16px' }} />

        <div className="flex justify-between items-start mb-5 sm:mb-6 relative z-30">
          <div className="space-y-0.5 sm:space-y-1">
            <h3 className="tech-label tracking-[0.25em]">LÍQUIDO ATUAL</h3>
            <p className={cn(
              "text-4xl sm:text-5xl font-tech font-bold tracking-tighter transition-all duration-300",
              stats.currentNet >= 0 ? (isDarkMode ? "text-emerald-400" : "text-emerald-500") : "text-red-500"
            )}>
              {formatCurrency(stats.currentNet)}
            </p>
          </div>
          <div className="flex flex-col items-end gap-3 right-0 top-0 absolute sm:relative">
            <div className={cn(
              "flex items-center gap-1",
            )}>
              <button 
                onClick={() => setDateFilterType("day")} 
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-colors", 
                  dateFilterType === "day" 
                    ? (isDarkMode ? "bg-white/10 text-slate-100" : "bg-slate-200 text-slate-900") 
                    : "text-slate-500 hover:text-slate-400 hover:bg-white/5"
                )}
              >
                Dia
              </button>
              <button 
                onClick={() => setDateFilterType("month")} 
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-colors", 
                  dateFilterType === "month" 
                    ? (isDarkMode ? "bg-white/10 text-slate-100" : "bg-slate-200 text-slate-900") 
                    : "text-slate-500 hover:text-slate-400 hover:bg-white/5"
                )}
              >
                Mês
              </button>
              <button 
                onClick={() => setDateFilterType("custom")} 
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-colors", 
                  dateFilterType === "custom" 
                    ? (isDarkMode ? "bg-white/10 text-slate-100" : "bg-slate-200 text-slate-900") 
                    : "text-slate-500 hover:text-slate-400 hover:bg-white/5"
                )}
              >
                Pers.
              </button>
            </div>
            
            {dateFilterType === "day" && (
               <div className="animate-in fade-in slide-in-from-top-1">
                 <input 
                   type="date"
                   value={dateFilterDay}
                   onChange={(e) => setDateFilterDay(e.target.value)}
                   className={cn(
                     "bg-transparent border-b focus:outline-none focus:border-emerald-500 pb-1 px-1 text-base sm:text-sm font-bold w-[130px] transition-colors", 
                     isDarkMode ? "border-white/20 text-slate-300" : "border-slate-300 text-slate-700"
                   )}
                 />
               </div>
            )}
            
            {dateFilterType === "custom" && (
               <div className="flex flex-col sm:flex-row gap-2 sm:items-center animate-in fade-in slide-in-from-top-1">
                 <input 
                   type="date"
                   value={dateFilterStart}
                   onChange={(e) => setDateFilterStart(e.target.value)}
                   className={cn(
                     "bg-transparent border-b focus:outline-none focus:border-emerald-500 pb-1 px-1 text-sm font-bold w-[120px] transition-colors", 
                     isDarkMode ? "border-white/20 text-slate-300" : "border-slate-300 text-slate-700"
                   )}
                 />
                 <span className="text-slate-500 hidden sm:block px-1">-</span>
                 <input 
                   type="date"
                   value={dateFilterEnd}
                   onChange={(e) => setDateFilterEnd(e.target.value)}
                   className={cn(
                     "bg-transparent border-b focus:outline-none focus:border-emerald-500 pb-1 px-1 text-sm font-bold w-[120px] transition-colors", 
                     isDarkMode ? "border-white/20 text-slate-300" : "border-slate-300 text-slate-700"
                   )}
                 />
               </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:gap-4 relative z-10 mb-3 sm:mb-4">
          <div className={cn(
            "p-3 sm:p-4 rounded-3xl border transition-all duration-200 group overflow-hidden relative",
            isDarkMode ? "bg-white/[0.03] border-white/[0.05]" : "bg-slate-50/50 border-slate-200/60"
          )}>
            <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
              <div className="w-5 h-5 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${EXPENSE_COLOR}20` }}>
                <TrendingDown size={12} style={{ color: EXPENSE_COLOR }} strokeWidth={3} />
              </div>
              <span className="tech-label text-[8px] sm:text-[10px] tracking-widest opacity-40">GASTOS</span>
            </div>
            <p className={cn("text-lg sm:text-2xl font-tech font-bold break-all", isDarkMode ? "text-white" : "text-slate-900")}>
              {formatCurrency(stats.totalExpenses)}
            </p>
          </div>
          <div className={cn(
            "p-3 sm:p-4 rounded-3xl border transition-all duration-200 group overflow-hidden relative",
            isDarkMode ? "bg-blue-500/10 border-blue-500/20" : "bg-blue-50 border-blue-200"
          )}>
            <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
              <div className="w-5 h-5 rounded-lg flex items-center justify-center bg-blue-500/20">
                <TrendingUp size={12} className="text-blue-600 dark:text-blue-400" strokeWidth={3} />
              </div>
              <span className="tech-label text-[8px] sm:text-[10px] tracking-widest text-blue-600 dark:text-blue-400">A RECEBER</span>
            </div>
            <p className="text-lg sm:text-2xl font-tech font-bold text-blue-600 dark:text-blue-400 break-all">
              +{formatCurrency(stats.futureGross)}
            </p>
          </div>
        </div>

        {/* Estimated Total Banner */}
        <div className={cn(
          "relative z-10 p-3 sm:p-4 rounded-2xl sm:rounded-3xl border flex items-center justify-between transition-all",
          isDarkMode ? "bg-emerald-500/10 border-emerald-500/20" : "bg-emerald-50 border-emerald-200"
        )}>
           <span className="tech-label text-[8px] sm:text-[10px] tracking-widest text-emerald-600 dark:text-emerald-400">TOTAL ESTIMADO</span>
           <span className="text-base sm:text-xl font-tech font-bold text-emerald-600 dark:text-emerald-400">
             {formatCurrency(stats.estimatedTotal)}
           </span>
        </div>
      </div>

      {/* Expenses Management */}
      <div className="space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
             <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
             <h4 className="tech-label tracking-[0.2em]">Detalhamento</h4>
          </div>
          <div className="flex items-center gap-2">
            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className={cn(
                "w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all border",
                isDarkMode ? "bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/[0.05]" : "bg-white border-slate-200 text-slate-500 shadow-soft hover:bg-slate-50"
              )}
              title="Baixar Relatório (CSV)"
              onClick={() => {
                const lines = [
                  "Data,Tipo,Categoria,Descricao,Valor",
                  ...monthTransactions.map(r => `${format(parseISO(r.data), "yyyy-MM-dd")},${r.tipo},${r.categoria},"${r.descricao}",${r.valor}`)
                ];
                const blob = new Blob([lines.join('\n')], { type: "text/csv;charset=utf-8" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `relatorio_financeiro_${format(new Date(), "yyyy-MM")}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              <Download strokeWidth={2.5} className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              className="relative z-[110] w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/30 transition-all"
              onClick={() => setIsAddModalOpen(true)}
            >
              <Plus strokeWidth={3} className="w-[18px] h-[18px] sm:w-5 sm:h-5" />
            </motion.button>
          </div>
        </div>

        {/* Local Scope Tab Switcher */}
        <div className="flex gap-2">
           <button 
             onClick={() => { setTransactionType("expense"); setNewItemCategory("food"); }}
             className={cn("flex-1 py-2 sm:py-3 text-[10px] sm:text-xs uppercase font-black tracking-widest rounded-xl sm:rounded-2xl border transition-all", transactionType === "expense" ? "bg-slate-900 border-slate-900 text-white" : "border-slate-200 text-slate-400 bg-transparent")}
           >Gastos</button>
           <button 
             onClick={() => { setTransactionType("income"); setNewItemCategory("salary"); }}
             className={cn("flex-1 py-2 sm:py-3 text-[10px] sm:text-xs uppercase font-black tracking-widest rounded-xl sm:rounded-2xl border transition-all", transactionType === "income" ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-200 text-slate-400 bg-transparent")}
           >Receitas</button>
        </div>

        <div className="pb-6 pt-2">
          <div className="relative z-50">
            <button
              onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
              className={cn(
                "flex items-center justify-between w-full px-5 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl border transition-all",
                isDarkMode ? "bg-white/[0.03] text-slate-300 border-white/[0.05] hover:bg-white/[0.05]" : "bg-white text-slate-600 border-slate-200 shadow-sm hover:bg-slate-50"
              )}
            >
              <div className="flex items-center gap-3">
                <Filter size={18} className="opacity-70" />
                <span className="text-xs sm:text-sm font-black uppercase tracking-widest">
                  Filtros {activeCategory !== "all" && <span className="ml-2 px-2 py-0.5 rounded-full bg-blue-500 text-white text-[10px]">Ativo</span>}
                </span>
              </div>
              <motion.div
                animate={{ rotate: isFiltersExpanded ? 180 : 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <ChevronDown size={18} className="opacity-50" />
              </motion.div>
            </button>

            <AnimatePresence>
              {isFiltersExpanded && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute left-0 right-0 top-full mt-2 z-50"
                >
                  <div className={cn(
                    "p-3 rounded-xl sm:rounded-2xl border flex flex-col gap-1 shadow-2xl backdrop-blur-xl max-h-[300px] overflow-y-auto no-scrollbar",
                    isDarkMode ? "bg-slate-900/95 border-white/[0.05]" : "bg-white/95 border-slate-200"
                  )}>
                    <button 
                      onClick={() => { setActiveCategory("all"); setIsFiltersExpanded(false); }}
                      className={cn(
                        "flex items-center px-4 py-3 rounded-xl text-xs font-tech font-bold uppercase tracking-[0.1em] transition-all border",
                        activeCategory === "all" 
                          ? (isDarkMode ? "bg-white text-black border-white shadow-[0_4px_15px_rgba(255,255,255,0.1)]" : "bg-slate-900 text-white border-slate-900 shadow-[0_4px_15px_rgba(0,0,0,0.1)]") 
                          : (isDarkMode ? "bg-transparent text-slate-400 border-transparent hover:bg-white/[0.05]" : "bg-transparent text-slate-500 border-transparent hover:bg-slate-50")
                      )}
                    >
                      Todos
                    </button>
                    {(transactionType === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map(cat => (
                      <button 
                        key={cat.id}
                        onClick={() => { setActiveCategory(cat.id); setIsFiltersExpanded(false); }}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-tech font-bold uppercase tracking-[0.1em] transition-all border",
                          activeCategory === cat.id 
                            ? (isDarkMode ? "bg-white text-black border-white shadow-[0_4px_15px_rgba(255,255,255,0.1)]" : "bg-slate-900 text-white border-slate-900 shadow-[0_4px_15px_rgba(0,0,0,0.1)]") 
                            : (isDarkMode ? "bg-transparent text-slate-400 border-transparent hover:bg-white/[0.05]" : "bg-transparent text-slate-500 border-transparent hover:bg-slate-50")
                        )}
                      >
                        <cat.icon strokeWidth={3} style={{ color: activeCategory === cat.id ? undefined : cat.color }} className="w-4 h-4" />
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

            <div className="space-y-4">
              {filteredTransactions.length === 0 ? (
                <div className={cn(
                  "p-12 rounded-[40px] border border-dashed text-center space-y-4",
                  isDarkMode ? "bg-white/[0.02] border-white/[0.05]" : "bg-slate-50/50 border-slate-200/60"
                )}>
                  <div className="w-16 h-16 rounded-full bg-slate-500/5 flex items-center justify-center mx-auto">
                    <Search className="text-slate-300" size={32} />
                  </div>
                  <p className="tech-label opacity-40">Nenhum registro encontrado</p>
                </div>
              ) : (
                filteredTransactions.map((r, idx) => {
                  const isIncome = r.tipo === "receber";
                  const Icon = getCategoryIcon(r.categoria, isIncome);
                  const color = getCategoryColor(r.categoria, isIncome);
                  return (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      key={r.id}
                      onClick={() => setSelectedRecordId(r.id)}
                      className={cn(
                        "p-4 rounded-3xl border transition-all duration-300 flex items-center justify-between gap-3 group cursor-pointer",
                        isDarkMode ? "bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.08]" : "bg-white border-slate-200/50 shadow-soft hover:shadow-premium"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 border"
                        )} style={{ 
                          backgroundColor: `${color}15`, 
                          color: color, 
                          borderColor: isDarkMode ? `${color}30` : `${color}20` 
                        }}>
                          <Icon size={18} strokeWidth={2.5} />
                        </div>
                        <div>
                          <h4 className={cn("text-xs sm:text-sm font-display font-black", isDarkMode ? "text-slate-100" : "text-slate-900")}>{r.descricao}</h4>
                          <div className="flex items-center gap-2 mt-0.5">
                             <p className="tech-label text-[8px] sm:text-[10px] tracking-widest lowercase opacity-40">{format(parseISO(r.data), "dd MMM")}</p>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={cn("text-base sm:text-lg font-tech font-bold", isIncome ? "text-emerald-500" : "text-rose-500")}>
                          {isIncome ? "+" : "-"}{formatCurrency(Math.abs(r.valor))}
                        </p>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
      </div>

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {selectedRecordId && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[10000] flex items-end justify-center sm:items-center p-4 bg-black/60 backdrop-blur-sm"
            onPointerDownCapture={(e) => e.stopPropagation()}
            style={{ touchAction: "auto" }}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className={cn(
                "w-[95%] sm:w-[90%] max-w-sm mb-8 sm:mb-10 rounded-[32px] p-6 sm:p-8 border shadow-2xl relative max-h-[90vh] overflow-y-auto no-scrollbar",
                isDarkMode ? "bg-[#111111] border-white/10 text-white" : "bg-white border-slate-200 text-slate-900"
              )}
            >
              <button 
                onClick={() => setSelectedRecordId(null)}
                className="absolute top-4 right-4 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-slate-500/10 text-slate-500 hover:bg-slate-500/20 z-10 backdrop-blur-md"
              >
                <X size={18} className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
              </button>
              
              {(() => {
                const record = allTransactions.find(r => r.id === selectedRecordId);
                if (!record) return <p>Registro não encontrado.</p>;
                
                const isIncome = record.tipo === "receber";
                const Icon = getCategoryIcon(record.categoria, isIncome);
                const color = getCategoryColor(record.categoria, isIncome);

                return (
                  <div className="space-y-4 sm:space-y-6 pt-2">
                    <div className="flex flex-col items-center justify-center text-center space-y-3 sm:space-y-4">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl flex items-center justify-center border-2" style={{ 
                        backgroundColor: `${color}15`, 
                        color: color, 
                        borderColor: isDarkMode ? `${color}30` : `${color}20` 
                      }}>
                        <Icon strokeWidth={2} className="w-8 h-8 sm:w-9 sm:h-9" />
                      </div>
                      <div>
                        <h2 className="text-xl sm:text-2xl font-display font-black pr-6 pl-6">{record.descricao}</h2>
                        <span className="tech-label text-[10px] sm:text-xs opacity-40 uppercase inline-block mt-2">
                          {record.tipo === "gasto" ? "Gasto" : "A Receber"} • {record.categoria}
                        </span>
                      </div>
                    </div>
                    
                    <div className={cn("p-4 sm:p-6 rounded-3xl border flex items-center justify-center", isDarkMode ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200")}>
                      <span className={cn(
                        "text-3xl sm:text-4xl font-tech font-bold",
                        isIncome ? "text-emerald-500" : "text-rose-500"
                      )}>
                        {isIncome ? "+" : "-"}{formatCurrency(record.valor)}
                      </span>
                    </div>
                    
                    <div className="pt-2 text-center sm:text-left">
                      <p className="tech-label text-[10px] opacity-40 mb-1">Data do Registro</p>
                      <p className="text-sm sm:text-base font-semibold">{format(parseISO(record.data), "dd/MM/yyyy • HH:mm")}</p>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isAddModalOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[10000] flex items-end justify-center sm:items-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm box-border"
            onPointerDownCapture={(e) => e.stopPropagation()}
            style={{ touchAction: "auto" }}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className={cn(
                "w-[95%] sm:w-full max-w-[500px] rounded-[32px] sm:rounded-[48px] p-5 sm:p-8 pb-6 sm:pb-10 border shadow-2xl relative max-h-[92vh] overflow-y-auto box-border no-scrollbar",
                isDarkMode ? "bg-[#090909] border-white/5" : "bg-white border-slate-200"
              )}
            >
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="absolute right-4 top-4 sm:right-6 sm:top-6 w-10 h-10 rounded-full flex items-center justify-center bg-slate-500/10 text-slate-400 hover:bg-slate-500/20 z-10 transition-all"
              >
                <X size={20} />
              </button>
              
              <h3 className={cn("text-xl sm:text-2xl font-display font-black mb-5 mt-1 sm:mt-0", isDarkMode ? "text-white" : "text-slate-900")}>Novo Registro</h3>
              
              <div className="space-y-6">
                <div className="flex gap-2 p-1.5 rounded-[22px] bg-white/5 box-border">
                  <button 
                    onClick={() => { setTransactionType("expense"); setNewItemCategory("food"); }}
                    className={cn(
                      "flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-[18px] transition-all",
                      transactionType === "expense" ? "bg-white text-black shadow-lg" : "text-slate-500"
                    )}
                  >GASTO
                  </button>
                  <button 
                    onClick={() => { setTransactionType("income"); setNewItemCategory("salary"); }}
                    className={cn(
                      "flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-[18px] transition-all",
                      transactionType === "income" ? "bg-white text-emerald-600 shadow-lg" : "text-slate-500"
                    )}
                  >A RECEBER
                  </button>
                </div>
                
                <div className="w-full box-border">
                  <label className="block text-[11px] uppercase font-black text-slate-500 mb-2.5 ml-1">Descrição</label>
                  <input 
                    type="text" 
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder="Ex: Assinatura, Venda..."
                    className={cn(
                      "w-full px-4 sm:px-5 py-3.5 sm:py-4 rounded-2xl border transition-all outline-none box-border text-[16px] sm:text-[15px] font-medium",
                      isDarkMode ? "bg-black border-white/10 text-white focus:border-white/20 placeholder:text-slate-700" : "bg-slate-50 border-slate-200 text-slate-900 shadow-inner focus:border-blue-500/50 focus:bg-white"
                    )}
                  />
                </div>
                
                <div className="flex gap-4">
                  <div className="w-1/2 box-border">
                    <label className="block text-[11px] uppercase font-black text-slate-500 mb-2.5 ml-1">Valor (R$)</label>
                    <input 
                      type="text" 
                      inputMode="numeric"
                      value={newItemValue}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, "");
                        if (!digits) {
                          setNewItemValue("");
                        } else {
                          const numericValue = parseInt(digits, 10) / 100;
                          setNewItemValue(new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numericValue));
                        }
                      }}
                      placeholder="R$ 0,00"
                      className={cn(
                        "w-full px-4 sm:px-5 py-3.5 sm:py-4 rounded-2xl border transition-all outline-none box-border text-[16px] sm:text-[15px] font-medium",
                        isDarkMode ? "bg-black border-white/10 text-white focus:border-white/20 placeholder:text-slate-700" : "bg-slate-50 border-slate-200 text-slate-900 shadow-inner focus:border-blue-500/50 focus:bg-white"
                      )}
                    />
                  </div>
                  
                  <div className="w-1/2 box-border">
                    <label className="block text-[11px] uppercase font-black text-slate-500 mb-2.5 ml-1">Data</label>
                    <input 
                      type="date" 
                      value={newItemDate}
                      onChange={(e) => setNewItemDate(e.target.value)}
                      className={cn(
                        "w-full px-4 sm:px-5 py-3.5 sm:py-4 rounded-2xl border transition-all outline-none box-border text-[16px] sm:text-[15px] font-medium",
                        isDarkMode ? "bg-black border-white/10 text-white focus:border-white/20 placeholder:text-slate-700 [color-scheme:dark]" : "bg-slate-50 border-slate-200 text-slate-900 shadow-inner focus:border-blue-500/50 focus:bg-white"
                      )}
                    />
                  </div>
                </div>

                <div className="w-full box-border">
                  <label className="block text-[11px] uppercase font-black text-slate-500 mb-3 ml-1">Categoria</label>
                  <div className="grid grid-cols-4 gap-2 sm:gap-2.5 w-full">
                     {(transactionType === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map(cat => {
                       const isSelected = newItemCategory === cat.id;
                       return (
                         <button 
                           key={cat.id}
                           onClick={() => setNewItemCategory(cat.id)}
                           className={cn(
                             "flex flex-col items-center justify-center gap-1.5 sm:gap-2 p-2 sm:p-3 rounded-[14px] sm:rounded-2xl border transition-all aspect-square sm:aspect-auto sm:min-h-[90px]",
                             isSelected 
                               ? (isDarkMode ? "bg-white/10 border-white/20 text-white ring-2 ring-white/10" : "bg-slate-900 border-slate-900 text-white shadow-premium")
                               : (isDarkMode ? "bg-white/[0.03] border-white/5 text-slate-400 hover:bg-white/[0.06]" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50")
                           )}
                         >
                           <cat.icon size={24} style={{ color: cat.color }} />
                           <span className="text-[10px] font-bold tracking-tight whitespace-nowrap">{cat.name}</span>
                         </button>
                       )
                     })}
                  </div>
                </div>
                
                {formError && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold p-3 rounded-xl text-center w-full box-border">
                    {formError}
                  </div>
                )}
                
                <button 
                  onClick={handleSaveTransaction}
                  className="w-full mt-4 py-4 rounded-[20px] font-black uppercase tracking-[0.1em] text-white transition-all flex items-center justify-center gap-3 cursor-pointer hover:scale-[1.02] active:scale-[0.98] box-border shadow-xl shadow-indigo-500/20"
                  style={{ backgroundColor: transactionType === "expense" ? "#4f46e5" : "#10B981" }}
                >
                  <Check size={20} strokeWidth={4} />
                  CONFIRMAR
                </button>
              </div>
            </motion.div>
          </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
      
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {showFeedback && (
            <motion.div 
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[10000] flex items-center gap-3 bg-emerald-500 text-white px-6 py-4 rounded-full shadow-2xl font-tech font-bold tracking-wide"
          >
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Check size={16} strokeWidth={3} />
            </div>
            Registro adicionado com sucesso
          </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
});
