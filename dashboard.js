/* ==================================================
   RESBI Dashboard App
   ================================================== */
import { CONFIG } from "./config.js";
import { requireAuth, logout } from "./auth.js";
import { deleteRow, insertRow, isConfigured, selectRows, updateRow } from "./supabase.js";
import {
  bindBackToTop,
  bindDarkMode,
  bindRipple,
  currentMonth,
  currentYear,
  debounce,
  escapeHtml,
  exportCSV,
  exportExcel,
  formToObject,
  formatCurrency,
  formatNumber,
  monthName,
  qs,
  qsa,
  rowsToCSV,
  setButtonLoading,
  setClock,
  skeletonCards,
  storage,
  toast,
  todayISO,
  uid,
  validateRequired
} from "./utils.js";
import {
  applyTransactionToBalances,
  filterTransactions,
  normalizeTransaction,
  transactionConfig,
  typeClass,
  seedTransactions
} from "./transaction.js";
import { fixedExpenseConfig, normalizeFixedExpense, seedFixedExpenses } from "./fixedExpense.js";
import { normalizeWishlist, seedWishlist, wishlistConfig } from "./wishlist.js";
import { normalizePaylater, paylaterConfig, remainingAmount, seedPaylater } from "./paylater.js";
import { balanceConfig, balanceSummary, normalizeBalance, seedBalances } from "./balance.js";
import { monthlySummary, renderOverviewCharts, renderReports } from "./report.js";

const modules = {
  transactions: transactionConfig,
  fixed_expenses: fixedExpenseConfig,
  wishlist: wishlistConfig,
  paylater: paylaterConfig,
  balances: balanceConfig
};

const normalizers = {
  transactions: normalizeTransaction,
  fixed_expenses: normalizeFixedExpense,
  wishlist: normalizeWishlist,
  paylater: normalizePaylater,
  balances: normalizeBalance
};

const seeders = {
  transactions: seedTransactions,
  fixed_expenses: seedFixedExpenses,
  wishlist: seedWishlist,
  paylater: seedPaylater,
  balances: seedBalances
};

const state = {
  transactions: [],
  fixed_expenses: [],
  wishlist: [],
  paylater: [],
  balances: [],
  ui: {},
  activeSection: "dashboard",
  activeCrudKey: "transactions",
  editing: null
};

const storageKey = (key) => `resbi_${key}`;

const baseUI = () => ({
  page: 1,
  search: "",
  sort: "latest",
  filters: {
    month: String(currentMonth()),
    year: String(currentYear()),
    category: "Semua Kategori",
    type: "Semua Jenis",
    source: "Semua Sumber"
  }
});

const initUI = () => {
  Object.keys(modules).forEach((key) => {
    state.ui[key] = baseUI();
  });
};

const loadEntity = async (key) => {
  const config = modules[key];
  const normalize = normalizers[key];
  if (isConfigured()) {
    try {
      const rows = await selectRows(config.table);
      return (rows || []).map(normalize);
    } catch (error) {
      console.error(error);
      toast(`Gagal memuat ${config.title}. Memakai data lokal.`, "warning");
    }
  }

  const local = storage.get(storageKey(key), null);
  if (Array.isArray(local)) return local.map(normalize);
  const seeded = seeders[key]();
  storage.set(storageKey(key), seeded);
  return seeded;
};

const loadAllData = async () => {
  qs("#overviewSkeleton").innerHTML = skeletonCards(8);
  await Promise.all(Object.keys(modules).map(async (key) => {
    state[key] = await loadEntity(key);
  }));
  qs("#overviewSkeleton").innerHTML = "";
};

const persistLocal = (key) => storage.set(storageKey(key), state[key]);

const persistBalances = async () => {
  if (isConfigured()) {
    await Promise.all(state.balances.map((row) => updateRow("balances", row.id, cleanPayload("balances", row))));
  } else {
    persistLocal("balances");
  }
};

const cleanPayload = (key, row) => {
  const allowed = modules[key].fields.map((field) => field.name);
  return allowed.reduce((payload, fieldName) => {
    payload[fieldName] = row[fieldName];
    return payload;
  }, {});
};

