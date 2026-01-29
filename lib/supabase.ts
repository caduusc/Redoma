import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wjpkvdkmkoojjmnjdtnk.supabase.co';
// ✅ Usando a nova Publishable Key
const supabaseAnonKey = 'sb_publishable_9tyk3EMUSLUy3VkK9yypaQ_NWRYPmUl';

export const CLIENT_TOKEN_KEY = 'redoma_client_token';

/**
 * Fetch wrapper
 * Injeta automaticamente o header `x-client-token`
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