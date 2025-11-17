import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import MobileNavbar from '@/components/ui/MobileNavbar'
import Footer from '@/components/ui/Footer'
import LoadingScreen from '@/components/ui/LoadingScreen'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/lib/useAuth'

interface MunicipalityClass {
  id: string
  classNumber: number
  limit: number
  currentCount: number
  status: 'ACTIVE' | 'CLOSED'
  createdAt: string
  closedAt?: string | null
  registrations: number
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

interface Event {
  id: string
  title: string
}

export default function EventClassesPage() {
  const navigate = useNavigate()
  const { eventId } = useParams<{ eventId: string }>()
  const { user, loading: authLoading, isAuthenticated } = useAuth({
    requireAuth: true,
    redirectTo: '/login',
  })
  const [event, setEvent] = useState<Event | null>(null)
  const [regionsData, setRegionsData] = useState<RegionsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingLimit, setEditingLimit] = useState<string | null>(null)
  const [newLimit, setNewLimit] = useState<number>(20)
  const [updating, setUpdating] = useState(false)
  const [closingClass, setClosingClass] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!eventId) return
    try {
      setLoading(true)
      const [eventData, regionsData] = await Promise.all([
        apiFetch<Event>(`/admin/events/${eventId}`, { auth: true }).catch(() =>
          apiFetch<{ events: Event[] }>('/events', { auth: true }).then((data) =>
            data.events.find((e: Event) => e.id === eventId)
          )
        ),
        apiFetch<RegionsData>(`/admin/events/${eventId}/regions`, {
          auth: true,
        }),
      ])
      if (eventData) setEvent(eventData)
      setRegionsData(regionsData)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      alert('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated || user?.role !== 'ADMIN') {
        navigate('/my-courses')
      } else if (eventId) {
        fetchData()
      }
    }
  }, [authLoading, isAuthenticated, user, eventId, fetchData, navigate])

  const handleUpdateLimit = async (limitId: string) => {
    if (newLimit <= 0) {
      alert('O limite deve ser maior que zero')
      return
    }

    setUpdating(true)
    try {
      await apiFetch(`/admin/events/limits/${limitId}`, {
        method: 'PATCH',
        auth: true,
        body: JSON.stringify({ defaultLimit: newLimit }),
      })
      setEditingLimit(null)
      await fetchData()
      alert('Limite atualizado com sucesso!')
    } catch (error) {
      console.error('Erro ao atualizar limite:', error)
      alert('Erro ao atualizar limite')
    } finally {
      setUpdating(false)
    }
  }

  const handleCloseClass = async (classId: string) => {
    if (
      !confirm(
        'Tem certeza que deseja encerrar esta turma? Esta ação não pode ser desfeita.'
      )
    ) {
      return
    }

    setClosingClass(classId)
    try {
      await apiFetch(`/admin/events/classes/${classId}/close`, {
        method: 'PATCH',
        auth: true,
      })
      await fetchData()
      alert('Turma encerrada com sucesso!')
    } catch (error) {
      console.error('Erro ao encerrar turma:', error)
      alert(error instanceof Error ? error.message : 'Erro ao encerrar turma')
    } finally {
      setClosingClass(null)
    }
  }

  const getParticipantTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      PRODUTOR: 'Produtor',
      ESTUDANTE: 'Estudante',
      PROFESSOR: 'Professor',
      PESQUISADOR: 'Pesquisador',
    }
    return labels[type] || type
  }

  if (authLoading || loading) {
    return <LoadingScreen />
  }

  if (!regionsData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-xl text-red-600">Erro ao carregar dados</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <MobileNavbar />

      <main className="flex-1">
        <div className="container mx-auto px-4 py-6">
          <Link
            to="/admin/events"
            className="text-[#FF6600] hover:underline mb-4 inline-block"
          >
            ← Voltar para Eventos
          </Link>
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-[#003366] mb-2">
              Gerenciamento de Turmas
            </h1>
            {event && (
              <p className="text-gray-600 text-lg">{event.title}</p>
            )}
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
                Nenhum município cadastrado ainda.
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
                          <span>
                            Limite padrão: <strong>{region.defaultLimit}</strong>{' '}
                            vagas
                          </span>
                          {region.activeClassNumber && (
                            <span>
                              Turma Ativa: <strong>Turma {region.activeClassNumber}</strong>{' '}
                              ({region.activeClassCount}/{region.activeClassLimit} vagas)
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
                        {editingLimit === region.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={newLimit}
                              onChange={(e) =>
                                setNewLimit(parseInt(e.target.value) || 0)
                              }
                              min="1"
                              className="px-3 py-2 rounded-md border border-gray-300 w-24 text-gray-900"
                              disabled={updating}
                            />
                            <button
                              onClick={() => handleUpdateLimit(region.id)}
                              disabled={updating}
                              className="bg-green-600 text-white px-4 py-2 rounded-md font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
                            >
                              {updating ? 'Salvando...' : 'Salvar'}
                            </button>
                            <button
                              onClick={() => {
                                setEditingLimit(null)
                                setNewLimit(region.defaultLimit)
                              }}
                              disabled={updating}
                              className="bg-gray-500 text-white px-4 py-2 rounded-md font-semibold hover:bg-gray-600 transition-colors disabled:opacity-50"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingLimit(region.id)
                              setNewLimit(region.defaultLimit)
                            }}
                            className="bg-[#FF6600] text-white px-4 py-2 rounded-md font-semibold hover:bg-[#e55a00] transition-colors"
                          >
                            Editar Limite
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-[#003366] mb-4">
                      Turmas ({region.classes.length})
                    </h3>
                    {region.classes.length === 0 ? (
                      <p className="text-gray-500 text-sm">
                        Nenhuma turma criada ainda.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Turma
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Limite
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Cadastros
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Criada em
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Encerrada em
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Ações
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
                                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                                      classItem.status === 'ACTIVE'
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-gray-100 text-gray-700'
                                    }`}
                                  >
                                    {classItem.status === 'ACTIVE'
                                      ? 'Ativa'
                                      : 'Encerrada'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                  {format(
                                    new Date(classItem.createdAt),
                                    'dd/MM/yyyy HH:mm',
                                    { locale: ptBR }
                                  )}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                  {classItem.closedAt
                                    ? format(
                                        new Date(classItem.closedAt),
                                        'dd/MM/yyyy HH:mm',
                                        { locale: ptBR }
                                      )
                                    : '-'}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm">
                                  {classItem.status === 'ACTIVE' && (
                                    <button
                                      onClick={() => handleCloseClass(classItem.id)}
                                      disabled={closingClass === classItem.id}
                                      className="bg-red-600 text-white px-3 py-1 rounded-md font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      {closingClass === classItem.id
                                        ? 'Encerrando...'
                                        : 'Encerrar'}
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
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

