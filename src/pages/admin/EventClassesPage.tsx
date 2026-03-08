import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import MobileNavbar from '@/components/ui/MobileNavbar'
import Footer from '@/components/ui/Footer'
import LoadingScreen from '@/components/ui/LoadingScreen'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/lib/useAuth'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import { X } from 'lucide-react'

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
  const [activeRightTab, setActiveRightTab] = useState('info'); // info, quick, notes
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState('')
  const [editingLimit, setEditingLimit] = useState<string | null>(null)
  const [expandedClass, setExpandedClass] = useState<string | null>(null)
  const [newLimit, setNewLimit] = useState<number>(20)
  const [updating, setUpdating] = useState(false)
  const [closingClass, setClosingClass] = useState<string | null>(null)
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [exportScope, setExportScope] = useState<{ municipality: string, state: string } | null>(null)
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
    { key: 'waterArea', label: "Lâmina d'água (ha)" },
    { key: 'classNumber', label: 'Turma' },
    { key: 'status', label: 'Status' },
    { key: 'createdAt', label: 'Data de Cadastro' },
  ]

  // Função para agrupar dados localmente (fallback quando backend falha)
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
          defaultLimit: 9999,
          totalRegistrations: 0,
          activeClassNumber: 1,
          activeClassLimit: 30,
          activeClassCount: 0,
          classes: [],
          byParticipantType: {}
        })
      }

      const region = regionsMap.get(key)!
      region.totalRegistrations++
      region.byParticipantType[type] = (region.byParticipantType[type] || 0) + 1

      // Determinar turma
      // Se vier do backend com turma, usa. Senão, calcula.
      const backendClassNumber = reg.municipalityClass?.classNumber || reg.batchNumber;

      let classNumber = backendClassNumber;
      if (!classNumber) {
        // Se não tiver turma do backend, e não houver limite definido (usamos 0 no backend ou 30 aqui), 
        // talvez devêssemos manter tudo em uma turma.
        // O usuário reclamou de separar por 30. Vamos aumentar esse default consideravelmente.
        const effectiveLimit = region.defaultLimit || 99999;
        const classIndex = Math.floor((region.totalRegistrations - 1) / effectiveLimit)
        classNumber = classIndex + 1
      }

      let classItem = region.classes.find(c => c.classNumber === classNumber)
      if (!classItem) {
        classItem = {
          id: `${key}-class-${classNumber}`,
          classNumber,
          limit: region.defaultLimit,
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

      // Atualiza active class
      if (classNumber > (region.activeClassNumber || 0)) {
        region.activeClassNumber = classNumber
        region.activeClassCount = classItem.currentCount
      } else if (classNumber === region.activeClassNumber) {
        region.activeClassCount = classItem.currentCount
      }
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

        // Agora construímos os dados agrupados client-side
        // Isso garante que temos a lista de alunos e evita o 404 do endpoint /regions se ele não existir
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
      if (!isAuthenticated || user?.role !== 'ADMIN') {
        navigate('/my-courses')
      } else if (eventId) {
        fetchData()
      }
    }
  }, [authLoading, isAuthenticated, user, eventId, fetchData, navigate])

  const handleUpdateLimit = async (limitId: string) => {
    alert('A edição de limites requer endpoint específico do backend.')
    setEditingLimit(null)
  }

  const handleCloseClass = async (classId: string) => {
    alert('O encerramento de turmas requer endpoint específico do backend.')
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

  /* Exportação Client-Side */
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
        const text = `${row['Nº']}. ${row['Nome Completo']} - CPF: ${row['CPF']} - Tel: ${row['Telefone']}`;
        doc.text(text, 10, y);
        y += 7;
      });
      doc.save(`${filename}.pdf`);
    }
  };

  const prepareStudentsForExport = (students: Registration[]) => {
    return students.map((student, index) => ({
      'Nº': index + 1,
      'Nome Completo': student.name,
      'CPF': student.cpf,
      'Email': student.email,
      'Telefone': student.phone,
      'Cidade': student.city,
      'Estado': student.state,
      'Tipo': getParticipantTypeLabel(student.participantType || ''),
      'Data Inscrição': format(new Date(student.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
    }));
  };

  const handleExportRegion = async (
    municipality: string,
    state: string,
  ) => {
    setExportScope({ municipality, state });
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
      alert('Turma não encontrada.');
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
      let url = `${import.meta.env.VITE_API_URL || 'http://localhost:3005'}/admin/events/${eventId}/export?format=${format}&fields=${fieldsParam}`

      if (exportScope) {
        url += `&municipality=${encodeURIComponent(exportScope.municipality)}&state=${encodeURIComponent(exportScope.state)}`
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ... resto do código ... */}
      {/* Vou injetar o botão no outro bloco replace abaixo, aqui só a função */}

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
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div>
                <h1 className="text-3xl font-bold text-[#003366] mb-2">
                  Gerenciamento de Turmas
                </h1>
                {event && (
                  <p className="text-gray-600 text-lg">{event.title}</p>
                )}
              </div>

              <button
                onClick={() => {
                  setExportScope(null);
                  setExportModalOpen(true);
                }}
                className="bg-green-600 text-white px-6 py-3 rounded-md font-semibold hover:bg-green-700 transition-colors flex items-center gap-2 shadow-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Exportar Dados
              </button>
            </div>

            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    Modo de visualização client-side: Os alunos foram agrupados por cidade em seu navegador.
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

            <div className="mt-6">
              <div className="relative max-w-xl">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Buscar por nome, CPF, cidade ou telefone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900 shadow-sm"
                />
              </div>
            </div>
          </div>

          {filteredRegions.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <p className="text-gray-500 text-lg">
                Nenhum município ou cadastro encontrado para sua busca.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredRegions.map((region) => (
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
                          {region.defaultLimit < 9999 && (
                            <span>
                              Limite padrão: <strong>{region.defaultLimit}</strong>{' '}
                              vagas
                            </span>
                          )}
                          {region.activeClassNumber && region.defaultLimit < 9999 && (
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

                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleExportRegion(region.municipality, region.state)}
                            className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 border border-white/10 active:scale-95 shadow-lg"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                            EXPORTAR CIDADE
                          </button>
                        </div>
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
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {region.classes.map((classItem) => (
                              <>
                                <tr
                                  key={classItem.id}
                                  className={
                                    classItem.status === 'ACTIVE'
                                      ? 'bg-green-50'
                                      : ''
                                  }
                                >
                                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => setExpandedClass(expandedClass === classItem.id ? null : classItem.id)}
                                        className="text-gray-500 hover:text-[#003366] transition-colors focus:outline-none"
                                        title="Ver lista de alunos"
                                      >
                                        <svg
                                          className={`w-4 h-4 transform transition-transform duration-200 ${expandedClass === classItem.id ? 'rotate-90' : ''}`}
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                      </button>
                                      Turma {classItem.classNumber}
                                    </div>
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
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                    {format(
                                      new Date(classItem.createdAt),
                                      'dd/MM/yyyy HH:mm',
                                      { locale: ptBR }
                                    )}
                                  </td>
                                </tr>
                                {expandedClass === classItem.id && (
                                  <tr>
                                    <td colSpan={5} className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                                      <div className="text-sm pl-6">
                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-2">
                                          <p className="font-semibold text-[#003366] flex items-center gap-2">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                            </svg>
                                            Lista de Alunos ({classItem.students?.length || 0})
                                          </p>

                                          <div className="flex gap-2">
                                            <button
                                              onClick={() => handleExportClass(classItem.id, 'csv')}
                                              className="inline-flex items-center px-3 py-1.5 bg-blue-100 text-blue-700 text-xs font-medium rounded hover:bg-blue-200 transition-colors"
                                              title="Baixar CSV"
                                            >
                                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                                              CSV
                                            </button>
                                            <button
                                              onClick={() => handleExportClass(classItem.id, 'pdf')}
                                              className="inline-flex items-center px-3 py-1.5 bg-red-100 text-red-700 text-xs font-medium rounded hover:bg-red-200 transition-colors"
                                              title="Baixar PDF"
                                            >
                                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                                              PDF
                                            </button>
                                            <button
                                              onClick={() => handleExportClass(classItem.id, 'xlsx')}
                                              className="inline-flex items-center px-3 py-1.5 bg-green-100 text-green-700 text-xs font-medium rounded hover:bg-green-200 transition-colors"
                                              title="Baixar Excel"
                                            >
                                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                              Excel
                                            </button>
                                          </div>
                                        </div>

                                        {classItem.students && classItem.students.length > 0 ? (
                                          <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md bg-white shadow-sm">
                                            <table className="min-w-full divide-y divide-gray-200">
                                              <thead className="bg-gray-50 sticky top-0">
                                                <tr>
                                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">CPF</th>
                                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Telefone</th>
                                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Data Inscrição</th>
                                                </tr>
                                              </thead>
                                              <tbody className="divide-y divide-gray-100">
                                                {classItem.students.map((student) => (
                                                  <tr key={student.id} className="hover:bg-gray-50">
                                                    <td className="px-4 py-2 text-gray-900 border-b border-gray-50">{student.name}</td>
                                                    <td className="px-4 py-2 text-gray-500 border-b border-gray-50">{student.cpf}</td>
                                                    <td className="px-4 py-2 text-gray-500 border-b border-gray-50">{student.phone}</td>
                                                    <td className="px-4 py-2 text-gray-500 border-b border-gray-50">
                                                      {format(new Date(student.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                                                    </td>
                                                  </tr>
                                                ))}
                                              </tbody>
                                            </table>
                                          </div>
                                        ) : (
                                          <div className="p-4 text-gray-500 italic bg-white rounded border border-gray-200 text-center">
                                            Nenhum aluno identificado nesta turma.
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </>
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

      {exportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200">
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
