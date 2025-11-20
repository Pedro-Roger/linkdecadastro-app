import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/useAuth'
import LoadingScreen from './ui/LoadingScreen'

interface ProtectedUserRouteProps {
  children: React.ReactNode
}

/**
 * Componente que protege rotas de usuário comum.
 * Se o usuário for ADMIN, redireciona automaticamente para /admin/courses
 */
export default function ProtectedUserRoute({ children }: ProtectedUserRouteProps) {
  const navigate = useNavigate()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading && user?.role === 'ADMIN') {
      navigate('/admin/courses', { replace: true })
    }
  }, [user, loading, navigate])

  if (loading) {
    return <LoadingScreen />
  }

  // Se for admin, não renderiza nada (já está redirecionando)
  if (user?.role === 'ADMIN') {
    return <LoadingScreen />
  }

  return <>{children}</>
}
