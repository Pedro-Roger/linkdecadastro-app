export interface GroupCollection {
  id: string;
  name: string;
  jids: string[];
}

export interface ChatInboxPreferences {
  favoriteGroupJids: string[];
  groupCollections: GroupCollection[];
}

const DEFAULT_PREFERENCES: ChatInboxPreferences = {
  favoriteGroupJids: [],
  groupCollections: [],
};

function getStorageKey(userId?: string | null, sessionId?: string | null) {
  return `chat_inbox_preferences:${userId || 'anonymous'}:${sessionId || 'default'}`;
}

export function readChatInboxPreferences(
  userId?: string | null,
  sessionId?: string | null,
): ChatInboxPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;

  try {
    const raw = localStorage.getItem(getStorageKey(userId, sessionId));
    if (!raw) return DEFAULT_PREFERENCES;

    const parsed = JSON.parse(raw);
    return {
      favoriteGroupJids: Array.isArray(parsed?.favoriteGroupJids)
        ? parsed.favoriteGroupJids.filter(Boolean)
        : [],
      groupCollections: Array.isArray(parsed?.groupCollections)
        ? parsed.groupCollections
            .filter((item: any) => item?.id && item?.name)
            .map((item: any) => ({
              id: String(item.id),
              name: String(item.name),
              jids: Array.isArray(item.jids) ? item.jids.filter(Boolean) : [],
            }))
        : [],
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function writeChatInboxPreferences(
  preferences: ChatInboxPreferences,
  userId?: string | null,
  sessionId?: string | null,
) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(
    getStorageKey(userId, sessionId),
    JSON.stringify(preferences),
  );
}
