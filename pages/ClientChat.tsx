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
  const { conversation, messages, sendMessage, sendImage, hasUnreadFromAgent, setActiveConversationId } =
    useChat();

  const [communityName, setCommunityName] = useState<string | null>(null);

  // 🔥 resolve communityId -> name (para o título)
  useEffect(() => {
    const cid = conversation?.communityId;
    if (!cid) {
      setCommunityName(null);
      return;
    }

    let cancelled = false;

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
        return;
      }

      setCommunityName(data?.name || null);
    })();

    return () => {
      cancelled = true;
    };
  }, [conversation?.communityId]);

  const titleLabel = useMemo(() => {
    if (communityName) return communityName;
    if (conversation?.communityId) return conversation.communityId; // fallback
    return 'Carregando...';
  }, [communityName, conversation?.communityId]);

  const handleSend = async (text: string) => {
    const convId = conversation?.id;
    if (!convId) return;

    await sendMessage(text);
  };

  const handleSendImage = async (file: File) => {
    const convId = conversation?.id;
    if (!convId) return;

    await sendImage(file);
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
