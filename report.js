/* ==================================================
   Reports Module - Chart.js
   ================================================== */
import { currentMonth, currentYear, formatCurrency, monthName, qs, sameMonthYear } from "./utils.js";

const chartBag = {};

const destroyChart = (key) => {
  if (chartBag[key]) {
    chartBag[key].destroy();
    chartBag[key] = null;
  }
};

const makeChart = (key, canvas, config) => {
  if (!window.Chart || !canvas) return;
  destroyChart(key);
  chartBag[key] = new Chart(canvas, config);
};

const sumBy = (rows, predicate) => rows.filter(predicate).reduce((sum, row) => sum + Number(row.amount || 0), 0);

const groupBy = (rows, key, amountKey = "amount") => rows.reduce((acc, row) => {
  const label = row[key] || "Other";
  acc[label] = (acc[label] || 0) + Number(row[amountKey] || 0);
  return acc;
}, {});

export const monthlySummary = (transactions, fixedExpenses, wishlist, paylater, balances) => {
  const month = currentMonth();
  const year = currentYear();
  const monthRows = transactions.filter((row) => sameMonthYear(row.date, month, year));
  const income = sumBy(monthRows, (row) => row.type === "Masuk");
  const expense = sumBy(monthRows, (row) => row.type === "Pengeluaran");
  const investment = sumBy(monthRows, (row) => row.type === "Investasi");
  const fixedTotal = fixedExpenses.filter((row) => row.status === "Aktif").reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const wishlistTotal = wishlist.filter((row) => row.status !== "Selesai").reduce((sum, row) => sum + Number(row.estimated_amount || 0), 0);
  const activePaylater = paylater.filter((row) => row.status !== "Lunas");
  const paylaterMonth = activePaylater.reduce((sum, row) => sum + Number(row.monthly_amount || 0), 0);
  const balanceTotal = balances.reduce((sum, row) => sum + Number(row.amount || 0), 0);

  return {
    income,
    expense,
    investment,
    fixedTotal,
    wishlistTotal,
    activePaylater: activePaylater.length,
    paylaterMonth,
    balanceTotal,
    remaining: income - expense - investment - fixedTotal - paylaterMonth,
    month,
    year
  };
};

export const renderOverviewCharts = (transactions) => {
  const month = currentMonth();
  const year = currentYear();
  const days = Array.from({ length: 31 }, (_, index) => index + 1);
  const incomeDaily = days.map((day) => sumBy(transactions, (row) => row.type === "Masuk" && sameMonthYear(row.date, month, year) && new Date(row.date).getDate() === day));
  const expenseDaily = days.map((day) => sumBy(transactions, (row) => row.type === "Pengeluaran" && sameMonthYear(row.date, month, year) && new Date(row.date).getDate() === day));
  const expenses = transactions.filter((row) => row.type === "Pengeluaran" && sameMonthYear(row.date, month, year));
  const category = groupBy(expenses, "category");

  makeChart("overviewCashflow", qs("#overviewCashflowChart"), {
    type: "line",
    data: {
      labels: days,
      datasets: [
        { label: "Pemasukan", data: incomeDaily, borderColor: "#16A34A", backgroundColor: "rgba(22,163,74,.12)", tension: .35, fill: true },
        { label: "Pengeluaran", data: expenseDaily, borderColor: "#DC2626", backgroundColor: "rgba(220,38,38,.10)", tension: .35, fill: true }
      ]
    },
    options: chartOptions()
  });

  makeChart("overviewCategory", qs("#overviewCategoryChart"), {
    type: "doughnut",
    data: {
      labels: Object.keys(category),
      datasets: [{ data: Object.values(category), backgroundColor: ["#2563EB", "#16A34A", "#F59E0B", "#DC2626", "#7C3AED", "#0891B2"], borderWidth: 0 }]
    },
    options: { responsive: true, plugins: { legend: { position: "bottom" } }, cutout: "62%" }
  });
};

