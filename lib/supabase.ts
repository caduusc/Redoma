import { createClient } from '@supabase/supabase-js';

// ⚠️ Em produção, o ideal é usar variáveis de ambiente.
// Mantive hardcoded porque você está assim hoje.
const supabaseUrl = 'https://wjpkvdkmkoojjmnjdtnk.supabase.co';
const supabaseAnonKey = 'sb_publishable_9tyk3EMUSLUy3VkK9yypaQ_NWRYPmUl';

// Token anônimo para “amarrar” o cliente à própria conversa (RLS via header)
const CLIENT_TOKEN_KEY = 'redoma_client_token';

function getOrCreateClientToken(): string {
  try {
    let token = localStorage.getItem(CLIENT_TOKEN_KEY);

    if (!token) {
      // Preferir UUID nativo quando disponível
      if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        token = crypto.randomUUID();
      } else {
        // Fallback simples (ainda suficientemente aleatório para uso de sessão)
        token =
          Math.random().toString(36).slice(2) +
          Math.random().toString(36).slice(2) +
          Date.now().toString(36);
      }

      localStorage.setItem(CLIENT_TOKEN_KEY, token);
    }

    return token;
  } catch {
    // Se localStorage não estiver disponível por algum motivo,
    // ainda geramos um token em memória (sessão frágil, mas não quebra o app).
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}

// Criamos o client_token uma vez e mandamos em todas as requests
const clientToken = getOrCreateClientToken();

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: {
      'x-client-token': clientToken,
    },
  },
});

// (Opcional) exportar o token para usar nos inserts de conversations/messages
export const getClientToken = () => clientToken;
