'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import MobileNavbar from '@/components/ui/MobileNavbar'
import Footer from '@/components/ui/Footer'

export default function AdminCoursesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [courses, setCourses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilter, setActiveFilter] = useState<string>('all')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated' && session?.user?.role !== 'ADMIN') {
      router.push('/my-courses')
    }
  }, [status, session, router])

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role === 'ADMIN') {
      fetchCourses()
    }
  }, [status, session])

  async function fetchCourses() {
    try {
      const res = await fetch('/api/admin/courses')
      if (res.ok) {
        const data = await res.json()
        setCourses(data)
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (courseId: string, courseTitle: string) => {
    if (!confirm(`Tem certeza que deseja excluir o curso "${courseTitle}"? Esta ação não pode ser desfeita.`)) {
      return
    }

    try {
      const res = await fetch(`/api/admin/courses/${courseId}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        fetchCourses()
        alert('Curso excluído com sucesso!')
      } else {
        const errorData = await res.json()
        alert(errorData.error || 'Erro ao excluir curso')
      }
    } catch (error) {
      console.error('Erro ao excluir curso:', error)
      alert('Erro ao excluir curso')
    }
  }

  const handleExport = async (courseId: string, courseTitle: string) => {
    try {
      const response = await fetch(`/api/admin/courses/${courseId}/export`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `inscritos-${courseTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.xlsx`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        alert('Erro ao exportar dados')
      }
    } catch (error) {
      console.error('Erro ao exportar:', error)
      alert('Erro ao exportar dados')
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

  const getFilterCount = (filterType: string) => {
    const now = new Date()
    return courses.filter((course) => {
      const startDate = course.startDate ? new Date(course.startDate) : null
      const endDate = course.endDate ? new Date(course.endDate) : null

      switch (filterType) {
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
    }).length
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-xl text-gray-600">Carregando...</div>
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
              placeholder="Pesquisar cursos por nome, descrição..."
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
              Ativos ({getFilterCount('active')})
            </button>
            <button
              onClick={() => setActiveFilter('inactive')}
              className={`px-4 py-2 rounded-full font-medium transition-colors ${
                activeFilter === 'inactive'
                  ? 'bg-[#FF6600] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Inativos ({getFilterCount('inactive')})
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

      {/* Conteúdo Principal */}
      <div className="container mx-auto px-4 py-8 flex-1">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#003366] mb-2">Cursos Disponíveis</h1>
            <p className="text-gray-600">Gerenciamento e moderação de cursos</p>
          </div>
          <Link
            href="/admin/courses/new"
            className="bg-[#FF6600] text-white px-6 py-3 rounded-md font-semibold hover:bg-[#e55a00] transition-colors"
          >
            + Novo Curso
          </Link>
        </div>

        {filteredCourses.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-gray-500 text-lg mb-4">Nenhum curso encontrado.</p>
            <p className="text-gray-400 text-sm mb-4">Tente ajustar os filtros ou a busca.</p>
            <Link
              href="/admin/courses/new"
              className="inline-block bg-[#FF6600] text-white px-6 py-3 rounded-md font-semibold hover:bg-[#e55a00] transition-colors"
            >
              Criar Primeiro Curso
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => (
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
                  <div className="w-full h-[336px] bg-gradient-to-br from-[#003366] to-[#FF6600] flex items-center justify-center">
                    <span className="text-white text-sm font-medium">Sem banner</span>
                  </div>
                )}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      course.status === 'ACTIVE' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {course.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  <h2 className="text-xl font-semibold mb-2 text-[#003366]">{course.title}</h2>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{course.description}</p>
                  <div className="flex items-center justify-between mb-4 text-sm text-gray-500">
                    <span>{course.lessons?.length || 0} aulas</span>
                    <span>{course._count?.enrollments || 0} alunos</span>
                  </div>
                  <div className="space-y-2">
                    <Link
                      href={`/admin/courses/${course.id}/lessons`}
                      className="block w-full bg-[#FF6600] text-white py-2 px-4 rounded-md font-semibold hover:bg-[#e55a00] transition-colors text-center text-sm"
                    >
                      Gerenciar Aulas
                    </Link>
                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        href={`/admin/courses/${course.id}/enrollments`}
                        className="bg-blue-600 text-white py-2 px-3 rounded-md font-semibold hover:bg-blue-700 transition-colors text-center text-xs"
                      >
                        Inscritos ({course._count?.enrollments || 0})
                      </Link>
                      <button
                        onClick={() => handleExport(course.id, course.title)}
                        className="bg-green-600 text-white py-2 px-3 rounded-md font-semibold hover:bg-green-700 transition-colors text-xs flex items-center justify-center gap-1"
                        disabled={!course._count?.enrollments || course._count.enrollments === 0}
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Excel
                      </button>
                    </div>
                    <button
                      onClick={() => handleDelete(course.id, course.title)}
                      className="w-full bg-red-600 text-white py-2 px-4 rounded-md font-semibold hover:bg-red-700 transition-colors text-sm flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Excluir Curso
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Footer />
      
      {/* Espaçamento para navbar inferior no mobile */}
      {session && <div className="md:hidden h-20" />}
    </div>
  )
}
