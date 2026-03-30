import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { Conversation, Message, User, SenderType } from '../types';
import {
  supabasePublic,
  supabaseSupport,
  CLIENT_TOKEN_KEY,
  ensureClientJwt,
  applyRealtimeJwt,
  getOrCreateClientToken,
} from '../lib/supabase';
import { uploadChatImage } from '../lib/uploadChatImage';
import { useAgentNotifications } from '../src/hooks/useAgentNotifications';

interface ChatContextType {
  conversations: Conversation[];
  messages: Message[];
  currentUser: User | null;

  agentToast: {
    id: string;
    title: string;
    body: string;
    conversationId?: string;
    createdAt: number;
  } | null;
  dismissAgentToast: () => void;

  login: (email: string) => void;
  logout: () => void;

  createConversation: (communityId: string) => Promise<string>;
  addMessage: (
    conversationId: string,
    text: string,
    senderType: SenderType
  ) => Promise<void>;
  sendImageMessage: (
    conversationId: string,
    file: File,
    senderType: SenderType
  ) => Promise<void>;

  claimConversation: (conversationId: string) => Promise<void>;
  closeConversation: (conversationId: string) => Promise<void>;

  getConversation: (id: string) => Conversation | undefined;
  getMessages: (conversationId: string) => Message[];

  setActiveConversationId: (id: string | null) => void;

