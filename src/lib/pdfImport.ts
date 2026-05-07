import type { Expense, FinanceRecord, Income, User, WorkDay } from "../types";

export interface PdfPersonSummary {
  userId: string;
  nome: string;
  compromissos: number;
  trabalhos: number;
  estudos: number;
  semCompromisso: number;
  horasTotais: number;
  ganhos: number;
  gastos: number;
  saldoFinal: number;
}

export interface PdfDailyPersonSummary {
  userId: string;
  nome: string;
  compromisso: string;
  horario: string;
  horas: number;
  ganhos: number;
  gastos: number;
  saldo: number;
}

export interface PdfDailySummary {
  data: string;
  pessoas: PdfDailyPersonSummary[];
  saldoTotalDia: number;
}

export interface PdfImportSummary {
  compromissos: number;
  trabalhos: number;
  estudos: number;
  semCompromisso: number;
  horasTotais: number;
  ganhos: number;
  gastos: number;
  saldoFinal: number;
  primeiraData?: string;
  ultimaData?: string;
  pessoas: PdfPersonSummary[];
  dias: PdfDailySummary[];
}

export interface PdfUserFinanceData {
  expenses: Expense[];
  incomes: Income[];
  registrosFinanceiros: FinanceRecord[];
}

export interface PdfImportResult {
  workDays: WorkDay[];
  expenses: Expense[];
  incomes: Income[];
  registrosFinanceiros: FinanceRecord[];
  financesByUserId: Record<string, PdfUserFinanceData>;
  summary: PdfImportSummary;
  rawText: string;
}

type CalendarPerson = Pick<User, "id" | "name" | "color">;
type TextItemLike = { str?: string; transform?: number[]; width?: number };
type DateParts = { day: number; month: number; year: number };
type TimeRange = { start: string; end: string; raw: string };
type ParsedRow = { text: string; cells: string[] };

type ParsedPersonRow = {
  dateIso: string;
  user: CalendarPerson;
  compromisso: string;
  horario: string;
  horas: number;
  ganhos: number;
  gastos: number;
  notes?: string;
};

const PDFJS_URL = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.mjs";
const PDFJS_WORKER_URL = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.mjs";

async function loadPdfJs(): Promise<any> {
  const pdfjsLib: any = await import(/* @vite-ignore */ PDFJS_URL);
  if (pdfjsLib?.GlobalWorkerOptions) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
  }
  return pdfjsLib;
}

function normalizeSpaces(value: string): string {
  return String(value || "").replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ").trim();
}

