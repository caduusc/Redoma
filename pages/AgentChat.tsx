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

  useEffect(() => {
    const guard = async () => {
      const { data } = await supabaseSupport.auth.getSession();
      if (!data.session || !currentUser) {
        navigate('/agent/login', { replace: true });
      }
    };
    guard();
  }, [currentUser, navigate]);

  useEffect(() => {
    if (!conversationId) return;

    const markSeen = async () => {
      const { error } = await supabaseSupport
        .from('conversations')
        .update({ last_agent_seen_at: new Date().toISOString() })
        .eq('id', conversationId);

      if (error) console.error('[agent mark seen]', error);
    };

    markSeen();
    const t = setInterval(markSeen, 10000);
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

  const canType = conversation.status === 'claimed';
  const isOpen = conversation.status === 'open';

  return (
    <ChatLayout
      title={`${conversation.communityId}`}
      showBack
      onBack={() => navigate('/agent/inbox')}
      isAgent
      actions={
        <div className="flex gap-2">
          {conversation.status === 'open' && (
            <button
              onClick={handleClaim}
              className="flex items-center gap-1.5 bg-redoma-steel text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-redoma-glow transition-colors shadow-lg shadow-redoma-dark/20"
            >
              <Hand size={14} />
              <span>Assumir</span>
            </button>
          )}
          {conversation.status === 'claimed' && (
            <button
              onClick={handleClose}
              className="flex items-center gap-1.5 bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors shadow-lg"
            >
              <CheckCircle2 size={14} />
              <span>Finalizar</span>
            </button>
          )}
        </div>
      }
    >
      {/* ✅ Wrapper garante que existe "área de mensagens" + "footer input" */}
      <div className="flex flex-col h-full min-h-0 relative">
        {/* ✅ área scrollável */}
        <div className="flex-1 min-h-0">
          <MessageList messages={messages} currentType="agent" conversation={conversation} />
        </div>

        {/* ✅ footer sempre visível */}
        <div className="shrink-0 border-t border-slate-100 bg-white">
          <MessageInput
            onSend={handleSend}
            disabled={!canType}
          />
        </div>

        {isOpen && (
          <div className="absolute inset-0 bg-redoma-dark/20 backdrop-blur-[2px] flex items-center justify-center p-6 z-20">
            <div className="bg-white p-8 rounded-3xl shadow-2xl text-center max-w-sm border border-slate-100">
              <div className="w-16 h-16 bg-redoma-dark/5 rounded-full flex items-center justify-center mx-auto mb-6">
                <Hand size={32} className="text-redoma-dark" />
              </div>
              <h3 className="font-extrabold text-redoma-dark text-lg mb-3">Novo Chamado</h3>
              <p className="text-sm text-slate-500 mb-8 leading-relaxed">
                Esta comunidade aguarda um atendente. Assuma agora para iniciar o diálogo.
              </p>
              <button
                onClick={handleClaim}
                className="w-full bg-redoma-dark text-white py-4 rounded-2xl font-bold hover:bg-redoma-navy transition-all shadow-xl shadow-redoma-dark/20 uppercase tracking-widest text-xs"
              >
                Atender Cliente
              </button>
            </div>
          </div>
        )}
      </div>
    </ChatLayout>
  );
};

export default AgentChat;
