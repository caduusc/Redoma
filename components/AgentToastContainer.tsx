import React, { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, MessageSquare } from 'lucide-react';
import { useChat } from '../context/ChatContext';

// Toast simples, sempre dentro do app (desktop e mobile/PWA)
// Não depende de Notification API.

const AgentToastContainer: React.FC = () => {
  const navigate = useNavigate();
  const { agentToast, dismissAgentToast, currentUser } = useChat();

  const isAgent = useMemo(() => !!currentUser, [currentUser]);

  // Fecha com ESC no desktop
  useEffect(() => {
    if (!agentToast) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismissAgentToast();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [agentToast, dismissAgentToast]);

  if (!isAgent || !agentToast) return null;

  const handleOpen = () => {
    const convId = agentToast.conversationId;
    dismissAgentToast();
    if (convId) navigate(`/agent/chat/${convId}`);
  };

  return (
    <div className="fixed top-4 right-4 z-[9999]">
      <div
        className="w-[320px] max-w-[90vw] rounded-2xl shadow-2xl border border-slate-200 bg-white overflow-hidden"
        role="status"
        aria-live="polite"
      >
        <div className="flex items-start gap-3 p-4">
          <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-redoma-dark/10 text-redoma-dark">
            <MessageSquare size={18} />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-extrabold text-redoma-dark tracking-tight">
              {agentToast.title}
            </p>
            <p className="mt-1 text-[11px] text-slate-500 leading-snug break-words">
              {agentToast.body}
            </p>

            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={handleOpen}
                className="px-3 py-2 rounded-xl bg-redoma-dark text-white text-[10px] font-extrabold uppercase tracking-widest hover:bg-redoma-navy active:scale-[0.98] transition-all"
              >
                Abrir chat
              </button>
              <button
                onClick={dismissAgentToast}
                className="px-3 py-2 rounded-xl bg-slate-100 text-slate-500 text-[10px] font-extrabold uppercase tracking-widest hover:bg-slate-200 active:scale-[0.98] transition-all"
              >
                Fechar
              </button>
            </div>
          </div>

          <button
            onClick={dismissAgentToast}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-400"
            title="Fechar"
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgentToastContainer;
