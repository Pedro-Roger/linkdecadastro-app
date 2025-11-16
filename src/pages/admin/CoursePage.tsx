import { useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/lib/useAuth'


export default function AdminCoursePage() {
  const { courseId } = useParams<{ courseId: string }>()
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'ADMIN') {
      navigate('/login')
      return
    }

    if (courseId) {

      navigate(`/admin/courses/${courseId}/lessons`, { replace: true })
    } else {
      navigate('/admin/courses')
    }
  }, [courseId, navigate, isAuthenticated, user])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-gray-600">Redirecionando...</div>
    </div>
  )
}

