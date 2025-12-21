
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../context/ChatContext';
import ChatLayout from '../components/ChatLayout';
import { ConversationStatus } from '../types';
import { MessageSquare, Clock, User, LogOut } from 'lucide-react';

const AgentInbox: React.FC = () => {
  const { conversations, logout, currentUser } = useChat();
  const [filter, setFilter] = useState<ConversationStatus>('open');
  const navigate = useNavigate();

  const filteredConversations = conversations.filter(c => {
    if (filter === 'claimed') return c.status === 'claimed' && c.claimedBy === currentUser?.name;
    return c.status === filter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'claimed': return 'bg-redoma-steel/10 text-redoma-steel border-redoma-steel/20';
      case 'closed': return 'bg-slate-100 text-slate-400 border-slate-200';
      default: return 'bg-slate-100 text-slate-500';
    }
  };

  return (
    <ChatLayout 
      title="Gestão de Atendimentos" 
      isAgent 
      actions={
        <button 
          onClick={() => { logout(); navigate('/agent/login'); }}
          className="p-2 hover:bg-white/10 rounded-full text-white/80"
          title="Sair"
        >
          <LogOut size={20} />
        </button>
      }
    >
      <div className="flex flex-col h-full bg-white">
        {/* Tabs */}
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

        {/* List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-200">
              <MessageSquare size={40} className="mb-4 opacity-50" />
              <p className="font-bold text-[10px] uppercase tracking-[0.2em]">Sem conversas</p>
            </div>
          ) : (
            filteredConversations.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(conv => (
              <div 
                key={conv.id}
                onClick={() => navigate(`/agent/chat/${conv.id}`)}
                className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-redoma-dark/5 hover:border-redoma-glow transition-all cursor-pointer group relative overflow-hidden"
              >
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-redoma-dark opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex justify-between items-start mb-3">
                  <span className="font-bold text-slate-800 group-hover:text-redoma-dark transition-colors">
                    {conv.communityId}
                  </span>
                  <span className={`text-[9px] px-2 py-0.5 rounded-md font-extrabold uppercase border ${getStatusColor(conv.status)}`}>
                    {conv.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                  <div className="flex items-center gap-1.5">
                    <Clock size={12} className="text-redoma-steel" />
                    <span>{new Date(conv.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  {conv.claimedBy && (
                    <div className="flex items-center gap-1.5">
                      <User size={12} className="text-redoma-steel" />
                      <span>{conv.claimedBy}</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </ChatLayout>
  );
};

export default AgentInbox;
