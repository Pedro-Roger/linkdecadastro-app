'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Footer from '@/components/ui/Footer'
import MobileNavbar from '@/components/ui/MobileNavbar'
import CourseEnrollmentModal from '@/components/modals/CourseEnrollmentModal'

interface Course {
  id: string
  title: string
  description: string | null
  bannerUrl: string | null
  startDate: string | null
  endDate: string | null
  createdAt: string
  creator: {
    name: string
  }
  _count: {
    enrollments: number
    lessons: number
  }
}

export default function HomePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [courses, setCourses] = useState<Course[]>([])
  const [allCourses, setAllCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilter, setActiveFilter] = useState<string>('all')
  const [enrollmentModal, setEnrollmentModal] = useState<{ isOpen: boolean; courseId: string; courseTitle: string }>({
    isOpen: false,
    courseId: '',
    courseTitle: ''
  })

  // Removido redirecionamento automático - admin pode ver página pública

  useEffect(() => {
    fetchAllCourses()
  }, [])

  useEffect(() => {
    filterCourses()
  }, [activeFilter, searchTerm, allCourses])

  const fetchAllCourses = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/courses')
      if (response.ok) {
        const data = await response.json()
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
          case 'featured':
            // Cursos em destaque (sem data ou começando em breve)
            return !startDate || startDate > now
          case 'available':
            // Disponíveis para inscrição
            return !startDate || startDate >= now || (startDate <= now && (!endDate || endDate >= now))
          case 'ongoing':
            // Em andamento
            return startDate && startDate <= now && (!endDate || endDate >= now)
          case 'closed':
            // Encerrados
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
          course.creator.name.toLowerCase().includes(term)
      )
    }

    setCourses(filtered)
  }

  const getCourseStatus = (course: Course) => {
    const now = new Date()
    const startDate = course.startDate ? new Date(course.startDate) : null
    const endDate = course.endDate ? new Date(course.endDate) : null

    if (endDate && endDate < now) {
      return { label: 'Encerrado', color: 'bg-gray-500', badge: 'Encerrado' }
    }

    if (!startDate) {
      return { label: 'Inscrições Abertas', color: 'bg-green-500', badge: 'Inscrições Abertas' }
    }

    if (startDate > now) {
      return { label: 'Inscrições Abertas', color: 'bg-green-500', badge: 'Inscrições Abertas' }
    }

    if (startDate <= now && (!endDate || endDate >= now)) {
      return { label: 'Em Andamento', color: 'bg-blue-500', badge: 'Em Andamento' }
    }

    return { label: 'Disponível', color: 'bg-green-500', badge: 'Inscrições Abertas' }
  }

  const getFilterCount = (filterType: string) => {
    const now = new Date()
    return allCourses.filter((course) => {
      const startDate = course.startDate ? new Date(course.startDate) : null
      const endDate = course.endDate ? new Date(course.endDate) : null

      switch (filterType) {
        case 'featured':
          return !startDate || startDate > now
        case 'available':
          return !startDate || startDate >= now || (startDate <= now && (!endDate || endDate >= now))
        case 'ongoing':
          return startDate && startDate <= now && (!endDate || endDate >= now)
        case 'closed':
          return endDate && endDate < now
        default:
          return true
      }
    }).length
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#003366] to-[#FF6600]">
        <div className="text-white text-xl">Carregando...</div>
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
              placeholder="Pesquisar cursos por nome, descrição ou local..."
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
              Todos os Cursos ({allCourses.length})
            </button>
            <button
              onClick={() => setActiveFilter('featured')}
              className={`px-4 py-2 rounded-full font-medium transition-colors ${
                activeFilter === 'featured'
                  ? 'bg-[#FF6600] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Em Destaque ({getFilterCount('featured')})
            </button>
            <button
              onClick={() => setActiveFilter('available')}
              className={`px-4 py-2 rounded-full font-medium transition-colors ${
                activeFilter === 'available'
                  ? 'bg-[#FF6600] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Disponíveis ({getFilterCount('available')})
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
              onClick={() => setActiveFilter('closed')}
              className={`px-4 py-2 rounded-full font-medium transition-colors ${
                activeFilter === 'closed'
                  ? 'bg-[#FF6600] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Encerrados ({getFilterCount('closed')})
            </button>
          </div>
        </div>
      </div>

      {/* Lista de Cursos */}
      <div className="container mx-auto px-4 py-8 flex-1">
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
              const status = getCourseStatus(course)
              const isFeatured = !course.startDate || new Date(course.startDate) > new Date()
              const progress = course._count.enrollments > 0 ? Math.min(100, (course._count.enrollments / 50) * 100) : 0
              
              return (
                <div
                  key={course.id}
                  className="relative bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow"
                >
                  {/* Banner do Curso */}
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
                      {/* Barra superior sobre o banner */}
                      <div className={`absolute top-0 left-0 right-0 h-2 ${isFeatured ? 'bg-[#FF6600]' : 'bg-[#003366]'}`}></div>
                      {/* Badge Destaque */}
                      {isFeatured && (
                        <div className="absolute top-3 right-3 bg-[#FF6600] text-white text-xs px-2 py-1 rounded-full font-semibold shadow-lg">
                          Destaque
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      {/* Header do Card quando não há banner */}
                      <div className={`h-2 ${isFeatured ? 'bg-[#FF6600]' : 'bg-[#003366]'}`}></div>
                      {isFeatured && (
                        <div className="absolute top-2 right-2 bg-[#FF6600] text-white text-xs px-2 py-1 rounded-full font-semibold">
                          Destaque
                        </div>
                      )}
                    </>
                  )}
                  
                  <div className="p-6">
                    {/* Badge de Status */}
                    <div className="mb-3">
                      <span className={`${status.color} text-white text-xs px-2 py-1 rounded-full font-medium`}>
                        {status.badge}
                      </span>
                    </div>
                    
                    {/* Título */}
                    <h3 className="text-xl font-bold text-gray-800 mb-2 line-clamp-2">
                      {course.title}
                    </h3>
                    
                    {/* Descrição */}
                    {course.description && (
                      <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                        {course.description}
                      </p>
                    )}
                    
                    {/* Informações */}
                    <div className="space-y-2 mb-4 text-sm text-gray-600">
                      {course.startDate && (
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>{format(new Date(course.startDate), 'dd/MM/yyyy', { locale: ptBR })}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>Online</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">
                          {course._count.enrollments}/50 vagas ocupadas
                        </span>
                      </div>
                      {/* Barra de Progresso */}
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-[#FF6600] h-2 rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                    
                    {/* Botão de Ação */}
                    <button
                      onClick={() => {
                        if (!session) {
                          router.push('/login')
                        } else {
                          setEnrollmentModal({
                            isOpen: true,
                            courseId: course.id,
                            courseTitle: course.title
                          })
                        }
                      }}
                      className="block w-full bg-[#FF6600] text-white text-center py-3 rounded-md font-semibold hover:bg-[#e55a00] transition-colors"
                    >
                      Cadastrar-se no Curso
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
        onSuccess={() => {
          fetchAllCourses()
        }}
      />
    </div>
  )
}

