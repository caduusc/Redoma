import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wjpkvdkmkoojjmnjdtnk.supabase.co';
const supabaseAnonKey = 'sb_publishable_9tyk3EMUSLUy3VkK9yypaQ_NWRYPmUl';

const CLIENT_TOKEN_KEY = 'redoma_client_token';

/**
 * Fetch wrapper
 * Injeta automaticamente o header `x-client-token`
 * em TODAS as requests HTTP feitas pelo supabasePublic
 */
const withClientTokenFetch: typeof fetch = async (input, init) => {
  const headers = new Headers(init?.headers || {});
  const token =
    typeof window !== 'undefined' ? localStorage.getItem(CLIENT_TOKEN_KEY) : null;

  if (token) {
    headers.set('x-client-token', token);
  }

  return fetch(input, {
    ...init,
    headers,
  });
};

/**
 * Helper: pega o token atual do client (SSR-safe)
 */
const getClientToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(CLIENT_TOKEN_KEY);
};

/**
 * 1) Público (CLIENTE)
 * - Não persiste sessão
 * - Não interfere no login do suporte/admin
 * - Sempre envia x-client-token → RLS funciona
 * - IMPORTANTÍSSIMO: também injeta token no Realtime (WebSocket)
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
      // O Realtime não usa global.fetch, então precisa disso aqui
      headers: {
        'x-client-token': getClientToken() ?? '',
      },
    },
  },
});

/**
 * Se o token mudar depois (ex: login do cliente),
 * chame isso para atualizar o header do realtime sem recriar o client.
 */
export const refreshPublicRealtimeToken = () => {
  const token = getClientToken() ?? '';
  // @ts-ignore - setAuth existe no realtime client interno
  supabasePublic.realtime.setAuth(token ? `x-client-token=${token}` : '');
  // Além disso, atualiza params para novas conexões
  // @ts-ignore
  supabasePublic.realtime.params = {
    ...(supabasePublic.realtime.params || {}),
    headers: { 'x-client-token': token },
  };
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
