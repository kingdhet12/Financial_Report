/* ==================================================
   Fixed Expenses Module
   ================================================== */
import { assertNonNegativeNumber, escapeHtml, formatCurrency, uid } from "./utils.js";

export const fixedExpenseConfig = {
  key: "fixed_expenses",
  table: "fixed_expenses",
  title: "Pengeluaran Tetap",
  icon: "fa-calendar-check",
  fields: [
    { name: "name", label: "Nama Pengeluaran", type: "text", required: true },
    { name: "amount", label: "Nominal", type: "number", required: true, min: 0 },
    { name: "due_date", label: "Tanggal Jatuh Tempo", type: "number", required: true, min: 1, max: 31 },
    { name: "category", label: "Kategori", type: "text", required: true },
    { name: "status", label: "Status", type: "select", options: ["Aktif", "Nonaktif"], required: true }
  ],
  columns: [
    { key: "name", label: "Nama Pengeluaran" },
    { key: "amount", label: "Nominal", value: (row) => formatCurrency(row.amount), render: (row) => `<span class="amount expense">${formatCurrency(row.amount)}</span>` },
    { key: "due_date", label: "Jatuh Tempo", value: (row) => `Tanggal ${row.due_date}` },
    { key: "category", label: "Kategori" },
    { key: "status", label: "Status", render: (row) => `<span class="tag ${row.status === "Aktif" ? "success" : "warning"}">${escapeHtml(row.status)}</span>` }
  ],
  searchKeys: ["name", "category", "status"],
  sortKeys: [
    { value: "latest", label: "Terbaru" },
    { value: "amountHigh", label: "Nominal Tertinggi" },
    { value: "amountLow", label: "Nominal Terendah" }
  ]
};

export const normalizeFixedExpense = (row = {}) => ({
  id: row.id || uid(),
  name: row.name || "Pengeluaran tetap",
  amount: assertNonNegativeNumber(row.amount ?? 0, "Nominal"),
  due_date: Math.min(31, Math.max(1, Number(row.due_date || 1))),
  category: row.category || "Bulanan",
  status: row.status || "Aktif",
  created_at: row.created_at || new Date().toISOString()
});

export const seedFixedExpenses = () => [
  ["Internet Rumah", 390000, 5, "Utilitas"],
  ["Listrik", 550000, 10, "Utilitas"],
  ["Air", 120000, 12, "Utilitas"],
  ["Sewa / KPR", 3500000, 1, "Rumah"],
  ["Asuransi", 750000, 15, "Proteksi"],
  ["Gym", 300000, 18, "Lifestyle"],
  ["Streaming", 99000, 20, "Hiburan"],
  ["Dana Orang Tua", 1000000, 25, "Keluarga"],
  ["Pulsa & Data", 220000, 7, "Komunikasi"],
  ["Tabungan Rutin", 1500000, 2, "Tabungan"]
].map(([name, amount, due_date, category], index) => normalizeFixedExpense({
  id: `fix-${String(index + 1).padStart(2, "0")}`,
  name,
  amount,
  due_date,
  category,
  status: index === 6 ? "Nonaktif" : "Aktif",
  created_at: new Date(Date.now() - index * 86400000).toISOString()
}));
