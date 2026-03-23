import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from './api'

interface User {
  id: string
  name: string
  email: string
  role?: string
  avatar?: string
  companyId?: string
  canAccessAgents?: boolean
}

interface UseAuthOptions {
  requireAuth?: boolean
  redirectTo?: string
}

export function useAuth(options?: UseAuthOptions) {
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user')
      const storedToken = localStorage.getItem('token')

      if (!storedUser || !storedToken) {
        if (options?.requireAuth) {
          navigate(options.redirectTo || '/login')
        }
        setLoading(false)
        return
      }

      try {
        const parsedUser = JSON.parse(storedUser)
        setUser(parsedUser)

        apiFetch<User>('/user/profile', { auth: true })
          .then((profile) => {
            if (!profile) return
            setUser(profile)
            localStorage.setItem('user', JSON.stringify(profile))
          })
          .catch(() => {
            // Mantém fallback do localStorage se o profile falhar
          })
      } catch {
        setUser(null)
      }
      setLoading(false)
    } catch (error) {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function signOut() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('active_whatsapp_session')
    navigate('/')
  }

  return {
    user,
    loading,
    isAuthenticated: !!user,
    signOut,
  }
}
