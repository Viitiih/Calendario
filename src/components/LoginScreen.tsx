import * as React from "react";
import { useState, useMemo, memo } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  Share2,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Phone,
  User,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn, USER_COLORS } from "../lib/utils";
import { registerUser, loginUser } from "../lib/authService";

interface LoginScreenProps {
  onLogin: (name: string, color: string, firebaseUid?: string) => void;
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
  t,
}: LoginScreenProps) => {
  const [authMode, setAuthMode] = useState<"initial" | "invite" | "login" | "register">("initial");
  const [name, setName] = useState("");
  const [color, setColor] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const takenColors = useMemo(() => calendarUsers.map((u) => u.color), [calendarUsers]);
  const isSubmitting = loading || isLoading;

  const handleInviteSubmit = async () => {
    if (!inviteCodeInput || !onValidateInvite) return;
    const success = await onValidateInvite(inviteCodeInput);
    if (success) setAuthMode("initial");
  };

  const handleRegister = async () => {
    if (!email || !password || !name.trim()) { setError("Preencha nome, email e senha."); return; }
    if (password.length < 6) { setError("A senha deve ter pelo menos 6 caracteres."); return; }
    setLoading(true); setError(null);
    try {
      const firebaseUser = await registerUser(email, password, name.trim());
      let selectedColor = color;
      if (!selectedColor) {
        const available = USER_COLORS.filter((c) => !takenColors.includes(c));
        selectedColor = available.length > 0 ? available[Math.floor(Math.random() * available.length)] : USER_COLORS[0];
      }
      onLogin(name.trim(), selectedColor, firebaseUser.uid);
    } catch (err: any) {
      setError(err.code === "auth/email-already-in-use" ? "Email já cadastrado. Faça login." : "Erro ao cadastrar. Tente novamente.");
    } finally { setLoading(false); }
  };

  const handleLogin = async () => {
    if (!email || !password) { setError("Preencha email e senha."); return; }
    setLoading(true); setError(null);
    try {
      const firebaseUser = await loginUser(email, password);
      const savedUser = localStorage.getItem("worksync_user");
      let userColor = USER_COLORS[0];
      if (savedUser) { try { const p = JSON.parse(savedUser); if (p.color) userColor = p.color; } catch {} }
      onLogin(firebaseUser.displayName || "Usuário", userColor, firebaseUser.uid);
    } catch (err: any) {
      setError(err.code === "auth/invalid-credential" || err.code === "auth/wrong-password" ? "Email ou senha incorretos." : "Erro ao entrar. Tente novamente.");
    } finally { setLoading(false); }
  };

  const btnBase = "w-full h-14 rounded-2xl font-bold text-sm flex items-center justify-center gap-3 transition-all active:scale-95 border";

  return (
    <div className="min-h-[100dvh] bg-[#080810] flex flex-col items-center justify-center p-4 overflow-y-auto relative">

      {/* Glow background */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[400px] h-[300px] rounded-full bg-indigo-600/10 blur-[80px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-[300px] h-[200px] rounded-full bg-cyan-500/5 blur-[60px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm relative z-10"
      >
        {/* Logo */}
        <div className="flex flex-col items-center text-center mb-10">
          <div className="w-20 h-20 rounded-[28px] flex items-center justify-center mb-6 border border-indigo-500/20 bg-indigo-500/10">
            <CalendarIcon size={36} className="text-indigo-400" />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight mb-2">WorkSync</h1>
          <p className="text-slate-500 text-sm font-medium">{t("app_description")}</p>
        </div>

        <AnimatePresence mode="wait">

          {/* ── Tela inicial ── */}
          {authMode === "initial" && (
            <motion.div key="initial" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">

              {/* Separador */}
              <div className="flex items-center gap-3 mb-2">
                <div className="flex-1 h-px bg-white/5" />
                <span className="text-[10px] font-black tracking-[0.2em] text-slate-600 uppercase">Entrar com</span>
                <div className="flex-1 h-px bg-white/5" />
              </div>

              {/* Email */}
              <button onClick={() => setAuthMode("login")} className={cn(btnBase, "bg-indigo-600 border-indigo-500/50 text-white hover:bg-indigo-500")}>
                <Mail size={18} />
                Email e Senha
              </button>

              {/* Google — visual apenas */}
              <button
                onClick={() => alert("Em breve! Configure o Google no Firebase Console.")}
                className={cn(btnBase, "bg-white/5 border-white/10 text-white hover:bg-white/10")}
              >
                <svg width="18" height="18" viewBox="0 0 48 48">
                  <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.5 6.5 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/>
                  <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16.1 19 13 24 13c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.5 6.5 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
                  <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.5 26.8 36 24 36c-5.2 0-9.6-3.3-11.3-8H6.1C9.5 35.7 16.3 44 24 44z"/>
                  <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.3 5.6l6.2 5.2C41 35.4 44 30.1 44 24c0-1.3-.1-2.6-.4-3.9z"/>
                </svg>
                Continuar com Google
                <span className="ml-auto text-[9px] font-black text-slate-600 uppercase tracking-wider">Em breve</span>
              </button>

              {/* Apple — visual apenas */}
              <button
                onClick={() => alert("Em breve! Configure o Apple Sign In no Firebase Console.")}
                className={cn(btnBase, "bg-white/5 border-white/10 text-white hover:bg-white/10")}
              >
                <svg width="18" height="18" viewBox="0 0 814 1000" fill="white">
                  <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-42.8-155.5-108.5C46.7 696.1 0 565.5 0 440.3c0-213.3 138.9-326.1 274.8-326.1 65.2 0 119.7 42.8 160.6 42.8 39.5 0 101.1-45.1 176.3-45.1 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"/>
                </svg>
                Continuar com Apple
                <span className="ml-auto text-[9px] font-black text-slate-600 uppercase tracking-wider">Em breve</span>
              </button>

              {/* Telefone — visual apenas */}
              <button
                onClick={() => alert("Em breve! Configure o Phone Auth no Firebase Console.")}
                className={cn(btnBase, "bg-white/5 border-white/10 text-white hover:bg-white/10")}
              >
                <Phone size={18} className="text-emerald-400" />
                Continuar com Telefone
                <span className="ml-auto text-[9px] font-black text-slate-600 uppercase tracking-wider">Em breve</span>
              </button>

              {/* Código de convite */}
              <button onClick={() => setAuthMode("invite")} className={cn(btnBase, "bg-white/5 border-amber-500/20 text-amber-400 hover:bg-amber-500/10")}>
                <Share2 size={18} />
                {t("enter_with_invite_code")}
              </button>

              {/* Separador convidado */}
              <div className="flex items-center gap-3 pt-1">
                <div className="flex-1 h-px bg-white/5" />
                <span className="text-[10px] font-black tracking-[0.2em] text-slate-700 uppercase">ou</span>
                <div className="flex-1 h-px bg-white/5" />
              </div>

              {/* Convidado */}
              <button
                onClick={() => { const c = USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)]; onLogin("Visitante", c); }}
                disabled={isSubmitting}
                className="w-full py-3 text-slate-600 text-sm font-bold hover:text-slate-400 transition-colors"
              >
                Pular (Entrar sem Conta)
              </button>

              <p className="text-center text-[11px] text-slate-700 pb-2">
                Você pode vincular uma conta depois nas configurações
              </p>
            </motion.div>
          )}

          {/* ── Login ── */}
          {authMode === "login" && (
            <motion.div key="login" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <button onClick={() => { setAuthMode("initial"); setError(null); }} className="p-2 text-slate-500 hover:text-white transition-colors rounded-xl hover:bg-white/5">
                  <ChevronLeft size={20} />
                </button>
                <h2 className="text-xl font-black text-white">Entrar</h2>
              </div>

              <div className="relative">
                <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-5 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-indigo-500 text-white font-medium transition-all placeholder:text-slate-600" />
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
              </div>

              <div className="relative">
                <input type={showPassword ? "text" : "password"} placeholder="Senha" value={password}
                  onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  className="w-full pl-12 pr-12 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-indigo-500 text-white font-medium transition-all placeholder:text-slate-600" />
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                <button onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-white">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {error && <p className="text-xs text-red-400 font-bold text-center bg-red-500/10 py-2 px-4 rounded-xl">{error}</p>}

              <button onClick={handleLogin} disabled={isSubmitting} className={cn(btnBase, "bg-indigo-600 border-indigo-500/50 text-white hover:bg-indigo-500 disabled:opacity-50")}>
                {isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Mail size={18} />}
                Entrar
              </button>

              <button onClick={() => { setAuthMode("register"); setError(null); }} className="w-full text-slate-500 text-sm font-bold py-2 hover:text-white transition-colors">
                Não tem conta? <span className="text-indigo-400">Cadastre-se</span>
              </button>
            </motion.div>
          )}

          {/* ── Cadastro ── */}
          {authMode === "register" && (
            <motion.div key="register" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <button onClick={() => { setAuthMode("initial"); setError(null); }} className="p-2 text-slate-500 hover:text-white transition-colors rounded-xl hover:bg-white/5">
                  <ChevronLeft size={20} />
                </button>
                <h2 className="text-xl font-black text-white">Criar Conta</h2>
              </div>

              <div className="relative">
                <input type="text" placeholder={t("name_placeholder") || "Seu nome"} value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full pl-12 pr-5 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-indigo-500 text-white font-medium transition-all placeholder:text-slate-600" />
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
              </div>

              <div className="relative">
                <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-5 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-indigo-500 text-white font-medium transition-all placeholder:text-slate-600" />
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
              </div>

              <div className="relative">
                <input type={showPassword ? "text" : "password"} placeholder="Senha (mín. 6 caracteres)" value={password}
                  onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleRegister()}
                  className="w-full pl-12 pr-12 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-indigo-500 text-white font-medium transition-all placeholder:text-slate-600" />
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                <button onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-white">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <div className="flex justify-center gap-2 flex-wrap py-1">
                {USER_COLORS.map((c) => {
                  const isTaken = takenColors.includes(c);
                  return (
                    <button key={c} onClick={() => !isTaken && setColor(c)} disabled={isTaken}
                      className={cn("w-8 h-8 rounded-full transition-all border-2", color === c ? "scale-110 border-white" : "border-transparent hover:scale-110", isTaken && "opacity-20 cursor-not-allowed hidden")}
                      style={{ backgroundColor: c }} />
                  );
                })}
              </div>

              {error && <p className="text-xs text-red-400 font-bold text-center bg-red-500/10 py-2 px-4 rounded-xl">{error}</p>}

              <button onClick={handleRegister} disabled={isSubmitting} className={cn(btnBase, "bg-indigo-600 border-indigo-500/50 text-white hover:bg-indigo-500 disabled:opacity-50")}>
                {isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <User size={18} />}
                Criar Conta
              </button>

              <button onClick={() => { setAuthMode("login"); setError(null); }} className="w-full text-slate-500 text-sm font-bold py-2 hover:text-white transition-colors">
                Já tem conta? <span className="text-indigo-400">Entrar</span>
              </button>
            </motion.div>
          )}

          {/* ── Convite ── */}
          {authMode === "invite" && (
            <motion.div key="invite" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <button onClick={() => setAuthMode("initial")} className="p-2 text-slate-500 hover:text-white transition-colors rounded-xl hover:bg-white/5">
                  <ChevronLeft size={20} />
                </button>
                <h2 className="text-xl font-black text-white">{t("invite_code")}</h2>
              </div>

              <input type="text" placeholder={t("invite_code")} value={inviteCodeInput}
                onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
                className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-amber-500 text-white font-black text-center tracking-[0.4em] text-xl uppercase placeholder:text-slate-700 placeholder:tracking-normal placeholder:font-medium placeholder:text-base" />

              {inviteError && <p className="text-xs text-red-400 font-bold text-center bg-red-500/10 py-2 px-4 rounded-xl">{inviteError}</p>}

              <button onClick={handleInviteSubmit} disabled={!inviteCodeInput || isSubmitting}
                className={cn(btnBase, "bg-amber-500 border-amber-400/50 text-black font-black hover:bg-amber-400 disabled:opacity-50")}>
                {isSubmitting ? <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <Share2 size={18} />}
                {t("validate_invite")}
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>
    </div>
  );
});
