import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wjpkvdkmkoojjmnjdtnk.supabase.co';
const supabaseAnonKey = 'sb_publishable_9tyk3EMUSLUy3VkK9yypaQ_NWRYPmUl';

export const CLIENT_TOKEN_KEY = 'redoma_client_token';
const CLIENT_JWT_KEY = 'redoma_client_jwt';

const getClientToken = () => {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(CLIENT_TOKEN_KEY) ?? '';
};

const getClientJwt = () => {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(CLIENT_JWT_KEY) ?? '';
};

const withClientJwtFetch: typeof fetch = async (input, init) => {
  const headers = new Headers(init?.headers || {});
  const jwt = getClientJwt();

  headers.set('apikey', supabaseAnonKey);

  if (jwt) headers.set('Authorization', `Bearer ${jwt}`);

  return fetch(input, { ...init, headers });
};

export const supabasePublic = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
  global: {
    fetch: withClientJwtFetch,
  },
});

/**
 * Emite/reusa JWT do cliente via Edge Function
 * e aplica no HTTP + Realtime.
 */
export const ensureClientJwt = async () => {
  if (typeof window === 'undefined') return '';

  const existing = localStorage.getItem(CLIENT_JWT_KEY);
  if (existing) {
    // Realtime também precisa
    supabasePublic.realtime.setAuth(existing);
    return existing;
  }

  const client_token = getClientToken();
  if (!client_token) throw new Error('missing client_token');

  const res = await fetch(`${supabaseUrl}/functions/v1/issue-client-jwt`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseAnonKey,
    },
    body: JSON.stringify({ client_token }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'issue-client-jwt failed');

  const jwt = data.token as string;
  localStorage.setItem(CLIENT_JWT_KEY, jwt);

  // aplica no Realtime
  supabasePublic.realtime.setAuth(jwt);

  // força reconectar (para garantir que o socket atual use o jwt)
  try { supabasePublic.realtime.disconnect(); } catch {}
  try { supabasePublic.realtime.connect(); } catch {}

  return jwt;
};

export const supabaseSupport = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storageKey: 'redoma_support_auth',
  },
});

export const supabaseMaster = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storageKey: 'redoma_master_auth',
  },
});
