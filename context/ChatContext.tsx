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
  if (existing) {
    console.log('🔑 [Token] Usando token existente:', existing);
    return existing;
  }

  const token =
    (typeof crypto !== 'undefined' && crypto.randomUUID?.()) ??
    Math.random().toString(36).slice(2) + Date.now().toString(36);

  localStorage.setItem('redoma_client_token', token);
  console.log('🔑 [Token] Novo token criado:', token);
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
    console.log('💬 [Conversation] Upsert:', {
      id: conv.id,
      status: conv.status,
      community_id: conv.community_id,
    });
    setConversations((prev) => {
      const exists = prev.some((c) => c.id === conv.id);
      if (!exists) {
        console.log('💬 [Conversation] Nova conversa adicionada');
        return [...prev, conv];
      }
      console.log('💬 [Conversation] Conversa atualizada');
      return prev.map((c) => (c.id === conv.id ? conv : c));
    });
  }, []);

  const upsertMessage = useCallback((msg: Message) => {
    console.log('📨 [Message] Tentando upsert:', {
      id: msg.id,
      conversation_id: msg.conversation_id,
      sender_type: msg.sender_type,
      message_type: msg.message_type,
      text: msg.text?.substring(0, 30),
      created_at: msg.created_at,
    });
    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) {
        console.log('⚠️ [Message] Mensagem já existe, ignorando:', msg.id);
        return prev;
      }
      console.log('✅ [Message] Nova mensagem adicionada. Total:', prev.length + 1);
      return [...prev, msg];
    });
  }, []);

  const setActiveConversationId = useCallback((id: string | null) => {
    console.log('🎯 [Active Conv] Mudando de', localStorage.getItem('redoma_active_conv'), 'para:', id);
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
        console.log('🟢 ========== MODO SUPORTE ==========');

        const { data: convs, error: convErr } = await supabaseSupport
          .from('conversations')
          .select('*');

        if (convErr) {
          console.error('❌ [SUPORTE] Erro ao buscar conversas:', convErr);
        } else {
          console.log('✅ [SUPORTE] Conversas carregadas:', convs?.length);
          console.table(convs);
        }
        setConversations((convs || []) as Conversation[]);

        const { data: msgs, error: msgErr } = await supabaseSupport
          .from('messages')
          .select('*')
          .order('created_at', { ascending: true });

        if (msgErr) {
          console.error('❌ [SUPORTE] Erro ao buscar mensagens:', msgErr);
        } else {
          console.log('✅ [SUPORTE] Mensagens carregadas:', msgs?.length);
          console.table(msgs);
        }
        setMessages((msgs || []) as Message[]);

        console.log('📡 [SUPORTE] Iniciando realtime subscriptions...');

        convChannel = supabaseSupport
          .channel('support_convs')
          .on(
            'postgres_changes' as any,
            { event: '*', schema: 'public', table: 'conversations' },
            (payload: any) => {
              console.log('🟢 [SUPORTE Realtime] Evento em conversations:', payload);
              if (payload?.new) upsertConversation(payload.new as Conversation);
            }
          )
          .subscribe((status) => {
            console.log('🟢 [SUPORTE Realtime] Status conversations:', status);
          });

        msgChannel = supabaseSupport
          .channel('support_msgs')
          .on(
            'postgres_changes' as any,
            { event: 'INSERT', schema: 'public', table: 'messages' },
            (payload: any) => {
              console.log('🟢 [SUPORTE Realtime] Nova mensagem!', payload);
              if (payload?.new) upsertMessage(payload.new as Message);
            }
          )
          .subscribe((status) => {
            console.log('🟢 [SUPORTE Realtime] Status messages:', status);
          });

        return;
      }

      // ============ MODO CLIENTE ============
      console.log('🔵 ========== MODO CLIENTE ==========');
      console.log('🔵 Token:', token);
      console.log('🔵 Active Conv ID:', activeConvId);

      if (!activeConvId) {
        console.log('⚠️ [CLIENTE] Sem conversa ativa');
        setConversations([]);
        setMessages([]);
        return;
      }

      console.log('🔵 [CLIENTE] Buscando conversa:', activeConvId);
      const { data: conv, error: convErr } = await supabasePublic
        .from('conversations')
        .select('*')
        .eq('id', activeConvId)
        .maybeSingle();

      if (convErr) {
        console.error('❌ [CLIENTE] Erro ao buscar conversa:', convErr);
      } else if (!conv) {
        console.error('❌ [CLIENTE] Conversa não encontrada!');
      } else {
        console.log('✅ [CLIENTE] Conversa encontrada:', conv);
      }
      setConversations(conv ? ([conv] as Conversation[]) : []);

      console.log('🔵 [CLIENTE] Buscando mensagens da conversa:', activeConvId);
      const { data: msgs, error: msgErr } = await supabasePublic
        .from('messages')
        .select('*')
        .eq('conversation_id', activeConvId)
        .order('created_at', { ascending: true });

      if (msgErr) {
        console.error('❌ [CLIENTE] Erro ao buscar mensagens:', msgErr);
        console.error('❌ Detalhes:', {
          message: msgErr.message,
          details: msgErr.details,
          hint: msgErr.hint,
          code: msgErr.code,
        });
      } else {
        console.log('✅ [CLIENTE] Mensagens encontradas:', msgs?.length);
        console.table(msgs);
      }
      setMessages((msgs || []) as Message[]);

      console.log('📡 [CLIENTE] Iniciando realtime subscriptions...');
      console.log('📡 [CLIENTE] Filtro: conversation_id=eq.' + activeConvId);

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
          (payload: any) => {
            console.log('🔵 [CLIENTE Realtime] Evento em conversations:', payload);
            if (payload?.new) upsertConversation(payload.new as Conversation);
          }
        )
        .subscribe((status) => {
          console.log('🔵 [CLIENTE Realtime] Status conversations:', status);
          if (status === 'SUBSCRIBED') {
            console.log('✅ [CLIENTE] Canal conversations CONECTADO!');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ [CLIENTE] ERRO no canal conversations!');
          }
        });

      // realtime: mensagens
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
          (payload: any) => {
            console.log('🔵 [CLIENTE Realtime] Nova mensagem recebida!', payload);
            if (payload?.new) upsertMessage(payload.new as Message);
          }
        )
        .subscribe((status) => {
          console.log('🔵 [CLIENTE Realtime] Status messages:', status);
          if (status === 'SUBSCRIBED') {
            console.log('✅ [CLIENTE] Canal messages CONECTADO!');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ [CLIENTE] ERRO no canal messages!');
          }
        });
    };

    boot();

    return () => {
      console.log('🔌 [Cleanup] Desconectando canais realtime');
      convChannel?.unsubscribe?.();
      msgChannel?.unsubscribe?.();
    };
  }, [isAgent, activeConvId, upsertConversation, upsertMessage]);

  /* ===================== AUTH ===================== */

  const login = (email: string) => {
    const user: User = { id: 'agent', name: 'Atendente Redoma', email, role: 'agent' };
    console.log('👤 [Auth] Login:', user);
    setCurrentUser(user);
    localStorage.setItem('redoma_current_user', JSON.stringify(user));
  };

  const logout = () => {
    console.log('👤 [Auth] Logout');
    setCurrentUser(null);
    localStorage.removeItem('redoma_current_user');
  };

  /* ===================== ACTIONS ===================== */

  const createConversation = async (communityId: string) => {
    const clientToken = getOrCreateClientToken();
    const id =
      (typeof crypto !== 'undefined' && crypto.randomUUID?.()) ??
      Math.random().toString(36).slice(2) + Date.now().toString(36);

    console.log('💬 ========== CRIANDO CONVERSA ==========');
    console.log('💬 ID:', id);
    console.log('💬 Community ID:', communityId);
    console.log('💬 Client Token:', clientToken);

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

    const conv = {
      id,
      community_id: communityId,
      status: 'open',
      claimed_by: null,
      created_at: new Date().toISOString(),
      member_id: memberId ?? null,
      client_token: clientToken,
    };

    console.log('💬 Payload:', conv);

    const { data, error } = await supabasePublic
      .from('conversations')
      .insert(conv as any)
      .select('*')
      .single();

    if (error) {
      console.error('❌ [createConversation] ERRO:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      throw error;
    }

    console.log('✅ [createConversation] Conversa criada com sucesso!');
    console.log('✅ Data retornada:', data);
    if (data) upsertConversation(data as any);

    setActiveConversationId(id);
    return id;
  };

  const addMessage = async (conversationId: string, text: string, senderType: SenderType) => {
    const clientToken = getOrCreateClientToken();

    console.log('📤 ========== ENVIANDO MENSAGEM ==========');
    console.log('📤 Conversation ID:', conversationId);
    console.log('📤 Sender Type:', senderType);
    console.log('📤 Text:', text.substring(0, 50));
    console.log('📤 Client Token:', clientToken);

    const payload = {
      id:
        (typeof crypto !== 'undefined' && crypto.randomUUID?.()) ??
        Math.random().toString(36).slice(2) + Date.now().toString(36),
      conversation_id: conversationId,
      sender_type: senderType,
      message_type: 'text' as const,
      text,
      client_token: clientToken,
      created_at: new Date().toISOString(),
    };

    console.log('📤 Payload completo:', payload);

    // optimistic local
    console.log('📤 Adicionando mensagem otimisticamente...');
    upsertMessage(payload as any);

    const client = senderType === 'agent' ? supabaseSupport : supabasePublic;
    console.log('📤 Usando client:', senderType === 'agent' ? 'supabaseSupport' : 'supabasePublic');

    const { data, error } = await client.from('messages').insert(payload as any).select('*').single();

    if (error) {
      console.error('❌ [addMessage] ERRO AO INSERIR:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        payload: payload,
      });
      return;
    }

    console.log('✅ [addMessage] Mensagem inserida com SUCESSO!');
    console.log('✅ Data retornada:', data);
    if (data) upsertMessage(data as Message);
  };

  const sendImageMessage = async (conversationId: string, file: File, senderType: SenderType) => {
    const clientToken = getOrCreateClientToken();

    console.log('📸 [sendImageMessage] Iniciando upload...');

    const { publicUrl, path } = await uploadChatImage({
      file,
      conversationId,
      senderType,
    });

    console.log('📸 Upload concluído:', { publicUrl, path });

    const payload = {
      id:
        (typeof crypto !== 'undefined' && crypto.randomUUID?.()) ??
        Math.random().toString(36).slice(2) + Date.now().toString(36),
      conversation_id: conversationId,
      sender_type: senderType,
      message_type: 'image' as const,
      text: '',
      imageUrl: publicUrl,
      storagePath: path,
      client_token: clientToken,
      created_at: new Date().toISOString(),
    };

    upsertMessage(payload as any);

    const client = senderType === 'agent' ? supabaseSupport : supabasePublic;

    const { data, error } = await client.from('messages').insert(payload as any).select('*').single();

    if (error) {
      console.error('❌ [sendImageMessage] ERRO:', error);
      return;
    }

    console.log('✅ [sendImageMessage] Sucesso:', data);
    if (data) upsertMessage(data as Message);
  };

  const claimConversation = async (conversationId: string) => {
    const claimedBy = currentUser?.name || 'Atendente';

    console.log('✋ [claimConversation] Assumindo:', conversationId);

    const { data, error } = await supabaseSupport
      .from('conversations')
      .update({ status: 'claimed', claimed_by: claimedBy })
      .eq('id', conversationId)
      .select('*')
      .single();

    if (error) {
      console.error('❌ [claimConversation] ERRO:', error);
      throw error;
    }

    console.log('✅ [claimConversation] Sucesso:', data);
    upsertConversation(data as Conversation);
  };

  const closeConversation = async (conversationId: string) => {
    console.log('🔒 [closeConversation] Fechando:', conversationId);

    const { data, error } = await supabaseSupport
      .from('conversations')
      .update({ status: 'closed' })
      .eq('id', conversationId)
      .select('*')
      .single();

    if (error) {
      console.error('❌ [closeConversation] ERRO:', error);
      throw error;
    }

    console.log('✅ [closeConversation] Sucesso:', data);
    upsertConversation(data as Conversation);
  };

  const getConversation = (id: string) => {
    const conv = conversations.find((c) => c.id === id);
    console.log('🔍 [getConversation]', id, '→', conv ? 'ENCONTRADA' : 'NÃO ENCONTRADA');
    return conv;
  };

  const getMessages = (conversationId: string) => {
    const msgs = messages.filter((m) => m.conversation_id === conversationId);
    console.log('🔍 [getMessages]', conversationId, '→', msgs.length, 'mensagens');
    return msgs;
  };

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