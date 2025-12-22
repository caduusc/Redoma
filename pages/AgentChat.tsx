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

  // ✅ Guard: exige sessão do SUPORTE e modo agente
  useEffect(() => {
    const guard = async () => {
      const { data } = await supabaseSupport.auth.getSession();
      if (!data.session || !currentUser) {
        navigate('/agent/login', { replace: true });
      }
    };
    guard();
  }, [currentUser, navigate]);

  // ✅ "Visto": enquanto o agente está com o chat aberto, marca last_agent_seen_at
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
    await claimConversation(conversationId);
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
      <div className="flex flex-col h-full">
        <div className="bg-white border-b border-slate-100 px-6 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                conversation.status === 'claimed' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
              {conversation.status}
            </span>
          </div>
          {conversation.claimedBy && (
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              {conversation.claimedBy}
            </span>
          )}
        </div>

        {/* ✅ passa conversation para o "Visto" funcionar */}
        <MessageList messages={messages} currentType="agent" conversation={conversation} />
        <MessageInput onSend={handleSend} disabled={!canType} />

        {isOpen && (
          <div className="absolute inset-0 bg-redoma-dark/20 backdrop-blur-[2px] flex items-center justify-center p-6 z-20">
            <div className="bg-white p-8 rounded-3xl shadow-2xl text-center max-w-sm border border-slate-100">
              <div className="w-16 h-16 bg-redoma-dark/5 rounded-full flex items-center justify-center mx-auto mb-6">
                <Hand size={32} className="text-redoma-dark" />
              </div>
              <h3 className="font-extrabold text-redoma-dark text-lg mb-3">Novo Chamado</h3>
              <p className="text-sm text-slate-500 mb-8 leading-relaxed">
                Este condomínio aguarda um atendente. Assuma agora para iniciar o diálogo.
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
