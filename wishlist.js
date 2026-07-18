/* ==================================================
   Wishlist Module
   ================================================== */
import { assertNonNegativeNumber, escapeHtml, formatCurrency, uid } from "./utils.js";

export const wishlistConfig = {
  key: "wishlist",
  table: "wishlist",
  title: "Wishlist",
  icon: "fa-heart",
  fields: [
    { name: "description", label: "Keterangan", type: "text", required: true },
    { name: "estimated_amount", label: "Perkiraan Dana", type: "number", required: true, min: 0 },
    { name: "target_date", label: "Tanggal Pelaksanaan", type: "date", required: true },
    { name: "status", label: "Status", type: "select", options: ["Belum", "Proses", "Selesai"], required: true }
  ],
  columns: [
    { key: "description", label: "Keterangan" },
    { key: "estimated_amount", label: "Perkiraan Dana", value: (row) => formatCurrency(row.estimated_amount), render: (row) => `<span class="amount investment">${formatCurrency(row.estimated_amount)}</span>` },
    { key: "target_date", label: "Tanggal Pelaksanaan" },
    { key: "status", label: "Status", render: (row) => `<span class="tag ${statusClass(row.status)}">${escapeHtml(row.status)}</span>` }
  ],
  searchKeys: ["description", "status", "target_date"],
  sortKeys: [
    { value: "latest", label: "Terbaru" },
    { value: "amountHigh", label: "Dana Tertinggi" },
    { value: "amountLow", label: "Dana Terendah" }
  ]
};

const statusClass = (status) => status === "Selesai" ? "success" : status === "Proses" ? "warning" : "";

export const normalizeWishlist = (row = {}) => ({
  id: row.id || uid(),
  description: row.description || "Wishlist RESBI",
  estimated_amount: assertNonNegativeNumber(row.estimated_amount ?? row.amount ?? 0, "Perkiraan Dana"),
  target_date: row.target_date || new Date().toISOString().slice(0, 10),
  status: row.status || "Belum",
  created_at: row.created_at || new Date().toISOString()
});

export const seedWishlist = () => {
  const names = [
    "Liburan Jepang",
    "Upgrade Laptop Resa",
    "Kamera Mirrorless",
    "Dana Lahiran",
    "Renovasi Dapur",
    "Kursus Bahasa",
    "Motor Listrik",
    "Sofa Ruang Tamu",
    "Kitchen Set",
    "Emas Batangan",
    "Staycation Anniversary",
    "Sepeda Lipat",
    "Meja Kerja",
    "Air Purifier",
    "Tiket Konser",
    "Tabungan Umroh",
    "Smart TV",
    "Kulkas Baru",
    "Asuransi Tambahan",
    "Dana Emergency Plus"
  ];
  return names.map((description, index) => normalizeWishlist({
    id: `wish-${String(index + 1).padStart(2, "0")}`,
    description,
    estimated_amount: 450000 + index * 375000,
    target_date: new Date(new Date().getFullYear(), index % 12, (index % 24) + 3).toISOString().slice(0, 10),
    status: index % 5 === 0 ? "Selesai" : index % 3 === 0 ? "Proses" : "Belum",
    created_at: new Date(Date.now() - index * 64000000).toISOString()
  }));
};
