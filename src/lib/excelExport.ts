import type { CalendarData, Expense, Income, User, WorkDay } from "../types";

type UserFinances = {
  expenses: any[];
  incomes: any[];
  registrosFinanceiros: any[];
};

type ExportUser = Pick<User, "id" | "name" | "color">;

type DailyUserSummary = {
  date: Date;
  dayLabel: string;
  compromisso: string;
  horario: string;
  horas: number;
  ganhos: number;
  gastos: number;
  saldo: number;
  status: string;
  observacoes: string;
};

type WorksheetCell = string | number | null;

type WorksheetDef = {
  name: string;
  rows: WorksheetCell[][];
  merges?: string[];
  colWidths?: number[];
  freezeRow?: number;
  styles?: Record<string, number>;
};

type ExportArgs = {
  calendarData: CalendarData;
  users: ExportUser[];
  financesByUserId: Record<string, UserFinances>;
  currentMonth: Date;
  fileName?: string;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const WEEKDAY_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function exportCalendarExcel({ calendarData, users, financesByUserId, currentMonth, fileName }: ExportArgs) {
  const exportUsers = normalizeUsers(users);
  const monthDays = getMonthDays(currentMonth);
  const summariesByUser = new Map<string, DailyUserSummary[]>();

  exportUsers.forEach((person) => {
    summariesByUser.set(
      person.id,
      monthDays.map((date) => buildDailySummary(date, person, calendarData, financesByUserId[person.id]))
    );
  });

  const workbookSheets = [
    buildResumoSheet(exportUsers, monthDays, summariesByUser),
    ...exportUsers.map((person) => buildPersonSheet(person, summariesByUser.get(person.id) || [])),
  ];

  const bytes = buildXlsx(workbookSheets);
  const blob = new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName || `calendario_${formatYearMonth(currentMonth)}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function normalizeUsers(users: ExportUser[]): ExportUser[] {
  const seen = new Set<string>();
  return (users || [])
    .filter((u) => u?.id && !seen.has(u.id) && (seen.add(u.id), true))
    .map((u) => ({ id: u.id, name: u.name || "Pessoa", color: u.color || "#2563EB" }));
}

function buildResumoSheet(
  users: ExportUser[],
  monthDays: Date[],
  summariesByUser: Map<string, DailyUserSummary[]>
): WorksheetDef {
  const userBlockSize = 6;
  const totalCols = 2 + users.length * userBlockSize + 1;
  const lastCol = columnName(totalCols);
  const monthLabel = monthDays[0].toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const rows: WorksheetCell[][] = [];
  rows.push(["Resumo - calendário compartilhado"]);
  rows.push([`Comparativo por dia na mesma aba + totais do final do mês (${capitalize(monthLabel)}).`]);
  rows.push([]);

  const totalHoras = sumUsers(users, summariesByUser, "horas");
  const totalGanhos = sumUsers(users, summariesByUser, "ganhos");
  const totalGastos = sumUsers(users, summariesByUser, "gastos");
  const finalMes = totalGanhos - totalGastos;

  rows.push(["Pessoas", "Horas totais", "Ganhos totais", "Gastos totais", "Final do mês"]);
  rows.push([users.length, round2(totalHoras), round2(totalGanhos), round2(totalGastos), round2(finalMes)]);
  rows.push([]);

  const personRow: WorksheetCell[] = [null, null];
  users.forEach((person) => {
    personRow.push(person.name, null, null, null, null, null);
  });
  personRow.push(null);
  rows.push(personRow);

  const header: WorksheetCell[] = ["Data", "Dia"];
  users.forEach(() => {
    header.push("Compromisso", "Horário", "Horas", "Ganhos", "Gastos", "Saldo");
  });
  header.push("Saldo total do dia");
  rows.push(header);

  monthDays.forEach((date, index) => {
    const row: WorksheetCell[] = [toExcelDate(date), WEEKDAY_PT[date.getDay()]];
    let dayTotal = 0;
    users.forEach((person) => {
      const summary = summariesByUser.get(person.id)?.[index];
      if (!summary) {
        row.push("Sem compromisso", "-", 0, 0, 0, 0);
        return;
      }
      row.push(
        summary.compromisso,
        summary.horario,
        round2(summary.horas),
        round2(summary.ganhos),
        round2(summary.gastos),
        round2(summary.saldo)
      );
      dayTotal += summary.saldo;
    });
    row.push(round2(dayTotal));
    rows.push(row);
  });

  rows.push([]);
  const finalRow: WorksheetCell[] = ["Final do mês", null];
  users.forEach((person) => {
    const list = summariesByUser.get(person.id) || [];
    finalRow.push(
      null,
      null,
      round2(sum(list, "horas")),
      round2(sum(list, "ganhos")),
      round2(sum(list, "gastos")),
      round2(sum(list, "saldo"))
    );
  });
  finalRow.push(round2(finalMes));
  rows.push(finalRow);

  const merges = [`A1:${lastCol}1`, `A2:${lastCol}2`];
  users.forEach((_, userIndex) => {
    const startCol = 3 + userIndex * userBlockSize;
    const endCol = startCol + userBlockSize - 1;
    merges.push(`${columnName(startCol)}7:${columnName(endCol)}7`);
  });

  const styles: Record<string, number> = {
    [`A1:${lastCol}1`]: 1,
    [`A2:${lastCol}2`]: 2,
    "A4:E4": 3,
    "A5:E5": 4,
    [`A7:${lastCol}7`]: 5,
    [`A8:${lastCol}8`]: 6,
    [`A9:A${8 + monthDays.length}`]: 7,
    [`C9:${lastCol}${8 + monthDays.length}`]: 8,
    [`A${10 + monthDays.length}:${lastCol}${10 + monthDays.length}`]: 13,
  };

  const colWidths = [12, 8];
  users.forEach(() => colWidths.push(20, 15, 10, 13, 13, 13));
  colWidths.push(16);

  return { name: "Resumo", rows, merges, colWidths, freezeRow: 8, styles };
}

function buildPersonSheet(person: ExportUser, summaries: DailyUserSummary[]): WorksheetDef {
  const monthLabel = summaries[0]?.date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }) || "mês";
  const rows: WorksheetCell[][] = [];
  rows.push([`${person.name} - compromissos e financeiro`]);
  rows.push([`Dados separados por pessoa, com saldo acumulado e final do mês (${capitalize(monthLabel)}).`]);
  rows.push([]);
  rows.push(["Horas no mês", "Ganhos", "Gastos", "Final do mês"]);
  rows.push([
    round2(sum(summaries, "horas")),
    round2(sum(summaries, "ganhos")),
    round2(sum(summaries, "gastos")),
    round2(sum(summaries, "saldo")),
  ]);
  rows.push([]);
  rows.push(["Data", "Dia", "Compromisso", "Horário", "Horas", "Ganhos", "Gastos", "Saldo do dia", "Status", "Saldo acumulado", "Observações"]);

  let acumulado = 0;
  summaries.forEach((summary) => {
    acumulado += summary.saldo;
    rows.push([
      toExcelDate(summary.date),
      summary.dayLabel,
      summary.compromisso,
      summary.horario,
      round2(summary.horas),
      round2(summary.ganhos),
      round2(summary.gastos),
      round2(summary.saldo),
      summary.status,
      round2(acumulado),
      summary.observacoes || null,
    ]);
  });

  rows.push([]);
  rows.push([
    "Final do mês",
    null,
    null,
    null,
    round2(sum(summaries, "horas")),
    round2(sum(summaries, "ganhos")),
    round2(sum(summaries, "gastos")),
    round2(sum(summaries, "saldo")),
    null,
    round2(sum(summaries, "saldo")),
    null,
  ]);

  return {
    name: safeSheetName(person.name),
    rows,
    merges: ["A1:K1", "A2:K2"],
    colWidths: [12, 8, 24, 15, 10, 13, 13, 13, 13, 14, 28],
    freezeRow: 7,
    styles: {
      "A1:K1": 1,
      "A2:K2": 2,
      "A4:D4": 3,
      "A5:D5": 4,
      "A7:K7": 6,
      [`A8:A${7 + summaries.length}`]: 7,
      [`A8:K${7 + summaries.length}`]: 8,
      [`A${9 + summaries.length}:K${9 + summaries.length}`]: 13,
    },
  };
}

function buildDailySummary(
  date: Date,
  person: ExportUser,
  calendarData: CalendarData,
  finances?: UserFinances
): DailyUserSummary {
  const dateKey = toDateKey(date);
  const workItems = (calendarData.workDays || []).filter((wd) => wd.userId === person.id && toDateKey(wd.date) === dateKey);
  const expenses = (finances?.expenses || []).filter((expense: Expense) => toDateKey(expense.date) === dateKey);
  const incomes = (finances?.incomes || []).filter((income: Income) => toDateKey(income.date) === dateKey);
  const legacyRecords = (finances?.registrosFinanceiros || []).filter((record: any) => toDateKey(record.data || record.date) === dateKey);

  const commitmentLabels = workItems.map(formatCommitmentLabel).filter(Boolean);
  const timeLabels = workItems.map(formatWorkTime).filter(Boolean);
  const notes = [
    ...workItems.map((wd) => wd.notes).filter(Boolean),
    ...expenses.map((e: any) => e.name || e.descricao).filter(Boolean),
    ...incomes.map((i: any) => i.name || i.descricao).filter(Boolean),
    ...legacyRecords.map((r: any) => r.descricao || r.name).filter(Boolean),
  ];

  const horas = workItems.reduce((acc, wd) => acc + getWorkHours(wd), 0);
  const ganhosFromWork = workItems.reduce((acc, wd) => acc + toNumber(wd.value), 0);
  const ganhosFromIncomes = incomes.reduce((acc, inc: any) => acc + toNumber(inc.value ?? inc.valor), 0);
  const gastosFromExpenses = expenses.reduce((acc, expense: any) => {
    const value = toNumber(expense.value ?? expense.valor);
    const quantity = toNumber(expense.quantity ?? expense.quantidade ?? 1) || 1;
    return acc + value * quantity;
  }, 0);

  const ganhosFromRecords = legacyRecords
    .filter((record: any) => record.tipo === "receber" || record.tipo === "ganho" || record.tipo === "income")
    .reduce((acc: number, record: any) => acc + toNumber(record.valor ?? record.value), 0);
  const gastosFromRecords = legacyRecords
    .filter((record: any) => record.tipo === "gasto" || record.tipo === "expense")
    .reduce((acc: number, record: any) => acc + toNumber(record.valor ?? record.value), 0);

  const ganhos = ganhosFromWork + ganhosFromIncomes + ganhosFromRecords;
  const gastos = gastosFromExpenses + gastosFromRecords;
  const saldo = ganhos - gastos;
  const hasCommitment = workItems.length > 0;
  const hasFinanceOnly = !hasCommitment && (ganhos > 0 || gastos > 0);

  return {
    date,
    dayLabel: WEEKDAY_PT[date.getDay()],
    compromisso: hasCommitment ? unique(commitmentLabels).join(" / ") : "Sem compromisso",
    horario: hasCommitment ? unique(timeLabels).join(" / ") || "-" : "-",
    horas,
    ganhos,
    gastos,
    saldo,
    status: hasCommitment ? "Ocupado" : hasFinanceOnly ? "Movimentação" : "Livre",
    observacoes: unique(notes).join("; "),
  };
}

function formatCommitmentLabel(wd: WorkDay) {
  const base = wd.type === "study" ? "Estudo" : "Trabalho";
  const note = (wd.notes || "").trim();
  return note && note.length <= 32 ? `${base} - ${note}` : base;
}

function formatWorkTime(wd: WorkDay) {
  if (wd.startTime && wd.endTime) return `${wd.startTime}-${wd.endTime}`;
  if (wd.hours && /\d/.test(wd.hours)) return wd.hours.replace(/\s+-\s+/g, "-");
  return "-";
}

function getWorkHours(wd: WorkDay) {
  if (wd.startTime && wd.endTime) return durationHours(wd.startTime, wd.endTime);
  const text = wd.hours || "";
  const timeRange = text.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
  if (timeRange) return durationHours(timeRange[1], timeRange[2]);
  const numberMatch = text.replace(",", ".").match(/\d+(\.\d+)?/);
  return numberMatch ? Number(numberMatch[0]) : 0;
}

function durationHours(start: string, end: string) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return 0;
  let minutes = eh * 60 + em - (sh * 60 + sm);
  if (minutes < 0) minutes += 24 * 60;
  return minutes / 60;
}

function getMonthDays(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: lastDay }, (_, index) => new Date(year, month, index + 1));
}

function toDateKey(value: string | Date | undefined) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function toExcelDate(date: Date) {
  return Math.round((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(1899, 11, 30)) / MS_PER_DAY);
}

function formatYearMonth(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value.replace(/[^\d,.-]/g, "").replace(".", "").replace(",", ".");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function sum(items: DailyUserSummary[], key: keyof Pick<DailyUserSummary, "horas" | "ganhos" | "gastos" | "saldo">) {
  return items.reduce((acc, item) => acc + toNumber(item[key]), 0);
}

function sumUsers(
  users: ExportUser[],
  summariesByUser: Map<string, DailyUserSummary[]>,
  key: keyof Pick<DailyUserSummary, "horas" | "ganhos" | "gastos" | "saldo">
) {
  return users.reduce((acc, person) => acc + sum(summariesByUser.get(person.id) || [], key), 0);
}

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function unique(values: Array<string | undefined | null>) {
  return Array.from(new Set(values.map((v) => (v || "").trim()).filter(Boolean)));
}

function capitalize(value: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

function safeSheetName(name: string) {
  return (name || "Pessoa").replace(/[\\/?*[\]:]/g, " ").slice(0, 31).trim() || "Pessoa";
}

function columnName(index: number) {
  let name = "";
  while (index > 0) {
    const mod = (index - 1) % 26;
    name = String.fromCharCode(65 + mod) + name;
    index = Math.floor((index - mod) / 26);
  }
  return name;
}

function buildXlsx(sheets: WorksheetDef[]) {
  const safeSheets = makeUniqueSheetNames(sheets);
  const files: Record<string, string | Uint8Array> = {};
  files["[Content_Types].xml"] = buildContentTypes(safeSheets.length);
  files["_rels/.rels"] = buildRootRels();
  files["xl/workbook.xml"] = buildWorkbookXml(safeSheets);
  files["xl/_rels/workbook.xml.rels"] = buildWorkbookRels(safeSheets.length);
  files["xl/styles.xml"] = buildStylesXml();
  safeSheets.forEach((sheet, index) => {
    files[`xl/worksheets/sheet${index + 1}.xml`] = buildSheetXml(sheet);
  });
  return zipFiles(files);
}

function makeUniqueSheetNames(sheets: WorksheetDef[]) {
  const used = new Set<string>();
  return sheets.map((sheet) => {
    const base = safeSheetName(sheet.name);
    let name = base;
    let counter = 2;
    while (used.has(name.toLowerCase())) {
      const suffix = ` ${counter}`;
      name = `${base.slice(0, Math.max(1, 31 - suffix.length))}${suffix}`;
      counter += 1;
    }
    used.add(name.toLowerCase());
    return { ...sheet, name };
  });
}

function buildContentTypes(sheetCount: number) {
  const sheetOverrides = Array.from({ length: sheetCount }, (_, i) =>
    `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
  ).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  ${sheetOverrides}
</Types>`;
}

function buildRootRels() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;
}

function buildWorkbookXml(sheets: WorksheetDef[]) {
  const sheetXml = sheets
    .map((sheet, index) => `<sheet name="${escapeXml(safeSheetName(sheet.name))}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`)
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <workbookViews><workbookView activeTab="0"/></workbookViews>
  <sheets>${sheetXml}</sheets>
</workbook>`;
}

function buildWorkbookRels(sheetCount: number) {
  const sheetRels = Array.from({ length: sheetCount }, (_, i) =>
    `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`
  ).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${sheetRels}
  <Relationship Id="rId${sheetCount + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;
}

function buildStylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="3">
    <numFmt numFmtId="164" formatCode="dd/mm/yyyy"/>
    <numFmt numFmtId="165" formatCode="R$ #,##0.00"/>
    <numFmt numFmtId="166" formatCode="0.00"/>
  </numFmts>
  <fonts count="6">
    <font><sz val="11"/><color theme="1"/><name val="Calibri"/></font>
    <font><b/><sz val="16"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
    <font><i/><sz val="10"/><color rgb="FF64748B"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><color rgb="FF0F172A"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><color rgb="FFB91C1C"/><name val="Calibri"/></font>
  </fonts>
  <fills count="7">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF0F172A"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF059669"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFEFF6FF"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF2563EB"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFEF3C7"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border><left style="thin"><color rgb="FFE2E8F0"/></left><right style="thin"><color rgb="FFE2E8F0"/></right><top style="thin"><color rgb="FFE2E8F0"/></top><bottom style="thin"><color rgb="FFE2E8F0"/></bottom><diagonal/></border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="14">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="3" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="166" fontId="4" fillId="4" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="3" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="3" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
    <xf numFmtId="166" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="165" fontId="5" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="166" fontId="4" fillId="6" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;
}

function buildSheetXml(sheet: WorksheetDef) {
  const maxCols = Math.max(...sheet.rows.map((row) => row.length), 1);
  const dimension = `A1:${columnName(maxCols)}${sheet.rows.length}`;
  const cols = (sheet.colWidths || [])
    .map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`)
    .join("");
  const sheetViews = sheet.freezeRow
    ? `<sheetViews><sheetView workbookViewId="0"><pane ySplit="${sheet.freezeRow}" topLeftCell="A${sheet.freezeRow + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>`
    : `<sheetViews><sheetView workbookViewId="0"/></sheetViews>`;
  const rows = sheet.rows.map((row, rIndex) => buildRowXml(row, rIndex + 1, sheet.styles || {})).join("");
  const merges = sheet.merges?.length ? `<mergeCells count="${sheet.merges.length}">${sheet.merges.map((ref) => `<mergeCell ref="${ref}"/>`).join("")}</mergeCells>` : "";

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <dimension ref="${dimension}"/>
  ${sheetViews}
  <cols>${cols}</cols>
  <sheetData>${rows}</sheetData>
  ${merges}
  <pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>
