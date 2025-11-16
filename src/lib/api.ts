// Vite usa import.meta.env para variáveis de ambiente
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333';

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


