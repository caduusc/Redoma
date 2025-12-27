export type ConversationStatus = 'open' | 'claimed' | 'closed';

export interface Conversation {
  id: string;
  communityId: string;
  status: ConversationStatus;
  claimedBy?: string | null;
  createdAt: string;

  last_client_seen_at?: string | null;
  last_agent_seen_at?: string | null;

  clientToken?: string | null;
}

export type SenderType = 'client' | 'agent';

export type MessageType = 'text' | 'image';

export interface Message {
  id: string;
  conversationId: string;
  senderType: SenderType;

  messageType: MessageType;

  text?: string;

  imageUrl?: string | null;
  imageThumbUrl?: string | null;

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

  // url pública da logo (vem de logo_url no banco)
  logoUrl?: string | null;

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
