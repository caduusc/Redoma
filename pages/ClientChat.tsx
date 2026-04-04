import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ChatLayout from '../components/ChatLayout';
import MessageList from '../components/MessageList';
import MessageInput from '../components/MessageInput';
import { supabasePublic } from '../lib/supabase';
import { useChat } from '../context/ChatContext';
import { LayoutGrid } from 'lucide-react';

const ClientChat: React.FC = () => {
  const navigate = useNavigate();

  const {
    getConversation,
    getMessages,
    addMessage,
    sendImageMessage,
    setActiveConversationId,
    refreshActiveConversation,
  } = useChat();

  const [communityName, setCommunityName] = useState<string | null>(null);
  const [loadingTitle, setLoadingTitle] = useState<boolean>(true);

  const activeConvId = localStorage.getItem('redoma_active_conv');
  const conversation = activeConvId ? getConversation(activeConvId) : undefined;
  const messages = activeConvId ? getMessages(activeConvId) : [];

  const [seenAt, setSeenAt] = useState<number>(Date.now());

  const markSeen = useCallback(async () => {
    if (!conversation?.id) return;

    const now = new Date().toISOString();
    await supabasePublic
      .from('conversations')
      .update({ last_client_seen_at: now })
      .eq('id', conversation.id);

    setSeenAt(Date.now());
  }, [conversation?.id]);

  useEffect(() => {
    void markSeen();
  }, [markSeen]);

  const hasUnreadFromAgent = useMemo(() => {
    if (!messages.length) return false;
    return messages.some(
      (m) =>
        m.sender_type === 'agent' &&
        new Date(m.created_at).getTime() > seenAt
    );
  }, [messages, seenAt]);

  const communityIdForTitle = useMemo(() => {
    return (
      conversation?.community_id ||
      localStorage.getItem('redoma_client_cid') ||
      null
    );
  }, [conversation?.community_id]);

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

  useEffect(() => {
    if (activeConvId) return;
    navigate('/client/start');
  }, [activeConvId, navigate]);

  useEffect(() => {
    if (!activeConvId) return;

    const handleResume = async () => {
      if (
        typeof document !== 'undefined' &&
        document.visibilityState === 'hidden'
      ) {
        return;
      }

      try {
        await refreshActiveConversation();
        await markSeen();
      } catch (err) {
        console.error('[ClientChat] resume refresh failed', err);
      }
    };

    // carrega ao entrar na tela
    void handleResume();

    window.addEventListener('focus', handleResume);
    window.addEventListener('pageshow', handleResume);
    window.addEventListener('online', handleResume);
    document.addEventListener('visibilitychange', handleResume);

    return () => {
      window.removeEventListener('focus', handleResume);
      window.removeEventListener('pageshow', handleResume);
      window.removeEventListener('online', handleResume);
      document.removeEventListener('visibilitychange', handleResume);
    };
  }, [activeConvId, refreshActiveConversation, markSeen]);

  const titleLabel = useMemo(() => {
    if (communityName) return communityName;
    if (loadingTitle) return 'Carregando...';
    if (communityIdForTitle) return communityIdForTitle;
    return 'Chat';
  }, [communityName, loadingTitle, communityIdForTitle]);

  const handleSend = async (text: string) => {
    if (!conversation?.id) return;
    await addMessage(conversation.id, text, 'client');
    await markSeen();
  };

  const handleSendImage = async (file: File) => {
    if (!conversation?.id) return;
    await sendImageMessage(conversation.id, file, 'client');
    await markSeen();
  };

  const handleBack = () => {
    setActiveConversationId(null);
    localStorage.removeItem('redoma_active_conv');
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
          <MessageList
            messages={messages}
            currentType="client"
            conversation={conversation}
          />
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