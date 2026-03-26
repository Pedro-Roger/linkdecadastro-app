export interface CachedInboxConversation {
  id: string;
  jid: string;
  name?: string;
  avatar?: string | null;
  profile_pic_url?: string | null;
  type?: 'group' | 'person';
  lastMessage?: string | null;
  lastMessageAt?: string | null;
  unreadCount?: number;
  contactNumber?: string | null;
  status?: string | null;
  conversationId?: string | null;
  attendanceMode?: string | null;
  assignedAgentId?: string | null;
  assignedAgentName?: string | null;
}

function getStorageKey(userId?: string | null, sessionId?: string | null) {
  return `chat_inbox_cache:${userId || 'anonymous'}:${sessionId || 'default'}`;
}

export function readChatInboxCache(
  userId?: string | null,
  sessionId?: string | null,
): CachedInboxConversation[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = localStorage.getItem(getStorageKey(userId, sessionId));
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((item: any) => item?.jid && item?.id);
  } catch {
    return [];
  }
}

export function writeChatInboxCache(
  conversations: CachedInboxConversation[],
  userId?: string | null,
  sessionId?: string | null,
) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(
    getStorageKey(userId, sessionId),
    JSON.stringify(conversations),
  );
}

export function clearChatInboxCache(
  userId?: string | null,
  sessionId?: string | null,
) {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(getStorageKey(userId, sessionId));
}
