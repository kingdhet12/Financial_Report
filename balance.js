/* ==================================================
   Balance Module
   ================================================== */
import { assertNonNegativeNumber, escapeHtml, formatCurrency, uid } from "./utils.js";

export const OWNERS = ["Bebi", "Resa"];
export const ACCOUNTS = ["BCA", "ShopeePay", "Blu BCA", "BTN", "DANA", "GoPay", "SeaBank", "Cash"];

export const balanceConfig = {
  key: "balances",
  table: "balances",
  title: "Saldo",
  icon: "fa-wallet",
  fields: [
    { name: "owner", label: "Pemilik", type: "select", options: OWNERS, required: true },
    { name: "account", label: "Rekening / Wallet", type: "select", options: ACCOUNTS, required: true },
    { name: "amount", label: "Saldo", type: "number", required: true, min: 0 }
  ],
  columns: [
    { key: "owner", label: "Pemilik", render: (row) => `<span class="tag ${row.owner === "Bebi" ? "income" : "investment"}">${escapeHtml(row.owner)}</span>` },
    { key: "account", label: "Rekening / Wallet" },
    { key: "amount", label: "Saldo", value: (row) => formatCurrency(row.amount), render: (row) => `<span class="amount income">${formatCurrency(row.amount)}</span>` }
  ],
  searchKeys: ["owner", "account"],
  sortKeys: [
    { value: "latest", label: "Terbaru" },
    { value: "amountHigh", label: "Saldo Tertinggi" },
    { value: "amountLow", label: "Saldo Terendah" }
  ]
};

export const normalizeBalance = (row = {}) => ({
  id: row.id || uid(),
  owner: row.owner || "Bebi",
  account: row.account || "BCA",
  amount: assertNonNegativeNumber(row.amount ?? 0, "Saldo"),
  created_at: row.created_at || new Date().toISOString()
});

export const seedBalances = () => {
  const values = {
    Bebi: [8500000, 450000, 6200000, 12500000, 320000, 280000, 3800000, 1750000],
    Resa: [9200000, 350000, 5800000, 10300000, 410000, 225000, 4200000, 2100000]
  };
  const rows = [];
  OWNERS.forEach((owner) => {
    ACCOUNTS.forEach((account, index) => {
      rows.push(normalizeBalance({
        id: `bal-${owner.toLowerCase()}-${index + 1}`,
        owner,
        account,
        amount: values[owner][index],
        created_at: new Date(Date.now() - index * 84000000).toISOString()
      }));
    });
  });
  return rows;
};

export const balanceSummary = (rows) => {
  const bebi = rows.filter((row) => row.owner === "Bebi").reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const resa = rows.filter((row) => row.owner === "Resa").reduce((sum, row) => sum + Number(row.amount || 0), 0);
  return {
    bebi,
    resa,
    combined: bebi + resa
  };
};
