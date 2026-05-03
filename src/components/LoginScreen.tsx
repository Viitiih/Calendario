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
import { registerUser, loginUser, loginWithGoogle } from "../lib/authService";

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

  return (
    <div className="min-h-[100dvh] flex flex-col" style={{ background: "linear-gradient(160deg, #0a0a14 0%, #080810 50%, #0a0812 100%)" }}>

      {/* Glow top */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[300px] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, #6366f118 0%, transparent 70%)" }} />

      {/* Header com logo */}
      <div className="flex flex-col items-center pt-16 pb-8 px-6">
        <div className="w-16 h-16 rounded-[22px] flex items-center justify-center mb-5 relative" style={{ background: "linear-gradient(135deg, #6366f125, #6366f108)", border: "1px solid #6366f130" }}>
          <CalendarIcon size={28} className="text-indigo-400" />
          <div className="absolute inset-0 rounded-[22px]" style={{ background: "radial-gradient(circle at 30% 30%, #ffffff10, transparent)" }} />
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight mb-1">WorkSync</h1>
        <p className="text-slate-500 text-sm font-medium">{t("app_description")}</p>
      </div>

      {/* Card central */}
      <div className="flex-1 px-5 pb-8 flex flex-col">
        <div className="rounded-[28px] p-6 flex-1 flex flex-col" style={{ background: "#111118", border: "1px solid #ffffff08" }}>
          <AnimatePresence mode="wait">

            {/* ── Tela inicial ── */}
            {authMode === "initial" && (
              <motion.div key="initial" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="flex flex-col gap-2.5 flex-1">

                <p className="text-[10px] font-black tracking-[0.25em] text-slate-600 uppercase text-center mb-1">Escolha como entrar</p>

                {/* Email */}
                <button
                  onClick={() => setAuthMode("login")}
                  className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-black text-[15px] text-white transition-all active:scale-[0.98]"
                  style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)", boxShadow: "0 8px 24px -8px #6366f166" }}
                >
                  <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                    <Mail size={16} />
                  </div>
                  <span className="flex-1 text-left">Email e Senha</span>
                  <span className="text-white/40 text-lg">›</span>
                </button>

                {/* Criar conta */}
                <button
                  onClick={() => setAuthMode("register")}
                  className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-bold text-[15px] text-white transition-all active:scale-[0.98]"
                  style={{ background: "#ffffff08", border: "1px solid #ffffff0f" }}
                > 
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#6366f115" }}>
                    <User size={16} className="text-indigo-400" />
                  </div>
                  <span className="flex-1 text-left">Criar Conta</span>
                  <span className="text-white/20 text-lg">›</span>
                </button>
              

                {/* Google */}
        <button
  onClick={async () => {
    setLoading(true);
    setError(null);
    try {
      const firebaseUser = await loginWithGoogle();
      const savedUser = localStorage.getItem("worksync_user");
      let userColor = USER_COLORS[0];
      if (savedUser) { try { const p = JSON.parse(savedUser); if (p.color) userColor = p.color; } catch {} }
      onLogin(firebaseUser.displayName || "Usuário", userColor, firebaseUser.uid);
    } catch (err: any) {
      setError("Erro ao entrar com Google. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }}
  className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-bold text-[15px] text-white transition-all active:scale-[0.98]"
  style={{ background: "#ffffff08", border: "1px solid #ffffff0f" }}
>
              
                  <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                    <svg width="16" height="16" viewBox="0 0 48 48">
                      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.5 6.5 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/>
                      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16.1 19 13 24 13c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.5 6.5 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
                      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.5 26.8 36 24 36c-5.2 0-9.6-3.3-11.3-8H6.1C9.5 35.7 16.3 44 24 44z"/>
                      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.3 5.6l6.2 5.2C41 35.4 44 30.1 44 24c0-1.3-.1-2.6-.4-3.9z"/>
                    </svg>
                  </div>
                  <span className="flex-1 text-left">Google</span>
                </button>

                {/* Apple */}
                <button
                  onClick={() => alert("Em breve!")}
                  className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-bold text-[15px] text-slate-400 transition-all active:scale-[0.98] opacity-60"
                  style={{ background: "#ffffff05", border: "1px solid #ffffff08" }}
                >
                  <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                    <svg width="16" height="16" viewBox="0 0 814 1000" fill="#888">
                      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-42.8-155.5-108.5C46.7 696.1 0 565.5 0 440.3c0-213.3 138.9-326.1 274.8-326.1 65.2 0 119.7 42.8 160.6 42.8 39.5 0 101.1-45.1 176.3-45.1 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"/>
                    </svg>
                  </div>
                  <span className="flex-1 text-left">Apple</span>
                </button>

                {/* Telefone */}
                <button
                  onClick={() => alert("Em breve!")}
                  className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-bold text-[15px] text-slate-400 transition-all active:scale-[0.98] opacity-60"
                  style={{ background: "#ffffff05", border: "1px solid #ffffff08" }}
                >
                  <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                    <Phone size={16} className="text-slate-500" />
                  </div>
                  <span className="flex-1 text-left">Telefone</span>
                </button>

                {/* Divisor */}
                <div className="flex items-center gap-3 my-1">
                  <div className="flex-1 h-px" style={{ background: "#ffffff08" }} />
                  <span className="text-[10px] font-black tracking-[0.2em] text-slate-700">OU</span>
                  <div className="flex-1 h-px" style={{ background: "#ffffff08" }} />
                </div>

                {/* Código de convite */}
                <button
                  onClick={() => setAuthMode("invite")}
                  className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-bold text-[15px] transition-all active:scale-[0.98]"
                  style={{ background: "#f59e0b10", border: "1px solid #f59e0b20", color: "#f59e0b" }}
                >
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#f59e0b15" }}>
                    <Share2 size={16} />
                  </div>
                  <span className="flex-1 text-left">{t("enter_with_invite_code")}</span>
                  <span className="text-[#f59e0b50] text-lg">›</span>
                </button>

                {/* Convidado */}
                <button
                  onClick={() => { const c = USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)]; onLogin("Visitante", c); }}
                  disabled={isSubmitting}
                  className="w-full py-3 text-slate-600 text-sm font-bold hover:text-slate-400 transition-colors text-center mt-1"
                >
                  Pular (Entrar sem Conta)
                </button>

                <p className="text-center text-[11px] text-slate-700 mt-auto pt-2">
                  Você pode vincular uma conta depois nas configurações
                </p>
              </motion.div>
            )}

            {/* ── Login ── */}
            {authMode === "login" && (
              <motion.div key="login" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="flex flex-col gap-4">
                <div className="flex items-center gap-3 mb-2">
                  <button onClick={() => { setAuthMode("initial"); setError(null); }} className="p-2 rounded-xl text-slate-500 hover:text-white transition-colors" style={{ background: "#ffffff08" }}>
                    <ChevronLeft size={18} />
                  </button>
                  <h2 className="text-xl font-black text-white">Entrar</h2>
                </div>

                <div className="relative">
                  <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-5 py-4 rounded-2xl text-white font-medium text-sm focus:outline-none transition-all placeholder:text-slate-600"
                    style={{ background: "#ffffff08", border: "1px solid #ffffff0f" }} />
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                </div>

                <div className="relative">
                  <input type={showPassword ? "text" : "password"} placeholder="Senha" value={password}
                    onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                    className="w-full pl-12 pr-12 py-4 rounded-2xl text-white font-medium text-sm focus:outline-none transition-all placeholder:text-slate-600"
                    style={{ background: "#ffffff08", border: "1px solid #ffffff0f" }} />
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                  <button onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-white">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {error && (
                  <p className="text-xs text-red-400 font-bold text-center py-2 px-4 rounded-xl" style={{ background: "#ef444415" }}>{error}</p>
                )}

                <button onClick={handleLogin} disabled={isSubmitting}
                  className="w-full py-4 rounded-2xl font-black text-[15px] text-white flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-50 mt-1"
                  style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)", boxShadow: "0 8px 24px -8px #6366f166" }}>
                  {isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Mail size={18} />}
                  Entrar
                </button>

                <button onClick={() => { setAuthMode("register"); setError(null); }} className="text-slate-500 text-sm font-bold text-center py-2 hover:text-white transition-colors">
                  Não tem conta? <span className="text-indigo-400">Cadastre-se</span>
                </button>
              </motion.div>
            )}

            {/* ── Cadastro ── */}
            {authMode === "register" && (
              <motion.div key="register" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="flex flex-col gap-4">
                <div className="flex items-center gap-3 mb-2">
                  <button onClick={() => { setAuthMode("initial"); setError(null); }} className="p-2 rounded-xl text-slate-500 hover:text-white transition-colors" style={{ background: "#ffffff08" }}>
                    <ChevronLeft size={18} />
                  </button>
                  <h2 className="text-xl font-black text-white">Criar Conta</h2>
                </div>

                <div className="relative">
                  <input type="text" placeholder={t("name_placeholder") || "Seu nome"} value={name} onChange={(e) => setName(e.target.value)}
                    className="w-full pl-12 pr-5 py-4 rounded-2xl text-white font-medium text-sm focus:outline-none transition-all placeholder:text-slate-600"
                    style={{ background: "#ffffff08", border: "1px solid #ffffff0f" }} />
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                </div>

                <div className="relative">
                  <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-5 py-4 rounded-2xl text-white font-medium text-sm focus:outline-none transition-all placeholder:text-slate-600"
                    style={{ background: "#ffffff08", border: "1px solid #ffffff0f" }} />
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                </div>

                <div className="relative">
                  <input type={showPassword ? "text" : "password"} placeholder="Senha (mín. 6 caracteres)" value={password}
                    onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleRegister()}
                    className="w-full pl-12 pr-12 py-4 rounded-2xl text-white font-medium text-sm focus:outline-none transition-all placeholder:text-slate-600"
                    style={{ background: "#ffffff08", border: "1px solid #ffffff0f" }} />
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                  <button onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-white">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
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

                {error && (
                  <p className="text-xs text-red-400 font-bold text-center py-2 px-4 rounded-xl" style={{ background: "#ef444415" }}>{error}</p>
                )}

                <button onClick={handleRegister} disabled={isSubmitting}
                  className="w-full py-4 rounded-2xl font-black text-[15px] text-white flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)", boxShadow: "0 8px 24px -8px #6366f166" }}>
                  {isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <User size={18} />}
                  Criar Conta
                </button>

                <button onClick={() => { setAuthMode("login"); setError(null); }} className="text-slate-500 text-sm font-bold text-center py-2 hover:text-white transition-colors">
                  Já tem conta? <span className="text-indigo-400">Entrar</span>
                </button>
              </motion.div>
            )}

            {/* ── Convite ── */}
            {authMode === "invite" && (
              <motion.div key="invite" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="flex flex-col gap-4">
                <div className="flex items-center gap-3 mb-2">
                  <button onClick={() => setAuthMode("initial")} className="p-2 rounded-xl text-slate-500 hover:text-white transition-colors" style={{ background: "#ffffff08" }}>
                    <ChevronLeft size={18} />
                  </button>
                  <h2 className="text-xl font-black text-white">{t("invite_code")}</h2>
                </div>

                <input type="text" placeholder={t("invite_code")} value={inviteCodeInput}
                  onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
                  className="w-full px-5 py-5 rounded-2xl text-white font-black text-center text-2xl tracking-[0.4em] uppercase focus:outline-none placeholder:text-slate-700 placeholder:tracking-normal placeholder:font-medium placeholder:text-base"
                  style={{ background: "#ffffff08", border: "1px solid #f59e0b20" }} />

                {inviteError && (
                  <p className="text-xs text-red-400 font-bold text-center py-2 px-4 rounded-xl" style={{ background: "#ef444415" }}>{inviteError}</p>
                )}

                <button onClick={handleInviteSubmit} disabled={!inviteCodeInput || isSubmitting}
                  className="w-full py-4 rounded-2xl font-black text-[15px] text-black flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", boxShadow: "0 8px 24px -8px #f59e0b55" }}>
                  {isSubmitting ? <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" /> : <Share2 size={18} />}
                  {t("validate_invite")}
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
});
