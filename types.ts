
export type ConversationStatus = 'open' | 'claimed' | 'closed';

export interface Conversation {
  id: string;
  communityId: string;
  status: ConversationStatus;
  claimedBy?: string | null;
  createdAt: string;
}

export type SenderType = 'client' | 'agent';

export interface Message {
  id: string;
  conversationId: string;
  senderType: SenderType;
  text: string;
  createdAt: string;
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
  type: "ecommerce" | "service" | "other";
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
