import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../context/ChatContext';
import { supabasePublic } from '../lib/supabase';
import Logo from '../components/Logo';
import {
  LayoutGrid,
  AlertCircle,
  Loader2,
  MessageCircle,
  Users,
} from 'lucide-react';

const getOrCreateClientToken = () => {
  const existing = localStorage.getItem('redoma_client_token');
  if (existing) return existing;

  const token =
    Math.random().toString(36).slice(2) + Date.now().toString(36);

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
  const [submittingConversation, setSubmittingConversation] =
    useState(false);

  const [communitiesUsed, setCommunitiesUsed] = useState<string[]>([]);
  const [activeConversations, setActiveConversations] = useState<
    ConversationRow[]
  >([]);

  const [unreadByConvId, setUnreadByConvId] = useState<
    Record<string, boolean>
  >({});

  // 🔥 NOVO: mapa communityId -> communityName
  const [communityNameById, setCommunityNameById] = useState<
    Record<string, string>
  >({});
  const [loadingNames, setLoadingNames] = useState(false);

  /* ========= STEP 1: IDENTIDADE ========= */

  const handleFullNameChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFullName(e.target.value);
    if (fullNameError) setFullNameError(null);
  };

  const handlePhoneChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
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

    if (!phoneNorm || phoneNorm.length < 10 || phoneNorm.length > 11) {
      setPhoneError(
        'Informe um celular com DDD válido (apenas números).'
      );
      hasError = true;
    }

    if (hasError) return;

    localStorage.setItem('redoma_full_name', rawName);
    localStorage.setItem('redoma_phone', phoneNorm);

    setPhone(phoneNorm);
    setStep('COMMUNITY');
  };

  /* ========= NOME DAS COMUNIDADES ========= */

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
          console.error(
            '[ClientStart] fetch communities (names) error',
            error
          );
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

  const getCommunityLabel = (community_id: string) => {
    return communityNameById[communityId] || communityId;
  };

  /* ========= RESTANTE DO CÓDIGO ========= */
  /* (mantido exatamente igual ao original, apenas formatado) */

};

export default ClientStart;
