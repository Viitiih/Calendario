import * as React from "react";
import { useState, useMemo, memo } from "react";
import { 
  Calendar as CalendarIcon, 
  ChevronLeft,
  Share2,
  User
} from "lucide-react";
import { motion } from "motion/react";
import { cn, USER_COLORS } from "../lib/utils";

interface LoginScreenProps {
  onLogin: (name: string, color: string) => void;
  onValidateInvite?: (code: string) => Promise<boolean>;
  isLoading?: boolean;
  inviteError?: string | null;
  calendarUsers: any[];
  t: (key: string) => string;
}

export const LoginScreen = memo(({ 
  onLogin, 
  onValidateInvite,
  isLoading = false,
  inviteError = null,
  calendarUsers,
  t
}: LoginScreenProps) => {
  const [name, setName] = useState("");
  const [color, setColor] = useState("");
  const [authMode, setAuthMode] = useState<"initial" | "invite">("initial");
  const [inviteCodeInput, setInviteCodeInput] = useState("");

  const takenColors = useMemo(() => calendarUsers.map(u => u.color), [calendarUsers]);

  const handleInviteSubmit = async () => {
    if (!inviteCodeInput || !onValidateInvite) return;
    const success = await onValidateInvite(inviteCodeInput);
    if (success) {
      setAuthMode("initial");
    }
  };

  const handleEnterClick = () => {
    let finalName = name.trim() || t('visitor_name') || "Visitante";
    let selectedColor = color;
    if (!selectedColor) {
      const availableColors = USER_COLORS.filter(c => !takenColors.includes(c));
      selectedColor = availableColors.length > 0 
        ? availableColors[Math.floor(Math.random() * availableColors.length)]
        : USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];
    }
    onLogin(finalName, selectedColor);
  };

  return (
    <div className="min-h-[100dvh] bg-black flex flex-col items-center p-4 sm:p-8 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm bg-[#111111] p-6 sm:p-8 rounded-[32px] shadow-2xl border border-white/5 my-auto"
      >
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-20 h-20 bg-white/5 rounded-[28px] flex items-center justify-center text-white mb-6 shadow-2xl border border-white/10 rotate-3">
            <CalendarIcon size={40} />
          </div>
          <h1 className="text-4xl font-black text-white mb-2 tracking-tight">WorkSync</h1>
          <p className="text-slate-400 font-medium text-sm">{t('app_description')}</p>
        </div>
        
        <div className="space-y-6">
          {authMode === "initial" ? (
            <div className="space-y-4">
              <div className="relative">
                <input 
                  type="text" 
                  placeholder={t('name_placeholder') || "Seu nome"}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-12 pr-5 py-4 bg-black border border-white/10 rounded-2xl focus:outline-none focus:border-blue-500 text-white font-medium transition-all focus:ring-4 ring-blue-500/10 placeholder:text-slate-600"
                />
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
              </div>

              <div className="flex justify-center gap-2 flex-wrap pb-2">
                {USER_COLORS.map(c => {
                  const isTaken = takenColors.includes(c);
                  return (
                    <button
                      key={c}
                      onClick={() => !isTaken && setColor(c)}
                      disabled={isTaken}
                      className={cn(
                        "w-8 h-8 rounded-full transition-all border-2",
                        color === c ? "scale-110 border-white" : "border-transparent hover:scale-110",
                        isTaken && "opacity-20 cursor-not-allowed hidden"
                      )}
                      style={{ backgroundColor: c }}
                      aria-label={`Select color ${c}`}
                      type="button"
                    />
                  );
                })}
              </div>

              <button 
                onClick={handleEnterClick}
                disabled={isLoading}
                className="w-full bg-blue-500 text-white font-black py-4 rounded-2xl shadow-xl active:scale-95 transition-all disabled:opacity-50 disabled:bg-slate-800 disabled:text-slate-500 flex items-center justify-center gap-2"
              >
                {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                {t('enter')}
              </button>

              <div className="pt-2">
                <button 
                  onClick={() => setAuthMode("invite")}
                  className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-2xl border border-white/10 transition-all flex items-center justify-center gap-2 mb-2"
                >
                  <Share2 size={16} className="text-amber-400" />
                  {t('enter_with_invite_code')}
                </button>
                <button 
                  onClick={() => {
                    let selectedColor = USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];
                    onLogin("Visitante", selectedColor);
                  }}
                  disabled={isLoading}
                  className="w-full bg-transparent hover:bg-white/5 text-slate-400 font-bold py-3 rounded-2xl transition-all flex items-center justify-center text-sm"
                >
                  Pular (Entrar sem Nome)
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <button onClick={() => setAuthMode("initial")} className="p-2 text-slate-400 hover:text-white transition-colors">
                  <ChevronLeft size={20} />
                </button>
                <h2 className="text-lg font-bold text-white">{t('invite_code')}</h2>
              </div>
              
              <div className="relative">
                <input 
                  type="text" 
                  placeholder={t('invite_code')}
                  value={inviteCodeInput}
                  onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
                  className="w-full px-5 py-4 bg-black border border-white/10 rounded-2xl focus:outline-none text-white font-bold text-center tracking-widest uppercase"
                />
              </div>

              {inviteError && (
                <p className="text-xs text-red-500 font-bold text-center">{inviteError}</p>
              )}

              <button 
                onClick={handleInviteSubmit}
                disabled={!inviteCodeInput || isLoading}
                className="w-full bg-amber-500 text-black font-black py-4 rounded-2xl shadow-xl active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Share2 size={18} />
                )}
                {t('validate_invite')}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
});
