import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import MobileNavbar from '@/components/ui/MobileNavbar'
import Footer from '@/components/ui/Footer'
import LoadingScreen from '@/components/ui/LoadingScreen'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/lib/useAuth'

// Tipos para o fallback client-side
interface Enrollment {
  id: string
  user: {
    id: string
    name: string
    email: string
    city?: string
    state?: string
    participantType?: string
  }
  municipalityClass?: {
    id: string
    classNumber: number
  } | null
  courseId: string
  createdAt: string
  status: string
}

interface MunicipalityClass {
  id: string
  classNumber: number
  limit: number
  currentCount: number
  status: 'ACTIVE' | 'CLOSED'
  createdAt: string
  closedAt?: string | null
  registrations: number
  students?: Enrollment[]
}

interface MunicipalityLimit {
  id: string
  municipality: string
  state: string
  defaultLimit: number
  totalRegistrations: number
  activeClassNumber: number | null
  activeClassLimit: number | null
  activeClassCount: number | null
  classes: MunicipalityClass[]
  byParticipantType: Record<string, number>
}

interface RegionsData {
  regions: MunicipalityLimit[]
  overall: {
    totalRegistrations: number
    byParticipantType: Record<string, number>
    byState: Array<{
      state: string
      total: number
      byParticipantType: Record<string, number>
    }>
  }
}

interface Course {
  id: string
  title: string
}

