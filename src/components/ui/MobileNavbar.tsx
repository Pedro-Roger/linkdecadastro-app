import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import NotificationBell from '@/components/notifications/NotificationBell'
import { useAuth } from '@/lib/useAuth'

export default function MobileNavbar() {
  const { user, isAuthenticated, signOut } = useAuth()
  const location = useLocation()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) {
      setIsMenuOpen(false)
      setIsUserMenuOpen(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const isActive = (path: string) => location.pathname === path

  return (
    <>
      
      <nav className="hidden md:block bg-white shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center">
              <img
                src="/logo B.png"
                alt="Link de Cadastro"
                className="h-20 md:h-24 w-auto object-contain"
              />
            </Link>
            <div className="flex items-center gap-4">
              <Link
                to="/courses"
                className={`font-medium transition-colors ${
                  isActive('/courses')
                    ? 'text-[#FF6600]'
                    : 'text-[#003366] hover:text-[#FF6600]'
                }`}
              >
                Cursos
              </Link>
              {isAuthenticated && user ? (
                <>
                  <Link
                    to={user.role === 'ADMIN' ? '/admin/dashboard' : '/my-courses'}
                    className={`font-medium transition-colors ${
                      isActive('/my-courses') || isActive('/admin/dashboard')
                        ? 'text-[#FF6600]'
                        : 'text-[#003366] hover:text-[#FF6600]'
                    }`}
                  >
                    {user.role === 'ADMIN' ? 'Dashboard' : 'Meus Cursos'}
                  </Link>
                  <NotificationBell />
                  
                  <div className="relative">
                    <button
                      onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                      className={`w-10 h-10 rounded-full font-bold flex items-center justify-center transition-colors ${
                        isActive('/profile')
                          ? 'bg-[#FF6600] text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-[#FF6600] hover:text-white'
                      }`}
                    >
                      {user.name?.charAt(0).toUpperCase() || 'A'}
                    </button>

                    
                    {isUserMenuOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setIsUserMenuOpen(false)}
                        />
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg z-50 border border-gray-200">
                          <div className="py-2">
                            <div className="px-4 py-3 border-b border-gray-200">
                              <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                              <p className="text-xs text-gray-500 truncate">{user.email}</p>
                            </div>
                            <Link
                              to="/profile"
                              onClick={() => setIsUserMenuOpen(false)}
                              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                Meu Perfil
                              </div>
                            </Link>
                            <div className="border-t border-gray-200 mt-2 pt-2">
                              <button
                                onClick={() => {
                                  setIsUserMenuOpen(false)
                                  signOut()
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                              >
                                <div className="flex items-center gap-2">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                  </svg>
                                  Sair
                                </div>
                              </button>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="text-[#003366] hover:text-[#FF6600] font-medium transition-colors"
                  >
                    Entrar
                  </Link>
                  <Link
                    to="/register"
                    className="bg-[#FF6600] text-white px-4 py-2 rounded-md font-semibold hover:bg-[#e55a00] transition-colors"
                  >
                    Cadastrar
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      
      <nav className={`md:hidden bg-white sticky top-0 z-50 transition-all duration-300 ${
        isScrolled ? 'shadow-lg' : 'shadow-sm'
      }`}>
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center flex-shrink-0" onClick={() => setIsMenuOpen(false)}>
              <img
                src="/logo B.png"
                alt="Link de Cadastro"
                className="h-14 md:h-16 w-auto object-contain"
              />
            </Link>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-md text-gray-700 hover:bg-gray-100 transition-colors"
              aria-label="Menu"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {isMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>

          
          {isMenuOpen && (
            <>
              <div
                className="fixed inset-0 bg-black bg-opacity-50 z-40"
                onClick={() => setIsMenuOpen(false)}
                style={{ top: '73px' }}
              />
              <div className="fixed top-[73px] left-0 right-0 bg-white border-t shadow-xl z-50 max-h-[calc(100vh-73px)] overflow-y-auto">
                <div className="container mx-auto px-4 py-4 space-y-3">
                <Link
                  to="/courses"
                  onClick={() => setIsMenuOpen(false)}
                  className={`block py-3 px-4 rounded-lg font-medium transition-colors ${
                    isActive('/courses')
                      ? 'bg-[#FF6600] text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  📚 Cursos
                </Link>
                {isAuthenticated && user ? (
                  <>
                    <Link
                      to={user.role === 'ADMIN' ? '/admin/dashboard' : '/my-courses'}
                      onClick={() => setIsMenuOpen(false)}
                      className={`block py-3 px-4 rounded-lg font-medium transition-colors ${
                        isActive('/my-courses') || isActive('/admin/dashboard')
                          ? 'bg-[#FF6600] text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {user.role === 'ADMIN' ? '⚙️ Dashboard' : '📖 Meus Cursos'}
                    </Link>
                    <Link
                      to="/profile"
                      onClick={() => setIsMenuOpen(false)}
                      className={`block py-3 px-4 rounded-lg font-medium transition-colors ${
                        isActive('/profile')
                          ? 'bg-[#FF6600] text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      👤 Perfil
                    </Link>
                    <div className="pt-2 border-t">
                      <button
                        onClick={() => {
                          setIsMenuOpen(false)
                          signOut()
                        }}
                        className="w-full text-left py-3 px-4 rounded-lg font-medium text-red-600 hover:bg-red-50 transition-colors"
                      >
                        🚪 Sair
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <Link
                      to="/login"
                      onClick={() => setIsMenuOpen(false)}
                      className="block py-3 px-4 rounded-lg font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      🔐 Entrar
                    </Link>
                    <Link
                      to="/register"
                      onClick={() => setIsMenuOpen(false)}
                      className="block py-3 px-4 rounded-lg font-medium bg-[#FF6600] text-white text-center hover:bg-[#e55a00] transition-colors"
                    >
                      ✨ Cadastrar
                    </Link>
                  </>
                )}
                </div>
              </div>
            </>
          )}
        </div>
      </nav>

      
      {isAuthenticated && user && (
        <nav 
          className={`md:hidden fixed bottom-0 left-0 right-0 bg-white border-t z-50 transition-all duration-300 ${
            isScrolled ? 'shadow-2xl' : 'shadow-lg'
          }`}
          style={{ 
            paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.5rem)',
            backdropFilter: 'blur(10px)',
            backgroundColor: 'rgba(255, 255, 255, 0.98)'
          }}
        >
          <div className="flex items-center justify-around px-2 py-2 max-w-screen-xl mx-auto">
            <Link
              to="/"
              className={`flex flex-col items-center justify-center px-4 py-2 rounded-lg transition-colors ${
                isActive('/')
                  ? 'text-[#FF6600]'
                  : 'text-gray-600 hover:text-[#FF6600]'
              }`}
            >
              <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="text-xs font-medium">Início</span>
            </Link>

            <Link
              to="/courses"
              className={`flex flex-col items-center justify-center px-4 py-2 rounded-lg transition-colors ${
                isActive('/courses')
                  ? 'text-[#FF6600]'
                  : 'text-gray-600 hover:text-[#FF6600]'
              }`}
            >
              <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span className="text-xs font-medium">Cursos</span>
            </Link>

            {user.role === 'ADMIN' ? (
              <Link
                to="/admin/dashboard"
                className={`flex flex-col items-center justify-center px-4 py-2 rounded-lg transition-colors ${
                  isActive('/admin/dashboard') || isActive('/admin/courses')
                    ? 'text-[#FF6600]'
                    : 'text-gray-600 hover:text-[#FF6600]'
                }`}
              >
                <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-xs font-medium">Admin</span>
              </Link>
            ) : (
              <Link
                to="/my-courses"
                className={`flex flex-col items-center justify-center px-4 py-2 rounded-lg transition-colors ${
                  isActive('/my-courses')
                    ? 'text-[#FF6600]'
                    : 'text-gray-600 hover:text-[#FF6600]'
                }`}
              >
                <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-xs font-medium">Meus</span>
              </Link>
            )}

            <div className="flex flex-col items-center justify-center px-4 py-2 rounded-lg">
              <div className="relative">
                <NotificationBell />
              </div>
              <span className="text-xs font-medium mt-1 text-gray-600">Notificações</span>
            </div>

            <Link
              to="/profile"
              className={`flex flex-col items-center justify-center px-4 py-2 rounded-lg transition-colors ${
                isActive('/profile')
                  ? 'text-[#FF6600]'
                  : 'text-gray-600 hover:text-[#FF6600]'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full font-bold flex items-center justify-center mb-1 text-sm ${
                  isActive('/profile')
                    ? 'bg-[#FF6600] text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                {user.name?.charAt(0).toUpperCase() || 'A'}
              </div>
              <span className="text-xs font-medium">Perfil</span>
            </Link>
          </div>
        </nav>
      )}

      
      {isAuthenticated && user && <div className="md:hidden h-20" />}
    </>
  )
}