const applySort = (rows, sort) => {
  const amountKey = ["amount", "estimated_amount", "total_amount"].find((key) => rows.some((row) => row[key] !== undefined));
  const sorters = {
    latest: (a, b) => new Date(b.created_at || b.date || 0) - new Date(a.created_at || a.date || 0),
    oldest: (a, b) => new Date(a.created_at || a.date || 0) - new Date(b.created_at || b.date || 0),
    amountHigh: (a, b) => Number(b[amountKey] || 0) - Number(a[amountKey] || 0),
    amountLow: (a, b) => Number(a[amountKey] || 0) - Number(b[amountKey] || 0)
  };
  return rows.sort(sorters[sort] || sorters.latest);
};

const getVisibleRows = (key) => {
  const config = modules[key];
  const ui = state.ui[key];
  if (key === "transactions") {
    return filterTransactions(state.transactions, ui.search, ui.filters, ui.sort);
  }
  const term = ui.search.trim().toLowerCase();
  const rows = state[key].filter((row) => !term || config.searchKeys.some((field) => String(row[field] ?? "").toLowerCase().includes(term)));
  return applySort(rows, ui.sort);
};

const renderDashboard = () => {
  const summary = monthlySummary(state.transactions, state.fixed_expenses, state.wishlist, state.paylater, state.balances);
  const bSummary = balanceSummary(state.balances);
  const cards = [
    ["Total Pemasukan Bulan Ini", summary.income, "fa-arrow-trend-up", "success"],
    ["Total Pengeluaran Bulan Ini", summary.expense, "fa-arrow-trend-down", "danger"],
    ["Total Investasi", summary.investment, "fa-seedling", ""],
    ["Saldo Saat Ini", summary.balanceTotal, "fa-wallet", "success"],
    ["Total Wishlist", summary.wishlistTotal, "fa-heart", "warning"],
    ["Total Cicilan Aktif", `${formatNumber(summary.activePaylater)} item`, "fa-credit-card", "danger"],
    ["Total Pengeluaran Tetap", summary.fixedTotal, "fa-calendar-check", "warning"],
    ["Sisa Saldo Bulan Ini", summary.remaining, "fa-scale-balanced", summary.remaining >= 0 ? "success" : "danger"]
  ];

  qs("#pageTitle").textContent = "Halo Bebi ❤ Resa";
  qs("#statsGrid").innerHTML = cards.map(([label, value, icon, tone]) => `
    <article class="stat-card ${tone}">
      <i class="fa-solid ${icon}"></i>
      <span>${escapeHtml(label)}</span>
      <strong data-counter="${typeof value === "number" ? value : ""}">${typeof value === "number" ? formatCurrency(value) : escapeHtml(value)}</strong>
    </article>
  `).join("");

  qs("#recentTransactions").innerHTML = state.transactions
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 8)
    .map((row) => `
      <tr>
        <td>${escapeHtml(row.date)}</td>
        <td>${escapeHtml(row.description)}</td>
        <td>${escapeHtml(row.source)}</td>
        <td><span class="tag ${typeClass(row.type)}">${escapeHtml(row.type)}</span></td>
        <td><span class="amount ${typeClass(row.type)}">${formatCurrency(row.amount)}</span></td>
      </tr>
    `).join("");

  renderOverviewCharts(state.transactions);
  animateCounters();
};

