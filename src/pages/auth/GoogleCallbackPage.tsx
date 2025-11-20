import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import LoadingScreen from '@/components/ui/LoadingScreen'

export default function GoogleCallbackPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const token = searchParams.get('token')
    const userParam = searchParams.get('user')

    if (token && userParam) {
      try {
        const user = JSON.parse(decodeURIComponent(userParam))
        
        localStorage.setItem('token', token)
        localStorage.setItem('user', JSON.stringify(user))

        // Redireciona para completar perfil se necessário
        if (user.needsProfileCompletion) {
          navigate('/complete-profile')
        } else if (user.role === 'ADMIN') {
          // Admin redireciona para /admin/dashboard (tela de gerenciamento)
          navigate('/admin/dashboard')
        } else {
          navigate('/my-courses')
        }
      } catch (error) {
        console.error('Erro ao processar login do Google:', error)
        navigate('/login?error=google_auth_failed')
      }
    } else {
      navigate('/login?error=google_auth_failed')
    }
  }, [searchParams, navigate])

  return <LoadingScreen />
}

