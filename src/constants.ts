import { Utensils, Car, Home, Gamepad2, HeartPulse, GraduationCap, ShoppingBag, MoreHorizontal, DollarSign, Briefcase, Package, TrendingUp } from "lucide-react";
import { Category } from "./types";

export const CATEGORIES: Category[] = [
  { id: 'food', name: 'Alimentação', icon: Utensils, color: '#F59E0B' },
  { id: 'transport', name: 'Transporte', icon: Car, color: '#3B82F6' },
  { id: 'housing', name: 'Moradia', icon: Home, color: '#F43F5E' },
  { id: 'leisure', name: 'Lazer', icon: Gamepad2, color: '#8B5CF6' },
  { id: 'health', name: 'Saúde', icon: HeartPulse, color: '#10B981' },
  { id: 'education', name: 'Educação', icon: GraduationCap, color: '#F59E0B' },
  { id: 'shopping', name: 'Compras', icon: ShoppingBag, color: '#06B6D4' },
];

export const EXPENSE_CATEGORIES: Category[] = CATEGORIES;
export const INCOME_CATEGORIES: Category[] = CATEGORIES;

export const getCategoryIcon = (categoryId?: string, isIncome: boolean = false) => {
  const cat = CATEGORIES.find(c => c.id === categoryId);
  return cat ? cat.icon : MoreHorizontal;
};

export const getCategoryColor = (categoryId?: string, isIncome: boolean = false) => {
  const cat = CATEGORIES.find(c => c.id === categoryId);
  return cat ? cat.color : '#64748B';
};