  notificationPermission: 'default' | 'granted' | 'denied';
  notificationsEnabled: boolean;
  notificationsSupported: boolean;
  requestNotificationPermission: () => Promise<boolean>;
  disableNotifications: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const ensureClientAuthReady = async () => {
  getOrCreateClientToken();
  const jwt = await ensureClientJwt();
  applyRealtimeJwt(jwt);
  return jwt;
};

const normalizeConversation = (conv: any) => {
  if (!conv) return conv;

  return {
    ...conv,
    communityId: conv.communityId ?? conv.community_id ?? null,
    community_id: conv.community_id ?? conv.communityId ?? null,
    member_name: conv.member_name ?? conv.memberName ?? null,
    community_name:
      conv.community_name ??
      conv.communityName ??
      conv.community?.name ??
      null,
  };
};

const enrichConversations = async (
  client: any,
  rawConversations: any[]
): Promise<any[]> => {
  if (!rawConversations || rawConversations.length === 0) return [];

  const normalized = rawConversations.map(normalizeConversation);

  const memberIds = Array.from(
    new Set(
      normalized
        .map((c) => c.member_id)
        .filter((v) => v !== null && v !== undefined && v !== '')
    )
  );

  const communityIds = Array.from(
    new Set(
      normalized
        .map((c) => c.community_id ?? c.communityId)
        .filter((v) => v !== null && v !== undefined && v !== '')
    )
  );

  let memberMap: Record<string, string> = {};
  let communityMap: Record<string, string> = {};

  if (memberIds.length > 0) {
    const { data: members, error: memberErr } = await client
      .from('members')
      .select('member_id, full_name')
      .in('member_id', memberIds);

    if (memberErr) {
      console.error('[fetch members for conversations]', memberErr);
    } else {
      memberMap = Object.fromEntries(
        ((members || []) as any[])
          .filter((m) => m?.member_id)
          .map((m) => [m.member_id, m.full_name || 'Usuário'])
      );
    }
  }

  if (communityIds.length > 0) {
    const { data: communities, error: communityErr } = await client
      .from('communities')
      .select('id, name')
      .in('id', communityIds);

    if (communityErr) {
      console.error('[fetch communities for conversations]', communityErr);
    } else {
      communityMap = Object.fromEntries(
        ((communities || []) as any[])
          .filter((c) => c?.id)
          .map((c) => [c.id, c.name || 'Comunidade'])
      );
    }
  }

  return normalized.map((conv) => {
    const communityId = conv.community_id ?? conv.communityId ?? null;

    return {
      ...conv,
      member_name:
        conv.member_name ??
        (conv.member_id ? memberMap[conv.member_id] : null) ??
        null,
      community_name:
        conv.community_name ??
        (communityId ? communityMap[communityId] : null) ??
        null,
    };
  });
};

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('redoma_current_user');
    return stored ? JSON.parse(stored) : null;
  });

  const [activeConvId, setActiveConvIdState] = useState<string | null>(() =>
    localStorage.getItem('redoma_active_conv')
  );

  const [agentToast, setAgentToast] = useState<ChatContextType['agentToast']>(null);
  const toastTimerRef = useRef<number | null>(null);

  const isAgent = useMemo(() => !!currentUser, [currentUser]);

  const {
    permission: notificationPermission,
    enabled: notificationsEnabled,
    isSupported: notificationsSupported,
    requestPermission: requestNotificationPermission,
    disableNotifications,
    notify,
  } = useAgentNotifications();

  const notifiedMsgIds = useRef<Set<string>>(new Set());

  const upsertConversation = useCallback((conv: Conversation | any) => {
    const normalizedConv = normalizeConversation(conv);

    setConversations((prev) => {
      const existing = prev.find((c) => c.id === normalizedConv.id) as any;

      if (!existing) {
        return [...prev, normalizedConv];
      }

      const merged = {
        ...existing,
        ...normalizedConv,
        member_name:
          normalizedConv.member_name ??
          existing.member_name ??
          existing.memberName ??
          null,
        community_name:
          normalizedConv.community_name ??
          existing.community_name ??
          existing.communityName ??
          null,
        communityId:
          normalizedConv.communityId ??
          normalizedConv.community_id ??
          existing.communityId ??
          existing.community_id ??
          null,
        community_id:
          normalizedConv.community_id ??
          normalizedConv.communityId ??
          existing.community_id ??
          existing.communityId ??
          null,
      };

      return prev.map((c) => (c.id === normalizedConv.id ? merged : c));
    });
  }, []);

  const upsertMessage = useCallback((msg: Message) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev;

      const next = [...prev, msg];

      next.sort((a, b) => {
        const ta = new Date(a.created_at).getTime();
        const tb = new Date(b.created_at).getTime();
        if (ta !== tb) return ta - tb;

        const sa = a.sender_type === 'client' ? 0 : 1;
        const sb = b.sender_type === 'client' ? 0 : 1;
        if (sa !== sb) return sa - sb;

        return String(a.id).localeCompare(String(b.id));
      });

      return next;
    });

    if (
      isAgent &&
      msg.sender_type === 'client' &&
      !notifiedMsgIds.current.has(msg.id)
    ) {
      notifiedMsgIds.current.add(msg.id);
      const preview =
        msg.message_type === 'image'
          ? '📷 Imagem recebida'
          : msg.text?.slice(0, 80) || 'Nova mensagem';

      if (!activeConvId || msg.conversation_id !== activeConvId) {
        if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
        setAgentToast({
          id: msg.id,
          title: '💬 Nova mensagem de cliente',
          body: preview,
          conversationId: msg.conversation_id,
          createdAt: Date.now(),
        });
        toastTimerRef.current = window.setTimeout(() => {
          setAgentToast(null);
          toastTimerRef.current = null;
        }, 7000);
      }

      notify({
        title: '💬 Nova mensagem de cliente',
        body: preview,
      });
    }
  }, [isAgent, notify, activeConvId]);

  const removeOptimisticMessage = useCallback((id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const setActiveConversationId = useCallback((id: string | null) => {
    if (id) localStorage.setItem('redoma_active_conv', id);
    else localStorage.removeItem('redoma_active_conv');
    setActiveConvIdState(id);
  }, []);

  const dismissAgentToast = useCallback(() => {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    setAgentToast(null);
  }, []);

  // ─── Refs estáveis para callbacks ────────────────────────────────────────────
  // Mantém sempre a versão mais recente das callbacks sem causar re-subscription.
  // Sem isso, qualquer mudança em activeConvId recriava os channels do agente.
  const upsertMessageRef = useRef(upsertMessage);
  useEffect(() => { upsertMessageRef.current = upsertMessage; }, [upsertMessage]);

  const upsertConversationRef = useRef(upsertConversation);
  useEffect(() => { upsertConversationRef.current = upsertConversation; }, [upsertConversation]);

  // ─── Efeito 1: AGENTE ────────────────────────────────────────────────────────
  // Só re-executa quando isAgent muda (login/logout).
  // NÃO depende de activeConvId — o agente escuta tudo sem filtro.
  useEffect(() => {
    if (!isAgent) return;

    let convChannel: any;
    let msgChannel: any;
    let cancelled = false;

    const safeUnsub = async () => {
      try {
        if (convChannel) {
          await convChannel.unsubscribe?.();
          (supabaseSupport as any).removeChannel?.(convChannel);
        }
      } catch {}
      try {
        if (msgChannel) {
          await msgChannel.unsubscribe?.();
          (supabaseSupport as any).removeChannel?.(msgChannel);
        }
      } catch {}
    };

    const boot = async () => {
      const { data: convs, error: convErr } = await supabaseSupport
        .from('conversations')
        .select('*');

      if (cancelled) return;
      if (convErr) console.error('[support fetch conversations]', convErr);

      const enrichedConvs = await enrichConversations(
        supabaseSupport,
        (convs || []) as any[]
      );

      if (cancelled) return;
      setConversations(enrichedConvs as Conversation[]);

      const { data: msgs, error: msgErr } = await supabaseSupport
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true });

      if (cancelled) return;
      if (msgErr) console.error('[support fetch messages]', msgErr);
      setMessages((msgs || []) as Message[]);

      convChannel = supabaseSupport
        .channel('support_convs')
        .on(
          'postgres_changes' as any,
          { event: '*', schema: 'public', table: 'conversations' },
          async (p: any) => {
            if (p?.new) {
              const [enriched] = await enrichConversations(supabaseSupport, [p.new]);
              if (!cancelled && enriched) {
                upsertConversationRef.current(enriched);
              }
            }
          }
        )
        .subscribe((status: string) => {
          if (status === 'CHANNEL_ERROR') {
            console.error('[realtime] support_convs error — verifique Replication no Supabase Dashboard');
          }
        });

      msgChannel = supabaseSupport
        .channel('support_msgs')
        .on(
          'postgres_changes' as any,
          { event: 'INSERT', schema: 'public', table: 'messages' },
          (p: any) => p?.new && upsertMessageRef.current(p.new as Message)
        )
        .subscribe((status: string) => {
          if (status === 'CHANNEL_ERROR') {
            console.error('[realtime] support_msgs error — verifique Replication no Supabase Dashboard');
          }
        });
    };

    boot();

    return () => {
      cancelled = true;
      void safeUnsub();
    };
  }, [isAgent]); // ← APENAS isAgent. Nunca recria por activeConvId.

  // ─── Efeito 2: CLIENTE ───────────────────────────────────────────────────────
  // Re-executa quando a conversa ativa muda (necessário — o filtro muda).
  useEffect(() => {
    if (isAgent) return;

    let convChannel: any;
    let msgChannel: any;
    let cancelled = false;

    const safeUnsub = async () => {
      try {
        if (convChannel) {
          await convChannel.unsubscribe?.();
          (supabasePublic as any).removeChannel?.(convChannel);
        }
      } catch {}
      try {
        if (msgChannel) {
          await msgChannel.unsubscribe?.();
          (supabasePublic as any).removeChannel?.(msgChannel);
        }
      } catch {}
    };

    const boot = async () => {
      try {
        await ensureClientAuthReady();
      } catch (e) {
        console.error('[client auth] failed', e);
        return;
      }

      if (!activeConvId) {
        setConversations([]);
        setMessages([]);
        return;
      }

      const { data: conv, error: convErr } = await supabasePublic
        .from('conversations')
        .select('*')
        .eq('id', activeConvId)
        .maybeSingle();

      if (cancelled) return;
      if (convErr) console.error('[client fetch active conversation]', convErr);

      const enrichedClientConvs = conv
        ? await enrichConversations(supabasePublic, [conv])
        : [];

      if (cancelled) return;
      setConversations(enrichedClientConvs as Conversation[]);

      const { data: msgs, error: msgErr } = await supabasePublic
        .from('messages')
        .select('*')
        .eq('conversation_id', activeConvId)
        .order('created_at', { ascending: true });

      if (cancelled) return;
      if (msgErr) console.error('[client fetch active messages]', msgErr);
      setMessages((msgs || []) as Message[]);

      convChannel = supabasePublic
        .channel(`client_conversations_${activeConvId}`)
        .on(
          'postgres_changes' as any,
          {
            event: '*',
            schema: 'public',
            table: 'conversations',
            filter: `id=eq.${activeConvId}`,
          },
          async (p: any) => {
            if (p?.new) {
              const [enriched] = await enrichConversations(supabasePublic, [p.new]);
              if (!cancelled && enriched) {
                upsertConversationRef.current(enriched);
              }
            }
          }
        )
        .subscribe();

      msgChannel = supabasePublic
        .channel(`client_messages_${activeConvId}`)
        .on(
          'postgres_changes' as any,
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${activeConvId}`,
          },
          (p: any) => p?.new && upsertMessageRef.current(p.new as Message)
        )
        .subscribe();
    };

    boot();

    return () => {
      cancelled = true;
      void safeUnsub();
    };
  }, [isAgent, activeConvId]);

  const login = (email: string) => {
    const user: User = {
      id: 'agent',
      name: 'Atendente Redoma',
      email,
      role: 'agent',
    };
    setCurrentUser(user);
    localStorage.setItem('redoma_current_user', JSON.stringify(user));
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('redoma_current_user');
  };

  const createConversation = async (communityId: string) => {
    await ensureClientAuthReady();

    const clientToken = localStorage.getItem(CLIENT_TOKEN_KEY)!;

    const id =
      (typeof crypto !== 'undefined' && crypto.randomUUID?.()) ??
      Math.random().toString(36).slice(2) + Date.now().toString(36);

    let memberId: string | null = null;
    const rawSession = localStorage.getItem('redoma_member_session');
    if (rawSession) {
      try {
        const parsed = JSON.parse(rawSession) as { memberId?: string };
        if (parsed?.memberId) memberId = parsed.memberId;
      } catch {}
    }

    const conv = {
      id,
      community_id: communityId,
      status: 'open',
      claimed_by: null,
      member_id: memberId ?? null,
      client_token: clientToken,
    };

    const { data, error } = await supabasePublic
      .from('conversations')
      .insert(conv as any)
      .select('*')
      .single();

    if (error) throw error;

    if (data) {
      const [enriched] = await enrichConversations(supabasePublic, [data]);
      if (enriched) upsertConversation(enriched as any);
    }

    setActiveConversationId(id);
    return id;
  };

  const addMessage = async (
    conversationId: string,
    text: string,
    senderType: SenderType
  ) => {
    if (senderType !== 'agent') await ensureClientAuthReady();

    const optimisticId =
      (typeof crypto !== 'undefined' && crypto.randomUUID?.()) ??
      Math.random().toString(36).slice(2) + Date.now().toString(36);

    const payload = {
      id: optimisticId,
      conversation_id: conversationId,
      sender_type: senderType,
      message_type: 'text' as const,
      text,
      created_at: new Date().toISOString(),
    };

    upsertMessage(payload as any);

    const client = senderType === 'agent' ? supabaseSupport : supabasePublic;
    const { data, error } = await client
      .from('messages')
      .insert(payload as any)
      .select('*')
      .single();

    if (error) {
      console.error('[addMessage] insert error', error);
      removeOptimisticMessage(optimisticId);
      throw error;
    }

    if (data) upsertMessage(data as Message);
  };

  const sendImageMessage = async (
    conversationId: string,
    file: File,
    senderType: SenderType
  ) => {
    if (senderType !== 'agent') await ensureClientAuthReady();

    const { publicUrl, path } = await uploadChatImage({
      file,
      conversationId,
      senderType,
    });

    const optimisticId =
      (typeof crypto !== 'undefined' && crypto.randomUUID?.()) ??
      Math.random().toString(36).slice(2) + Date.now().toString(36);

    const payload = {
      id: optimisticId,
      conversation_id: conversationId,
      sender_type: senderType,
      message_type: 'image' as const,
      text: '',
      image_url: publicUrl,
      storage_path: path,
      created_at: new Date().toISOString(),
    };

    upsertMessage(payload as any);

    const client = senderType === 'agent' ? supabaseSupport : supabasePublic;
    const { data, error } = await client
      .from('messages')
      .insert(payload as any)
      .select('*')
      .single();

    if (error) {
      console.error('[sendImageMessage] insert error', error);
      removeOptimisticMessage(optimisticId);
      throw error;
    }

    if (data) upsertMessage(data as Message);
  };

  const claimConversation = async (conversationId: string) => {
    const claimed_by = currentUser?.name || 'Atendente';
    const claimed_at = new Date().toISOString();

    const { data, error } = await supabaseSupport
      .from('conversations')
      .update({ status: 'claimed', claimed_by, claimed_at })
      .eq('id', conversationId)
      .select('*')
      .single();

    if (error) throw error;

    if (data) {
      const [enriched] = await enrichConversations(supabaseSupport, [data]);
      if (enriched) upsertConversation(enriched as Conversation);
    }
  };

  const closeConversation = async (conversationId: string) => {
    const closed_at = new Date().toISOString();

    const { data, error } = await supabaseSupport
      .from('conversations')
      .update({ status: 'closed', closed_at })
      .eq('id', conversationId)
      .select('*')
      .single();

    if (error) throw error;

    if (data) {
      const [enriched] = await enrichConversations(supabaseSupport, [data]);
      if (enriched) upsertConversation(enriched as Conversation);
    }
  };

  const getConversation = (id: string) => conversations.find((c) => c.id === id);

  const getMessages = (conversationId: string) =>
    messages.filter((m) => m.conversation_id === conversationId);

  return (
    <ChatContext.Provider
      value={{
        conversations,
        messages,
        currentUser,
        agentToast,
        dismissAgentToast,
        login,
        logout,
        createConversation,
        addMessage,
        sendImageMessage,
        claimConversation,
        closeConversation,
        getConversation,
        getMessages,
        setActiveConversationId,
        notificationPermission,
        notificationsEnabled,
        notificationsSupported,
        requestNotificationPermission,
        disableNotifications,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within ChatProvider');
  return ctx;
};