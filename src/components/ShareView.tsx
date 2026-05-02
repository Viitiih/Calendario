import * as React from "react";
import { useState, memo } from "react";
import { 
  Share2, 
  Link as LinkIcon, 
  Check, 
  Copy, 
  Trash2, 
  CalendarDays, 
  Users 
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import { CalendarData } from "../types";

interface ShareViewProps {
  calendarId: string;
  calendarData: CalendarData;
  updateCalendar: (d: CalendarData) => void;
  primaryColor: string;
  isDarkMode: boolean;
  isAdmin: boolean;
}

export const ShareView = memo(({ 
  calendarId, 
  calendarData, 
  updateCalendar, 
  primaryColor, 
  isDarkMode, 
  isAdmin,
  t
}: ShareViewProps & { t: (k: any) => string }) => {
  const [copied, setCopied] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<"invite" | "pending">("invite");
  const inviteCode = calendarData.inviteCode || calendarId;
  const inviteLink = `${window.location.origin}${window.location.pathname}?invite=${inviteCode}`;
// Na interface de props, adicione:
onCopyToShared: () => void;
onCopyToLocal: () => void;
onSync: () => void;

// No JSX, adicione esses botões:
<div className="flex flex-col gap-2 mt-4">
  <button onClick={onCopyToShared} className="w-full py-3 rounded-xl font-bold text-sm" style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}>
    ↑ Copiar pessoal → compartilhado
  </button>
  <button onClick={onCopyToLocal} className="w-full py-3 rounded-xl font-bold text-sm" style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}>
    ↓ Copiar compartilhado → pessoal
  </button>
  <button onClick={onSync} className="w-full py-3 rounded-xl font-bold text-sm bg-amber-500/10 text-amber-500">
    ⇄ Sincronizar ambos
  </button>
</div>
  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const [copiedCode, setCopiedCode] = useState(false);
  const handleCopyCode = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleAccept = (user: { id: string, name: string, color: string }) => {
    const users = [...(calendarData.users || []), user];
    const pending = (calendarData.pendingUsers || []).filter(u => u.id !== user.id);
    updateCalendar({ ...calendarData, users, pendingUsers: pending });
  };

  const handleDecline = (userId: string) => {
    const pending = (calendarData.pendingUsers || []).filter(u => u.id !== userId);
    updateCalendar({ ...calendarData, pendingUsers: pending });
  };

  const pendingCount = (calendarData.pendingUsers || []).length;

  return (
    <div className="space-y-8 pb-20 max-w-2xl mx-auto px-1">
      <div className="text-center space-y-4">
        <div 
          className="w-20 h-20 rounded-[28px] mx-auto flex items-center justify-center text-white shadow-2xl relative group transition-all hover:scale-105 hover:rotate-3"
          style={{ backgroundColor: primaryColor }}
        >
          <div className="absolute inset-0 rounded-[28px] bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          <Share2 size={32} strokeWidth={2.5} />
        </div>
        <div className="space-y-1.5 px-4">
          <h2 className={cn(
            "text-3xl font-black tracking-tight",
            isDarkMode ? "text-white" : "text-slate-900"
          )}>
            {t('share_view_title')}
          </h2>
          <p className={cn(
            "text-sm font-medium leading-relaxed",
            isDarkMode ? "text-slate-400" : "text-slate-500"
          )}>
            {t('share_view_subtitle')}
          </p>
        </div>
      </div>

      {/* Internal Tabs - Discord Style */}
      <div className={cn(
        "p-1.5 rounded-2xl flex items-center gap-1 border mx-4 sm:mx-0",
        isDarkMode ? "bg-black/40 border-white/5" : "bg-slate-100 border-slate-200"
      )}>
        <button 
          onClick={() => setActiveSubTab("invite")}
          className={cn(
            "flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
            activeSubTab === "invite" 
              ? (isDarkMode ? "bg-white text-black shadow-lg" : "bg-white text-slate-900 shadow-sm")
              : (isDarkMode ? "text-slate-400 hover:text-slate-200 hover:bg-white/5" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50")
          )}
        >
          {t('invite_tab')}
        </button>
        <button 
          onClick={() => setActiveSubTab("pending")}
          className={cn(
            "flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all relative",
            activeSubTab === "pending" 
              ? (isDarkMode ? "bg-white text-black shadow-lg" : "bg-white text-slate-900 shadow-sm")
              : (isDarkMode ? "text-slate-400 hover:text-slate-200 hover:bg-white/5" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50")
          )}
        >
          {t('pending_tab')}
          {pendingCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] flex items-center justify-center rounded-full font-black shadow-lg ring-2 ring-black">
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeSubTab === "invite" ? (
          <motion.div 
            key="invite-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-8 px-4 sm:px-0"
          >
            <div className={cn(
              "p-6 sm:p-8 rounded-[32px] border",
              isDarkMode ? "bg-[#111111] border-white/5 shadow-2xl" : "bg-white border-slate-200 shadow-xl"
            )}>
              <div className="space-y-8">
                
                {/* Link Share */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className={cn(
                      "text-[10px] font-black uppercase tracking-[0.2em]",
                      isDarkMode ? "text-slate-500" : "text-slate-400"
                    )}>
                      {t('invite_link_label')}
                    </label>
                    <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-lg uppercase tracking-wider">
                      Ativo
                    </span>
                  </div>
                  <div className={cn(
                    "group flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3 rounded-2xl border transition-all duration-300",
                    isDarkMode ? "bg-black/50 border-white/5 focus-within:border-white/20" : "bg-slate-50 border-slate-200 focus-within:border-slate-300 shadow-inner"
                  )}>
                    <div className="flex items-center gap-3 flex-1 min-w-0 px-2 py-2 sm:py-0">
                      <LinkIcon className={isDarkMode ? "text-slate-500" : "text-slate-400"} size={18} />
                      <input 
                        type="text" 
                        readOnly 
                        value={inviteLink}
                        className={cn(
                          "bg-transparent border-none focus:outline-none text-sm font-bold flex-1 min-w-0 truncate",
                          isDarkMode ? "text-slate-300" : "text-slate-700"
                        )}
                      />
                    </div>
                    <button 
                      onClick={handleCopyLink}
                      className={cn(
                        "sm:px-6 py-3 sm:py-2.5 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg",
                        copied 
                          ? "bg-emerald-500 text-white shadow-emerald-500/20" 
                          : (isDarkMode ? "bg-white text-black hover:bg-slate-200" : "bg-slate-900 text-white hover:bg-slate-800")
                      )}
                    >
                      {copied ? <Check size={18} strokeWidth={3} /> : <Copy size={18} strokeWidth={3} />}
                      {copied ? t('copy_success') : t('copy_invite_link')}
                    </button>
                  </div>
                  <p className="text-[10px] font-medium text-slate-500 ml-1">
                    {t('invite_link_hint')}
                  </p>
                </div>
                
                <div className={cn("h-px w-full", isDarkMode ? "bg-white/5" : "bg-slate-100")} />

                {/* Code Share */}
                <div className="space-y-4">
                  <label className={cn(
                    "text-[10px] font-black uppercase tracking-[0.2em]",
                    isDarkMode ? "text-slate-500" : "text-slate-400"
                  )}>
                    {t('invite_code_label')}
                  </label>
                  <div className="flex flex-col sm:flex-row items-stretch gap-3">
                    <div className={cn(
                      "flex-1 p-4 rounded-2xl border text-center font-mono font-bold tracking-[0.5em] text-2xl transition-all",
                      isDarkMode ? "bg-black/50 border-white/5 text-white" : "bg-slate-50 border-slate-200 text-slate-900 shadow-inner"
                    )}>
                      {inviteCode}
                    </div>
                    <button 
                      onClick={handleCopyCode}
                      className={cn(
                        "sm:px-8 py-4 rounded-2xl text-sm font-black flex items-center justify-center gap-2 transition-all active:scale-95 shadow-xl",
                        copiedCode 
                          ? "bg-emerald-500 text-white" 
                          : (isDarkMode ? "bg-white/10 hover:bg-white/20 text-white border border-white/5" : "bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-200")
                      )}
                    >
                      {copiedCode ? <Check size={20} strokeWidth={3} /> : <Copy size={20} strokeWidth={3} />}
                      {copiedCode ? t('copy_success') : t('copy_invite_link')}
                    </button>
                  </div>
                </div>

                <div className={cn(
                  "mt-6 p-5 rounded-[24px] flex items-start gap-4 border",
                  isDarkMode ? "bg-white/[0.02] border-white/5" : "bg-slate-50/50 border-slate-100"
                )}>
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg",
                    isDarkMode ? "bg-white/5 text-slate-200" : "bg-white text-slate-600"
                  )}>
                    <CalendarDays size={22} />
                  </div>
                  <div className="space-y-1.5 pt-0.5 min-w-0">
                    <p className={cn("text-[10px] font-black uppercase tracking-widest", isDarkMode ? "text-slate-500" : "text-slate-400")}>
                      ID do Sistema
                    </p>
                    <p className="text-[11px] font-mono text-slate-500 break-all leading-relaxed font-bold">
                      {calendarId}
                    </p>
                  </div>
                </div>

              </div>
            </div>

            {/* Members List */}
            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between px-2">
                <h3 className={cn(
                  "text-[10px] font-black uppercase tracking-[0.2em]",
                  isDarkMode ? "text-slate-500" : "text-slate-400"
                )}>
                  {t('members_title')}
                </h3>
                <span className="text-[10px] font-black text-slate-500">
                  {(calendarData.users || []).length} usuários
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {(calendarData.users || []).map(u => (
                  <div 
                    key={u.id}
                    className={cn(
                      "p-5 rounded-3xl flex items-center justify-between border group transition-all duration-300",
                      isDarkMode ? "bg-[#111111] border-white/5 hover:border-white/10" : "bg-white border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md",
                    )}
                  >
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className="relative">
                        <div 
                          className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-lg font-black shadow-2xl shrink-0 transition-transform group-hover:scale-110 group-hover:rotate-3"
                          style={{ backgroundColor: u.color }}
                        >
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-4 border-[#111111] rounded-full shadow-lg" />
                      </div>
                      <div className="flex flex-col min-w-0 gap-1">
                        <span className={cn("text-base font-black truncate tracking-tight", isDarkMode ? "text-white" : "text-slate-900")}>{u.name}</span>
                        <div className="flex items-center gap-2">
                          {calendarData.ownerId === u.id ? (
                            <span className="text-[8px] font-black text-amber-400 uppercase tracking-widest bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">{t('admin_badge')}</span>
                          ) : (
                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest bg-slate-500/10 px-2 py-0.5 rounded-full border border-slate-500/10">{t('member_badge')}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">{t('online_now')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="pending-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-6 px-4 sm:px-0"
          >
            <div className="px-4 text-center space-y-2">
              <h3 className={cn("text-lg font-black tracking-tight", isDarkMode ? "text-white" : "text-slate-900")}>
                {t('pending_requests')}
              </h3>
              <p className={cn("text-xs font-medium leading-relaxed max-w-xs mx-auto", isDarkMode ? "text-slate-500" : "text-slate-500")}>
                Novos usuários solicitando acesso aparecerão aqui para sua aprovação.
              </p>
            </div>
            
            {(calendarData.pendingUsers || []).length === 0 ? (
              <div className={cn(
                "py-24 rounded-[40px] border text-center space-y-4 mx-4 sm:mx-0",
                isDarkMode ? "bg-[#111111] border-white/5" : "bg-slate-50 border-slate-200"
              )}>
                <div className={cn(
                  "w-16 h-16 rounded-[24px] flex items-center justify-center mx-auto shadow-2xl transition-all",
                  isDarkMode ? "bg-white/5 text-slate-600" : "bg-white text-slate-300"
                )}>
                  <Users size={32} strokeWidth={2} />
                </div>
                <div className="space-y-1">
                  <p className={cn("text-base font-black", isDarkMode ? "text-white" : "text-slate-900")}>{t('no_pending_requests')}</p>
                  <p className={cn("text-xs font-medium", isDarkMode ? "text-slate-500" : "text-slate-400")}>Sua equipe está completa por enquanto.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {(calendarData.pendingUsers || []).map(u => (
                  <div 
                    key={u.id}
                    className={cn(
                      "p-5 rounded-[32px] flex items-center justify-between border shadow-xl relative overflow-hidden group",
                      isDarkMode ? "bg-[#111111] border-white/5" : "bg-white border-slate-200"
                    )}
                  >
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div 
                        className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-black shadow-2xl shrink-0 transition-transform group-hover:scale-105"
                        style={{ backgroundColor: u.color }}
                      >
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className={cn("text-lg font-black truncate tracking-tight", isDarkMode ? "text-white" : "text-slate-900")}>{u.name}</span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Solicitando entrada</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => handleAccept(u)}
                        className="h-12 px-6 rounded-2xl bg-white text-black hover:bg-emerald-500 hover:text-white text-xs font-black transition-all active:scale-95 shadow-lg flex items-center justify-center"
                      >
                        {t('accept_member')}
                      </button>
                      <button 
                        onClick={() => handleDecline(u.id)}
                        className={cn(
                          "w-12 h-12 rounded-2xl transition-all flex items-center justify-center active:scale-95 border shadow-sm",
                          isDarkMode ? "bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border-white/5" : "bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-500 border-slate-200"
                        )}
                      >
                        <Trash2 size={20} strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