</worksheet>`;
}

function buildRowXml(row: WorksheetCell[], rowIndex: number, styles: Record<string, number>) {
  const cells = row
    .map((value, colIndex) => buildCellXml(value, rowIndex, colIndex + 1, resolveStyle(styles, rowIndex, colIndex + 1, value)))
    .join("");
  return `<row r="${rowIndex}" ht="22" customHeight="1">${cells}</row>`;
}

function buildCellXml(value: WorksheetCell, row: number, col: number, style: number) {
  const ref = `${columnName(col)}${row}`;
  if (value === null || value === undefined || value === "") return `<c r="${ref}" s="${style}"/>`;
  if (typeof value === "number") {
    const numericStyle = style || inferNumericStyle(row, col, value);
    return `<c r="${ref}" s="${numericStyle}"><v>${Number.isFinite(value) ? value : 0}</v></c>`;
  }
  return `<c r="${ref}" s="${style}" t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`;
}

function inferNumericStyle(row: number, col: number, value: number) {
  if (col === 1 && row >= 8) return 7;
  if (value < 0) return 11;
  return 10;
}

function resolveStyle(styles: Record<string, number>, row: number, col: number, value: WorksheetCell) {
  const cell = `${columnName(col)}${row}`;
  if (styles[cell] !== undefined) return styles[cell];
  for (const [range, style] of Object.entries(styles)) {
    if (range.includes(":")) {
      if (cellInRange(cell, range)) return style;
    }
  }
  if (typeof value === "number") return inferNumericStyle(row, col, value);
  return 0;
}

function cellInRange(cell: string, range: string) {
  const [start, end] = range.split(":");
  const parsedCell = parseCellRef(cell);
  const parsedStart = parseCellRef(start);
  const parsedEnd = parseCellRef(end);
  return parsedCell.row >= parsedStart.row && parsedCell.row <= parsedEnd.row && parsedCell.col >= parsedStart.col && parsedCell.col <= parsedEnd.col;
}

function parseCellRef(ref: string) {
  const match = ref.match(/^([A-Z]+)(\d+)$/);
  if (!match) return { col: 1, row: 1 };
  return { col: columnIndex(match[1]), row: Number(match[2]) };
}

function columnIndex(name: string) {
  return name.split("").reduce((acc, char) => acc * 26 + char.charCodeAt(0) - 64, 0);
}

function escapeXml(value: string) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function zipFiles(files: Record<string, string | Uint8Array>) {
  const encoder = new TextEncoder();
  const fileEntries = Object.entries(files).map(([name, content]) => ({
    name,
    data: typeof content === "string" ? encoder.encode(content) : content,
  }));

  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  fileEntries.forEach((entry) => {
    const nameBytes = encoder.encode(entry.name);
    const crc = crc32(entry.data);
    const localHeader = new Uint8Array(30 + nameBytes.length);
    const view = new DataView(localHeader.buffer);
    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 0, true);
    view.setUint16(8, 0, true);
    view.setUint16(10, 0, true);
    view.setUint16(12, 0, true);
    view.setUint32(14, crc, true);
    view.setUint32(18, entry.data.length, true);
    view.setUint32(22, entry.data.length, true);
    view.setUint16(26, nameBytes.length, true);
    view.setUint16(28, 0, true);
    localHeader.set(nameBytes, 30);
    localParts.push(localHeader, entry.data);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(centralHeader.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint16(12, 0, true);
    centralView.setUint16(14, 0, true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, entry.data.length, true);
    centralView.setUint32(24, entry.data.length, true);
    centralView.setUint16(28, nameBytes.length, true);
    centralView.setUint16(30, 0, true);
    centralView.setUint16(32, 0, true);
    centralView.setUint16(34, 0, true);
    centralView.setUint16(36, 0, true);
    centralView.setUint32(38, 0, true);
    centralView.setUint32(42, offset, true);
    centralHeader.set(nameBytes, 46);
    centralParts.push(centralHeader);

    offset += localHeader.length + entry.data.length;
  });

  const centralOffset = offset;
  const centralSize = centralParts.reduce((acc, part) => acc + part.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, fileEntries.length, true);
  endView.setUint16(10, fileEntries.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, centralOffset, true);

  return concatUint8Arrays([...localParts, ...centralParts, end]);
}

function concatUint8Arrays(parts: Uint8Array[]) {
  const total = parts.reduce((acc, part) => acc + part.length, 0);
  const output = new Uint8Array(total);
  let offset = 0;
  parts.forEach((part) => {
    output.set(part, offset);
    offset += part.length;
  });
  return output;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(data: Uint8Array) {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
