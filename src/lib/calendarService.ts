// src/lib/calendarService.ts
// Substitui: socket.emit("update-calendar"), fetch("/api/calendar/...")
// Por: operações diretas no Firestore com listeners em tempo real

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";
import { CalendarData, User } from "../types";

// ─── Calendário ────────────────────────────────────────────────────────────

/**
 * Cria um novo calendário no Firestore.
 * Substitui: a criação implícita que acontecia no servidor quando um usuário entrava.
 */
export async function createCalendar(
  calendarId: string,
  ownerId: string,
  ownerName: string,
  ownerColor: string
): Promise<CalendarData> {
  const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

  const newCalendar: CalendarData = {
    id: calendarId,
    name: "Meu Calendário",
    ownerId,
    inviteCode,
    workDays: [],
    templates: [],
    users: [{ id: ownerId, name: ownerName, color: ownerColor }],
    pendingUsers: [],
  };

  await setDoc(doc(db, "calendars", calendarId), {
    ...newCalendar,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return newCalendar;
}

/**
 * Busca um calendário pelo ID.
 * Substitui: fetch(`/api/calendar/${calendarId}`)
 */
export async function getCalendar(calendarId: string): Promise<CalendarData | null> {
  const snap = await getDoc(doc(db, "calendars", calendarId));
  if (!snap.exists()) return null;
  return snap.data() as CalendarData;
}

/**
 * Busca um calendário pelo código de convite.
 * Substitui: fetch(`/api/calendar/${inviteCode}`) — o servidor fazia esse lookup
 */
export async function getCalendarByInviteCode(code: string): Promise<CalendarData | null> {
  const q = query(
    collection(db, "calendars"),
    where("inviteCode", "==", code.toUpperCase())
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].data() as CalendarData;
}

/**
 * Atualiza o calendário completo no Firestore.
 * Substitui: socket.emit("update-calendar", { calendarId, calendarData })
 *
 * O Firestore propaga a mudança para todos os listeners via onSnapshot —
 * substituindo a lógica de broadcast que o servidor fazia via socket.io.
 */
export async function updateCalendar(calendarData: CalendarData): Promise<void> {
  const { expenses, incomes, registrosFinanceiros, ...sharedData } = calendarData as any;
  await updateDoc(doc(db, "calendars", calendarData.id), {
    ...sharedData,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Escuta mudanças em tempo real no calendário.
 * Substitui: socket.on("calendar-updated", callback)
 *
 * Retorna uma função de cleanup (chame no useEffect return).
 */
export function subscribeToCalendar(
  calendarId: string,
  callback: (data: CalendarData) => void
): Unsubscribe {
  return onSnapshot(doc(db, "calendars", calendarId), (snap) => {
    if (snap.exists()) {
      callback(snap.data() as CalendarData);
    }
  });
}

// ─── Membros ────────────────────────────────────────────────────────────────

/**
 * Adiciona um usuário como pendente no calendário.
 * Substitui: a lógica em App.tsx que chamava updateCalendar com pendingUsers
 */
export async function joinCalendarAsPending(
  calendarId: string,
  user: { id: string; name: string; color: string }
): Promise<void> {
  const cal = await getCalendar(calendarId);
  if (!cal) throw new Error("Calendário não encontrado");

  const alreadyMember = (cal.users || []).some((u) => u.id === user.id);
  const alreadyPending = (cal.pendingUsers || []).some((u) => u.id === user.id);

  if (alreadyMember || alreadyPending) return;

  await updateDoc(doc(db, "calendars", calendarId), {
    pendingUsers: [...(cal.pendingUsers || []), user],
    updatedAt: serverTimestamp(),
  });
}

/**
 * Aceita um usuário pendente (apenas o dono pode fazer isso).
 */
export async function acceptPendingUser(
  calendarData: CalendarData,
  userId: string
): Promise<CalendarData> {
  const user = (calendarData.pendingUsers || []).find((u) => u.id === userId);
  if (!user) throw new Error("Usuário não encontrado nos pendentes");

  const updated: CalendarData = {
    ...calendarData,
    users: [...(calendarData.users || []), user],
    pendingUsers: (calendarData.pendingUsers || []).filter((u) => u.id !== userId),
  };

  await updateCalendar(updated);
  return updated;
}

/**
 * Rejeita um usuário pendente.
 */
export async function declinePendingUser(
  calendarData: CalendarData,
  userId: string
): Promise<CalendarData> {
  const updated: CalendarData = {
    ...calendarData,
    pendingUsers: (calendarData.pendingUsers || []).filter((u) => u.id !== userId),
  };

  await updateCalendar(updated);
  return updated;
}
export interface UserFinances {
  expenses: any[];
  incomes: any[];
  registrosFinanceiros: any[];
}

function financeDocId(calendarId: string, userId: string) {
  return `${calendarId}_${userId}`;
}

export async function getUserFinances(calendarId: string, userId: string): Promise<UserFinances> {
  const snap = await getDoc(doc(db, "userFinances", financeDocId(calendarId, userId)));
  if (!snap.exists()) return { expenses: [], incomes: [], registrosFinanceiros: [] };
  return snap.data() as UserFinances;
}

export async function saveUserFinances(calendarId: string, userId: string, finances: UserFinances): Promise<void> {
  await setDoc(
    doc(db, "userFinances", financeDocId(calendarId, userId)),
    { ...finances, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

export function subscribeToUserFinances(calendarId: string, userId: string, callback: (data: UserFinances) => void): Unsubscribe {
  return onSnapshot(doc(db, "userFinances", financeDocId(calendarId, userId)), (snap) => {
    if (snap.exists()) {
      callback(snap.data() as UserFinances);
    } else {
      callback({ expenses: [], incomes: [], registrosFinanceiros: [] });
    }
  });
}
