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
  const [editingLimit, setEditingLimit] = useState<string | null>(null)
  const [expandedClass, setExpandedClass] = useState<string | null>(null)
  const [newLimit, setNewLimit] = useState<number>(20)
  const [updating, setUpdating] = useState(false)
  const [closingClass, setClosingClass] = useState<string | null>(null)

  /* Estados para Exportação */
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [exportTarget, setExportTarget] = useState<{ type: 'region' | 'class', id: string, name: string } | null>(null)
  const [selectedFields, setSelectedFields] = useState<string[]>([
    'number',
    'name',
    'cpf',
    'email',
    'phone',
    'city',
    'state',
    'participantType',
    'createdAt',
  ])

  const availableFields = [
    { key: 'number', label: 'Nº' },
    { key: 'name', label: 'Nome Completo' },
    { key: 'cpf', label: 'CPF' },
    { key: 'email', label: 'E-mail' },
    { key: 'phone', label: 'Telefone' },
    { key: 'cep', label: 'CEP' },
    { key: 'city', label: 'Cidade' },
    { key: 'state', label: 'Estado' },
    { key: 'participantType', label: 'Tipo de Participante' },
    { key: 'createdAt', label: 'Data de Inscrição' },
  ]

  const toggleField = (fieldKey: string) => {
    if (fieldKey === 'number') return
    setSelectedFields((prev) =>
      prev.includes(fieldKey)
        ? prev.filter((f) => f !== fieldKey)
        : [...prev, fieldKey]
    )
  }

  const openExportModal = (type: 'region' | 'class', id: string, name: string) => {
    setExportTarget({ type, id, name });
    setExportModalOpen(true);
  }

  const confirmExport = (format: 'xlsx' | 'csv' | 'pdf') => {
    if (!exportTarget) return;

    const { type, id } = exportTarget;

    if (type === 'region') {
      // Precisamos encontrar a região pelo ID
      if (!regionsData) return;
      const region = regionsData.regions.find(r => r.id === id);
      if (region) {
        handleExportRegion(region.municipality, region.state, format, id);
      }
    } else {
      handleExportClass(id, format);
    }
    setExportModalOpen(false);
  }

  const handleDeleteStudent = async (studentId: string) => {
    if (!confirm('ATENÇÃO: Tem certeza que deseja excluir este aluno da turma? Esta ação não pode ser desfeita.')) return

    try {
      await apiFetch(`/admin/registrations/${studentId}`, { method: 'DELETE', auth: true })
      await fetchData()
      alert('Aluno removido com sucesso!')
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'Erro ao excluir aluno')
    }
  }



  /* Função fetchData original removida para usar endpoint real */

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

      // Busca dados de regiões/turmas do backend
      try {
        const data = await apiFetch<RegionsData>(`/admin/events/${eventId}/regions`, { auth: true })
        setRegionsData(data)
      } catch (error) {
        console.error('Erro ao buscar dados das regiões:', error)
        // Se falhar, tenta buscar apenas os registros para não ficar vazio, mas sem o agrupamento fake
        try {
          // Fallback opcional: poderia mostrar erro ou tentar outra coisa
          // Por enquanto, mostra erro como solicitado para tirar o mock
          console.log('Endpoint de regiões falhou')
        } catch (e) {
          console.error(e)
        }
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
        // Geração dinâmica de texto para PDF baseada nos valores da linha
        const text = Object.values(row).join(' - ');
        doc.text(text.substring(0, 100), 10, y); // Limita largura
        y += 7;
      });
      doc.save(`${filename}.pdf`);
    }
  };

  const prepareStudentsForExport = (students: Registration[]) => {
    return students.map((student, index) => {
      const row: any = {};

      if (selectedFields.includes('number')) row['Nº'] = index + 1;
      if (selectedFields.includes('name')) row['Nome Completo'] = student.name;
      if (selectedFields.includes('cpf')) row['CPF'] = student.cpf;
      if (selectedFields.includes('email')) row['Email'] = student.email;
      if (selectedFields.includes('phone')) row['Telefone'] = student.phone;
      if (selectedFields.includes('cep')) row['CEP'] = student.cpf; // TODO: Mapear corretamente se tiver CEP
      if (selectedFields.includes('city')) row['Cidade'] = student.city;
      if (selectedFields.includes('state')) row['Estado'] = student.state;
      if (selectedFields.includes('participantType')) row['Tipo'] = getParticipantTypeLabel(student.participantType || '');
      if (selectedFields.includes('createdAt')) row['Data Inscrição'] = format(new Date(student.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR });

      return row;
    });
  };

  /* Função de Exportação de Turma */
  const handleExportRegion = async (
    municipality: string,
    state: string,
    exportFormat: 'csv' | 'xlsx' | 'pdf' = 'csv',
    municipalityId?: string
  ) => {
    if (!regionsData) return;

    const region = regionsData.regions.find(r =>
      (municipalityId && r.id === municipalityId) ||
      (r.municipality === municipality && r.state === state)
    );

    if (!region) {
      alert('Região não encontrada para exportação.');
      return;
    }

    // Coletar todos os alunos de todas as turmas da região
    const allStudents = region.classes.flatMap(c => c.students || []);

    if (allStudents.length === 0) {
      alert('Nenhum aluno nesta região para exportar.');
      return;
    }

    const preparedData = prepareStudentsForExport(allStudents);
    const filename = `cidade-${municipality}-${state}`;
    exportToClientSide(preparedData, filename, exportFormat, `Relatório - ${municipality}/${state}`);
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

                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openExportModal('region', region.id, `${region.municipality}/${region.state}`)}
                            className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5"
                            title="Exportar Município (Selecionar campos)"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                            Exportar
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
                                              onClick={() => openExportModal('class', classItem.id, `Turma ${classItem.classNumber} - ${region.municipality}`)}
                                              className="inline-flex items-center px-3 py-1.5 bg-blue-100 text-blue-700 text-xs font-medium rounded hover:bg-blue-200 transition-colors"
                                              title="Exportar (Selecionar campos)"
                                            >
                                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                                              Exportar
                                            </button>
                                          </div>
                                        </div>

                                        {classItem.students && classItem.students.length > 0 ? (
                                          <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md bg-white shadow-sm">
                                            <table className="min-w-full divide-y divide-gray-200">
                                              <thead className="bg-gray-50 sticky top-0">
                                                <tr>
                                                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#003366] uppercase tracking-wider bg-gray-50/50 rounded-tl-xl text-center">Nº</th>
                                                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#003366] uppercase tracking-wider bg-gray-50/50">Nome / CPF</th>
                                                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#003366] uppercase tracking-wider bg-gray-50/50">Contato</th>
                                                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#003366] uppercase tracking-wider bg-gray-50/50">Data</th>
                                                  <th className="px-4 py-3 text-right text-xs font-semibold text-[#003366] uppercase tracking-wider bg-gray-50/50 rounded-tr-xl">Ações</th>
                                                </tr>
                                              </thead>
                                              <tbody className="divide-y divide-gray-100">
                                                {classItem.students.map((student, index) => (
                                                  <tr key={student.id} className="hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0">
                                                    <td className="px-4 py-3 text-center text-xs font-medium text-gray-400">
                                                      {index + 1}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                      <div className="flex flex-col">
                                                        <span className="text-sm font-medium text-gray-900">{student.name}</span>
                                                        <span className="text-xs text-gray-500 font-mono">{student.cpf}</span>
                                                      </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                      <div className="flex flex-col">
                                                        <span className="text-sm text-gray-600">{student.phone}</span>
                                                        <span className="text-xs text-gray-400">{student.email}</span>
                                                      </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-500">
                                                      {format(new Date(student.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
                                                      <span className="text-xs text-gray-400 block">{format(new Date(student.createdAt), 'HH:mm', { locale: ptBR })}</span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                      <button
                                                        onClick={() => handleDeleteStudent(student.id)}
                                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                        title="Excluir Aluno"
                                                      >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                      </button>
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

      {/* Modal de Exportação */}
      {exportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-semibold text-[#003366]">
                Exportar Dados da Turma/Região
              </h2>
              <button
                onClick={() => setExportModalOpen(false)}
                className="text-gray-400 transition-colors hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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
                    <label key={field.key} className="flex items-center space-x-2 cursor-pointer">
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
                  onClick={() => confirmExport('xlsx')}
                  className="flex-1 sm:flex-none bg-green-600 text-white px-6 py-2 rounded-md font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                  Excel (XLSX)
                </button>
                <button
                  onClick={() => confirmExport('csv')}
                  className="flex-1 sm:flex-none bg-blue-600 text-white px-6 py-2 rounded-md font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                  CSV
                </button>
                <button
                  onClick={() => confirmExport('pdf')}
                  className="flex-1 sm:flex-none bg-red-600 text-white px-6 py-2 rounded-md font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                  PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
