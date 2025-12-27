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
    setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
  }, []);

  const setActiveConversationId = useCallback((id: string | null) => {
    if (id) localStorage.setItem('redoma_active_conv', id);
    else localStorage.removeItem('redoma_active_conv');
    setActiveConvIdState(id);
  }, []);

  // 🔁 helper pra refazer o SELECT de mensagens de uma conversa
  const refreshMessages = useCallback(
    async (conversationId: string) => {
      try {
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

      if (isAgent) {
        const { data: convs } = await supabaseSupport.from('conversations').select('*');
        if (convs) setConversations(convs as Conversation[]);

        const { data: msgs } = await supabaseSupport
          .from('messages')
          .select('*')
          .order('createdAt', { ascending: true });
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

      if (activeConvId) {
        const { data: conv } = await supabasePublic
          .from('conversations')
          .select('*')
          .eq('id', activeConvId)
          .maybeSingle();
        if (conv) setConversations([conv as Conversation]);

        const { data: msgs } = await supabasePublic
          .from('messages')
          .select('*')
          .eq('conversationId', activeConvId)
          .order('createdAt', { ascending: true });
        if (msgs) setMessages(msgs as Message[]);
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
    const id = crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);

    const conv = {
      id,
      communityId,
      status: 'open' as const,
      claimedBy: null,
      createdAt: new Date().toISOString(),
      clientToken,
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
      id: crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2),
      conversationId,
      senderType,
      messageType: 'text',
      text,
      clientToken,
      createdAt: new Date().toISOString(),
    };

    const client = senderType === 'agent' ? supabaseSupport : supabasePublic;
    const { error } = await client.from('messages').insert(msg);
    if (error) throw error;

    if (senderType !== 'agent') {
      // otimista pro cliente
      upsertMessage(msg);
      // 💡 e logo depois, refetch pra puxar a mensagem automática do agente
      await refreshMessages(conversationId);
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
      id: crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2),
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
    const { error } = await client.from('messages').insert(msg);

    if (error) {
      console.error('[sendImageMessage REAL] insert error', error);
      throw error;
    }

    if (senderType !== 'agent') {
      // otimista pro cliente
      upsertMessage(msg);
      // 💡 refetch pra puxar a auto-resposta também quando o primeiro contato é por imagem
      await refreshMessages(conversationId);
    }

    console.log('[sendImageMessage REAL] mensagem de imagem inserida com sucesso');
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
