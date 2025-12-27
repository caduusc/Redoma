import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../context/ChatContext';
import ChatLayout from '../components/ChatLayout';
import MessageList from '../components/MessageList';
import MessageInput from '../components/MessageInput';
import { LayoutGrid } from 'lucide-react';
import { supabasePublic } from '../lib/supabase';
import { logError } from '../lib/errorLogger';

const getOrCreateClientToken = () => {
  const existing = localStorage.getItem('redoma_client_token');
  if (existing) return existing;

  const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
  localStorage.setItem('redoma_client_token', token);
  return token;
};

const ClientChat: React.FC = () => {
  const navigate = useNavigate();
  const { getConversation, getMessages, addMessage, sendImageMessage } = useChat();
  const [convId, setConvId] = useState<string | null>(null);

  // ✅ 1) Recupera conversa ativa (local) ou busca no Supabase a mais recente aberta
  useEffect(() => {
    const boot = async () => {
      try {
        const existing = localStorage.getItem('redoma_active_conv');
        if (existing) {
          setConvId(existing);
          return;
        }

        const communityId = localStorage.getItem('redoma_client_cid');
        if (!communityId) {
          navigate('/client/start');
          return;
        }

        const token = getOrCreateClientToken();

        const { data, error } = await supabasePublic
          .from('conversations')
          .select('id, status, createdAt')
          .eq('clientToken', token)
          .eq('communityId', communityId)
          .neq('status', 'closed')
          .order('createdAt', { ascending: false })
          .limit(1);

        if (error) {
          console.error('[client recover conversation]', error);

          await logError({
            source: 'frontend',
            environment: 'prod',
            error_code: (error as any)?.code,
            error_message: (error as any)?.message || 'Failed to recover conversation',
            error_stack: (error as any)?.stack,
            route: '/client/chat',
            method: 'SELECT',
            table_name: 'conversations',
            client_token: token,
            request_payload: { communityId },
            extra_context: { phase: 'recover_conversation' },
          });

          navigate('/client/start');
          return;
        }

        const recoveredId = data?.[0]?.id;

        if (recoveredId) {
          localStorage.setItem('redoma_active_conv', recoveredId);
          setConvId(recoveredId);
          return;
        }

        navigate('/client/start');
      } catch (err: any) {
        console.error('[client boot fatal]', err);

        const token = localStorage.getItem('redoma_client_token') || undefined;
        const communityId = localStorage.getItem('redoma_client_cid') || undefined;

        await logError({
          source: 'frontend',
          environment: 'prod',
          error_message: err?.message || 'ClientChat boot fatal error',
          error_stack: err?.stack,
          route: '/client/chat',
          client_token: token,
          request_payload: { communityId },
          extra_context: { phase: 'boot_catch' },
        });

        navigate('/client/start');
      }
    };

    boot();
  }, [navigate]);

  // ✅ 2) "Visto": via RPC (retorna 1 quando atualiza de fato)
  useEffect(() => {
    if (!convId) return;

    const markSeen = async () => {
      const token = localStorage.getItem('redoma_client_token') || getOrCreateClientToken();

      const { data, error } = await supabasePublic.rpc('mark_client_seen', {
        p_conversation_id: convId,
        p_client_token: token,
      });

      if (error) {
        console.error('[client mark seen rpc]', error);

        await logError({
          source: 'frontend',
          environment: 'prod',
          error_code: (error as any)?.code,
          error_message: (error as any)?.message || 'mark_client_seen RPC failed',
          error_stack: (error as any)?.stack,
          route: '/client/chat',
          method: 'RPC',
          function_name: 'mark_client_seen',
          client_token: token,
          request_payload: { convId },
          extra_context: { phase: 'mark_seen' },
        });

        return;
      }

      if (data === 0) {
        console.warn('[client mark seen rpc] NÃO atualizou (0 rows). Token/coluna não bateu.', {
          convId,
          token,
        });

        await logError({
          source: 'frontend',
          environment: 'prod',
          error_code: 'NO_ROWS_UPDATED',
          error_message: 'mark_client_seen returned 0 rows updated (token/where mismatch)',
          route: '/client/chat',
          method: 'RPC',
          function_name: 'mark_client_seen',
          client_token: token,
          request_payload: { convId },
          extra_context: { returned: data },
        });
      }
    };

    markSeen();
    const t = setInterval(markSeen, 10000);
    return () => clearInterval(t);
  }, [convId]);

  if (!convId) return null;

  const conversation = getConversation(convId);
  const messages = getMessages(convId);

  // 🔔 existe mensagem do agente mais nova que o last_client_seen_at?
  const lastClientSeenTs = conversation?.last_client_seen_at
    ? new Date(conversation.last_client_seen_at).getTime()
    : 0;

  const hasUnreadFromAgent = messages.some(
    (m) =>
      m.senderType === 'agent' &&
      new Date(m.createdAt).getTime() > lastClientSeenTs
  );

  const handleSend = async (text: string) => {
    try {
      await addMessage(convId, text, 'client');
    } catch (err: any) {
      console.error('[client send message]', err);

      const token = localStorage.getItem('redoma_client_token') || undefined;

      await logError({
        source: 'frontend',
        environment: 'prod',
        error_message: err?.message || 'Failed to send message',
        error_stack: err?.stack,
        route: '/client/chat',
        method: 'LOCAL',
        client_token: token,
        request_payload: { convId, textPreview: text?.slice?.(0, 120) },
        extra_context: { phase: 'handleSend' },
      });
    }
  };

  const handleSendImage = async (file: File) => {
    if (!convId) return;
    try {
      await sendImageMessage(convId, file, 'client');
    } catch (err: any) {
      console.error('[client send image]', err);

      const token = localStorage.getItem('redoma_client_token') || undefined;

      await logError({
        source: 'frontend',
        environment: 'prod',
        error_message: err?.message || 'Failed to send image',
        error_stack: err?.stack,
        route: '/client/chat',
        method: 'LOCAL',
        client_token: token,
        request_payload: { convId, fileName: file.name, fileSize: file.size },
        extra_context: { phase: 'handleSendImage' },
      });
    }
  };

  return (
    <ChatLayout
      title={`Chat: ${conversation?.communityId || 'Carregando...'}`}
      showBack
      onBack={() => navigate('/client/start')}
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/client/providers')}
            className="hidden sm:flex items-center gap-1.5 text-[10px] font-bold bg-white/10 text-white px-3 py-1.5 rounded-full hover:bg-white/20 transition-colors border border-white/10 uppercase tracking-widest"
            title="Ver Fornecedores"
          >
            <LayoutGrid size={14} />
            <span>Benefícios</span>
          </button>
        </div>
      }
    >
      {/* 📱 layout igual ao AgentChat: área scrollável + footer fixo */}
      <div className="flex flex-col h-full min-h-0">
        {/* Banner topo + badge de nova resposta */}
        <div className="bg-indigo-50 border-b border-indigo-100 px-4 py-2 text-[10px] text-indigo-600 font-bold text-center uppercase tracking-[0.15em] flex items-center justify-center gap-3">
          <span>Suporte Redoma Ativo</span>

          {hasUnreadFromAgent && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-[9px] font-extrabold tracking-[0.18em]">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Nova resposta
            </span>
          )}
        </div>

        {/* Área de mensagens scrollável */}
        <div className="flex-1 min-h-0">
          <MessageList
            messages={messages}
            currentType="client"
            conversation={conversation}
          />
        </div>

        {/* Footer fixo com input (respeita teclado) */}
        <div className="shrink-0 border-t border-slate-100 bg-white">
          <MessageInput
            onSend={handleSend}
            onSendImage={handleSendImage}
            disabled={conversation?.status === 'closed'}
          />
        </div>
      </div>
    </ChatLayout>
  );
};

export default ClientChat;