export default function CourseClassesPage() {
  const navigate = useNavigate()
  const { courseId } = useParams<{ courseId: string }>()
  const { user, loading: authLoading, isAuthenticated } = useAuth({
    requireAuth: true,
    redirectTo: '/login',
  })
  const [course, setCourse] = useState<Course | null>(null)
  const [regionsData, setRegionsData] = useState<RegionsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingLimit, setEditingLimit] = useState<string | null>(null)

  const [expandedClass, setExpandedClass] = useState<string | null>(null)
  const [newLimit, setNewLimit] = useState<number>(20)
  const [updating, setUpdating] = useState(false)
  const [closingClass, setClosingClass] = useState<string | null>(null)

  // Função auxiliar para agrupar dados client-side
  const groupEnrollmentsByRegion = (enrollments: Enrollment[]): RegionsData => {
    const regionsMap = new Map<string, MunicipalityLimit>()
    const byParticipantTypeOverall: Record<string, number> = {}
    const byStateMap = new Map<string, { total: number; byParticipantType: Record<string, number> }>()

    enrollments.forEach(enrollment => {
      const city = enrollment.user.city || 'Desconhecida'
      const state = enrollment.user.state || 'XX'
      const key = `${city}-${state}`
      const type = enrollment.user.participantType || 'OUTROS'

      // Overall Type Stats
      byParticipantTypeOverall[type] = (byParticipantTypeOverall[type] || 0) + 1

      // State Stats
      if (!byStateMap.has(state)) {
        byStateMap.set(state, { total: 0, byParticipantType: {} })
      }
      const stateStats = byStateMap.get(state)!
      stateStats.total++
      stateStats.byParticipantType[type] = (stateStats.byParticipantType[type] || 0) + 1

      // Region Logic
      if (!regionsMap.has(key)) {
        regionsMap.set(key, {
          id: key, // Usando key como ID temporário
          municipality: city,
          state: state,
          defaultLimit: 30, // Default fixo já que não vem do backend
          totalRegistrations: 0,
          activeClassNumber: 1,
          activeClassLimit: 30,
          activeClassCount: 0,
          classes: [], // Client-side não consegue reconstruir histórico de turmas perfeitamente sem backend
          byParticipantType: {}
        })
      }

      const region = regionsMap.get(key)!
      region.totalRegistrations++
      region.byParticipantType[type] = (region.byParticipantType[type] || 0) + 1

      // Simulação simples de turmas (apenas para visualização)
      // Agrupa de 30 em 30
      const classIndex = Math.floor((region.totalRegistrations - 1) / region.defaultLimit)
      const classNumber = classIndex + 1

      let classItem = region.classes.find(c => c.classNumber === classNumber)
      if (!classItem) {
        classItem = {
          id: `${key}-class-${classNumber}`,
          classNumber,
          limit: region.defaultLimit,
          currentCount: 0,
          status: 'ACTIVE',
          createdAt: new Date().toISOString(), // Data fictícia
          registrations: 0,
          students: []
        }
        region.classes.push(classItem)
      }

      classItem.currentCount++
      classItem.registrations++
      classItem.students?.push(enrollment)

      // Atualiza active class info
      region.activeClassNumber = classItem.classNumber
      region.activeClassCount = classItem.currentCount
      region.activeClassLimit = classItem.limit
    })

    return {
      regions: Array.from(regionsMap.values()).sort((a, b) => b.totalRegistrations - a.totalRegistrations),
      overall: {
        totalRegistrations: enrollments.length,
        byParticipantType: byParticipantTypeOverall,
        byState: Array.from(byStateMap.entries()).map(([state, data]) => ({
          state,
          ...data
        })).sort((a, b) => b.total - a.total)
      }
    }
  }

  const fetchData = useCallback(async () => {
    if (!courseId) return
    try {
      setLoading(true)

      // Busca curso (tenta endpoints diferentes)
      const courseData = await apiFetch<Course>(`/admin/courses/${courseId}`, { auth: true }).catch(() =>
        apiFetch<any>('/admin/courses', { auth: true }).then((data) =>
          Array.isArray(data) ? data.find((c: Course) => c.id === courseId) : data.courses?.find((c: Course) => c.id === courseId)
        )
      )

      if (courseData) setCourse(courseData)

      // Tenta endpoint oficial de regiões primeiro
      try {
        const regionsData = await apiFetch<RegionsData>(`/admin/courses/${courseId}/regions`, {
          auth: true,
        })
        setRegionsData(regionsData)
      } catch (backendError) {
        console.warn('Endpoint de regiões falhou, usando fallback client-side:', backendError)

        // Fallback: Busca enrollments e agrupa localmente
        const enrollments = await apiFetch<Enrollment[]>(`/admin/courses/${courseId}/enrollments`, {
          auth: true,
        })

        const groupedData = groupEnrollmentsByRegion(enrollments || [])
        setRegionsData(groupedData)
      }

    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      alert('Erro ao carregar dados do curso.')
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

  const handleUpdateLimit = async (limitId: string) => {
    // Client-side only alert
    alert('A edição de limites só está disponível quando suportada pelo backend.')
    setEditingLimit(null)
  }

  const handleCloseClass = async (classId: string) => {
    alert('O encerramento de turmas só está disponível quando suportado pelo backend.')
  }

  const getParticipantTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      PRODUTOR: 'Produtor',
      ESTUDANTE: 'Estudante',
      PROFESSOR: 'Professor',
      PESQUISADOR: 'Pesquisador',
      OUTROS: 'Outros'
    }
    return labels[type] || type
  }

  if (authLoading || loading) {
    return <LoadingScreen />
  }

  if (!regionsData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-xl text-red-600">Erro ao carregar dados.</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <MobileNavbar />

      <main className="flex-1">
        <div className="container mx-auto px-4 py-6">
          <Link
            to="/admin/courses"
            className="text-[#FF6600] hover:underline mb-4 inline-block"
          >
            ← Voltar para Cursos
          </Link>
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-[#003366] mb-2">
              Gerenciamento de Turmas (Por Cidade)
            </h1>
            {course && (
              <p className="text-gray-600 text-lg">{course.title}</p>
            )}

            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    Visualizando dados agrupados automaticamente. Algumas funcionalidades de edição podem estar limitadas.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 p-4 bg-white rounded-lg shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Total de Cadastros</p>
                  <p className="text-2xl font-bold text-[#003366]">
                    {regionsData.overall.totalRegistrations}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Municípios</p>
                  <p className="text-2xl font-bold text-[#003366]">
                    {regionsData.regions.length}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Por Tipo</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {Object.entries(regionsData.overall.byParticipantType).map(
                      ([type, count]) => (
                        <span
                          key={type}
                          className="text-xs bg-gray-100 px-2 py-1 rounded"
                        >
                          {getParticipantTypeLabel(type)}: {count}
                        </span>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {regionsData.regions.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <p className="text-gray-500 text-lg">
                Nenhum município com inscritos ainda.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {regionsData.regions.map((region) => (
                <div
                  key={region.id}
                  className="bg-white rounded-lg shadow-md overflow-hidden"
                >
                  <div className="bg-gradient-to-r from-[#003366] to-[#FF6600] px-6 py-4">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <h2 className="text-xl font-bold text-white">
                          {region.municipality} - {region.state}
                        </h2>
                        <div className="mt-2 flex flex-wrap gap-4 text-sm text-white/90">
                          <span>
                            Total: <strong>{region.totalRegistrations}</strong>{' '}
                            cadastros
                          </span>
                          {/* 
                          <span>
                            Limite padrão: <strong>{region.defaultLimit}</strong>{' '}
                            vagas
                          </span>
                          */}
                          {region.activeClassNumber && (
                            <span>
                              Turma Estimada: <strong>Turma {region.activeClassNumber}</strong>{' '}
                              ({region.activeClassCount} inscritos nesta turma)
                            </span>
                          )}
                        </div>
                        {Object.keys(region.byParticipantType).length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {Object.entries(region.byParticipantType).map(
                              ([type, count]) => (
                                <span
                                  key={type}
                                  className="text-xs bg-white/20 px-2 py-1 rounded"
                                >
                                  {getParticipantTypeLabel(type)}: {count}
                                </span>
                              )
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {/* Edição desabilitada no fallback 
                        <button
                          onClick={() => {
                            setEditingLimit(region.id)
                            setNewLimit(region.defaultLimit)
                          }}
                          className="bg-[#FF6600]/80 text-white px-4 py-2 rounded-md font-semibold hover:bg-[#e55a00] transition-colors cursor-not-allowed opacity-80"
                          title="Funcionalidade indisponível neste modo"
                        >
                          Editar Limite
                        </button>
                        */}
                      </div>
                    </div>
                  </div>

                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-[#003366] mb-4">
                      Turmas Calculadas ({region.classes.length})
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Turma
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Limite (Est.)
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Cadastros
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {region.classes.map((classItem) => (
                            <tr
                              key={classItem.id}
                              className={
                                classItem.status === 'ACTIVE'
                                  ? 'bg-green-50'
                                  : ''
                              }
                            >
                              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                Turma {classItem.classNumber}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                {classItem.limit} vagas
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                <span className="font-semibold">
                                  {classItem.currentCount}
                                </span>{' '}
                                cadastros
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${classItem.status === 'ACTIVE'
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-gray-100 text-gray-700'
                                    }`}
                                >
                                  {classItem.status === 'ACTIVE'
                                    ? 'Ativa'
                                    : 'Encerrada'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
