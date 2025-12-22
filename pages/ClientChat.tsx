import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../context/ChatContext';
import ChatLayout from '../components/ChatLayout';
import MessageList from '../components/MessageList';
import MessageInput from '../components/MessageInput';
import { LayoutGrid } from 'lucide-react';
import { supabasePublic } from '../lib/supabase';

const getOrCreateClientToken = () => {
  const existing = localStorage.getItem('redoma_client_token');
  if (existing) return existing;

  const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
  localStorage.setItem('redoma_client_token', token);
  return token;
};

const ClientChat: React.FC = () => {
  const navigate = useNavigate();
  const { getConversation, getMessages, addMessage } = useChat();
  const [convId, setConvId] = useState<string | null>(null);

  // ✅ 1) Recupera conversa ativa (local) ou busca no Supabase a mais recente aberta
  useEffect(() => {
    const boot = async () => {
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

      // busca a conversa mais recente não-fechada desse cliente nessa comunidade
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
        navigate('/client/start');
        return;
      }

      const recoveredId = data?.[0]?.id;

      if (recoveredId) {
        localStorage.setItem('redoma_active_conv', recoveredId);
        setConvId(recoveredId);
        return;
      }

      // se não achou conversa aberta, volta pro start
      navigate('/client/start');
    };

    boot();
  }, [navigate]);

  // ✅ 2) "Visto": quando o cliente está no chat, marca last_client_seen_at
  useEffect(() => {
    if (!convId) return;

    const markSeen = async () => {
      const { error } = await supabasePublic
        .from('conversations')
        .update({ last_client_seen_at: new Date().toISOString() })
        .eq('id', convId);

      if (error) console.error('[client mark seen]', error);
    };

    // marca ao entrar
    markSeen();

    // mantém ping enquanto estiver com a conversa aberta
    const t = setInterval(markSeen, 10000);

    return () => clearInterval(t);
  }, [convId]);

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

        {/* ✅ passa conversation para o MessageList (para o ✓✓ azul funcionar) */}
        <MessageList messages={messages} currentType="client" conversation={conversation} />

        <MessageInput onSend={handleSend} disabled={conversation?.status === 'closed'} />
      </div>
    </ChatLayout>
  );
};

export default ClientChat;
