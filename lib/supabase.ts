import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase env vars: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY'
  );
}

/**
 * Custom fetch que injeta x-client-token em toda requisição.
 * Ele lê do localStorage na hora da request (não só no boot).
 */
const fetchWithClientToken: typeof fetch = async (input, init) => {
  const headers = new Headers(init?.headers || {});

  try {
    const token = localStorage.getItem('redoma_client_token');
    if (token) headers.set('x-client-token', token);
  } catch {
    // ignore (SSR / ambientes sem localStorage)
  }

  return fetch(input, { ...init, headers });
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: fetchWithClientToken,
  },
});
