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

const genId = () =>
  crypto?.randomUUID?.() ??
  Math.random().toString(36).slice(2) + Date.now().toString(36);

const getOrCreateClientToken = () => {
  const existing = localStorage.getItem('redoma_client_token');
  if (existing) return existing;

  const token = genId();
  localStorage.setItem('redoma_client_token', token);
  return token;
};

/** ===================== NORMALIZERS (snake_case -> camelCase) ===================== */

const normalizeConversation = (row: any): Conversation => {
  if (!row) return row;

  return {
    ...row,

    // ids / keys
    id: row.id ?? row.conversation_id ?? row.conversationId,

    // community
    communityId: row.communityId ?? row.community_id ?? row.community,

    // status / claimed
    status: row.status ?? row.conversation_status ?? null,
    claimedBy: row.claimedBy ?? row.claimed_by ?? null,

    // member
    memberId: row.memberId ?? row.member_id ?? null,

    // client token (compat)
    clientToken: row.clientToken ?? row.client_token ?? null,
    client_token: row.client_token ?? row.clientToken ?? null,

    // timestamps
    createdAt: row.createdAt ?? row.created_at ?? row.created ?? row.createdAt,
    last_client_seen_at:
      row.last_client_seen_at ?? row.lastClientSeenAt ?? null,
  } as any;
};

