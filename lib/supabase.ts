import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wjpkvdkmkoojjmnjdtnk.supabase.co';
const supabaseAnonKey = 'sb_publishable_9tyk3EMUSLUy3VkK9yypaQ_NWRYPmUl';

const CLIENT_TOKEN_KEY = 'redoma_client_token';
const CLIENT_JWT_KEY = 'redoma_client_jwt';

const getClientToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(CLIENT_TOKEN_KEY);
};

const getClientJwt = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(CLIENT_JWT_KEY);
};

/**
 * Fetch wrapper:
 * - Se existir JWT, usa Authorization Bearer (role=client) -> RLS + Realtime OK
 * - Se não existir JWT, mantém fallback com x-client-token (HTTP somente)
 */
const withClientAuthFetch: typeof fetch = async (input, init) => {
  const headers = new Headers(init?.headers || {});
  const jwt = getClientJwt();
  const token = getClientToken();

  if (jwt) {
    headers.set('Authorization', `Bearer ${jwt}`);
  } else if (token) {
    headers.set('x-client-token', token);
  }

  // sempre bom garantir apikey também (alguns ambientes pedem)
  headers.set('apikey', supabaseAnonKey);

  return fetch(input, {
    ...init,
    headers,
  });
};

/**
 * Emite (ou reaproveita) JWT do cliente via Edge Function
 */
export const getOrCreateClientJwt = async () => {
  if (typeof window === 'undefined') return null;

  const existing = localStorage.getItem(CLIENT_JWT_KEY);
  if (existing) return existing;

  const client_token = getClientToken();
  if (!client_token) throw new Error('missing client_token');

  // timeout pra não travar boot
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 6000);

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/issue-client-jwt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseAnonKey,
      },
      body: JSON.stringify({ client_token }),
      signal: ctrl.signal,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error('[issue-client-jwt] failed', { status: res.status, data });
      return null; // fallback p/ header
    }

    if (!data?.token) {
      console.error('[issue-client-jwt] missing token', data);
      return null;
    }

    localStorage.setItem(CLIENT_JWT_KEY, data.token);
    return data.token as string;
  } catch (e) {
    console.error('[issue-client-jwt] error', e);
    return null; // fallback p/ header
  } finally {
    clearTimeout(t);
  }
};


/**
 * Aplica JWT no realtime do supabasePublic
 */
export const setPublicClientJwt = (jwt: string) => {
  // Realtime usa JWT para autenticar websocket
  supabasePublic.realtime.setAuth(jwt);
};

/**
 * 1) Público (CLIENTE)
 * - Não persiste sessão
 * - Usa JWT (role=client) quando existir
 */
export const supabasePublic = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
  global: {
    fetch: withClientAuthFetch,
  },
});

/**
 * 2) SUPORTE
 * - Sessão própria
 * - Não usa JWT do cliente
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
 * 3) MASTER / ADMIN
 * - Sessão própria e isolada
 */
export const supabaseMaster = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storageKey: 'redoma_master_auth',
  },
});
