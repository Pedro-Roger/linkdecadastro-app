const LEGACY_KEY = 'active_whatsapp_session'

const getScopedKey = (userId?: string | null) =>
  userId ? `active_whatsapp_session:${userId}` : LEGACY_KEY

export function readWhatsAppSession(userId?: string | null): string | null {
  if (typeof window === 'undefined') return null

  const scopedKey = getScopedKey(userId)
  const scopedValue = localStorage.getItem(scopedKey)
  if (scopedValue) return scopedValue

  const legacyValue = localStorage.getItem(LEGACY_KEY)
  if (legacyValue && userId) {
    localStorage.setItem(scopedKey, legacyValue)
    localStorage.removeItem(LEGACY_KEY)
    return legacyValue
  }

  return legacyValue
}

export function writeWhatsAppSession(
  sessionId: string,
  userId?: string | null,
) {
  if (typeof window === 'undefined') return
  localStorage.setItem(getScopedKey(userId), sessionId)
  localStorage.removeItem(LEGACY_KEY)
}

export function clearWhatsAppSession(userId?: string | null) {
  if (typeof window === 'undefined') return
  localStorage.removeItem(getScopedKey(userId))
  localStorage.removeItem(LEGACY_KEY)
}

export function clearAllWhatsAppSessions() {
  if (typeof window === 'undefined') return

  const keysToRemove: string[] = []
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index)
    if (key && key.startsWith('active_whatsapp_session')) {
      keysToRemove.push(key)
    }
  }

  keysToRemove.forEach((key) => localStorage.removeItem(key))
}