const renderEntitySection = (key) => {
  const config = modules[key];
  const sectionId = key === "fixed_expenses" ? "fixed" : key === "balances" ? "balances" : key;
  const section = qs(`#section-${sectionId}`);
  if (!section) return;

  const ui = state.ui[key];
  const rows = getVisibleRows(key);
  const pageCount = Math.max(1, Math.ceil(rows.length / CONFIG.PAGE_SIZE));
  ui.page = Math.min(ui.page, pageCount);
  const start = (ui.page - 1) * CONFIG.PAGE_SIZE;
  const pageRows = rows.slice(start, start + CONFIG.PAGE_SIZE);

  section.innerHTML = `
    <div class="panel glass">
      <div class="panel-toolbar">
        <div>
          <span class="eyebrow">${escapeHtml(config.title)}</span>
          <h2>${escapeHtml(config.title)} RESBI</h2>
        </div>
        <div class="toolbar-controls">
          <input type="search" value="${escapeHtml(ui.search)}" placeholder="Cari data..." data-search="${key}">
          ${renderFilters(key)}
          <select data-sort="${key}">
            ${config.sortKeys.map((item) => `<option value="${item.value}" ${ui.sort === item.value ? "selected" : ""}>${item.label}</option>`).join("")}
          </select>
          ${key === "fixed_expenses" ? '<button class="btn success" data-generate-fixed><i class="fa-solid fa-bolt"></i> Generate Bulan Ini</button>' : ""}
          <button class="btn ghost" data-export-csv="${key}"><i class="fa-solid fa-file-csv"></i> CSV</button>
          <button class="btn ghost" data-export-excel="${key}"><i class="fa-solid fa-file-excel"></i> Excel</button>
          <button class="btn ghost" data-print-page><i class="fa-solid fa-print"></i> PDF</button>
          <button class="btn primary" data-add="${key}"><i class="fa-solid fa-plus"></i> Tambah</button>
        </div>
      </div>
      ${renderTable(key, pageRows, rows.length)}
      ${renderPagination(key, pageCount)}
    </div>
  `;
};

