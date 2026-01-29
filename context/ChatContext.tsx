import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Conversation, Message, User, SenderType } from '../types';
import {
  supabasePublic,
  supabaseSupport,
  refreshPublicRealtimeToken,
  CLIENT_TOKEN_KEY,
} from '../lib/supabase';
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
  const existing = localStorage.getItem(CLIENT_TOKEN_KEY);
  if (existing) return existing;

  const token =
    crypto.randomUUID?.() ??
    Math.random().toString(36).slice(2) + Date.now().toString(36);

  localStorage.setItem(CLIENT_TOKEN_KEY, token);
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

  const upsertMessagesBulk = useCallback((msgs: Message[]) => {
    setMessages((prev) => {
      const map = new Map(prev.map((m) => [m.id, m]));
      msgs.forEach((m) => map.set(m.id, m));
      return Array.from(map.values()).sort((a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });
  }, []);

  const setActiveConversationId = useCallback((id: string | null) => {
    if (id) localStorage.setItem('redoma_active_conv', id);
    else localStorage.removeItem('redoma_active_conv');
    setActiveConvIdState(id);
  }, []);

  /* ===================== BOOT ===================== */

  useEffect(() => {
    let msgChannel: any;

    const boot = async () => {
      if (isAgent || !activeConvId) return;

      getOrCreateClientToken();
      await refreshPublicRealtimeToken();

      const { data } = await supabasePublic
        .from('messages')
        .select('*')
        .eq('conversation_id', activeConvId)
        .order('created_at', { ascending: true });

      setMessages(data || []);

      msgChannel = supabasePublic
        .channel(`client_messages_${activeConvId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${activeConvId}`,
          },
          (p: any) => {
            if (p?.new) upsertMessagesBulk([p.new]);
          }
        )
        .subscribe();
    };

    boot();
    return () => {
      msgChannel?.unsubscribe?.();
    };
  }, [activeConvId, isAgent, upsertMessagesBulk]);

  /* ===================== ACTIONS ===================== */

  const addMessage = async (conversationId: string, text: string, senderType: SenderType) => {
    const clientToken = getOrCreateClientToken();
    await refreshPublicRealtimeToken();

    const payload = {
      id: crypto.randomUUID(),
      conversation_id: conversationId,
      sender_type: senderType,
      message_type: 'text',
      text,
      client_token: clientToken,
      created_at: new Date().toISOString(),
    };

    await supabasePublic.from('messages').insert(payload);

    // 🔥 PONTO CRÍTICO: refetch imediato após primeira msg
    if (senderType === 'client') {
      const { data } = await supabasePublic
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      upsertMessagesBulk(data || []);
    }
  };

  const sendImageMessage = async (conversationId: string, file: File, senderType: SenderType) => {
    const { publicUrl, path } = await uploadChatImage({ file, conversationId, senderType });

    await addMessage(conversationId, '', senderType);
  };

  const login = (email: string) => {
    const user: User = { id: 'agent', name: 'Atendente Redoma', email, role: 'agent' };
    setCurrentUser(user);
    localStorage.setItem('redoma_current_user', JSON.stringify(user));
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('redoma_current_user');
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
        login,
        logout,
        createConversation: async () => '',
        addMessage,
        sendImageMessage,
        claimConversation: async () => {},
        closeConversation: async () => {},
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
