export type ConversationStatus = 'open' | 'claimed' | 'closed';

export interface Conversation {
  id: string;
  communityId: string;
  status: ConversationStatus;
  claimedBy?: string | null;
  createdAt: string;

  // amarra a conversa a uma pessoa da comunidade (members.member_id)
  memberId?: string | null;

  // "visto"
  last_client_seen_at?: string | null;
  last_agent_seen_at?: string | null;

  // token do cliente (anon)
  clientToken?: string | null;
}

export type SenderType = 'client' | 'agent';

export type MessageType = 'text' | 'image';

export interface Message {
  id: string;
  conversationId: string;
  senderType: SenderType;

  // tipo da mensagem
  messageType: MessageType;

  // texto (quando messageType = 'text')
  text?: string;

  // imagem (quando messageType = 'image')
  imageUrl?: string | null;
  imageThumbUrl?: string | null;

  // caminho original no bucket (bom pra deletar futuramente)
  storagePath?: string | null;

  createdAt: string;

  clientToken?: string | null;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'agent' | 'client' | 'admin';
}

export interface ChatState {
  conversations: Conversation[];
  messages: Message[];
  currentUser: User | null;
}

export interface Provider {
  id: string;
  name: string;
  type: 'ecommerce' | 'service' | 'other';
  category: string;
  description: string;
  cashbackPercent: number;
  revenueShareText: string;
  link: string;

  // 👇 EXATAMENTE como está na tabela: logo_url
  logo_url?: string | null;

  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Community {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}