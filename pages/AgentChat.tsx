import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useChat } from '../context/ChatContext';
import ChatLayout from '../components/ChatLayout';
import MessageList from '../components/MessageList';
import MessageInput from '../components/MessageInput';
import { Hand, CheckCircle2 } from 'lucide-react';
import { supabaseSupport } from '../lib/supabase';

const AgentChat: React.FC = () => {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const {
    getConversation,
    getMessages,
    addMessage,
    claimConversation,
    closeConversation,
    currentUser,
  } = useChat();

  // 🔐 Guard
  useEffect(() => {
    const guard = async () => {
      const { data } = await supabaseSupport.auth.getSession();
      if (!data.session || !currentUser) {
        navigate('/agent/login', { replace: true });
      }
    };
    guard();
  }, [currentUser, navigate]);

  // 👁️ seen
  useEffect(() => {
    if (!conversationId) return;
    const t = setInterval(() => {
      supabaseSupport
        .from('conversations')
        .update({ last_agent_seen_at: new Date().toISOString() })
        .eq('id', conversationId);
    }, 10000);
    return () => clearInterval(t);
  }, [conversationId]);

  if (!conversationId) return null;

  const conversation = getConversation(conversationId);
  const messages = getMessages(conversationId);

  if (!conversation) return null;

  const handleSend = async (text: string) => {
    await addMessage(conversationId, text, 'agent');
  };

  const handleClaim = async () => {
    try {
      await claimConversation(conversationId);
    } catch (e: any) {
      alert(e?.message || 'Erro ao assumir atendimento');
    }
  };

  const handleClose = async () => {
    await closeConversation(conversationId);
    navigate('/agent/inbox', { replace: true });
  };

  const canType = conversation.status === 'claimed'; // ✅ item 3 incluso
  const isOpen = conversation.status === 'open';

  return (
    <ChatLayout
      title={conversation.communityId}
      showBack
      onBack={() => navigate('/agent/inbox')}
      isAgent
      actions={
        <div className="flex gap-2">
          {isOpen && (
            <button
              onClick={handleClaim}
              className="flex items-center gap-1.5 bg-redoma-steel text-white px-4 py-2 rounded-xl text-xs font-bold"
            >
              <Hand size={14} />
              Assumir
            </button>
          )}
          {conversation.status === 'claimed' && (
            <button
              onClick={handleClose}
              className="flex items-center gap-1.5 bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold"
            >
              <CheckCircle2 size={14} />
              Finalizar
            </button>
          )}
        </div>
      }
    >
      <MessageList messages={messages} currentType="agent" conversation={conversation} />
      <MessageInput onSend={handleSend} disabled={!canType} />

      {isOpen && (
        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-20">
          <div className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-sm">
            <Hand size={32} className="mx-auto mb-4 text-redoma-dark" />
            <h3 className="font-bold mb-2">Novo Chamado</h3>
            <p className="text-sm text-slate-500 mb-6">
              Assuma para iniciar o atendimento.
            </p>
            <button
              onClick={handleClaim}
              className="w-full bg-redoma-dark text-white py-3 rounded-xl font-bold"
            >
              Atender Cliente
            </button>
          </div>
        </div>
      )}
    </ChatLayout>
  );
};

export default AgentChat;
