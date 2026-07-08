import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, IS_CONFIGURED } from './config.js';

export const FRD_SESSION_KEY = 'frd_fun_rc_drift_session_v1';

export const supabase = IS_CONFIGURED
  ? createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: FRD_SESSION_KEY,
        flowType: 'pkce'
      }
    })
  : null;

export function saveFrdSession(session) {
  if (!session?.access_token || !session?.refresh_token) return;
  try {
    localStorage.setItem(FRD_SESSION_KEY, JSON.stringify({
      access_token: session.access_token,
      refresh_token: session.refresh_token
    }));
  } catch (_) {}
}

export function clearFrdSession() {
  try {
    localStorage.removeItem(FRD_SESSION_KEY);
  } catch (_) {}
}

export async function restoreFrdSession() {
  if (!supabase) return null;
  let { data: { session } } = await supabase.auth.getSession();
  if (session) {
    saveFrdSession(session);
    return session;
  }

  try {
    const saved = JSON.parse(localStorage.getItem(FRD_SESSION_KEY) || 'null');
    if (!saved?.access_token || !saved?.refresh_token) return null;
    const { data, error } = await supabase.auth.setSession(saved);
    if (error) throw error;
    if (data.session) saveFrdSession(data.session);
    return data.session || null;
  } catch (_) {
    clearFrdSession();
    return null;
  }
}
