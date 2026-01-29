import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = 'https://wjpkvdkmkoojjmnjdtnk.supabase.co';
export const supabaseAnonKey = 'sb_publishable_9tyk3EMUSLUy3VkK9yypaQ_NWRYPmUl';

export const CLIENT_TOKEN_KEY = 'redoma_client_token';
const CLIENT_JWT_KEY = 'redoma_client_jwt';

const isBrowser = () => typeof window !== 'undefined';

export const getOrCreateClientToken = () => {
  if (!isBrowser()) return '';
  const existing = localStorage.getItem(CLIENT_TOKEN_KEY);
  if (existing) return existing;

  const token =
    (typeof crypto !== 'undefined' && crypto.randomUUID?.()) ??
    Math.random().toString(36).slice(2) + Date.now().toString(36);

  localStorage.setItem(CLIENT_TOKEN_KEY, token);
  return token;
};

const getClientJwt = () => (isBrowser() ? localStorage.getItem(CLIENT_JWT_KEY) : null);

const setClientJwt = (jwt: string) => {
  if (!isBrowser()) return;
  localStorage.setItem(CLIENT_JWT_KEY, jwt);
};

// Decodifica payload do JWT (sem validar assinatura) só pra checar exp
const decodeJwtPayload = (jwt: string) => {
  try {
    const [, payload] = jwt.split('.');
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json) as { exp?: number; [k: string]: any };
  } catch {
    return null;
  }
};

const jwtIsValidEnough = (jwt: string) => {
  const p = decodeJwtPayload(jwt);
  if (!p?.exp) return true; // se não tiver exp, assume ok
  const now = Math.floor(Date.now() / 1000);
  // renova se faltar < 2 minutos
  return p.exp - now > 120;
};

/**
 * Busca um JWT (Edge Function) e salva localmente.
 * IMPORTANTE: Essa Edge Function usa CLIENT_JWT_SECRET.
 */
export const ensureClientJwt = async (): Promise<string> => {
  const token = getOrCreateClientToken();

  const existing = getClientJwt();
  if (existing && jwtIsValidEnough(existing)) return existing;

  const res = await fetch(`${supabaseUrl}/functions/v1/issue-client-jwt`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      apikey: supabaseAnonKey,
      // Supabase Edge Functions aceitam Bearer do anon key pra acesso público
      authorization: `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify({ client_token: token }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`issue-client-jwt failed: ${res.status} ${txt}`);
  }

  const data = (await res.json()) as { token: string };
  if (!data?.token) throw new Error('issue-client-jwt: missing token');

  setClientJwt(data.token);
  return data.token;
};

/**
 * Fetch wrapper:
 * injeta Authorization: Bearer <CLIENT_JWT> em toda request HTTP
 */
const withClientJwtFetch: typeof fetch = async (input, init) => {
  const headers = new Headers(init?.headers || {});
  const jwt = getClientJwt();
  if (jwt) headers.set('authorization', `Bearer ${jwt}`);
  return fetch(input, { ...init, headers });
};

/**
 * 1) Público (CLIENTE) — usa JWT dinâmico
 */
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
 * Aplica o JWT também no Realtime (WebSocket).
 * Chame depois de ensureClientJwt() e ANTES de dar subscribe em channels.
 */
export const applyRealtimeJwt = (jwt: string) => {
  // @ts-ignore
  supabasePublic.realtime.setAuth(jwt);

  // Reconnect “limpo” (evita ficar com auth antigo em memória)
  try {
    // @ts-ignore
    supabasePublic.realtime.disconnect();
    // @ts-ignore
    supabasePublic.realtime.connect();
  } catch {
    // ignore
  }
};

/**
 * 2) SUPORTE (como você já usa hoje)
 */
export const supabaseSupport = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storageKey: 'redoma_support_auth',
  },
});

/**
 * 3) MASTER / ADMIN (inalterado)
 */
export const supabaseMaster = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storageKey: 'redoma_master_auth',
  },
});
