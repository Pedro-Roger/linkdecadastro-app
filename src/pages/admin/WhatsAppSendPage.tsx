import { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import MobileNavbar from '@/components/ui/MobileNavbar'
import Footer from '@/components/ui/Footer'
import LoadingScreen from '@/components/ui/LoadingScreen'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/lib/useAuth'

interface Participant {
  id_contato: string
  nome: string
  email: string
  telefone: string
  cidade: string
  estado: string
  participante_tipo: string
  produtor: boolean
  professor: boolean
  estudante: boolean
}

interface Course {
  id: string
  title: string
  slug?: string | null
}

interface Event {
  id: string
  title: string
  slug?: string | null
}

const BRAZIL_STATES = [
  { sigla: 'AC', nome: 'Acre' },
  { sigla: 'AL', nome: 'Alagoas' },
  { sigla: 'AP', nome: 'Amapá' },
  { sigla: 'AM', nome: 'Amazonas' },
  { sigla: 'BA', nome: 'Bahia' },
  { sigla: 'CE', nome: 'Ceará' },
  { sigla: 'DF', nome: 'Distrito Federal' },
  { sigla: 'ES', nome: 'Espírito Santo' },
  { sigla: 'GO', nome: 'Goiás' },
  { sigla: 'MA', nome: 'Maranhão' },
  { sigla: 'MT', nome: 'Mato Grosso' },
  { sigla: 'MS', nome: 'Mato Grosso do Sul' },
  { sigla: 'MG', nome: 'Minas Gerais' },
  { sigla: 'PA', nome: 'Pará' },
  { sigla: 'PB', nome: 'Paraíba' },
  { sigla: 'PR', nome: 'Paraná' },
  { sigla: 'PE', nome: 'Pernambuco' },
  { sigla: 'PI', nome: 'Piauí' },
  { sigla: 'RJ', nome: 'Rio de Janeiro' },
  { sigla: 'RN', nome: 'Rio Grande do Norte' },
  { sigla: 'RS', nome: 'Rio Grande do Sul' },
  { sigla: 'RO', nome: 'Rondônia' },
  { sigla: 'RR', nome: 'Roraima' },
  { sigla: 'SC', nome: 'Santa Catarina' },
  { sigla: 'SP', nome: 'São Paulo' },
  { sigla: 'SE', nome: 'Sergipe' },
  { sigla: 'TO', nome: 'Tocantins' }
]

export default function WhatsAppSendPage() {
  const navigate = useNavigate()
  const { user, loading: authLoading, isAuthenticated, signOut } = useAuth({
    requireAuth: true,
    redirectTo: '/login',
  })
  const [participants, setParticipants] = useState<Participant[]>([])
  const [filteredParticipants, setFilteredParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [whatsappStatus, setWhatsappStatus] = useState<any>(null)
  const [message, setMessage] = useState('')
  const [selectedCity, setSelectedCity] = useState<string>('')
  const [selectedParticipantType, setSelectedParticipantType] = useState<string>('')
  const [selectedState, setSelectedState] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [selectedType, setSelectedType] = useState<'course' | 'event' | ''>('')
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)

  // Lista de cidades únicas
  const cities = useMemo(() => {
    const citySet = new Set<string>()
    participants.forEach((p) => {
      if (p.cidade) citySet.add(p.cidade)
    })
    return Array.from(citySet).sort()
  }, [participants])

  // Lista de estados únicos
  const states = useMemo(() => {
    const stateSet = new Set<string>()
    participants.forEach((p) => {
      if (p.estado) stateSet.add(p.estado)
    })
    return Array.from(stateSet).sort()
  }, [participants])

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated || user?.role !== 'ADMIN') {
        navigate('/my-courses')
      } else {
        fetchCourses()
        fetchEvents()
        fetchParticipants()
        checkWhatsAppStatus()
      }
    }
  }, [authLoading, isAuthenticated, user, navigate])

  // Gerar mensagem automaticamente quando curso ou evento for selecionado
  useEffect(() => {
    if (selectedCourse || selectedEvent) {
      generateMessage()
    } else {
      setMessage('')
    }
  }, [selectedCourse, selectedEvent])

  useEffect(() => {
    // Aplicar filtros
    let filtered = participants

    if (selectedCity) {
      filtered = filtered.filter((p) =>
        p.cidade?.toLowerCase().includes(selectedCity.toLowerCase())
      )
    }

    if (selectedState) {
      filtered = filtered.filter((p) =>
        p.estado?.toLowerCase().includes(selectedState.toLowerCase())
      )
    }

    if (selectedParticipantType) {
      if (selectedParticipantType === 'PRODUTOR') {
        filtered = filtered.filter((p) => p.produtor)
      } else if (selectedParticipantType === 'PROFESSOR') {
        filtered = filtered.filter((p) => p.professor)
      } else if (selectedParticipantType === 'ESTUDANTE') {
        filtered = filtered.filter((p) => p.estudante)
      }
    }

    setFilteredParticipants(filtered)
  }, [participants, selectedCity, selectedState, selectedParticipantType])

  async function fetchCourses() {
    try {
      const data = await apiFetch<Course[]>('/admin/courses', { auth: true })
      setCourses(data || [])
    } catch (error) {
      // Ignorar erro silenciosamente
    }
  }

  async function fetchEvents() {
    try {
      const data = await apiFetch<Event[]>('/events', { auth: true })
      setEvents(data || [])
    } catch (error) {
      // Ignorar erro silenciosamente
    }
  }

  async function fetchParticipants() {
    try {
      setLoading(true)
      const queryParams = new URLSearchParams()
      if (selectedCity) queryParams.append('city', selectedCity)
      if (selectedParticipantType) queryParams.append('participantType', selectedParticipantType)

      const data = await apiFetch<any>(
        `/admin/courses/enrollments/whatsapp?${queryParams.toString()}`,
        { auth: true }
      )
      setParticipants(data.participantes || [])
    } catch (error) {
      setError('Erro ao carregar participantes')
    } finally {
      setLoading(false)
    }
  }

  function generateMessage() {
    if (!selectedCourse && !selectedEvent) {
      setMessage('')
      return
    }

    // Gerar link baseado no tipo selecionado
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    let link = ''
    let title = ''
    const tipo = selectedCourse ? 'curso' : 'evento'

    if (selectedCourse) {
      title = selectedCourse.title
      if (selectedCourse.slug) {
        link = `${origin}/c/${selectedCourse.slug}`
      } else {
        link = `${origin}/course/${selectedCourse.id}`
      }
    } else if (selectedEvent) {
      title = selectedEvent.title
      if (selectedEvent.slug) {
        link = `${origin}/e/${selectedEvent.slug}`
      } else {
        link = `${origin}/register/${selectedEvent.id}`
      }
    }

    // Mensagem template com placeholder {nome} que será substituído no backend
    const messageTemplate = `Olá, {nome}!

Participe já do nosso ${tipo}: *${title}*

Acreditamos que você vai se interessar! Não perca essa chance de participar.

Acesse o link abaixo para se inscrever:
${link}

Esperamos você! 😊`

    setMessage(messageTemplate)
  }

  function handleTypeChange(type: 'course' | 'event' | '') {
    setSelectedType(type)
    setSelectedCourse(null)
    setSelectedEvent(null)
    setMessage('')
  }

  function handleCourseSelect(courseId: string) {
    const course = courses.find(c => c.id === courseId)
    setSelectedCourse(course || null)
    setSelectedEvent(null)
  }

  function handleEventSelect(eventId: string) {
    const event = events.find(e => e.id === eventId)
    setSelectedEvent(event || null)
    setSelectedCourse(null)
  }

  async function checkWhatsAppStatus() {
    try {
      const status = await apiFetch<any>('/api/whatsapp/status', { auth: true })
      setWhatsappStatus(status)
    } catch (error) {
      console.error('Erro ao verificar status do WhatsApp')
    }
  }

  async function handleSendMessage() {
    if (!message.trim()) {
      setError('Por favor, selecione um curso ou evento para compartilhar')
      return
    }

    if (!selectedCourse && !selectedEvent) {
      setError('Por favor, selecione um curso ou evento para compartilhar')
      return
    }

    if (filteredParticipants.length === 0) {
      setError('Nenhum participante selecionado após aplicar os filtros')
      return
    }

    if (!whatsappStatus || whatsappStatus.status !== 'READY') {
      setError('WhatsApp não está conectado. Verifique o status da conexão.')
      return
    }

    setSending(true)
    setError(null)
    setSuccess(null)

    try {
      // Gerar link
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      let link = ''
      let title = ''

      if (selectedCourse) {
        title = selectedCourse.title
        if (selectedCourse.slug) {
          link = `${origin}/c/${selectedCourse.slug}`
        } else {
          link = `${origin}/course/${selectedCourse.id}`
        }
      } else if (selectedEvent) {
        title = selectedEvent.title
        if (selectedEvent.slug) {
          link = `${origin}/e/${selectedEvent.slug}`
        } else {
          link = `${origin}/register/${selectedEvent.id}`
        }
      }

      // Preparar filtros para a API
      const filtros: any = {}
      if (selectedCity) filtros.cidade = selectedCity
      if (selectedState) filtros.estado = selectedState
      if (selectedParticipantType === 'PRODUTOR') filtros.produtor = true
      else if (selectedParticipantType === 'PROFESSOR') filtros.professor = true
      else if (selectedParticipantType === 'ESTUDANTE') filtros.estudante = true

      // Preparar participantes com nome para personalização
      const participantesComNome = filteredParticipants.map((p) => ({
        id_contato: p.id_contato,
        nome: p.nome,
        cidade: p.cidade,
        estado: p.estado,
        produtor: p.produtor,
        professor: p.professor,
        estudante: p.estudante,
      }))

      // O backend irá personalizar a mensagem substituindo {nome} pelo nome de cada participante
      const result = await apiFetch<any>('/api/whatsapp/enviar-mensagem-segmentada', {
        method: 'POST',
        auth: true,
        body: JSON.stringify({
          mensagem: message, // Mensagem com {nome} que será substituído no backend
          participantes: participantesComNome,
          filtros: {}, // Sem filtros, pois já filtramos antes no frontend
        }),
      })

      setSuccess(
        `Mensagem enviada com sucesso! ${result.enviadas || 0} mensagens enviadas, ${result.falhas || 0} falhas.`
      )
    } catch (error: any) {
      setError(error?.message || 'Erro ao enviar mensagem')
    } finally {
      setSending(false)
    }
  }

  if (authLoading || loading) {
    return <LoadingScreen />
  }

  if (!isAuthenticated || user?.role !== 'ADMIN') {
    return null
  }

  const participantTypeLabels: Record<string, string> = {
    PRODUTOR: 'Produtor',
    PROFESSOR: 'Professor',
    ESTUDANTE: 'Estudante',
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <MobileNavbar user={user} onSignOut={signOut} />

      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 pb-24 md:pb-8">
          <div className="mb-6">
            <Link
              to="/admin/dashboard"
              className="text-[#FF6600] hover:underline mb-4 inline-block"
            >
              ← Voltar para Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-[#003366] mb-2">
              Enviar Mensagens WhatsApp
            </h1>
            <p className="text-gray-600">
              Selecione e filtre participantes para enviar mensagens segmentadas
            </p>
          </div>

          {/* Status do WhatsApp */}
          {whatsappStatus && (
            <div className={`mb-6 p-4 rounded-lg ${
              whatsappStatus.status === 'READY'
                ? 'bg-green-50 border border-green-200'
                : whatsappStatus.status === 'QR_CODE'
                ? 'bg-yellow-50 border border-yellow-200'
                : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">
                    Status WhatsApp: {whatsappStatus.status}
                  </p>
                  {whatsappStatus.status === 'QR_CODE' && (
                    <p className="text-sm text-gray-600 mt-1">
                      Escaneie o QR Code nos logs do servidor para conectar
                    </p>
                  )}
                  {whatsappStatus.status === 'READY' && (
                    <p className="text-sm text-green-700 mt-1">
                      ✓ Conectado e pronto para enviar mensagens
                    </p>
                  )}
                  {whatsappStatus.status !== 'READY' && whatsappStatus.status !== 'QR_CODE' && (
                    <p className="text-sm text-red-700 mt-1">
                      ✗ WhatsApp não está conectado
                    </p>
                  )}
                </div>
                <button
                  onClick={checkWhatsAppStatus}
                  className="px-4 py-2 bg-[#FF6600] text-white rounded-md hover:bg-[#e55a00] transition-colors text-sm"
                >
                  Atualizar Status
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
              {success}
            </div>
          )}

          {/* Seleção de Curso ou Evento */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-[#003366] mb-4">
              Selecionar Curso ou Evento para Compartilhar
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo
                </label>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => handleTypeChange('course')}
                    className={`px-4 py-2 rounded-md font-medium transition-colors ${
                      selectedType === 'course'
                        ? 'bg-[#FF6600] text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Curso
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTypeChange('event')}
                    className={`px-4 py-2 rounded-md font-medium transition-colors ${
                      selectedType === 'event'
                        ? 'bg-[#FF6600] text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Evento
                  </button>
                </div>
              </div>

              {selectedType === 'course' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Selecionar Curso
                  </label>
                  <select
                    value={selectedCourse?.id || ''}
                    onChange={(e) => handleCourseSelect(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900"
                  >
                    <option value="">Selecione um curso...</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {selectedType === 'event' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Selecionar Evento
                  </label>
                  <select
                    value={selectedEvent?.id || ''}
                    onChange={(e) => handleEventSelect(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900"
                  >
                    <option value="">Selecione um evento...</option>
                    {events.map((event) => (
                      <option key={event.id} value={event.id}>
                        {event.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {(selectedCourse || selectedEvent) && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-800">
                    <strong>Selecionado:</strong> {(selectedCourse || selectedEvent)?.title}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    A mensagem será gerada automaticamente com saudação personalizada e o link abaixo
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Filtros */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-[#003366] mb-4">Filtros</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estado
                </label>
                <select
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900"
                >
                  <option value="">Todos os estados</option>
                  {states.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cidade
                </label>
                <input
                  type="text"
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  placeholder="Digite o nome da cidade"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900"
                />
                {cities.length > 0 && (
                  <select
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900 mt-2"
                  >
                    <option value="">Ou selecione uma cidade</option>
                    {cities.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Participante
                </label>
                <select
                  value={selectedParticipantType}
                  onChange={(e) => setSelectedParticipantType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900"
                >
                  <option value="">Todos os tipos</option>
                  <option value="PRODUTOR">Produtor</option>
                  <option value="PROFESSOR">Professor</option>
                  <option value="ESTUDANTE">Estudante</option>
                </select>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-gray-600">
                <strong>{filteredParticipants.length}</strong> participantes encontrados após aplicar os filtros
              </p>
            </div>
          </div>

          {/* Mensagem */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-[#003366] mb-4">Mensagem Automática</h2>
            <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-md">
              <p className="text-sm text-gray-700 mb-2">
                <strong>Como funciona:</strong> A mensagem será gerada automaticamente para cada participante com:
              </p>
              <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                <li>Saudação personalizada com o nome do participante</li>
                <li>Texto convidativo sobre o curso/evento selecionado</li>
                <li>Link direto para inscrição</li>
              </ul>
            </div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={selectedCourse || selectedEvent ? "A mensagem será gerada automaticamente..." : "Selecione um curso ou evento acima para gerar a mensagem"}
              rows={8}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900"
              readOnly={!selectedCourse && !selectedEvent}
            />
            {message && (
              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  {message.length} caracteres (mensagem será personalizada para cada participante)
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  * O nome "{'{nome}'}" será substituído automaticamente pelo nome de cada participante
                </p>
              </div>
            )}
          </div>

          {/* Lista de participantes filtrados */}
          {filteredParticipants.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold text-[#003366] mb-4">
                Participantes que receberão a mensagem ({filteredParticipants.length})
              </h2>
              <div className="max-h-96 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Nome
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Telefone
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Cidade
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Tipo
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredParticipants.slice(0, 50).map((participant, index) => (
                      <tr key={participant.id_contato} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {participant.nome}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {participant.telefone}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {participant.cidade || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            participant.produtor
                              ? 'bg-green-100 text-green-800'
                              : participant.professor
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}>
                            {participantTypeLabels[participant.participante_tipo] || participant.participante_tipo}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredParticipants.length > 50 && (
                  <p className="text-sm text-gray-500 mt-4 text-center">
                    Mostrando 50 de {filteredParticipants.length} participantes
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Botão de enviar */}
          <div className="flex justify-end gap-4">
            <Link
              to="/admin/dashboard"
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </Link>
            <button
              onClick={handleSendMessage}
              disabled={sending || !selectedCourse && !selectedEvent || !message.trim() || filteredParticipants.length === 0 || whatsappStatus?.status !== 'READY'}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {sending ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Enviando...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.52 3.48A11.77 11.77 0 0 0 12.02 0 11.84 11.84 0 0 0 .15 11.85a11.6 11.6 0 0 0 1.58 5.84L0 24l6.42-1.68a11.85 11.85 0 0 0 5.6 1.42h.01A11.84 11.84 0 0 0 24 11.86a11.7 11.7 0 0 0-3.48-8.38ZM12 21.15h-.01a9.9 9.9 0 0 1-5.04-1.38l-.36-.21-3.81.99 1.02-3.7-.23-.38a9.84 9.84 0 0 1 8.43-15.1h.01a9.8 9.8 0 0 1 9.82 9.84A9.86 9.86 0 0 1 12 21.15Zm5.41-7.36c-.3-.15-1.77-.87-2.04-.97s-.47-.15-.66.15-.76.97-.93 1.17-.34.22-.63.07a8.07 8.07 0 0 1-2.37-1.46 8.84 8.84 0 0 1-1.62-2 1.77 1.77 0 0 1 .11-1.86c.18-.23.4-.48.6-.73s.25-.38.37-.62.06-.45 0-.62-.66-1.59-.91-2.18-.5-.5-.68-.51h-.58a1.12 1.12 0 0 0-.81.38 3.36 3.36 0 0 0-1.06 2.5 5.86 5.86 0 0 0 1.24 3.13 13.35 13.35 0 0 0 5.15 4.52 5.9 5.9 0 0 0 2.4.73 2 2 0 0 0 1.31-.86 1.6 1.6 0 0 0 .11-.86c-.05-.09-.27-.17-.57-.31Z" />
                  </svg>
                  Enviar para {filteredParticipants.length} participante(s)
                </>
              )}
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
