import { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import MobileNavbar from '@/components/ui/MobileNavbar'
import Footer from '@/components/ui/Footer'
import LoadingScreen from '@/components/ui/LoadingScreen'
import { apiFetch, normalizeImageUrl } from '@/lib/api'
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
  cursos?: string[]
  eventos?: string[]
}

interface Course {
  id: string
  title: string
  slug?: string | null
  bannerUrl?: string | null
}

interface Event {
  id: string
  title: string
  slug?: string | null
  coverUrl?: string | null
}

interface StateOption {
  sigla: string
  nome: string
}

export default function WhatsAppSendPage() {
  const navigate = useNavigate()
  const { user, loading: authLoading, isAuthenticated, signOut } = useAuth({
    requireAuth: true,
    redirectTo: '/login',
  })
  const [participants, setParticipants] = useState<Participant[]>([])
  const [filteredParticipants, setFilteredParticipants] = useState<Participant[]>([])
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<Set<string>>(new Set())
  const [initialLoading, setInitialLoading] = useState(true)
  const [participantsLoading, setParticipantsLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [whatsappStatus, setWhatsappStatus] = useState<any>(null)
  const [message, setMessage] = useState('')
  // NOVOS ESTADOS PARA UPLOAD
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [mediaPreview, setMediaPreview] = useState<string | null>(null)
  const [uploadedMediaUrl, setUploadedMediaUrl] = useState<string | null>(null)
  const [uploadedMediaType, setUploadedMediaType] = useState<'image' | 'video' | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [activeTab, setActiveTab] = useState<'devices' | 'bulk'>('devices')

  const handleDisconnect = async () => {
    if (!confirm('Tem certeza que deseja desconectar o dispositivo?')) return
    try {
      // Tenta endpoint de logout se existir, senão apenas reseta o estado local para forçar nova verificação
      await apiFetch('/api/whatsapp/logout', { method: 'POST', auth: true }).catch(() => { })
      setWhatsappStatus(null)
      checkWhatsAppStatus()
    } catch (err) {
      console.error(err)
    }
  }

  /* Função de Upload */
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Preview Local
    const objectUrl = URL.createObjectURL(file)
    setMediaPreview(objectUrl)
    setMediaFile(file)
    setUploadedMediaUrl(null) // Resetar URL anterior enquanto sobe a nova

    // Detectar tipo
    const type = file.type.startsWith('video/') ? 'video' : 'image'
    setUploadedMediaType(type)

    // Upload Imediato
    const formData = new FormData()
    formData.append('file', file)

    setIsUploading(true)
    try {
      const res = await apiFetch<any>('/admin/upload', {
        method: 'POST',
        body: formData,
        auth: true
      });

      // Backend retorna { url: '/uploads/...', type: 'image'|'video' }
      setUploadedMediaUrl(normalizeImageUrl(res.url))
      // Se backend retornar type use ele, senão use o que detectamos
      if (res.type) setUploadedMediaType(res.type)

    } catch (err) {
      console.error('Erro no upload:', err)
      setError('Falha ao fazer upload da mídia.')
      setMediaPreview(null)
      setMediaFile(null)
    } finally {
      setIsUploading(false)
    }
  }

  // Handle Remove Media
  const handleRemoveMedia = () => {
    setMediaFile(null)
    setMediaPreview(null)
    setUploadedMediaUrl(null)
    setUploadedMediaType(null)
  }
  const [selectedCity, setSelectedCity] = useState<string>('')
  const [selectedParticipantType, setSelectedParticipantType] = useState<string>('')
  const [selectedState, setSelectedState] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [selectedType, setSelectedType] = useState<'course' | 'event' | ''>('course')
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [stateOptions, setStateOptions] = useState<StateOption[]>([])
  const [citiesOptions, setCitiesOptions] = useState<string[]>([])
  const [loadingStates, setLoadingStates] = useState(false)
  const [loadingCities, setLoadingCities] = useState(false)

  // Pairing Code State
  const [showPairingInput, setShowPairingInput] = useState(false)
  const [pairingPhone, setPairingPhone] = useState('')
  const [pairingCode, setPairingCode] = useState<string | null>(null)
  const [pairingLoading, setPairingLoading] = useState(false)

  const qrCodeImage = useMemo(() => {
    if (!whatsappStatus) return null
    if (whatsappStatus.qrCodeBase64) return whatsappStatus.qrCodeBase64
    if (whatsappStatus.qrCode) {
      return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
        whatsappStatus.qrCode,
      )}`
    }
    return null
  }, [whatsappStatus])

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated || user?.role !== 'ADMIN') {
        navigate('/my-courses')
      } else {
        fetchCourses()
        fetchEvents()
        // Removido fetchParticipants(true) - só buscar quando houver filtro aplicado
        checkWhatsAppStatus()
        setInitialLoading(false) // Marca como carregado
      }
    }
  }, [authLoading, isAuthenticated, user, navigate])

  useEffect(() => {
    loadStates()
  }, [])

  useEffect(() => {
    if (!selectedState) {
      setCitiesOptions([])
      setSelectedCity('')
      return
    }
    setSelectedCity('')
    loadCities(selectedState)
  }, [selectedState])

  // Hook específico para integração com automação (Puppeteer/Backend)
  // O backend pode injetar o código de pareamento através desta função global
  useEffect(() => {
    const w = window as any
    w.onCodeReceivedEvent = (event: any) => {
      console.log('Event received from automation:', event)
      if (event && event.code) {
        setPairingCode(event.code)
        setPairingLoading(false)
        setShowPairingInput(true) // Garante que a UI de pareamento esteja visível
      }
    }

    return () => {
      if (w.onCodeReceivedEvent) {
        delete w.onCodeReceivedEvent
      }
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated || authLoading) return
    if (initialLoading && !selectedState && !selectedCity && !selectedParticipantType && !selectedCourse && !selectedEvent) return
    fetchParticipants()
  }, [selectedState, selectedCity, selectedParticipantType, selectedCourse, selectedEvent, isAuthenticated, authLoading, initialLoading])

  useEffect(() => {
    if (!isAuthenticated) return
    const interval = setInterval(() => {
      checkWhatsAppStatus()
    }, 10000)
    return () => clearInterval(interval)
  }, [isAuthenticated])

  // Gerar mensagem automaticamente quando curso ou evento for selecionado
  useEffect(() => {
    if (selectedCourse || selectedEvent) {
      generateMessage()
    } else {
      setMessage('')
    }
    // Não precisamos chamar fetchParticipants aqui pois o outro useEffect já o fará quando selectedCourse/selectedEvent mudar
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

    // Nota: A filtragem por curso/evento agora é feita no backend, 
    // mas mantemos filtros locais adicionais se necessário para garantir consistência
    // caso os dados retornados precisem de refinamento extra

    setFilteredParticipants(filtered)
    // Auto-select all filtered participants by default
    setSelectedParticipantIds(new Set(filtered.map(p => p.id_contato)))
  }, [participants, selectedCity, selectedState, selectedParticipantType, selectedCourse, selectedEvent])

  const toggleSelectAll = () => {
    if (filteredParticipants.every(p => selectedParticipantIds.has(p.id_contato))) {
      // Unselect all
      setSelectedParticipantIds(new Set())
    } else {
      // Select all visible
      const newSelected = new Set(selectedParticipantIds)
      filteredParticipants.forEach(p => newSelected.add(p.id_contato))
      setSelectedParticipantIds(newSelected)
    }
  }

  const toggleSelectOne = (id: string) => {
    const newSelected = new Set(selectedParticipantIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedParticipantIds(newSelected)
  }

  async function loadStates() {
    try {
      setLoadingStates(true)
      const response = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome')
      if (!response.ok) {
        throw new Error('Erro ao carregar estados')
      }
      const data = await response.json()
      const normalized = (data || [])
        .map((state: any) => ({ sigla: state.sigla, nome: state.nome }))
        .sort((a: StateOption, b: StateOption) => a.nome.localeCompare(b.nome))
      setStateOptions(normalized)
    } catch (error) {
      console.error('Erro ao carregar estados:', error)
    } finally {
      setLoadingStates(false)
    }
  }

  async function loadCities(stateSigla: string) {
    try {
      setLoadingCities(true)
      const response = await fetch(
        `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${stateSigla}/municipios`,
      )
      if (!response.ok) {
        throw new Error('Erro ao carregar cidades')
      }
      const data = await response.json()
      const normalized = (data || [])
        .map((city: any) => city.nome as string)
        .sort((a: string, b: string) => a.localeCompare(b))
      setCitiesOptions(normalized)
    } catch (error) {
      console.error('Erro ao carregar cidades:', error)
      setCitiesOptions([])
    } finally {
      setLoadingCities(false)
    }
  }

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

  async function fetchParticipants(useInitialLoader = false) {
    try {
      if (useInitialLoader) {
        setInitialLoading(true)
      } else {
        setParticipantsLoading(true)
      }
      const queryParams = new URLSearchParams()
      if (selectedCity) queryParams.append('city', selectedCity)
      if (selectedState) queryParams.append('state', selectedState)
      if (selectedParticipantType) queryParams.append('participantType', selectedParticipantType)

      // Adicionar filtros de curso/evento
      if (selectedCourse) queryParams.append('courseId', selectedCourse.id)
      if (selectedEvent) queryParams.append('eventId', selectedEvent.id)

      const url = `/admin/courses/enrollments/whatsapp?${queryParams.toString()}`
      console.log('[FRONTEND] Chamando API:', url)

      const data = await apiFetch<any>(
        url,
        { auth: true }
      )

      console.log('[FRONTEND] Resposta recebida:', data)
      console.log('[FRONTEND] Total de participantes:', data?.participantes?.length || 0)

      setParticipants(data.participantes || [])
    } catch (error) {
      console.error('[FRONTEND] Erro ao carregar participantes:', error)
      setError('Erro ao carregar participantes')
    } finally {
      if (useInitialLoader) {
        setInitialLoading(false)
      } else {
        setParticipantsLoading(false)
      }
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
        link = `${origin}/register-event.html?event=${selectedEvent.slug}`
      } else {
        link = `${origin}/register-event.html?event=${selectedEvent.id}`
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



  async function handleRequestPairingCode() {
    if (!pairingPhone) {
      setError('Por favor, digite o número do telefone.')
      return
    }

    let phoneToSend = pairingPhone.replace(/\D/g, '')
    // Se o número tiver 10 ou 11 dígitos, assume que é BR e adiciona 55
    if (phoneToSend.length >= 10 && phoneToSend.length <= 11 && !phoneToSend.startsWith('55')) {
      phoneToSend = `55${phoneToSend}`
    }

    setPairingLoading(true)
    setError(null)
    setPairingCode(null)

    try {
      const result = await apiFetch<any>('/api/whatsapp/pair', {
        method: 'POST',
        auth: true,
        body: JSON.stringify({ phoneNumber: phoneToSend }),
      })

      if (result.success && result.code) {
        setPairingCode(result.code)
      } else {
        throw new Error(result.message || 'Erro ao gerar código')
      }
    } catch (error: any) {
      console.error('Erro no pareamento:', error)
      setError(error.message || 'Erro ao solicitar código de pareamento')
    } finally {
      setPairingLoading(false)
    }
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

    if (selectedParticipantIds.size === 0) {
      setError('Por favor, selecione pelo menos um participante')
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
          link = `${origin}/register-event.html?event=${selectedEvent.slug}`
        } else {
          link = `${origin}/register-event.html?event=${selectedEvent.id}`
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
      // Filtrar apenas os IDs selecionados
      const participantesFinais = filteredParticipants.filter(p => selectedParticipantIds.has(p.id_contato))

      console.log('[FRONTEND] Participantes selecionados:', participantesFinais.length)
      console.log('[FRONTEND] Primeiro participante:', participantesFinais[0])

      const participantesComNome = participantesFinais.map((p) => {
        let phoneToSend = p.id_contato.replace(/\D/g, '')
        // Se o número tiver 10 ou 11 dígitos, assume que é BR e adiciona 55
        // A menos que já comece com 55 e tenha 12 ou 13 dígitos
        if (phoneToSend.length >= 10 && phoneToSend.length <= 11) {
          phoneToSend = `55${phoneToSend}`
        }

        return {
          id_contato: phoneToSend,
          nome: p.nome,
          cidade: p.cidade,
          estado: p.estado,
          produtor: p.produtor,
          professor: p.professor,
          estudante: p.estudante,
        }
      })

      console.log('[FRONTEND] Participantes formatados:', participantesComNome)
      console.log('[FRONTEND] Mensagem a enviar:', message)

      // Preparar Payload com Mídia Opcional - Forçando Recompilação
      let mediaUrl: string | undefined = undefined
      let mediaType: 'image' | 'video' | undefined = undefined

      if (uploadedMediaUrl) {
        mediaUrl = uploadedMediaUrl
        mediaType = uploadedMediaType || 'image'
      } else if (mediaFile) {
        alert('Aguarde o término do upload da mídia.')
        return
      }

      // O backend irá personalizar a mensagem substituindo {nome} pelo nome de cada participante
      const payload = {
        mensagem: message, // Mensagem com {nome} que será substituído no backend
        participantes: participantesComNome,
        filtros: {}, // Sem filtros, pois já filtramos antes no frontend
        mediaUrl,
        mediaType
      }

      console.log('[FRONTEND] Payload completo:', payload)

      const result = await apiFetch<any>('/api/whatsapp/enviar-mensagem-segmentada', {
        method: 'POST',
        auth: true,
        body: JSON.stringify(payload),
      })

      console.log('[FRONTEND] Resultado do envio:', result)

      const enviadas = result.mensagens_enviadas || 0
      const falhas = result.mensagens_falhadas || 0

      if (enviadas === 0 && falhas === 0) {
        setError('Nenhuma mensagem foi enviada. O backend não processou nenhum envio. Verifique os logs do servidor.')
        setSuccess(null)
      } else if (enviadas === 0) {
        setError(`Falha ao enviar mensagens. ${falhas} falhas registradas. Verifique a conexão com o WhatsApp.`)
        setSuccess(null)
      } else {
        setSuccess(
          `Mensagem enviada com sucesso! ${enviadas} mensagens enviadas, ${falhas} falhas.`
        )
      }
    } catch (error: any) {
      setError(error?.message || 'Erro ao enviar mensagem')
    } finally {
      setSending(false)
    }
  }

  if (authLoading || initialLoading) {
    return <LoadingScreen />
  }



  const formatPhone = (phone: string) => {
    if (!phone) return '-'
    const clean = phone.replace(/\D/g, '')
    // Format: +55 85 98658-3270
    if (clean.length === 13 && clean.startsWith('55')) {
      return `+${clean.substring(0, 2)} ${clean.substring(2, 4)} ${clean.substring(4, 9)}-${clean.substring(9)}`
    }
    // Format: 85 98658-3270 (assuming BR local)
    if (clean.length === 11) {
      return `+55 ${clean.substring(0, 2)} ${clean.substring(2, 7)}-${clean.substring(7)}`
    }
    // Fallback
    return phone
  }

  const participantTypeLabels: Record<string, string> = {
    PRODUTOR: 'Produtor',
    PROFESSOR: 'Professor',
    ESTUDANTE: 'Estudante',
  }

  /* MOCK METRICS - Idealmente viriam do backend */
  const metrics = {
    messages: whatsappStatus?.metrics?.messages || '56,540',
    contacts: whatsappStatus?.metrics?.contacts || '1,171',
    chats: whatsappStatus?.metrics?.chats || '252'
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <MobileNavbar />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-green-100 rounded-2xl text-green-600">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[#003366]">Integração WhatsApp</h1>
              <p className="text-gray-500 mt-1">Conecte seu WhatsApp para enviar mensagens em massa e automatizar comunicações.</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 p-1 bg-gray-100 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab('devices')}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'devices' ? 'bg-white text-[#003366] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                Dispositivos
              </span>
            </button>
            <button
              onClick={() => setActiveTab('bulk')}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'bulk' ? 'bg-white text-[#003366] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                Envio em Massa
              </span>
            </button>
          </div>
        </div>

        {/* Tab Content: Devices */}
        {activeTab === 'devices' && (
          <div className="space-y-6">
            {/* Info Alert */}
            <div className="bg-blue-50 border border-blue-100 rounded-3xl p-6 flex gap-4 text-blue-800">
              <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <div>
                <h3 className="font-semibold mb-1">Como funciona a conexão</h3>
                <p className="text-sm opacity-90">Conecte um dispositivo WhatsApp para enviar mensagens através da plataforma. Atualmente permitimos 1 dispositivo por empresa.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Status Card */}
              <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm flex flex-col justify-between h-full">
                <div>
                  <div className="flex justify-between items-start mb-8">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                      <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      Status Online
                    </h3>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold ${whatsappStatus?.status === 'READY' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {whatsappStatus?.status === 'READY' ? 'Conectado' : 'Desconectado'}
                    </div>
                  </div>

                  {whatsappStatus?.status === 'READY' ? (
                    <div className="flex flex-col items-center py-4">
                      <div className="w-24 h-24 rounded-full bg-gray-200 overflow-hidden mb-4 border-4 border-green-50">
                        {/* Avatar Placeholder */}
                        <div className="w-full h-full bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold">
                          {whatsappStatus?.me?.user?.substring(0, 2) || 'US'}
                        </div>
                      </div>
                      <h2 className="text-xl font-bold text-[#003366] mb-1">{whatsappStatus?.me?.name || 'Usuário Conectado'}</h2>
                      <p className="text-gray-500 font-mono text-sm mb-6">{formatPhone(whatsappStatus?.me?.id?._serialized || whatsappStatus?.me?.user || '55999999999')}</p>

                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        Último pulso {new Date().toLocaleTimeString()}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center py-4 text-center">
                      {qrCodeImage ? (
                        <img src={qrCodeImage} alt="QR Code" className="w-48 h-48 mb-4 border p-2 rounded-xl" />
                      ) : (
                        <div className="w-48 h-48 mb-4 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400">
                          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"></path></svg>
                        </div>
                      )}
                      <p className="text-gray-600 mb-4 text-sm max-w-xs">{showPairingInput ? 'Use o código abaixo no seu WhatsApp' : 'Escaneie o QR Code para conectar'}</p>

                      {showPairingInput && pairingCode && (
                        <div className="bg-gray-100 p-3 rounded-lg font-mono text-xl font-bold tracking-widest text-[#003366] mb-4">
                          {pairingCode}
                        </div>
                      )}

                      {!showPairingInput && (
                        <button onClick={() => setShowPairingInput(true)} className="text-[#FF6600] text-sm hover:underline">
                          Ou conectar com número de telefone
                        </button>
                      )}
                      <button
                        onClick={checkWhatsAppStatus}
                        className="mt-4 px-6 py-2 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-colors text-sm font-medium"
                      >
                        Atualizar Status
                      </button>

                      {showPairingInput && !pairingCode && (
                        <div className="flex gap-2 mt-4 w-full">
                          <input
                            className="flex-1 px-3 py-2 border rounded-md text-sm"
                            placeholder="DDD + Número"
                            value={pairingPhone}
                            onChange={e => setPairingPhone(e.target.value)}
                          />
                          <button
                            onClick={handleRequestPairingCode}
                            disabled={pairingLoading}
                            className="px-4 py-2 bg-[#FF6600] text-white rounded-md text-sm hover:bg-[#E55A00]"
                          >
                            Gerar
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {whatsappStatus?.status === 'READY' && (
                  <div className="mt-8 pt-6 border-t border-gray-100">
                    <button
                      onClick={handleDisconnect}
                      className="w-full py-3 text-red-600 font-medium hover:bg-red-50 rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                      Desconectar Dispositivo
                    </button>
                  </div>
                )}
              </div>

              {/* Metrics Card */}
              <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm flex flex-col h-full">
                <div className="mb-8">
                  <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                    Métricas da Instância
                  </h3>
                  <p className="text-sm text-gray-400 mt-1">Estatísticas em tempo real da conta conectada</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-auto">
                  {/* Messages */}
                  <div className="bg-purple-50 rounded-2xl p-4 flex flex-col items-center justify-center text-center h-32">
                    <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mb-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
                    </div>
                    <span className="text-2xl font-bold text-purple-900">{metrics.messages}</span>
                    <span className="text-xs font-bold text-purple-400 uppercase tracking-wide">Mensagens</span>
                  </div>
                  {/* Contacts */}
                  <div className="bg-green-50 rounded-2xl p-4 flex flex-col items-center justify-center text-center h-32">
                    <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center mb-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                    </div>
                    <span className="text-2xl font-bold text-green-900">{metrics.contacts}</span>
                    <span className="text-xs font-bold text-green-400 uppercase tracking-wide">Contatos</span>
                  </div>
                  {/* Chats */}
                  <div className="bg-orange-50 rounded-2xl p-4 flex flex-col items-center justify-center text-center h-32">
                    <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mb-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"></path></svg>
                    </div>
                    <span className="text-2xl font-bold text-orange-900">{metrics.chats}</span>
                    <span className="text-xs font-bold text-orange-400 uppercase tracking-wide">Conversas</span>
                  </div>
                </div>

                <div className="mt-8 bg-gray-50 rounded-xl p-4 flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <p className="text-xs text-gray-500">Sua instância está configurada para envio inteligente.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content: Bulk Send (Existing Functionality) */}
        {activeTab === 'bulk' && (
          <div className="animate-fade-in space-y-6">
            {/* Status Alert in Bulk Mode */}
            {whatsappStatus?.status !== 'READY' && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex justify-between items-center">
                <span>WhatsApp desconectado. Vá para a aba "Dispositivos" para conectar.</span>
                <button onClick={() => setActiveTab('devices')} className="text-sm font-bold underline">Conectar agora</button>
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
                      className={`px-4 py-2 rounded-md font-medium transition-colors ${selectedType === 'course'
                        ? 'bg-[#FF6600] text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                      Curso
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTypeChange('event')}
                      className={`px-4 py-2 rounded-md font-medium transition-colors ${selectedType === 'event'
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
                    disabled={loadingStates}
                  >
                    <option value="">
                      {loadingStates ? 'Carregando estados...' : 'Todos os estados'}
                    </option>
                    {stateOptions.map((state) => (
                      <option key={state.sigla} value={state.sigla}>
                        {state.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cidade
                  </label>
                  <select
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    disabled={!selectedState || loadingCities || citiesOptions.length === 0}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900"
                  >
                    <option value="">
                      {!selectedState
                        ? 'Selecione um estado'
                        : loadingCities
                          ? 'Carregando cidades...'
                          : 'Todas as cidades'}
                    </option>
                    {citiesOptions.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
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
                {participantsLoading && (
                  <p className="text-xs text-gray-500 mt-1">Atualizando lista de participantes...</p>
                )}
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
                    * O nome {'{nome}'} será substituído automaticamente pelo nome de cada participante
                  </p>
                </div>
              )}
            </div>

            {/* Lista de participantes filtrados */}
            {filteredParticipants.length === 0 && !participantsLoading && (
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <p className="text-gray-500 text-sm">
                  Nenhum participante encontrado com os filtros atuais. Ajuste os filtros e tente novamente.
                </p>
              </div>
            )}
            {filteredParticipants.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h2 className="text-xl font-semibold text-[#003366] mb-4">
                  Participantes que receberão a mensagem ({filteredParticipants.length})
                </h2>
                <div className="max-h-96 overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={filteredParticipants.length > 0 && filteredParticipants.every(p => selectedParticipantIds.has(p.id_contato))}
                            onChange={toggleSelectAll}
                            className="rounded border-gray-300 text-[#FF6600] focus:ring-[#FF6600]"
                          />
                        </th>
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
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedParticipantIds.has(participant.id_contato)}
                              onChange={() => toggleSelectOne(participant.id_contato)}
                              className="rounded border-gray-300 text-[#FF6600] focus:ring-[#FF6600]"
                            />
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {participant.nome}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {formatPhone(participant.telefone)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {participant.cidade || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${participant.produtor
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

            {/* Área de Upload de Mídia */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold text-[#003366] mb-4">Anexar Mídia (Opcional)</h2>

              {!mediaPreview ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors cursor-pointer relative">
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="text-gray-400 mb-2">
                    <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                  </div>
                  <p className="text-gray-600 font-medium">Clique para selecionar uma imagem ou vídeo</p>
                  <p className="text-gray-400 text-sm mt-1">MP4, JPG, PNG (Max 30MB)</p>
                </div>
              ) : (
                <div className="relative rounded-lg border overflow-hidden bg-gray-100 flex items-center justify-center">
                  {/* Botão Remover */}
                  <button
                    onClick={handleRemoveMedia}
                    className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full hover:bg-red-700 z-10"
                    title="Remover mídia"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                  </button>

                  {/* Preview Imagem ou Vídeo */}
                  {uploadedMediaType === 'video' ? (
                    <video src={mediaPreview} controls className="max-h-64 max-w-full rounded" />
                  ) : (
                    <img src={mediaPreview} alt="Preview" className="max-h-64 object-contain rounded" />
                  )}

                  {/* Loading Overlay */}
                  {isUploading && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                      <div className="text-white font-medium flex items-center gap-2">
                        <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        Enviando...
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Botão de enviar */}
            <div className="flex justify-end gap-4 p-4 bg-white rounded-lg shadow-sm border-t sticky bottom-0 z-10">
              <Link
                to="/admin/dashboard"
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </Link>
              <button
                onClick={handleSendMessage}
                disabled={sending || !selectedCourse && !selectedEvent || !message.trim() || selectedParticipantIds.size === 0 || whatsappStatus?.status !== 'READY'}
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
                    Enviar para {selectedParticipantIds.size} participante(s)
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}

