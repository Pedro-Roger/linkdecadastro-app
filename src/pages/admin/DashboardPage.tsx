import { useEffect, useState, useCallback, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import LoadingScreen from '@/components/ui/LoadingScreen'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/lib/useAuth'
import AdminLayout from '@/components/layouts/AdminLayout'
import UserStatsCarousel from '@/components/admin/UserStatsCarousel'
import {
  Users,
  BookOpen,
  Calendar,
  ArrowRight,
  Search,
  Filter,
  MoreHorizontal
} from 'lucide-react'

export default function AdminDashboardPage() {
  const navigate = useNavigate()
  const { user, loading: authLoading, isAuthenticated } = useAuth({
    requireAuth: true,
    redirectTo: '/login',
  })

  const [stats, setStats] = useState<any>(null)
  const [crmStats, setCrmStats] = useState<any>(null)
  const [courses, setCourses] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [recentEnrollments, setRecentEnrollments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [realCarouselStats, setRealCarouselStats] = useState<any[]>([])
  const [realCrmStats, setRealCrmStats] = useState({ total: 0, today: 0, activeEventsAndCourses: 0 })
  const [whatsappStatus, setWhatsappStatus] = useState<string>('DISCONNECTED')

  const fetchStats = useCallback(async () => {
    try {
      const [coursesData, eventsData] = await Promise.all([
        apiFetch<any[]>('/admin/courses', { auth: true }),
        apiFetch<any[]>('/admin/events/history', { auth: true }),
      ])

      setCourses(coursesData)
      setEvents(eventsData)

      const totalEnrollments = coursesData.reduce(
        (sum: number, course: any) => sum + (course._count?.enrollments || 0),
        0,
      )

      const totalRegistrations = eventsData.reduce(
        (sum: number, event: any) => sum + (event._count?.registrations || 0),
        0,
      )

      setStats({
        totalCourses: coursesData.length,
        totalEvents: eventsData.length,
        activeCourses: coursesData.filter((c: any) => c.status === 'ACTIVE').length,
        totalEnrollments,
      })

      const activeItemsCount = coursesData.filter((c: any) => c.status === 'ACTIVE').length + eventsData.filter((e: any) => e.status === 'ACTIVE').length

      await Promise.all([
        fetchRecentData(coursesData, eventsData, totalEnrollments + totalRegistrations, activeItemsCount),
        fetchWhatsAppStatus()
      ])
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error)
      setError('Erro ao carregar dados do dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated || (user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN')) {
        navigate('/my-courses')
        return
      }
      fetchStats()
    }
  }, [authLoading, isAuthenticated, user, navigate, fetchStats])

  async function fetchRecentData(coursesData: any[], eventsData: any[], totalContacts: number, activeItemsCount: number) {
    try {
      const today = new Date().toDateString()
      let totalToday = 0
      const combinedCarousel: any[] = []

      // Fetch top 3 active courses recent enrollments to get today's count
      const activeCourses = coursesData.filter(c => c.status === 'ACTIVE').slice(0, 3)
      const enrollmentsPromises = activeCourses.map(course =>
        apiFetch<any[]>(`/admin/courses/${course.id}/enrollments`, { auth: true })
          .then(data => {
            const todayCount = data.filter((d: any) => new Date(d.createdAt).toDateString() === today).length
            totalToday += todayCount
            combinedCarousel.push({
              id: course.id,
              type: 'course',
              title: course.title,
              totalInscribed: course._count?.enrollments || 0,
              todayInscribed: todayCount,
            })
            return data.map((d: any) => ({ ...d, courseTitle: course.title, isCourse: true }))
          }).catch(() => [])
      )

      // Fetch top 2 active events recent registrations to get today's count
      const activeEvents = eventsData.filter(e => e.status === 'ACTIVE').slice(0, 2)
      const registrationsPromises = activeEvents.map(event =>
        apiFetch<any[]>(`/admin/events/${event.id}/registrations`, { auth: true })
          .then(data => {
            const todayCount = data.filter((d: any) => new Date(d.createdAt).toDateString() === today).length
            totalToday += todayCount
            combinedCarousel.push({
              id: event.id,
              type: 'event',
              title: event.title,
              totalInscribed: event._count?.registrations || 0,
              todayInscribed: todayCount,
            })
            // Format registration as if it was enrollment for the recent list
            return data.map((d: any) => ({ ...d, courseTitle: event.title, isCourse: false, user: { name: d.name } }))
          }).catch(() => [])
      )

      const [enrollmentsArrays, registrationsArrays] = await Promise.all([
        Promise.all(enrollmentsPromises),
        Promise.all(registrationsPromises)
      ])

      setRealCarouselStats(combinedCarousel)
      setRealCrmStats({ total: totalContacts, today: totalToday, activeEventsAndCourses: activeItemsCount })

      const allRecent = [...enrollmentsArrays.flat(), ...registrationsArrays.flat()]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10)

      setRecentEnrollments(allRecent)
    } catch (error) {
      console.error('Erro ao buscar recentes:', error)
    }
  }

  const fetchWhatsAppStatus = async () => {
    try {
      const data = await apiFetch<any>('/api/whatsapp/status', { auth: true })
      setWhatsappStatus(data.status || 'DISCONNECTED')
    } catch (err) {
      console.error('Erro ao buscar status do WhatsApp:', err)
    }
  }

  const filteredCourses = useMemo(() => {
    if (!searchTerm) return courses.slice(0, 5)
    const term = searchTerm.toLowerCase()
    return courses.filter(c =>
      c.title.toLowerCase().includes(term) ||
      c.description?.toLowerCase().includes(term)
    ).slice(0, 5)
  }, [courses, searchTerm])

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Bom dia'
    if (hour < 18) return 'Boa tarde'
    return 'Boa noite'
  }

  if (authLoading || loading) return <LoadingScreen />

  return (
    <AdminLayout>
      {/* Header Greeting */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-[var(--secondary)] tracking-tight">
            {getGreeting()}, {user?.name?.split(' ')[0]}! <span className="animate-bounce inline-block">👋</span>
          </h1>
          <p className="text-[var(--text-muted)] font-medium mt-1">O que vamos gerenciar hoje em sua plataforma?</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2 overflow-hidden">
            {recentEnrollments.slice(0, 4).map((enr, i) => (
              <img
                key={enr.id || i}
                className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover"
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(enr.user?.name || 'User')}&background=random`}
                alt=""
              />
            ))}
          </div>
          <div className="h-8 w-px bg-[var(--border-light)]"></div>
          <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full border border-[var(--border-light)] shadow-sm">
            <div className={`w-2 h-2 rounded-full animate-pulse ${whatsappStatus === 'READY' ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
            <span className="text-[10px] font-bold text-[var(--secondary)] uppercase tracking-wider">
              {whatsappStatus === 'READY' ? 'WhatsApp Online' : 'WhatsApp Offline'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full border border-[var(--border-light)] shadow-sm">
            <div className="w-2 h-2 bg-[var(--primary)] rounded-full animate-pulse"></div>
            <span className="text-[10px] font-bold text-[var(--secondary)] uppercase tracking-wider">{realCrmStats.total} Contatos</span>
          </div>
        </div>
      </div>

      {/* Stats Carousel */}
      <div className="mb-8">
        <UserStatsCarousel stats={realCarouselStats} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Column */}
        <div className="lg:col-span-2 space-y-8">
          {/* Quick Actions / Courses */}
          <section className="bg-white rounded-3xl border border-[var(--border-light)] p-8 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold text-[var(--secondary)] flex items-center gap-2">
                Cursos Recentes <BookOpen size={20} className="text-violet-600" />
              </h2>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    placeholder="Pesquisar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-[var(--bg-main)] border-none rounded-xl text-xs w-48 focus:ring-2 focus:ring-violet-600/30 transition-all font-medium"
                  />
                </div>
                <button className="p-2 bg-[var(--bg-main)] rounded-lg text-[var(--text-muted)] hover:text-violet-600 transition-colors">
                  <Filter size={18} />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {filteredCourses.map((course) => (
                <div key={course.id} className="flex items-center gap-4 p-4 hover:bg-[var(--bg-main)]/50 rounded-2xl transition-all border border-transparent hover:border-[var(--border-light)] group cursor-pointer">
                  <div className="w-16 h-12 bg-slate-100 rounded-xl overflow-hidden shrink-0 border border-[var(--border-light)]">
                    {course.bannerUrl ? (
                      <img src={course.bannerUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[var(--primary)]">
                        <BookOpen size={20} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-[var(--secondary)] truncate group-hover:text-[var(--primary)] transition-colors">{course.title}</h4>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-[10px] text-[var(--text-muted)] font-bold flex items-center gap-1">
                        <Users size={12} /> {course._count?.enrollments || 0} Alunos
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)] font-bold flex items-center gap-1 uppercase tracking-wider">
                        <div className={`w-1.5 h-1.5 rounded-full ${course.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-red-400'}`}></div>
                        {course.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => navigate(`/admin/courses/${course.id}`)} className="p-2 text-[var(--text-muted)] hover:text-[var(--primary)] rounded-lg group-hover:bg-white transition-all opacity-0 group-hover:opacity-100">
                    <ArrowRight size={18} />
                  </button>
                </div>
              ))}
              {filteredCourses.length === 0 && (
                <div className="text-center py-12 text-[var(--text-muted)]">
                  Nenhum curso encontrado.
                </div>
              )}
            </div>

            <Link to="/admin/courses" className="mt-8 w-full py-3 border-2 border-dashed border-[var(--border-light)] rounded-2xl text-[var(--text-muted)] font-bold text-xs hover:border-[var(--primary)] hover:text-[var(--primary)] transition-all flex items-center justify-center gap-2 group">
              VER TODOS OS CURSOS <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </section>
        </div>

        {/* Sidebar Column within content area */}
        <div className="space-y-8">
          {/* CRM Summary */}
          <section className="bg-[var(--secondary)] rounded-3xl p-8 text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:scale-110 transition-transform"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <Users size={24} className="text-[var(--primary)]" />
                <button className="text-white/40 hover:text-white transition-colors">
                  <MoreHorizontal size={20} />
                </button>
              </div>
              <div className="text-4xl font-black mb-1">{realCrmStats.total}</div>
              <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-6">Contatos Totais</p>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-[11px] font-medium bg-white/5 p-2.5 rounded-xl border border-white/5">
                  <span className="text-white/60">Novos hoje</span>
                  <span className="text-emerald-400 font-bold">+{realCrmStats.today}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] font-medium bg-white/5 p-2.5 rounded-xl border border-white/5">
                  <span className="text-white/60">Soluções Ativas</span>
                  <span className="text-blue-400 font-bold">{realCrmStats.activeEventsAndCourses}</span>
                </div>
              </div>

              <Link to="/admin/crm/contacts" className="mt-6 flex items-center justify-center gap-2 py-3 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-bold rounded-2xl transition-all shadow-lg shadow-[var(--primary)]/20 group">
                GERENCIAR LEADS <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </section>

          {/* Recent Enrollments Log */}
          <section className="bg-white rounded-3xl border border-[var(--border-light)] p-8 shadow-sm">
            <h3 className="text-lg font-bold text-[var(--secondary)] mb-6 flex items-center gap-2">
              Atividade <Calendar size={18} className="text-blue-500" />
            </h3>
            <div className="space-y-6">
              {recentEnrollments.slice(0, 5).map((enrollment, idx) => (
                <div key={enrollment.id} className="relative flex gap-4">
                  {idx !== 4 && <div className="absolute left-[15px] top-8 bottom-[-24px] w-px bg-[var(--border-light)]"></div>}
                  <img src={`https://i.pravatar.cc/100?u=${enrollment.id}`} className="w-8 h-8 rounded-full z-10" alt="" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-[var(--secondary)] font-bold">
                      {enrollment.user?.name?.split(' ')[0] || 'Usuário'} <span className="text-[var(--text-muted)] font-normal">{enrollment.isCourse ? 'se matriculou em' : 'se registrou em'}</span>
                    </p>
                    <p className="text-[10px] text-[var(--primary)] font-bold truncate mt-0.5">{enrollment.courseTitle}</p>
                    <span className="text-[9px] text-[var(--text-muted)] font-medium">{format(new Date(enrollment.createdAt), 'dd/MM HH:mm')}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </AdminLayout>
  )
}
