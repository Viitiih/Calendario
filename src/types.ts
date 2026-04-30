import { Language } from "./translations";
import { LucideIcon } from "lucide-react";

export interface User {
  id: string;
  name: string;
  color: string;
  syncTheme: boolean;
  themeColor?: string;
  darkMode?: boolean;
  showGoals?: boolean;
  dailyGoal?: number;
  monthlyGoal?: number;
  yearlyGoal?: number;
  showExpensesInGoals?: boolean;
  firebaseUid?: string;
  language?: Language;
}

export interface WorkDay {
  id: string;
  date: string;
  userId: string;
  hours?: string;
  startTime?: string;
  endTime?: string;
  value?: number;
  notes?: string;
  type?: 'work' | 'study';
}

export interface FinanceRecord {
  id: string;
  tipo: "gasto" | "receber";
  descricao: string;
  valor: number;
  categoria: string;
  data: string;
}

export interface Income {
  id: string;
  name?: string;
  value?: number;
  date: string;
  userId?: string;
  category?: string;
  quantity?: number;
}

export interface Expense {
  id: string;
  name?: string;
  value?: number;
  quantity?: number;
  date: string;
  category?: string;
}

export interface Category {
  id: string;
  name: string;
  icon: LucideIcon;
  color: string;
}

export interface ExpenseTemplate {
  id: string;
  name: string;
  items: { name: string, value: number, quantity?: number }[];
}

export interface CalendarData {
  id: string;
  name: string;
  ownerId?: string;
  workDays: WorkDay[];
  registrosFinanceiros?: FinanceRecord[];
  inviteCode?: string;
  // Legacy fields
  expenses?: Expense[];
  incomes?: Income[];
  templates: ExpenseTemplate[];
  users?: { id: string, name: string, color: string }[];
  pendingUsers?: { id: string, name: string, color: string }[];
}
