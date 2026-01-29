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
  const existing = localStorage.getItem(CLIENT_TOKEN_KEY);
  if (existing) return existing;

  const token =
    (typeof crypto !== 'undefined' && crypto.randomUUID?.()) ??
    Math.random().toString(36).slice(2) + Date.now().toString(36);

  localStorage.setItem(CLIENT_TOKEN_KEY, token);
  return token;
};

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
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

      const next = [...prev, msg];

      next.sort((a, b) => {
        const ta = new Date(a.created_at).getTime();
        const tb = new Date(b.created_at).getTime();
        if (ta !== tb) return ta - tb;

        const sa = a.sender_type === 'client' ? 0 : 1;
        const sb = b.sender_type === 'client' ? 0 : 1;
        if (sa !== sb) return sa - sb;

        return String(a.id).localeCompare(String(b.id));
      });

      return next;
    });
  }, []);

  const removeOptimisticMessage = useCallback((id: string) => {
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
    let cancelled = false;

    const safeUnsub = async () => {
      try {
        if (convChannel) {
          await convChannel.unsubscribe?.();
          // @ts-ignore
          supabasePublic.removeChannel?.(convChannel);
          // @ts-ignore
          supabaseSupport.removeChannel?.(convChannel);
        }
      } catch {}

      try {
        if (msgChannel) {
          await msgChannel.unsubscribe?.();
          // @ts-ignore
          supabasePublic.removeChannel?.(msgChannel);
          // @ts-ignore
          supabaseSupport.removeChannel?.(msgChannel);
        }
      } catch {}
    };

    const boot = async () => {
      if (isAgent) {
        const { data: convs, error: convErr } =
          await supabaseSupport.from('conversations').select('*');

        if (cancelled) return;
        if (convErr) console.error('[support fetch conversations]', convErr);
        setConversations((convs || []) as Conversation[]);

        const { data: msgs, error: msgErr } = await supabaseSupport
          .from('messages')
          .select('*')
          .order('created_at', { ascending: true });

        if (cancelled) return;
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

      const token = getOrCreateClientToken();

      try {
        await refreshPublicRealtimeToken();
      } catch {}

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

      if (cancelled) return;
      if (convErr)
        console.error('[client fetch active conversation]', convErr);

      setConversations(conv ? ([conv] as Conversation[]) : []);

      const { data: msgs, error: msgErr } = await supabasePublic
        .from('messages')
        .select('*')
        .eq('conversation_id', activeConvId)
        .order('created_at', { ascending: true });

      if (cancelled) return;
      if (msgErr)
        console.error('[client fetch active messages]', msgErr);

      setMessages((msgs || []) as Message[]);

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
        .subscribe((status: any) =>
          console.log('[realtime client conv status]', status, 'token=', token)
        );

      msgChannel = supabasePublic
        .channel(`client_messages_${activeConvId}`)
        .on(
          'postgres_changes' as any,
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${activeConvId}`,
          },
          (p: any) => {
            if (p?.new) upsertMessage(p.new as Message);
          }
        )
        .subscribe((status: any) =>
          console.log('[realtime client msg status]', status, 'token=', token)
        );
    };

    boot();

    return () => {
      cancelled = true;
      void safeUnsub();
    };
  }, [isAgent, activeConvId, upsertConversation, upsertMessage]);

  /* ===================== AUTH ===================== */

  const login = (email: string) => {
    const user: User = {
      id: 'agent',
      name: 'Atendente Redoma',
      email,
      role: 'agent',
    };

    setCurrentUser(user);
    localStorage.setItem('redoma_current_user', JSON.stringify(user));
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('redoma_current_user');
  };

  /* ===================== ACTIONS ===================== */

  const createConversation = async (communityId: string) => {
    getOrCreateClientToken();
    try {
      await refreshPublicRealtimeToken();
    } catch {}

    const clientToken = localStorage.getItem(CLIENT_TOKEN_KEY)!;

    const id =
      (typeof crypto !== 'undefined' && crypto.randomUUID?.()) ??
      Math.random().toString(36).slice(2) + Date.now().toString(36);

    let memberId: string | null = null;
    const rawSession = localStorage.getItem('redoma_member_session');

    if (rawSession) {
      try {
        const parsed = JSON.parse(rawSession) as { memberId?: string };
        if (parsed?.memberId) memberId = parsed.memberId;
      } catch {}
    }

    const conv = {
      id,
      community_id: communityId,
      status: 'open',
      claimed_by: null,
      member_id: memberId ?? null,
      client_token: clientToken,
    };

    const { data, error } = await supabasePublic
      .from('conversations')
      .insert(conv as any)
      .select('*')
      .single();

    if (error) {
      console.error('[createConversation] insert error', error);
      throw error;
    }

    if (data) upsertConversation(data as any);
    setActiveConversationId(id);

    return id;
  };

  const addMessage = async (
    conversationId: string,
    text: string,
    senderType: SenderType
  ) => {
    const clientToken = getOrCreateClientToken();

    if (senderType !== 'agent') {
      try {
        await refreshPublicRealtimeToken();
      } catch {}
    }

    const optimisticId =
      (typeof crypto !== 'undefined' && crypto.randomUUID?.()) ??
      Math.random().toString(36).slice(2) + Date.now().toString(36);

    const payload = {
      id: optimisticId,
      conversation_id: conversationId,
      sender_type: senderType,
      message_type: 'text' as const,
      text,
      client_token: clientToken,
    };

    upsertMessage(payload as any);

    const client =
      senderType === 'agent' ? supabaseSupport : supabasePublic;

    const { data, error } = await client
      .from('messages')
      .insert(payload as any)
      .select('*')
      .single();

    if (error) {
      console.error('[addMessage] insert error', error);
      removeOptimisticMessage(optimisticId);
      return;
    }

    if (data) upsertMessage(data as Message);
  };

  const sendImageMessage = async (
    conversationId: string,
    file: File,
    senderType: SenderType
  ) => {
    const clientToken = getOrCreateClientToken();

    if (senderType !== 'agent') {
      try {
        await refreshPublicRealtimeToken();
      } catch {}
    }

    const { publicUrl, path } = await uploadChatImage({
      file,
      conversationId,
      senderType,
    });

    const optimisticId =
      (typeof crypto !== 'undefined' && crypto.randomUUID?.()) ??
      Math.random().toString(36).slice(2) + Date.now().toString(36);

    const payload = {
      id: optimisticId,
      conversation_id: conversationId,
      sender_type: senderType,
      message_type: 'image' as const,
      text: '',
      image_url: publicUrl,
      storage_path: path,
      client_token: clientToken,
    };

    upsertMessage(payload as any);

    const client =
      senderType === 'agent' ? supabaseSupport : supabasePublic;

    const { data, error } = await client
      .from('messages')
      .insert(payload as any)
      .select('*')
      .single();

    if (error) {
      console.error('[sendImageMessage] insert error', error);
      removeOptimisticMessage(optimisticId);
      return;
    }

    if (data) upsertMessage(data as Message);
  };

  const claimConversation = async (conversationId: string) => {
    const claimed_by = currentUser?.name || 'Atendente';
    const claimed_at = new Date().toISOString();

    const { data, error } = await supabaseSupport
      .from('conversations')
      .update({ status: 'claimed', claimed_by, claimed_at })
      .eq('id', conversationId)
      .select('*')
      .single();

    if (error) throw error;
    upsertConversation(data as Conversation);
  };

  const closeConversation = async (conversationId: string) => {
    const closed_at = new Date().toISOString();

    const { data, error } = await supabaseSupport
      .from('conversations')
      .update({ status: 'closed', closed_at })
      .eq('id', conversationId)
      .select('*')
      .single();

    if (error) throw error;
    upsertConversation(data as Conversation);
  };

  const getConversation = (id: string) =>
    conversations.find((c) => c.id === id);

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