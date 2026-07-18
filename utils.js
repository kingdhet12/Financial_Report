/* ==================================================
   RESBI Utilities
   ================================================== */
import { CONFIG } from "./config.js";

export const qs = (selector, scope = document) => scope.querySelector(selector);
export const qsa = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

export const escapeHtml = (value = "") => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

export const toNumber = (value, fallback = 0) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  const cleaned = String(value ?? "")
    .replace(/[^\d,-]/g, "")
    .replaceAll(".", "")
    .replace(",", ".");
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : fallback;
};

export const formatCurrency = (value) => new Intl.NumberFormat(CONFIG.CURRENCY_LOCALE, {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0
}).format(toNumber(value));

export const formatNumber = (value) => new Intl.NumberFormat(CONFIG.CURRENCY_LOCALE).format(toNumber(value));

export const uid = () => {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const currentMonth = () => new Date().getMonth() + 1;
export const currentYear = () => new Date().getFullYear();

export const storage = {
  get(key, fallback = null) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      console.warn("Storage read failed", error);
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn("Storage write failed", error);
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn("Storage remove failed", error);
    }
  }
};

export const toast = (message, type = "success") => {
  const stack = qs("#toastStack");
  if (!stack) return;
  const icon = type === "error"
    ? "fa-circle-xmark"
    : type === "warning"
      ? "fa-triangle-exclamation"
      : "fa-circle-check";
  const node = document.createElement("div");
  node.className = `toast ${type}`;
  node.innerHTML = `<i class="fa-solid ${icon}"></i><span>${escapeHtml(message)}</span>`;
  stack.appendChild(node);
  setTimeout(() => {
    node.style.opacity = "0";
    node.style.transform = "translateY(8px)";
    setTimeout(() => node.remove(), 220);
  }, 3200);
};

export const debounce = (fn, delay = 220) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
};

export const formToObject = (form) => {
  const data = new FormData(form);
  const object = {};
  data.forEach((value, key) => {
    object[key] = value;
  });
  qsa("input[type='checkbox']", form).forEach((input) => {
    object[input.name] = input.checked;
  });
  return object;
};

export const setButtonLoading = (button, loading, label = "Memproses...") => {
  if (!button) return;
  if (loading) {
    button.dataset.originalHtml = button.innerHTML;
    button.disabled = true;
    button.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${escapeHtml(label)}`;
  } else {
    button.disabled = false;
    if (button.dataset.originalHtml) button.innerHTML = button.dataset.originalHtml;
  }
};

export const bindRipple = () => {
  document.addEventListener("click", (event) => {
    const button = event.target.closest(".btn");
    if (!button || button.disabled) return;
    const rect = button.getBoundingClientRect();
    const ripple = document.createElement("span");
    ripple.className = "ripple";
    ripple.style.left = `${event.clientX - rect.left}px`;
    ripple.style.top = `${event.clientY - rect.top}px`;
    button.appendChild(ripple);
    setTimeout(() => ripple.remove(), 560);
  });
};

export const bindDarkMode = () => {
  const enabled = storage.get("resbi_dark_mode", false);
  document.body.classList.toggle("dark", Boolean(enabled));
  const syncIcon = () => qsa("#darkModeToggle i").forEach((icon) => {
    icon.className = document.body.classList.contains("dark") ? "fa-solid fa-sun" : "fa-solid fa-moon";
  });
  syncIcon();
  qsa("#darkModeToggle").forEach((button) => {
    button.addEventListener("click", () => {
      document.body.classList.toggle("dark");
      storage.set("resbi_dark_mode", document.body.classList.contains("dark"));
      syncIcon();
    });
  });
};

export const bindBackToTop = () => {
  const button = qs("#backToTop");
  if (!button) return;
  const sync = () => button.classList.toggle("visible", window.scrollY > 420);
  window.addEventListener("scroll", sync, { passive: true });
  button.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  sync();
};

export const setClock = () => {
  const clock = qs("#realTimeClock");
  const date = qs("#todayDate");
  if (!clock || !date) return;
  const tick = () => {
    const now = new Date();
    clock.textContent = now.toLocaleTimeString("id-ID", { hour12: false });
    date.textContent = now.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric"
    });
  };
  tick();
  setInterval(tick, 1000);
};

export const monthName = (month) => new Date(currentYear(), month - 1, 1).toLocaleDateString("id-ID", { month: "long" });

export const sameMonthYear = (dateValue, month = currentMonth(), year = currentYear()) => {
  const date = new Date(dateValue);
  return date.getMonth() + 1 === Number(month) && date.getFullYear() === Number(year);
};

export const downloadBlob = (filename, content, type = "text/csv;charset=utf-8") => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export const rowsToCSV = (rows, columns) => {
  const header = columns.map((column) => `"${column.label}"`).join(",");
  const body = rows.map((row) => columns.map((column) => {
    const raw = typeof column.value === "function" ? column.value(row) : row[column.key];
    return `"${String(raw ?? "").replaceAll('"', '""')}"`;
  }).join(",")).join("\n");
  return `${header}\n${body}`;
};

export const exportCSV = (filename, rows, columns) => downloadBlob(filename, rowsToCSV(rows, columns));

export const exportExcel = (filename, rows, columns) => {
  const table = `
    <table>
      <thead><tr>${columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("")}</tr></thead>
      <tbody>${rows.map((row) => `<tr>${columns.map((column) => {
        const raw = typeof column.value === "function" ? column.value(row) : row[column.key];
        return `<td>${escapeHtml(raw ?? "")}</td>`;
      }).join("")}</tr>`).join("")}</tbody>
    </table>`;
  downloadBlob(filename, table, "application/vnd.ms-excel;charset=utf-8");
};

export const skeletonCards = (count = 8) => Array.from({ length: count })
  .map(() => '<div class="skeleton-card"></div>')
  .join("");

export const validateRequired = (payload, fields) => {
  const missing = fields.find((field) => field.required && String(payload[field.name] ?? "").trim() === "");
  if (missing) throw new Error(`${missing.label} wajib diisi.`);
};

export const assertNonNegativeNumber = (value, label) => {
  const number = toNumber(value, -1);
  if (number < 0) throw new Error(`${label} harus berupa angka dan tidak boleh negatif.`);
  return number;
};
