import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../context/ChatContext';
import { supabasePublic } from '../lib/supabase';
import Logo from '../components/Logo';
import { LayoutGrid, AlertCircle, Loader2, MessageCircle, Users } from 'lucide-react';

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

// normaliza telefone: só dígitos, removendo DDI 55 se vier
const normalizePhone = (phone: string) =>
  phone
    .replace(/\D/g, '') // só dígitos
    .replace(/^55/, ''); // remove DDI Brasil se vier

type Step = 'IDENTITY' | 'COMMUNITY';

type ConversationRow = {
  id: string;
  communityId: string;
  status: string | null;
  created_at: string;
  last_client_seen_at: string | null;
};

type CommunityRowMinimal = {
  id: string;
  name: string;
  slug?: string | null;
  isActive: boolean;
};

const ClientStart: React.FC = () => {
  const navigate = useNavigate();
  const { createConversation, setActiveConversationId } = useChat();

  // garante token do cliente (para outras partes do app)
  useMemo(() => getOrCreateClientToken(), []);

  // dados de identidade vindos do localStorage (se existirem)
  const [fullName, setFullName] = useState<string>(
    () => localStorage.getItem('redoma_full_name') || ''
  );
  const [phone, setPhone] = useState<string>(
    () => localStorage.getItem('redoma_phone') || ''
  );

  // se já tiver nome + telefone, começa direto na tela de comunidades
  const [step, setStep] = useState<Step>(() => {
    const storedName = localStorage.getItem('redoma_full_name');
    const storedPhone = localStorage.getItem('redoma_phone');
    return storedName && storedPhone ? 'COMMUNITY' : 'IDENTITY';
  });

  // erros do step de identidade
  const [fullNameError, setFullNameError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const firstName = useMemo(
    () => fullName.trim().split(' ')[0] || 'amigo',
    [fullName]
  );

  // STEP 2 – Comunidades / conversas
  const [communityInput, setCommunityInput] = useState('');
  const [communityError, setCommunityError] = useState<string | null>(null);
  const [loadingCommunities, setLoadingCommunities] = useState(false);
  const [submittingConversation, setSubmittingConversation] = useState(false);

  const [communitiesUsed, setCommunitiesUsed] = useState<string[]>([]);
  const [activeConversations, setActiveConversations] = useState<ConversationRow[]>([]);
  const [unreadByConvId, setUnreadByConvId] = useState<Record<string, boolean>>({});

  // 🔥 NOVO: mapa communityId -> communityName (pra exibir nome ao invés do ID)
  const [communityNameById, setCommunityNameById] = useState<Record<string, string>>({});
  const [loadingNames, setLoadingNames] = useState(false);

  /* ========= STEP 1: IDENTIDADE (nome + celular) ========= */

  const handleFullNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFullName(e.target.value);
    if (fullNameError) setFullNameError(null);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(e.target.value);
    if (phoneError) setPhoneError(null);
  };

  const handleSubmitIdentity = (e: React.FormEvent) => {
    e.preventDefault();

    const rawName = fullName.trim();
    const phoneNorm = normalizePhone(phone);

    let hasError = false;

    if (!rawName || rawName.length < 2) {
      setFullNameError('Como podemos te chamar?');
      hasError = true;
    }

    // Brasil: geralmente 10 ou 11 dígitos (DDD + número)
    if (!phoneNorm || phoneNorm.length < 10 || phoneNorm.length > 11) {
      setPhoneError('Informe um celular com DDD válido (apenas números).');
      hasError = true;
    }

    if (hasError) return;

    // persiste identidade no localStorage
    localStorage.setItem('redoma_full_name', rawName);
    localStorage.setItem('redoma_phone', phoneNorm);
    setPhone(phoneNorm);

    setStep('COMMUNITY');
  };

  /* ========= NOME DAS COMUNIDADES (map id->name) ========= */

  useEffect(() => {
    const fetchCommunityNames = async () => {
      if (step !== 'COMMUNITY') return;

      setLoadingNames(true);
      try {
        const { data, error } = await supabasePublic
          .from('communities')
          .select('id, name, slug, isActive')
          .eq('isActive', true)
          .order('name', { ascending: true });

        if (error) {
          console.error('[ClientStart] fetch communities (names) error', error);
          setCommunityNameById({});
          return;
        }

        const rows = (data || []) as CommunityRowMinimal[];
        const map: Record<string, string> = {};
        for (const c of rows) {
          if (c?.id && c?.name) map[c.id] = c.name;
        }
        setCommunityNameById(map);
      } finally {
        setLoadingNames(false);
      }
    };

    fetchCommunityNames();
  }, [step]);

  const getCommunityLabel = (communityId: string) => {
    return communityNameById[communityId] || communityId;
  };

  /* ========= STEP 2: BUSCAR CONVERSAS DO USUÁRIO ========= */

  useEffect(() => {
    const fetchCommunitiesAndConversations = async () => {
      if (step !== 'COMMUNITY') return;

      setLoadingCommunities(true);
      setCommunityError(null);

      try {
        const phoneFromState = phone || localStorage.getItem('redoma_phone') || '';
        const phoneNorm = normalizePhone(phoneFromState);

        if (!phoneNorm) {
          setCommunitiesUsed([]);
          setActiveConversations([]);
          setUnreadByConvId({});
          return;
        }

        const { data: members, error: memErr } = await supabasePublic
          .from('members')
          .select('member_id')
          .eq('phone_normalized', phoneNorm);

        if (memErr) {
          console.error('[ClientStart] fetch members by phone error', memErr);
          setCommunityError('Não foi possível carregar suas comunidades.');
          setCommunitiesUsed([]);
          setActiveConversations([]);
          setUnreadByConvId({});
          return;
        }

        if (!members || members.length === 0) {
          setCommunitiesUsed([]);
          setActiveConversations([]);
          setUnreadByConvId({});
          return;
        }

        const memberIds = members.map((m: any) => m.member_id).filter(Boolean);

        if (memberIds.length === 0) {
          setCommunitiesUsed([]);
          setActiveConversations([]);
          setUnreadByConvId({});
          return;
        }

        const { data, error } = await supabasePublic
          .from('conversations')
          .select('id, community_id, status, created_at, last_client_seen_at')
          .in('member_id', memberIds)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('[ClientStart] fetch conversations by memberId error', error);
          setCommunityError('Não foi possível carregar suas comunidades.');
          setCommunitiesUsed([]);
          setActiveConversations([]);
          setUnreadByConvId({});
          return;
        }

        const convs = (data || []) as ConversationRow[];

        const uniqueCommunities = Array.from(
          new Set(convs.map((c) => c.community_id).filter(Boolean))
        );
        setCommunitiesUsed(uniqueCommunities);

        const now = Date.now();
        const twentyFourHoursMs = 24 * 60 * 60 * 1000;

        const active = convs.filter((c) => {
          const created = new Date(c.created_at).getTime();
          const within24h = now - created <= twentyFourHoursMs;
          const isOpen = c.status !== 'closed' && c.status !== 'CLOSED';
          return within24h && isOpen;
        });

        const byCommunity = new Map<string, ConversationRow>();
        for (const c of active) {
          if (!byCommunity.has(c.community_id)) {
            byCommunity.set(c.community_id, c);
          }
        }

        const dedupedActive = Array.from(byCommunity.values());
        setActiveConversations(dedupedActive);

        if (dedupedActive.length === 0) {
          setUnreadByConvId({});
          return;
        }

        const activeIds = dedupedActive.map((c) => c.id);

        const { data: msgs, error: msgErr } = await supabasePublic
          .from('messages')
          .select('conversation_id, sender_type, created_at')
          .in('conversation_id', activeIds)
          .eq('sender_type', 'agent');

        if (msgErr || !msgs) {
          if (msgErr) console.error('[ClientStart] fetch messages for unread error', msgErr);
          setUnreadByConvId({});
          return;
        }

        const unreadMap: Record<string, boolean> = {};
        for (const conv of dedupedActive) {
          const lastSeenTs = conv.last_client_seen_at
            ? new Date(conv.last_client_seen_at).getTime()
            : 0;

          const hasUnread = (msgs as any[]).some((m) => {
            if (m.conversation_id !== conv.id) return false;
            const msgTs = new Date(m.created_at).getTime();
            return msgTs > lastSeenTs;
          });

          unreadMap[conv.id] = hasUnread;
        }

        setUnreadByConvId(unreadMap);
      } finally {
        setLoadingCommunities(false);
      }
    };

    fetchCommunitiesAndConversations();
  }, [step, phone]);

  /* ========= REALTIME: NOVAS MENSAGENS DO SUPORTE ========= */

  useEffect(() => {
    if (step !== 'COMMUNITY') return;
    if (activeConversations.length === 0) return;

    const activeIds = activeConversations.map((c) => c.id);

    const channel = supabasePublic
      .channel(
        `client_start_unread_${normalizePhone(
          phone || localStorage.getItem('redoma_phone') || ''
        )}`
      )
      .on(
        'postgres_changes' as any,
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: 'sender_type=eq.agent',
        },
        (payload: any) => {
          const convId = payload.new?.conversation_id;
          if (!convId) return;
          if (!activeIds.includes(convId)) return;

          setUnreadByConvId((prev) => ({
            ...prev,
            [convId]: true,
          }));
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [step, activeConversations, phone]);

  /* ========= HELPERS PARA CRIAR / REUTILIZAR CONVERSA ========= */

  const startConversationForCommunity = async (communityIdOrSlug: string) => {
    setSubmittingConversation(true);
    setCommunityError(null);

    try {
      const normalizedInput = communityIdOrSlug.trim().toLowerCase();
      const rawName = fullName.trim();
      const phoneNorm = normalizePhone(phone);

      if (!normalizedInput || !rawName || !phoneNorm) {
        setCommunityError('Informe o ID da comunidade, seu nome e celular.');
        return;
      }

      // resolve id OU slug -> id real
      const { data: comm, error: commErr } = await supabasePublic
        .from('communities')
        .select('id, slug')
        .or(`id.eq.${normalizedInput},slug.eq.${normalizedInput}`)
        .maybeSingle();

      if (commErr) throw commErr;

      if (!comm?.id) {
        setCommunityError(
          'O ID está incorreto, verifique com a liderança da sua comunidade ou entre em contato no WhatsApp 11 95825-8734'
        );
        return;
      }

      const resolvedCommunityId = comm.id;

      const existingActive = activeConversations.find(
        (c) => c.community_id === resolvedCommunityId
      );
      if (existingActive) {
        setUnreadByConvId((prev) => ({
          ...prev,
          [existingActive.id]: false,
        }));

        setActiveConversationId(existingActive.id);
        localStorage.setItem('redoma_client_cid', resolvedCommunityId);
        navigate('/client/chat');
        return;
      }

      // cria/recupera member
      const normalizedFullName = normalizeFullName(rawName);

      const { data: memberData, error: memberError } = await supabasePublic
        .from('members')
        .upsert(
          {
            community_id: resolvedCommunityId,
            full_name: rawName,
            full_name_normalized: normalizedFullName,
            phone: phoneNorm,
            phone_normalized: phoneNorm,
          },
          { onConflict: 'community_id,phone_normalized' }
        )
        .select('member_id, community_id, full_name')
        .single();

      if (memberError || !memberData) {
        console.error('[ClientStart] upsert member error', memberError);
        setCommunityError('Não foi possível identificar você. Tente novamente.');
        return;
      }

      // sessão do membro
      const session = {
        memberId: memberData.member_id,
        communityId: memberData.community_id,
        fullName: memberData.full_name,
      };
      localStorage.setItem('redoma_member_session', JSON.stringify(session));
      localStorage.setItem('redoma_client_cid', resolvedCommunityId);

      await createConversation(resolvedCommunityId);
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

  const handleContinueConversation = (conv: ConversationRow) => {
    setUnreadByConvId((prev) => ({
      ...prev,
      [conv.id]: false,
    }));

    setActiveConversationId(conv.id);
    localStorage.setItem('redoma_client_cid', conv.community_id);
    navigate('/client/chat');
  };

  /* ======================= RENDER ======================= */

  const renderIdentityStep = () => (
    <form onSubmit={handleSubmitIdentity} className="p-10 space-y-6 pt-6" autoComplete="on">
      <div className="space-y-2">
        <label
          htmlFor="fullName"
          className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1"
        >
          Como podemos te chamar?
        </label>
        <input
          id="fullName"
          name="fullName"
          autoComplete="name"
          type="text"
          placeholder="Ex: Eduardo, Ju, Dona Maria"
          value={fullName}
          onChange={handleFullNameChange}
          className={`w-full px-5 py-4 rounded-2xl border ${
            fullNameError ? 'border-red-400 bg-red-50/30' : 'border-slate-200 bg-slate-50/50'
          } focus:ring-2 ${fullNameError ? 'focus:ring-red-200' : 'focus:ring-redoma-steel'}
          focus:border-transparent focus:outline-none transition-all placeholder:text-slate-300`}
          required
        />
        {fullNameError && (
          <div className="flex items-start gap-2 mt-1 px-1 animate-in fade-in slide-in-from-top-1">
            <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-[11px] font-semibold text-red-600 leading-tight">
              {fullNameError}
            </p>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <label
          htmlFor="phone"
          className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1"
        >
          Celular com DDD
        </label>
        <input
          id="phone"
          name="phone"
          autoComplete="tel"
          type="tel"
          inputMode="tel"
          placeholder="Ex: 11987654321"
          value={phone}
          onChange={handlePhoneChange}
          className={`w-full px-5 py-4 rounded-2xl border ${
            phoneError ? 'border-red-400 bg-red-50/30' : 'border-slate-200 bg-slate-50/50'
          } focus:ring-2 ${phoneError ? 'focus:ring-red-200' : 'focus:ring-redoma-steel'}
          focus:border-transparent focus:outline-none transition-all placeholder:text-slate-300`}
          required
        />
        {phoneError && (
          <div className="flex items-start gap-2 mt-1 px-1 animate-in fade-in slide-in-from-top-1">
            <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-[11px] font-semibold text-red-600 leading-tight">
              {phoneError}
            </p>
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={!fullName.trim() || !normalizePhone(phone)}
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
      {/* Saudação */}
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          Bem-vindo de volta
        </p>
        <h2 className="text-xl font-semibold text-slate-900 mt-1">
          Olá, <span className="text-redoma-steel">{firstName}</span>!
        </h2>
      </div>

      {/* erros gerais */}
      {communityError && (
        <div className="flex items-start gap-2 mt-1 px-1 animate-in fade-in slide-in-from-top-1">
          <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-[11px] font-semibold text-red-600 leading-tight">
            {communityError}
          </p>
        </div>
      )}

      <div className="space-y-6">
        {/* Conversas ativas */}
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
              {activeConversations.map((conv) => {
                const hasUnread = !!unreadByConvId[conv.id];
                const label = getCommunityLabel(conv.community_id);

                return (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => handleContinueConversation(conv)}
                    className="w-full flex items-center justify-between rounded-2xl border border-redoma-steel/10 bg-slate-50 px-4 py-3 text-left text-[11px] text-slate-700 hover:border-redoma-steel/40 hover:bg-redoma-steel/5 transition"
                  >
                    <span className="truncate">
                      Comunidade: <span className="font-semibold">{label}</span>
                    </span>

                    <span className="flex items-center gap-2">
                      {hasUnread && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[9px] font-extrabold tracking-[0.18em]">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                          NOVA RESPOSTA
                        </span>
                      )}
                      <span className="text-[10px] uppercase tracking-widest text-redoma-steel font-bold">
                        Continuar
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Botão para catálogo */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => navigate('/client/communities')}
            className="w-full flex items-center justify-center gap-3 bg-white text-redoma-dark border-2 border-redoma-dark/10 p-4 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-redoma-dark hover:text-white transition-all group"
          >
            <Users size={18} className="group-hover:scale-110 transition-transform" />
            Conheça as comunidades e projetos sociais que apoiamos
          </button>

          {loadingNames ? (
            <p className="text-[11px] text-slate-400">
              Carregando catálogo...
            </p>
          ) : null}
        </div>

        {/* Comunidades em que já contribuiu */}
        <div className="space-y-3">
          <p className="text-sm text-slate-500">
            Qual comunidade deseja contribuir hoje?
          </p>

          {loadingCommunities ? (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Loader2 className="animate-spin" size={14} />
              Carregando comunidades...
            </div>
          ) : communitiesUsed.length > 0 ? (
            <>
              <p className="text-[11px] text-slate-500">
                Comunidades apoiadas recentemente:
              </p>
              <div className="flex flex-wrap gap-2">
                {communitiesUsed.map((cid) => (
                  <button
                    key={cid}
                    type="button"
                    onClick={() => handleSelectExistingCommunity(cid)}
                    className="px-3 py-1.5 rounded-full border border-slate-200 text-[11px] text-slate-700 hover:border-redoma-steel hover:text-redoma-steel transition"
                    title={cid}
                  >
                    {getCommunityLabel(cid)}
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </div>

        {/* Outra comunidade */}
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

      <div className="px-10 pb-6 pt-0 flex justify-between items-center border-t border-slate-100 mt-4">
        <button
          type="button"
          onClick={() => setStep('IDENTITY')}
          className="text-[10px] text-slate-400 hover:text-slate-600 uppercase tracking-widest"
        >
          Trocar dados
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
            <LayoutGrid size={18} className="group-hover:scale-110 transition-transform" />
            Parceiros & Cashback
          </button>
        </div>

        {step === 'IDENTITY' ? renderIdentityStep() : renderCommunityStep()}
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