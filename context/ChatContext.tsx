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
    (Math.random().toString(36).slice(2) + Date.now().toString(36));

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

  // 🔁 helper: refetch das mensagens de uma conversa
  const refreshMessages = useCallback(
    async (conversationId: string) => {
      try {
        console.log('[refreshMessages] fetching from Supabase for conv', conversationId);

        const { data, error } = await supabasePublic
          .from('messages')
          .select('*')
          .eq('conversationId', conversationId)
          .order('createdAt', { ascending: true });

        if (error) {
          console.error('[refreshMessages] error', error);
          return;
        }

        if (!data) return;

        const fresh = data as Message[];

        setMessages((prev) => {
          const other = prev.filter((m) => m.conversationId !== conversationId);
          return [...other, ...fresh];
        });
      } catch (err) {
        console.error('[refreshMessages] fatal', err);
      }
    },
    []
  );

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
    const id =
      crypto?.randomUUID?.() ??
      (Math.random().toString(36).slice(2) + Date.now().toString(36));

    // 🔹 Recupera memberId salvo na sessão (nome + comunidade)
    let memberId: string | null = null;
    const rawSession = localStorage.getItem('redoma_member_session');
    if (rawSession) {
      try {
        const parsed = JSON.parse(rawSession) as { memberId?: string; communityId?: string };
        if (parsed?.memberId) {
          memberId = parsed.memberId;
        }
      } catch {
        // se der erro de parse, ignora e segue sem memberId
      }
    }

    const conv = {
      id,
      communityId,
      status: 'open' as const,
      claimedBy: null,
      createdAt: new Date().toISOString(),
      clientToken,
      // novo campo: amarra conversa ao membro
      memberId: memberId ?? null,
    };

    await supabasePublic.from('conversations').insert(conv);
    setActiveConversationId(id);
    upsertConversation(conv as any);
    return id;
  };

  const addMessage = async (
    conversationId: string,
    text: string,
    senderType: SenderType
  ) => {
    const clientToken = getOrCreateClientToken();
    const msg: Message = {
      id:
        crypto?.randomUUID?.() ??
        (Math.random().toString(36).slice(2) + Date.now().toString(36)),
      conversationId,
      senderType,
      messageType: 'text',
      text,
      clientToken,
      createdAt: new Date().toISOString(),
    };

    console.log('[addMessage] called', { conversationId, text, senderType, msg });

    const client = senderType === 'agent' ? supabaseSupport : supabasePublic;

    // ✅ sempre plota localmente pro cliente (optimistic)
    if (senderType === 'client') {
      upsertMessage(msg);
    }

    try {
      const { error } = await client.from('messages').insert(msg);
      if (error) {
        console.error('[addMessage] insert error', error);
        return;
      }

      if (senderType === 'client') {
        await refreshMessages(conversationId);
      }
    } catch (err) {
      console.error('[addMessage] fatal', err);
    }
  };

  const sendImageMessage = async (
    conversationId: string,
    file: File,
    senderType: SenderType
  ) => {
    const clientToken = getOrCreateClientToken();

    console.log('[sendImageMessage REAL] file:', {
      name: file.name,
      size: file.size,
      type: file.type,
    });

    const { publicUrl, path } = await uploadChatImage({
      file,
      conversationId,
      senderType,
    });

    console.log('[sendImageMessage REAL] upload ok:', { publicUrl, path });

    const msg: Message = {
      id:
        crypto?.randomUUID?.() ??
        (Math.random().toString(36).slice(2) + Date.now().toString(36)),
      conversationId,
      senderType,
      messageType: 'image',
      text: '',
      imageUrl: publicUrl,
      storagePath: path,
      clientToken,
      createdAt: new Date().toISOString(),
    };

    const client = senderType === 'agent' ? supabaseSupport : supabasePublic;

    if (senderType === 'client') {
      upsertMessage(msg);
    }

    try {
      const { error } = await client.from('messages').insert(msg);

      if (error) {
        console.error('[sendImageMessage REAL] insert error', error);
        return;
      }

      if (senderType === 'client') {
        await refreshMessages(conversationId);
      }

      console.log('[sendImageMessage REAL] mensagem de imagem inserida com sucesso');
    } catch (err) {
      console.error('[sendImageMessage REAL] fatal', err);
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

  const getMessages = (conversationId: string) =>
    messages
      .filter((m) => m.conversationId === conversationId)
      .slice()
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

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
