import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from 'react';
import { Conversation, Message, User, SenderType } from '../types';
import { supabasePublic, supabaseSupport } from '../lib/supabase';
import { uploadChatImage } from '../lib/uploadChatImage';

interface ChatContextType {
  conversations: Conversation[];
  messages: Message[];
  currentUser: User | null;

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
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const getOrCreateClientToken = () => {
  const existing = localStorage.getItem('redoma_client_token');
  if (existing) return existing;

  const token =
    crypto?.randomUUID?.() ??
    Math.random().toString(36).slice(2) + Date.now().toString(36);

  localStorage.setItem('redoma_client_token', token);
  return token;
};

/** Normaliza conversa vindo do banco (suporta snake_case sem quebrar camelCase) */
const normalizeConversation = (row: any): Conversation => ({
  id: row.id,
  communityId: row.communityId ?? row.community_id ?? '',
  status: row.status,
  claimedBy: row.claimedBy ?? row.claimed_by ?? null,
  createdAt: row.createdAt ?? row.created_at ?? row.createdAt ?? new Date().toISOString(),

  memberId: row.memberId ?? row.member_id ?? null,
  memberName: row.memberName ?? row.member_name ?? null,

  last_client_seen_at: row.last_client_seen_at ?? null,
  last_agent_seen_at: row.last_agent_seen_at ?? null,

  clientToken: row.clientToken ?? row.client_token ?? null,
});

/** Normaliza mensagem vindo do banco (corrigido: sem typos) */
const normalizeMessage = (row: any): Message => ({
  id: row.id,
  conversationId: row.conversationId ?? row.conversation_id ?? '',
  senderType: row.senderType ?? row.sender_type,
  messageType: row.messageType ?? row.message_type,
  text: row.text ?? '',
  imageUrl: row.imageUrl ?? row.image_url ?? null,
  imageThumbUrl: row.imageThumbUrl ?? row.image_thumb_url ?? null,
  storagePath: row.storagePath ?? row.storage_path ?? null,
  createdAt: row.createdAt ?? row.created_at ?? new Date().toISOString(),
  clientToken: row.clientToken ?? row.client_token ?? null,
});

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('redoma_current_user');
    return stored ? JSON.parse(stored) : null;
  });

  const [activeConvId, setActiveConvIdState] = useState<string | null>(() =>
    localStorage.getItem('redoma_active_conv')
  );

  const isAgent = useMemo(() => !!currentUser, [currentUser]);

  /* ===================== HELPERS ===================== */

  const upsertConversation = useCallback((conv: Conversation) => {
    setConversations((prev) => {
      const exists = prev.find((c) => c.id === conv.id);
      if (!exists) return [...prev, conv];
      return prev.map((c) => (c.id === conv.id ? conv : c));
    });
  }, []);

  const upsertMessage = useCallback((msg: Message) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
  }, []);

  const setActiveConversationId = useCallback((id: string | null) => {
    if (id) localStorage.setItem('redoma_active_conv', id);
    else localStorage.removeItem('redoma_active_conv');
    setActiveConvIdState(id);
  }, []);

  /* ===================== BOOT ===================== */

  useEffect(() => {
    let convChannel: any;
    let msgChannel: any;

    const boot = async () => {
      getOrCreateClientToken();

      // ============ MODO SUPORTE ============
      if (isAgent) {
        console.log('[ChatProvider boot] modo SUPORTE');

        const { data: convs, error: convErr } = await supabaseSupport
          .from('conversations')
          .select('*');

        if (convErr) console.error('[support fetch conversations]', convErr);
        if (convs) setConversations((convs as any[]).map(normalizeConversation));

        const { data: msgs, error: msgErr } = await supabaseSupport
          .from('messages')
          .select('*')
          .order('createdAt', { ascending: true });

        if (msgErr) console.error('[support fetch messages]', msgErr);
        if (msgs) setMessages((msgs as any[]).map(normalizeMessage));

        convChannel = supabaseSupport
          .channel('support_convs')
          .on(
            'postgres_changes' as any,
            { event: '*', schema: 'public', table: 'conversations' },
            (p: any) => upsertConversation(normalizeConversation(p.new))
          )
          .subscribe();

        msgChannel = supabaseSupport
          .channel('support_msgs')
          .on(
            'postgres_changes' as any,
            { event: 'INSERT', schema: 'public', table: 'messages' },
            (p: any) => upsertMessage(normalizeMessage(p.new))
          )
          .subscribe();

        return;
      }

      // ============ MODO CLIENTE ============
      console.log('[ChatProvider boot] modo CLIENTE, activeConvId =', activeConvId);

      if (activeConvId) {
        const { data: conv, error: convErr } = await supabasePublic
          .from('conversations')
          .select('*')
          .eq('id', activeConvId)
          .maybeSingle();

        if (convErr) console.error('[client fetch active conversation]', convErr);
        if (conv) setConversations([normalizeConversation(conv)]);

        const { data: msgs, error: msgErr } = await supabasePublic
          .from('messages')
          .select('*')
          .eq('conversationId', activeConvId)
          .order('createdAt', { ascending: true });

        if (msgErr) console.error('[client fetch active messages]', msgErr);
        if (msgs) setMessages((msgs as any[]).map(normalizeMessage));

        // realtime para o cliente
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
            (p: any) => upsertConversation(normalizeConversation(p.new))
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
              filter: `conversationId=eq.${activeConvId}`,
            },
            (p: any) => upsertMessage(normalizeMessage(p.new))
          )
          .subscribe();
      } else {
        setConversations([]);
        setMessages([]);
      }
    };

    boot();

    return () => {
      convChannel?.unsubscribe?.();
      msgChannel?.unsubscribe?.();
    };
  }, [isAgent, activeConvId, upsertConversation, upsertMessage]);

  /* ===================== AUTH ===================== */

  const login = (email: string) => {
    const user: User = { id: 'agent', name: 'Atendente Redoma', email, role: 'agent' };
    setCurrentUser(user);
    localStorage.setItem('redoma_current_user', JSON.stringify(user));
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('redoma_current_user');
  };

  /* ===================== ACTIONS ===================== */

  const createConversation = async (communityId: string) => {
    const clientToken = getOrCreateClientToken();
    const id =
      crypto?.randomUUID?.() ??
      Math.random().toString(36).slice(2) + Date.now().toString(36);

    // memberId salvo na sessão
    let memberId: string | null = null;
    const rawSession = localStorage.getItem('redoma_member_session');
    if (rawSession) {
      try {
        const parsed = JSON.parse(rawSession) as { memberId?: string };
        if (parsed?.memberId) memberId = parsed.memberId;
      } catch {
        // ignore
      }
    }

    // ✅ manda apenas colunas "canônicas" (evita 400 por coluna inexistente)
    const convInsert = {
      id,
      communityId,
      status: 'open' as const,
      claimedBy: null,
      createdAt: new Date().toISOString(),
      clientToken,
      memberId: memberId ?? null,
    };

    const { data, error } = await supabasePublic
      .from('conversations')
      .insert(convInsert)
      .select('*')
      .single();

    if (error) {
      console.error('[createConversation] insert error', error);
      throw error;
    }

    const normalized = normalizeConversation(data);
    upsertConversation(normalized);
    setActiveConversationId(normalized.id);
    return normalized.id;
  };

  const addMessage = async (
    conversationId: string,
    text: string,
    senderType: SenderType
  ) => {
    const clientToken = getOrCreateClientToken();
    const id =
      crypto?.randomUUID?.() ??
      Math.random().toString(36).slice(2) + Date.now().toString(36);

    const insertPayload = {
      id,
      conversationId,
      senderType,
      messageType: 'text' as const,
      text,
      clientToken,
      // sem createdAt: banco preenche
    };

    const optimisticMsg: Message = {
      ...insertPayload,
      createdAt: new Date().toISOString(),
    };

    const client = senderType === 'agent' ? supabaseSupport : supabasePublic;

    // optimistic só pro cliente
    if (senderType === 'client') upsertMessage(optimisticMsg);

    const { data, error } = await client
      .from('messages')
      .insert(insertPayload)
      .select('*')
      .single();

    if (error) {
      console.error('[addMessage] insert error', error);
      throw error;
    }

    if (data) upsertMessage(normalizeMessage(data));
  };

  const sendImageMessage = async (
    conversationId: string,
    file: File,
    senderType: SenderType
  ) => {
    const clientToken = getOrCreateClientToken();

    const { publicUrl, path } = await uploadChatImage({
      file,
      conversationId,
      senderType,
    });

    const id =
      crypto?.randomUUID?.() ??
      Math.random().toString(36).slice(2) + Date.now().toString(36);

    const insertPayload = {
      id,
      conversationId,
      senderType,
      messageType: 'image' as const,
      text: '',
      imageUrl: publicUrl,
      storagePath: path,
      clientToken,
    };

    const optimisticMsg: Message = {
      ...insertPayload,
      createdAt: new Date().toISOString(),
    };

    const client = senderType === 'agent' ? supabaseSupport : supabasePublic;

    if (senderType === 'client') upsertMessage(optimisticMsg);

    const { data, error } = await client
      .from('messages')
      .insert(insertPayload)
      .select('*')
      .single();

    if (error) {
      console.error('[sendImageMessage] insert error', error);
      throw error;
    }

    if (data) upsertMessage(normalizeMessage(data));
  };

  const claimConversation = async (conversationId: string) => {
    const claimedBy = currentUser?.name || 'Atendente';

    // ✅ atualiza campos canônicos
    const { data, error } = await supabaseSupport
      .from('conversations')
      .update({ status: 'claimed', claimedBy })
      .eq('id', conversationId)
      .select('*')
      .single();

    if (error) throw error;
    upsertConversation(normalizeConversation(data));
  };

  const closeConversation = async (conversationId: string) => {
    const { data, error } = await supabaseSupport
      .from('conversations')
      .update({ status: 'closed' })
      .eq('id', conversationId)
      .select('*')
      .single();

    if (error) throw error;
    upsertConversation(normalizeConversation(data));
  };

  const getConversation = (id: string) => conversations.find((c) => c.id === id);

  const getMessages = (conversationId: string) =>
    messages.filter((m) => m.conversationId === conversationId);

  return (
    <ChatContext.Provider
      value={{
        conversations,
        messages,
        currentUser,
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
