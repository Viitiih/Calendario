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

type ExportPdfArgs = {
  calendarData: CalendarData;
  users: ExportUser[];
  financesByUserId: Record<string, UserFinances>;
  currentMonth: Date;
  fileName?: string;
};

const WEEKDAY_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function exportCalendarPdf({ calendarData, users, financesByUserId, currentMonth, fileName }: ExportPdfArgs) {
  const exportUsers = normalizeUsers(users);
  const monthDays = getMonthDays(currentMonth);
  const summariesByUser = new Map<string, DailyUserSummary[]>();

  exportUsers.forEach((person) => {
    summariesByUser.set(
      person.id,
      monthDays.map((date) => buildDailySummary(date, person, calendarData, financesByUserId[person.id]))
    );
  });

  const title = fileName?.replace(/\.pdf$/i, "") || `calendario_${formatYearMonth(currentMonth)}`;
  const html = buildPdfHtml({ title, monthDays, users: exportUsers, summariesByUser });
  const printWindow = window.open("", "_blank", "width=1200,height=800");

  if (!printWindow) {
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    alert("O navegador bloqueou a janela do PDF. Baixei um HTML; abra ele e use Ctrl+P para salvar como PDF.");
    return;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
}

function buildPdfHtml({
  title,
  monthDays,
  users,
  summariesByUser,
}: {
  title: string;
  monthDays: Date[];
  users: ExportUser[];
  summariesByUser: Map<string, DailyUserSummary[]>;
}) {
  const monthLabel = monthDays[0]?.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }) || "mês";
  const totalHoras = sumUsers(users, summariesByUser, "horas");
  const totalGanhos = sumUsers(users, summariesByUser, "ganhos");
  const totalGastos = sumUsers(users, summariesByUser, "gastos");
  const finalMes = totalGanhos - totalGastos;
  const generatedAt = new Date().toLocaleString("pt-BR");

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #f1f5f9; color: #0f172a; font-family: Inter, Arial, Helvetica, sans-serif; }
    body { padding: 20px; }
    .page { background: #ffffff; border-radius: 18px; padding: 22px; box-shadow: 0 18px 45px rgba(15, 23, 42, .12); margin: 0 auto 18px; max-width: 1280px; }
    .page-break { page-break-before: always; }
    .top { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; margin-bottom: 18px; }
    .eyebrow { font-size: 10px; letter-spacing: .22em; text-transform: uppercase; color: #64748b; font-weight: 800; }
    h1, h2 { margin: 6px 0 0; line-height: 1.1; }
    h1 { font-size: 24px; }
    h2 { font-size: 20px; }
    .subtitle { margin: 7px 0 0; color: #64748b; font-size: 12px; font-weight: 700; }
    .generated { font-size: 10px; color: #64748b; text-align: right; font-weight: 700; }
    .cards { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin: 14px 0 18px; }
    .card { border: 1px solid #e2e8f0; border-radius: 14px; padding: 12px; background: #f8fafc; }
    .card-label { color: #64748b; font-size: 10px; text-transform: uppercase; letter-spacing: .08em; font-weight: 900; }
    .card-value { margin-top: 4px; font-size: 18px; font-weight: 950; color: #0f172a; }
    .card-value.positive { color: #047857; }
    .card-value.negative { color: #be123c; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    th, td { border: 1px solid #e2e8f0; padding: 6px 7px; vertical-align: middle; overflow-wrap: anywhere; }
    th { background: #0f172a; color: #ffffff; font-size: 9px; letter-spacing: .05em; text-transform: uppercase; }
    td { font-size: 10px; }
    tbody tr:nth-child(even) td { background: #f8fafc; }
    .date-col { width: 64px; text-align: center; font-weight: 900; }
    .day-col { width: 42px; text-align: center; color: #475569; font-weight: 900; }
    .money, .hours, .total-day { text-align: right; white-space: nowrap; }
    .status { text-align: center; font-weight: 900; }
    .person-head { color: #ffffff; text-align: center; font-weight: 950; }
    .final-row td { background: #ecfdf5 !important; font-weight: 950; color: #064e3b; }
    .person-summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin: 12px 0 14px; }
    .note { color: #64748b; font-size: 10px; font-weight: 700; margin-top: 10px; }
    .print-help { position: fixed; right: 18px; bottom: 18px; display: flex; gap: 8px; align-items: center; background: #0f172a; color: #fff; border-radius: 999px; padding: 10px 14px; box-shadow: 0 12px 30px rgba(15,23,42,.25); font-size: 12px; font-weight: 900; }
    .print-help button { border: 0; border-radius: 999px; background: #ffffff; color: #0f172a; font-weight: 950; padding: 8px 12px; cursor: pointer; }
    @media print {
      @page { size: A4 landscape; margin: 8mm; }
      html, body { background: #ffffff; padding: 0; }
      body { padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page { border-radius: 0; box-shadow: none; padding: 0; max-width: none; margin: 0; }
      .page-break { page-break-before: always; }
      .print-help { display: none; }
      th, td { padding: 4px 5px; }
      td { font-size: 8px; }
      th { font-size: 7px; }
      h1 { font-size: 18px; }
      h2 { font-size: 16px; }
      .cards, .person-summary { gap: 6px; }
      .card { padding: 8px; }
      .card-value { font-size: 14px; }
    }
  </style>
</head>
<body>
  ${buildResumoSection({ monthLabel, generatedAt, users, monthDays, summariesByUser, totalHoras, totalGanhos, totalGastos, finalMes })}
  ${users.map((person) => buildPersonSection(person, summariesByUser.get(person.id) || [])).join("\n")}
  <div class="print-help">
    <span>Para salvar: clique em imprimir e escolha "Salvar como PDF".</span>
    <button onclick="window.print()">Imprimir / PDF</button>
  </div>
  <script>
    window.addEventListener('load', function () {
      setTimeout(function () { window.print(); }, 450);
    });
  </script>
</body>
</html>`;
}

function buildResumoSection({
  monthLabel,
  generatedAt,
  users,
  monthDays,
  summariesByUser,
  totalHoras,
  totalGanhos,
  totalGastos,
  finalMes,
}: {
  monthLabel: string;
  generatedAt: string;
  users: ExportUser[];
  monthDays: Date[];
  summariesByUser: Map<string, DailyUserSummary[]>;
  totalHoras: number;
  totalGanhos: number;
  totalGastos: number;
  finalMes: number;
}) {
  const finalRowCells = users.map((person) => {
    const list = summariesByUser.get(person.id) || [];
    return `
      <td></td>
      <td></td>
      <td class="hours">${formatHours(sum(list, "horas"))}</td>
      <td class="money">${formatCurrency(sum(list, "ganhos"))}</td>
      <td class="money">${formatCurrency(sum(list, "gastos"))}</td>
      <td class="money">${formatCurrency(sum(list, "saldo"))}</td>`;
  }).join("");

  return `<section class="page">
    <div class="top">
      <div>
        <div class="eyebrow">Resumo geral</div>
        <h1>Calendário compartilhado - ${escapeHtml(capitalize(monthLabel))}</h1>
        <p class="subtitle">Comparativo por dia com os dados separados por pessoa.</p>
      </div>
      <div class="generated">Gerado em<br>${escapeHtml(generatedAt)}</div>
    </div>

    <div class="cards">
      ${summaryCard("Horas totais", formatHours(totalHoras))}
      ${summaryCard("Ganhos totais", formatCurrency(totalGanhos), "positive")}
      ${summaryCard("Gastos totais", formatCurrency(totalGastos), "negative")}
      ${summaryCard("Final do mês", formatCurrency(finalMes), finalMes >= 0 ? "positive" : "negative")}
    </div>

    <table>
      <thead>
        <tr>
          <th rowspan="2" class="date-col">Data</th>
          <th rowspan="2" class="day-col">Dia</th>
          ${users.map((person) => `<th class="person-head" colspan="6" style="background:${escapeHtml(person.color || "#2563eb")}">${escapeHtml(person.name)}</th>`).join("")}
          <th rowspan="2" class="total-day">Saldo total do dia</th>
        </tr>
        <tr>
          ${users.map(() => `<th>Compromisso</th><th>Horário</th><th>Horas</th><th>Ganhos</th><th>Gastos</th><th>Saldo</th>`).join("")}
        </tr>
      </thead>
      <tbody>
        ${monthDays.map((date, index) => {
          let dayTotal = 0;
          const cells = users.map((person) => {
            const summary = summariesByUser.get(person.id)?.[index];
            if (!summary) return `<td>Sem compromisso</td><td>-</td><td class="hours">0h</td><td class="money">R$ 0,00</td><td class="money">R$ 0,00</td><td class="money">R$ 0,00</td>`;
            dayTotal += summary.saldo;
            return `<td>${escapeHtml(summary.compromisso)}</td><td>${escapeHtml(summary.horario)}</td><td class="hours">${formatHours(summary.horas)}</td><td class="money">${formatCurrency(summary.ganhos)}</td><td class="money">${formatCurrency(summary.gastos)}</td><td class="money">${formatCurrency(summary.saldo)}</td>`;
          }).join("");
          return `<tr><td class="date-col">${formatDate(date)}</td><td class="day-col">${WEEKDAY_PT[date.getDay()]}</td>${cells}<td class="total-day">${formatCurrency(dayTotal)}</td></tr>`;
        }).join("")}
        <tr class="final-row"><td>Final do mês</td><td></td>${finalRowCells}<td class="total-day">${formatCurrency(finalMes)}</td></tr>
      </tbody>
    </table>
    <p class="note">Observação: os valores financeiros vêm dos ganhos/gastos registrados no app e o valor informado em cada compromisso.</p>
  </section>`;
}

function buildPersonSection(person: ExportUser, summaries: DailyUserSummary[]) {
  const totalHoras = sum(summaries, "horas");
  const totalGanhos = sum(summaries, "ganhos");
  const totalGastos = sum(summaries, "gastos");
  const finalMes = sum(summaries, "saldo");
  let acumulado = 0;

  return `<section class="page page-break">
    <div class="top">
      <div>
        <div class="eyebrow">Resumo individual</div>
        <h2>${escapeHtml(person.name)}</h2>
        <p class="subtitle">Compromissos, horas, ganhos, gastos e saldo acumulado.</p>
      </div>
    </div>

    <div class="person-summary">
      ${summaryCard("Horas no mês", formatHours(totalHoras))}
      ${summaryCard("Ganhos", formatCurrency(totalGanhos), "positive")}
      ${summaryCard("Gastos", formatCurrency(totalGastos), "negative")}
      ${summaryCard("Final do mês", formatCurrency(finalMes), finalMes >= 0 ? "positive" : "negative")}
    </div>

    <table>
      <thead>
        <tr>
          <th class="date-col">Data</th>
          <th class="day-col">Dia</th>
          <th>Compromisso</th>
          <th>Horário</th>
          <th>Horas</th>
          <th>Ganhos</th>
          <th>Gastos</th>
          <th>Saldo do dia</th>
          <th>Status</th>
          <th>Saldo acumulado</th>
          <th>Observações</th>
        </tr>
      </thead>
      <tbody>
        ${summaries.map((summary) => {
          acumulado += summary.saldo;
          return `<tr>
            <td class="date-col">${formatDate(summary.date)}</td>
            <td class="day-col">${escapeHtml(summary.dayLabel)}</td>
            <td>${escapeHtml(summary.compromisso)}</td>
            <td>${escapeHtml(summary.horario)}</td>
            <td class="hours">${formatHours(summary.horas)}</td>
            <td class="money">${formatCurrency(summary.ganhos)}</td>
            <td class="money">${formatCurrency(summary.gastos)}</td>
            <td class="money">${formatCurrency(summary.saldo)}</td>
            <td class="status">${escapeHtml(summary.status)}</td>
            <td class="money">${formatCurrency(acumulado)}</td>
            <td>${escapeHtml(summary.observacoes || "-")}</td>
          </tr>`;
        }).join("")}
        <tr class="final-row"><td>Final do mês</td><td></td><td></td><td></td><td class="hours">${formatHours(totalHoras)}</td><td class="money">${formatCurrency(totalGanhos)}</td><td class="money">${formatCurrency(totalGastos)}</td><td class="money">${formatCurrency(finalMes)}</td><td></td><td class="money">${formatCurrency(finalMes)}</td><td></td></tr>
      </tbody>
    </table>
  </section>`;
}

function summaryCard(label: string, value: string, tone: "positive" | "negative" | "" = "") {
  return `<div class="card"><div class="card-label">${escapeHtml(label)}</div><div class="card-value ${tone}">${escapeHtml(value)}</div></div>`;
}

function normalizeUsers(users: ExportUser[]): ExportUser[] {
  const seen = new Set<string>();
  return (users || [])
    .filter((u) => u?.id && !seen.has(u.id) && (seen.add(u.id), true))
    .map((u) => ({ id: u.id, name: u.name || "Pessoa", color: u.color || "#2563EB" }));
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

function formatDate(date: Date) {
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function formatYearMonth(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(round2(value));
}

function formatHours(value: number) {
  const rounded = round2(value);
  return `${rounded.toLocaleString("pt-BR", { minimumFractionDigits: rounded % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 })}h`;
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

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
