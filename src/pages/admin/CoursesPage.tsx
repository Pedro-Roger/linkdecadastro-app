import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import MobileNavbar from '@/components/ui/MobileNavbar'
import Footer from '@/components/ui/Footer'
import { apiFetch, getApiUrl } from '@/lib/api'
import { useAuth } from '@/lib/useAuth'

export default function AdminCoursesPage() {
  const navigate = useNavigate()
  const { user, loading: authLoading, isAuthenticated } = useAuth({ requireAuth: true, redirectTo: '/login' })
  const [courses, setCourses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilter, setActiveFilter] = useState<string>('all')
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [shareCopyStatus, setShareCopyStatus] = useState<'idle' | 'success'>('idle')
  const [selectedCourse, setSelectedCourse] = useState<any>(null)

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated || user?.role !== 'ADMIN') {
        navigate('/my-courses')
      } else {
        fetchCourses()
      }
    }
  }, [authLoading, isAuthenticated, user, navigate])

  async function fetchCourses() {
    try {
      const data = await apiFetch<any[]>('/admin/courses', { auth: true })
      setCourses(data)
    } catch (error) {
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (courseId: string, courseTitle: string) => {
    if (!confirm(`Tem certeza que deseja excluir o curso "${courseTitle}"? Esta ação não pode ser desfeita.`)) {
      return
    }

    try {
      await apiFetch(`/admin/courses/${courseId}`, {
        method: 'DELETE',
        auth: true,
      })
      fetchCourses()
      alert('Curso excluído com sucesso!')
    } catch (error) {
      alert('Erro ao excluir curso')
    }
  }

  const handleExport = async (courseId: string, courseTitle: string) => {
    try {
      const url = `${getApiUrl()}/admin/courses/${courseId}/export`
      const response = await fetch(url, {
        headers: {
          ...(typeof window !== 'undefined' && localStorage.getItem('token')
            ? { Authorization: `Bearer ${localStorage.getItem('token')}` }
            : {}),
        },
      })
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
      alert('Erro ao exportar dados')
    }
  }

  const buildShareData = (course: any) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const path = course.slug ? `/c/${course.slug}` : `/course/${course.id}`
    const url = origin ? `${origin}${path}` : path

    let bannerUrl: string | undefined = course.bannerUrl
    if (bannerUrl && bannerUrl.startsWith('/')) {
      bannerUrl = origin ? `${origin}${bannerUrl}` : bannerUrl
    }

    return {
      url,
      bannerUrl,
      message: `Confira o curso "${course.title}" no Link de Cadastro: ${url}`
    }
  }

  const selectedShareData = useMemo(() => {
    if (!selectedCourse) return null
    return buildShareData(selectedCourse)
  }, [selectedCourse])

  const openShareModal = (course: any) => {
    setSelectedCourse(course)
    setShareCopyStatus('idle')
    setShareModalOpen(true)
  }

  const closeShareModal = () => {
    setShareModalOpen(false)
  }

  const copyShareLink = async () => {
    if (!selectedShareData) return

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(selectedShareData.url)
        setShareCopyStatus('success')
        setTimeout(() => setShareCopyStatus('idle'), 2000)
      }
    } catch (error) {
    }
  }

  const shareNow = async () => {
    if (!selectedCourse || !selectedShareData) return

    const shareData = {
      title: selectedCourse.title,
      text: `Confira o curso "${selectedCourse.title}" no Link de Cadastro.`,
      url: selectedShareData.url
    }

    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share(shareData)
      } else if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(selectedShareData.message)
        setShareCopyStatus('success')
        setTimeout(() => setShareCopyStatus('idle'), 2000)
      }
    } catch (error) {
    }
  }

  const shareWhatsApp = () => {
    if (!selectedShareData) return
    const waUrl = `https://wa.me/?text=${encodeURIComponent(selectedShareData.message)}`

    if (typeof window !== 'undefined') {
      window.open(waUrl, '_blank', 'noopener,noreferrer')
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

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-xl text-gray-600">Carregando...</div>
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

      
      <div className="container mx-auto px-4 py-8 pb-24 md:pb-8 flex-1">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#003366] mb-2">Cursos Disponíveis</h1>
            <p className="text-gray-600">Gerenciamento e moderação de cursos</p>
          </div>
          <Link
            to="/admin/courses/new"
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
              to="/admin/courses/new"
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
                      src={course.bannerUrl} alt={`Banner do curso ${course.title}`}
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
                      to={`/admin/courses/${course.id}/lessons`}
                      className="block w-full bg-[#FF6600] text-white py-2 px-4 rounded-md font-semibold hover:bg-[#e55a00] transition-colors text-center text-sm"
                    >
                      Gerenciar Aulas
                    </Link>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <Link
                        to={`/admin/courses/${course.id}/enrollments`}
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
                      <button
                        onClick={() => openShareModal(course)}
                        className="bg-[#003366] text-white py-2 px-3 rounded-md font-semibold hover:bg-[#00264d] transition-colors text-xs flex items-center justify-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 12v.01M12 12v.01M20 12v.01M7 12a5 5 0 0110 0"
                          />
                        </svg>
                        Compartilhar
                      </button>
                      <button
                        onClick={() => openShareModal(course)}
                        className="bg-green-600 text-white py-2 px-3 rounded-md font-semibold hover:bg-green-700 transition-colors text-xs flex items-center justify-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M20.52 3.48A11.77 11.77 0 0 0 12.02 0 11.84 11.84 0 0 0 .15 11.85a11.6 11.6 0 0 0 1.58 5.84L0 24l6.42-1.68a11.85 11.85 0 0 0 5.6 1.42h.01A11.84 11.84 0 0 0 24 11.86a11.7 11.7 0 0 0-3.48-8.38ZM12 21.15h-.01a9.9 9.9 0 0 1-5.04-1.38l-.36-.21-3.81.99 1.02-3.7-.23-.38a9.84 9.84 0 0 1 8.43-15.1h.01a9.8 9.8 0 0 1 9.82 9.84A9.86 9.86 0 0 1 12 21.15Zm5.41-7.36c-.3-.15-1.77-.87-2.04-.97s-.47-.15-.66.15-.76.97-.93 1.17-.34.22-.63.07a8.07 8.07 0 0 1-2.37-1.46 8.84 8.84 0 0 1-1.62-2 1.77 1.77 0 0 1 .11-1.86c.18-.23.4-.48.6-.73s.25-.38.37-.62.06-.45 0-.62-.66-1.59-.91-2.18-.5-.5-.68-.51h-.58a1.12 1.12 0 0 0-.81.38 3.36 3.36 0 0 0-1.06 2.5 5.86 5.86 0 0 0 1.24 3.13 13.35 13.35 0 0 0 5.15 4.52 5.9 5.9 0 0 0 2.4.73 2 2 0 0 0 1.31-.86 1.6 1.6 0 0 0 .11-.86c-.05-.09-.27-.17-.57-.31Z" />
                        </svg>
                        WhatsApp
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        to={`/admin/courses/new?clone=${course.id}`}
                        className="bg-purple-600 text-white py-2 px-4 rounded-md font-semibold hover:bg-purple-700 transition-colors text-sm flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Clonar
                      </Link>
                      <button
                        onClick={() => handleDelete(course.id, course.title)}
                        className="bg-red-600 text-white py-2 px-4 rounded-md font-semibold hover:bg-red-700 transition-colors text-sm flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Excluir
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {shareModalOpen && selectedCourse && selectedShareData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-[#003366]">Compartilhar curso</h3>
                <p className="text-sm text-gray-500">Revise as informações antes de enviar</p>
              </div>
              <button
                onClick={closeShareModal}
                className="text-gray-400 transition-colors hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid gap-4 px-6 py-4 md:grid-cols-[160px,1fr]">
              <div className="flex items-center justify-center">
                {selectedShareData.bannerUrl ? (
                  <img
                    src={selectedShareData.bannerUrl} alt={`Banner do curso ${selectedCourse.title}`}
                    className="h-32 w-32 rounded-lg object-cover shadow-sm"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex h-32 w-32 items-center justify-center rounded-lg bg-gradient-to-br from-[#003366] to-[#FF6600] text-center text-xs font-semibold text-white">
                    Sem banner
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#003366]">{selectedCourse.title}</p>
                  {selectedCourse.description && (
                    <p className="mt-1 text-sm text-gray-600 line-clamp-3">{selectedCourse.description}</p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Link do curso</label>
                  <div className="mt-1 grid grid-cols-[1fr,auto] gap-2 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                    <input
                      readOnly
                      value={selectedShareData.url}
                      className="truncate bg-transparent px-3 py-2 text-sm text-gray-700 outline-none"
                    />
                    <button
                      onClick={copyShareLink}
                      className="m-1 flex items-center justify-center rounded-md bg-white px-3 text-xs font-semibold text-[#003366] transition-colors hover:bg-gray-100"
                    >
                      {shareCopyStatus === 'success' ? 'Copiado!' : 'Copiar'}
                    </button>
                  </div>
                </div>
                {selectedShareData.bannerUrl && (
                  <div>
                    <label className="text-xs font-medium text-gray-500">Imagem do curso</label>
                    <div className="mt-1 truncate rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                      {selectedShareData.bannerUrl}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t bg-gray-50 px-6 py-4 md:flex-row md:justify-end">
              <button
                onClick={shareNow}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#003366] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#00264d]"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12v.01M12 12v.01M20 12v.01M7 12a5 5 0 0110 0" />
                </svg>
                Compartilhar agora
              </button>
              <button
                onClick={shareWhatsApp}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.52 3.48A11.77 11.77 0 0 0 12.02 0 11.84 11.84 0 0 0 .15 11.85a11.6 11.6 0 0 0 1.58 5.84L0 24l6.42-1.68a11.85 11.85 0 0 0 5.6 1.42h.01A11.84 11.84 0 0 0 24 11.86a11.7 11.7 0 0 0-3.48-8.38ZM12 21.15h-.01a9.9 9.9 0 0 1-5.04-1.38l-.36-.21-3.81.99 1.02-3.7-.23-.38a9.84 9.84 0 0 1 8.43-15.1h.01a9.8 9.8 0 0 1 9.82 9.84A9.86 9.86 0 0 1 12 21.15Zm5.41-7.36c-.3-.15-1.77-.87-2.04-.97s-.47-.15-.66.15-.76.97-.93 1.17-.34.22-.63.07a8.07 8.07 0 0 1-2.37-1.46 8.84 8.84 0 0 1-1.62-2 1.77 1.77 0 0 1 .11-1.86c.18-.23.4-.48.6-.73s.25-.38.37-.62.06-.45 0-.62-.66-1.59-.91-2.18-.5-.5-.68-.51h-.58a1.12 1.12 0 0 0-.81.38 3.36 3.36 0 0 0-1.06 2.5 5.86 5.86 0 0 0 1.24 3.13 13.35 13.35 0 0 0 5.15 4.52 5.9 5.9 0 0 0 2.4.73 2 2 0 0 0 1.31-.86 1.6 1.6 0 0 0 .11-.86c-.05-.09-.27-.17-.57-.31Z" />
                </svg>
                WhatsApp
              </button>
              <button
                onClick={closeShareModal}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-100"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
      
      
      {isAuthenticated && <div className="md:hidden h-20" />}
    </div>
  )
}
