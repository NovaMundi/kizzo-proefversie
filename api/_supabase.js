// Serverkant-databasekoppeling (Supabase). Gebruikt de service_role-sleutel en
// gaat langs Row Level Security heen; alle eigenaarschapschecks doen we zelf in
// de code. Zonder sleutels faalt hij netjes (status 503), zodat de app blijft
// werken in de oude, opslagloze modus.
import { createClient } from "@supabase/supabase-js";

let _sb = null;
export function serverClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    const e = new Error("Supabase niet geconfigureerd");
    e.status = 503;
    throw e;
  }
  if (!_sb) {
    _sb = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _sb;
}

// Verifieert het JWT van de ingelogde ouder en geeft de gebruiker terug (of null).
export async function userFromToken(token) {
  if (!token) return null;
  try {
    const sb = serverClient();
    const { data, error } = await sb.auth.getUser(token);
    if (error || !data || !data.user) return null;
    return data.user;
  } catch (e) {
    return null;
  }
}
