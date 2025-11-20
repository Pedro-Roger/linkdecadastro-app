import { useState, useEffect } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import Footer from '@/components/ui/Footer'
import { apiFetch } from '@/lib/api'

export default function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Verifica se há erro na URL (vindo do callback do Google)
    const urlError = searchParams.get('error')
    if (urlError === 'google_auth_failed') {
      setError('Erro ao fazer login com Google. Tente novamente.')
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await apiFetch<{ accessToken: string; user: any }>(
        '/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        },
      )

      if (typeof window !== 'undefined') {
        localStorage.setItem('token', result.accessToken)
        localStorage.setItem('user', JSON.stringify(result.user))
      }

      // Redireciona admin para /admin/courses, usuários normais para /my-courses
      if (result.user?.role === 'ADMIN') {
        navigate('/admin/courses')
      } else {
        navigate('/my-courses')
      }
    } catch (err: any) {
      const errorMessage = err?.message || 'Erro ao fazer login. Verifique suas credenciais.';
      setError(errorMessage);
      console.error('Login error:', err);
    } finally {
      setLoading(false)
    }
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-[#003366] to-[#FF6600] flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-center mb-8 text-[#003366]">
          Entrar
        </h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#FF6600] text-white py-3 px-6 rounded-md font-semibold hover:bg-[#e55a00] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>


        <p className="mt-6 text-center text-gray-600">
          Não tem uma conta?{' '}
          <Link to="/register" className="text-[#FF6600] hover:underline">
            Cadastre-se
          </Link>
        </p>
      </div>
    </div>
  )
}

