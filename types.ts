export type ConversationStatus = 'open' | 'claimed' | 'closed';

export interface Conversation {
  id: string;
  communityId: string;
  status: ConversationStatus;
  claimedBy?: string | null;
  createdAt: string;

  // ✅ para "Visto" (check azul)
  last_client_seen_at?: string | null;
  last_agent_seen_at?: string | null;

  // (opcional, mas existe no seu insert de createConversation / addMessage)
  clientToken?: string | null;
}

export type SenderType = 'client' | 'agent';

export interface Message {
  id: string;
  conversationId: string;
  senderType: SenderType;
  text: string;
  createdAt: string;

  // (opcional, mas existe no seu insert de addMessage)
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
  logoUrl?: string;
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
