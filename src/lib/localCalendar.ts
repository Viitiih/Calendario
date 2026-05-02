import { CalendarData } from "../types";

const LOCAL_CALENDAR_KEY = "worksync_local_calendar";

export function getLocalCalendar(userId: string): CalendarData {
  const saved = localStorage.getItem(`${LOCAL_CALENDAR_KEY}_${userId}`);
  if (saved) {
    try { return JSON.parse(saved); } catch {}
  }
  return {
    id: `local_${userId}`,
    name: "Meu Calendário Pessoal",
    workDays: [],
    expenses: [],
    incomes: [],
    registrosFinanceiros: [],
    templates: [],
  };
}

export function saveLocalCalendar(userId: string, data: CalendarData): void {
  localStorage.setItem(`${LOCAL_CALENDAR_KEY}_${userId}`, JSON.stringify(data));
}

export function mergeCalendars(local: CalendarData, shared: CalendarData): CalendarData {
  const mergeByDate = (a: any[], b: any[]) => {
    const map = new Map<string, any>();
    [...a, ...b].forEach((item) => map.set(item.id, item));
    return Array.from(map.values());
  };

  return {
    ...shared,
    workDays: mergeByDate(local.workDays || [], shared.workDays || []),
    expenses: mergeByDate(local.expenses || [], shared.expenses || []),
    incomes: mergeByDate(local.incomes || [], shared.incomes || []),
    registrosFinanceiros: mergeByDate(local.registrosFinanceiros || [], shared.registrosFinanceiros || []),
    templates: mergeByDate(local.templates || [], shared.templates || []),
  };
}

export function copyWorkDaysToCalendar(source: CalendarData, target: CalendarData): CalendarData {
  const mergeByDate = (a: any[], b: any[]) => {
    const map = new Map<string, any>();
    [...a, ...b].forEach((item) => map.set(item.id, item));
    return Array.from(map.values());
  };

  return {
    ...target,
    workDays: mergeByDate(target.workDays || [], source.workDays || []),
  };
}
