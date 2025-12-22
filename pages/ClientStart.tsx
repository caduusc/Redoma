import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../context/ChatContext';
import { supabasePublic } from '../lib/supabase';
import Logo from '../components/Logo';
import { LayoutGrid, AlertCircle, Loader2 } from 'lucide-react';

const getOrCreateClientToken = () => {
  const existing = localStorage.getItem('redoma_client_token');
  if (existing) return existing;

  const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
  localStorage.setItem('redoma_client_token', token);
  return token;
};

const ClientStart: React.FC = () => {
  const [communityId, setCommunityId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { createConversation } = useChat();
  const navigate = useNavigate();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCommunityId(e.target.value);
    if (error) setError(null);
  };

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedId = communityId.trim().toLowerCase();
    if (!normalizedId) return;

    setLoading(true);
    setError(null);

    try {
      getOrCreateClientToken();

      const { data, error: sbError } = await supabasePublic
        .from('communities')
        .select('id')
        .eq('id', normalizedId)
        .maybeSingle();

      if (sbError) throw sbError;

      if (!data) {
        setError(
          'O ID está incorreto, verifique com a liderança da sua comunidade ou entre em contato no numero 11 97189-1760'
        );
        return;
      }

      localStorage.setItem('redoma_client_cid', normalizedId);

      // ✅ createConversation já seta o activeConvId de forma reativa no Provider
      await createConversation(normalizedId);

      navigate('/client/chat');
    } catch (err) {
      console.error('Erro na validação:', err);
      setError('Não foi possível validar agora. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-redoma-light flex flex-col items-center justify-center p-6 relative overflow-hidden">
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
            <label htmlFor="community" className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">
              ID da Comunidade
            </label>
            <input
              id="community"
              type="text"
              placeholder="Ex: unidos-somos-fortes"
              value={communityId}
              onChange={handleInputChange}
              disabled={loading}
              className={`w-full px-5 py-4 rounded-2xl border ${
                error ? 'border-red-400 bg-red-50/30' : 'border-slate-200 bg-slate-50/50'
              } focus:ring-2 ${error ? 'focus:ring-red-200' : 'focus:ring-redoma-steel'} focus:border-transparent focus:outline-none transition-all placeholder:text-slate-300`}
              required
            />
            {error && (
              <div className="flex items-start gap-2 mt-2 px-1 animate-in fade-in slide-in-from-top-1">
                <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-[11px] font-semibold text-red-600 leading-tight">{error}</p>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !communityId.trim()}
            className="w-full bg-redoma-dark text-white font-bold py-4 rounded-2xl hover:bg-redoma-navy transition-all shadow-lg active:scale-[0.98] uppercase tracking-widest text-xs disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Validando...</span>
              </>
            ) : (
              <span>Iniciar Atendimento</span>
            )}
          </button>

          <p className="text-center text-[11px] text-slate-400 leading-relaxed font-medium">
            Conectando você à rede de suporte Redoma.
            <br />
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
