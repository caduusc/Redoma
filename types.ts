// types.ts

export type ConversationStatus = 'open' | 'claimed' | 'closed';

export interface Conversation {
  id: string;
  community_id: string;
  status: ConversationStatus;
  claimed_by?: string | null;
  created_at: string;

  // amarra a conversa a uma pessoa da comunidade (members.member_id)
  member_id?: string | null;

  // nome do membro (se vier de join / view)
  member_name?: string | null;

  // timestamps de claim e close
  claimed_at?: string | null;
  closed_at?: string | null;

  // "visto"
  last_client_seen_at?: string | null;
  last_agent_seen_at?: string | null;

  // token do cliente (anon)
  client_token?: string | null;
}

export type SenderType = 'client' | 'agent';

export type MessageType = 'text' | 'image';

export interface Message {
  id: string;
  conversation_id: string;
  sender_type: SenderType;

  // tipo da mensagem
  message_type: MessageType;

  // texto (quando message_type = 'text')
  text?: string;

  // imagem (quando message_type = 'image')
  image_url?: string | null;
  image_thumb_url?: string | null;

  // metadados da imagem
  image_path?: string | null;
  image_mime?: string | null;
  image_size_bytes?: number | null;

  // caminho original no bucket (bom pra deletar futuramente)
  storage_path?: string | null;

  created_at: string;

  client_token?: string | null;
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

  slug?: string | null;
  description?: string | null;
  logo_url?: string | null;
  instagram_url?: string | null;

  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// opcional, se quiser usar Members tipado depois
export interface Member {
  memberId: string;
  communityId: string;
  fullName: string;
}