import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Footer from '@/components/ui/Footer'
import MobileNavbar from '@/components/ui/MobileNavbar'
import CourseEnrollmentModal from '@/components/modals/CourseEnrollmentModal'
import { apiFetch, normalizeImageUrl } from '@/lib/api'
import { useAuth } from '@/lib/useAuth'
import EventEnrollmentModal from '@/components/modals/EventEnrollmentModal'

interface Course {
  id: string
  title: string
  description: string | null
  bannerUrl: string | null
  startDate: string | null
  endDate: string | null
  createdAt: string
  slug?: string | null
  maxEnrollments?: number | null
  creator: {
    name: string
  }
  _count: {
    enrollments: number
    lessons: number
  }
}

/* Unified Item Interface */
type ItemType = 'COURSE' | 'EVENT'

interface UnifiedItem {
  type: ItemType
  id: string
  title: string
  description: string | null
  bannerUrl: string | null
  dateStr: string | null
  badge: { label: string; color: string }
  originalItem: Course | EventItem
}

interface EventItem {
  id: string
  title: string
  description: string
  bannerUrl?: string | null
  slug?: string | null
  status: 'ACTIVE' | 'INACTIVE' | 'CLOSED'
  maxRegistrations?: number | null
  _count?: {
    registrations: number
  }
}

const CourseSkeleton = () => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-full flex flex-col">
    <div className="h-48 bg-gray-200 animate-pulse" />
    <div className="p-6 flex-1 flex flex-col space-y-3">
      <div className="h-4 bg-gray-200 rounded w-1/3 animate-pulse" />
      <div className="h-6 bg-gray-200 rounded w-3/4 animate-pulse" />
      <div className="h-4 bg-gray-200 rounded w-full animate-pulse" />
      <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse" />
      <div className="mt-auto pt-4 space-y-2">
        <div className="h-2 bg-gray-200 rounded-full w-full animate-pulse" />
        <div className="h-10 bg-gray-200 rounded-lg w-full animate-pulse" />
      </div>
    </div>
  </div>
)

