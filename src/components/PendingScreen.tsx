import * as React from "react";
import { Clock, LogOut } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "../lib/utils";
import { User } from "../types";

interface PendingScreenProps {
  user: User;
  isDarkMode: boolean;
  primaryColor: string;
  onLogout: () => void;
  t: (key: string) => string;
}

export function PendingScreen({ user, isDarkMode, primaryColor, onLogout, t }: PendingScreenProps) {
  return (
    <div className={cn(
      "min-h-screen flex flex-col items-center justify-center p-6 text-center space-y-8",
      isDarkMode ? "bg-black text-white" : "bg-slate-50 text-slate-900"
    )}>
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-24 h-24 rounded-[32px] flex items-center justify-center text-white shadow-2xl rotate-6"
        style={{ backgroundColor: primaryColor }}
      >
        <Clock size={48} />
      </motion.div>
      
      <div className="space-y-4 max-w-xs">
        <h1 className="text-2xl font-black tracking-tight">{t('pending_approval')}</h1>
        <p className="text-slate-400 font-medium text-sm leading-relaxed">
          Olá <span className="text-slate-200 font-bold" style={{ color: user.color }}>{user.name}</span>! 
          {t('pending_msg')}
        </p>
      </div>

      <div className={cn(
        "p-4 rounded-2xl border border-dashed flex items-center gap-3",
        isDarkMode ? "border-white/10 bg-white/5" : "border-slate-200 bg-white"
      )}>
        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('status_pending')}</span>
      </div>

      <button 
        onClick={onLogout}
        className="text-xs font-bold text-slate-500 hover:text-red-500 transition-colors flex items-center gap-2"
      >
        <LogOut size={14} />
        {t('logout')}
      </button>
    </div>
  );
}
