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
      if (!exists) return [conv, ...prev];
      return prev.map((c) => (c.id === conv.id ? conv : c));
    });
  }, []);

  // ✅ IMPORTANTE: permite atualizar mensagem "optimistic" quando o DB responder
  // - Se já existir por id, substitui/mescla
  // - Se não existir, insere
  const upsertMessage = useCallback((msg: Message) => {
    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.id === msg.id);
      if (idx === -1) return [...prev, msg];
      const next = [...prev];
      next[idx] = { ...next[idx], ...msg };
      return next;
    });
  }, []);

  // ✅ também útil: remover uma mensagem (rollback) se insert falhar
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
        if (convs) setConversations(convs as Conversation[]);

        const { data: msgs, error: msgErr } = await supabaseSupport
          .from('messages')
          .select('*')
          .order('createdAt', { ascending: true });

        if (msgErr) console.error('[support fetch messages]', msgErr);
        if (msgs) setMessages(msgs as Message[]);

        convChannel = supabaseSupport
          .channel('support_convs')
          .on(
            'postgres_changes' as any,
            { event: '*', schema: 'public', table: 'conversations' },
            (p: any) => upsertConversation(p.new as Conversation)
          )
          .subscribe();

        msgChannel = supabaseSupport
          .channel('support_msgs')
          .on(
            'postgres_changes' as any,
            { event: 'INSERT', schema: 'public', table: 'messages' },
            (p: any) => upsertMessage(p.new as Message)
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
        if (conv) setConversations([conv as Conversation]);

        const { data: msgs, error: msgErr } = await supabasePublic
          .from('messages')
          .select('*')
          .eq('conversationId', activeConvId)
          .order('createdAt', { ascending: true });

        if (msgErr) console.error('[client fetch active messages]', msgErr);
        if (msgs) setMessages(msgs as Message[]);

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
            (p: any) => upsertConversation(p.new as Conversation)
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
            (p: any) => upsertMessage(p.new as Message)
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

    // 🔹 Recupera memberId salvo na sessão (nome + comunidade)
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

    const conv: any = {
      id,
      communityId,
      status: 'open' as const,
      claimedBy: null,
      createdAt: new Date().toISOString(),

      // compat: alguns lugares usam snake_case
      client_token: clientToken,
      clientToken: clientToken,

      memberId: memberId ?? null,
    };

    const { error } = await supabasePublic.from('conversations').insert(conv);
    if (error) {
      console.error('[createConversation] insert error', error);
      throw error;
    }

    setActiveConversationId(id);
    upsertConversation(conv as Conversation);
    return id;
  };

  const addMessage = async (
    conversationId: string,
    text: string,
    senderType: SenderType
  ) => {
    const clientToken = getOrCreateClientToken();
    const id = genId();

    const basePayload: any = {
      id,
      conversationId,
      senderType,
      messageType: 'text' as const,
      text,
      clientToken,
      // 👈 sem createdAt: Postgres preenche com default now()
    };

    const optimisticMsg: Message = {
      ...(basePayload as any),
      createdAt: new Date().toISOString(), // só pra UI local
    };

    const client = senderType === 'agent' ? supabaseSupport : supabasePublic;

    // ✅ optimistic sempre (cliente e agente), pra não ficar "sumindo"
    upsertMessage(optimisticMsg);

    try {
      const { data, error } = await client
        .from('messages')
        .insert(basePayload)
        .select('*')
        .single();

      if (error) {
        console.error('[addMessage] insert error', error);
        // rollback só se quiser (mantém pra debug ou remove pra UX)
        removeMessageById(id);
        return;
      }

      if (data) {
        // substitui/mescla a versão do banco (createdAt real etc)
        upsertMessage(data as Message);
      }
    } catch (err) {
      console.error('[addMessage] fatal', err);
      removeMessageById(id);
    }
  };

  const sendImageMessage = async (
    conversationId: string,
    file: File,
    senderType: SenderType
  ) => {
    const clientToken = getOrCreateClientToken();
    const id = genId();

    console.log('[sendImageMessage] file:', {
      name: file.name,
      size: file.size,
      type: file.type,
    });

    // ✅ optimistic placeholder (imagem carregando)
    const optimisticMsg: Message = {
      id,
      conversationId,
      senderType,
      messageType: 'image' as any,
      text: '',
      imageUrl: '', // placeholder
      storagePath: '',
      clientToken,
      createdAt: new Date().toISOString(),
    } as any;

    upsertMessage(optimisticMsg);

    try {
      const { publicUrl, path } = await uploadChatImage({
        file,
        conversationId,
        senderType,
      });

      const basePayload: any = {
        id,
        conversationId,
        senderType,
        messageType: 'image' as const,
        text: '',
        imageUrl: publicUrl,
        storagePath: path,
        clientToken,
      };

      const client = senderType === 'agent' ? supabaseSupport : supabasePublic;

      const { data, error } = await client
        .from('messages')
        .insert(basePayload)
        .select('*')
        .single();

      if (error) {
        console.error('[sendImageMessage] insert error', error);
        removeMessageById(id);
        return;
      }

      if (data) upsertMessage(data as Message);
    } catch (err) {
      console.error('[sendImageMessage] fatal', err);
      removeMessageById(id);
    }
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

  // ✅ mantém ordenação estável (createdAt), mas não quebra optimistic
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
