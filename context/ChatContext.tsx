import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Conversation, Message, User, SenderType } from '../types';
import { supabasePublic, supabaseSupport } from '../lib/supabase';

interface ChatContextType {
  conversations: Conversation[];
  messages: Message[];
  currentUser: User | null;
  login: (email: string) => void; // pode manter (só pro estado local)
  logout: () => void;
  createConversation: (communityId: string) => Promise<string>;
  addMessage: (conversationId: string, text: string, senderType: SenderType) => Promise<void>;
  claimConversation: (conversationId: string) => Promise<void>;
  closeConversation: (conversationId: string) => Promise<void>;
  getConversation: (id: string) => Conversation | undefined;
  getMessages: (conversationId: string) => Message[];
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const getOrCreateClientToken = () => {
  const existing = localStorage.getItem('redoma_client_token');
  if (existing) return existing;

  const token =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto && crypto.randomUUID()
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);

  localStorage.setItem('redoma_client_token', token);
  return token;
};

const getActiveConversationId = () => localStorage.getItem('redoma_active_conv');

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('redoma_current_user');
    return stored ? JSON.parse(stored) : null;
  });

  const isAgent = useMemo(() => !!currentUser, [currentUser]);

  useEffect(() => {
    let convChannel: any;
    let msgChannel: any;

    const boot = async () => {
      try {
        // sempre garanta token para cliente
        getOrCreateClientToken();

        if (isAgent) {
          // ✅ SUPORTE: usar supabaseSupport
          const { data: convs, error: convErr } = await supabaseSupport.from('conversations').select('*');
          if (convErr) console.error('[support fetch conversations]', convErr);
          if (convs) setConversations(convs as Conversation[]);

          const { data: msgs, error: msgErr } = await supabaseSupport
            .from('messages')
            .select('*')
            .order('createdAt', { ascending: true });
          if (msgErr) console.error('[support fetch messages]', msgErr);
          if (msgs) setMessages(msgs as Message[]);

          convChannel = supabaseSupport
            .channel('support_conversations_channel')
            .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'conversations' }, (payload: any) => {
              if (payload.eventType === 'INSERT') {
                setConversations((prev) => [...prev, payload.new as Conversation]);
              } else if (payload.eventType === 'UPDATE') {
                setConversations((prev) =>
                  prev.map((c) => (c.id === payload.new.id ? (payload.new as Conversation) : c))
                );
              }
            })
            .subscribe();

          msgChannel = supabaseSupport
            .channel('support_messages_channel')
            .on('postgres_changes' as any, { event: 'INSERT', schema: 'public', table: 'messages' }, (payload: any) => {
              setMessages((prev) => [...prev, payload.new as Message]);
            })
            .subscribe();

          return;
        }

        // ✅ CLIENTE (ANON): usar supabasePublic e limitar ao chat ativo
        const activeConvId = getActiveConversationId();

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
        } else {
          setConversations([]);
          setMessages([]);
        }

        if (activeConvId) {
          convChannel = supabasePublic
            .channel(`client_conversations_${activeConvId}`)
            .on(
              'postgres_changes' as any,
              { event: '*', schema: 'public', table: 'conversations', filter: `id=eq.${activeConvId}` },
              (payload: any) => setConversations([payload.new as Conversation])
            )
            .subscribe();

          msgChannel = supabasePublic
            .channel(`client_messages_${activeConvId}`)
            .on(
              'postgres_changes' as any,
              { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversationId=eq.${activeConvId}` },
              (payload: any) => setMessages((prev) => [...prev, payload.new as Message])
            )
            .subscribe();
        }
      } catch (err) {
        console.error('[ChatProvider boot]', err);
      }
    };

    boot();

    return () => {
      convChannel?.unsubscribe?.();
      msgChannel?.unsubscribe?.();
    };
  }, [isAgent]);

  // Mantém só pro estado local (não substitui o login real do AgentLogin)
  const login = (email: string) => {
    const user: User = { id: 'agent-local', name: 'Atendente Redoma', email, role: 'agent' };
    setCurrentUser(user);
    localStorage.setItem('redoma_current_user', JSON.stringify(user));
  };

  const logout = async () => {
    setCurrentUser(null);
    localStorage.removeItem('redoma_current_user');

    // importante: desloga do supabaseSupport (se tiver logado)
    try {
      await supabaseSupport.auth.signOut();
    } catch {
      // ignore
    }
  };

  const createConversation = async (communityId: string): Promise<string> => {
    const clientToken = getOrCreateClientToken();
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto && crypto.randomUUID()
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2, 11);

    const newConv = {
      id,
      communityId,
      status: 'open' as const,
      claimedBy: null,
      createdAt: new Date().toISOString(),
      clientToken,
    };

    const { error } = await supabasePublic.from('conversations').insert([newConv]);
    if (error) {
      console.error('[client createConversation]', error);
      throw error;
    }

    setConversations((prev) => (prev.some((c) => c.id === id) ? prev : [...prev, newConv as any]));
    return id;
  };

  const addMessage = async (conversationId: string, text: string, senderType: SenderType) => {
    const clientToken = getOrCreateClientToken();

    const newMessage = {
      id:
        typeof crypto !== 'undefined' && 'randomUUID' in crypto && crypto.randomUUID()
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2, 11),
      conversationId,
      text,
      senderType,
      createdAt: new Date().toISOString(),
      clientToken,
    };

    // cliente manda via public; agente também poderia mandar via support (se você quiser separar)
    const clientToUse = senderType === 'agent' ? supabaseSupport : supabasePublic;

    const { error } = await clientToUse.from('messages').insert([newMessage]);
    if (error) {
      console.error('[addMessage]', error);
      throw error;
    }

    setMessages((prev) => [...prev, newMessage as any]);
  };

  const claimConversation = async (conversationId: string) => {
    // agente: sempre via supabaseSupport
    const { error } = await supabaseSupport
      .from('conversations')
      .update({ status: 'claimed', claimedBy: currentUser?.name || 'Atendente' })
      .eq('id', conversationId);

    if (error) console.error('[support claimConversation]', error);
  };

  const closeConversation = async (conversationId: string) => {
    const { error } = await supabaseSupport.from('conversations').update({ status: 'closed' }).eq('id', conversationId);
    if (error) console.error('[support closeConversation]', error);
  };

  const getConversation = (id: string) => conversations.find((c) => c.id === id);
  const getMessages = (conversationId: string) => messages.filter((m) => m.conversationId === conversationId);

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
        claimConversation,
        closeConversation,
        getConversation,
        getMessages,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) throw new Error('useChat must be used within a ChatProvider');
  return context;
};
