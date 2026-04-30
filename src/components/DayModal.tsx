import * as React from "react";
import { useState, useRef, memo } from "react";
import { 
  format, 
  isSameDay, 
  parseISO,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isEqual
} from "date-fns";
import { 
  X, 
  Calendar as CalendarIcon, 
  DollarSign, 
  FileText, 
  Briefcase, 
  BookOpen, 
  Clock, 
  Plus, 
  Minus, 
  Trash2, 
  Edit2, 
  Save,
  Repeat,
  Wallet,
  Receipt
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn, formatCurrency, EXPENSE_COLOR } from "../lib/utils";
import { CalendarData, User, Expense, ExpenseTemplate, Income } from "../types";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "../constants";

interface DayModalProps {
  date: Date;
  user: User;
  calendarData: CalendarData;
  updateCalendar: (d: CalendarData) => void;
  onClose: () => void;
  onSave: (workDays: any[], expenses: any[], incomes?: any[]) => void;
  primaryColor: string;
  isDarkMode: boolean;
  t: (key: string) => string;
  currentLocale: any;
  initialTab?: "commitments" | "expenses" | "templates";
}

export const DayModal = memo(({ 
  date, 
  user, 
  calendarData, 
  updateCalendar, 
  onClose, 
  onSave, 
  primaryColor, 
  isDarkMode, 
  t, 
  currentLocale,
  initialTab
}: DayModalProps) => {
  const calculateDuration = (start: string, end: string) => {
    if (!start || !end) return null;
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    
    let diff = (endH * 60 + endM) - (startH * 60 + startM);
    if (diff < 0) diff += 24 * 60;
    
    const hours = Math.floor(diff / 60);
    const minutes = diff % 60;
    
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  };

  const existingWorkEntry = (calendarData.workDays || []).find((wd: any) => isSameDay(parseISO(wd.date), date) && wd.userId === user.id && (wd.type === 'work' || !wd.type));
  const existingStudyEntry = (calendarData.workDays || []).find((wd: any) => isSameDay(parseISO(wd.date), date) && wd.userId === user.id && wd.type === 'study');
  const dayExpenses = (calendarData.expenses || []).filter((e: any) => isSameDay(parseISO(e.date), date));
  const dayIncomes = (calendarData.incomes || []).filter((i: any) => isSameDay(parseISO(i.date), date));

  const [modalTab, setModalTab] = useState<"commitments" | "expenses" | "templates">(initialTab || "commitments");
  // Transaction type switcher inside expenses tab
  const [transactionType, setTransactionType] = useState<"expense" | "income">("expense");
  
  const [isWorkActive, setIsWorkActive] = useState(!!existingWorkEntry);
  const [workStartTime, setWorkStartTime] = useState(existingWorkEntry?.startTime || "");
  const [workEndTime, setWorkEndTime] = useState(existingWorkEntry?.endTime || "");
  const [workHours, setWorkHours] = useState(existingWorkEntry?.hours || "");
  const [workValue, setWorkValue] = useState(existingWorkEntry?.value?.toString() || "");
  const [workNotes, setWorkNotes] = useState(existingWorkEntry?.notes || "");

  const [isStudyActive, setIsStudyActive] = useState(!!existingStudyEntry);
  const [studyStartTime, setStudyStartTime] = useState(existingStudyEntry?.startTime || "");
  const [studyEndTime, setStudyEndTime] = useState(existingStudyEntry?.endTime || "");
  const [studyHours, setStudyHours] = useState(existingStudyEntry?.hours || "");
  const [studyNotes, setStudyNotes] = useState(existingStudyEntry?.notes || "");

  const [expenses, setExpenses] = useState<Expense[]>(dayExpenses);
  const [incomes, setIncomes] = useState<Income[]>(dayIncomes);

  const [repeatType, setRepeatType] = useState<"none" | "daily" | "weekdays" | "custom">("none");
  const [selectedRepeatDays, setSelectedRepeatDays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri by default for custom

  const scrollRef = useRef<HTMLDivElement>(null);

  const [newExpenseName, setNewExpenseName] = useState("");
  const [newExpenseValue, setNewExpenseValue] = useState("");
  const [newExpenseCategory, setNewExpenseCategory] = useState("other");

  const [newIncomeName, setNewIncomeName] = useState("");
  const [newIncomeValue, setNewIncomeValue] = useState("");
  const [newIncomeCategory, setNewIncomeCategory] = useState("other_income");

  const [isAddingTemplate, setIsAddingTemplate] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [templateItems, setTemplateItems] = useState<{ name: string, value: number, quantity?: number }[]>([]);
  const [currentItemName, setCurrentItemName] = useState("");
  const [currentItemValue, setCurrentItemValue] = useState("");
  const [currentItemQuantity, setCurrentItemQuantity] = useState("1");

  const editTemplate = (template: ExpenseTemplate) => {
    setEditingTemplateId(template.id);
    setNewTemplateName(template.name);
    setTemplateItems([...template.items]);
    setIsAddingTemplate(true);
  };

  const addManualTransaction = () => {
    if (transactionType === "expense") {
      const expenseDigits = newExpenseValue.replace(/\D/g, '');
      const expVal = expenseDigits ? parseInt(expenseDigits, 10) / 100 : Number.NaN;
      if (!newExpenseName || isNaN(expVal) || expVal <= 0) return;
      const newExpense: Expense = {
        id: Math.random().toString(36).substr(2, 9),
        name: newExpenseName,
        value: expVal,
        quantity: 1,
        date: date.toISOString(),
        category: newExpenseCategory
      };
      setExpenses([...expenses, newExpense]);
      setNewExpenseName("");
      setNewExpenseValue("");
      setNewExpenseCategory("other_expense");
    } else {
      const incomeDigits = newIncomeValue.replace(/\D/g, '');
      const incVal = incomeDigits ? parseInt(incomeDigits, 10) / 100 : Number.NaN;
      if (!newIncomeName || isNaN(incVal) || incVal <= 0) return;
      const newIncome: Income = {
        id: Math.random().toString(36).substr(2, 9),
        name: newIncomeName,
        value: incVal,
        date: date.toISOString(),
        userId: user.id,
        category: newIncomeCategory
      };
      setIncomes([...incomes, newIncome]);
      setNewIncomeName("");
      setNewIncomeValue("");
      setNewIncomeCategory("other_income");
    }
  };

  const applyTemplate = (template: ExpenseTemplate) => {
    const newExpenses: Expense[] = (template.items || []).map(item => ({
      id: Math.random().toString(36).substr(2, 9),
      name: item.name,
      value: item.value,
      quantity: item.quantity || 1,
      date: date.toISOString()
    }));
    setExpenses([...expenses, ...newExpenses]);
    setTransactionType("expense");
    setModalTab("expenses");
  };

  const addTemplateItem = () => {
    const itemDigits = currentItemValue.replace(/\D/g, '');
    const itemNum = itemDigits ? parseInt(itemDigits, 10) / 100 : Number.NaN;
    if (!currentItemName || isNaN(itemNum) || itemNum <= 0) return;
    setTemplateItems([...templateItems, { 
      name: currentItemName, 
      value: itemNum,
      quantity: parseInt(currentItemQuantity) || 1
    }]);
    setCurrentItemName("");
    setCurrentItemValue("");
    setCurrentItemQuantity("1");
  };

  const addTemplate = () => {
    if (!newTemplateName || templateItems.length === 0) return;
    
    if (editingTemplateId) {
      const updatedTemplates = (calendarData.templates || []).map((t: any) => 
        t.id === editingTemplateId 
          ? { ...t, name: newTemplateName, items: templateItems }
          : t
      );
      updateCalendar({
        ...calendarData,
        templates: updatedTemplates
      });
    } else {
      const newTemplate: ExpenseTemplate = {
        id: Math.random().toString(36).substr(2, 9),
        name: newTemplateName,
        items: templateItems
      };
      updateCalendar({
        ...calendarData,
        templates: [...(calendarData.templates || []), newTemplate]
      });
    }
    
    setNewTemplateName("");
    setTemplateItems([]);
    setIsAddingTemplate(false);
    setEditingTemplateId(null);
  };

  const updateExpenseQuantity = (id: string, delta: number) => {
    setExpenses(prev => prev.map(e => {
      if (e.id === id) {
        const newQty = Math.max(1, (e.quantity || 1) + delta);
        return { ...e, quantity: newQty };
      }
      return e;
    }));
  };

  const handleSave = () => {
    const workDays: any[] = [];
    
    // Logic for generating entries based on repeat
    const datesToApply = [];
    if (repeatType === "none") {
      datesToApply.push(date);
    } else {
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
      
      daysInMonth.forEach(d => {
        if (repeatType === "daily") {
          datesToApply.push(d);
        } else if (repeatType === "weekdays") {
          const dayOfWeek = getDay(d);
          if (dayOfWeek >= 1 && dayOfWeek <= 5) {
            datesToApply.push(d);
          }
        } else if (repeatType === "custom") {
          const dayOfWeek = getDay(d);
          if (selectedRepeatDays.includes(dayOfWeek)) {
            datesToApply.push(d);
          }
        }
      });
    }

    datesToApply.forEach(d => {
      const dateStr = d.toISOString();
      
      if (isWorkActive) {
        // If it's the original selected date, try to keep the existing ID
        const isSelectedDate = isSameDay(d, date);
        const duration = calculateDuration(workStartTime, workEndTime);
        
        const workDigits = workValue.replace(/\D/g, '');
        const wVal = workDigits ? parseInt(workDigits, 10) / 100 : 0;
        
        workDays.push({
          id: (isSelectedDate && existingWorkEntry?.id) || Math.random().toString(36).substr(2, 9),
          date: dateStr,
          userId: user.id,
          startTime: workStartTime,
          endTime: workEndTime,
          hours: duration ? `${workStartTime} - ${workEndTime}` : workHours, // Fallback to manual if no times
          value: wVal,
          notes: workNotes,
          type: 'work'
        });
      }

      if (isStudyActive) {
        const isSelectedDate = isSameDay(d, date);
        const duration = calculateDuration(studyStartTime, studyEndTime);
        
        workDays.push({
          id: (isSelectedDate && existingStudyEntry?.id) || Math.random().toString(36).substr(2, 9),
          date: dateStr,
          userId: user.id,
          startTime: studyStartTime,
          endTime: studyEndTime,
          hours: duration ? `${studyStartTime} - ${studyEndTime}` : studyHours,
          notes: studyNotes,
          type: 'study'
        });
      }
    });

    onSave(workDays, expenses, incomes);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className={cn(
          "relative w-full max-w-md rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden h-[85vh] sm:h-auto flex flex-col border transition-colors duration-300",
          isDarkMode ? "bg-black border-white/10" : "bg-white border-slate-200"
        )}
      >
        <div className="p-6 pb-2">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className={cn(
                "text-2xl font-black capitalize",
                isDarkMode ? "text-slate-100" : "text-slate-900"
              )}>
                {format(date, "EEEE, d", { locale: currentLocale })}
              </h3>
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">
                {format(date, "MMMM yyyy", { locale: currentLocale })}
              </p>
            </div>
            <button 
              onClick={onClose} 
              className={cn(
                "p-2 rounded-full transition-colors",
                isDarkMode ? "bg-white/5 text-slate-400 hover:text-slate-100" : "bg-slate-100 text-slate-400 hover:text-slate-900"
              )}
            >
              <X size={20} />
            </button>
          </div>

          {/* Modal Tabs */}
          <div className={cn(
            "flex items-stretch gap-1 sm:gap-1.5 mb-6 h-[52px] w-full p-1.5 rounded-[24px] transition-colors",
            isDarkMode ? "bg-white/[0.02] border border-white/5" : "bg-slate-100/80 border border-slate-200"
          )}>
            {[
              { id: "commitments", label: "COMPROMISSOS", icon: CalendarIcon, color: "#6366f1" },
              { id: "expenses", label: "FINANÇAS", icon: Receipt, color: "#d946ef" },
              { id: "templates", label: "TEMPLATES", icon: FileText, color: "#f8fafc" }
            ].map(tab => {
              const isActive = modalTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setModalTab(tab.id as any)}
                  className={cn(
                    "relative flex-1 rounded-[18px] flex items-center justify-center gap-1.5 sm:gap-2 overflow-hidden transition-all duration-300",
                    !isActive && (isDarkMode ? "bg-white/[0.02] hover:bg-white/[0.06]" : "bg-white/50 hover:bg-white")
                  )}
                  style={{
                    WebkitTapHighlightColor: "transparent"
                  }}
                >
                  {isActive && (
                    <motion.div
                      layoutId="modalTabActiveBackground"
                      className={cn(
                        "absolute inset-0 z-0",
                        isDarkMode 
                          ? "bg-gradient-to-r from-[#6b21a8] to-[#4338ca] shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] border border-white/10"
                          : "bg-gradient-to-r from-purple-500 to-indigo-500 shadow-md"
                      )}
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      style={{ borderRadius: 18 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center justify-center">
                    <Icon size={14} style={{ color: isActive ? "#fff" : tab.color }} className="transition-colors duration-300" />
                  </span>
                  <span 
                    className={cn(
                      "relative z-10 text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-colors duration-300",
                      isActive ? "text-white" : (isDarkMode ? "text-slate-300" : "text-slate-600")
                    )}
                  >
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6 no-scrollbar" ref={scrollRef}>
          <AnimatePresence mode="wait">
            {modalTab === "commitments" ? (
              <motion.div 
                key="commitments-tab"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-6"
              >
                {/* Work Section */}
                <div className="space-y-4">
                  <div className={cn(
                    "flex items-center justify-between p-4 rounded-2xl border transition-colors",
                    isDarkMode ? "bg-[#111111] border-white/5" : "bg-slate-50 border-slate-100"
                  )}>
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white transition-colors"
                        style={{ backgroundColor: isWorkActive ? primaryColor : (isDarkMode ? "#334155" : "#cbd5e1") }}
                      >
                        <Briefcase size={20} />
                      </div>
                      <div>
                        <p className={cn(
                          "text-sm font-bold",
                          isDarkMode ? "text-slate-200" : "text-slate-900"
                        )}>{t('work')}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t('work_desc')}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setIsWorkActive(!isWorkActive)}
                      className={cn(
                        "w-12 h-6 rounded-full transition-all relative",
                        isWorkActive ? "" : (isDarkMode ? "bg-slate-700" : "bg-slate-200")
                      )}
                      style={{ backgroundColor: isWorkActive ? primaryColor : undefined }}
                    >
                      <div className={cn(
                        "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                        isWorkActive ? "left-7" : "left-1"
                      )} />
                    </button>
                  </div>

                  {isWorkActive && (
                    <div className="space-y-4 p-4 rounded-2xl border border-dashed border-slate-200">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 sm:col-span-1">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">{t('start_time')}</label>
                          <div className="relative">
                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input 
                              type="time" 
                              value={workStartTime}
                              onChange={e => setWorkStartTime(e.target.value)}
                              className={cn(
                                "w-full pl-10 pr-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all",
                                isDarkMode ? "bg-black border-white/10 text-slate-100" : "bg-slate-50 border-slate-200 text-slate-900"
                              )}
                              style={{ "--tw-ring-color": primaryColor } as any}
                            />
                          </div>
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">{t('end_time')}</label>
                          <div className="relative">
                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input 
                              type="time" 
                              value={workEndTime}
                              onChange={e => setWorkEndTime(e.target.value)}
                              className={cn(
                                "w-full pl-10 pr-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all",
                                isDarkMode ? "bg-black border-white/10 text-slate-100" : "bg-slate-50 border-slate-200 text-slate-900"
                              )}
                              style={{ "--tw-ring-color": primaryColor } as any}
                            />
                          </div>
                        </div>

                        {calculateDuration(workStartTime, workEndTime) && (
                          <div className="col-span-2 flex items-center gap-2 px-1">
                            <div className="tech-label text-[10px] opacity-70">
                              {calculateDuration(workStartTime, workEndTime)} {t('worked')}
                            </div>
                          </div>
                        )}

                        <div className="col-span-2">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">{t('value')}</label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input 
                              type="text" 
                              inputMode="numeric"
                              placeholder="R$ 0,00" 
                              value={workValue}
                              onChange={e => {
                                const digits = e.target.value.replace(/\D/g, "");
                                if (!digits) {
                                  setWorkValue("");
                                } else {
                                  const numericValue = parseInt(digits, 10) / 100;
                                  setWorkValue(new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numericValue));
                                }
                              }}
                              className={cn(
                                "w-full pl-10 pr-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all",
                                isDarkMode ? "bg-black border-white/10 text-slate-100" : "bg-slate-50 border-slate-200 text-slate-900"
                              )}
                              style={{ "--tw-ring-color": primaryColor } as any}
                            />
                          </div>
                        </div>
                      </div>
                      
                      {!workStartTime && !workEndTime && (
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">{t('hours')} (Manual)</label>
                          <div className="relative">
                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input 
                              type="text" 
                              placeholder="08:00 - 18:00" 
                              value={workHours}
                              onChange={e => setWorkHours(e.target.value)}
                              className={cn(
                                "w-full pl-10 pr-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all",
                                isDarkMode ? "bg-black border-white/10 text-slate-100" : "bg-slate-50 border-slate-200 text-slate-900"
                              )}
                              style={{ "--tw-ring-color": primaryColor } as any}
                            />
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">{t('notes')}</label>
                        <div className="relative">
                          <FileText className="absolute left-3 top-3 text-slate-400" size={16} />
                          <textarea 
                            placeholder={t('notes')} 
                            value={workNotes}
                            onChange={e => setWorkNotes(e.target.value)}
                            rows={2}
                            className={cn(
                              "w-full pl-10 pr-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all resize-none",
                              isDarkMode ? "bg-black border-white/10 text-slate-100" : "bg-slate-50 border-slate-200 text-slate-900"
                            )}
                            style={{ "--tw-ring-color": primaryColor } as any}
                          />
                        </div>
                      </div>

                      <button 
                        onClick={handleSave}
                        className="w-full py-3 text-white rounded-xl transition-all font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 shadow-lg mt-2"
                        style={{ backgroundColor: primaryColor, boxShadow: `0 4px 12px ${primaryColor}44` }}
                      >
                        <Save size={16} />
                        {t('save')}
                      </button>
                    </div>
                  )}
                </div>

                {/* Study Section */}
                <div className="space-y-4">
                  <div className={cn(
                    "flex items-center justify-between p-4 rounded-2xl border transition-colors",
                    isDarkMode ? "bg-[#111111] border-white/5" : "bg-slate-50 border-slate-100"
                  )}>
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white transition-colors"
                        style={{ backgroundColor: isStudyActive ? primaryColor : (isDarkMode ? "#334155" : "#cbd5e1") }}
                      >
                        <BookOpen size={20} />
                      </div>
                      <div>
                        <p className={cn(
                          "text-sm font-bold",
                          isDarkMode ? "text-slate-200" : "text-slate-900"
                        )}>{t('study')}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t('study_desc')}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setIsStudyActive(!isStudyActive)}
                      className={cn(
                        "w-12 h-6 rounded-full transition-all relative",
                        isStudyActive ? "" : (isDarkMode ? "bg-slate-700" : "bg-slate-200")
                      )}
                      style={{ backgroundColor: isStudyActive ? primaryColor : undefined }}
                    >
                      <div className={cn(
                        "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                        isStudyActive ? "left-7" : "left-1"
                      )} />
                    </button>
                  </div>

                  {isStudyActive && (
                    <div className="space-y-4 p-4 rounded-2xl border border-dashed border-slate-200">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 sm:col-span-1">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">{t('start_time')}</label>
                          <div className="relative">
                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input 
                              type="time" 
                              value={studyStartTime}
                              onChange={e => setStudyStartTime(e.target.value)}
                              className={cn(
                                "w-full pl-10 pr-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all",
                                isDarkMode ? "bg-black border-white/10 text-slate-100" : "bg-slate-50 border-slate-200 text-slate-900"
                              )}
                              style={{ "--tw-ring-color": primaryColor } as any}
                            />
                          </div>
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">{t('end_time')}</label>
                          <div className="relative">
                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input 
                              type="time" 
                              value={studyEndTime}
                              onChange={e => setStudyEndTime(e.target.value)}
                              className={cn(
                                "w-full pl-10 pr-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all",
                                isDarkMode ? "bg-black border-white/10 text-slate-100" : "bg-slate-50 border-slate-200 text-slate-900"
                              )}
                              style={{ "--tw-ring-color": primaryColor } as any}
                            />
                          </div>
                        </div>

                        {calculateDuration(studyStartTime, studyEndTime) && (
                          <div className="col-span-2 flex items-center gap-2 px-1">
                            <div className="tech-label text-[10px] opacity-70">
                              {calculateDuration(studyStartTime, studyEndTime)} {t('studied')}
                            </div>
                          </div>
                        )}
                      </div>

                      {!studyStartTime && !studyEndTime && (
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">{t('hours')} (Manual)</label>
                          <div className="relative">
                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input 
                              type="text" 
                              placeholder="19:00 - 21:00" 
                              value={studyHours}
                              onChange={e => setStudyHours(e.target.value)}
                              className={cn(
                                "w-full pl-10 pr-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all",
                                isDarkMode ? "bg-black border-white/10 text-slate-100" : "bg-slate-50 border-slate-200 text-slate-900"
                              )}
                              style={{ "--tw-ring-color": primaryColor } as any}
                            />
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">{t('notes')}</label>
                        <div className="relative">
                          <FileText className="absolute left-3 top-3 text-slate-400" size={16} />
                          <textarea 
                            placeholder={t('notes')} 
                            value={studyNotes}
                            onChange={e => setStudyNotes(e.target.value)}
                            rows={2}
                            className={cn(
                              "w-full pl-10 pr-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all resize-none",
                              isDarkMode ? "bg-black border-white/10 text-slate-100" : "bg-slate-50 border-slate-200 text-slate-900"
                            )}
                            style={{ "--tw-ring-color": primaryColor } as any}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Repeat Section */}
                <div className={cn(
                  "p-4 rounded-2xl border space-y-4",
                  isDarkMode ? "bg-[#0A0A0A] border-white/5" : "bg-slate-50 border-slate-100"
                )}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}>
                      <Repeat size={16} />
                    </div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('repeat')}</label>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {(['none', 'daily', 'weekdays', 'custom'] as const).map((type) => (
                      <button
                        key={type}
                        onClick={() => setRepeatType(type)}
                        className={cn(
                          "py-2 px-3 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all",
                          repeatType === type
                            ? (isDarkMode ? "bg-white/10 border-white/20 text-white" : "bg-white border shadow-sm text-slate-900")
                            : (isDarkMode ? "bg-transparent border-white/5 text-slate-500" : "bg-transparent border-slate-200 text-slate-400")
                        )}
                        style={repeatType === type ? { borderColor: primaryColor } : {}}
                      >
                        {t(type === 'daily' ? 'every_day' : type)}
                      </button>
                    ))}
                  </div>

                  {repeatType === 'custom' && (
                    <div className="flex justify-between gap-1 pt-2">
                      {[
                        { id: 1, label: 'mon' },
                        { id: 2, label: 'tue' },
                        { id: 3, label: 'wed' },
                        { id: 4, label: 'thu' },
                        { id: 5, label: 'fri' },
                        { id: 6, label: 'sat' },
                        { id: 0, label: 'sun' }
                      ].map((day) => (
                        <button
                          key={day.id}
                          onClick={() => {
                            if (selectedRepeatDays.includes(day.id)) {
                              setSelectedRepeatDays(selectedRepeatDays.filter(d => d !== day.id));
                            } else {
                              setSelectedRepeatDays([...selectedRepeatDays, day.id]);
                            }
                          }}
                          className={cn(
                            "flex-1 py-2 rounded-lg border text-[9px] font-black transition-all",
                            selectedRepeatDays.includes(day.id)
                              ? (isDarkMode ? "bg-white/10 border-white/20 text-white" : "bg-white border shadow-sm text-slate-900")
                              : (isDarkMode ? "bg-transparent border-white/5 text-slate-500" : "bg-transparent border-slate-200 text-slate-400")
                          )}
                          style={selectedRepeatDays.includes(day.id) ? { borderColor: primaryColor } : {}}
                        >
                          {t(day.label)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ) : modalTab === "expenses" ? (
              <motion.div 
                key="expenses-tab"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6"
              >
                {/* Transaction Type Toggler */}
                <div className="flex gap-2 p-1 rounded-2xl bg-slate-500/5 mb-4">
                  <button 
                    onClick={() => setTransactionType("expense")}
                    className={cn(
                      "flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all",
                      transactionType === "expense" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                    )}
                  >Gasto
                  </button>
                  <button 
                    onClick={() => setTransactionType("income")}
                    className={cn(
                      "flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all",
                      transactionType === "income" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500"
                    )}
                  >A Receber
                  </button>
                </div>

                {transactionType === "expense" ? (
                  <>
                    {/* Add Manual Expense */}
                    <div className="space-y-4">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('add_expense')}</label>
                      <div className="grid grid-cols-2 gap-2">
                        <input 
                          type="text" 
                          placeholder={t('name')} 
                          value={newExpenseName}
                          onChange={e => setNewExpenseName(e.target.value)}
                          className={cn(
                            "px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all",
                            isDarkMode ? "bg-black border-white/10 text-slate-100" : "bg-slate-50 border-slate-200 text-slate-900"
                          )}
                          style={{ "--tw-ring-color": primaryColor } as any}
                        />
                        <input 
                          type="text" 
                          inputMode="numeric"
                          placeholder="R$ 0,00" 
                          value={newExpenseValue}
                          onChange={e => {
                            const digits = e.target.value.replace(/\D/g, "");
                            if (!digits) {
                              setNewExpenseValue("");
                            } else {
                              const numericValue = parseInt(digits, 10) / 100;
                              setNewExpenseValue(new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numericValue));
                            }
                          }}
                          className={cn(
                            "px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all",
                            isDarkMode ? "bg-black border-white/10 text-slate-100" : "bg-slate-50 border-slate-200 text-slate-900"
                          )}
                          style={{ "--tw-ring-color": primaryColor } as any}
                        />
                      </div>
                      
                      <div className="grid grid-cols-6 gap-2">
                        {EXPENSE_CATEGORIES.map(cat => {
                          const Icon = cat.icon;
                          return (
                            <button
                              key={cat.id}
                              onClick={() => setNewExpenseCategory(cat.id)}
                              className={cn(
                                "flex flex-col items-center justify-center p-2 rounded-xl border transition-all",
                                newExpenseCategory === cat.id 
                                  ? (isDarkMode ? "bg-white/10 border-white/20" : "bg-slate-100 border-slate-300")
                                  : (isDarkMode ? "bg-transparent border-white/5" : "bg-white border-slate-100")
                              )}
                              title={cat.name}
                            >
                              <Icon size={14} className={newExpenseCategory === cat.id ? "" : "text-slate-400"} style={newExpenseCategory === cat.id ? { color: EXPENSE_COLOR } : {}} />
                            </button>
                          );
                        })}
                      </div>

                      <button 
                        onClick={addManualTransaction}
                        className="w-full py-3 text-white rounded-xl transition-all font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 shadow-lg"
                        style={{ backgroundColor: EXPENSE_COLOR, boxShadow: `0 4px 12px ${EXPENSE_COLOR}44` }}
                      >
                        <Plus size={16} />
                        {t('add_expense')}
                      </button>
                    </div>

                    {/* List of Day Expenses */}
                    <div className={cn(
                      "space-y-3 pt-4 border-t",
                      isDarkMode ? "border-white/5" : "border-slate-100"
                    )}>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('day_expenses')}</label>
                      <div className="space-y-2">
                        {expenses.length === 0 ? (
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest text-center py-4">{t('no_expenses')}</p>
                        ) : (
                          expenses.map(e => (
                            <div key={e.id} className={cn(
                              "p-3 rounded-xl border space-y-2",
                              isDarkMode ? "bg-[#111111] border-white/5" : "bg-slate-50 border-slate-100"
                            )}>
                              <div className="flex items-center justify-between">
                                <span className={cn(
                                  "text-xs font-bold",
                                  isDarkMode ? "text-slate-200" : "text-slate-700"
                                )}>{e.name}</span>
                                <button 
                                  onClick={() => setExpenses(expenses.filter(ex => ex.id !== e.id))}
                                  className="text-slate-400 hover:text-red-500 transition-colors"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                              <div className="flex items-center justify-between">
                                <div className={cn(
                                  "flex items-center border rounded-lg p-1",
                                  isDarkMode ? "bg-black border-white/10" : "bg-white border-slate-200"
                                )}>
                                  <button 
                                    onClick={() => updateExpenseQuantity(e.id, -1)}
                                    className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors"
                                  >
                                    <Minus size={12} />
                                  </button>
                                  <span className={cn(
                                    "w-8 text-center text-xs font-black",
                                    isDarkMode ? "text-slate-100" : "text-slate-900"
                                  )}>{e.quantity || 1}</span>
                                  <button 
                                    onClick={() => updateExpenseQuantity(e.id, 1)}
                                    className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors"
                              >
                                <Plus size={12} />
                              </button>
                            </div>
                            <span className="text-xs font-black" style={{ color: EXPENSE_COLOR }}>
                              {formatCurrency((e.value || 0) * (e.quantity || 1))}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {expenses.length > 0 && (
                    <button 
                      onClick={() => {
                        setTemplateItems(expenses.map(e => ({ name: e.name, value: e.value, quantity: e.quantity })));
                        setIsAddingTemplate(true);
                        setModalTab("templates");
                      }}
                      className="w-full py-3 border border-dashed rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-all mt-4"
                      style={{ borderColor: `${primaryColor}40` }}
                    >
                      {t('save_as_template')}
                    </button>
                  )}
                </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-4">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Adicionar a Receber</label>
                      <div className="grid grid-cols-2 gap-2">
                        <input 
                          type="text" 
                          placeholder={t('name')} 
                          value={newIncomeName}
                          onChange={e => setNewIncomeName(e.target.value)}
                          className={cn(
                            "px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all",
                            isDarkMode ? "bg-black border-white/10 text-slate-100" : "bg-emerald-50 border-emerald-100/50 text-slate-900"
                          )}
                          style={{ "--tw-ring-color": '#10b981' } as any}
                        />
                        <input 
                          type="text" 
                          inputMode="numeric"
                          placeholder="R$ 0,00" 
                          value={newIncomeValue}
                          onChange={e => {
                            const digits = e.target.value.replace(/\D/g, "");
                            if (!digits) {
                              setNewIncomeValue("");
                            } else {
                              const numericValue = parseInt(digits, 10) / 100;
                              setNewIncomeValue(new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numericValue));
                            }
                          }}
                          className={cn(
                            "px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all",
                            isDarkMode ? "bg-black border-white/10 text-slate-100" : "bg-emerald-50 border-emerald-100/50 text-slate-900"
                          )}
                          style={{ "--tw-ring-color": '#10b981' } as any}
                        />
                      </div>
                      <div className="grid grid-cols-6 gap-2">
                        {INCOME_CATEGORIES.map(cat => {
                          const Icon = cat.icon;
                          return (
                            <button
                              key={cat.id}
                              onClick={() => setNewIncomeCategory(cat.id)}
                              className={cn(
                                "flex flex-col items-center justify-center p-2 rounded-xl border transition-all",
                                newIncomeCategory === cat.id 
                                  ? (isDarkMode ? "bg-white/10 border-white/20" : "bg-emerald-100 border-emerald-300")
                                  : (isDarkMode ? "bg-transparent border-white/5" : "bg-white border-slate-100")
                              )}
                              title={cat.name}
                            >
                              <Icon size={14} className={newIncomeCategory === cat.id ? "" : "text-slate-400"} style={newIncomeCategory === cat.id ? { color: '#10b981' } : {}} />
                            </button>
                          );
                        })}
                      </div>
                      
                      <button 
                        onClick={addManualTransaction}
                        className="w-full py-3 text-white rounded-xl transition-all font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 shadow-lg"
                        style={{ backgroundColor: '#10b981', boxShadow: `0 4px 12px #10b98144` }}
                      >
                        <Plus size={16} />
                        Adicionar
                      </button>
                    </div>

                    {/* List of Day Incomes */}
                    <div className={cn(
                      "space-y-3 pt-4 border-t",
                      isDarkMode ? "border-white/5" : "border-slate-100"
                    )}>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Valores a Receber</label>
                      <div className="space-y-2">
                        {incomes.length === 0 ? (
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest text-center py-4">Nenhum valor extra hoje</p>
                        ) : (
                          incomes.map(income => (
                            <div key={income.id} className={cn(
                              "p-3 rounded-xl border flex items-center justify-between",
                              isDarkMode ? "bg-[#111111] border-white/5" : "bg-slate-50 border-slate-100"
                            )}>
                              <div className="flex flex-col">
                                <span className={cn(
                                  "text-xs font-bold",
                                  isDarkMode ? "text-slate-200" : "text-slate-700"
                                )}>{income.name}</span>
                                <span className="text-[10px] font-black text-emerald-500 mt-0.5">
                                  +{formatCurrency(income.value)}
                                </span>
                              </div>
                              <button 
                                onClick={() => setIncomes(incomes.filter(i => i.id !== income.id))}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-red-500/10 hover:text-red-500 transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            ) : (
              <motion.div 
                key="templates-tab"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('saved_templates')}</label>
                    <button 
                      onClick={() => {
                        if (isAddingTemplate) {
                          setIsAddingTemplate(false);
                          setEditingTemplateId(null);
                          setNewTemplateName("");
                          setTemplateItems([]);
                        } else {
                          setIsAddingTemplate(true);
                        }
                      }}
                      className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl transition-all flex items-center gap-2"
                      style={{ color: primaryColor, backgroundColor: `${primaryColor}10` }}
                    >
                      {isAddingTemplate ? <X size={12} /> : <Plus size={12} />}
                      {isAddingTemplate ? t('cancel') : t('new_template')}
                    </button>
                  </div>

                  {isAddingTemplate && (
                    <div className={cn(
                      "p-4 rounded-2xl border space-y-4",
                      isDarkMode ? "bg-[#111111] border-white/5" : "bg-white border-slate-200"
                    )}>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('name')}</label>
                        <input 
                          type="text" 
                          placeholder={t('name')} 
                          value={newTemplateName}
                          onChange={e => setNewTemplateName(e.target.value)}
                          className={cn(
                            "w-full px-3 py-2.5 border rounded-xl text-sm font-bold focus:outline-none focus:ring-2 transition-all",
                            isDarkMode ? "bg-black border-white/10 text-slate-100" : "bg-slate-50 border-slate-200 text-slate-900"
                          )}
                          style={{ "--tw-ring-color": primaryColor } as any}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('add')}</label>
                        <div className="grid grid-cols-12 gap-2">
                          <div className="col-span-5">
                            <input 
                              type="text" 
                              placeholder={t('name')} 
                              value={currentItemName}
                              onChange={e => setCurrentItemName(e.target.value)}
                              className={cn(
                                "w-full px-3 py-2 border rounded-xl text-xs font-bold focus:outline-none h-11",
                                isDarkMode ? "bg-black border-white/10 text-slate-100 focus:border-white/20" : "bg-slate-50 border-slate-200 text-slate-900"
                              )}
                            />
                          </div>
                          <div className="col-span-3">
                            <input 
                              type="text" 
                              inputMode="numeric"
                              placeholder="R$ 0,00" 
                              value={currentItemValue}
                              onChange={e => {
                                const digits = e.target.value.replace(/\D/g, "");
                                if (!digits) {
                                  setCurrentItemValue("");
                                } else {
                                  const numericValue = parseInt(digits, 10) / 100;
                                  setCurrentItemValue(new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numericValue));
                                }
                              }}
                              className={cn(
                                "w-full px-2 py-2 border rounded-xl text-xs font-bold focus:outline-none text-center h-11",
                                isDarkMode ? "bg-black border-white/10 text-slate-100 focus:border-white/20" : "bg-slate-50 border-slate-200 text-slate-900"
                              )}
                            />
                          </div>
                          <div className="col-span-2">
                            <input 
                              type="number" 
                              placeholder="Qtd" 
                              value={currentItemQuantity}
                              onChange={e => setCurrentItemQuantity(e.target.value)}
                              className={cn(
                                "w-full px-2 py-2 border rounded-xl text-xs font-bold focus:outline-none text-center h-11",
                                isDarkMode ? "bg-black border-white/10 text-slate-100 focus:border-white/20" : "bg-slate-50 border-slate-200 text-slate-900"
                              )}
                            />
                          </div>
                          <div className="col-span-2">
                            <button 
                              onClick={addTemplateItem}
                              className="w-full h-11 flex items-center justify-center text-white rounded-xl transition-all hover:bg-opacity-90 active:scale-95 shadow-sm"
                              style={{ backgroundColor: primaryColor }}
                            >
                              <Plus size={20} strokeWidth={2.5} />
                            </button>
                          </div>
                        </div>

                        {templateItems.length > 0 && (
                          <div className="space-y-2 pt-2">
                            {templateItems.map((item, idx) => (
                              <div key={idx} className={cn(
                                "flex justify-between items-center p-2 rounded-lg border",
                                isDarkMode ? "bg-black/40 border-white/5" : "bg-white border-slate-100"
                              )}>
                                <div className="flex flex-col">
                                  <span className={cn("text-[11px] font-bold", isDarkMode ? "text-slate-200" : "text-slate-700")}>{item.name}</span>
                                  <span className="text-[9px] text-slate-400">{item.quantity}x {formatCurrency(item.value)}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-[11px] font-black text-red-400">-{formatCurrency(item.value * (item.quantity || 1))}</span>
                                  <button 
                                    onClick={() => setTemplateItems(templateItems.filter((_, i) => i !== idx))}
                                    className="text-slate-400 hover:text-red-500 transition-colors"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <button 
                        onClick={addTemplate}
                        disabled={!newTemplateName || templateItems.length === 0}
                        className="w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all disabled:opacity-50"
                        style={{ backgroundColor: primaryColor }}
                      >
                        {editingTemplateId ? t('save') : t('save')}
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-3">
                    {(calendarData.templates || []).length === 0 ? (
                      <div className={cn(
                        "p-8 rounded-2xl border border-dashed text-center space-y-2",
                        isDarkMode ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"
                      )}>
                        <FileText className="mx-auto text-slate-400" size={24} />
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('no_templates')}</p>
                      </div>
                    ) : (
                      (calendarData.templates || []).map(t => (
                        <div key={t.id} className={cn(
                          "p-4 rounded-2xl border transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer group",
                          isDarkMode ? "bg-[#111111] border-white/5 hover:border-white/10" : "bg-white border-slate-200 hover:border-slate-300"
                        )}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}>
                                <FileText size={16} />
                              </div>
                              <div>
                                <h4 className={cn("text-sm font-bold", isDarkMode ? "text-slate-100" : "text-slate-900")}>{t.name}</h4>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{t.items.length} itens</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  editTemplate(t);
                                }}
                                className="text-slate-400 hover:text-blue-500 transition-colors"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateCalendar({
                                    ...calendarData,
                                    templates: (calendarData.templates || []).filter(temp => temp.id !== t.id)
                                  });
                                }}
                                className="text-slate-400 hover:text-red-500 transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1.5 mb-4">
                            {t.items.slice(0, 3).map((item, idx) => (
                              <span key={idx} className={cn(
                                "px-2 py-1 rounded-lg text-[9px] font-bold",
                                isDarkMode ? "bg-white/5 text-slate-400" : "bg-slate-100 text-slate-500"
                              )}>
                                {item.name} {item.quantity && item.quantity > 1 ? `(${item.quantity}x)` : ''}
                              </span>
                            ))}
                            {t.items.length > 3 && (
                              <span className={cn(
                                "px-2 py-1 rounded-lg text-[9px] font-bold",
                                isDarkMode ? "bg-white/5 text-slate-400" : "bg-slate-100 text-slate-500"
                              )}>
                                +{t.items.length - 3}
                              </span>
                            )}
                          </div>
                          <button 
                            onClick={() => applyTemplate(t)}
                            className="w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all"
                            style={{ backgroundColor: primaryColor }}
                          >
                            Aplicar Template
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className={cn(
          "p-6 border-t",
          isDarkMode ? "bg-black border-white/10" : "bg-slate-50 border-slate-100"
        )}>
          <button 
            onClick={handleSave}
            className="w-full text-white font-bold py-4 rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
            style={{ backgroundColor: primaryColor, boxShadow: `0 10px 20px ${primaryColor}30` }}
          >
            <Save size={20} />
            {t('save')}
          </button>
        </div>
      </motion.div>
    </div>
  );
});