export default function HomePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, isAuthenticated } = useAuth()

  // Raw Data
  const [courses, setCourses] = useState<Course[]>([])
  const [events, setEvents] = useState<EventItem[]>([])

  // Loading States
  const [coursesLoading, setCoursesLoading] = useState(true)
  const [eventsLoading, setEventsLoading] = useState(true)

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState<'ALL' | 'COURSE' | 'EVENT'>('ALL')
  const [statusFilter, setStatusFilter] = useState<string>('all') // available, ongoing, etc.

  // Modals
  const [enrollmentModal, setEnrollmentModal] = useState<{ isOpen: boolean; courseId: string; courseTitle: string }>({
    isOpen: false, courseId: '', courseTitle: ''
  })
  const [eventEnrollmentModal, setEventEnrollmentModal] = useState<{ isOpen: boolean; eventId: string; eventTitle: string }>({
    isOpen: false, eventId: '', eventTitle: ''
  })
  const [enrollmentFeedback, setEnrollmentFeedback] = useState<{ message: string; tone: 'success' | 'info' | 'warning' } | null>(null)

  // Fetch Data
  useEffect(() => {
    const fetchData = async () => {
      setCoursesLoading(true)
      setEventsLoading(true)
      try {
        const [coursesData, eventsData] = await Promise.all([
          apiFetch<Course[]>('/courses').catch(() => []),
          apiFetch<EventItem[]>('/events').catch(() => [])
        ])
        setCourses(coursesData)
        setEvents(eventsData)
      } finally {
        setCoursesLoading(false)
        setEventsLoading(false)
      }
    }
    fetchData()
  }, [])

  // URL Param Handlers (Enroll)
  useEffect(() => {
    const enrollSlug = searchParams.get('enroll')
    const enrollEventSlug = searchParams.get('enroll_event')

    if (enrollSlug && courses.length > 0) {
      const course = courses.find(c => c.slug === enrollSlug || c.id === enrollSlug)
      if (course) {
        setTimeout(() => {
          setEnrollmentModal({ isOpen: true, courseId: course.id, courseTitle: course.title })
          window.history.replaceState({}, '', '/')
        }, 800)
      }
    }

    if (enrollEventSlug && events.length > 0) {
      const event = events.find(e => e.slug === enrollEventSlug || e.id === enrollEventSlug)
      if (event) {
        setTimeout(() => {
          setEventEnrollmentModal({ isOpen: true, eventId: event.id, eventTitle: event.title })
          window.history.replaceState({}, '', '/')
        }, 800)
      }
    }
  }, [searchParams, courses, events])

  const handleEnrollmentSuccess = (payload?: { enrollment: any; metadata?: { waitlistPosition?: number | null } }) => {
    // Refresh data
    apiFetch<Course[]>('/courses').then(setCourses).catch(() => { })

    if (payload?.enrollment) {
      const status = payload.enrollment.status as string | undefined
      if (status === 'WAITLIST') {
        setEnrollmentFeedback({ message: 'Você entrou na lista de espera.', tone: 'info' })
      } else if (status === 'PENDING_REGION') {
        setEnrollmentFeedback({ message: 'Aguardando confirmação.', tone: 'warning' })
      } else if (status === 'REJECTED') {
        setEnrollmentFeedback({ message: 'Inscrição não pôde ser aprovada auto.', tone: 'warning' })
      } else {
        setEnrollmentFeedback({ message: 'Inscrição confirmada! Acesse "Meus Cursos".', tone: 'success' })
      }
    } else {
      setEnrollmentFeedback({ message: 'Solicitação enviada.', tone: 'info' })
    }
    setTimeout(() => setEnrollmentFeedback(null), 8000)
  }

  const getCourseStatus = (course: Course) => {
    const now = new Date()
    const startDate = course.startDate ? new Date(course.startDate) : null
    const endDate = course.endDate ? new Date(course.endDate) : null

    if (endDate && endDate < now) return { label: 'Encerrado', color: 'bg-gray-500', badge: 'Encerrado' }
    if (!startDate) return { label: 'Inscrições Abertas', color: 'bg-green-500', badge: 'Inscrições Abertas' }
    if (startDate > now) return { label: 'Em Breve', color: 'bg-blue-500', badge: 'Em Breve' }
    if (startDate <= now && (!endDate || endDate >= now)) return { label: 'Em Andamento', color: 'bg-blue-600', badge: 'Em Andamento' }
    return { label: 'Disponível', color: 'bg-green-500', badge: 'Disponível' }
  }

  const getEventStatus = (event: EventItem) => {
    switch (event.status) {
      case 'ACTIVE': return { label: 'Aberto', color: 'bg-green-600' }
      case 'INACTIVE': return { label: 'Em Breve', color: 'bg-yellow-500' }
      case 'CLOSED': return { label: 'Encerrado', color: 'bg-gray-500' }
      default: return { label: 'Indisponível', color: 'bg-gray-500' }
    }
  }

  // Unified List Processing
  const unifiedItems: UnifiedItem[] = useMemo(() => {
    const normalizeCourse = (c: Course): UnifiedItem => {
      const status = getCourseStatus(c)
      return {
        type: 'COURSE',
        id: c.id,
        title: c.title,
        description: c.description,
        bannerUrl: c.bannerUrl,
        dateStr: c.startDate,
        badge: { label: status.badge, color: status.color },
        originalItem: c
      }
    }

    const normalizeEvent = (e: EventItem): UnifiedItem => {
      const status = getEventStatus(e)
      return {
        type: 'EVENT',
        id: e.id,
        title: e.title,
        description: e.description,
        bannerUrl: e.bannerUrl ?? null,
        dateStr: null, // Event date logic might differ, assuming null or adding later if available in API
        badge: { label: status.label, color: status.color },
        originalItem: e
      }
    }

    let items: UnifiedItem[] = [
      ...courses.map(normalizeCourse),
      ...events.map(normalizeEvent)
    ]

    // Filter by Type
    if (selectedType !== 'ALL') {
      items = items.filter(i => i.type === selectedType)
    }

    // Filter by Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      items = items.filter(i =>
        i.title.toLowerCase().includes(term) ||
        (i.description && i.description.toLowerCase().includes(term))
      )
    }

    // TODO: Implement Status Filter if needed (logic differs between events/courses, somewhat complex to unify perfectly, keeping simple for now)

    return items.sort((a, b) => {
      // Sort by date (if available) or simply prioritize Featured/Active
      // For now, simple sort or just mix
      return 0
    })

  }, [courses, events, selectedType, searchTerm, statusFilter])

  const loading = coursesLoading || eventsLoading

  /* Hero Section (Reused) */
  const HeroSection = () => (
    <div className="bg-[#0f172a] text-white pt-12 pb-24 md:pt-20 md:pb-32 relative overflow-hidden">
      {/* Background Image/Overlay */}
      <div className="absolute inset-0 z-0">
        <img src="https://images.unsplash.com/photo-1560493676-04071c5f467b?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80" alt="Background" className="w-full h-full object-cover opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0f172a] via-[#0f172a]/90 to-transparent"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10 max-w-6xl">
        <div className="max-w-2xl">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            INOVE NO CULTIVO, <br />
            <span className="text-[#FF6600]">MAXIMIZE SEUS LUCROS</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-300 mb-8 font-light">
            Sua plataforma completa para cursos, eventos e inteligência de mercado na carcinicultura.
          </p>

          <div className="bg-white/10 backdrop-blur-md p-2 rounded-lg border border-white/20 flex flex-col md:flex-row gap-2">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
              <input
                type="text"
                placeholder="Buscar por nome, categoria ou instrutor..."
                className="block w-full pl-10 pr-4 py-3 bg-transparent text-white placeholder-gray-400 focus:outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              className="bg-[#FF6600] text-white px-8 py-3 rounded-md font-bold hover:bg-[#ff8533] transition-colors"
              onClick={() => document.getElementById('content-grid')?.scrollIntoView({ behavior: 'smooth' })}
            >
              BUSCAR
            </button>
          </div>

          <div className="mt-6 flex flex-wrap gap-2 text-sm text-gray-400">
            <span>Sugestões:</span>
            {['Manejo', 'Genética', 'Mercado', 'Biossegurança'].map(tag => (
              <button key={tag} onClick={() => setSearchTerm(tag)} className="hover:text-[#FF6600] underline decoration-dotted">
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex flex-col font-sans">
      <MobileNavbar />
      <HeroSection />

      <main className="container mx-auto px-4 py-12 -mt-20 relative z-20" id="content-grid">
        {enrollmentFeedback && (
          <div className={`mb-8 p-4 rounded-xl shadow-lg border-l-4 ${enrollmentFeedback.tone === 'success' ? 'bg-white border-green-500 text-green-700' :
            enrollmentFeedback.tone === 'warning' ? 'bg-white border-yellow-500 text-yellow-700' :
              'bg-white border-blue-500 text-blue-700'
            }`}>
            <p className="font-medium">{enrollmentFeedback.message}</p>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Filters */}
          <aside className="lg:w-64 flex-shrink-0">
            <div className="bg-[#1e293b] text-gray-300 rounded-xl p-6 sticky top-24 shadow-xl border border-gray-700">
              <h3 className="text-white font-bold text-lg mb-6 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                Filtros
              </h3>

              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Tipo de Conteúdo</h4>
                  <div className="space-y-2">
                    {[
                      { id: 'ALL', label: 'Todos' },
                      { id: 'COURSE', label: 'Cursos', icon: '📚' },
                      { id: 'EVENT', label: 'Eventos', icon: '📅' },
                    ].map(type => (
                      <button
                        key={type.id}
                        onClick={() => setSelectedType(type.id as any)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${selectedType === type.id
                          ? 'bg-[#FF6600] text-white font-bold shadow-lg'
                          : 'hover:bg-white/10'
                          }`}
                      >
                        <span>{type.icon || '🔍'}</span>
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Grid */}
          <div className="flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => <CourseSkeleton key={i} />)
              ) : unifiedItems.length === 0 ? (
                <div className="col-span-full py-20 text-center text-gray-500">
                  <p className="text-xl">Nenhum conteúdo encontrado.</p>
                  <p className="text-sm mt-2">Tente ajustar seus filtros.</p>
                </div>
              ) : (
                unifiedItems.map(item => (
                  <div key={`${item.type}-${item.id}`} className="bg-white rounded-xl shadow-sm hover:shadow-2xl transition-all duration-300 overflow-hidden flex flex-col group border border-gray-100">
                    {/* Image */}
                    <div className="h-48 relative overflow-hidden bg-gray-200">
                      {item.bannerUrl ? (
                        <img src={normalizeImageUrl(item.bannerUrl)} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={item.title} />
                      ) : (
                        <div className={`w-full h-full ${item.type === 'COURSE' ? 'bg-[#003366]' : 'bg-[#1e293b]'}`}></div>
                      )}

                      <div className="absolute top-3 right-3 flex flex-col gap-2 items-end">
                        <span className="bg-white/90 backdrop-blur-sm text-gray-800 text-xs font-bold px-3 py-1 rounded-full shadow-sm flex items-center gap-1">
                          {item.type === 'COURSE' ? (
                            <><span className="text-blue-600">📚</span> Curso</>
                          ) : (
                            <><span className="text-purple-600">📅</span> Evento</>
                          )}
                        </span>
                      </div>

                      <div className="absolute top-3 left-3">
                        <span className={`${item.badge.color} text-white text-[10px] uppercase font-bold px-2 py-1 rounded shadow-md`}>
                          {item.badge.label}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-5 flex-1 flex flex-col">
                      <h3 className="text-lg font-bold text-gray-900 mb-2 leading-tight line-clamp-2 group-hover:text-[#FF6600] transition-colors">{item.title}</h3>
                      <p className="text-gray-500 text-sm mb-4 line-clamp-3">{item.description || 'Sem descrição.'}</p>

                      <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
                        {item.dateStr ? (
                          <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            {format(new Date(item.dateStr), 'dd/MM/yyyy', { locale: ptBR })}
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-gray-500">Disponível agora</span>
                        )}

                        <button
                          onClick={() => {
                            if (!isAuthenticated) {
                              navigate('/login')
                              return
                            }
                            if (item.type === 'COURSE') {
                              setEnrollmentModal({ isOpen: true, courseId: item.id, courseTitle: item.title })
                            } else {
                              setEventEnrollmentModal({ isOpen: true, eventId: item.id, eventTitle: item.title })
                            }
                          }}
                          className={`px-4 py-2 rounded-lg text-sm font-bold text-white transition-all shadow-md ${item.type === 'COURSE' ? 'bg-[#FF6600] hover:bg-[#e55a00]' : 'bg-[#003366] hover:bg-[#002244]'
                            }`}
                        >
                          {item.type === 'COURSE' ? 'Acessar' : 'Inscrever'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
      {isAuthenticated && <div className="md:hidden h-20" />}

      <CourseEnrollmentModal
        isOpen={enrollmentModal.isOpen}
        onClose={() => setEnrollmentModal({ isOpen: false, courseId: '', courseTitle: '' })}
        courseId={enrollmentModal.courseId}
        courseTitle={enrollmentModal.courseTitle}
        onSuccess={handleEnrollmentSuccess}
      />
      <EventEnrollmentModal
        isOpen={eventEnrollmentModal.isOpen}
        onClose={() => setEventEnrollmentModal({ isOpen: false, eventId: '', eventTitle: '' })}
        eventId={eventEnrollmentModal.eventId}
        eventTitle={eventEnrollmentModal.eventTitle}
        onSuccess={() => handleEnrollmentSuccess()}
      />
    </div>
  )
}
