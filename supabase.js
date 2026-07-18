/* ==================================================
   RESBI Supabase Wrapper
   ================================================== */
import { CONFIG } from "./config.js";

let clientCache = null;

export const isConfigured = () => Boolean(
  CONFIG.SUPABASE_URL &&
  CONFIG.SUPABASE_ANON_KEY &&
  window.supabase?.createClient
);

export const client = () => {
  if (!isConfigured()) return null;
  if (!clientCache) {
    clientCache = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    });
  }
  return clientCache;
};

const handle = ({ data, error }) => {
  if (error) throw error;
  return data;
};

export const signIn = async (email, password) => {
  if (!client()) throw new Error("Supabase belum dikonfigurasi.");
  return handle(await client().auth.signInWithPassword({ email, password }));
};

export const signOut = async () => {
  if (!client()) return;
  return handle(await client().auth.signOut());
};

export const getSession = async () => {
  if (!client()) return null;
  const { data, error } = await client().auth.getSession();
  if (error) throw error;
  return data.session;
};

export const selectRows = async (table) => {
  if (!client()) return null;
  return handle(await client().from(table).select("*").order("created_at", { ascending: false }));
};

export const insertRow = async (table, payload) => {
  if (!client()) return null;
  return handle(await client().from(table).insert(payload).select().single());
};

export const updateRow = async (table, id, payload) => {
  if (!client()) return null;
  return handle(await client().from(table).update(payload).eq("id", id).select().single());
};

export const deleteRow = async (table, id) => {
  if (!client()) return null;
  return handle(await client().from(table).delete().eq("id", id));
};

export const uploadFile = async (file, folder = "attachments") => {
  if (!file || !client()) return "";
  const safeName = `${Date.now()}-${file.name}`.replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = `${folder}/${safeName}`;
  const { error } = await client().storage.from(CONFIG.SUPABASE_STORAGE_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false
  });
  if (error) throw error;
  const { data } = client().storage.from(CONFIG.SUPABASE_STORAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
};
