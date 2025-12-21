
import React, { createContext, useContext, useState, useEffect } from 'react';
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

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('redoma_current_user');
    return stored ? JSON.parse(stored) : null;
  });

  // Fetch initial data and setup real-time subscriptions
  useEffect(() => {
    const fetchData = async () => {
      const { data: convs } = await supabase.from('conversations').select('*');
      const { data: msgs } = await supabase.from('messages').select('*');
      if (convs) setConversations(convs);
      if (msgs) setMessages(msgs);
    };

    fetchData();

    // Subscribe to conversations changes
    // Fixed: Added schema: 'public' and used type casting to match Supabase Realtime overloads
    const convSubscription = supabase
      .channel('conversations_channel')
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'conversations' }, (payload: any) => {
        if (payload.eventType === 'INSERT') {
          setConversations(prev => [...prev, payload.new as Conversation]);
        } else if (payload.eventType === 'UPDATE') {
          setConversations(prev => prev.map(c => c.id === payload.new.id ? payload.new as Conversation : c));
        }
      })
      .subscribe();

    // Subscribe to messages changes
    // Fixed: Added schema: 'public' and used type casting to match Supabase Realtime overloads
    const msgSubscription = supabase
      .channel('messages_channel')
      .on('postgres_changes' as any, { event: 'INSERT', schema: 'public', table: 'messages' }, (payload: any) => {
        setMessages(prev => [...prev, payload.new as Message]);
      })
      .subscribe();

    return () => {
      convSubscription.unsubscribe();
      msgSubscription.unsubscribe();
    };
  }, []);

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
    const id = Math.random().toString(36).substr(2, 9);
    const newConv = {
      id,
      communityId,
      status: 'open' as const,
      createdAt: new Date().toISOString(),
    };
    
    await supabase.from('conversations').insert([newConv]);
    return id;
  };

  const addMessage = async (conversationId: string, text: string, senderType: SenderType) => {
    const newMessage = {
      id: Math.random().toString(36).substr(2, 9),
      conversationId,
      text,
      senderType,
      createdAt: new Date().toISOString(),
    };
    
    await supabase.from('messages').insert([newMessage]);
  };

  const claimConversation = async (conversationId: string) => {
    await supabase
      .from('conversations')
      .update({ status: 'claimed', claimedBy: currentUser?.name || 'Atendente' })
      .eq('id', conversationId);
  };

  const closeConversation = async (conversationId: string) => {
    await supabase
      .from('conversations')
      .update({ status: 'closed' })
      .eq('id', conversationId);
  };

  const getConversation = (id: string) => conversations.find(c => c.id === id);
  const getMessages = (conversationId: string) => messages.filter(m => m.conversationId === conversationId);

  return (
    <ChatContext.Provider value={{
      conversations, messages, currentUser, 
      login, logout, createConversation, addMessage, 
      claimConversation, closeConversation, getConversation, getMessages
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) throw new Error('useChat must be used within a ChatProvider');
  return context;
};