const renderFilters = (key) => {
  const config = modules[key];
  const ui = state.ui[key];
  if (!config.filters) return "";
  return config.filters.map((filter) => {
    if (filter.type === "month") {
      return `<select data-filter="${key}:month">${Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}" ${Number(ui.filters.month) === i + 1 ? "selected" : ""}>${monthName(i + 1)}</option>`).join("")}</select>`;
    }
    if (filter.type === "year") {
      const years = [currentYear() - 1, currentYear(), currentYear() + 1];
      return `<select data-filter="${key}:year">${years.map((year) => `<option value="${year}" ${Number(ui.filters.year) === year ? "selected" : ""}>${year}</option>`).join("")}</select>`;
    }
    return `<select data-filter="${key}:${filter.name}">${filter.options.map((option) => `<option value="${escapeHtml(option)}" ${ui.filters[filter.name] === option ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}</select>`;
  }).join("");
};

const renderTable = (key, rows, totalRows) => {
  const config = modules[key];
  if (!totalRows) {
    return `
      <div class="empty-state">
        <i class="fa-solid fa-folder-open"></i>
        <h3>Data kosong</h3>
        <p>Belum ada data untuk ditampilkan.</p>
      </div>
    `;
  }
  return `
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            ${config.columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("")}
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((row) => `
            <tr>
              ${config.columns.map((column) => `<td>${renderCell(column, row)}</td>`).join("")}
              <td>
                <div class="row-actions">
                  <button class="icon-btn" data-edit="${key}:${row.id}" type="button" aria-label="Edit"><i class="fa-solid fa-pen"></i></button>
                  <button class="icon-btn" data-delete="${key}:${row.id}" type="button" aria-label="Delete"><i class="fa-solid fa-trash"></i></button>
                </div>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
};

const renderCell = (column, row) => {
  if (column.render) return column.render(row);
  const value = column.value ? column.value(row) : row[column.key];
  return escapeHtml(value ?? "");
};

const renderPagination = (key, pageCount) => {
  const page = state.ui[key].page;
  return `
    <div class="pagination">
      ${Array.from({ length: pageCount }).map((_, index) => {
        const number = index + 1;
        return `<button class="icon-btn ${number === page ? "active" : ""}" data-page-number="${key}:${number}" type="button">${number}</button>`;
      }).join("")}
    </div>
  `;
};

const renderSettings = () => {
  qs("#section-settings").innerHTML = `
    <div class="panel-toolbar">
      <div><span class="eyebrow">Pengaturan</span><h2>RESBI Control Center</h2></div>
    </div>
    <div class="settings-grid">
      <article class="panel glass">
        <div class="section-head compact"><div><span class="eyebrow">Backend</span><h2>Supabase</h2></div></div>
        <div class="print-summary">
          <div class="summary-row"><span>Status</span><strong>${isConfigured() ? "Aktif" : "Demo Lokal"}</strong></div>
          <div class="summary-row"><span>Project URL</span><strong>${CONFIG.SUPABASE_URL ? "Terisi" : "Kosong"}</strong></div>
          <div class="summary-row"><span>Storage Bucket</span><strong>${escapeHtml(CONFIG.SUPABASE_STORAGE_BUCKET)}</strong></div>
        </div>
      </article>
      <article class="panel glass">
        <div class="section-head compact"><div><span class="eyebrow">Backup</span><h2>Data Lokal</h2></div></div>
        <div class="toolbar-controls" style="justify-content:flex-start">
          <button class="btn primary" data-backup-json><i class="fa-solid fa-download"></i> Backup JSON</button>
          <label class="btn ghost">
            <i class="fa-solid fa-upload"></i> Restore JSON
            <input type="file" accept="application/json" data-restore-json hidden>
          </label>
          <button class="btn danger" data-reset-local><i class="fa-solid fa-rotate-left"></i> Reset Demo</button>
        </div>
      </article>
    </div>
  `;
};

const renderAll = () => {
  renderDashboard();
  Object.keys(modules).forEach(renderEntitySection);
  renderSettings();
  if (state.activeSection === "reports") renderReports(state);
};

const setSection = (section) => {
  state.activeSection = section;
  qsa(".side-nav button").forEach((button) => button.classList.toggle("active", button.dataset.sectionLink === section));
  qsa(".page-section").forEach((node) => node.classList.remove("active"));
  qs(`#section-${section}`)?.classList.add("active");
  const titles = {
    dashboard: "Halo Bebi ❤ Resa",
    transactions: "Transaksi",
    fixed: "Pengeluaran Tetap",
    wishlist: "Wishlist",
    paylater: "PayLater",
    balances: "Saldo",
    reports: "Laporan",
    settings: "Pengaturan"
  };
  qs("#pageTitle").textContent = titles[section] || "RESBI";
  if (section === "reports") renderReports(state);
  if (["transactions", "fixed", "wishlist", "paylater", "balances"].includes(section)) {
    state.activeCrudKey = section === "fixed" ? "fixed_expenses" : section;
  }
  document.body.classList.remove("sidebar-open");
};

const openCrud = (key, row = null) => {
  const config = modules[key];
  state.activeCrudKey = key;
  state.editing = row;
  const modal = qs("#crudModal");
  const form = qs("#crudForm");
  qs("#modalEyebrow").textContent = config.title;
  qs("#modalTitle").textContent = row ? `Edit ${config.title}` : `Tambah ${config.title}`;
  form.innerHTML = `
    <input type="hidden" name="id" value="${escapeHtml(row?.id || "")}">
    ${config.fields.map((field) => renderField(field, row)).join("")}
    <button class="btn primary span-2" type="submit"><i class="fa-solid fa-floppy-disk"></i> Simpan</button>
  `;
  modal.classList.add("active");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
};

const renderField = (field, row) => {
  const value = row?.[field.name] ?? (field.type === "date" ? todayISO() : field.type === "select" ? field.options[0] : "");
  if (field.type === "select") {
    return `
      <label>
        <span>${escapeHtml(field.label)}</span>
        <select name="${field.name}" ${field.required ? "required" : ""}>
          ${field.options.map((option) => `<option value="${escapeHtml(option)}" ${String(value) === String(option) ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}
        </select>
      </label>
    `;
  }
  return `
    <label class="${field.name === "description" ? "span-2" : ""}">
      <span>${escapeHtml(field.label)}</span>
      <input type="${field.type || "text"}" name="${field.name}" value="${escapeHtml(value)}" ${field.required ? "required" : ""} ${field.min !== undefined ? `min="${field.min}"` : ""} ${field.max !== undefined ? `max="${field.max}"` : ""}>
    </label>
  `;
};

const closeCrud = () => {
  qs("#crudModal").classList.remove("active");
  qs("#crudModal").setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  state.editing = null;
};

const saveCrud = async (form) => {
  const key = state.activeCrudKey;
  const config = modules[key];
  const normalize = normalizers[key];
  const payload = formToObject(form);
  validateRequired(payload, config.fields);
  const id = payload.id || uid();
  const previous = state[key].find((row) => String(row.id) === String(id));
  const row = normalize({ ...previous, ...payload, id, created_at: previous?.created_at || new Date().toISOString() });

  if (key === "transactions" && previous) {
    state.balances = applyTransactionToBalances(state.balances, previous, -1);
  }

  if (previous) {
    if (isConfigured()) await updateRow(config.table, id, cleanPayload(key, row));
    state[key] = state[key].map((item) => String(item.id) === String(id) ? row : item);
  } else {
    if (isConfigured()) {
      const created = await insertRow(config.table, cleanPayload(key, row));
      row.id = created.id;
      row.created_at = created.created_at || row.created_at;
    }
    state[key].unshift(row);
  }

  if (key === "transactions") {
    state.balances = applyTransactionToBalances(state.balances, row, 1);
    await persistBalances();
  }

  if (!isConfigured()) persistLocal(key);
  toast(`${config.title} berhasil disimpan.`);
  closeCrud();
  renderAll();
};

const deleteItem = async (key, id) => {
  const config = modules[key];
  const row = state[key].find((item) => String(item.id) === String(id));
  if (!row || !window.confirm(`Hapus data ${config.title}?`)) return;

  if (key === "transactions") {
    state.balances = applyTransactionToBalances(state.balances, row, -1);
    await persistBalances();
  }

  if (isConfigured()) await deleteRow(config.table, id);
  state[key] = state[key].filter((item) => String(item.id) !== String(id));
  if (!isConfigured()) persistLocal(key);
  toast(`${config.title} berhasil dihapus.`, "warning");
  renderAll();
};

const generateFixedThisMonth = async () => {
  const active = state.fixed_expenses.filter((row) => row.status === "Aktif");
  const generated = [];
  for (const expense of active) {
    const date = new Date(currentYear(), currentMonth() - 1, Math.min(28, Number(expense.due_date || 1))).toISOString().slice(0, 10);
    const description = `Fixed: ${expense.name}`;
    const exists = state.transactions.some((row) => row.date === date && row.description === description);
    if (exists) continue;
    const transaction = normalizeTransaction({
      id: uid(),
      date,
      description,
      source: "BCA",
      amount: expense.amount,
      type: "Pengeluaran",
      category: expense.category,
      recipient: "Berdua"
    });
    if (isConfigured()) {
      const created = await insertRow("transactions", cleanPayload("transactions", transaction));
      transaction.id = created.id;
      transaction.created_at = created.created_at || transaction.created_at;
    }
    state.transactions.unshift(transaction);
    state.balances = applyTransactionToBalances(state.balances, transaction, 1);
    generated.push(transaction);
  }
  if (!isConfigured()) persistLocal("transactions");
  await persistBalances();
  toast(`${generated.length} pengeluaran tetap digenerate.`, generated.length ? "success" : "warning");
  renderAll();
};

const exportRows = (key, format) => {
  const config = modules[key];
  const rows = getVisibleRows(key);
  const columns = config.columns.map((column) => ({
    key: column.key,
    label: column.label,
    value: column.value || ((row) => row[column.key])
  }));
  const filename = `resbi-${key}-${todayISO()}.${format === "excel" ? "xls" : "csv"}`;
  if (format === "excel") exportExcel(filename, rows, columns);
  else exportCSV(filename, rows, columns);
  toast(`Export ${config.title} berhasil.`);
};

const backupJSON = () => {
  const payload = Object.keys(modules).reduce((backup, key) => {
    backup[key] = state[key];
    return backup;
  }, { exported_at: new Date().toISOString(), app: CONFIG.APP_NAME });
  const content = JSON.stringify(payload, null, 2);
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `resbi-backup-${todayISO()}.json`;
  link.click();
  URL.revokeObjectURL(url);
};

const restoreJSON = async (file) => {
  const text = await file.text();
  const payload = JSON.parse(text);
  Object.keys(modules).forEach((key) => {
    if (Array.isArray(payload[key])) {
      state[key] = payload[key].map(normalizers[key]);
      storage.set(storageKey(key), state[key]);
    }
  });
  toast("Restore data lokal berhasil.");
  renderAll();
};

const resetLocal = async () => {
  if (!window.confirm("Reset semua data demo lokal?")) return;
  Object.keys(modules).forEach((key) => storage.remove(storageKey(key)));
  await loadAllData();
  toast("Data demo lokal direset.");
  renderAll();
};

const animateCounters = () => {
  qsa("[data-counter]").forEach((node) => {
    const target = Number(node.dataset.counter);
    if (!Number.isFinite(target)) return;
    const start = performance.now();
    const duration = 650;
    const step = (time) => {
      const progress = Math.min(1, (time - start) / duration);
      node.textContent = formatCurrency(target * progress);
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
};

const bindEvents = () => {
  qsa("[data-section-link]").forEach((button) => {
    button.addEventListener("click", () => setSection(button.dataset.sectionLink));
  });
  qs("#mobileMenuBtn")?.addEventListener("click", () => document.body.classList.toggle("sidebar-open"));
  qs("#logoutBtn")?.addEventListener("click", logout);
  qs("#globalFab")?.addEventListener("click", () => {
    const key = modules[state.activeCrudKey] ? state.activeCrudKey : "transactions";
    openCrud(key);
  });
  qsa("[data-close-modal]").forEach((node) => node.addEventListener("click", closeCrud));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeCrud();
  });

  qs("#crudForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    const button = event.currentTarget.querySelector("button[type='submit']");
    setButtonLoading(button, true, "Menyimpan...");
    try {
      await saveCrud(event.currentTarget);
    } catch (error) {
      console.error(error);
      toast(error.message || "Gagal menyimpan data.", "error");
    } finally {
      setButtonLoading(button, false);
    }
  });

  document.addEventListener("input", debounce((event) => {
    const key = event.target.dataset.search;
    if (!key) return;
    state.ui[key].search = event.target.value;
    state.ui[key].page = 1;
    renderEntitySection(key);
  }, 180));

  document.addEventListener("change", async (event) => {
    if (event.target.dataset.sort) {
      const key = event.target.dataset.sort;
      state.ui[key].sort = event.target.value;
      renderEntitySection(key);
    }
    if (event.target.dataset.filter) {
      const [key, name] = event.target.dataset.filter.split(":");
      state.ui[key].filters[name] = event.target.value;
      state.ui[key].page = 1;
      renderEntitySection(key);
    }
    if (event.target.dataset.restoreJson && event.target.files?.[0]) {
      await restoreJSON(event.target.files[0]);
      event.target.value = "";
    }
  });

  document.addEventListener("click", async (event) => {
    const add = event.target.closest("[data-add]");
    const edit = event.target.closest("[data-edit]");
    const del = event.target.closest("[data-delete]");
    const page = event.target.closest("[data-page-number]");
    const csv = event.target.closest("[data-export-csv]");
    const excel = event.target.closest("[data-export-excel]");
    if (add) openCrud(add.dataset.add);
    if (edit) {
      const [key, id] = edit.dataset.edit.split(":");
      openCrud(key, state[key].find((row) => String(row.id) === id));
    }
    if (del) {
      const [key, id] = del.dataset.delete.split(":");
      await deleteItem(key, id);
    }
    if (page) {
      const [key, number] = page.dataset.pageNumber.split(":");
      state.ui[key].page = Number(number);
      renderEntitySection(key);
    }
    if (csv) exportRows(csv.dataset.exportCsv, "csv");
    if (excel) exportRows(excel.dataset.exportExcel, "excel");
    if (event.target.closest("[data-print-page]")) window.print();
    if (event.target.closest("[data-generate-fixed]")) await generateFixedThisMonth();
    if (event.target.closest("[data-backup-json]")) backupJSON();
    if (event.target.closest("[data-reset-local]")) await resetLocal();
  });
};

const boot = async () => {
  const allowed = await requireAuth();
  if (!allowed) return;
  initUI();
  bindRipple();
  bindDarkMode();
  bindBackToTop();
  setClock();
  bindEvents();
  await loadAllData();
  renderAll();
  setSection("dashboard");
};

boot().catch((error) => {
  console.error(error);
  toast(error.message || "Gagal membuka dashboard.", "error");
});