export const renderReports = (state) => {
  const section = qs("#section-reports");
  if (!section) return;
  section.innerHTML = `
    <div class="panel-toolbar">
      <div><span class="eyebrow">Laporan</span><h2>Analisis Keuangan RESBI</h2></div>
      <div class="toolbar-controls">
        <button class="btn ghost" data-print-page><i class="fa-solid fa-print"></i> Print PDF</button>
      </div>
    </div>
    <div class="report-grid">
      <article class="panel glass"><div class="section-head compact"><div><span class="eyebrow">Harian</span><h2>Pemasukan Harian</h2></div></div><canvas id="dailyIncomeChart" height="130"></canvas></article>
      <article class="panel glass"><div class="section-head compact"><div><span class="eyebrow">Harian</span><h2>Pengeluaran Harian</h2></div></div><canvas id="dailyExpenseChart" height="130"></canvas></article>
      <article class="panel glass"><div class="section-head compact"><div><span class="eyebrow">Bulanan</span><h2>Pemasukan Bulanan</h2></div></div><canvas id="monthlyIncomeChart" height="130"></canvas></article>
      <article class="panel glass"><div class="section-head compact"><div><span class="eyebrow">Bulanan</span><h2>Pengeluaran Bulanan</h2></div></div><canvas id="monthlyExpenseChart" height="130"></canvas></article>
      <article class="panel glass"><div class="section-head compact"><div><span class="eyebrow">Kategori</span><h2>Pengeluaran per Kategori</h2></div></div><canvas id="categoryExpenseChart" height="130"></canvas></article>
      <article class="panel glass"><div class="section-head compact"><div><span class="eyebrow">Sumber</span><h2>Transaksi per Sumber Dana</h2></div></div><canvas id="sourceChart" height="130"></canvas></article>
      <article class="panel glass"><div class="section-head compact"><div><span class="eyebrow">Investasi</span><h2>Investasi Bulanan</h2></div></div><canvas id="investmentChart" height="130"></canvas></article>
      <article class="panel glass"><div class="section-head compact"><div><span class="eyebrow">Ringkasan</span><h2>Ringkasan Bulanan</h2></div></div><div id="monthlySummary" class="print-summary"></div></article>
    </div>
  `;

  const tx = state.transactions;
  const month = currentMonth();
  const year = currentYear();
  const days = Array.from({ length: 31 }, (_, index) => index + 1);
  const labelsMonth = Array.from({ length: 12 }, (_, index) => monthName(index + 1));
  const byDay = (type) => days.map((day) => sumBy(tx, (row) => row.type === type && sameMonthYear(row.date, month, year) && new Date(row.date).getDate() === day));
  const byMonth = (type) => labelsMonth.map((_, index) => sumBy(tx, (row) => row.type === type && new Date(row.date).getFullYear() === year && new Date(row.date).getMonth() === index));
  const expenseCategory = groupBy(tx.filter((row) => row.type === "Pengeluaran"), "category");
  const source = groupBy(tx, "source");
  const summary = monthlySummary(state.transactions, state.fixed_expenses, state.wishlist, state.paylater, state.balances);

  makeChart("dailyIncome", qs("#dailyIncomeChart"), lineConfig(days, byDay("Masuk"), "#16A34A", "Pemasukan"));
  makeChart("dailyExpense", qs("#dailyExpenseChart"), lineConfig(days, byDay("Pengeluaran"), "#DC2626", "Pengeluaran"));
  makeChart("monthlyIncome", qs("#monthlyIncomeChart"), barConfig(labelsMonth, byMonth("Masuk"), "#16A34A", "Pemasukan"));
  makeChart("monthlyExpense", qs("#monthlyExpenseChart"), barConfig(labelsMonth, byMonth("Pengeluaran"), "#DC2626", "Pengeluaran"));
  makeChart("categoryExpense", qs("#categoryExpenseChart"), doughnutConfig(Object.keys(expenseCategory), Object.values(expenseCategory)));
  makeChart("source", qs("#sourceChart"), barConfig(Object.keys(source), Object.values(source), "#2563EB", "Sumber Dana"));
  makeChart("investment", qs("#investmentChart"), lineConfig(labelsMonth, byMonth("Investasi"), "#2563EB", "Investasi"));

  qs("#monthlySummary").innerHTML = `
    <div class="summary-row"><span>Bulan</span><strong>${monthName(summary.month)} ${summary.year}</strong></div>
    <div class="summary-row"><span>Pemasukan</span><strong>${formatCurrency(summary.income)}</strong></div>
    <div class="summary-row"><span>Pengeluaran</span><strong>${formatCurrency(summary.expense)}</strong></div>
    <div class="summary-row"><span>Investasi</span><strong>${formatCurrency(summary.investment)}</strong></div>
    <div class="summary-row"><span>Pengeluaran Tetap</span><strong>${formatCurrency(summary.fixedTotal)}</strong></div>
    <div class="summary-row"><span>Cicilan Bulan Ini</span><strong>${formatCurrency(summary.paylaterMonth)}</strong></div>
    <div class="summary-row"><span>Sisa Saldo Bulan Ini</span><strong>${formatCurrency(summary.remaining)}</strong></div>
  `;
};

const chartOptions = () => ({
  responsive: true,
  plugins: { legend: { position: "bottom" } },
  scales: {
    y: { beginAtZero: true, grid: { color: "rgba(100,116,139,.15)" } },
    x: { grid: { display: false } }
  }
});

const lineConfig = (labels, data, color, label) => ({
  type: "line",
  data: { labels, datasets: [{ label, data, borderColor: color, backgroundColor: `${color}22`, tension: .35, fill: true }] },
  options: chartOptions()
});

const barConfig = (labels, data, color, label) => ({
  type: "bar",
  data: { labels, datasets: [{ label, data, backgroundColor: `${color}BB`, borderColor: color, borderWidth: 1, borderRadius: 6 }] },
  options: chartOptions()
});

const doughnutConfig = (labels, data) => ({
  type: "doughnut",
  data: { labels, datasets: [{ data, backgroundColor: ["#2563EB", "#16A34A", "#F59E0B", "#DC2626", "#7C3AED", "#0891B2"], borderWidth: 0 }] },
  options: { responsive: true, plugins: { legend: { position: "bottom" } }, cutout: "62%" }
});
