import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Conversation, Message, User, SenderType } from '../types';
import { supabase } from '../lib/supabase';

interface ChatContextType {
  conversations: Conversation[];
  messages: Message[];
  currentUser: User | null;
  login: (email: string) => void;
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
    (typeof crypto !== 'undefined' && 'randomUUID' in crypto && crypto.randomUUID())
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

  // Carrega dados iniciais + realtime
  useEffect(() => {
    let convChannel: any;
    let msgChannel: any;

    const boot = async () => {
      try {
        // Sempre garanta que o token existe (cliente anon depende disso)
        const clientToken = getOrCreateClientToken();

        if (isAgent) {
          // ⚠️ Agente: seu login hoje é "fake" (não faz auth no Supabase).
          // Então este fetch pode ser bloqueado por RLS dependendo das suas policies.
          // Mantive para não quebrar a lógica — mas o ideal é o agente logar via supabase.auth.
          const { data: convs, error: convErr } = await supabase.from('conversations').select('*');
          if (convErr) console.error('[fetch conversations]', convErr);
          if (convs) setConversations(convs as Conversation[]);

          const { data: msgs, error: msgErr } = await supabase
            .from('messages')
            .select('*')
            .order('createdAt', { ascending: true });
          if (msgErr) console.error('[fetch messages]', msgErr);
          if (msgs) setMessages(msgs as Message[]);

          // Realtime (agente): tudo
          convChannel = supabase
            .channel('conversations_channel')
            .on(
              'postgres_changes' as any,
              { event: '*', schema: 'public', table: 'conversations' },
              (payload: any) => {
                if (payload.eventType === 'INSERT') {
                  setConversations(prev => [...prev, payload.new as Conversation]);
                } else if (payload.eventType === 'UPDATE') {
                  setConversations(prev =>
                    prev.map(c => (c.id === payload.new.id ? (payload.new as Conversation) : c))
                  );
                }
              }
            )
            .subscribe();

          msgChannel = supabase
            .channel('messages_channel')
            .on(
              'postgres_changes' as any,
              { event: 'INSERT', schema: 'public', table: 'messages' },
              (payload: any) => setMessages(prev => [...prev, payload.new as Message])
            )
            .subscribe();

          return;
        }

        // ✅ Cliente anon: buscar só a conversa ativa + mensagens dela
        const activeConvId = getActiveConversationId();

        if (activeConvId) {
          const { data: conv, error: convErr } = await supabase
            .from('conversations')
            .select('*')
            .eq('id', activeConvId)
            .maybeSingle();

          if (convErr) console.error('[fetch active conversation]', convErr);
          if (conv) setConversations([conv as Conversation]);

          const { data: msgs, error: msgErr } = await supabase
            .from('messages')
            .select('*')
            .eq('conversationId', activeConvId)
            .order('createdAt', { ascending: true });

          if (msgErr) console.error('[fetch active messages]', msgErr);
          if (msgs) setMessages(msgs as Message[]);
        } else {
          // sem conversa ativa ainda: não puxa nada
          setConversations([]);
          setMessages([]);
        }

        // Realtime (cliente): só a conversa ativa e mensagens dela
        if (activeConvId) {
          convChannel = supabase
            .channel(`conversations_${activeConvId}`)
            .on(
              'postgres_changes' as any,
              {
                event: '*',
                schema: 'public',
                table: 'conversations',
                filter: `id=eq.${activeConvId}`,
              },
              (payload: any) => {
                if (payload.eventType === 'INSERT') {
                  setConversations([payload.new as Conversation]);
                } else if (payload.eventType === 'UPDATE') {
                  setConversations([payload.new as Conversation]);
                }
              }
            )
            .subscribe();

          msgChannel = supabase
            .channel(`messages_${activeConvId}`)
            .on(
              'postgres_changes' as any,
              {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `conversationId=eq.${activeConvId}`,
              },
              (payload: any) => setMessages(prev => [...prev, payload.new as Message])
            )
            .subscribe();
        }
      } catch (err) {
        console.error('[ChatProvider boot]', err);
      }
    };

    boot();

    return () => {
      try {
        convChannel?.unsubscribe?.();
        msgChannel?.unsubscribe?.();
      } catch {
        // ignore
      }
    };
  }, [isAgent]);

  const login = (email: string) => {
    const user: User = { id: 'agent-1', name: 'Atendente Redoma', email, role: 'agent' };
    setCurrentUser(user);
    localStorage.setItem('redoma_current_user', JSON.stringify(user));
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('redoma_current_user');
  };

  const createConversation = async (communityId: string): Promise<string> => {
    const clientToken = getOrCreateClientToken();
    const id =
      (typeof crypto !== 'undefined' && 'randomUUID' in crypto && crypto.randomUUID())
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2, 11);

    const newConv = {
      id,
      communityId,
      status: 'open' as const,
      claimedBy: null,
      createdAt: new Date().toISOString(),
      clientToken, // ✅ essencial para RLS/isolamento
    };

    const { error } = await supabase.from('conversations').insert([newConv]);
    if (error) {
      console.error('[createConversation]', error);
      throw error;
    }

    // atualiza estado local (cliente já entra no chat)
    setConversations(prev => {
      const exists = prev.some(c => c.id === id);
      return exists ? prev : [...prev, newConv as any];
    });

    return id;
  };

  const addMessage = async (conversationId: string, text: string, senderType: SenderType) => {
    const clientToken = getOrCreateClientToken();

    const newMessage = {
      id:
        (typeof crypto !== 'undefined' && 'randomUUID' in crypto && crypto.randomUUID())
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2, 11),
      conversationId,
      text,
      senderType,
      createdAt: new Date().toISOString(),
      clientToken, // ✅ essencial para RLS/isolamento
    };

    const { error } = await supabase.from('messages').insert([newMessage]);
    if (error) {
      console.error('[addMessage]', error);
      throw error;
    }

    // otimista (realtime também vai trazer, mas isso deixa instantâneo)
    setMessages(prev => [...prev, newMessage as any]);
  };

  const claimConversation = async (conversationId: string) => {
    const { error } = await supabase
      .from('conversations')
      .update({ status: 'claimed', claimedBy: currentUser?.name || 'Atendente' })
      .eq('id', conversationId);

    if (error) console.error('[claimConversation]', error);
  };

  const closeConversation = async (conversationId: string) => {
    const { error } = await supabase.from('conversations').update({ status: 'closed' }).eq('id', conversationId);
    if (error) console.error('[closeConversation]', error);
  };

  const getConversation = (id: string) => conversations.find(c => c.id === id);
  const getMessages = (conversationId: string) => messages.filter(m => m.conversationId === conversationId);

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
