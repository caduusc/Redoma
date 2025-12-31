import React, { useState, useEffect } from 'react';
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

// normaliza nome: tira acento, múltiplos espaços, deixa minúsculo
const normalizeFullName = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .trim()
    .replace(/\s+/g, ' ') // colapsa espaços
    .toLowerCase();

const ClientStart: React.FC = () => {
  const [communityId, setCommunityId] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { createConversation } = useChat();
  const navigate = useNavigate();

  // 🔁 Se já tiver sessão & conversa ativa, pula direto pro chat
  useEffect(() => {
    const memberSession = localStorage.getItem('redoma_member_session');
    const activeConv = localStorage.getItem('redoma_active_conv');
    const community = localStorage.getItem('redoma_client_cid');

    if (memberSession && activeConv && community) {
      navigate('/client/chat');
    }
  }, [navigate]);

  const handleCommunityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCommunityId(e.target.value);
    if (error) setError(null);
  };

  const handleFullNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFullName(e.target.value);
    if (error) setError(null);
  };

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedId = communityId.trim().toLowerCase();
    const rawName = fullName.trim();

    if (!normalizedId || !rawName) return;

    setLoading(true);
    setError(null);

    try {
      getOrCreateClientToken();

      // 1) Valida se a comunidade existe
      const { data, error: sbError } = await supabasePublic
        .from('communities')
        .select('id')
        .eq('id', normalizedId)
        .maybeSingle();

      if (sbError) throw sbError;

      if (!data) {
        setError(
          'O ID está incorreto, verifique com a liderança da sua comunidade ou entre em contato no WhatsApp 11 95825-8734'
        );
        return;
      }

      // 2) Cria / recupera membro na tabela members (community_id + full_name_normalized)
      const normalizedFullName = normalizeFullName(rawName);

      const { data: memberData, error: memberError } = await supabasePublic
        .from('members')
        .upsert(
          {
            community_id: normalizedId,
            full_name: rawName,
            full_name_normalized: normalizedFullName,
          },
          {
            onConflict: 'community_id,full_name_normalized',
          }
        )
        .select('member_id, community_id, full_name')
        .single();

      if (memberError || !memberData) {
        console.error('[ClientStart] upsert member error', memberError);
        setError('Não foi possível identificar você. Tente novamente.');
        return;
      }

      // 3) Salva sessão do membro (usada depois por createConversation)
      const session = {
        memberId: memberData.member_id,
        communityId: memberData.community_id,
        fullName: memberData.full_name,
      };
      localStorage.setItem('redoma_member_session', JSON.stringify(session));

      // 4) Mantém compatibilidade com o resto do app
      localStorage.setItem('redoma_client_cid', normalizedId);

      // 5) Cria conversa já amarrada ao memberId (via ChatContext.createConversation)
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
      {/* fundos decorativos NÃO interceptam mais clique */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-redoma-steel/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-redoma-steel/5 rounded-full blur-[120px] pointer-events-none" />

      {/* card principal */}
      <div className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl shadow-redoma-dark/5 overflow-hidden relative z-10 border border-slate-100">
        <div className="p-10 bg-redoma-dark text-white text-center">
          <Logo size={80} className="mb-6 drop-shadow-xl" />
          <h1 className="text-3xl font-bold tracking-tight">Redoma Tech</h1>
          <p className="text-redoma-glow text-sm mt-3 font-medium">
            Crescimento Inteligente para comunidades
          </p>
        </div>

        <div className="px-10 py-6 border-b border-slate-50 bg-slate-50/30">
          <button
            type="button"
            onClick={() => navigate('/client/providers')}
            className="w-full flex items-center justify-center gap-3 bg-white text-redoma-dark border-2 border-redoma-dark/10 p-4 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-redoma-dark hover:text-white transition-all group"
          >
            <LayoutGrid size={18} className="group-hover:scale-110 transition-transform" />
            Parceiros & Cashback
          </button>
        </div>

        <form onSubmit={handleStart} className="p-10 space-y-6 pt-6">
          <div className="space-y-2">
            <label
              htmlFor="community"
              className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1"
            >
              ID da Comunidade
            </label>
            <input
              id="community"
              type="text"
              placeholder="Ex: unidos-somos-fortes"
              value={communityId}
              onChange={handleCommunityChange}
              disabled={loading}
              className={`w-full px-5 py-4 rounded-2xl border ${
                error ? 'border-red-400 bg-red-50/30' : 'border-slate-200 bg-slate-50/50'
              } focus:ring-2 ${
                error ? 'focus:ring-red-200' : 'focus:ring-redoma-steel'
              } focus:border-transparent focus:outline-none transition-all placeholder:text-slate-300`}
              required
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="fullName"
              className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1"
            >
              Nome completo
            </label>
            <input
              id="fullName"
              type="text"
              placeholder="Ex: João da Silva Souza"
              value={fullName}
              onChange={handleFullNameChange}
              disabled={loading}
              className={`w-full px-5 py-4 rounded-2xl border ${
                error ? 'border-red-400 bg-red-50/30' : 'border-slate-200 bg-slate-50/50'
              } focus:ring-2 ${
                error ? 'focus:ring-red-200' : 'focus:ring-redoma-steel'
              } focus:border-transparent focus:outline-none transition-all placeholder:text-slate-300`}
              required
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 mt-2 px-1 animate-in fade-in slide-in-from-top-1">
              <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-[11px] font-semibold text-red-600 leading-tight">
                {error}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !communityId.trim() || !fullName.trim()}
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

      {/* footer de navegação – também acima dos fundos */}
      <div className="mt-8 flex gap-6 relative z-10">
        <button
          type="button"
          onClick={() => navigate('/agent/login')}
          className="text-redoma-steel font-bold hover:text-redoma-dark transition-colors text-[10px] uppercase tracking-widest px-1 py-2"
        >
          Acesso Suporte
        </button>
        <div className="w-px h-3 bg-slate-300 mt-0.5" />
        <button
          type="button"
          onClick={() => navigate('/admin/login')}
          className="text-redoma-steel font-bold hover:text-redoma-dark transition-colors text-[10px] uppercase tracking-widest px-1 py-2"
        >
          Gestão Master
        </button>
      </div>
    </div>
  );
};

export default ClientStart;