const normalizeMessage = (row: any): Message => {
  if (!row) return row;

  return {
    ...row,

    id: row.id ?? row.message_id,

    conversationId:
      row.conversationId ?? row.conversation_id ?? row.conversation,

    senderType: row.senderType ?? row.sender_type,
    messageType: row.messageType ?? row.message_type,

    text: row.text ?? row.content ?? '',

    imageUrl: row.imagelrow?.imageUrl ?? row.image_url ?? row.image ?? row.imageUrl,
    storagePath: row.storagePath ?? row.storage_path ?? null,

    clientToken: row.clientToken ?? row.client_token ?? null,

    createdAt: row.createdAt ?? row.created_at ?? row.created ?? row.createdAt,
  } as any;
};

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

  const upsertConversation = useCallback((raw: any) => {
    const conv = normalizeConversation(raw);

    setConversations((prev) => {
      const exists = prev.find((c) => c.id === conv.id);
      if (!exists) return [conv, ...prev];
      return prev.map((c) => (c.id === conv.id ? conv : c));
    });
  }, []);

  const upsertMessage = useCallback((raw: any) => {
    const msg = normalizeMessage(raw);

    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.id === msg.id);
      if (idx === -1) return [...prev, msg];
      const next = [...prev];
      next[idx] = { ...next[idx], ...msg };
      return next;
    });
  }, []);

  const removeMessageById = useCallback((id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
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
          .order('created_at', { ascending: true }); // prefer snake
        // fallback: se created_at não existir, não quebra; supabase retorna erro só se column inexistente.

        if (msgErr) {
          // tenta createdAt se schema for camel
          const { data: msgs2, error: msgErr2 } = await supabaseSupport
            .from('messages')
            .select('*')
            .order('createdAt', { ascending: true });

          if (msgErr2) console.error('[support fetch messages]', msgErr2);
          if (msgs2) setMessages((msgs2 as any[]).map(normalizeMessage));
        } else {
          if (msgs) setMessages((msgs as any[]).map(normalizeMessage));
        }

        convChannel = supabaseSupport
          .channel('support_convs')
          .on(
            'postgres_changes' as any,
            { event: '*', schema: 'public', table: 'conversations' },
            (p: any) => upsertConversation(p.new)
          )
          .subscribe();

        msgChannel = supabaseSupport
          .channel('support_msgs')
          .on(
            'postgres_changes' as any,
            { event: 'INSERT', schema: 'public', table: 'messages' },
            (p: any) => upsertMessage(p.new)
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

        // tenta created_at primeiro, senão createdAt
        const { data: msgs, error: msgErr } = await supabasePublic
          .from('messages')
          .select('*')
          .eq('conversation_id', activeConvId);

        if (!msgErr && msgs) {
          // se veio por conversation_id, ok
          setMessages((msgs as any[]).map(normalizeMessage));
        } else {
          const { data: msgs2, error: msgErr2 } = await supabasePublic
            .from('messages')
            .select('*')
            .eq('conversationId', activeConvId);

          if (msgErr2) console.error('[client fetch active messages]', msgErr2);
          if (msgs2) setMessages((msgs2 as any[]).map(normalizeMessage));
        }

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
            (p: any) => upsertConversation(p.new)
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
              // ⚠️ filtro pode ser conversation_id no DB
              // então a gente NÃO filtra aqui e filtra no upsert/getMessages
            },
            (p: any) => {
              const incoming = normalizeMessage(p.new);
              if (incoming.conversationId === activeConvId) {
                upsertMessage(incoming);
              }
            }
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
    const id = genId();

    let memberId: string | null = null;
    const rawSession = localStorage.getItem('redoma_member_session');
    if (rawSession) {
      try {
        const parsed = JSON.parse(rawSession) as { memberId?: string; communityId?: string };
        if (parsed?.memberId) memberId = parsed.memberId;
      } catch {
        // ignore
      }
    }

    // ✅ manda os dois formatos (snake + camel)
    const convPayload: any = {
      id,
      status: 'open',
      claimedBy: null,
      claimed_by: null,

      communityId,
      community_id: communityId,

      memberId: memberId ?? null,
      member_id: memberId ?? null,

      clientToken,
      client_token: clientToken,

      createdAt: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabasePublic
      .from('conversations')
      .insert(convPayload)
      .select('*')
      .maybeSingle();

    if (error) {
      console.error('[createConversation] insert error', error);
      throw error;
    }

    const finalConv = data ? normalizeConversation(data) : normalizeConversation(convPayload);

    setActiveConversationId(finalConv.id);
    upsertConversation(finalConv);
    return finalConv.id;
  };

  const addMessage = async (conversationId: string, text: string, senderType: SenderType) => {
    const clientToken = getOrCreateClientToken();
    const id = genId();

    // ✅ optimistic (sempre)
    upsertMessage({
      id,
      conversationId,
      senderType,
      messageType: 'text',
      text,
      clientToken,
      createdAt: new Date().toISOString(),
    } as any);

    const payload: any = {
      id,

      // compat:
      conversationId,
      conversation_id: conversationId,

      senderType,
      sender_type: senderType,

      messageType: 'text',
      message_type: 'text',

      text,

      clientToken,
      client_token: clientToken,
    };

    const client = senderType === 'agent' ? supabaseSupport : supabasePublic;

    const { data, error } = await client
      .from('messages')
      .insert(payload)
      .select('*')
      .maybeSingle();

    if (error) {
      console.error('[addMessage] insert error', error);
      removeMessageById(id);
      return;
    }

    if (data) {
      upsertMessage(data);
    }
  };

  const sendImageMessage = async (
    conversationId: string,
    file: File,
    senderType: SenderType
  ) => {
    const clientToken = getOrCreateClientToken();
    const id = genId();

    // optimistic placeholder
    upsertMessage({
      id,
      conversationId,
      senderType,
      messageType: 'image',
      text: '',
      imageUrl: '',
      storagePath: '',
      clientToken,
      createdAt: new Date().toISOString(),
    } as any);

    try {
      const { publicUrl, path } = await uploadChatImage({
        file,
        conversationId,
        senderType,
      });

      const payload: any = {
        id,

        conversationId,
        conversation_id: conversationId,

        senderType,
        sender_type: senderType,

        messageType: 'image',
        message_type: 'image',

        text: '',

        imageUrl: publicUrl,
        image_url: publicUrl,

        storagePath: path,
        storage_path: path,

        clientToken,
        client_token: clientToken,
      };

      const client = senderType === 'agent' ? supabaseSupport : supabasePublic;

      const { data, error } = await client
        .from('messages')
        .insert(payload)
        .select('*')
        .maybeSingle();

      if (error) {
        console.error('[sendImageMessage] insert error', error);
        removeMessageById(id);
        return;
      }

      if (data) upsertMessage(data);
    } catch (err) {
      console.error('[sendImageMessage] fatal', err);
      removeMessageById(id);
    }
  };

  const claimConversation = async (conversationId: string) => {
    const claimedBy = currentUser?.name || 'Atendente';

    const { data, error } = await supabaseSupport
      .from('conversations')
      .update({ status: 'claimed', claimedBy, claimed_by: claimedBy })
      .eq('id', conversationId)
      .select('*')
      .single();

    if (error) throw error;
    upsertConversation(data);
  };

  const closeConversation = async (conversationId: string) => {
    const { data, error } = await supabaseSupport
      .from('conversations')
      .update({ status: 'closed' })
      .eq('id', conversationId)
      .select('*')
      .single();

    if (error) throw error;
    upsertConversation(data);
  };

  const getConversation = (id: string) => conversations.find((c) => c.id === id);

  const getMessages = (conversationId: string) =>
    messages
      .filter((m) => m.conversationId === conversationId)
      .slice()
      .sort((a: any, b: any) => {
        const ta = new Date(a.createdAt || 0).getTime();
        const tb = new Date(b.createdAt || 0).getTime();
        return ta - tb;
      });

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
