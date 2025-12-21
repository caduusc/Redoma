
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useChat } from '../context/ChatContext';
import ChatLayout from '../components/ChatLayout';
import MessageList from '../components/MessageList';
import MessageInput from '../components/MessageInput';
import { Hand, CheckCircle2 } from 'lucide-react';

const AgentChat: React.FC = () => {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const { getConversation, getMessages, addMessage, claimConversation, closeConversation } = useChat();

  if (!conversationId) return null;

  const conversation = getConversation(conversationId);
  const messages = getMessages(conversationId);

  if (!conversation) return null;

  const handleSend = (text: string) => {
    addMessage(conversationId, text, 'agent');
  };

  const handleClaim = () => {
    claimConversation(conversationId);
  };

  const handleClose = () => {
    closeConversation(conversationId);
    navigate('/agent/inbox');
  };

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
              <div className={`w-2 h-2 rounded-full ${conversation.status === 'claimed' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{conversation.status}</span>
           </div>
           {conversation.claimedBy && <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{conversation.claimedBy}</span>}
        </div>
        <MessageList messages={messages} currentType="agent" />
        <MessageInput 
          onSend={handleSend} 
          disabled={conversation.status === 'closed' || conversation.status === 'open'} 
        />
        {conversation.status === 'open' && (
          <div className="absolute inset-0 bg-redoma-dark/20 backdrop-blur-[2px] flex items-center justify-center p-6 z-20">
            <div className="bg-white p-8 rounded-3xl shadow-2xl text-center max-w-sm border border-slate-100">
              <div className="w-16 h-16 bg-redoma-dark/5 rounded-full flex items-center justify-center mx-auto mb-6">
                 <Hand size={32} className="text-redoma-dark" />
              </div>
              <h3 className="font-extrabold text-redoma-dark text-lg mb-3">Novo Chamado</h3>
              <p className="text-sm text-slate-500 mb-8 leading-relaxed">Este condomínio aguarda um atendente. Assuma agora para iniciar o diálogo.</p>
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
