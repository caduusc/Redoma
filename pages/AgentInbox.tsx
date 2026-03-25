import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../context/ChatContext';
import ChatLayout from '../components/ChatLayout';
import { ConversationStatus, Conversation } from '../types';
import { MessageSquare, Clock, User, LogOut, Bell, BellOff } from 'lucide-react';
import { supabaseSupport } from '../lib/supabase';

const AgentInbox: React.FC = () => {
  const {
    conversations,
    messages,
    logout,
    currentUser,
    notificationPermission,
    notificationsEnabled,
    notificationsSupported,
    requestNotificationPermission,
    disableNotifications,
  } = useChat();

  const [filter, setFilter] = useState<ConversationStatus>('open');
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await supabaseSupport.auth.signOut();
    } finally {
      logout();
      navigate('/agent/login', { replace: true });
    }
  };

  const hasUnreadFromClient = (conv: Conversation) => {
    const lastSeenTs = conv.last_agent_seen_at
      ? new Date(conv.last_agent_seen_at).getTime()
      : 0;

    return messages.some(
      (m) =>
        m.conversation_id === conv.id &&
        m.sender_type === 'client' &&
        new Date(m.created_at).getTime() > lastSeenTs
    );
  };

  const filteredConversations = conversations.filter((c) => {
    if (filter === 'claimed') {
      return c.status === 'claimed' && c.claimed_by === currentUser?.name;
    }
    return c.status === filter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'claimed':
        return 'bg-redoma-steel/10 text-redoma-steel border-redoma-steel/20';
      case 'closed':
        return 'bg-slate-100 text-slate-400 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-500';
    }
  };

  const getMemberName = (conv: Conversation) => {
    const conversation = conv as any;

    return (
      conversation.member_name ||
      conversation.memberName ||
      conversation.members?.full_name ||
      'Usuário'
    );
  };

  const getCommunityName = (conv: Conversation) => {
    const conversation = conv as any;

    return (
      conversation.community_name ||
      conversation.communityName ||
      conversation.communities?.name ||
      conversation.community?.name ||
      conversation.communityId ||
      conversation.community_id ||
      'Comunidade'
    );
  };

  return (
    <ChatLayout
      title="Gestão de Atendimentos"
      isAgent
      actions={
        <div className="flex items-center gap-1">
          {notificationsSupported && (
            notificationPermission === 'denied' ? (
              <button
                onClick={() =>
                  alert(
                    'Notificações bloqueadas.\nPara ativar: Configurações do navegador → Notificações → Permitir para este site.'
                  )
                }
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-full bg-red-500/20 text-red-300 text-[9px] font-bold uppercase tracking-wider"
                title="Notificações bloqueadas — toque para instruções"
              >
                <BellOff size={14} />
                <span className="hidden sm:inline">Bloqueado</span>
              </button>
            ) : notificationsEnabled ? (
              <button
                onClick={disableNotifications}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-full bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-300 transition-all"
                title="Alertas ativos — toque para desativar"
              >
                <Bell size={16} className="text-yellow-300" />
                <span className="text-[9px] font-bold uppercase tracking-wider hidden sm:inline">
                  Ativo
                </span>
              </button>
            ) : (
              <button
                onClick={requestNotificationPermission}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white text-[10px] font-bold uppercase tracking-wider transition-all border border-white/20"
                title="Ativar alertas de mensagem"
              >
                <BellOff size={14} />
                <span>Alertas</span>
              </button>
            )
          )}

          <button
            onClick={handleLogout}
            className="p-2 hover:bg-white/10 rounded-full text-white/80"
            title="Sair"
          >
            <LogOut size={20} />
          </button>
        </div>
      }
    >
      <div className="flex flex-col h-full bg-white">
        <div className="flex border-b border-slate-100 bg-white px-2">
          {(['open', 'claimed', 'closed'] as ConversationStatus[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`flex-1 py-4 text-[10px] font-extrabold uppercase tracking-[0.2em] border-b-2 transition-all ${
                filter === tab
                  ? 'border-redoma-dark text-redoma-dark'
                  : 'border-transparent text-slate-300 hover:text-slate-500'
              }`}
            >
              {tab === 'open' && 'Novos'}
              {tab === 'claimed' && 'Meus Chats'}
              {tab === 'closed' && 'Histórico'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-200">
              <MessageSquare size={40} className="mb-4 opacity-50" />
              <p className="font-bold text-[10px] uppercase tracking-[0.2em]">
                Sem conversas
              </p>
            </div>
          ) : (
            filteredConversations
              .sort(
                (a, b) =>
                  new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              )
              .map((conv) => {
                const unread = hasUnreadFromClient(conv);
                const memberName = getMemberName(conv);
                const communityName = getCommunityName(conv);

                return (
                  <div
                    key={conv.id}
                    onClick={() => navigate(`/agent/chat/${conv.id}`)}
                    className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-redoma-dark/5 hover:border-redoma-glow transition-all cursor-pointer group relative overflow-hidden"
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-redoma-dark opacity-0 group-hover:opacity-100 transition-opacity" />

                    <div className="flex justify-between items-start gap-4 mb-3">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 group-hover:text-redoma-dark transition-colors truncate">
                          {memberName}
                        </p>
                        <p className="text-xs text-slate-500 mt-1 truncate">
                          {communityName}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {unread && conv.status !== 'closed' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-[9px] font-extrabold uppercase tracking-[0.16em]">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                            Novo
                          </span>
                        )}

                        <span
                          className={`text-[9px] px-2 py-0.5 rounded-md font-extrabold uppercase border ${getStatusColor(
                            conv.status
                          )}`}
                        >
                          {conv.status}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} className="text-redoma-steel" />
                        <span>
                          {new Date(conv.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <User size={12} className="text-redoma-steel" />
                        <span>{conv.claimed_by || 'Não atribuído'}</span>
                      </div>
                    </div>
                  </div>
                );
              })
          )}
        </div>
      </div>
    </ChatLayout>
  );
};

export default AgentInbox;