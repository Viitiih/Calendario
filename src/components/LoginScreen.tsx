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
        const available = USER_COLORS.f
