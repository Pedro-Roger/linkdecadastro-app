import React, { useEffect, useState, useCallback } from 'react'
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
  ChevronRight,
  UserCheck,
  GraduationCap,
  Briefcase,
  AlertTriangle,
  ChevronDown,
  Layers,
  FileText
} from 'lucide-react'
import LoadingScreen from '@/components/ui/LoadingScreen'
import { apiFetch, getApiUrl } from '@/lib/api'
import { useAuth } from '@/lib/useAuth'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'

interface Registration {
  id: string
  name: string
  cpf: string
  email: string
  phone: string
  city: string
  state: string
  participantType: string
  municipalityClass?: {
    classNumber: number
  } | null
  batchNumber?: number
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
  students?: Registration[]
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

export default function EventClassesPage({ eventIdProp, onClose }: { eventIdProp?: string, onClose?: () => void } = {}) {
  const navigate = useNavigate()
  const { eventId: paramEventId } = useParams<{ eventId: string }>()
  const eventId = eventIdProp || paramEventId
  const { user, loading: authLoading, isAuthenticated } = useAuth({
    requireAuth: true,
    redirectTo: '/login',
  })
  const [event, setEvent] = useState<Event | null>(null)
  const [regionsData, setRegionsData] = useState<RegionsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeRightTab, setActiveRightTab] = useState('info'); // info, quick, notes
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState('')
  const [editingLimit, setEditingLimit] = useState<string | null>(null)
  const [expandedClass, setExpandedClass] = useState<string | null>(null)
  const [newLimit, setNewLimit] = useState<number>(20)
  const [updating, setUpdating] = useState(false)
  const [closingClass, setClosingClass] = useState<string | null>(null)
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [exportScope, setExportScope] = useState<{ municipality: string, state: string, id?: string } | null>(null)
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
    { key: 'number', label: 'NÂº' },
    { key: 'name', label: 'Nome Completo' },
    { key: 'cpf', label: 'CPF' },
    { key: 'email', label: 'E-mail' },
    { key: 'phone', label: 'Telefone' },
    { key: 'cep', label: 'CEP' },
    { key: 'locality', label: 'Localidade/Bairro' },
    { key: 'city', label: 'Cidade' },
    { key: 'state', label: 'Estado' },
    { key: 'participantType', label: 'Tipo de Participante' },
    { key: 'otherType', label: 'O que vocÃª Ã©?' },
    { key: 'pondCount', label: 'Quantidade de Viveiros' },
    { key: 'waterArea', label: "LÃ¢mina d'Ã¡gua (ha)" },
    { key: 'classNumber', label: 'Turma' },
    { key: 'status', label: 'Status' },
    { key: 'createdAt', label: 'Data de Cadastro' },
  ]

  // FunÃ§Ã£o para agrupar dados localmente (fallback quando backend falha)
  const groupRegistrationsByRegion = (registrations: Registration[]): RegionsData => {
    const regionsMap = new Map<string, MunicipalityLimit>()
    const byParticipantTypeOverall: Record<string, number> = {}
    const byStateMap = new Map<string, { total: number; byParticipantType: Record<string, number> }>()

    registrations.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

    registrations.forEach(reg => {
      const city = reg.city || 'Desconhecida'
      const state = reg.state || 'XX'
      const key = `${city}-${state}`
      const type = reg.participantType || 'OUTROS'

      // Overall
      byParticipantTypeOverall[type] = (byParticipantTypeOverall[type] || 0) + 1

      // State
      if (!byStateMap.has(state)) {
        byStateMap.set(state, { total: 0, byParticipantType: {} })
      }
      const stateStats = byStateMap.get(state)!
      stateStats.total++
      stateStats.byParticipantType[type] = (stateStats.byParticipantType[type] || 0) + 1

      // Region
      if (!regionsMap.has(key)) {
        regionsMap.set(key, {
          id: key,
          municipality: city,
          state: state,
          defaultLimit: 999999,
          totalRegistrations: 0,
          activeClassNumber: 1,
          activeClassLimit: 999999,
          activeClassCount: 0,
          classes: [],
          byParticipantType: {}
        })
      }

      const region = regionsMap.get(key)!
      region.totalRegistrations++
      region.byParticipantType[type] = (region.byParticipantType[type] || 0) + 1

      const classNumber = 1

      let classItem = region.classes.find(c => c.classNumber === classNumber)
      if (!classItem) {
        classItem = {
          id: `${key}-class-1`,
          classNumber,
          limit: 999999,
          currentCount: 0,
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
          registrations: 0,
          students: []
        }
        region.classes.push(classItem)
      }

      classItem.currentCount++
      classItem.registrations++
      classItem.students?.push(reg)

      region.activeClassNumber = 1
      region.activeClassCount = classItem.currentCount
    })

    return {
      regions: Array.from(regionsMap.values()).sort((a, b) => b.totalRegistrations - a.totalRegistrations),
      overall: {
        totalRegistrations: registrations.length,
        byParticipantType: byParticipantTypeOverall,
        byState: Array.from(byStateMap.entries()).map(([state, data]) => ({
          state,
          ...data
        })).sort((a, b) => b.total - a.total)
      }
    }
  }

  const fetchData = useCallback(async () => {
    if (!eventId) return
    try {
      setLoading(true)

      // Busca evento
      const eventData = await apiFetch<Event>(`/admin/events/${eventId}`, { auth: true }).catch(() =>
        apiFetch<any>('/events', { auth: true }).then((data) =>
          Array.isArray(data)
            ? data.find((e: Event) => e.id === eventId)
            : data.events?.find((e: Event) => e.id === eventId)
        )
      )
      if (eventData) setEvent(eventData)

      // Tenta regions. Se falhar, busca registrations e calcula.
      try {
        // Primeiro tentamos pegar todos os registros, pois precisamos deles para a lista de alunos de qualquer forma
        const registrationsData = await apiFetch<{ registrations: Registration[] } | Registration[]>(`/admin/events/${eventId}/registrations`, { auth: true })
        const registrations = Array.isArray(registrationsData) ? registrationsData : registrationsData.registrations

        // Agora construÃ­mos os dados agrupados client-side
        // Isso garante que temos a lista de alunos e evita o 404 do endpoint /regions se ele nÃ£o existir
        const groupedData = groupRegistrationsByRegion(registrations)
        setRegionsData(groupedData)

      } catch (error) {
        console.error('Erro ao buscar registros para agrupamento:', error)
        // Se falhar tudo
        alert('Erro ao carregar dados de cadastro.')
      }

    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      alert('Erro ao carregar dados')
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

  const handleUpdateLimit = async (limitId: string) => {
    alert('A ediÃ§Ã£o de limites requer endpoint especÃ­fico do backend.')
    setEditingLimit(null)
  }

  const handleCloseClass = async (classId: string) => {
    alert('O encerramento de turmas requer endpoint especÃ­fico do backend.')
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

  /* ExportaÃ§Ã£o Client-Side */
  const exportToClientSide = (
    data: any[],
    filename: string,
    exportFormat: 'csv' | 'xlsx' | 'pdf',
    title: string
  ) => {
    if (exportFormat === 'csv' || exportFormat === 'xlsx') {
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Dados');
      XLSX.writeFile(workbook, `${filename}.${exportFormat}`);
    } else if (exportFormat === 'pdf') {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text(title, 10, 20);
      doc.setFontSize(10);

      let y = 30;
      data.forEach((row, index) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        const text = `${row['NÂº']}. ${row['Nome Completo']} - CPF: ${row['CPF']} - Tel: ${row['Telefone']}`;
        doc.text(text, 10, y);
        y += 7;
      });
      doc.save(`${filename}.pdf`);
    }
  };

  const prepareStudentsForExport = (students: Registration[]) => {
    return students.map((student, index) => ({
      'NÂº': index + 1,
      'Nome Completo': student.name,
      'CPF': student.cpf,
      'Email': student.email,
      'Telefone': student.phone,
      'Cidade': student.city,
      'Estado': student.state,
      'Tipo': getParticipantTypeLabel(student.participantType || ''),
      'Data InscriÃ§Ã£o': format(new Date(student.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
    }));
  };

  const handleExportRegion = async (
    municipality: string,
    state: string,
    municipalityId?: string
  ) => {
    setExportScope({ municipality, state, id: municipalityId });
    setExportModalOpen(true);
  };

  const handleExportClass = async (classId: string, exportFormat: 'csv' | 'xlsx' | 'pdf' = 'csv') => {
    if (!regionsData) return;

    let targetClass: MunicipalityClass | undefined;
    let targetRegion: MunicipalityLimit | undefined;

    for (const region of regionsData.regions) {
      const found = region.classes.find(c => c.id === classId);
      if (found) {
        targetClass = found;
        targetRegion = region;
        break;
      }
    }

    if (!targetClass || !targetRegion) {
      alert('Turma nÃ£o encontrada.');
      return;
    }

    if (!targetClass.students || targetClass.students.length === 0) {
      alert('Nenhum aluno nesta turma para exportar.');
      return;
    }

    const preparedData = prepareStudentsForExport(targetClass.students);
    const filename = `turma-${targetClass.classNumber}-${targetRegion.municipality}`;
    exportToClientSide(preparedData, filename, exportFormat, `Turma ${targetClass.classNumber} - ${targetRegion.municipality}`);
  }

  const toggleField = (fieldKey: string) => {
    if (fieldKey === 'number') return
    setSelectedFields((prev) =>
      prev.includes(fieldKey)
        ? prev.filter((f) => f !== fieldKey)
        : [...prev, fieldKey]
    )
  }

  const handleGlobalExport = async (format: 'xlsx' | 'csv' | 'pdf') => {
    if (!eventId || selectedFields.length === 0) {
      alert('Selecione pelo menos um campo para exportar')
      return
    }

    try {
      const fieldsParam = selectedFields.filter((f) => f !== 'number').join(',')
      const apiUrl = getApiUrl()
      let url = `${apiUrl}/admin/events/${eventId}/export?format=${format}&fields=${fieldsParam}`

      if (exportScope) {
        // Se o ID parece um ObjectId do MongoDB (24 caracteres hex), usa municipalityId
        // Caso contrÃ¡rio (como city-state), usa city e state
        const isObjectId = /^[0-9a-fA-F]{24}$/.test(exportScope.id || '');

        if (exportScope.id && isObjectId) {
          url += `&municipalityId=${exportScope.id}`
        } else {
          url += `&city=${encodeURIComponent(exportScope.municipality)}&state=${encodeURIComponent(exportScope.state)}`
        }
      }

      const token = localStorage.getItem('token')

      const response = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })

      if (response.ok) {
        const blob = await response.blob()
        const downloadUrl = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = downloadUrl
        a.download = `cadastros-evento-${format === 'pdf' ? 'pdf' : format}.${format}`
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

  const getFilteredRegions = () => {
    if (!searchTerm) return regionsData.regions;

    const term = searchTerm.toLowerCase();

    return regionsData.regions.map(region => {
      // Filtrar alunos dentro das turmas
      const filteredClasses = region.classes.map(cls => {
        const filteredStudents = cls.students?.filter(s =>
          s.name.toLowerCase().includes(term) ||
          s.cpf.toLowerCase().includes(term) ||
          s.phone.toLowerCase().includes(term) ||
          s.city.toLowerCase().includes(term)
        ) || [];

        return { ...cls, students: filteredStudents, currentCount: filteredStudents.length };
      }).filter(cls => cls.students.length > 0 || region.municipality.toLowerCase().includes(term));

      if (filteredClasses.length > 0 || region.municipality.toLowerCase().includes(term)) {
        return {
          ...region,
          classes: filteredClasses,
          totalRegistrations: filteredClasses.reduce((sum, c) => sum + c.students.length, 0)
        };
      }
      return null;
    }).filter(region => region !== null) as MunicipalityLimit[];
  }

  const filteredRegions = getFilteredRegions();

  return (
    <div className={eventIdProp ? "" : "min-h-screen bg-gray-50 flex flex-col"}>
      {/* ... resto do cÃ³digo ... */}
      {/* Vou injetar o botÃ£o no outro bloco replace abaixo, aqui sÃ³ a funÃ§Ã£o */}

      {!eventIdProp && <MobileNavbar />}

      <main className="flex-1">
        <div className={eventIdProp ? "py-2" : "container mx-auto px-4 py-8"}>
          {!eventIdProp && (
            <Link
              to="/admin/events"
              className="text-[var(--primary)] hover:text-[var(--primary-hover)] font-black text-[10px] uppercase tracking-widest mb-6 inline-flex items-center gap-2 group transition-all"
            >
              <span className="group-hover:-translate-x-1 transition-transform">â†</span> Voltar para Eventos
            </Link>
          )}

          {/* Header Section */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-violet-600 rounded-[1.5rem] flex items-center justify-center text-white shadow-lg shadow-violet-200">
                <Layers size={28} />
              </div>
              <div>
                <h1 className="text-2xl font-black text-[var(--secondary)] tracking-tight">
                  Gerenciamento de Turmas
                </h1>
                {event && (
                  <p className="text-[var(--text-muted)] font-bold text-xs uppercase tracking-widest mt-1">
                    {event.title}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 w-full lg:w-auto">
              <button
                onClick={() => {
                  setExportScope(null);
                  setExportModalOpen(true);
                }}
                className="bg-white text-emerald-600 border border-emerald-100 px-5 py-2.5 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-emerald-50 transition-all flex items-center gap-2 shadow-sm hover:shadow-md"
              >
                <Download size={14} />
                Exportar Tudo
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

          <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-center gap-3 mb-8">
            <div className="p-2 bg-white rounded-xl text-amber-500 shadow-sm">
              <AlertTriangle size={18} />
            </div>
            <p className="text-[11px] text-amber-800 font-bold uppercase tracking-wide">
              Modo de visualizaÃ§Ã£o client-side: Os alunos foram agrupados por cidade para otimizaÃ§Ã£o.
            </p>
          </div>

          {/* Stats Summary Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total Geral', value: regionsData.overall.totalRegistrations, icon: <Users size={16} />, color: 'bg-indigo-50 text-indigo-600' },
              { label: 'MunicÃ­pios', value: regionsData.regions.length, icon: <MapPin size={16} />, color: 'bg-emerald-50 text-emerald-600' },
              { label: 'Turmas Ativas', value: regionsData.regions.reduce((acc, r) => acc + r.classes.filter(c => c.status === 'ACTIVE').length, 0), icon: <Layers size={16} />, color: 'bg-blue-50 text-blue-600' },
              { label: 'Participantes', value: Object.values(regionsData.overall.byParticipantType).reduce((a, b) => a + b, 0), icon: <UserCheck size={16} />, color: 'bg-violet-50 text-violet-600' },
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

          {/* Search Bar */}
          <div className="mb-8 relative max-w-xl">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Pesquisar cidade, nome, CPF ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              name="search_event_classes_query"
              readOnly
              onFocus={(e) => e.currentTarget.removeAttribute('readonly')}
              className="w-full bg-white border border-[var(--border-light)] rounded-[1.25rem] py-3.5 pl-12 pr-6 text-xs font-bold focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 transition-all shadow-sm"
            />
          </div>

          {filteredRegions.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <p className="text-gray-500 text-lg">
                Nenhum municÃ­pio ou cadastro encontrado para sua busca.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredRegions.map((region) => (
                <div
                  key={region.id}
                  className="bg-white rounded-[2rem] border border-[var(--border-light)] shadow-sm overflow-hidden mb-6"
                >
                  <div className="bg-slate-50 border-b border-[var(--border-light)] px-8 py-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 shadow-sm border border-[var(--border-light)]">
                          <MapPin size={24} />
                        </div>
                        <div>
                          <h2 className="text-lg font-black text-[var(--secondary)] tracking-tight">
                            {region.municipality} â€” {region.state}
                          </h2>
                          <div className="flex flex-wrap gap-2 mt-1.5">
                            <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
                              {region.totalRegistrations} Cadastros
                            </span>
                            {Object.entries(region.byParticipantType).map(([type, count]) => (
                              <span key={type} className="text-[9px] font-black uppercase tracking-widest text-slate-500 bg-white border border-slate-100 px-2 py-1 rounded-lg">
                                {getParticipantTypeLabel(type)}: {count}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleExportRegion(region.municipality, region.state, region.id)}
                        className="bg-white text-[var(--secondary)] border border-[var(--border-light)] px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all flex items-center gap-2 shadow-sm"
                      >
                        <Download size={14} />
                        Exportar MunicÃ­pio
                      </button>
                    </div>
                  </div>

                  <div className="p-8">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-sm font-black text-[var(--secondary)] uppercase tracking-widest flex items-center gap-2">
                        <Layers size={16} className="text-violet-500" /> Turmas Criadas ({region.classes.length})
                      </h3>
                    </div>
                    {region.classes.length === 0 ? (
                      <div className="py-10 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          Nenhuma turma criada ainda.
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Turma
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
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {region.classes.map((classItem) => (
                              <React.Fragment key={classItem.id}>
                                <tr
                                  className={`group transition-all ${classItem.status === 'ACTIVE'
                                    ? 'bg-emerald-50/20'
                                    : ''
                                    }`}
                                >
                                  <td className="px-6 py-4">
                                    <button
                                      onClick={() => setExpandedClass(expandedClass === classItem.id ? null : classItem.id)}
                                      className="flex items-center gap-3 text-xs font-black text-[var(--secondary)] hover:text-indigo-600 transition-colors"
                                    >
                                      <div className={`p-1.5 rounded-lg transition-transform ${expandedClass === classItem.id ? 'rotate-180 bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                                        <ChevronDown size={14} />
                                      </div>
                                      Turma {classItem.classNumber}
                                    </button>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-black text-[var(--secondary)]">
                                        {classItem.currentCount}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <span
                                      className={`inline-flex items-center px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${classItem.status === 'ACTIVE'
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : 'bg-slate-100 text-slate-700'
                                        }`}
                                    >
                                      {classItem.status === 'ACTIVE'
                                        ? 'Aberta'
                                        : 'Fechada'}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                                      <Calendar size={12} className="text-slate-400" />
                                      {format(new Date(classItem.createdAt), 'dd MMM yyyy', { locale: ptBR })}
                                    </div>
                                  </td>
                                </tr>
                                {expandedClass === classItem.id && (
                                  <tr>
                                    <td colSpan={4} className="px-8 py-6 bg-slate-50 border-y border-[var(--border-light)] shadow-inner">
                                      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
                                        <div className="flex items-center gap-3">
                                          <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-md">
                                            <Users size={20} />
                                          </div>
                                          <div>
                                            <h4 className="text-xs font-black text-[var(--secondary)] uppercase tracking-tight">Lista de Inscritos</h4>
                                            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{classItem.students?.length || 0} alunos nesta turma</p>
                                          </div>
                                        </div>

                                        <div className="flex gap-2">
                                          <button
                                            onClick={() => handleExportClass(classItem.id, 'xlsx')}
                                            className="bg-white border border-emerald-100 text-emerald-600 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-50 transition-all flex items-center gap-2 shadow-sm"
                                          >
                                            <Download size={12} /> Excel
                                          </button>
                                          <button
                                            onClick={() => handleExportClass(classItem.id, 'pdf')}
                                            className="bg-white border border-rose-100 text-rose-600 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-50 transition-all flex items-center gap-2 shadow-sm"
                                          >
                                            <FileText size={12} /> PDF
                                          </button>
                                        </div>
                                      </div>

                                      {classItem.students && classItem.students.length > 0 ? (
                                        <div className="bg-white rounded-2xl border border-[var(--border-light)] shadow-sm overflow-hidden">
                                          <table className="min-w-full">
                                            <thead className="bg-slate-50/50">
                                              <tr>
                                                <th className="px-4 py-3 text-left text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Aluno</th>
                                                <th className="px-4 py-3 text-left text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">CPF</th>
                                                <th className="px-4 py-3 text-left text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Contato</th>
                                                <th className="px-4 py-3 text-right text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">InscriÃ§Ã£o</th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                              {classItem.students.map((student) => (
                                                <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                                                  <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                      <img
                                                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(student.name)}&background=random&size=32`}
                                                        className="w-7 h-7 rounded-lg"
                                                        alt=""
                                                      />
                                                      <div className="text-[10px] font-black text-[var(--secondary)]">{student.name}</div>
                                                    </div>
                                                  </td>
                                                  <td className="px-4 py-3 text-[10px] font-bold text-slate-500">{student.cpf}</td>
                                                  <td className="px-4 py-3 text-[10px] font-bold text-slate-500">{student.phone}</td>
                                                  <td className="px-4 py-3 text-right text-[9px] font-medium text-slate-400">
                                                    {format(new Date(student.createdAt), 'dd/MM HH:mm')}
                                                  </td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      ) : (
                                        <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-slate-200">
                                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nenhum aluno identificado.</p>
                                        </div>
                                      )}
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
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

      {!eventIdProp && <Footer />}

      {exportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-semibold text-[#003366]">
                {exportScope
                  ? `Exportar: ${exportScope.municipality} - ${exportScope.state}`
                  : 'Exportar Todos os Cadastros do Evento'}
              </h2>
              <button
                onClick={() => setExportModalOpen(false)}
                className="text-gray-400 transition-colors hover:text-gray-600 p-2"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="px-6 py-6">
              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider">
                  Selecione os campos para exportar:
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-64 overflow-y-auto border border-gray-200 rounded-xl p-4 bg-gray-50">
                  {availableFields.map((field) => (
                    <label
                      key={field.key}
                      className={`flex items-center space-x-2 cursor-pointer p-2 rounded-lg transition-colors ${selectedFields.includes(field.key) ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'hover:bg-white text-gray-600 border border-transparent'}`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedFields.includes(field.key)}
                        onChange={() => toggleField(field.key)}
                        disabled={field.key === 'number'}
                        className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-sm font-medium">{field.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-end">
                <button
                  onClick={() => handleGlobalExport('xlsx')}
                  className="flex-1 sm:flex-none bg-emerald-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/10 active:scale-95"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                  Excel
                </button>
                <button
                  onClick={() => handleGlobalExport('csv')}
                  className="flex-1 sm:flex-none bg-blue-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/10 active:scale-95"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                  CSV
                </button>
                <button
                  onClick={() => handleGlobalExport('pdf')}
                  className="flex-1 sm:flex-none bg-red-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-red-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-900/10 active:scale-95"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                  PDF
                </button>
                <button
                  onClick={() => setExportModalOpen(false)}
                  className="flex-1 sm:flex-none border border-gray-300 px-6 py-2.5 rounded-lg font-bold text-gray-600 hover:bg-gray-50 transition-all active:scale-95"
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

