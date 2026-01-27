import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wjpkvdkmkoojjmnjdtnk.supabase.co';
const supabaseAnonKey = 'sb_publishable_9tyk3EMUSLUy3VkK9yypaQ_NWRYPmUl';

const CLIENT_TOKEN_KEY = 'redoma_client_token';

// fetch wrapper: injeta x-client-token em TODAS as requests do supabasePublic
const withClientTokenFetch: typeof fetch = async (input, init) => {
  const headers = new Headers(init?.headers || {});
  const token = localStorage.getItem(CLIENT_TOKEN_KEY);

  if (token) headers.set('x-client-token', token);

  return fetch(input, {
    ...init,
    headers,
  });
};

// 1) Público (cliente) — NÃO persistir sessão pra não sujar login do suporte/master
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

// 2) Suporte — persiste sessão em uma chave própria
export const supabaseSupport = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storageKey: 'redoma_support_auth',
  },
});

// 3) Master — persiste sessão em outra chave própria
export const supabaseMaster = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storageKey: 'redoma_master_auth',
  },
});
