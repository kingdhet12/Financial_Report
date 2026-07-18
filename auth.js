/* ==================================================
   RESBI Authentication
   ================================================== */
import { CONFIG } from "./config.js";
import { isConfigured, signIn, getSession } from "./supabase.js";
import { bindDarkMode, bindRipple, formToObject, qs, setButtonLoading, storage, toast } from "./utils.js";

const DEMO_SESSION_KEY = "resbi_demo_session";

export const hasDemoSession = () => storage.get(DEMO_SESSION_KEY, false) === true;

export const requireAuth = async () => {
  if (isConfigured()) {
    const session = await getSession();
    if (session) return true;
  } else if (hasDemoSession()) {
    return true;
  }
  window.location.href = "login.html";
  return false;
};

export const logout = async () => {
  if (isConfigured()) {
    const { signOut } = await import("./supabase.js");
    await signOut();
  }
  storage.remove(DEMO_SESSION_KEY);
  toast("Logout berhasil.");
  setTimeout(() => {
    window.location.href = "login.html";
  }, 400);
};

const mountLogin = async () => {
  bindRipple();
  bindDarkMode();
  const form = qs("#loginForm");
  const toggle = qs("#togglePassword");
  const password = form?.querySelector("input[name='password']");

  toggle?.addEventListener("click", () => {
    const show = password.type === "password";
    password.type = show ? "text" : "password";
    toggle.querySelector("i").className = show ? "fa-solid fa-eye-slash" : "fa-solid fa-eye";
  });

  if (isConfigured()) {
    try {
      const session = await getSession();
      if (session) window.location.href = "dashboard.html";
    } catch (error) {
      console.warn(error);
    }
  } else if (hasDemoSession()) {
    window.location.href = "dashboard.html";
  }

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const button = form.querySelector("button[type='submit']");
    const data = formToObject(form);

    setButtonLoading(button, true, "Login...");
    try {
      if (isConfigured()) {
        await signIn(data.email, data.password);
      } else {
        if (data.email !== CONFIG.DEMO_EMAIL || data.password !== CONFIG.DEMO_PASSWORD) {
          throw new Error("Supabase belum dikonfigurasi. Gunakan akun demo lokal dari README.");
        }
        storage.set(DEMO_SESSION_KEY, true);
      }
      toast("Login berhasil. Membuka dashboard.");
      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 450);
    } catch (error) {
      toast(error.message || "Login gagal.", "error");
    } finally {
      setButtonLoading(button, false);
    }
  });
};

if (document.body.dataset.page === "login") {
  mountLogin();
}
