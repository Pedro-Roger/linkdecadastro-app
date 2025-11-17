import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import MobileNavbar from '@/components/ui/MobileNavbar'
import Footer from '@/components/ui/Footer'
import LoadingScreen from '@/components/ui/LoadingScreen'
import { apiFetch, getApiUrl } from '@/lib/api'
import { useAuth } from '@/lib/useAuth'

interface Registration {
  id: string
  name: string
  cpf: string
  email: string
  phone: string
  cep: string
  locality: string
  city: string
  state: string
  participantType: string
  otherType?: string | null
  pondCount?: number | null
  waterDepth?: number | null
  status: string
  createdAt: string
  batchNumber: number
  municipality?: {
    municipality: string
    state: string
  } | null
  municipalityClass?: {
    classNumber: number
  } | null
}

interface Event {
  id: string
  title: string
}

export default function EventRegistrationsPage() {
  const navigate = useNavigate()
  const { eventId } = useParams<{ eventId: string }>()
  const { user, loading: authLoading, isAuthenticated } = useAuth({
    requireAuth: true,
    redirectTo: '/login',
  })
  const [event, setEvent] = useState<Event | null>(null)
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [loading, setLoading] = useState(true)
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [selectedFields, setSelectedFields] = useState<string[]>([
    'number',
    'name',
    'cpf',
    'email',
    'phone',
    'city',
    'state',
    'participantType',
    'classNumber',
    'createdAt',
  ])

  const availableFields = [
    { key: 'number', label: 'Nº' },
    { key: 'name', label: 'Nome Completo' },
    { key: 'cpf', label: 'CPF' },
    { key: 'email', label: 'E-mail' },
    { key: 'phone', label: 'Telefone' },
    { key: 'cep', label: 'CEP' },
    { key: 'locality', label: 'Localidade/Bairro' },
    { key: 'city', label: 'Cidade' },
    { key: 'state', label: 'Estado' },
    { key: 'participantType', label: 'Tipo de Participante' },
    { key: 'otherType', label: 'O que você é?' },
    { key: 'pondCount', label: 'Quantidade de Viveiros' },
    { key: 'waterDepth', label: 'Lâmina d\'água (metros)' },
    { key: 'classNumber', label: 'Turma' },
    { key: 'status', label: 'Status' },
    { key: 'createdAt', label: 'Data de Cadastro' },
  ]

  const fetchData = useCallback(async () => {
    if (!eventId) return
    try {
      setLoading(true)
      const data = await apiFetch<{ event: Event; registrations: Registration[] }>(
        `/admin/events/${eventId}/registrations`,
        { auth: true }
      )
      setEvent(data.event)
      setRegistrations(data.registrations)
    } catch (error) {
      console.error('Erro ao carregar registros:', error)
      alert('Erro ao carregar registros')
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

  const toggleField = (fieldKey: string) => {
    if (fieldKey === 'number') return // number sempre está selecionado
    setSelectedFields((prev) =>
      prev.includes(fieldKey)
        ? prev.filter((f) => f !== fieldKey)
        : [...prev, fieldKey]
    )
  }

  const handleExport = async (format: 'xlsx' | 'csv' | 'pdf') => {
    if (!eventId || selectedFields.length === 0) {
      alert('Selecione pelo menos um campo para exportar')
      return
    }

    try {
      const fieldsParam = selectedFields.filter((f) => f !== 'number').join(',')
      const url = `${getApiUrl()}/admin/events/${eventId}/export?format=${format}&fields=${fieldsParam}`
      const token =
        typeof window !== 'undefined' ? localStorage.getItem('token') : null

      const response = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })

      if (response.ok) {
        const blob = await response.blob()
        const downloadUrl = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = downloadUrl
        a.download = `cadastros-${event?.title?.replace(/[^a-z0-9]/gi, '-').toLowerCase() || 'evento'}.${format === 'csv' ? 'csv' : format === 'pdf' ? 'pdf' : 'xlsx'}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(downloadUrl)
        document.body.removeChild(a)
        setExportModalOpen(false)
      } else {
        alert('Erro ao exportar dados')
      }
    } catch (error) {
      console.error('Erro ao exportar:', error)
      alert('Erro ao exportar dados')
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

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      PENDING: 'Pendente',
      CONFIRMED: 'Confirmado',
      CANCELLED: 'Cancelado',
    }
    return labels[status] || status
  }

  if (authLoading || loading) {
    return <LoadingScreen />
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
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-[#003366] mb-2">
                Cadastros do Evento
              </h1>
              {event && (
                <p className="text-gray-600 text-lg">{event.title}</p>
              )}
            </div>
            <button
              onClick={() => setExportModalOpen(true)}
              className="bg-green-600 text-white px-6 py-3 rounded-md font-semibold hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Exportar Dados
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {registrations.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                Nenhum cadastro encontrado para este evento.
              </div>
            ) : (
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
                        CPF
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        E-mail
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Telefone
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cidade
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tipo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Turma
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Data
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {registrations.map((registration, index) => (
                      <tr key={registration.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {index + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {registration.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {registration.cpf}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {registration.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {registration.phone}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {registration.city}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {registration.state}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div>
                            {getParticipantTypeLabel(registration.participantType)}
                            {registration.otherType && (
                              <div className="text-xs text-gray-400">
                                ({registration.otherType})
                              </div>
                            )}
                            {registration.pondCount !== null && registration.pondCount !== undefined && (
                              <div className="text-xs text-gray-400">
                                {registration.pondCount} viveiros
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {registration.municipalityClass?.classNumber ||
                            registration.batchNumber ||
                            '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {format(new Date(registration.createdAt), 'dd/MM/yyyy HH:mm', {
                            locale: ptBR,
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="mt-4 text-sm text-gray-600">
            Total de cadastros: <strong>{registrations.length}</strong>
          </div>
        </div>
      </main>

      <Footer />

      {exportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-semibold text-[#003366]">
                Exportar Cadastros
              </h2>
              <button
                onClick={() => setExportModalOpen(false)}
                className="text-gray-400 transition-colors hover:text-gray-600"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="px-6 py-6">
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Selecione os campos para exportar:
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-4">
                  {availableFields.map((field) => (
                    <label
                      key={field.key}
                      className="flex items-center space-x-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedFields.includes(field.key)}
                        onChange={() => toggleField(field.key)}
                        disabled={field.key === 'number'}
                        className="h-4 w-4 rounded border-gray-300 text-[#FF6600] focus:ring-[#FF6600]"
                      />
                      <span className="text-sm text-gray-700">{field.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-end">
                <button
                  onClick={() => handleExport('xlsx')}
                  className="flex-1 sm:flex-none bg-green-600 text-white px-6 py-2 rounded-md font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Excel (XLSX)
                </button>
                <button
                  onClick={() => handleExport('csv')}
                  className="flex-1 sm:flex-none bg-blue-600 text-white px-6 py-2 rounded-md font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  CSV
                </button>
                <button
                  onClick={() => handleExport('pdf')}
                  className="flex-1 sm:flex-none bg-red-600 text-white px-6 py-2 rounded-md font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  PDF
                </button>
                <button
                  onClick={() => setExportModalOpen(false)}
                  className="flex-1 sm:flex-none border border-gray-300 px-6 py-2 rounded-md font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

