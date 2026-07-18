/* ==================================================
   PayLater Module
   ================================================== */
import { assertNonNegativeNumber, escapeHtml, formatCurrency, uid } from "./utils.js";

export const paylaterConfig = {
  key: "paylater",
  table: "paylater",
  title: "PayLater",
  icon: "fa-credit-card",
  fields: [
    { name: "description", label: "Keterangan", type: "text", required: true },
    { name: "total_amount", label: "Total Nominal", type: "number", required: true, min: 0 },
    { name: "tenor", label: "Tenor", type: "number", required: true, min: 1 },
    { name: "last_payment_date", label: "Tanggal Cicilan Terakhir", type: "date", required: true },
    { name: "monthly_amount", label: "Nominal Cicilan Per Bulan", type: "number", required: true, min: 0 },
    { name: "payment_number", label: "Pembayaran Ke", type: "number", required: true, min: 0 },
    { name: "status", label: "Status", type: "select", options: ["Belum Lunas", "Lunas"], required: true }
  ],
  columns: [
    { key: "description", label: "Keterangan" },
    { key: "total_amount", label: "Total Nominal", value: (row) => formatCurrency(row.total_amount), render: (row) => `<span class="amount expense">${formatCurrency(row.total_amount)}</span>` },
    { key: "tenor", label: "Tenor", value: (row) => `${row.tenor} bulan` },
    { key: "monthly_amount", label: "Cicilan / Bulan", value: (row) => formatCurrency(row.monthly_amount) },
    { key: "payment_number", label: "Pembayaran Ke" },
    { key: "remaining_months", label: "Sisa Bulan", value: (row) => remainingMonths(row) },
    { key: "remaining_amount", label: "Sisa Nominal", value: (row) => formatCurrency(remainingAmount(row)) },
    { key: "status", label: "Status", render: (row) => `<span class="tag ${row.status === "Lunas" ? "success" : "danger"}">${escapeHtml(row.status)}</span>` }
  ],
  searchKeys: ["description", "status"],
  sortKeys: [
    { value: "latest", label: "Terbaru" },
    { value: "amountHigh", label: "Nominal Tertinggi" },
    { value: "amountLow", label: "Nominal Terendah" }
  ]
};

export const remainingMonths = (row) => Math.max(0, Number(row.tenor || 0) - Number(row.payment_number || 0));
export const remainingAmount = (row) => Math.max(0, Number(row.monthly_amount || 0) * remainingMonths(row));

export const normalizePaylater = (row = {}) => {
  const total = assertNonNegativeNumber(row.total_amount ?? 0, "Total Nominal");
  const tenor = Math.max(1, Number(row.tenor || 1));
  const monthly = assertNonNegativeNumber(row.monthly_amount ?? Math.ceil(total / tenor), "Nominal Cicilan");
  const payment = Math.min(tenor, Math.max(0, Number(row.payment_number || 0)));
  return {
    id: row.id || uid(),
    description: row.description || "Cicilan PayLater",
    total_amount: total,
    tenor,
    last_payment_date: row.last_payment_date || new Date().toISOString().slice(0, 10),
    monthly_amount: monthly,
    payment_number: payment,
    status: row.status || (payment >= tenor ? "Lunas" : "Belum Lunas"),
    created_at: row.created_at || new Date().toISOString()
  };
};

export const seedPaylater = () => {
  const names = [
    "Cicilan Handphone",
    "PayLater Marketplace",
    "Kursi Kerja Ergonomis",
    "Peralatan Dapur",
    "Cicilan Kamera",
    "Sepatu Running",
    "Tablet Bebi",
    "Home Appliance",
    "Tiket Liburan",
    "Kelas Online"
  ];
  return names.map((description, index) => {
    const tenor = [3, 6, 12][index % 3];
    const total = 900000 + index * 420000;
    const paid = index % 4 === 0 ? tenor : index % tenor;
    return normalizePaylater({
      id: `pay-${String(index + 1).padStart(2, "0")}`,
      description,
      total_amount: total,
      tenor,
      monthly_amount: Math.ceil(total / tenor),
      payment_number: paid,
      last_payment_date: new Date(new Date().getFullYear(), index % 12, 25).toISOString().slice(0, 10),
      status: paid >= tenor ? "Lunas" : "Belum Lunas",
      created_at: new Date(Date.now() - index * 72000000).toISOString()
    });
  });
};
