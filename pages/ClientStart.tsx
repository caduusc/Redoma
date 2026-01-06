import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../context/ChatContext';
import { supabasePublic } from '../lib/supabase';
import Logo from '../components/Logo';
import { LayoutGrid, AlertCircle, Loader2, MessageCircle } from 'lucide-react';

const getOrCreateClientToken = () => {
  const existing = localStorage.getItem('redoma_client_token');
  if (existing) return existing;

  const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
  localStorage.setItem('redoma_client_token', token);
  return token;
};

// normaliza nome: tira acentos, múltiplos espaços, deixa minúsculo
const normalizeFullName = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .trim()
    .replace(/\s+/g, ' ') // colapsa espaços
    .toLowerCase();

type Step = 'NAME' | 'COMMUNITY';

type ConversationRow = {
  id: string;
  communityId: string;
  status: string | null;
  createdAt: string;
};

const ClientStart: React.FC = () => {
  const navigate = useNavigate();
  const { createConversation, setActiveConversationId } = useChat();

  // garante token do cliente
  const clientToken = useMemo(() => getOrCreateClientToken(), []);

  const [step, setStep] = useState<Step>('NAME');

  // STEP 1 – Nome
  const [fullName, setFullName] = useState('');
  const [fullNameError, setFullNameError] = useState<string | null>(null);

  const firstName = useMemo(
    () => fullName.trim().split(' ')[0] || 'amigo',
    [fullName],
  );

  // STEP 2 – Comunidades / conversas
  const [communityInput, setCommunityInput] = useState('');
  const [communityError, setCommunityError] = useState<string | null>(null);
  const [loadingCommunities, setLoadingCommunities] = useState(false);
  const [submittingConversation, setSubmittingConversation] = useState(false);

  const [communitiesUsed, setCommunitiesUsed] = useState<string[]>([]);
  const [activeConversations, setActiveConversations] = useState<ConversationRow[]>([]);

  // 🔁 Se já tiver sessão & conversa ativa, pula direto pro chat
  useEffect(() => {
    const memberSession = localStorage.getItem('redoma_member_session');
    const activeConv = localStorage.getItem('redoma_active_conv');
    const community = localStorage.getItem('redoma_client_cid');

    if (memberSession && activeConv && community) {
      navigate('/client/chat');
    }
  }, [navigate]);

  /* ========= STEP 1: NOME ========= */

  const handleFullNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFullName(e.target.value);
    if (fullNameError) setFullNameError(null);
  };

  const handleSubmitName = (e: React.FormEvent) => {
    e.preventDefault();

    const rawName = fullName.trim();
    if (!rawName || rawName.length < 3) {
      setFullNameError('Por favor, preencha seu nome completo.');
      return;
    }

    localStorage.setItem('redoma_full_name', rawName);
    setStep('COMMUNITY');
  };

  /* ========= STEP 2: BUSCAR COMUNIDADES / CONVERSAS ========= */

  useEffect(() => {
    const fetchCommunitiesAndConversations = async () => {
      if (step !== 'COMMUNITY') return;

      setLoadingCommunities(true);
      setCommunityError(null);

      try {
        const { data, error } = await supabasePublic
          .from('conversations')
          .select('id, communityId, status, createdAt')
          .eq('client_token', clientToken)
          .order('createdAt', { ascending: false });

        if (error) {
          console.error('[ClientStart] fetch conversations error', error);
          setCommunityError('Não foi possível carregar suas comunidades.');
          return;
        }

        const convs = (data || []) as ConversationRow[];

        // comunidades já usadas (únicas)
        const uniqueCommunities = Array.from(
          new Set(convs.map((c) => c.communityId).filter(Boolean)),
        );
        setCommunitiesUsed(uniqueCommunities);

        // conversas ativas nas últimas 24h
        const now = Date.now();
        const twentyFourHoursMs = 24 * 60 * 60 * 1000;

        const active = convs.filter((c) => {
          const created = new Date(c.createdAt).getTime();
          const within24h = now - created <= twentyFourHoursMs;
          const isOpen = c.status !== 'closed' && c.status !== 'CLOSED';
          return within24h && isOpen;
        });

        setActiveConversations(active);
      } finally {
        setLoadingCommunities(false);
      }
    };

    fetchCommunitiesAndConversations();
  }, [step, clientToken]);

  /* ========= HELPERS PARA CRIAR CONVERSA NOVA ========= */

  const startConversationForCommunity = async (communityId: string) => {
    setSubmittingConversation(true);
    setCommunityError(null);

    try {
      const normalizedId = communityId.trim().toLowerCase();
      const rawName = fullName.trim();

      if (!normalizedId || !rawName) {
        setCommunityError('Informe o ID da comunidade e seu nome.');
        return;
      }

      // 1) Valida se a comunidade existe
      const { data, error: sbError } = await supabasePublic
        .from('communities')
        .select('id')
        .eq('id', normalizedId)
        .maybeSingle();

      if (sbError) throw sbError;

      if (!data) {
        setCommunityError(
          'O ID está incorreto, verifique com a liderança da sua comunidade ou entre em contato no WhatsApp 11 95825-8734',
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
          },
        )
        .select('member_id, community_id, full_name')
        .single();

      if (memberError || !memberData) {
        console.error('[ClientStart] upsert member error', memberError);
        setCommunityError('Não foi possível identificar você. Tente novamente.');
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
      console.error('Erro ao iniciar conversa:', err);
      setCommunityError('Não foi possível iniciar sua conversa. Tente novamente.');
    } finally {
      setSubmittingConversation(false);
    }
  };

  const handleSelectExistingCommunity = (communityId: string) => {
    startConversationForCommunity(communityId);
  };

  const handleSubmitNewCommunity = (e: React.FormEvent) => {
    e.preventDefault();
    startConversationForCommunity(communityInput);
  };

  /* ========= CONTINUAR CONVERSA ATIVA (últimas 24h) ========= */

  const handleContinueConversation = (conv: ConversationRow) => {
    setActiveConversationId(conv.id);
    localStorage.setItem('redoma_client_cid', conv.communityId);
    navigate('/client/chat');
  };

  /* ======================= RENDER ======================= */

  const renderNameStep = () => (
    <form onSubmit={handleSubmitName} className="p-10 space-y-6 pt-6">
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
          className={`w-full px-5 py-4 rounded-2xl border ${
            fullNameError ? 'border-red-400 bg-red-50/30' : 'border-slate-200 bg-slate-50/50'
          } focus:ring-2 ${
            fullNameError ? 'focus:ring-red-200' : 'focus:ring-redoma-steel'
          } focus:border-transparent focus:outline-none transition-all placeholder:text-slate-300`}
          required
        />
      </div>

      {fullNameError && (
        <div className="flex items-start gap-2 mt-2 px-1 animate-in fade-in slide-in-from-top-1">
          <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-[11px] font-semibold text-red-600 leading-tight">
            {fullNameError}
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={!fullName.trim()}
        className="w-full bg-redoma-dark text-white font-bold py-4 rounded-2xl hover:bg-redoma-navy transition-all shadow-lg active:scale-[0.98] uppercase tracking-widest text-xs disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <span>Continuar</span>
      </button>

      <p className="text-center text-[11px] text-slate-400 leading-relaxed font-medium">
        Conectando você à rede de suporte Redoma.
        <br />
        Segurança e agilidade para sua comunidade.
      </p>
    </form>
  );

  const renderCommunityStep = () => (
    <div className="p-10 space-y-6 pt-6">
      <div className="mb-2">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          Bem-vindo de volta
        </p>
        <h2 className="text-xl font-semibold text-slate-900 mt-1">
          Olá, <span className="text-redoma-steel">{firstName}</span>!
        </h2>
        <p className="text-sm text-slate-500">
          Qual comunidade deseja contribuir hoje?
        </p>
      </div>

      {communityError && (
        <div className="flex items-start gap-2 mt-1 px-1 animate-in fade-in slide-in-from-top-1">
          <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-[11px] font-semibold text-red-600 leading-tight">
            {communityError}
          </p>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6 mt-2">
        {/* Conversas ativas (últimas 24h) */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <MessageCircle size={16} className="text-redoma-steel" />
            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-widest">
              Conversas ativas (últimas 24h)
            </h3>
          </div>

          {loadingCommunities ? (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Loader2 className="animate-spin" size={14} />
              Carregando suas conversas...
            </div>
          ) : activeConversations.length === 0 ? (
            <p className="text-[11px] text-slate-400">
              Você não possui conversas ativas no momento.
            </p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {activeConversations.map((conv) => (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => handleContinueConversation(conv)}
                  className="w-full flex items-center justify-between rounded-2xl border border-redoma-steel/10 bg-slate-50 px-4 py-3 text-left text-[11px] text-slate-700 hover:border-redoma-steel/40 hover:bg-redoma-steel/5 transition"
                >
                  <span className="truncate">
                    Comunidade:{' '}
                    <span className="font-semibold">{conv.communityId}</span>
                  </span>
                  <span className="text-[10px] uppercase tracking-widest text-redoma-steel font-bold">
                    Continuar
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Comunidades usadas + nova comunidade */}
        <div className="space-y-4">
          <div>
            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-widest">
              Comunidades em que você já contribuiu
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              Clique para iniciar uma nova conversa nessa comunidade.
            </p>
          </div>

          {loadingCommunities ? (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Loader2 className="animate-spin" size={14} />
              Carregando comunidades...
            </div>
          ) : communitiesUsed.length === 0 ? (
            <p className="text-[11px] text-slate-400">
              Ainda não encontramos contribuições anteriores. Comece informando o ID de uma comunidade.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {communitiesUsed.map((cid) => (
                <button
                  key={cid}
                  type="button"
                  onClick={() => handleSelectExistingCommunity(cid)}
                  className="px-3 py-1.5 rounded-full border border-slate-200 text-[11px] text-slate-700 hover:border-redoma-steel hover:text-redoma-steel transition"
                >
                  {cid}
                </button>
              ))}
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 space-y-3">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
              Outra comunidade
            </p>
            <form className="space-y-2" onSubmit={handleSubmitNewCommunity}>
              <input
                type="text"
                placeholder="Ex: unidos-somos-fortes"
                value={communityInput}
                onChange={(e) => {
                  setCommunityInput(e.target.value);
                  if (communityError) setCommunityError(null);
                }}
                disabled={submittingConversation}
                className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50/50 focus:ring-2 focus:ring-redoma-steel focus:border-transparent focus:outline-none transition-all placeholder:text-slate-300 text-sm"
              />
              <button
                type="submit"
                disabled={submittingConversation || !communityInput.trim()}
                className="w-full bg-redoma-dark text-white font-bold py-4 rounded-2xl hover:bg-redoma-navy transition-all shadow-lg active:scale-[0.98] uppercase tracking-widest text-xs disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submittingConversation ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Iniciando...</span>
                  </>
                ) : (
                  <span>Iniciar novo atendimento</span>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="px-10 pb-6 pt-0 flex justify-between items-center border-t border-slate-100">
        <button
          type="button"
          onClick={() => setStep('NAME')}
          className="text-[10px] text-slate-400 hover:text-slate-600 uppercase tracking-widest"
        >
          Trocar nome
        </button>
        <p className="text-[10px] text-slate-400">
          Conectando você à rede de suporte Redoma.
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-redoma-light flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* fundos decorativos */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-redoma-steel/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-redoma-steel/5 rounded-full blur-[120px] pointer-events-none" />

      {/* card principal */}
      <div className="w-full max-w-3xl bg-white rounded-[2rem] shadow-2xl shadow-redoma-dark/5 overflow-hidden relative z-10 border border-slate-100">
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
            <LayoutGrid
              size={18}
              className="group-hover:scale-110 transition-transform"
            />
            Parceiros & Cashback
          </button>
        </div>

        {step === 'NAME' ? renderNameStep() : renderCommunityStep()}
      </div>

      {/* footer de navegação */}
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
