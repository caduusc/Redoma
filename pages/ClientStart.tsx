
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../context/ChatContext';
import Logo from '../components/Logo';
import { LayoutGrid } from 'lucide-react';

const ClientStart: React.FC = () => {
  const [communityId, setCommunityId] = useState('');
  const { createConversation } = useChat();
  const navigate = useNavigate();

  // Fix: handleStart must be async because createConversation returns a Promise<string>
  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (communityId.trim()) {
      // Fix: added await to resolve the promise returned by createConversation, fixing the type mismatch on line 19
      const convId = await createConversation(communityId);
      localStorage.setItem('redoma_client_cid', communityId);
      localStorage.setItem('redoma_client_token', Math.random().toString(36).substring(7));
      localStorage.setItem('redoma_active_conv', convId);
      navigate('/client/chat');
    }
  };

  return (
    <div className="min-h-screen bg-redoma-light flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Subtler decorative background glow */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-redoma-steel/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-redoma-steel/5 rounded-full blur-[120px]" />

      <div className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl shadow-redoma-dark/5 overflow-hidden relative z-10 border border-slate-100">
        <div className="p-10 bg-redoma-dark text-white text-center">
          <Logo size={80} className="mb-6 drop-shadow-xl" />
          <h1 className="text-3xl font-bold tracking-tight">Redoma Tech</h1>
          <p className="text-redoma-glow text-sm mt-3 font-medium">Crescimento Inteligente para comunidades</p>
        </div>
        
        <div className="px-10 py-6 border-b border-slate-50 bg-slate-50/30">
          <button 
            onClick={() => navigate('/client/providers')}
            className="w-full flex items-center justify-center gap-3 bg-white text-redoma-dark border-2 border-redoma-dark/10 p-4 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-redoma-dark hover:text-white transition-all group"
          >
            <LayoutGrid size={18} className="group-hover:scale-110 transition-transform" />
            Parceiros & Cashback
          </button>
        </div>

        <form onSubmit={handleStart} className="p-10 space-y-6 pt-6">
          <div className="space-y-2">
            <label htmlFor="community" className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">ID da Comunidade</label>
            <input
              id="community"
              type="text"
              placeholder="Ex: unidos-somos-fortes"
              value={communityId}
              onChange={(e) => setCommunityId(e.target.value)}
              className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-redoma-steel focus:border-transparent focus:outline-none transition-all placeholder:text-slate-300 bg-slate-50/50"
              required
            />
          </div>
          
          <button
            type="submit"
            className="w-full bg-redoma-dark text-white font-bold py-4 rounded-2xl hover:bg-redoma-navy transition-all shadow-lg active:scale-[0.98] uppercase tracking-widest text-xs"
          >
            Iniciar Atendimento
          </button>
          
          <p className="text-center text-[11px] text-slate-400 leading-relaxed font-medium">
            Conectando você à rede de suporte Redoma.<br/>
            Segurança e agilidade para sua comunidade.
          </p>
        </form>
      </div>
      
      <div className="mt-8 flex gap-6">
        <button 
          onClick={() => navigate('/agent/login')}
          className="text-redoma-steel font-bold hover:text-redoma-dark transition-colors text-[10px] uppercase tracking-widest"
        >
          Acesso Suporte
        </button>
        <div className="w-px h-3 bg-slate-300 mt-0.5" />
        <button 
          onClick={() => navigate('/admin/login')}
          className="text-redoma-steel font-bold hover:text-redoma-dark transition-colors text-[10px] uppercase tracking-widest"
        >
          Gestão Master
        </button>
      </div>
    </div>
  );
};

export default ClientStart;
