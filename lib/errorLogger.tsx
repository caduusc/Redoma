import { supabasePublic } from './supabase';

type LogErrorParams = {
  source: 'frontend' | 'backend' | 'supabase' | 'edge_function';
  environment?: 'prod' | 'staging' | 'dev';
  error_code?: string;
  error_message: string;
  error_stack?: string;
  route?: string;
  method?: string;
  table_name?: string;
  function_name?: string;
  user_id?: string;
  client_token?: string;
  session_id?: string;
  request_payload?: any;
  extra_context?: any;
};

export async function logError(params: LogErrorParams) {
  try {
    const payload = {
      ...params,
      created_at: undefined, // garantimos que o DB seta
    };

    await supabasePublic.from('redoma_error_logs').insert(payload);
  } catch (e) {
    // não faz loop infinito tentando logar erro de log
    console.error('[logError failed]', e);
  }
}
