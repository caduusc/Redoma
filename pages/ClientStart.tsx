import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../context/ChatContext';
import { supabasePublic } from '../lib/supabase';
import Logo from '../components/Logo';
import { LayoutGrid, AlertCircle, Loader2, MessageCircle, Users } from 'lucide-react';

/* ===================== HELPERS ===================== */

const getOrCreateClientToken = () => {
  const existing = localStorage.getItem('redoma_client_token');
  if (existing) return existing;

  const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
  localStorage.setItem('redoma_client_token', token);
  return token;
};

const normalizeFullName = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();

const normalizePhone = (phone: string) =>
  phone.replace(/\D/g, '').replace(/^55/, '');

type Step = 'IDENTITY' | 'COMMUNITY';

type ConversationRow = {
  id: string;
  community_id: string;
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

/* ===================== COMPONENT ===================== */

const ClientStart: React.FC = () => {
  const navigate = useNavigate();
  const { createConversation, setActiveConversationId } = useChat();

  useMemo(() => getOrCreateClientToken(), []);

  const [fullName, setFullName] = useState(
    () => localStorage.getItem('redoma_full_name') || ''
  );
  const [phone, setPhone] = useState(
    () => localStorage.getItem('redoma_phone') || ''
  );

  const [step, setStep] = useState<Step>(() => {
    const storedName = localStorage.getItem('redoma_full_name');
    const storedPhone = localStorage.getItem('redoma_phone');
    return storedName && storedPhone ? 'COMMUNITY' : 'IDENTITY';
  });

  const [fullNameError, setFullNameError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const firstName = useMemo(
    () => fullName.trim().split(' ')[0] || 'amigo',
    [fullName]
  );

  const [communityInput, setCommunityInput] = useState('');
  const [communityError, setCommunityError] = useState<string | null>(null);
  const [loadingCommunities, setLoadingCommunities] = useState(false);
  const [submittingConversation, setSubmittingConversation] = useState(false);

  const [communitiesUsed, setCommunitiesUsed] = useState<string[]>([]);
  const [activeConversations, setActiveConversations] = useState<ConversationRow[]>([]);
  const [unreadByConvId, setUnreadByConvId] = useState<Record<string, boolean>>({});

  const [communityNameById, setCommunityNameById] = useState<Record<string, string>>({});
  const [loadingNames, setLoadingNames] = useState(false);

  /* ===================== STEP 1 ===================== */

  const handleSubmitIdentity = (e: React.FormEvent) => {
    e.preventDefault();

    const rawName = fullName.trim();
    const phoneNorm = normalizePhone(phone);

    let hasError = false;

    if (rawName.length < 2) {
      setFullNameError('Como podemos te chamar?');
      hasError = true;
    }

    if (phoneNorm.length < 10 || phoneNorm.length > 11) {
      setPhoneError('Informe um celular com DDD válido.');
      hasError = true;
    }

    if (hasError) return;

    localStorage.setItem('redoma_full_name', rawName);
    localStorage.setItem('redoma_phone', phoneNorm);
    setPhone(phoneNorm);
    setStep('COMMUNITY');
  };

  /* ===================== COMMUNITY NAMES ===================== */

  useEffect(() => {
    if (step !== 'COMMUNITY') return;

    const fetchCommunityNames = async () => {
      setLoadingNames(true);
      const { data, error } = await supabasePublic
        .from('communities')
        .select('id, name')
        .eq('isActive', true)
        .order('name');

      if (!error && data) {
        const map: Record<string, string> = {};
        data.forEach((c) => {
          map[c.id] = c.name;
        });
        setCommunityNameById(map);
      }

      setLoadingNames(false);
    };

    fetchCommunityNames();
  }, [step]);

  const getCommunityLabel = (community_id: string) =>
    communityNameById[community_id] || community_id;

  /* ===================== FETCH CONVERSATIONS ===================== */

  useEffect(() => {
    if (step !== 'COMMUNITY') return;

    const fetchData = async () => {
      setLoadingCommunities(true);
      setCommunityError(null);

      const phoneNorm = normalizePhone(phone || '');
      if (!phoneNorm) {
        setLoadingCommunities(false);
        return;
      }

      const { data: members } = await supabasePublic
        .from('members')
        .select('member_id')
        .eq('phone_normalized', phoneNorm);

      if (!members?.length) {
        setLoadingCommunities(false);
        return;
      }

      const memberIds = members.map((m) => m.member_id);

      const { data: convs, error } = await supabasePublic
        .from('conversations')
        .select('id, community_id, status, created_at, last_client_seen_at')
        .in('member_id', memberIds)
        .order('created_at', { ascending: false });

      if (error || !convs) {
        setCommunityError('Não foi possível carregar suas conversas.');
        setLoadingCommunities(false);
        return;
      }

      setCommunitiesUsed(
        Array.from(new Set(convs.map((c) => c.community_id)))
      );

      const now = Date.now();
      const active = convs.filter((c) => {
        const created = new Date(c.created_at).getTime();
        return now - created <= 86400000 && c.status !== 'closed';
      });

      setActiveConversations(active);
      setLoadingCommunities(false);
    };

    fetchData();
  }, [step, phone]);

  /* ===================== START CONVERSATION ===================== */

  const startConversationForCommunity = async (communityIdOrSlug: string) => {
    setSubmittingConversation(true);
    setCommunityError(null);

    try {
      const phoneNorm = normalizePhone(phone);
      const rawName = fullName.trim();
      if (!rawName || !phoneNorm) return;

      const { data: comm } = await supabasePublic
        .from('communities')
        .select('id')
        .or(`id.eq.${communityIdOrSlug},slug.eq.${communityIdOrSlug}`)
        .maybeSingle();

      if (!comm?.id) {
        setCommunityError('Comunidade não encontrada.');
        return;
      }

      const normalizedName = normalizeFullName(rawName);

      const { data: member } = await supabasePublic
        .from('members')
        .upsert(
          {
            community_id: comm.id,
            full_name: rawName,
            full_name_normalized: normalizedName,
            phone: phoneNorm,
            phone_normalized: phoneNorm,
          },
          { onConflict: 'community_id,phone_normalized' }
        )
        .select('member_id, community_id')
        .single();

      if (!member) {
        setCommunityError('Erro ao identificar você.');
        return;
      }

      localStorage.setItem(
        'redoma_member_session',
        JSON.stringify({
          member_id: member.member_id,
          community_id: member.community_id,
          full_name: rawName,
        })
      );

      await createConversation(comm.id);
      navigate('/client/chat');
    } finally {
      setSubmittingConversation(false);
    }
  };

  /* ===================== RENDER ===================== */

  return (
    <div className="min-h-screen bg-redoma-light flex items-center justify-center p-6">
      <div className="w-full max-w-3xl bg-white rounded-[2rem] shadow-xl overflow-hidden">
        <div className="p-10 bg-redoma-dark text-white text-center">
          <Logo size={72} className="mb-4" />
          <h1 className="text-2xl font-bold">Redoma Tech</h1>
        </div>

        {step === 'IDENTITY' ? (
          <form onSubmit={handleSubmitIdentity} className="p-10 space-y-6">
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Seu nome"
              className="w-full px-4 py-3 border rounded-xl"
            />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Celular com DDD"
              className="w-full px-4 py-3 border rounded-xl"
            />
            <button className="w-full py-3 bg-redoma-dark text-white rounded-xl">
              Continuar
            </button>
          </form>
        ) : (
          <div className="p-10 space-y-6">
            <h2 className="text-lg font-semibold">
              Olá, {firstName} 👋
            </h2>

            {activeConversations.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setActiveConversationId(c.id);
                  navigate('/client/chat');
                }}
                className="w-full text-left border p-4 rounded-xl"
              >
                Comunidade: {getCommunityLabel(c.community_id)}
              </button>
            ))}

            <input
              value={communityInput}
              onChange={(e) => setCommunityInput(e.target.value)}
              placeholder="ID ou slug da comunidade"
              className="w-full px-4 py-3 border rounded-xl"
            />

            <button
              onClick={() => startConversationForCommunity(communityInput)}
              className="w-full py-3 bg-redoma-dark text-white rounded-xl"
            >
              Iniciar atendimento
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientStart;
