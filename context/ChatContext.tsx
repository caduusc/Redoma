import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
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

  addMessage: (conversationId: string, text: string, senderType: SenderType) => Promise<void>;

  sendImageMessage: (conversationId: string, file: File, senderType: SenderType) => Promise<void>;

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
    (typeof crypto !== 'undefined' && crypto.randomUUID?.()) ??
    Math.random().toString(36).slice(2) + Date.now().toString(36);

  localStorage.setItem('redoma_client_token', token);
  return token;
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

  const upsertConversation = useCallback((conv: Conversation) => {
    setConversations((prev) => {
      const exists = prev.some((c) => c.id === conv.id);
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
      const token = getOrCreateClientToken();

      // ============ MODO SUPORTE ============
      if (isAgent) {
        console.log('[ChatProvider boot] modo SUPORTE');

        const { data: convs, error: convErr } = await supabaseSupport
          .from('conversations')
          .select('*');

        if (convErr) console.error('[support fetch conversations]', convErr);
        setConversations((convs || []) as Conversation[]);

        const { data: msgs, error: msgErr } = await supabaseSupport
          .from('messages')
          .select('*')
          .order('createdAt', { ascending: true });

        if (msgErr) console.error('[support fetch messages]', msgErr);
        setMessages((msgs || []) as Message[]);

        convChannel = supabaseSupport
          .channel('support_convs')
          .on(
            'postgres_changes' as any,
            { event: '*', schema: 'public', table: 'conversations' },
            (p: any) => {
              if (p?.new) upsertConversation(p.new as Conversation);
            }
          )
          .subscribe();

        msgChannel = supabaseSupport
          .channel('support_msgs')
          .on(
            'postgres_changes' as any,
            { event: 'INSERT', schema: 'public', table: 'messages' },
            (p: any) => {
              if (p?.new) upsertMessage(p.new as Message);
            }
          )
          .subscribe();

        return;
      }

      // ============ MODO CLIENTE ============
      console.log('[ChatProvider boot] modo CLIENTE, token =', token, 'activeConvId =', activeConvId);

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

      if (convErr) console.error('[client fetch active conversation]', convErr);
      setConversations(conv ? ([conv] as Conversation[]) : []);

      const { data: msgs, error: msgErr } = await supabasePublic
        .from('messages')
        .select('*')
        .eq('conversationId', activeConvId)
        .order('createdAt', { ascending: true });

      if (msgErr) console.error('[client fetch active messages]', msgErr);
      setMessages((msgs || []) as Message[]);

      // realtime: conversa
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
          (p: any) => {
            if (p?.new) upsertConversation(p.new as Conversation);
          }
        )
        .subscribe();

      // realtime: mensagens
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
          (p: any) => {
            if (p?.new) upsertMessage(p.new as Message);
          }
        )
        .subscribe();
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
      (typeof crypto !== 'undefined' && crypto.randomUUID?.()) ??
      Math.random().toString(36).slice(2) + Date.now().toString(36);

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

    // ⚠️ IMPORTANTÍSSIMO: preencher client_token (snake_case) porque as policies usam isso
    const conv = {
      id,
      communityId,
      status: 'open',
      claimedBy: null,
      createdAt: new Date().toISOString(),
      memberId: memberId ?? null,

      // dupla escrita (compatibilidade com seu schema atual)
      client_token: clientToken,
      clientToken: clientToken,
    };

    const { data, error } = await supabasePublic
      .from('conversations')
      .insert(conv as any)
      .select('*')
      .single();

    if (error) {
      console.error('[createConversation] insert error', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      throw error;
    }

    if (data) upsertConversation(data as any);

    setActiveConversationId(id);
    return id;
  };

  const addMessage = async (conversationId: string, text: string, senderType: SenderType) => {
    const clientToken = getOrCreateClientToken();

    const payload = {
      id:
        (typeof crypto !== 'undefined' && crypto.randomUUID?.()) ??
        Math.random().toString(36).slice(2) + Date.now().toString(36),
      conversationId,
      senderType,
      messageType: 'text' as const,
      text,

      // ⚠️ IMPORTANTÍSSIMO: preencher client_token (snake_case)
      client_token: clientToken,
      clientToken: clientToken,

      // createdAt opcional: se sua coluna tem default no banco, você pode remover
      createdAt: new Date().toISOString(),
    };

    // optimistic local
    upsertMessage(payload as any);

    const client = senderType === 'agent' ? supabaseSupport : supabasePublic;

    const { data, error } = await client.from('messages').insert(payload as any).select('*').single();

    if (error) {
      console.error('[addMessage] insert error', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      return;
    }

    if (data) upsertMessage(data as Message);
  };

  const sendImageMessage = async (conversationId: string, file: File, senderType: SenderType) => {
    const clientToken = getOrCreateClientToken();

    const { publicUrl, path } = await uploadChatImage({
      file,
      conversationId,
      senderType,
    });

    const payload = {
      id:
        (typeof crypto !== 'undefined' && crypto.randomUUID?.()) ??
        Math.random().toString(36).slice(2) + Date.now().toString(36),
      conversationId,
      senderType,
      messageType: 'image' as const,
      text: '',
      imageUrl: publicUrl,
      storagePath: path,

      // ⚠️ IMPORTANTÍSSIMO: preencher client_token (snake_case)
      client_token: clientToken,
      clientToken: clientToken,

      createdAt: new Date().toISOString(),
    };

    upsertMessage(payload as any);

    const client = senderType === 'agent' ? supabaseSupport : supabasePublic;

    const { data, error } = await client.from('messages').insert(payload as any).select('*').single();

    if (error) {
      console.error('[sendImageMessage] insert error', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      return;
    }

    if (data) upsertMessage(data as Message);
  };

  const claimConversation = async (conversationId: string) => {
    const claimedBy = currentUser?.name || 'Atendente';

    const { data, error } = await supabaseSupport
      .from('conversations')
      .update({ status: 'claimed', claimedBy })
      .eq('id', conversationId)
      .select('*')
      .single();

    if (error) throw error;
    upsertConversation(data as Conversation);
  };

  const closeConversation = async (conversationId: string) => {
    const { data, error } = await supabaseSupport
      .from('conversations')
      .update({ status: 'closed' })
      .eq('id', conversationId)
      .select('*')
      .single();

    if (error) throw error;
    upsertConversation(data as Conversation);
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
