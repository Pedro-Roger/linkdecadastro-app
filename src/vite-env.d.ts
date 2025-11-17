/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  // mais variáveis de ambiente aqui se necessário
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Configuração dinâmica do servidor (pode ser editada no cPanel)
interface Window {
  APP_CONFIG?: {
    API_URL: string
  }
}

