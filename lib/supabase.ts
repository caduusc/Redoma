import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wjpkvdkmkoojjmnjdtnk.supabase.co';
const supabaseAnonKey = 'sb_publishable_9tyk3EMUSLUy3VkK9yypaQ_NWRYPmUl';

export const CLIENT_TOKEN_KEY = 'redoma_client_token';

const getClientToken = () => {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(CLIENT_TOKEN_KEY) ?? '';
};

/**
 * Fetch wrapper:
 * Injeta automaticamente o header `x-client-token`
 * em TODAS as requests HTTP feitas pelo supabasePublic
 */
const withClientTokenFetch: typeof fetch = async (input, init) => {
  const headers = new Headers(init?.headers || {});
  const token = getClientToken();

  if (token) headers.set('x-client-token', token);
  headers.set('apikey', supabaseAnonKey); // ajuda em alguns ambientes

  return fetch(input, {
    ...init,
    headers,
  });
};

/**
 * 1) Público (CLIENTE)
 * - Não persiste sessão
 * - Não interfere no login do suporte/admin
 * - Sempre envia x-client-token → RLS funciona (HTTP)
 * - Realtime: também manda header (WS) e permite refresh do token
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
  realtime: {
    params: {
      headers: {
        'x-client-token': getClientToken(),
      },
    },
  },
});

/**
 * Atualiza o header do Realtime (websocket) e força reconectar.
 * Isso é o que normalmente elimina a necessidade de “dar refresh”
 * pra enxergar INSERT vindo de trigger.
 */
export const refreshPublicRealtimeToken = async () => {
  const token = getClientToken();

  // atualiza params p/ próximas conexões
  // @ts-ignore
  supabasePublic.realtime.params = {
    ...(supabasePublic.realtime.params || {}),
    headers: { 'x-client-token': token },
  };

  // força reconectar p/ aplicar na conexão atual
  try {
    supabasePublic.realtime.disconnect();
  } catch {}
  try {
    supabasePublic.realtime.connect();
  } catch {}
};

/**
 * 2) SUPORTE
 * - Sessão própria
 * - Não usa token customizado
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
