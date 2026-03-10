import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import Footer from '@/components/ui/Footer';

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Verifica se há erro na URL (vindo do callback do Google)
    const urlError = searchParams.get('error');
    if (urlError === 'google_auth_failed') {
      setError('Erro ao fazer login com Google. Tente novamente.');
    }
  }, [searchParams]);

  const returnUrl = searchParams.get('returnUrl');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await apiFetch<{ accessToken: string; user: any }>(
        '/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        },
      );

      if (typeof window !== 'undefined') {
        localStorage.setItem('token', result.accessToken);
        localStorage.setItem('user', JSON.stringify(result.user));
      }

      // Redireciona para returnUrl se existir, senão para dashboard/admin ou my-courses
      if (returnUrl) {
        navigate(returnUrl);
      } else if (result.user?.role === 'ADMIN' || result.user?.role === 'SUPER_ADMIN') {
        navigate('/admin/dashboard');
      } else {
        navigate('/my-courses');
      }
    } catch (err: any) {
      const errorMessage = err?.message || 'Erro ao fazer login. Verifique suas credenciais.';
      setError(errorMessage);
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center py-12 px-4 relative overflow-hidden font-outfit">

      {/* Background Animated Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[var(--primary)]/20 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="max-w-md w-full relative z-10">
        <Link
          to="/"
          className="absolute -top-16 left-0 flex items-center justify-center w-10 h-10 rounded-full bg-[var(--bg-card)]/50 backdrop-blur-md border border-[var(--border-light)] hover:bg-[var(--primary)]/20 transition-all text-[var(--text-muted)] hover:text-white group"
          title="Voltar para a página inicial"
        >
          <svg
            className="w-6 h-6 transform group-hover:-translate-x-1 transition-transform"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </Link>

        {/* Card de Login */}
        <div className="bg-[var(--bg-card)]/60 backdrop-blur-2xl border border-[var(--border-light)] rounded-[2rem] shadow-2xl p-8 sm:p-10 relative overflow-hidden">

          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[var(--primary)] to-indigo-500"></div>

          <div className="flex justify-center mb-8">
            <img src="/logo B.png" alt="Link de Cadastro Logo" className="h-[70px] drop-shadow-lg" />
          </div>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white tracking-tight">
              Bem-vindo de volta
            </h1>
            <p className="text-[var(--text-muted)] mt-2">
              Acesse a plataforma para gerenciar seu CRM.
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-xl mb-6 text-sm flex items-center gap-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2 pl-1">
                E-mail
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-500 group-focus-within:text-[var(--primary)] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Seu e-mail cadastrado"
                  required
                  className="w-full pl-11 pr-4 py-3 bg-black/20 border border-[var(--border-light)] rounded-xl focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent text-white placeholder-gray-500 transition-all outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2 pl-1">
                Senha
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-500 group-focus-within:text-[var(--primary)] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Sua senha secreta"
                  required
                  className="w-full pl-11 pr-4 py-3 bg-black/20 border border-[var(--border-light)] rounded-xl focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent text-white placeholder-gray-500 transition-all outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full relative group mt-8"
            >
              <div className="absolute -inset-0.5 bg-gradient-to-r from-[var(--primary)] to-indigo-500 rounded-xl blur opacity-50 group-hover:opacity-100 transition duration-300"></div>
              <div className="relative w-full bg-gradient-to-r from-[var(--primary)] to-indigo-600 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed">
                {loading ? (
                  <div className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Autenticando...
                  </div>
                ) : (
                  'Acessar Sistema'
                )}
              </div>
            </button>
          </form>

        </div>

        <p className="mt-8 text-center text-sm text-[var(--text-muted)]">
          &copy; {new Date().getFullYear()} Link de Cadastro. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
