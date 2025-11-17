import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import MobileNavbar from '@/components/ui/MobileNavbar'
import Footer from '@/components/ui/Footer'
import LoadingScreen from '@/components/ui/LoadingScreen'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/lib/useAuth'

export default function AdminDashboardPage() {
  const navigate = useNavigate()
  const { user, loading: authLoading, isAuthenticated } = useAuth({
    requireAuth: true,
    redirectTo: '/login',
  })
  const [stats, setStats] = useState<any>(null)
  const [courses, setCourses] = useState<any[]>([])
  const [recentEnrollments, setRecentEnrollments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilter, setActiveFilter] = useState<string>('all')

  const fetchStats = useCallback(async () => {
    try {
      const [coursesData, events] = await Promise.all([
        apiFetch<any[]>('/admin/courses', { auth: true }),
        apiFetch<any[]>('/events', { auth: true }),
      ])

      setCourses(coursesData)

      const totalEnrollments = coursesData.reduce(
        (sum: number, course: any) => sum + (course._count?.enrollments || 0),
        0,
      )

      setStats({
        totalCourses: coursesData.length,
        totalEvents: events.length,
        activeCourses: coursesData.filter((c: any) => c.status === 'ACTIVE').length,
        inactiveCourses: coursesData.filter((c: any) => c.status === 'INACTIVE').length,
        activeEvents: events.filter((e: any) => e.status === 'ACTIVE').length,
        totalEnrollments,
      })

      await fetchRecentEnrollments(coursesData)
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erro ao carregar dados do dashboard'
      setError(errorMessage)
      setLoading(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated || user?.role !== 'ADMIN') {
        navigate('/my-courses')
        return
      }
      fetchStats()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated, user, navigate])

  async function fetchRecentEnrollments(coursesData: any[]) {
    try {
      const enrollmentsPromises = coursesData
        .slice(0, 5)
        .map((course) =>
          apiFetch<any[]>(`/admin/courses/${course.id}/enrollments`, {
            auth: true,
          })
            .then((data) =>
              data.map((enrollment: any) => ({
                ...enrollment,
                courseTitle: course.title,
              })),
            )
            .catch(() => []),
        )

      const enrollmentsArrays = await Promise.all(enrollmentsPromises)
      const allEnrollments = enrollmentsArrays.flat()
      
      const recent = allEnrollments
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10)
      
      setRecentEnrollments(recent)
    } catch (error) {
      console.error('Erro ao buscar inscrições recentes:', error)
    }
  }

  const filterCourses = () => {
    let filtered = [...courses]

    if (activeFilter !== 'all') {
      const now = new Date()
      filtered = filtered.filter((course) => {
        const startDate = course.startDate ? new Date(course.startDate) : null
        const endDate = course.endDate ? new Date(course.endDate) : null

        switch (activeFilter) {
          case 'active':
            return course.status === 'ACTIVE'
          case 'inactive':
            return course.status === 'INACTIVE'
          case 'available':
            return !startDate || startDate >= now || (startDate <= now && (!endDate || endDate >= now))
          case 'ongoing':
            return startDate && startDate <= now && (!endDate || endDate >= now)
          case 'closed':
            return endDate && endDate < now
          default:
            return true
        }
      })
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (course) =>
          course.title.toLowerCase().includes(term) ||
          course.description?.toLowerCase().includes(term)
      )
    }

    return filtered
  }

  const filteredCourses = filterCourses()

  if (authLoading || loading) {
    return <LoadingScreen />
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Erro ao carregar dashboard</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => {
              setError(null)
              setLoading(true)
              fetchStats()
            }}
            className="bg-[#FF6600] text-white px-6 py-3 rounded-md font-semibold hover:bg-[#e55a00] transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      
      <MobileNavbar />

      
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="relative max-w-2xl mx-auto">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Pesquisar cursos por nome, descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900"
            />
          </div>
        </div>
      </div>

      
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-4 py-2 rounded-full font-medium transition-colors ${
                activeFilter === 'all'
                  ? 'bg-[#FF6600] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Todos ({courses.length})
            </button>
            <button
              onClick={() => setActiveFilter('active')}
              className={`px-4 py-2 rounded-full font-medium transition-colors ${
                activeFilter === 'active'
                  ? 'bg-[#FF6600] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Ativos ({stats?.activeCourses || 0})
            </button>
            <button
              onClick={() => setActiveFilter('inactive')}
              className={`px-4 py-2 rounded-full font-medium transition-colors ${
                activeFilter === 'inactive'
                  ? 'bg-[#FF6600] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Inativos ({stats?.inactiveCourses || 0})
            </button>
            <button
              onClick={() => setActiveFilter('available')}
              className={`px-4 py-2 rounded-full font-medium transition-colors ${
                activeFilter === 'available'
                  ? 'bg-[#FF6600] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Disponíveis
            </button>
            <button
              onClick={() => setActiveFilter('ongoing')}
              className={`px-4 py-2 rounded-full font-medium transition-colors ${
                activeFilter === 'ongoing'
                  ? 'bg-[#FF6600] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Em Andamento
            </button>
            <button
              onClick={() => setActiveFilter('closed')}
              className={`px-4 py-2 rounded-full font-medium transition-colors ${
                activeFilter === 'closed'
                  ? 'bg-[#FF6600] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Encerrados
            </button>
          </div>
        </div>
      </div>

      
      <div className="container mx-auto px-4 py-8 pb-24 md:pb-8 flex-1">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#003366] mb-2">Painel de Controle</h1>
          <p className="text-gray-600">Gerenciamento e moderação de conteúdos</p>
        </div>

        
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-[#FF6600]">
              <div className="text-2xl font-bold text-[#FF6600] mb-1">{stats.totalCourses}</div>
              <div className="text-sm text-gray-600">Total de Cursos</div>
              <div className="text-xs text-gray-500 mt-1">
                {stats.activeCourses} ativos • {stats.inactiveCourses} inativos
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-500">
              <div className="text-2xl font-bold text-blue-500 mb-1">{stats.totalEnrollments || 0}</div>
              <div className="text-sm text-gray-600">Total de Inscrições</div>
              <div className="text-xs text-gray-500 mt-1">
                {courses.reduce((sum: number, c: any) => sum + (c._count?.enrollments || 0), 0)} alunos
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-green-500">
              <div className="text-2xl font-bold text-green-500 mb-1">{stats.activeCourses}</div>
              <div className="text-sm text-gray-600">Cursos Ativos</div>
              <div className="text-xs text-gray-500 mt-1">
                {((stats.activeCourses / stats.totalCourses) * 100 || 0).toFixed(0)}% do total
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-purple-500">
              <div className="text-2xl font-bold text-purple-500 mb-1">{stats.totalEvents}</div>
              <div className="text-sm text-gray-600">Total de Eventos</div>
              <div className="text-xs text-gray-500 mt-1">
                {stats.activeEvents} ativos
              </div>
            </div>
          </div>
        )}

        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Link
            to="/admin/courses/new"
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border-l-4 border-[#FF6600]"
          >
            <div className="flex items-center gap-3 mb-2">
              <svg className="w-8 h-8 text-[#FF6600]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <h2 className="text-lg font-semibold text-[#003366]">Criar Curso</h2>
            </div>
            <p className="text-sm text-gray-600">Adicionar novo curso à plataforma</p>
          </Link>

          <Link
            to="/admin/courses"
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border-l-4 border-blue-500"
          >
            <div className="flex items-center gap-3 mb-2">
              <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <h2 className="text-lg font-semibold text-[#003366]">Gerenciar Cursos</h2>
            </div>
            <p className="text-sm text-gray-600">Visualizar e editar cursos existentes</p>
          </Link>

          <Link
            to="/admin/events"
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border-l-4 border-green-500"
          >
            <div className="flex items-center gap-3 mb-2">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h2 className="text-lg font-semibold text-[#003366]">Gerenciar Eventos</h2>
            </div>
            <p className="text-sm text-gray-600">Visualizar e editar eventos existentes</p>
          </Link>
        </div>

        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-[#003366]">Cursos Disponíveis</h2>
            <Link
              to="/admin/courses"
              className="text-sm text-[#FF6600] hover:underline font-medium"
            >
              Ver todos →
            </Link>
          </div>

          {filteredCourses.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg mb-4">Nenhum curso encontrado.</p>
              <p className="text-gray-400 text-sm">Tente ajustar os filtros ou a busca.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCourses.slice(0, 5).map((course: any) => (
                <div
                  key={course.id}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-[#003366]">{course.title}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          course.status === 'ACTIVE' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {course.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
                        <span>{course.lessons?.length || 0} aulas</span>
                        <span>{course._count?.enrollments || 0} alunos</span>
                        {course.startDate && (
                          <span>{format(new Date(course.startDate), 'dd/MM/yyyy', { locale: ptBR })}</span>
                        )}
                      </div>
                      {course.description && (
                        <p className="text-sm text-gray-600 line-clamp-2">{course.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Link
                        to={`/admin/courses/${course.id}/lessons`}
                        className="px-3 py-1 bg-[#FF6600] text-white text-sm rounded-md hover:bg-[#e55a00] transition-colors"
                      >
                        Gerenciar
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-[#003366]">Inscrições Recentes</h2>
            <Link
              to="/admin/courses"
              className="text-sm text-[#FF6600] hover:underline font-medium"
            >
              Ver todas →
            </Link>
          </div>
          {recentEnrollments.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Nenhuma inscrição recente.</p>
          ) : (
            <div className="space-y-3">
              {recentEnrollments.map((enrollment: any) => (
                <div
                  key={enrollment.id}
                  className="p-4 border border-gray-200 rounded-lg"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-[#003366]">{enrollment.user.name}</p>
                      <p className="text-sm text-gray-500">{enrollment.user.email}</p>
                    </div>
                    <span className="text-xs text-gray-500">
                      {format(new Date(enrollment.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </span>
                  </div>
                  <div className="mt-2">
                    <p className="text-sm text-gray-600 mb-1">{enrollment.courseTitle}</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-[#FF6600] h-2 rounded-full transition-all"
                          style={{ width: `${enrollment.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-600">{enrollment.progress}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Footer />
      
      
      {user && <div className="md:hidden h-20" />}
    </div>
  )
}
