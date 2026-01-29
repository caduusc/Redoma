import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wjpkvdkmkoojjmnjdtnk.supabase.co';
const supabaseAnonKey = 'sb_publishable_9tyk3EMUSLUy3VkK9yypaQ_NWRYPmUl';

export const CLIENT_TOKEN_KEY = 'redoma_client_token';

// ✅ Função para criar/pegar token do cliente
export const getOrCreateClientToken = () => {
  const existing = localStorage.getItem(CLIENT_TOKEN_KEY);
  if (existing) return existing;

  const token =
    (typeof crypto !== 'undefined' && crypto.randomUUID?.()) ??
    Math.random().toString(36).slice(2) + Date.now().toString(36);

  localStorage.setItem(CLIENT_TOKEN_KEY, token);
  return token;
};

// ✅ Função stub para JWT (não faz nada, só para compatibilidade)
export const ensureClientJwt = async () => {
  // Com a publishable key, não precisa gerenciar JWT manualmente
  return supabaseAnonKey;
};

// ✅ Função stub para aplicar JWT no realtime (não faz nada)
export const applyRealtimeJwt = (jwt: string) => {
  // Com a publishable key, isso é gerenciado automaticamente
  return;
};

/**
 * Fetch wrapper
 */
const withClientTokenFetch: typeof fetch = async (input, init) => {
  const headers = new Headers(init?.headers || {});
  const token = localStorage.getItem(CLIENT_TOKEN_KEY);

  if (token) {
    headers.set('x-client-token', token);
  }

  return fetch(input, {
    ...init,
    headers,
  });
};

/**
 * 1) Público (CLIENTE)
 */
export const supabasePublic = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
  global: {
    fetch: withClientTokenFetch,
  },
});

/**
 * 2) SUPORTE
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
 */
export const supabaseMaster = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storageKey: 'redoma_master_auth',
  },
});