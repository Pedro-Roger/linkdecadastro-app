import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import NotificationBell from '@/components/notifications/NotificationBell'
import Footer from '@/components/ui/Footer'
import LoadingScreen from '@/components/ui/LoadingScreen'
import { apiFetch } from '@/lib/api'

interface User {
  id: string
  name: string
  email: string
}
export default function MyCoursesPage() {
  const navigate = useNavigate()
  const [courses, setCourses] = useState<any[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedUser =
      typeof window !== 'undefined'
        ? localStorage.getItem('user')
        : null

    const storedToken =
      typeof window !== 'undefined'
        ? localStorage.getItem('token')
        : null

    if (!storedUser || !storedToken) {
      navigate('/login')
      return
    }

    setUser(JSON.parse(storedUser))
    fetchCourses()
  }, [])

  async function fetchCourses() {
    try {
      const data = await apiFetch<any[]>('/courses/my-courses', {
        auth: true,
      })
      setCourses(data)
    } catch (error) {
      navigate('/login')
    } finally {
      setLoading(false)
    }
  }

  function handleSignOut() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    }
    navigate('/')
  }

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <div className="flex flex-col">
      <div className="container mx-auto px-4 py-8 pb-24 md:pb-8 flex-1">
        <h1 className="text-3xl font-bold mb-8 text-[#003366]">Meus Cursos</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <Link
              key={course.id}
              to={`/course/${course.id}`}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
            >
              {course.bannerUrl && (
                <div className="h-48 bg-cover bg-center"
                  style={{ backgroundImage: `url(${course.bannerUrl})` }} />
              )}
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-2 text-[#003366]">{course.title}</h2>
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">{course.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                    {course.totalLessons || 0} aulas
                  </span>
                  {course.progress !== undefined && (
                    <span className="text-sm font-medium text-[#FF6600]">
                      {course.progress}% concluído
                    </span>
                  )}
                </div>
                {course.progress !== undefined && (
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-[#FF6600] h-2 rounded-full transition-all"
                      style={{ width: `${course.progress}%` }}
                    />
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>

        {courses.length === 0 && (
          <div className="text-center py-24">
            <p className="text-gray-500 text-lg mb-4">Você ainda não está inscrito em nenhum curso.</p>
            <Link
              to="/courses"
              className="mt-4 inline-block bg-[#FF6600] text-white px-6 py-3 rounded-md font-semibold hover:bg-[#e55a00] transition-colors"
            >
              Ver Cursos Disponíveis
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

