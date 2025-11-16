const APP_STORE_IOS_URL = 'https://apps.apple.com/br/app/quero-camarao/id6467179239'
const PLAY_STORE_ANDROID_URL = 'https://play.google.com/store/apps/details?id=com.logicphire.querocamarao&hl=pt_BR'
const FALLBACK_URL = 'https://querocamarao.com/app'

export function getAppStoreUrl(): string {
  if (typeof window === 'undefined') {
    return FALLBACK_URL
  }

  const userAgent = window.navigator.userAgent || window.navigator.vendor || (window as any).opera

  if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) {
    return APP_STORE_IOS_URL
  }

  if (/android/i.test(userAgent)) {
    return PLAY_STORE_ANDROID_URL
  }

  return FALLBACK_URL
}

export const APP_QUERO_CAMARAO_URL = typeof window !== 'undefined' ? getAppStoreUrl() : 'https://querocamarao.com/app'
