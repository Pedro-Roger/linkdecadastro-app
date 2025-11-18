import { Link } from 'react-router-dom'
import { useAuth } from '@/lib/useAuth'
import MobileNavbar from '@/components/ui/MobileNavbar'
import Footer from '@/components/ui/Footer'

export default function NotFoundPage() {
  const { isAuthenticated, user } = useAuth()

  const suggestions = [
    {
      title: 'Início',
      path: '/',
      icon: '🏠',
      description: 'Voltar para a página inicial'
    },
    {
      title: 'Cursos',
      path: '/courses',
      icon: '📚',
      description: 'Explorar todos os cursos disponíveis'
    },
    ...(isAuthenticated && user
      ? [
          {
            title: user.role === 'ADMIN' ? 'Dashboard' : 'Meus Cursos',
            path: user.role === 'ADMIN' ? '/admin/dashboard' : '/my-courses',
            icon: user.role === 'ADMIN' ? '⚙️' : '📖',
            description: user.role === 'ADMIN'
              ? 'Acessar painel administrativo'
              : 'Ver seus cursos inscritos'
          },
          {
            title: 'Perfil',
            path: '/profile',
            icon: '👤',
            description: 'Visualizar e editar seu perfil'
          }
        ]
      : [
          {
            title: 'Entrar',
            path: '/login',
            icon: '🔐',
            description: 'Fazer login na sua conta'
          },
          {
            title: 'Cadastrar',
            path: '/register',
            icon: '✨',
            description: 'Criar uma nova conta'
          }
        ])
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#003366] via-[#004080] to-[#FF6600] flex flex-col">
      <MobileNavbar />

      <div className="flex-1 flex items-center justify-center px-4 py-12 md:py-20">
        <div className="max-w-2xl w-full text-center">
          {/* Ícone e Número 404 */}
          <div className="mb-8">
            <div className="text-9xl md:text-[12rem] font-bold text-white/20 mb-4">
              404
            </div>
            <div className="text-6xl md:text-8xl mb-4">😕</div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Página não encontrada
            </h1>
            <p className="text-white/80 text-lg md:text-xl mb-8">
              Ops! A página que você está procurando não existe ou foi movida.
            </p>
          </div>

          {/* Sugestões de Navegação */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 md:p-8 mb-8">
            <h2 className="text-xl md:text-2xl font-semibold text-white mb-6">
              Onde você gostaria de ir?
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {suggestions.map((suggestion, index) => (
                <Link
                  key={index}
                  to={suggestion.path}
                  className="bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl p-6 transition-all duration-300 transform hover:scale-105 hover:shadow-xl border border-white/20"
                >
                  <div className="text-4xl mb-3">{suggestion.icon}</div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {suggestion.title}
                  </h3>
                  <p className="text-white/80 text-sm">
                    {suggestion.description}
                  </p>
                </Link>
              ))}
            </div>
          </div>

          {/* Botão Voltar */}
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 bg-white text-[#003366] px-8 py-4 rounded-xl font-semibold hover:bg-gray-100 transition-colors shadow-lg mb-6"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Voltar
          </button>

          {/* Texto adicional */}
          <p className="text-white/60 text-sm">
            Se você acredita que isso é um erro, entre em contato com o suporte.
          </p>
        </div>
      </div>

      <Footer />
    </div>
  )
}

