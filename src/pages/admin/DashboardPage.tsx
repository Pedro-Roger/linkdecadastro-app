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
    <div className="flex flex-col font-sans text-gray-900">

      <div className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
          <div>
            <h1 className="text-3xl font-bold text-[#003366] tracking-tight">Painel de Controle</h1>
            <p className="text-gray-500 mt-2">Visão geral do sistema e gerenciamento</p>
          </div>

          {/* Global Search */}
          <div className="relative w-full md:w-80 group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400 group-focus-within:text-[#FF6600] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Buscar cursos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#FF6600]/20 focus:border-[#FF6600] outline-none transition-all shadow-sm text-gray-700 placeholder-gray-400"
            />
          </div>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            {/* Total Courses */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-orange-50 rounded-xl text-[#FF6600] group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                </div>
                <span className="text-xs font-bold px-2 py-1 bg-gray-100 text-gray-600 rounded-full">Total</span>
              </div>
              <div className="text-3xl font-bold text-[#003366] mb-1">{stats.totalCourses}</div>
              <p className="text-sm text-gray-500">Cursos cadastrados</p>
            </div>

            {/* Enrollments */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-blue-50 rounded-xl text-blue-600 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                </div>
                <span className="text-xs font-bold px-2 py-1 bg-blue-100 text-blue-600 rounded-full">Alunos</span>
              </div>
              <div className="text-3xl font-bold text-[#003366] mb-1">{stats.totalEnrollments || 0}</div>
              <p className="text-sm text-gray-500">Inscrições ativas</p>
            </div>

            {/* Active Courses */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-green-50 rounded-xl text-green-600 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <span className="text-xs font-bold px-2 py-1 bg-green-100 text-green-600 rounded-full">Ativos</span>
              </div>
              <div className="text-3xl font-bold text-[#003366] mb-1">{stats.activeCourses}</div>
              <p className="text-sm text-gray-500">{((stats.activeCourses / stats.totalCourses) * 100 || 0).toFixed(0)}% do total</p>
            </div>

            {/* Events */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-purple-50 rounded-xl text-purple-600 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>
                <span className="text-xs font-bold px-2 py-1 bg-purple-100 text-purple-600 rounded-full">Eventos</span>
              </div>
              <div className="text-3xl font-bold text-[#003366] mb-1">{stats.totalEvents}</div>
              <p className="text-sm text-gray-500">{stats.activeEvents} ativos</p>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mb-10">
          <h2 className="text-lg font-bold text-[#003366] mb-4">Acesso Rápido</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link to="/admin/courses/new" className="group bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all hover:border-[#FF6600]/30 flex items-center gap-4">
              <div className="p-3 bg-orange-50 text-[#FF6600] rounded-xl group-hover:bg-[#FF6600] group-hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
              </div>
              <div>
                <h3 className="font-bold text-[#003366] group-hover:text-[#FF6600] transition-colors">Novo Curso</h3>
                <p className="text-xs text-gray-500 mt-0.5">Criar conteúdo</p>
              </div>
            </Link>

            <Link to="/admin/whatsapp/send" className="group bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all hover:border-green-300 flex items-center gap-4">
              <div className="p-3 bg-green-50 text-green-600 rounded-xl group-hover:bg-green-600 group-hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-[#003366] group-hover:text-green-600 transition-colors">WhatsApp</h3>
                <p className="text-xs text-gray-500 mt-0.5">Enviar mensagens</p>
              </div>
            </Link>

            <Link to="/admin/courses" className="group bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all hover:border-blue-300 flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
              </div>
              <div>
                <h3 className="font-bold text-[#003366] group-hover:text-blue-600 transition-colors">Gerenciar Cursos</h3>
                <p className="text-xs text-gray-500 mt-0.5">Editar conteúdo</p>
              </div>
            </Link>

            <Link to="/admin/events" className="group bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all hover:border-purple-300 flex items-center gap-4">
              <div className="p-3 bg-purple-50 text-purple-600 rounded-xl group-hover:bg-purple-600 group-hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </div>
              <div>
                <h3 className="font-bold text-[#003366] group-hover:text-purple-600 transition-colors">Gerenciar Eventos</h3>
                <p className="text-xs text-gray-500 mt-0.5">Listas e turmas</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Content Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 flex flex-col gap-8">
            {/* Filters */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-2 sticky top-[80px] z-10 mx-auto w-full overflow-x-auto scrollbar-hide flex gap-2">
              <button onClick={() => setActiveFilter('all')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${activeFilter === 'all' ? 'bg-[#003366] text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}>Todos ({courses.length})</button>
              <button onClick={() => setActiveFilter('active')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${activeFilter === 'active' ? 'bg-[#003366] text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}>Ativos ({stats?.activeCourses || 0})</button>
              <button onClick={() => setActiveFilter('inactive')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${activeFilter === 'inactive' ? 'bg-[#003366] text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}>Inativos ({stats?.inactiveCourses || 0})</button>
              <button onClick={() => setActiveFilter('available')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${activeFilter === 'available' ? 'bg-[#003366] text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}>Disponíveis</button>
              <button onClick={() => setActiveFilter('ongoing')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${activeFilter === 'ongoing' ? 'bg-[#003366] text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}>Andamento</button>
              <button onClick={() => setActiveFilter('closed')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${activeFilter === 'closed' ? 'bg-[#003366] text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}>Encerrados</button>
            </div>

            {/* Courses List */}
            <div className="flex flex-col gap-4">
              {filteredCourses.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
                  <div className="inline-flex p-4 bg-gray-50 rounded-full mb-4 text-gray-400">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Nenhum curso encontrado</h3>
                  <p className="text-gray-500">Tente ajustar seus filtros de busca.</p>
                </div>
              ) : (
                filteredCourses.slice(0, 10).map((course: any) => (
                  <div key={course.id} className="group bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all hover:border-[#FF6600]/20 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-[#003366] group-hover:text-[#FF6600] transition-colors">{course.title}</h3>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${course.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {course.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 line-clamp-2 mb-3 leading-relaxed">{course.description || 'Sem descrição'}</p>
                      <div className="flex items-center gap-4 text-xs font-medium text-gray-400">
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                          {course.lessons?.length || 0} aulas
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                          {course._count?.enrollments || 0} alunos
                        </span>
                        {course.startDate && (
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            {format(new Date(course.startDate), 'dd MMM yyyy', { locale: ptBR })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <Link to={`/admin/courses/${course.id}/lessons`} className="px-5 py-2.5 bg-gray-50 text-[#003366] font-semibold text-sm rounded-xl hover:bg-[#003366] hover:text-white transition-colors flex items-center gap-2">
                        Gerenciar
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex flex-col gap-6">
            {/* Recent Enrollments */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden sticky top-8">
              <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                <h2 className="text-lg font-bold text-[#003366]">Últimas Inscrições</h2>
              </div>

              <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                {recentEnrollments.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 text-sm">Nenhuma inscrição recente</div>
                ) : (
                  recentEnrollments.map((enrollment: any) => (
                    <div key={enrollment.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-start mb-1">
                        <p className="font-bold text-gray-900 text-sm">{enrollment.user.name}</p>
                        <span className="text-[10px] text-gray-400">{format(new Date(enrollment.createdAt), 'dd/MM HH:mm', { locale: ptBR })}</span>
                      </div>
                      <p className="text-xs text-[#003366] mb-2 font-medium">{enrollment.courseTitle}</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-[#FF6600]" style={{ width: `${enrollment.progress}%` }}></div>
                        </div>
                        <span className="text-[10px] font-bold text-[#FF6600]">{enrollment.progress}%</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="p-4 border-t border-gray-100 bg-gray-50/30">
                <Link to="/admin/courses" className="block w-full text-center py-2 text-sm text-gray-600 hover:text-[#FF6600] font-medium transition-colors">
                  Ver histórico completo
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
