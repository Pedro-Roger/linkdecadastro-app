import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import NotificationBell from '@/components/notifications/NotificationBell'
import Footer from '@/components/ui/Footer'
import LoadingScreen from '@/components/ui/LoadingScreen'
import { apiFetch, getApiUrl } from '@/lib/api'
import { useAuth } from '@/lib/useAuth'

interface Enrollment {
  id: string
  progress: number
  completedAt: string | null
  createdAt: string
  user: {
    id: string
    name: string
    email: string
    createdAt: string
  }
  course: {
    title: string
  }
}

export default function CourseEnrollmentsPage() {
  const navigate = useNavigate()
  const { user, loading: authLoading, isAuthenticated, signOut } = useAuth({
    requireAuth: true,
    redirectTo: '/login',
  })
  const params = useParams()
  const courseId = params.courseId as string
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [course, setCourse] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv' | 'pdf'>('xlsx')
  const [selectedFields, setSelectedFields] = useState<string[]>([
    'number',
    'name',
    'email',
    'status',
    'progress',
    'createdAt',
  ])
  const [exporting, setExporting] = useState(false)

  const availableFields = [
    { key: 'number', label: 'Nº' },
    { key: 'name', label: 'Nome' },
    { key: 'email', label: 'Email' },
    { key: 'whatsapp', label: 'WhatsApp' },
    { key: 'status', label: 'Status' },
    { key: 'progress', label: 'Progresso (%)' },
    { key: 'participantType', label: 'Tipo de Participante' },
    { key: 'cpf', label: 'CPF' },
    { key: 'state', label: 'Estado' },
    { key: 'city', label: 'Cidade' },
    { key: 'createdAt', label: 'Data de Inscrição' },
    { key: 'completedAt', label: 'Data de Conclusão' },
    { key: 'waitlistPosition', label: 'Posição na Lista de Espera' },
    { key: 'eligibilityReason', label: 'Observações' },
  ]

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [enrollmentsData, courseData] = await Promise.all([
        apiFetch<Enrollment[]>(`/admin/courses/${courseId}/enrollments`, {
          auth: true,
        }),
        apiFetch<any>(`/admin/courses/${courseId}`, { auth: true }),
      ])
      setEnrollments(enrollmentsData || [])
      setCourse(courseData)
    } catch (error) {
      setEnrollments([])
    } finally {
      setLoading(false)
    }
  }, [courseId])

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated || user?.role !== 'ADMIN') {
        navigate('/my-courses')
      } else if (courseId) {
        fetchData()
      }
    }
  }, [authLoading, isAuthenticated, user, courseId, fetchData, navigate])

  const toggleField = (fieldKey: string) => {
    setSelectedFields((prev) =>
      prev.includes(fieldKey)
        ? prev.filter((f) => f !== fieldKey)
        : [...prev, fieldKey]
    )
  }

  const handleExport = async () => {
    if (selectedFields.length === 0) {
      alert('Selecione pelo menos um campo para exportar')
      return
    }

    setExporting(true)
    try {
      const fieldsParam = selectedFields.join(',')
      const url = `${getApiUrl()}/admin/courses/${courseId}/export?format=${exportFormat}&fields=${encodeURIComponent(fieldsParam)}`
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('token')
          : null
      const response = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        
        const extension = exportFormat === 'pdf' ? 'pdf' : exportFormat === 'csv' ? 'csv' : 'xlsx'
        a.download = `inscritos-${course?.title?.replace(/[^a-z0-9]/gi, '-').toLowerCase() || 'curso'}.${extension}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        setExportModalOpen(false)
      } else {
        alert(`Erro ao exportar dados: ${response.status} ${response.statusText}`)
      }
    } catch (error) {
      alert(`Erro ao exportar dados: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    } finally {
      setExporting(false)
    }
  }

  if (authLoading || loading) {
    return <LoadingScreen />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-2">
          <div className="flex flex-col md:flex-row items-center justify-between space-y-2 md:space-y-0">
            <Link to="/" className="flex items-center">
              <img src="/logo B.png"
                alt="Link de Cadastro"
                
                
                className="h-20 md:h-24 w-auto object-contain"
                
              />
            </Link>
            <nav className="flex items-center space-x-4 md:space-x-6 text-sm md:text-base">
              <Link to="/admin/dashboard" className="text-gray-700 hover:text-[#FF6600]">Dashboard</Link>
              <Link to="/admin/courses" className="text-gray-700 hover:text-[#FF6600]">Cursos</Link>
              <Link to="/admin/events" className="text-gray-700 hover:text-[#FF6600]">Eventos</Link>
              <NotificationBell />
              <Link to="/profile" className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#FF6600] text-white font-bold flex items-center justify-center">
                {user?.name?.charAt(0).toUpperCase() || 'A'}
              </Link>
              <button
                onClick={() => signOut()}
                className="bg-red-500 text-white px-4 py-2 rounded-md font-semibold hover:bg-red-600 transition-colors text-sm md:text-base"
              >
                Sair
              </button>
            </nav>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 pb-24 md:pb-8">
        <div className="mb-6">
          <Link
            to="/admin/courses"
            className="text-[#FF6600] hover:underline mb-4 inline-block"
          >
            ← Voltar para Cursos
          </Link>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-[#003366] mb-2">
                Inscritos no Curso
              </h1>
              {course && (
                <p className="text-gray-600 text-lg">{course.title}</p>
              )}
            </div>
            <button
              onClick={() => setExportModalOpen(true)}
              className="bg-green-600 text-white px-6 py-3 rounded-md font-semibold hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Exportar Dados
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nº
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nome
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Progresso
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data de Inscrição
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {enrollments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      Nenhum inscrito encontrado.
                    </td>
                  </tr>
                ) : (
                  enrollments.map((enrollment, index) => (
                    <tr key={enrollment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {enrollment.user.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {enrollment.user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                            <div
                              className="bg-[#FF6600] h-2 rounded-full transition-all"
                              style={{ width: `${enrollment.progress}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600">{enrollment.progress}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(new Date(enrollment.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {enrollment.completedAt ? (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                            Concluído
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                            Em Andamento
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {enrollments.length > 0 && (
          <div className="mt-4 text-sm text-gray-600">
            Total de inscritos: <strong>{enrollments.length}</strong>
          </div>
        )}
      </div>

      <Footer />

      {/* Modal de Exportação */}
      {exportModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-[#003366]">Exportar Dados dos Participantes</h2>
                <button
                  onClick={() => setExportModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Seleção de Formato */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Formato de Exportação
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => setExportFormat('xlsx')}
                    className={`px-4 py-3 rounded-lg border-2 transition-colors ${
                      exportFormat === 'xlsx'
                        ? 'border-[#FF6600] bg-[#FF6600] text-white'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="font-semibold">Excel</div>
                    <div className="text-xs mt-1">.xlsx</div>
                  </button>
                  <button
                    onClick={() => setExportFormat('csv')}
                    className={`px-4 py-3 rounded-lg border-2 transition-colors ${
                      exportFormat === 'csv'
                        ? 'border-[#FF6600] bg-[#FF6600] text-white'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="font-semibold">CSV</div>
                    <div className="text-xs mt-1">.csv</div>
                  </button>
                  <button
                    onClick={() => setExportFormat('pdf')}
                    className={`px-4 py-3 rounded-lg border-2 transition-colors ${
                      exportFormat === 'pdf'
                        ? 'border-[#FF6600] bg-[#FF6600] text-white'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="font-semibold">PDF</div>
                    <div className="text-xs mt-1">.pdf</div>
                  </button>
                </div>
              </div>

              {/* Seleção de Campos */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Campos para Exportar
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedFields(availableFields.map((f) => f.key))}
                      className="text-xs text-[#FF6600] hover:underline"
                    >
                      Selecionar Todos
                    </button>
                    <span className="text-xs text-gray-400">|</span>
                    <button
                      onClick={() => setSelectedFields(['number', 'name', 'email', 'status', 'progress', 'createdAt'])}
                      className="text-xs text-[#FF6600] hover:underline"
                    >
                      Padrão
                    </button>
                    <span className="text-xs text-gray-400">|</span>
                    <button
                      onClick={() => setSelectedFields([])}
                      className="text-xs text-[#FF6600] hover:underline"
                    >
                      Limpar
                    </button>
                  </div>
                </div>
                <div className="border border-gray-300 rounded-lg p-4 max-h-64 overflow-y-auto">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {availableFields.map((field) => (
                      <label
                        key={field.key}
                        className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                      >
                        <input
                          type="checkbox"
                          checked={selectedFields.includes(field.key)}
                          onChange={() => toggleField(field.key)}
                          className="w-4 h-4 text-[#FF6600] border-gray-300 rounded focus:ring-[#FF6600]"
                        />
                        <span className="text-sm text-gray-700">{field.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {selectedFields.length} campo(s) selecionado(s)
                </p>
              </div>

              {/* Botões de Ação */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setExportModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                  disabled={exporting}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleExport}
                  disabled={exporting || selectedFields.length === 0}
                  className="px-6 py-2 bg-[#FF6600] text-white rounded-md hover:bg-[#e55a00] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {exporting ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Exportando...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Exportar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

