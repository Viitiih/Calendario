import * as React from "react";
import { useState, useMemo, useEffect } from "react";
import { 
  User as UserIcon, 
  Trash2, 
  Save, 
  ChevronLeft, 
  Smartphone, 
  Mail, 
  Lock, 
  Check, 
  LogOut, 
  X, 
  Palette, 
  Moon, 
  Sun,
  Languages,
  Download,
  Upload,
  Share2,
  Copy,
  Plus
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { User } from "../types";
import { Language } from "../translations";
import { cn, USER_COLORS } from "../lib/utils";

interface SettingsProps {
  user: User;
  onUpdateUser: (u: Partial<User>) => void;
  onLogout: () => void;
  isDarkMode: boolean;
  calendarId: string;
  inviteCode: string;
  calendarUsers: any[];
  language: Language;
  onUpdateLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

export const Settings = ({ 
  user, 
  onUpdateUser, 
  onLogout, 
  isDarkMode, 
  calendarId,
  inviteCode,
  calendarUsers,
  language,
  onUpdateLanguage,
  t
}: SettingsProps) => {
  const [activeSubTab, setActiveSubTab] = useState<"profile" | "app" | "invites">("profile");
  const [name, setName] = useState(user.name);
  const [selectedColor, setSelectedColor] = useState(user.color);
  const [isLangExpanded, setIsLangExpanded] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const copyInviteLink = () => {
    const link = `${window.location.origin}${window.location.pathname}?invite=${inviteCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const [copied, setCopied] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const copyDirectCode = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const takenColors = useMemo(() => 
    calendarUsers.filter(u => u.id !== user.id).map(u => u.color), 
    [calendarUsers, user.id]
  );

  const languages: { code: Language; name: string; flag: string }[] = [
    { code: 'pt', name: 'Português', flag: '🇧🇷' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'it', name: 'Italiano', flag: '🇮🇹' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' }
  ];

  const currentLang = languages.find(l => l.code === language) || languages[0];

  const handleSave = () => {
    onUpdateUser({ name, color: selectedColor });
    setHasUnsavedChanges(false);
    // Visual feedback usually via some toast, but here we can just rely on the UI updating
  };

  const handleClearData = () => {
    if (window.confirm(t('confirm_clear_data'))) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const handleExport = () => {
    const data: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("worksync_")) {
        data[key] = localStorage.getItem(key) || "";
      }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `worksync_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (typeof data === 'object' && data !== null) {
           Object.keys(data).forEach(key => {
             if (key.startsWith("worksync_")) {
               localStorage.setItem(key, data[key]);
             }
           });
           window.location.reload();
        } else {
          throw new Error("Invalid data format");
        }
      } catch (err) {
        console.error("Erro ao importar dados:", err);
        alert("Arquivo de backup inválido.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-2 mb-2">
           <div className="w-8 h-[2px] rounded-full bg-blue-500/20" />
           <span className="tech-label tracking-[0.4em] opacity-40">{t('settings')}</span>
           <div className="w-8 h-[2px] rounded-full bg-blue-500/20" />
        </div>
        <h2 className={cn(
          "text-4xl font-display font-black tracking-tighter",
          isDarkMode ? "text-slate-100" : "text-slate-900"
        )}>{t('personalize_experience')}</h2>
      </div>

      <div className="flex bg-slate-500/5 p-1.5 rounded-[32px] gap-1 max-w-[340px] mx-auto">
        {[
          { id: 'profile', icon: UserIcon, label: t('me') },
          { id: 'invites', icon: Share2, label: t('invitations') },
          { id: 'app', icon: Palette, label: t('app_settings') }
        ].map(st => (
          <button
            key={st.id}
            onClick={() => setActiveSubTab(st.id as any)}
            className={cn(
              "flex-1 py-3.5 rounded-[24px] flex flex-col items-center gap-1 transition-all duration-500 relative overflow-hidden group",
              activeSubTab === st.id 
                ? (isDarkMode ? "bg-white/10 text-white shadow-xl" : "bg-white text-blue-600 shadow-premium") 
                : "text-slate-500 hover:text-slate-400"
            )}
          >
            <st.icon size={18} strokeWidth={activeSubTab === st.id ? 2.5 : 2} className="relative z-10 transition-transform group-active:scale-90" />
            <span className="text-[9px] font-black uppercase tracking-widest relative z-10">{st.label}</span>
          </button>
        ))}
      </div>

      <div className="space-y-6">
        <AnimatePresence mode="wait">
          {activeSubTab === 'profile' && (
            <motion.div 
              key="profile-tab"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* User Profile Card */}
        <div className={cn(
          "p-8 rounded-[40px] border transition-all duration-300 relative overflow-hidden",
          isDarkMode 
            ? "bg-black/40 border-white/[0.03] shadow-2xl" 
            : "bg-white border-slate-200/60 shadow-premium"
        )}>
           <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

          <div className="flex items-center gap-5 mb-8 relative z-10">
             <div className={cn(
              "w-16 h-16 rounded-[24px] flex items-center justify-center text-white font-tech font-black text-3xl shadow-2xl transition-all duration-300 hover:scale-110",
              "rotate-3 hover:rotate-0"
            )} style={{ backgroundColor: selectedColor, boxShadow: `0 12px 24px -6px ${selectedColor}66` }}>
              {name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className={cn(
                "text-lg font-display font-black",
                isDarkMode ? "text-slate-200" : "text-slate-900"
              )}>{t('user_settings')}</h3>
              <p className="tech-label tracking-widest opacity-40">
                ID: {user.id.substring(0, 8)}...
              </p>
            </div>
          </div>

          <div className="space-y-6 relative z-10">
            <div>
              <label className="tech-label mb-3 ml-1 block">
                {t('name')}
              </label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                className={cn(
                  "w-full px-5 py-4 rounded-2xl border transition-all duration-500 font-display font-bold text-lg focus:outline-none focus:ring-4",
                  isDarkMode 
                    ? "bg-black/40 border-white/5 text-white focus:ring-white/5 focus:border-white/10" 
                    : "bg-slate-50/50 border-slate-200/60 text-slate-900 focus:ring-blue-100/50 focus:border-blue-200"
                )}
              />
            </div>

            <div>
              <label className="tech-label mb-4 ml-1 block">
                {t('primary_color')}
              </label>
              <div className="grid grid-cols-5 gap-3">
                {USER_COLORS.map((c) => {
                  const isTaken = takenColors.includes(c);
                  return (
                    <button
                      key={c}
                      onClick={() => {
                        if (!isTaken) {
                          setSelectedColor(c);
                          setHasUnsavedChanges(true);
                        }
                      }}
                      disabled={isTaken}
                      className={cn(
                        "w-full aspect-square rounded-[18px] border-4 transition-all duration-500 relative shadow-sm",
                        selectedColor === c 
                          ? (isDarkMode ? "border-white scale-110 shadow-lg" : "border-slate-900 scale-110 shadow-lg") 
                          : "border-transparent hover:scale-105",
                        isTaken && "opacity-20 cursor-not-allowed grayscale scale-90"
                      )}
                      style={{ backgroundColor: c }}
                    >
                      {isTaken && <X size={12} className="absolute inset-0 m-auto text-white" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <AnimatePresence>
            {hasUnsavedChanges && (
              <motion.button 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                onClick={handleSave}
                className="w-full mt-8 py-5 rounded-2xl bg-blue-600 text-white tech-label tracking-[0.2em] flex items-center justify-center gap-3 shadow-xl shadow-blue-600/30 hover:scale-[1.02] active:scale-95 transition-all"
              >
                <Save size={18} strokeWidth={2.5} />
                {t('save')}
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Sync Card */}
        <div className={cn(
          "p-6 rounded-2xl border shadow-sm space-y-4 overflow-hidden relative",
          isDarkMode ? "bg-slate-900/50 border-white/5" : "bg-white border-slate-200"
        )}>
           <div className="flex items-center gap-4 mb-2">
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center",
              isDarkMode ? "bg-white/5 text-slate-400" : "bg-slate-100 text-slate-500"
            )}>
              <UserIcon size={24} />
            </div>
            <div>
              <h3 className={cn(
                "text-sm font-bold",
                isDarkMode ? "text-slate-200" : "text-slate-900"
              )}>{t('account_sync')}</h3>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  {t('local_data')}
                </p>
              </div>
            </div>
          </div>
          <div className="space-y-3 pt-2">
            <button 
              onClick={onLogout}
              className="w-full py-4 rounded-xl border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/5 transition-all flex items-center justify-center gap-2"
            >
              <LogOut size={16} />
              {t('logout')}
            </button>
          </div>
        </div>
      </motion.div>
    )}

          {activeSubTab === 'invites' && (
            <motion.div 
              key="invites-tab"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Invitations Management Card */}
              <div className={cn(
                "p-8 rounded-[40px] border transition-all duration-300 relative overflow-hidden",
                isDarkMode 
                  ? "bg-black/40 border-white/[0.03] shadow-2xl" 
                  : "bg-white border-slate-200/60 shadow-premium"
              )}>
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
                
                <div className="flex items-center justify-between gap-4 mb-8 relative z-10">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center transition-transform duration-200 hover:rotate-12",
                      isDarkMode ? "bg-white/[0.05] text-amber-400" : "bg-amber-50 text-amber-600 shadow-soft"
                    )}>
                      <Share2 size={24} strokeWidth={2} />
                    </div>
                    <div>
                      <h3 className={cn(
                        "text-lg font-display font-black",
                        isDarkMode ? "text-slate-200" : "text-slate-900"
                      )}>{t('invitations')}</h3>
                      <p className="tech-label tracking-widest opacity-40">
                        Compartilhar Calendário
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 relative z-10">
                  <div className={cn(
                  "p-4 rounded-2xl border transition-all duration-300 flex flex-col gap-4 group",
                    isDarkMode ? "bg-white/5 border-white/10 hover:border-white/20" : "bg-slate-50 border-slate-200 hover:border-slate-300"
                  )}>
                    <div className="flex-1 min-w-0 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                        <Share2 size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className={cn("font-bold text-sm truncate", isDarkMode ? "text-slate-200" : "text-slate-800")}>{inviteCode}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t('invite_code') || "Código de Convite"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-full">
                      <button 
                        onClick={copyDirectCode}
                        className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                          copiedCode 
                            ? "bg-emerald-500 text-white" 
                            : (isDarkMode ? "bg-white/10 hover:bg-white/20 text-white" : "bg-slate-200 hover:bg-slate-300 text-slate-700")
                        )}
                        title="Copiar Código"
                      >
                        {copiedCode ? <Check size={16} /> : <Copy size={16} />}
                      </button>
                      <button 
                        onClick={copyInviteLink}
                        className={cn(
                          "px-4 h-10 rounded-xl flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-all shadow-lg",
                          copied 
                            ? "bg-emerald-500 text-white" 
                            : "bg-amber-500 text-black hover:bg-amber-400 hover:scale-105 active:scale-95"
                        )}
                      >
                        {copied ? <Check size={16} /> : <Share2 size={16} />}
                       {copied ? t('copy_success') : "Copiar Link"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeSubTab === 'app' && (
            <motion.div 
              key="app-tab"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* App Settings Card */}
              <div className={cn(
                "p-8 rounded-[40px] border transition-all duration-700 relative",
                isDarkMode 
                  ? "bg-black/40 border-white/[0.03] shadow-2xl" 
                  : "bg-white border-slate-200/60 shadow-premium"
              )}>
                <div className="flex items-center gap-4 mb-8">
                   <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center transition-transform duration-500 hover:rotate-12",
                    isDarkMode ? "bg-white/[0.05] text-blue-400" : "bg-blue-50 text-blue-600 shadow-soft"
                  )}>
                    <Palette size={24} strokeWidth={2} />
                  </div>
                  <div>
                    <h3 className={cn(
                      "text-lg font-display font-black",
                      isDarkMode ? "text-slate-200" : "text-slate-900"
                    )}>{t('app_settings')}</h3>
                    <p className="tech-label tracking-widest opacity-40">
                      {t('theme')} & {t('language')}
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className={cn(
                    "flex items-center justify-between p-5 rounded-3xl border transition-all duration-500",
                    isDarkMode ? "bg-white/[0.03] border-white/5" : "bg-slate-50/50 border-slate-200/60 shadow-soft"
                  )}>
                    <div className="flex items-center gap-4">
                      <div className={cn(
                         "w-10 h-10 rounded-xl flex items-center justify-center",
                         isDarkMode ? "bg-white/[0.05] text-slate-400" : "bg-white text-amber-500 shadow-sm"
                      )}>
                        {user.darkMode ? <Moon size={20} strokeWidth={2} /> : <Sun size={20} strokeWidth={2} />}
                      </div>
                      <span className={cn("text-sm font-display font-black", isDarkMode ? "text-slate-300" : "text-slate-700")}>
                        {t('dark_mode')}
                      </span>
                    </div>
                    <button 
                      onClick={() => onUpdateUser({ darkMode: !user.darkMode })}
                      className={cn(
                        "w-14 h-8 rounded-full transition-all duration-300 relative inner-shadow",
                        user.darkMode ? "bg-blue-600" : "bg-slate-200"
                      )}
                    >
                      <div className={cn(
                        "absolute top-1 w-6 h-6 rounded-full bg-white transition-all duration-300 shadow-xl flex items-center justify-center",
                        user.darkMode ? "left-7" : "left-1"
                      )}>
                         {user.darkMode ? <Moon size={10} className="text-blue-600" /> : <Sun size={10} className="text-amber-500" />}
                      </div>
                    </button>
                  </div>

                  <div className="relative">
                    <button 
                      onClick={() => setIsLangExpanded(!isLangExpanded)}
                      className={cn(
                        "w-full p-5 rounded-3xl border flex items-center justify-between transition-all duration-500 group overflow-hidden",
                        isDarkMode ? "bg-white/[0.03] border-white/5 hover:bg-white/[0.05]" : "bg-slate-50/50 border-slate-200/60 shadow-soft hover:bg-slate-50"
                      )}
                    >
                      <div className="flex items-center gap-4 relative z-10">
                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-white/5 flex items-center justify-center shadow-sm text-xl">
                          {currentLang.flag}
                        </div>
                        <div className="text-left">
                          <p className="tech-label tracking-widest opacity-40 lowercase mb-1">{t('language')}</p>
                          <span className={cn("text-sm font-display font-black", isDarkMode ? "text-slate-300" : "text-slate-700")}>
                            {currentLang.name}
                          </span>
                        </div>
                      </div>
                      <ChevronLeft size={18} className={cn("text-slate-400 transition-transform duration-500", isLangExpanded ? "rotate-[270deg]" : "rotate-180")} />
                    </button>

                    <AnimatePresence>
                      {isLangExpanded && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.95, y: -20 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: -20 }}
                          className={cn(
                            "absolute top-full left-0 right-0 mt-3 z-50 rounded-[32px] border shadow-2xl overflow-hidden p-2",
                            isDarkMode ? "bg-slate-900 border-white/10" : "bg-white border-slate-200 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.25)]"
                          )}
                        >
                          {languages.map((lang) => (
                            <button 
                              key={lang.code}
                              onClick={() => {
                                onUpdateLanguage(lang.code);
                                setIsLangExpanded(false);
                              }}
                              className={cn(
                                "w-full p-4 flex items-center gap-4 transition-all rounded-2xl group",
                                language === lang.code 
                                  ? (isDarkMode ? "bg-white/10" : "bg-blue-50") 
                                  : "hover:bg-slate-500/5"
                              )}
                            >
                              <span className="text-xl group-hover:scale-125 transition-transform">{lang.flag}</span>
                              <span className={cn(
                                "text-sm font-display font-black",
                                language === lang.code ? "text-blue-500" : (isDarkMode ? "text-slate-300" : "text-slate-700")
                              )}>{lang.name}</span>
                              {language === lang.code && <Check size={16} className="ml-auto text-blue-500" strokeWidth={3} />}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Data Management Card */}
              <div className={cn(
                "p-6 rounded-2xl border shadow-sm space-y-6",
                isDarkMode ? "bg-slate-900/50 border-white/5" : "bg-white border-slate-200"
              )}>
                <div className="flex items-center gap-4">
                   <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    isDarkMode ? "bg-white/5 text-emerald-400" : "bg-emerald-50 text-emerald-600"
                  )}>
                    <Download size={20} />
                  </div>
                  <div>
                    <h3 className={cn(
                      "text-sm font-bold",
                      isDarkMode ? "text-slate-200" : "text-slate-900"
                    )}>{t('data_management')}</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      Backup & Restauração
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                   <button 
                      onClick={handleExport}
                      className={cn(
                        "p-4 rounded-xl border flex flex-col items-center gap-2 transition-all active:scale-95 group",
                        isDarkMode ? "bg-black border-white/5 hover:bg-white/5" : "bg-slate-50 border-slate-100 hover:bg-slate-100"
                      )}
                    >
                      <Download size={20} className="text-emerald-500 group-hover:bounce" />
                      <div className="text-center">
                        <p className={cn("text-[10px] font-black uppercase tracking-widest", isDarkMode ? "text-slate-200" : "text-slate-900")}>
                          {t('export_data')}
                        </p>
                        <p className="text-[8px] text-slate-400 font-bold mt-0.5">{t('export_desc')}</p>
                      </div>
                    </button>

                    <label className={cn(
                      "p-4 rounded-xl border flex flex-col items-center gap-2 transition-all active:scale-95 group cursor-pointer",
                      isDarkMode ? "bg-black border-white/5 hover:bg-white/5" : "bg-slate-50 border-slate-100 hover:bg-slate-100"
                    )}>
                      <input 
                        type="file" 
                        accept=".json" 
                        onChange={handleImport} 
                        className="hidden" 
                      />
                      <Upload size={20} className="text-blue-500 group-hover:bounce" />
                      <div className="text-center">
                        <p className={cn("text-[10px] font-black uppercase tracking-widest", isDarkMode ? "text-slate-200" : "text-slate-900")}>
                          {t('import_data')}
                        </p>
                        <p className="text-[8px] text-slate-400 font-bold mt-0.5">{t('import_desc')}</p>
                      </div>
                    </label>
                </div>
              </div>

              {/* Danger Zone */}
              <div className={cn(
                "p-6 rounded-2xl border border-red-500/20 shadow-sm space-y-4",
                isDarkMode ? "bg-red-500/5" : "bg-red-50/30"
              )}>
                <div>
                  <h3 className="text-sm font-bold text-red-500">Zona de Perigo</h3>
                  <p className="text-[10px] text-red-400 font-bold uppercase tracking-wider">{t('irreversible_actions')}</p>
                </div>
                
                <button 
                  onClick={handleClearData}
                  className="w-full py-4 rounded-xl bg-red-500 text-white font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-red-500/20 active:scale-95 transition-all"
                >
                  <Trash2 size={16} />
                  {t('clear_all_data')}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Settings;
