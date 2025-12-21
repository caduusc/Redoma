
import { createClient } from '@supabase/supabase-js';

// Usando as credenciais fornecidas diretamente para evitar erros de variáveis de ambiente no navegador
const supabaseUrl = 'https://wjpkvdkmkoojjmnjdtnk.supabase.co';
const supabaseAnonKey = 'sb_publishable_9tyk3EMUSLUy3VkK9yypaQ_NWRYPmUl';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
