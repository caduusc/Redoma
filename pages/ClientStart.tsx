// ... imports iguais (inalterados)

const getOrCreateClientToken = () => {
  const existing = localStorage.getItem('redoma_client_token');
  if (existing) return existing;

  const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
  localStorage.setItem('redoma_client_token', token);
  return token;
};

// helpers iguais (inalterados)

// =========================
// FIX 1 — getCommunityLabel
// =========================
const getCommunityLabel = (community_id: string) => {
  return communityNameById[community_id] || community_id;
};

// =========================
// STEP 2 — BUSCAR CONVERSAS
// =========================
const { data, error } = await supabasePublic
  .from('conversations')
  .select('id, community_id, status, created_at, last_client_seen_at')
  .in('member_id', memberIds) // 🔧 FIX: member_ids → memberIds
  .order('created_at', { ascending: false }); // 🔧 FIX: createdAt → created_at

// =========================
// FETCH MESSAGES (UNREAD)
// =========================
const { data: msgs, error: msgErr } = await supabasePublic
  .from('messages')
  .select('conversation_id, sender_type, created_at')
  .in('conversation_id', activeIds) // 🔧 FIX: conversationId → conversation_id
  .eq('sender_type', 'agent');

// =========================
// REALTIME CHANNEL
// =========================
const channel = supabasePublic
  .channel(
    `client_start_unread_${normalizePhone(
      phone || localStorage.getItem('redoma_phone') || ''
    )}`
  )
  .on(
    'postgres_changes' as any,
    {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: 'sender_type=eq.agent',
    },
    (payload: any) => {
      const convId = payload.new?.conversation_id;
      if (!convId) return;
      if (!activeIds.includes(convId)) return;

      setUnreadByConvId((prev) => ({
        ...prev,
        [convId]: true,
      }));
    }
  )
  .subscribe();

// =========================
// startConversationForCommunity
// =========================
const { data: comm, error: commErr } = await supabasePublic
  .from('communities')
  .select('id, slug')
  .or(`id.eq.${normalizedInput},slug.eq.${normalizedInput}`); // 🔧 FIX: template string quebrada

// =========================
// handleSelectExistingCommunity
// =========================
const handleSelectExistingCommunity = (community_id: string) => {
  startConversationForCommunity(community_id); // 🔧 FIX: communityId → community_id
};
