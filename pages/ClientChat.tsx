import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../context/ChatContext';
import ChatLayout from '../components/ChatLayout';
import MessageList from '../components/MessageList';
import MessageInput from '../components/MessageInput';
import { LayoutGrid } from 'lucide-react';

const ClientChat: React.FC = () => {
  const navigate = useNavigate();
  const { getConversation, getMessages, addMessage } = useChat();
  const [convId, setConvId] = useState<string | null>(null);

  useEffect(() => {
    const id = localStorage.getItem('redoma_active_conv');
    if (!id) {
      navigate('/client/start');
    } else {
      setConvId(id);
    }
  }, [navigate]);

  if (!convId) return null;

  const conversation = getConversation(convId);
  const messages = getMessages(convId);

  const handleSend = (text: string) => {
    addMessage(convId, text, 'client');
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
      <div className="flex flex-col h-full">
        <div className="bg-indigo-50 border-b border-indigo-100 px-4 py-2 text-[10px] text-indigo-600 font-bold text-center uppercase tracking-[0.15em]">
          Suporte Redoma Ativo
        </div>
        <MessageList messages={messages} currentType="client" />
        <MessageInput onSend={handleSend} disabled={conversation?.status === 'closed'} />
      </div>
    </ChatLayout>
  );
};

export default ClientChat;
