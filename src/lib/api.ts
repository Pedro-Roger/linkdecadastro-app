// Vite usa import.meta.env para variáveis de ambiente
// Também verifica window.APP_CONFIG para configuração dinâmica no servidor
export const getApiUrl = (): string => {
  // Prioridade 1: Configuração dinâmica do servidor (pode ser editada no cPanel)
  if (typeof window !== 'undefined' && window.APP_CONFIG?.API_URL) {
    return window.APP_CONFIG.API_URL;
  }
  // Prioridade 2: Variável de ambiente do build
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // Fallback: URL de produção (para Hostgator sem variáveis de ambiente)
  // Em desenvolvimento local, use VITE_API_URL=http://localhost:3333 no .env
  return 'https://backend-linkdecadastro.onrender.com';
};

const API_URL = getApiUrl();

interface ApiOptions extends RequestInit {
  auth?: boolean;
}

export async function apiFetch<T = any>(
  path: string,
  { auth, headers, ...options }: ApiOptions = {},
): Promise<T> {
  const url = path.startsWith('http') ? path : `${API_URL}${path}`;

  const finalHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...(headers || {}),
  };

  if (auth) {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        (finalHeaders as Record<string, string>)['Authorization'] =
          `Bearer ${token}`;
      }
    }
  }

  const res = await fetch(url, {
    ...options,
    headers: finalHeaders,
    mode: 'cors', // Garante que usa CORS
    // credentials: 'include' só se o backend permitir explicitamente
  });

  if (!res.ok) {
    let message = 'Erro na requisição';
    try {
      const body = await res.json();
      // NestJS retorna mensagens em body.message ou body.error
      message = body.message || body.error || message;
    } catch {
      // Se não conseguir parsear JSON, usar status text
      message = res.statusText || message;
    }
    const error = new Error(message);
    (error as any).status = res.status;
    throw error;
  }

  return (await res.json()) as T;
}


