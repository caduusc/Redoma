import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ChatLayout from '../components/ChatLayout';
import MessageList from '../components/MessageList';
import MessageInput from '../components/MessageInput';
import { supabasePublic } from '../lib/supabase';
import { useChat } from '../context/ChatContext';
import { LayoutGrid } from 'lucide-react';

const ClientChat: React.FC = () => {
  const navigate = useNavigate();
  
  // ✅ CORREÇÃO: Usar as propriedades corretas do contexto
  const {
    getConversation,
    getMessages,
    addMessage,
    sendImageMessage,
    setActiveConversationId,
  } = useChat();

  const [communityName, setCommunityName] = useState<string | null>(null);
  const [loadingTitle, setLoadingTitle] = useState<boolean>(true);

  // ✅ CORREÇÃO: Pegar o ID da conversa ativa do localStorage
  const activeConvId = localStorage.getItem('redoma_active_conv');
  
  // ✅ CORREÇÃO: Buscar a conversa usando a função do contexto
  const conversation = activeConvId ? getConversation(activeConvId) : undefined;
  
  // ✅ CORREÇÃO: Buscar as mensagens usando a função do contexto
  const messages = activeConvId ? getMessages(activeConvId) : [];

  const [seenAt, setSeenAt] = useState<number>(Date.now());

  // Marca last_client_seen_at no banco ao entrar no chat
  useEffect(() => {
    if (!conversation?.id) return;

    const markSeen = async () => {
      const now = new Date().toISOString();
      await supabasePublic
        .from('conversations')
        .update({ last_client_seen_at: now })
        .eq('id', conversation.id);
      setSeenAt(Date.now());
    };

    markSeen();
  }, [conversation?.id]);

  // ✅ CORREÇÃO: só mostra "nova resposta" se chegou msg do agente DEPOIS do último seen
  const hasUnreadFromAgent = useMemo(() => {
    if (!messages.length) return false;
    return messages.some(
      (m) =>
        m.sender_type === 'agent' &&
        new Date(m.created_at).getTime() > seenAt
    );
  }, [messages, seenAt]);

  // ✅ fallback: tenta pegar o communityId do localStorage (setado no ClientStart)
  const communityIdForTitle = useMemo(() => {
    return (
      conversation?.community_id ||
      localStorage.getItem('redoma_client_cid') ||
      null
    );
  }, [conversation?.community_id]);

  // 🔥 resolve communityId -> name (para o título)
  useEffect(() => {
    const cid = communityIdForTitle;

    if (!cid) {
      setCommunityName(null);
      setLoadingTitle(false);
      return;
    }

    let cancelled = false;
    setLoadingTitle(true);

    (async () => {
      const { data, error } = await supabasePublic
        .from('communities')
        .select('name')
        .eq('id', cid)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error('[ClientChat] fetch community name error', error);
        setCommunityName(null);
        setLoadingTitle(false);
        return;
      }

      setCommunityName(data?.name || null);
      setLoadingTitle(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [communityIdForTitle]);

  const titleLabel = useMemo(() => {
    if (communityName) return communityName;
    if (loadingTitle) return 'Carregando...';
    if (communityIdForTitle) return communityIdForTitle; // fallback final (ID)
    return 'Chat';
  }, [communityName, loadingTitle, communityIdForTitle]);

  // ✅ CORREÇÃO: handleSend agora usa addMessage com conversationId e senderType corretos
  const handleSend = async (text: string) => {
    if (!conversation?.id) return;
    await addMessage(conversation.id, text, 'client');
  };

  // ✅ CORREÇÃO: handleSendImage agora usa sendImageMessage com conversationId e senderType corretos
  const handleSendImage = async (file: File) => {
    if (!conversation?.id) return;
    await sendImageMessage(conversation.id, file, 'client');
  };

  const handleBack = () => {
    setActiveConversationId(null);
    localStorage.removeItem('redoma_active_conv');
    // mantém redoma_client_cid pra título fallback funcionar em refresh,
    // mas se quiser limpar também, descomenta a linha abaixo:
    // localStorage.removeItem('redoma_client_cid');
    navigate('/client/start');
  };

  return (
    <ChatLayout
      title={`Chat: ${titleLabel}`}
      showBack
      onBack={handleBack}
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/client/providers')}
            className="flex items-center gap-1.5 text-[10px] font-bold bg-white/10 text-white px-3 py-1.5 rounded-full hover:bg-white/20 transition-colors border border-white/10 uppercase tracking-widest"
            title="Ver Fornecedores"
          >
            <LayoutGrid size={14} />
            <span className="hidden xs:inline">Benefícios</span>
          </button>
        </div>
      }
    >
      <div className="flex flex-col h-full min-h-0">
        <div className="bg-indigo-50 border-b border-indigo-100 px-4 py-2 text-[10px] text-indigo-600 font-bold text-center uppercase tracking-[0.15em] flex items-center justify-center gap-3">
          <span>Suporte Redoma Ativo</span>

          {hasUnreadFromAgent && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-[9px] font-extrabold tracking-[0.18em]">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Nova resposta
            </span>
          )}
        </div>

        <div className="flex-1 min-h-0">
          <MessageList messages={messages} currentType="client" conversation={conversation} />
        </div>

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