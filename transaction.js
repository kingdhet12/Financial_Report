/* ==================================================
   Transactions Module
   ================================================== */
import { assertNonNegativeNumber, currentYear, escapeHtml, formatCurrency, toNumber, uid } from "./utils.js";

export const SOURCES = [
  "BCA",
  "Tabungan BLU",
  "Bank BCA",
  "Cash",
  "Bank Blu BCA",
  "Tabungan Blu",
  "Bank BCA Makan"
];

export const TRANSACTION_TYPES = ["Masuk", "Pengeluaran", "Investasi"];
export const TRANSACTION_CATEGORIES = ["Tabungan", "Gaji", "Living Expenses", "Other", "Bebi Personal", "Makan / Minum"];
export const RECIPIENTS = ["Bebi", "Resa", "Berdua"];

export const transactionConfig = {
  key: "transactions",
  table: "transactions",
  title: "Transaksi",
  icon: "fa-arrow-right-arrow-left",
  filters: [
    { name: "month", label: "Bulan", type: "month" },
    { name: "year", label: "Tahun", type: "year" },
    { name: "category", label: "Kategori", options: ["Semua Kategori", ...TRANSACTION_CATEGORIES] },
    { name: "type", label: "Jenis", options: ["Semua Jenis", ...TRANSACTION_TYPES] },
    { name: "source", label: "Sumber", options: ["Semua Sumber", ...SOURCES] }
  ],
  fields: [
    { name: "date", label: "Tanggal", type: "date", required: true },
    { name: "description", label: "Keterangan", type: "text", required: true },
    { name: "source", label: "Sumber Dana", type: "select", options: SOURCES, required: true },
    { name: "amount", label: "Jumlah", type: "number", required: true, min: 0 },
    { name: "type", label: "Jenis Transaksi", type: "select", options: TRANSACTION_TYPES, required: true },
    { name: "category", label: "Kategori", type: "select", options: TRANSACTION_CATEGORIES, required: true },
    { name: "recipient", label: "Nama Penerima", type: "select", options: RECIPIENTS, required: true }
  ],
  columns: [
    { key: "date", label: "Tanggal" },
    { key: "description", label: "Keterangan" },
    { key: "source", label: "Sumber Dana" },
    { key: "type", label: "Jenis", render: (row) => `<span class="tag ${typeClass(row.type)}">${escapeHtml(row.type)}</span>` },
    { key: "category", label: "Kategori" },
    { key: "recipient", label: "Penerima" },
    { key: "amount", label: "Jumlah", value: (row) => formatCurrency(row.amount), render: (row) => `<span class="amount ${typeClass(row.type)}">${formatCurrency(row.amount)}</span>` }
  ],
  searchKeys: ["date", "description", "category", "source", "recipient"],
  sortKeys: [
    { value: "latest", label: "Terbaru" },
    { value: "oldest", label: "Terlama" },
    { value: "amountHigh", label: "Nominal Tertinggi" },
    { value: "amountLow", label: "Nominal Terendah" }
  ]
};

export const typeClass = (type) => {
  if (type === "Masuk") return "income";
  if (type === "Investasi") return "investment";
  return "expense";
};

export const normalizeAccount = (source = "") => {
  const lower = source.toLowerCase();
  if (lower.includes("blu")) return "Blu BCA";
  if (lower.includes("bca")) return "BCA";
  if (lower.includes("cash")) return "Cash";
  return source;
};

export const normalizeTransaction = (row = {}) => ({
  id: row.id || uid(),
  date: row.date || new Date().toISOString().slice(0, 10),
  description: row.description || row.keterangan || "Transaksi RESBI",
  source: row.source || "BCA",
  amount: assertNonNegativeNumber(row.amount ?? row.jumlah ?? 0, "Jumlah"),
  type: row.type || "Pengeluaran",
  category: row.category || "Other",
  recipient: row.recipient || "Berdua",
  created_at: row.created_at || new Date().toISOString()
});

export const applyTransactionToBalances = (balances, transaction, direction = 1) => {
  const normalized = normalizeTransaction(transaction);
  const multiplier = normalized.type === "Masuk" ? 1 : -1;
  const account = normalizeAccount(normalized.source);
  const owners = normalized.recipient === "Berdua" ? ["Bebi", "Resa"] : [normalized.recipient];
  const amountPerOwner = (normalized.amount * multiplier * direction) / owners.length;

  return balances.map((balance) => {
    if (owners.includes(balance.owner) && balance.account === account) {
      return { ...balance, amount: Math.max(0, toNumber(balance.amount) + amountPerOwner) };
    }
    return balance;
  });
};

export const filterTransactions = (rows, query = "", filters = {}, sort = "latest") => {
  const term = query.trim().toLowerCase();
  let result = rows.filter((row) => {
    const matchesSearch = !term || transactionConfig.searchKeys.some((key) => String(row[key] ?? "").toLowerCase().includes(term));
    const date = new Date(row.date);
    const matchesMonth = !filters.month || filters.month === "all" || date.getMonth() + 1 === Number(filters.month);
    const matchesYear = !filters.year || filters.year === "all" || date.getFullYear() === Number(filters.year);
    const matchesCategory = !filters.category || filters.category === "Semua Kategori" || row.category === filters.category;
    const matchesType = !filters.type || filters.type === "Semua Jenis" || row.type === filters.type;
    const matchesSource = !filters.source || filters.source === "Semua Sumber" || row.source === filters.source;
    return matchesSearch && matchesMonth && matchesYear && matchesCategory && matchesType && matchesSource;
  });

  const sorters = {
    latest: (a, b) => new Date(b.date) - new Date(a.date),
    oldest: (a, b) => new Date(a.date) - new Date(b.date),
    amountHigh: (a, b) => b.amount - a.amount,
    amountLow: (a, b) => a.amount - b.amount
  };
  return result.sort(sorters[sort] || sorters.latest);
};

export const seedTransactions = (count = 100) => {
  const descriptions = [
    "Gaji bulanan",
    "Belanja groceries",
    "Makan siang",
    "Top up investasi",
    "Transport harian",
    "Kopi sore",
    "Bonus project",
    "Bayar internet",
    "Dana darurat",
    "Dinner berdua",
    "Belanja skincare",
    "Cicilan tabungan"
  ];
  const rows = [];
  for (let index = 0; index < count; index += 1) {
    const type = index % 9 === 0 ? "Masuk" : index % 7 === 0 ? "Investasi" : "Pengeluaran";
    const date = new Date(currentYear(), index % 12, (index % 26) + 1);
    const baseAmount = type === "Masuk" ? 4200000 + (index % 5) * 750000 : type === "Investasi" ? 250000 + (index % 6) * 150000 : 18000 + (index % 15) * 27000;
    rows.push(normalizeTransaction({
      id: `trx-${String(index + 1).padStart(3, "0")}`,
      date: date.toISOString().slice(0, 10),
      description: descriptions[index % descriptions.length],
      source: SOURCES[index % SOURCES.length],
      amount: baseAmount,
      type,
      category: TRANSACTION_CATEGORIES[index % TRANSACTION_CATEGORIES.length],
      recipient: RECIPIENTS[index % RECIPIENTS.length],
      created_at: new Date(Date.now() - index * 3600000).toISOString()
    }));
  }
  return rows;
};
