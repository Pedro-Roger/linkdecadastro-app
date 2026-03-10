import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import MobileNavbar from '@/components/ui/MobileNavbar'
import Footer from '@/components/ui/Footer'
import {
  Users,
  Search,
  Download,
  X,
  MapPin,
  Mail,
  Phone,
  User,
  Calendar,
  Filter,
  MoreVertical,
  UserCheck,
  GraduationCap,
  Briefcase,
  Trash2,
  AlertTriangle
} from 'lucide-react'
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
  waterArea?: number | null
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

export default function EventRegistrationsPage({ eventIdProp, onClose }: { eventIdProp?: string, onClose?: () => void } = {}) {
  const navigate = useNavigate()
  const { eventId: paramEventId } = useParams<{ eventId: string }>()
  const eventId = eventIdProp || paramEventId
  const { user, loading: authLoading, isAuthenticated } = useAuth({
    requireAuth: true,
    redirectTo: '/login',
  })
  const [event, setEvent] = useState<Event | null>(null)
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [loading, setLoading] = useState(true)
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [regToDelete, setRegToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
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
  const [searchTerm, setSearchTerm] = useState('')

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
    { key: 'waterArea', label: "Lâmina d'água (ha)" },
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
      if (!isAuthenticated || (user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN')) {
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

  const handleDeleteRegistration = (id: string) => {
    setRegToDelete(id)
  }

  const confirmDelete = async () => {
    if (!regToDelete) return

    setIsDeleting(true)
    try {
      await apiFetch(`/admin/events/registrations/${regToDelete}`, {
        method: 'DELETE',
        auth: true
      })
      setRegistrations(prev => prev.filter(reg => reg.id !== regToDelete))
      setRegToDelete(null)
    } catch (err: any) {
      alert(err?.message || 'Erro ao excluir inscrição')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleExport = async (format: 'xlsx' | 'csv' | 'pdf') => {
    if (!eventId || selectedFields.length === 0) {
      alert('Selecione pelo menos um campo para exportar')
      return
    }

    // Removida lógica client-side que estava falhando.
    // Agora todas as opções (PDF, CSV, XLSX) usam o endpoint dedicado do backend.

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
        a.download = `cadastros-${event?.title?.replace(/[^a-z0-9]/gi, '-').toLowerCase() || 'evento'}.${format}`
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

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; color: string; bg: string }> = {
      PENDING: { label: 'Pendente', color: 'text-amber-600', bg: 'bg-amber-50' },
      CONFIRMED: { label: 'Confirmado', color: 'text-emerald-600', bg: 'bg-emerald-50' },
      CANCELLED: { label: 'Cancelado', color: 'text-rose-600', bg: 'bg-rose-50' },
    }
    return configs[status] || { label: status, color: 'text-slate-600', bg: 'bg-slate-50' }
  }

  const getStats = () => {
    const total = registrations.length
    const producers = registrations.filter(r => r.participantType === 'PRODUTOR').length
    const students = registrations.filter(r => r.participantType === 'ESTUDANTE').length
    const others = total - producers - students

    return { total, producers, students, others }
  }

  const filteredRegistrations = registrations.filter(r =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.cpf.includes(searchTerm)
  )

  if (authLoading || loading) {
    return <LoadingScreen />
  }

  const stats = getStats()

  return (
    <div className={eventIdProp ? "" : "min-h-screen bg-gray-50 flex flex-col"}>
      {!eventIdProp && <MobileNavbar />}

      <main className="flex-1">
        <div className={eventIdProp ? "py-2" : "container mx-auto px-4 py-8"}>
          {!eventIdProp && (
            <Link
              to="/admin/events"
              className="text-[var(--primary)] hover:text-[var(--primary-hover)] font-black text-[10px] uppercase tracking-widest mb-6 inline-flex items-center gap-2 group transition-all"
            >
              <span className="group-hover:-translate-x-1 transition-transform">←</span> Voltar para Eventos
            </Link>
          )}

          {/* Header Section */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-indigo-600 rounded-[1.5rem] flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                <Users size={28} />
              </div>
              <div>
                <h1 className="text-2xl font-black text-[var(--secondary)] tracking-tight">
                  Inscritos no Evento
                </h1>
                {event && (
                  <p className="text-[var(--text-muted)] font-bold text-xs uppercase tracking-widest mt-1">
                    {event.title}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 w-full lg:w-auto">
              <div className="relative flex-1 lg:w-64">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Buscar por nome, e-mail..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white border border-[var(--border-light)] rounded-2xl py-2.5 pl-11 pr-4 text-xs font-bold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm"
                />
              </div>
              <button
                onClick={() => setExportModalOpen(true)}
                className="bg-white text-emerald-600 border border-emerald-100 px-5 py-2.5 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-emerald-50 transition-all flex items-center gap-2 shadow-sm hover:shadow-md"
              >
                <Download size={14} />
                Exportar
              </button>
              {onClose && (
                <button
                  onClick={onClose}
                  className="p-2.5 bg-white text-[var(--text-muted)] hover:text-[var(--secondary)] border border-[var(--border-light)] rounded-2xl transition-all shadow-sm"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </div>

          {/* Stats Summary Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total Inscritos', value: stats.total, icon: <Users size={16} />, color: 'bg-indigo-50 text-indigo-600' },
              { label: 'Produtores', value: stats.producers, icon: <Briefcase size={16} />, color: 'bg-emerald-50 text-emerald-600' },
              { label: 'Estudantes', value: stats.students, icon: <GraduationCap size={16} />, color: 'bg-blue-50 text-blue-600' },
              { label: 'Outros', value: stats.others, icon: <UserCheck size={16} />, color: 'bg-slate-100 text-slate-600' },
            ].map((stat, i) => (
              <div key={i} className="bg-white p-5 rounded-3xl border border-[var(--border-light)] shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2 rounded-xl ${stat.color}`}>{stat.icon}</div>
                </div>
                <div className="text-2xl font-black text-[var(--secondary)]">{stat.value}</div>
                <div className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mt-1">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Main Table Content */}
          <div className="bg-white rounded-[2rem] border border-[var(--border-light)] shadow-sm overflow-hidden">
            {filteredRegistrations.length === 0 ? (
              <div className="p-20 text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                  <Search size={32} />
                </div>
                <h3 className="text-sm font-bold text-[var(--secondary)]">Nenhum registro encontrado</h3>
                <p className="text-xs text-[var(--text-muted)] mt-1">Tente ajustar sua busca ou filtros.</p>
              </div>
            ) : (
              <div className="overflow-x-auto custom-scrollbar">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-[var(--border-light)]">
                      <th className="px-6 py-4 text-left text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Inscrito</th>
                      <th className="px-6 py-4 text-left text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Contato</th>
                      <th className="px-6 py-4 text-left text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Localização</th>
                      <th className="px-6 py-4 text-left text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Perfil</th>
                      <th className="px-6 py-4 text-left text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Turma</th>
                      <th className="px-6 py-4 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest text-right">Inscrição</th>
                      <th className="px-6 py-4 text-center text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRegistrations.map((registration) => {
                      const status = getStatusConfig(registration.status)
                      return (
                        <tr key={registration.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-4">
                              <div className="relative shrink-0">
                                <img
                                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(registration.name)}&background=random&font-size=0.4`}
                                  className="w-10 h-10 rounded-2xl object-cover shadow-sm group-hover:scale-105 transition-transform"
                                  alt=""
                                />
                                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-[11px] font-black text-[var(--secondary)] truncate max-w-[180px]">
                                  {registration.name}
                                </div>
                                <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-tighter mt-0.5">
                                  CPF: {registration.cpf}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2 text-[10px] font-bold text-[var(--secondary)]">
                                <Mail size={12} className="text-indigo-400" />
                                {registration.email}
                              </div>
                              <div className="flex items-center gap-2 text-[10px] font-bold text-[var(--text-muted)]">
                                <Phone size={12} className="text-emerald-400" />
                                {registration.phone}
                                <a
                                  href={`https://wa.me/55${registration.phone.replace(/\D/g, '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 hover:bg-emerald-50 text-emerald-600 rounded-md transition-all hover:scale-110"
                                >
                                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                                </a>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-[var(--secondary)]">
                              <MapPin size={12} className="text-slate-400" />
                              {registration.city}, {registration.state}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${registration.participantType === 'PRODUTOR' ? 'bg-emerald-50 text-emerald-600' :
                              registration.participantType === 'ESTUDANTE' ? 'bg-blue-50 text-blue-600' :
                                'bg-slate-100 text-slate-600'
                              }`}>
                              {getParticipantTypeLabel(registration.participantType)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-[11px] font-black text-indigo-600 bg-indigo-50 w-8 h-8 rounded-xl flex items-center justify-center border border-indigo-100">
                              {registration.municipalityClass?.classNumber || registration.batchNumber || '-'}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="text-[10px] font-bold text-[var(--secondary)]">
                              {format(new Date(registration.createdAt), 'dd MMM yyyy', { locale: ptBR })}
                            </div>
                            <div className="text-[9px] font-medium text-[var(--text-muted)]">
                              {format(new Date(registration.createdAt), 'HH:mm')}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => handleDeleteRegistration(registration.id)}
                              className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all active:scale-90"
                              title="Excluir Registro"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="mt-6 flex items-center justify-between">
            <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">
              Total de cadastros: <span className="text-[var(--secondary)] text-xs ml-1">{registrations.length}</span>
            </div>
          </div>
        </div>

      </main>

      {!eventIdProp && <Footer />}

      {exportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
          <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl">
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

      {/* Modal de Confirmação de Exclusão */}
      {regToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-3xl p-8 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center text-rose-500 mb-6 shadow-sm border border-rose-100">
                <AlertTriangle size={40} strokeWidth={2.5} />
              </div>

              <h3 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tight">Confirmar Exclusão</h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed mb-8">
                Tem certeza que deseja excluir esta inscrição? <br />
                <span className="text-rose-500 font-bold">Esta ação não pode ser desfeita.</span>
              </p>

              <div className="flex flex-col w-full gap-3">
                <button
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="w-full py-4 bg-rose-500 hover:bg-rose-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-rose-500/20 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isDeleting ? 'EXCLUINDO...' : 'SIM, EXCLUIR REGISTRO'}
                </button>
                <button
                  onClick={() => setRegToDelete(null)}
                  disabled={isDeleting}
                  className="w-full py-4 bg-slate-50 hover:bg-slate-100 text-slate-500 font-black text-xs uppercase tracking-widest rounded-2xl transition-all"
                >
                  CANCELAR
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div >
  )
}

