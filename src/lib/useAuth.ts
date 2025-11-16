import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

interface User {
  id: string
  name: string
  email: string
  role?: string
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
        setUser(JSON.parse(storedUser))
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
    navigate('/')
  }

  return {
    user,
    loading,
    isAuthenticated: !!user,
    signOut,
  }
}