function normalizeName(value: string): string {
  return normalizeSpaces(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
}

function normalizeTime(value: string): string {
  const cleaned = String(value || "").toLowerCase().replace("h", ":").replace(/[^0-9:]/g, "");
  const [rawHour = "0", rawMinute = "0"] = cleaned.split(":");
  const hour = Math.max(0, Math.min(23, Number(rawHour) || 0));
  const minute = Math.max(0, Math.min(59, Number(rawMinute) || 0));
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function minutesBetween(start: string, end: string): number {
  const [h1, m1] = start.split(":").map(Number);
  const [h2, m2] = end.split(":").map(Number);
  let minutes = (h2 * 60 + (m2 || 0)) - (h1 * 60 + (m1 || 0));
  if (minutes < 0) minutes += 24 * 60;
  return minutes;
}

function dateToIso(parts: DateParts): string {
  const date = new Date(parts.year, parts.month - 1, parts.day, 12, 0, 0, 0);
  return date.toISOString();
}

function parseExcelSerialDate(value: number): DateParts | null {
  if (!Number.isFinite(value) || value < 30000 || value > 70000) return null;
  const utcDays = Math.floor(value - 25569);
  const date = new Date(utcDays * 86400 * 1000);
  return { day: date.getUTCDate(), month: date.getUTCMonth() + 1, year: date.getUTCFullYear() };
}

function parseDateFromText(line: string, fallbackYear: number): DateParts | null {
  const value = normalizeSpaces(line);

  const isoMatch = value.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
  if (isoMatch) {
    return { year: Number(isoMatch[1]), month: Number(isoMatch[2]), day: Number(isoMatch[3]) };
  }

  const brMatch = value.match(/\b(\d{1,2})[\/.-](\d{1,2})(?:[\/.-](\d{2,4}))?\b/);
  if (brMatch) {
    const day = Number(brMatch[1]);
    const month = Number(brMatch[2]);
    let year = brMatch[3] ? Number(brMatch[3]) : fallbackYear;
    if (year < 100) year += 2000;
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) return { day, month, year };
  }

  const serialMatch = value.match(/^\d{5}$/);
  if (serialMatch) return parseExcelSerialDate(Number(serialMatch[0]));

  return null;
}

function findLikelyYear(text: string): number {
  const yearMatch = text.match(/\b(20\d{2})\b/);
  return yearMatch ? Number(yearMatch[1]) : new Date().getFullYear();
}

function extractTimeRange(text: string): TimeRange | null {
  const match = normalizeSpaces(text).match(/\b(\d{1,2}(?::|h)\d{2})\s*(?:\/|-|–|—|a|às|as|até)\s*(\d{1,2}(?::|h)\d{2})\b/i);
  if (!match) return null;
  return { start: normalizeTime(match[1]), end: normalizeTime(match[2]), raw: match[0] };
}

function parseMoney(value: string): number {
  const cleaned = String(value || "")
    .replace(/R\$\s?/gi, "")
    .replace(/\s/g, "")
    .replace(/[^0-9,.-]/g, "");

  if (!cleaned || cleaned === "-" || cleaned === ",") return 0;

  const decimalSeparator = cleaned.includes(",") ? "," : ".";
  const normalized = decimalSeparator === ","
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned.replace(/,/g, "");

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.abs(parsed) : 0;
}

function parseNumber(value: string): number {
  const money = parseMoney(value);
  if (money) return money;
  const normalized = String(value || "").replace(/[^0-9,.-]/g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.abs(parsed) : 0;
}

function parseHoursValue(value: string, horario: string): number {
  const range = extractTimeRange(horario);
  if (range) return Math.round((minutesBetween(range.start, range.end) / 60) * 100) / 100;

  const normalized = normalizeSpaces(value);
  if (!normalized || normalized === "-") return 0;

  const timeLike = normalized.match(/^(\d{1,2}):(\d{2})$/);
  if (timeLike) return Number(timeLike[1]) + Number(timeLike[2]) / 60;

  return parseNumber(normalized);
}

function stableHash(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  return hash.toString(36);
}

function detectCommitmentType(text: string): "work" | "study" {
  const lower = normalizeSpaces(text).toLowerCase();
  if (/\b(estudo|estudar|faculdade|curso|aula|ead|prova|revis[aã]o)\b/.test(lower)) return "study";
  return "work";
}

function isNoCommitment(text: string): boolean {
  return /sem\s+compromisso|sem\s+agenda|folga|livre|descanso|off\b/i.test(text);
}

function mergeCurrencyCells(cells: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < cells.length; i++) {
    const current = normalizeSpaces(cells[i]);
    const next = normalizeSpaces(cells[i + 1] || "");
    if (/^R\$/i.test(current) && next) {
      out.push(normalizeSpaces(`${current} ${next}`));
      i += 1;
    } else {
      out.push(current);
    }
  }
  return out.filter(Boolean);
}

function compactCells(cells: string[]): string[] {
  return mergeCurrencyCells(cells)
    .map((cell) => normalizeSpaces(cell))
    .filter((cell) => cell && cell !== "null" && cell !== "undefined");
}

function matchPerson(cellOrLine: string, people: CalendarPerson[]): CalendarPerson | null {
  const normalized = normalizeName(cellOrLine);
  if (!normalized) return null;

  let best: CalendarPerson | null = null;
  let bestScore = 0;

  for (const person of people) {
    const full = normalizeName(person.name);
    const first = full.split(" ")[0];
    if (!first) continue;

    let score = 0;
    if (normalized === full) score = 4;
    else if (normalized === first) score = 3;
    else if (normalized.includes(full) || full.includes(normalized)) score = 2;
    else if (normalized.includes(first)) score = 1;

    if (score > bestScore) {
      best = person;
      bestScore = score;
    }
  }

  return bestScore > 0 ? best : null;
}

function uniquePeople(currentUser: User, calendarUsers: CalendarPerson[] = []): CalendarPerson[] {
  const map = new Map<string, CalendarPerson>();
  [...calendarUsers, currentUser].forEach((person) => {
    if (!person?.id) return;
    map.set(person.id, { id: person.id, name: person.name || "Usuário", color: (person as any).color || currentUser.color });
  });
  return Array.from(map.values());
}

async function extractRowsFromPdf(file: File): Promise<{ rows: ParsedRow[]; rawText: string }> {
  const pdfjsLib = await loadPdfJs();
  const data = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const rows: ParsedRow[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const items = (content.items || []) as TextItemLike[];
    const grouped = new Map<number, TextItemLike[]>();

    items.forEach((item) => {
      const transform = item.transform || [];
      const y = Math.round(Number(transform[5] || 0) / 3) * 3;
      if (!grouped.has(y)) grouped.set(y, []);
      grouped.get(y)!.push(item);
    });

    Array.from(grouped.entries())
      .sort((a, b) => b[0] - a[0])
      .forEach(([, rowItems]) => {
        const sorted = rowItems.sort((a, b) => Number(a.transform?.[4] || 0) - Number(b.transform?.[4] || 0));
        const cells: string[] = [];
        let current = "";
        let lastEnd: number | null = null;

        sorted.forEach((item) => {
          const text = normalizeSpaces(item.str || "");
          if (!text) return;
          const x = Number(item.transform?.[4] || 0);
          const width = Number(item.width || 0);
          const end = x + width;
          const gap = lastEnd === null ? 0 : x - lastEnd;

          if (lastEnd !== null && gap > 14) {
            if (current) cells.push(current);
            current = text;
          } else {
            current = current ? `${current} ${text}` : text;
          }
          lastEnd = end;
        });

        if (current) cells.push(current);
        const cleanCells = compactCells(cells);
        const text = normalizeSpaces(cleanCells.join(" "));
        if (text) rows.push({ text, cells: cleanCells });
      });
  }

  const rawText = rows.map((row) => row.text).join("\n");
  return { rows, rawText };
}

function detectComparisonHeader(cells: string[], people: CalendarPerson[]): CalendarPerson[] | null {
  const detected = cells
    .map((cell) => matchPerson(cell, people))
    .filter((person): person is CalendarPerson => Boolean(person));

  const unique = Array.from(new Map(detected.map((person) => [person.id, person])).values());
  return unique.length >= 2 ? unique : null;
}

function isComparisonColumnHeader(cells: string[]): boolean {
  const normalized = cells.map((cell) => normalizeName(cell));
  const compromissoCount = normalized.filter((cell) => cell.includes("compromisso")).length;
  return normalized.some((cell) => cell === "data") && normalized.some((cell) => cell === "dia") && compromissoCount >= 1;
}

function parseComparisonDataRow(row: ParsedRow, fallbackYear: number, headerPeople: CalendarPerson[]): ParsedPersonRow[] {
  const cells = compactCells(row.cells);
  if (cells.length < 8 || !headerPeople.length) return [];

  const dateParts = parseDateFromText(cells[0], fallbackYear) || parseDateFromText(row.text, fallbackYear);
  if (!dateParts) return [];

  const dateIso = dateToIso(dateParts);
  const rows: ParsedPersonRow[] = [];
  const groupSize = 6;
  const firstPersonOffset = 2;

  for (let index = 0; index < headerPeople.length; index++) {
    const offset = firstPersonOffset + index * groupSize;
    if (offset >= cells.length) continue;

    const compromisso = normalizeSpaces(cells[offset] || "");
    const horario = normalizeSpaces(cells[offset + 1] || "");
    const horas = parseHoursValue(cells[offset + 2] || "", horario);
    const ganhos = parseMoney(cells[offset + 3] || "");
    const gastos = parseMoney(cells[offset + 4] || "");

    if (!compromisso && !horario && !ganhos && !gastos) continue;

    rows.push({
      dateIso,
      user: headerPeople[index],
      compromisso,
      horario,
      horas,
      ganhos,
      gastos,
    });
  }

  return rows;
}

function parseIndividualDataRow(row: ParsedRow, fallbackYear: number, currentPerson: CalendarPerson | null): ParsedPersonRow[] {
  if (!currentPerson) return [];
  const cells = compactCells(row.cells);
  if (cells.length < 5) return [];

  const dateParts = parseDateFromText(cells[0], fallbackYear) || parseDateFromText(row.text, fallbackYear);
  if (!dateParts) return [];

  const compromisso = normalizeSpaces(cells[2] || "");
  const horario = normalizeSpaces(cells[3] || "");
  const horas = parseHoursValue(cells[4] || "", horario);
  const ganhos = parseMoney(cells[5] || "");
  const gastos = parseMoney(cells[6] || "");
  const notes = normalizeSpaces(cells.slice(10).join(" ")) || undefined;

  return [{
    dateIso: dateToIso(dateParts),
    user: currentPerson,
    compromisso,
    horario,
    horas,
    ganhos,
    gastos,
    notes,
  }];
}
function extractCommitmentGroupsFromText(text: string): Array<{ compromisso: string; horario: string; horasText: string; ganhosText: string; gastosText: string }> {
  const groups: Array<{ compromisso: string; horario: string; horasText: string; ganhosText: string; gastosText: string }> = [];
  const source = normalizeSpaces(text)
    .replace(/\b(?:Seg|Ter|Qua|Qui|Sex|S[aá]b|Dom|segunda|ter[cç]a|quarta|quinta|sexta|s[aá]bado|domingo)\b/gi, " ");

  const commitmentPattern = "Sem compromisso|Trabalho extra|Trabalho|Estudo|Pessoal|Folga|Livre|Curso|Aula";
  const timePattern = "(?:\\d{1,2}(?::|h)\\d{2}\\s*(?:\\/|-|–|—|a|às|as|até)\\s*\\d{1,2}(?::|h)\\d{2}|-)";
  const numberPattern = "(?:R\\$\\s*)?[-+]?\\d{1,3}(?:\\.\\d{3})*(?:,\\d{2})|(?:R\\$\\s*)?[-+]?\\d+(?:[.,]\\d{1,2})?|\\d{1,2}:\\d{2}";
  const regex = new RegExp(`(${commitmentPattern})\\s+(${timePattern})\\s+(${numberPattern})\\s+(${numberPattern})\\s+(${numberPattern})`, "gi");

  let match: RegExpExecArray | null;
  while ((match = regex.exec(source)) !== null) {
    groups.push({
      compromisso: normalizeSpaces(match[1]),
      horario: normalizeSpaces(match[2]),
      horasText: normalizeSpaces(match[3]),
      ganhosText: normalizeSpaces(match[4]),
      gastosText: normalizeSpaces(match[5]),
    });
  }

  return groups;
}

function parseComparisonTextFallback(row: ParsedRow, fallbackYear: number, headerPeople: CalendarPerson[]): ParsedPersonRow[] {
  const dateParts = parseDateFromText(row.text, fallbackYear);
  if (!dateParts) return [];
  const dateIso = dateToIso(dateParts);
  const groups = extractCommitmentGroupsFromText(row.text);

  return groups.slice(0, headerPeople.length).map((group, index) => ({
    dateIso,
    user: headerPeople[index],
    compromisso: group.compromisso,
    horario: group.horario,
    horas: parseHoursValue(group.horasText, group.horario),
    ganhos: parseMoney(group.ganhosText),
    gastos: parseMoney(group.gastosText),
  }));
}

function parseIndividualTextFallback(row: ParsedRow, fallbackYear: number, currentPerson: CalendarPerson | null): ParsedPersonRow[] {
  if (!currentPerson) return [];
  const dateParts = parseDateFromText(row.text, fallbackYear);
  if (!dateParts) return [];
  const groups = extractCommitmentGroupsFromText(row.text);
  const group = groups[0];
  if (!group) return [];

  return [{
    dateIso: dateToIso(dateParts),
    user: currentPerson,
    compromisso: group.compromisso,
    horario: group.horario,
    horas: parseHoursValue(group.horasText, group.horario),
    ganhos: parseMoney(group.ganhosText),
    gastos: parseMoney(group.gastosText),
    notes: normalizeSpaces(row.text),
  }];
}


function parseSimpleLine(row: ParsedRow, fallbackYear: number, currentUser: CalendarPerson): ParsedPersonRow[] {
  const dateParts = parseDateFromText(row.text, fallbackYear);
  if (!dateParts) return [];

  const range = extractTimeRange(row.text);
  const moneyValues = (row.text.match(/(?:R\$\s*)?[-+]?\d{1,3}(?:\.\d{3})*(?:,\d{2})|(?:R\$\s*)?[-+]?\d+(?:[.,]\d{2})/gi) || [])
    .map(parseMoney)
    .filter((value) => value > 0);

  const lower = row.text.toLowerCase();
  const ganhos = /ganho|receita|receber|entrada|sal[aá]rio|renda|valor\s+ganho/i.test(lower) ? (moneyValues[0] || 0) : 0;
  const gastos = /gasto|despesa|sa[ií]da|pago|pagamento|d[eé]bito/i.test(lower) ? (moneyValues[0] || 0) : 0;

  if (!range && !ganhos && !gastos && !isNoCommitment(row.text)) return [];

  return [{
    dateIso: dateToIso(dateParts),
    user: currentUser,
    compromisso: isNoCommitment(row.text) ? "Sem compromisso" : detectCommitmentType(row.text) === "study" ? "Estudo" : "Trabalho",
    horario: range ? `${range.start}-${range.end}` : "-",
    horas: range ? Math.round((minutesBetween(range.start, range.end) / 60) * 100) / 100 : 0,
    ganhos,
    gastos,
    notes: normalizeSpaces(row.text),
  }];
}

function getFinanceBucket(financesByUserId: Record<string, PdfUserFinanceData>, userId: string): PdfUserFinanceData {
  if (!financesByUserId[userId]) {
    financesByUserId[userId] = { expenses: [], incomes: [], registrosFinanceiros: [] };
  }
  return financesByUserId[userId];
}

function pushExpense(bucket: PdfUserFinanceData, dateIso: string, user: CalendarPerson, value: number, label: string, fileName: string) {
  if (!value) return;
  const dateKey = dateIso.split("T")[0];
  const id = `pdf_expense_${user.id}_${dateKey}_${stableHash(`${label}_${value}_${fileName}`)}`;
  const expense: Expense = {
    id,
    name: label || "Gasto importado do PDF",
    value,
    quantity: 1,
    date: dateIso,
    category: "other",
  };
  bucket.expenses.push(expense);
  bucket.registrosFinanceiros.push({
    id: `pdf_record_${id}`,
    tipo: "gasto",
    descricao: expense.name || "Gasto importado do PDF",
    valor: value,
    categoria: "other",
    data: dateIso,
  });
}

function pushIncome(bucket: PdfUserFinanceData, dateIso: string, user: CalendarPerson, value: number, label: string, fileName: string) {
  if (!value) return;
  const dateKey = dateIso.split("T")[0];
  const id = `pdf_income_${user.id}_${dateKey}_${stableHash(`${label}_${value}_${fileName}`)}`;
  const income: Income = {
    id,
    name: label || "Ganho importado do PDF",
    value,
    date: dateIso,
    category: "other",
    userId: user.id,
  };
  bucket.incomes.push(income);
  bucket.registrosFinanceiros.push({
    id: `pdf_record_${id}`,
    tipo: "receber",
    descricao: income.name || "Ganho importado do PDF",
    valor: value,
    categoria: "other",
    data: dateIso,
  });
}

function roundMoney(value: number): number {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function roundHours(value: number): number {
  return Math.round((Number(value) || 0) * 100) / 100;
}

export async function importSchedulePdf(
  file: File,
  currentUser: User,
  calendarUsers: CalendarPerson[] = []
): Promise<PdfImportResult> {
  if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
    throw new Error("Selecione um arquivo PDF válido.");
  }

  const people = uniquePeople(currentUser, calendarUsers);
  const { rows, rawText } = await extractRowsFromPdf(file);
  const fallbackYear = findLikelyYear(rawText);

  let comparisonPeople: CalendarPerson[] | null = null;
  let comparisonHeaderActive = false;
  let currentIndividualPerson: CalendarPerson | null = null;

  const parsedRows: ParsedPersonRow[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    const cells = compactCells(row.cells);
    const rowPersonHeader = detectComparisonHeader(cells, people);
    if (rowPersonHeader) {
      comparisonPeople = rowPersonHeader;
      comparisonHeaderActive = false;
      currentIndividualPerson = null;
      continue;
    }

    const personFromLine = matchPerson(row.text.replace(/[-–—].*$/, ""), people);
    if (personFromLine && /compromissos|financeiro|dados separados|final do m[eê]s/i.test(row.text)) {
      currentIndividualPerson = personFromLine;
      comparisonHeaderActive = false;
      continue;
    }

    if (isComparisonColumnHeader(cells)) {
      comparisonHeaderActive = Boolean(comparisonPeople?.length);
      continue;
    }

    if (/final\s+do\s+m[eê]s|horas\s+no\s+m[eê]s|ganhos\s+totais|gastos\s+totais|saldo\s+final|pessoas/i.test(row.text)) {
      continue;
    }

    let candidates = comparisonHeaderActive && comparisonPeople?.length
      ? parseComparisonDataRow(row, fallbackYear, comparisonPeople)
      : currentIndividualPerson
        ? parseIndividualDataRow(row, fallbackYear, currentIndividualPerson)
        : parseSimpleLine(row, fallbackYear, currentUser);

    if (!candidates.length && comparisonHeaderActive && comparisonPeople?.length) {
      candidates = parseComparisonTextFallback(row, fallbackYear, comparisonPeople);
    }

    if (!candidates.length && currentIndividualPerson) {
      candidates = parseIndividualTextFallback(row, fallbackYear, currentIndividualPerson);
    }

    candidates.forEach((candidate) => {
      const key = `${candidate.dateIso.split("T")[0]}_${candidate.user.id}_${normalizeName(candidate.compromisso)}_${candidate.horario}_${candidate.ganhos}_${candidate.gastos}`;
      if (seen.has(key)) return;
      seen.add(key);
      parsedRows.push(candidate);
    });
  }

  const workDays: WorkDay[] = [];
  const financesByUserId: Record<string, PdfUserFinanceData> = {};
  const personStats = new Map<string, PdfPersonSummary>();
  const dailyStats = new Map<string, PdfDailySummary>();

  const ensurePersonStats = (user: CalendarPerson) => {
    if (!personStats.has(user.id)) {
      personStats.set(user.id, {
        userId: user.id,
        nome: user.name || "Usuário",
        compromissos: 0,
        trabalhos: 0,
        estudos: 0,
        semCompromisso: 0,
        horasTotais: 0,
        ganhos: 0,
        gastos: 0,
        saldoFinal: 0,
      });
    }
    return personStats.get(user.id)!;
  };

  parsedRows.forEach((row) => {
    const stats = ensurePersonStats(row.user);
    const bucket = getFinanceBucket(financesByUserId, row.user.id);
    const dateKey = row.dateIso.split("T")[0];
    const compromisso = row.compromisso || (row.horario && row.horario !== "-" ? "Trabalho" : "Sem compromisso");
    const noCommitment = isNoCommitment(compromisso);
    const range = extractTimeRange(row.horario);
    const type = detectCommitmentType(compromisso);
    const horas = roundHours(row.horas || (range ? minutesBetween(range.start, range.end) / 60 : 0));
    const ganhos = roundMoney(row.ganhos);
    const gastos = roundMoney(row.gastos);

    if (noCommitment) {
      stats.semCompromisso += 1;
    } else if (range || horas > 0 || compromisso) {
      stats.compromissos += 1;
      if (type === "study") stats.estudos += 1;
      else stats.trabalhos += 1;
      stats.horasTotais += horas;

      if (range || horas > 0) {
        workDays.push({
          id: `pdf_${row.user.id}_${dateKey}_${type}_${stableHash(`${compromisso}_${row.horario}_${file.name}`)}`,
          date: row.dateIso,
          userId: row.user.id,
          startTime: range?.start,
          endTime: range?.end,
          hours: range ? `${range.start} - ${range.end}` : row.horario,
          value: ganhos,
          notes: normalizeSpaces([`Importado do PDF: ${file.name}`, compromisso, row.notes].filter(Boolean).join(" · ")),
          type,
        });
      } else if (ganhos > 0) {
        pushIncome(bucket, row.dateIso, row.user, ganhos, `${compromisso} importado do PDF`, file.name);
      }
    }

    if (gastos > 0) pushExpense(bucket, row.dateIso, row.user, gastos, `Gasto ${compromisso}`.trim(), file.name);

    stats.ganhos += ganhos;
    stats.gastos += gastos;
    stats.saldoFinal += ganhos - gastos;

    if (!dailyStats.has(dateKey)) {
      dailyStats.set(dateKey, { data: dateKey, pessoas: [], saldoTotalDia: 0 });
    }
    const day = dailyStats.get(dateKey)!;
    day.pessoas.push({
      userId: row.user.id,
      nome: row.user.name || "Usuário",
      compromisso,
      horario: row.horario || "-",
      horas,
      ganhos,
      gastos,
      saldo: roundMoney(ganhos - gastos),
    });
    day.saldoTotalDia = roundMoney(day.saldoTotalDia + ganhos - gastos);
  });

  const allFinance = Object.values(financesByUserId).reduce<PdfUserFinanceData>((acc, item) => {
    acc.expenses.push(...item.expenses);
    acc.incomes.push(...item.incomes);
    acc.registrosFinanceiros.push(...item.registrosFinanceiros);
    return acc;
  }, { expenses: [], incomes: [], registrosFinanceiros: [] });

  const pessoas = Array.from(personStats.values())
    .map((item) => ({
      ...item,
      horasTotais: roundHours(item.horasTotais),
      ganhos: roundMoney(item.ganhos),
      gastos: roundMoney(item.gastos),
      saldoFinal: roundMoney(item.saldoFinal),
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  const dias = Array.from(dailyStats.values()).sort((a, b) => a.data.localeCompare(b.data));
  const datas = dias.map((dia) => dia.data);

  const summary: PdfImportSummary = {
    compromissos: pessoas.reduce((sum, item) => sum + item.compromissos, 0),
    trabalhos: pessoas.reduce((sum, item) => sum + item.trabalhos, 0),
    estudos: pessoas.reduce((sum, item) => sum + item.estudos, 0),
    semCompromisso: pessoas.reduce((sum, item) => sum + item.semCompromisso, 0),
    horasTotais: roundHours(pessoas.reduce((sum, item) => sum + item.horasTotais, 0)),
    ganhos: roundMoney(pessoas.reduce((sum, item) => sum + item.ganhos, 0)),
    gastos: roundMoney(pessoas.reduce((sum, item) => sum + item.gastos, 0)),
    saldoFinal: roundMoney(pessoas.reduce((sum, item) => sum + item.saldoFinal, 0)),
    primeiraData: datas[0],
    ultimaData: datas[datas.length - 1],
    pessoas,
    dias,
  };

  return {
    workDays,
    expenses: allFinance.expenses,
    incomes: allFinance.incomes,
    registrosFinanceiros: allFinance.registrosFinanceiros,
    financesByUserId,
    summary,
    rawText,
  };
}
