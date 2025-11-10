'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Footer from '@/components/ui/Footer'
import MobileNavbar from '@/components/ui/MobileNavbar'
import CourseEnrollmentModal from '@/components/modals/CourseEnrollmentModal'

export default function CoursesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [allCourses, setAllCourses] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilter, setActiveFilter] = useState<string>('all')
  const [enrollmentModal, setEnrollmentModal] = useState<{ isOpen: boolean; courseId: string; courseTitle: string }>({
    isOpen: false,
    courseId: '',
    courseTitle: ''
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated') {
      fetchAllCourses()
    }
  }, [status])

  useEffect(() => {
    filterCourses()
  }, [activeFilter, searchTerm, allCourses])

  async function fetchAllCourses() {
    try {
      const res = await fetch('/api/courses')
      if (res.ok) {
        const data = await res.json()
        setAllCourses(data)
      }
    } catch (error) {
      console.error('Erro ao buscar cursos:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterCourses = () => {
    let filtered = [...allCourses]

    // Aplicar filtro de categoria
    if (activeFilter !== 'all') {
      const now = new Date()
      filtered = filtered.filter((course) => {
        const startDate = course.startDate ? new Date(course.startDate) : null
        const endDate = course.endDate ? new Date(course.endDate) : null

        switch (activeFilter) {
          case 'available':
            // Inscrições abertas
            return !startDate || startDate >= now || (startDate <= now && (!endDate || endDate >= now))
          case 'ongoing':
            // Em andamento
            return startDate && startDate <= now && (!endDate || endDate >= now)
          case 'upcoming':
            // Em breve
            return startDate && startDate > now
          case 'closed':
            // Encerradas
            return endDate && endDate < now
          default:
            return true
        }
      })
    }

    // Aplicar busca
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (course) =>
          course.title.toLowerCase().includes(term) ||
          course.description?.toLowerCase().includes(term) ||
          course.creator?.name?.toLowerCase().includes(term)
      )
    }

    setCourses(filtered)
  }

  const getFilterCount = (filterType: string) => {
    const now = new Date()
    return allCourses.filter((course) => {
      const startDate = course.startDate ? new Date(course.startDate) : null
      const endDate = course.endDate ? new Date(course.endDate) : null

      switch (filterType) {
        case 'available':
          return !startDate || startDate >= now || (startDate <= now && (!endDate || endDate >= now))
        case 'ongoing':
          return startDate && startDate <= now && (!endDate || endDate >= now)
        case 'upcoming':
          return startDate && startDate > now
        case 'closed':
          return endDate && endDate < now
        default:
          return true
      }
    }).length
  }

  const handleEnroll = (courseId: string, courseTitle: string) => {
    if (!session) {
      router.push('/login')
      return
    }
    setEnrollmentModal({
      isOpen: true,
      courseId,
      courseTitle
    })
  }

  const handleEnrollmentSuccess = () => {
    // Recarregar cursos para atualizar contadores
    fetchAllCourses()
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navbar Mobile/Desktop */}
      <MobileNavbar />

      {/* Barra de Pesquisa */}
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
              placeholder="Pesquisar cursos por nome, descrição ou instrutor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900"
            />
          </div>
        </div>
      </div>

      {/* Tags de Filtro */}
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
              Todos ({allCourses.length})
            </button>
            <button
              onClick={() => setActiveFilter('available')}
              className={`px-4 py-2 rounded-full font-medium transition-colors ${
                activeFilter === 'available'
                  ? 'bg-[#FF6600] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Inscrições Abertas ({getFilterCount('available')})
            </button>
            <button
              onClick={() => setActiveFilter('ongoing')}
              className={`px-4 py-2 rounded-full font-medium transition-colors ${
                activeFilter === 'ongoing'
                  ? 'bg-[#FF6600] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Em Andamento ({getFilterCount('ongoing')})
            </button>
            <button
              onClick={() => setActiveFilter('upcoming')}
              className={`px-4 py-2 rounded-full font-medium transition-colors ${
                activeFilter === 'upcoming'
                  ? 'bg-[#FF6600] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Em Breve ({getFilterCount('upcoming')})
            </button>
            <button
              onClick={() => setActiveFilter('closed')}
              className={`px-4 py-2 rounded-full font-medium transition-colors ${
                activeFilter === 'closed'
                  ? 'bg-[#FF6600] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Encerradas ({getFilterCount('closed')})
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 flex-1">
        <h1 className="text-3xl font-bold mb-8 text-[#003366]">Cursos Disponíveis</h1>
        
        {loading ? (
          <div className="text-center py-24">
            <div className="text-xl text-gray-600">Carregando cursos...</div>
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-gray-500 text-lg mb-4">Nenhum curso encontrado.</p>
            <p className="text-gray-400">Tente ajustar os filtros ou a busca.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => {
              const now = new Date()
              const startDate = course.startDate ? new Date(course.startDate) : null
              const endDate = course.endDate ? new Date(course.endDate) : null
              
              let statusLabel = 'Disponível'
              let statusColor = 'bg-green-500'
              
              if (endDate && endDate < now) {
                statusLabel = 'Encerrado'
                statusColor = 'bg-gray-500'
              } else if (startDate && startDate > now) {
                statusLabel = 'Em Breve'
                statusColor = 'bg-blue-500'
              } else if (startDate && startDate <= now && (!endDate || endDate >= now)) {
                statusLabel = 'Em Andamento'
                statusColor = 'bg-orange-500'
              }

              return (
                <div
                  key={course.id}
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                >
                  {course.bannerUrl && course.bannerUrl.trim() ? (
                    <div className="relative w-full h-[386px] overflow-hidden bg-gray-200">
                      <img
                        src={course.bannerUrl}
                        alt={`Banner do curso ${course.title}`}
                        className="w-full h-full min-w-full min-h-full object-cover"
                        style={{ objectFit: 'cover', objectPosition: 'center' }}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-full h-[386px] bg-gradient-to-br from-[#003366] to-[#FF6600] flex items-center justify-center">
                      <span className="text-white text-sm font-medium">Sem banner</span>
                    </div>
                  )}
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`${statusColor} text-white text-xs px-2 py-1 rounded-full font-medium`}>
                        {statusLabel}
                      </span>
                    </div>
                    <h2 className="text-xl font-semibold mb-2 text-[#003366]">{course.title}</h2>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">{course.description}</p>
                    <div className="space-y-2 mb-4 text-sm text-gray-500">
                      {startDate && (
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>{format(new Date(startDate), 'dd/MM/yyyy', { locale: ptBR })}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">
                          {course._count?.lessons || 0} aulas
                        </span>
                        <span className="text-sm text-gray-500">
                          {course._count?.enrollments || 0} alunos
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleEnroll(course.id, course.title)}
                      className="w-full bg-[#FF6600] text-white py-2 px-4 rounded-md font-semibold hover:bg-[#e55a00] transition-colors"
                    >
                      Inscrever-se
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

      </div>

      <Footer />
      
      {/* Espaçamento para navbar inferior no mobile */}
      {session && <div className="md:hidden h-20" />}

      {/* Modal de Inscrição */}
      <CourseEnrollmentModal
        isOpen={enrollmentModal.isOpen}
        onClose={() => setEnrollmentModal({ isOpen: false, courseId: '', courseTitle: '' })}
        courseId={enrollmentModal.courseId}
        courseTitle={enrollmentModal.courseTitle}
        onSuccess={handleEnrollmentSuccess}
      />
    </div>
  )
}

