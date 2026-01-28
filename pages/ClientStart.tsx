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
    const n = localStorage.getItem('redoma_full_name');
    const p = localStorage.getItem('redoma_phone');
    return n && p ? 'COMMUNITY' : 'IDENTITY';
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

  /* ================= IDENTITY ================= */

  const handleSubmitIdentity = (e: React.FormEvent) => {
    e.preventDefault();

    const rawName = fullName.trim();
    const phoneNorm = normalizePhone(phone);

    let hasError = false;

    if (!rawName || rawName.length < 2) {
      setFullNameError('Como podemos te chamar?');
      hasError = true;
    }

    if (!phoneNorm || phoneNorm.length < 10 || phoneNorm.length > 11) {
      setPhoneError('Informe um celular com DDD válido.');
      hasError = true;
    }

    if (hasError) return;

    localStorage.setItem('redoma_full_name', rawName);
    localStorage.setItem('redoma_phone', phoneNorm);
    setPhone(phoneNorm);
    setStep('COMMUNITY');
  };

  /* ================= COMMUNITY NAMES ================= */

  useEffect(() => {
    if (step !== 'COMMUNITY') return;

    const load = async () => {
      setLoadingNames(true);
      const { data } = await supabasePublic
        .from('communities')
        .select('id, name')
        .eq('isActive', true);

      const map: Record<string, string> = {};
      (data || []).forEach((c: any) => (map[c.id] = c.name));
      setCommunityNameById(map);
      setLoadingNames(false);
    };

    load();
  }, [step]);

  const getCommunityLabel = (id: string) =>
    communityNameById[id] || id;

  /* ================= CONVERSATIONS ================= */

  useEffect(() => {
    if (step !== 'COMMUNITY') return;

    const load = async () => {
      setLoadingCommunities(true);

      const phoneNorm = normalizePhone(
        phone || localStorage.getItem('redoma_phone') || ''
      );

      const { data: members } = await supabasePublic
        .from('members')
        .select('member_id')
        .eq('phone_normalized', phoneNorm);

      const memberIds = (members || []).map((m: any) => m.member_id);

      if (!memberIds.length) {
        setActiveConversations([]);
        setCommunitiesUsed([]);
        setUnreadByConvId({});
        setLoadingCommunities(false);
        return;
      }

      const { data: convs } = await supabasePublic
        .from('conversations')
        .select('id, community_id, status, created_at, last_client_seen_at')
        .in('member_id', memberIds)
        .order('created_at', { ascending: false });

      const active = (convs || []).filter((c: ConversationRow) => {
        const age = Date.now() - new Date(c.created_at).getTime();
        return age <= 86400000 && c.status !== 'closed';
      });

      setActiveConversations(active);
      setCommunitiesUsed([...new Set(active.map(c => c.community_id))]);

      if (active.length) {
        const ids = active.map(c => c.id);

        const { data: msgs } = await supabasePublic
          .from('messages')
          .select('conversation_id, created_at')
          .in('conversation_id', ids)
          .eq('sender_type', 'agent');

        const unread: Record<string, boolean> = {};
        active.forEach(c => {
          const lastSeen = c.last_client_seen_at
            ? new Date(c.last_client_seen_at).getTime()
            : 0;

          unread[c.id] = (msgs || []).some(
            (m: any) =>
              m.conversation_id === c.id &&
              new Date(m.created_at).getTime() > lastSeen
          );
        });

        setUnreadByConvId(unread);
      }

      setLoadingCommunities(false);
    };

    load();
  }, [step, phone]);

  /* ================= START CONVERSATION ================= */

  const startConversationForCommunity = async (input: string) => {
    setSubmittingConversation(true);

    const { data } = await supabasePublic
      .from('communities')
      .select('id')
      .or(`id.eq.${input},slug.eq.${input}`)
      .maybeSingle();

    if (!data?.id) {
      setCommunityError('Comunidade não encontrada.');
      setSubmittingConversation(false);
      return;
    }

    await createConversation(data.id);
    navigate('/client/chat');
    setSubmittingConversation(false);
  };

  /* ================= RENDER ================= */

  return (
    <div className="min-h-screen bg-redoma-light flex items-center justify-center p-6">
      <div className="w-full max-w-3xl bg-white rounded-[2rem] shadow-2xl overflow-hidden border">
        <div className="p-10 bg-redoma-dark text-white text-center">
          <Logo size={80} className="mb-6" />
          <h1 className="text-3xl font-bold">Redoma Tech</h1>
          <p className="text-sm mt-3">Crescimento Inteligente para comunidades</p>
        </div>

        {step === 'IDENTITY' ? (
          <form onSubmit={handleSubmitIdentity} className="p-10 space-y-6">
            {/* IDENTIDADE – exatamente como antes */}
          </form>
        ) : (
          <div className="p-10 space-y-6">
            {/* COMMUNITY – exatamente como antes */}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientStart;
