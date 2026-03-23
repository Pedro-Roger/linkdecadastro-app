import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  MessageSquare, Send, Search, Filter, CheckCircle,
  XCircle, Smartphone, User, MapPin, BadgeCheck,
  Trash2, Upload, Video, Image as ImageIcon,
  MoreVertical, CheckCheck, RefreshCw, Smartphone as PhoneIcon, LogOut,
  ChevronDown, Check, PlusCircle, Info
} from 'lucide-react'
import LoadingScreen from '@/components/ui/LoadingScreen'
import { apiFetch, normalizeImageUrl, getApiUrl } from '@/lib/api'
import { useAuth } from '@/lib/useAuth'
import AdminLayout from '@/components/layouts/AdminLayout'

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

export default function WhatsAppSendPage() {
  const navigate = useNavigate()
  const { user, loading: authLoading, isAuthenticated } = useAuth({
    requireAuth: true,
    redirectTo: '/login',
  })

  const [searchParams] = useSearchParams()
  const initialEventId = searchParams.get('eventId')

  // Sessions state
  const [sessions, setSessions] = useState<any[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(localStorage.getItem('active_whatsapp_session'))
  const [showSessionSelector, setShowSessionSelector] = useState(false)
  const [sessionsLoaded, setSessionsLoaded] = useState(false)

  // States
  const [participants, setParticipants] = useState<Participant[]>([])
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<Set<string>>(new Set())
  const [participantsLoading, setParticipantsLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [whatsappStatus, setWhatsappStatus] = useState<any>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Filters
  const [selectedType, setSelectedType] = useState<'course' | 'event' | 'all' | ''>(initialEventId ? 'event' : 'all')
  const [courses, setCourses] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [selectedCourse, setSelectedCourse] = useState<any>(null)
  const [selectedEvent, setSelectedEvent] = useState<any>(null)
  const [selectedState, setSelectedState] = useState('')
  const [selectedCity, setSelectedCity] = useState('')
  const [selectedRole, setSelectedRole] = useState('')
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [isCreatingGroup, setIsCreatingGroup] = useState(false)

  // Media
  const [mediaPreview, setMediaPreview] = useState<string | null>(null)
  const [uploadedMediaUrl, setUploadedMediaUrl] = useState<string | null>(null)
  const [uploadedMediaType, setUploadedMediaType] = useState<'image' | 'video' | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  // Pairing State
  const [showPairingUI, setShowPairingUI] = useState(false)
  const [pairingPhone, setPairingPhone] = useState('')
  const [pairingCode, setPairingCode] = useState<string | null>(null)
  const [pairingLoading, setPairingLoading] = useState(false)
  const [reconnecting, setReconnecting] = useState(false)
  const autoReconnectAttemptRef = useRef<string | null>(null)

  const resetInvalidSession = useCallback(() => {
    localStorage.removeItem('active_whatsapp_session')
    setCurrentSessionId(null)
    setWhatsappStatus(null)
    setPairingCode(null)
    setSessions([])
    autoReconnectAttemptRef.current = null
  }, [])

  const fetchSessions = useCallback(async () => {
    try {
      const data = await apiFetch<any>('/api/whatsapp/sessions', { auth: true })
      if (data.success && data.sessions.length > 0) {
        setSessions(data.sessions)
        if (!currentSessionId || !data.sessions.find((s: any) => s.id === currentSessionId)) {
          setCurrentSessionId(data.sessions[0].id)
          localStorage.setItem('active_whatsapp_session', data.sessions[0].id)
        }
      } else if (data.success && data.sessions.length === 0) {
        const newSess = await apiFetch<any>('/api/whatsapp/sessions', {
          method: 'POST', auth: true, body: JSON.stringify({ name: 'Meu WhatsApp' })
        })
        if (newSess.success) {
          setSessions([newSess.session])
          setCurrentSessionId(newSess.session.id)
          localStorage.setItem('active_whatsapp_session', newSess.session.id)
        }
      }
    } catch (err) {
      console.error('Erro ao buscar sessões:', err)
    }
    setSessionsLoaded(true)
  }, [currentSessionId])

  const checkWhatsAppStatus = useCallback(async () => {
    if (!currentSessionId || !sessionsLoaded) return
    try {
      const status = await apiFetch<any>(`/api/whatsapp/status?sessionId=${currentSessionId}`, { auth: true })
      setWhatsappStatus(status)
      if (status.status === 'QR_CODE') setShowPairingUI(true)
    } catch (error: any) {
      if (error?.status === 403) {
        resetInvalidSession()
        await fetchSessions()
      }
    }
  }, [currentSessionId, sessionsLoaded, resetInvalidSession, fetchSessions])

  const handleReconnect = useCallback(async () => {
    if (!currentSessionId || !sessionsLoaded || reconnecting) return

    setReconnecting(true)
    setPairingCode(null)
    setError(null)

    try {
      const status = await apiFetch<any>('/api/whatsapp/reconnect', {
        method: 'POST',
        auth: true,
        body: JSON.stringify({ sessionId: currentSessionId })
      })
      setWhatsappStatus(status)
      if (status.status === 'QR_CODE') setShowPairingUI(true)
      await fetchSessions()
    } catch (error: any) {
      if (error?.status === 403) {
        resetInvalidSession()
        await fetchSessions()
        setError('A sessao anterior nao pertence mais a este usuario. Selecione ou conecte um novo WhatsApp.')
      } else {
        setError('Nao foi possivel reconectar o WhatsApp.')
      }
    } finally {
      setReconnecting(false)
    }
  }, [currentSessionId, sessionsLoaded, reconnecting, fetchSessions, resetInvalidSession])

  const fetchParticipants = useCallback(async () => {
    try {
      setParticipantsLoading(true)
      const queryParams = new URLSearchParams()
      if (selectedCity) queryParams.append('city', selectedCity)
      if (selectedState) queryParams.append('state', selectedState)
      if (selectedCourse) queryParams.append('courseId', selectedCourse.id)
      if (selectedEvent) queryParams.append('eventId', selectedEvent.id)
      if (selectedRole) queryParams.append('participantType', selectedRole)

      const data = await apiFetch<any>(`/admin/courses/enrollments/whatsapp?${queryParams.toString()}`, { auth: true })
      setParticipants(data.participantes || [])
      setSelectedParticipantIds(new Set((data.participantes || []).map((p: any) => p.id_contato)))
    } catch (err) {
      setError('Erro ao carregar participantes')
    } finally {
      setParticipantsLoading(false)
    }
  }, [selectedCity, selectedState, selectedCourse, selectedEvent])

  useEffect(() => {
    if (isAuthenticated) {
      fetchSessions()
      apiFetch<any[]>('/admin/courses', { auth: true }).then(setCourses).catch(() => { })
      apiFetch<any[]>('/admin/events/history', { auth: true }).then(setEvents).catch(() => { })
      fetchParticipants()
    }
  }, [isAuthenticated, fetchSessions, fetchParticipants])

  useEffect(() => {
    if (sessionsLoaded && currentSessionId) {
      autoReconnectAttemptRef.current = null
      checkWhatsAppStatus()
      const interval = setInterval(checkWhatsAppStatus, 10000)
      return () => clearInterval(interval)
    }
  }, [sessionsLoaded, currentSessionId, checkWhatsAppStatus])

  useEffect(() => {
    if (
      !currentSessionId ||
      !sessionsLoaded ||
      !whatsappStatus ||
      whatsappStatus.status === 'READY' ||
      whatsappStatus.status === 'QR_CODE' ||
      reconnecting
    ) {
      return
    }

    if (autoReconnectAttemptRef.current === currentSessionId) {
      return
    }

    autoReconnectAttemptRef.current = currentSessionId
    handleReconnect().catch(() => { })
  }, [sessionsLoaded, currentSessionId, whatsappStatus, reconnecting, handleReconnect])

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploading(true)
    setError(null)
    const type = file.type.startsWith('image/') ? 'image' : (file.type.startsWith('video/') ? 'video' : null)
    if (!type) {
      setError('Formato inválido. Use apenas imagem ou vídeo.')
      setIsUploading(false)
      return
    }
    const formData = new FormData()
    formData.append('file', file)
    try {
      const response = await fetch(`${getApiUrl()}/admin/upload`, {
        method: 'POST', body: formData, headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
      const data = await response.json()
      if (data.url) {
        setUploadedMediaUrl(data.url)
        setUploadedMediaType(type)
        setMediaPreview(URL.createObjectURL(file))
      }
    } catch (err) {
      setError('Falha ao fazer upload da mídia.')
    } finally { setIsUploading(false) }
  }

  const handleRequestPairingCode = async () => {
    if (!pairingPhone || !currentSessionId) return
    setPairingLoading(true)
    try {
      const ph = pairingPhone.replace(/\D/g, '')
      const res = await apiFetch<any>('/api/whatsapp/pair', {
        method: 'POST', auth: true, body: JSON.stringify({ sessionId: currentSessionId, phoneNumber: ph.startsWith('55') ? ph : `55${ph}` })
      })
      if (res.success) setPairingCode(res.code)
    } catch (error) { setError('Erro ao gerar código de pareamento') } finally { setPairingLoading(false) }
  }

  const handleSendMessage = async () => {
    if (!message.trim() || selectedParticipantIds.size === 0 || whatsappStatus?.status !== 'READY' || !currentSessionId) return
    setSending(true)
    setError(null)
    setSuccess(null)
    try {
      const selectedList = participants.filter(p => selectedParticipantIds.has(p.id_contato))
      const payload = {
        sessionId: currentSessionId,
        mensagem: message,
        participantes: selectedList.map(p => ({
          ...p,
          id_contato: p.id_contato,
        })),
        mediaUrl: uploadedMediaUrl,
        mediaType: uploadedMediaType,
        filtros: { tipo: selectedType, curso: selectedCourse?.title, evento: selectedEvent?.title, cidade: selectedCity, estado: selectedState }
      }
      const result = await apiFetch<any>('/api/whatsapp/enviar-mensagem-segmentada', {
        method: 'POST', auth: true, body: JSON.stringify(payload)
      })
      if (result.enviadas > 0) setSuccess(`${result.enviadas} mensagens enviadas com sucesso!${result.falhas > 0 ? ` (${result.falhas} falharam)` : ''}`)
      else setError(`Nenhuma mensagem pôde ser enviada. ${result.falhas > 0 ? `(${result.falhas} falhas)` : ''} Confira possíveis bloqueios ou números inativos.`)
    } catch (err: any) { setError(err?.message || 'Erro ao enviar mensagens') } finally { setSending(false) }
  }

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || selectedParticipantIds.size === 0 || !currentSessionId) return
    setIsCreatingGroup(true)
    setError(null)
    setSuccess(null)
    try {
      const selectedJids = participants
        .filter(p => selectedParticipantIds.has(p.id_contato))
        .map(p => {
          let id = p.id_contato.replace(/\D/g, '')
          // Remove non-digit chars and handle 9th digit
          if (id.startsWith('0')) id = id.substring(1)
          if (id.length === 11 && id[2] === '9') id = id.substring(0, 2) + id.substring(3)
          if ((id.length === 10 || id.length === 11) && !id.startsWith('55')) id = '55' + id
          return `${id}@s.whatsapp.net`
        })

      const res = await apiFetch<any>('/api/whatsapp/create-group', {
        method: 'POST',
        auth: true,
        body: JSON.stringify({
          sessionId: currentSessionId,
          name: newGroupName,
          participants: selectedJids
        })
      })

      if (res.success) {
        setSuccess(`Grupo "${newGroupName}" criado com sucesso!`)
        setShowCreateGroupModal(false)
        setNewGroupName('')
      }
    } catch (err: any) {
      setError(err?.message || 'Erro ao criar grupo')
    } finally {
      setIsCreatingGroup(false)
    }
  }

  const handleCreateNewSession = async () => {
    const name = prompt('Nome para esta conexão:')
    if (!name) return
    try {
      const data = await apiFetch<any>('/api/whatsapp/sessions', {
        method: 'POST', auth: true, body: JSON.stringify({ name })
      })
      if (data.success) {
        setSessions(prev => [...prev, data.session])
        setCurrentSessionId(data.session.id)
        localStorage.setItem('active_whatsapp_session', data.session.id)
        setShowSessionSelector(false)
      }
    } catch (err) { console.error(err) }
  }

  const handleSessionSwitch = (id: string) => {
    setCurrentSessionId(id)
    localStorage.setItem('active_whatsapp_session', id)
    setShowSessionSelector(false)
    setWhatsappStatus(null)
    setPairingCode(null)
    autoReconnectAttemptRef.current = null
  }

  const handleLogout = async () => {
    if (!currentSessionId) return
    if (!confirm('Deseja desconectar este WhatsApp?')) return
    try {
      await apiFetch(`/api/whatsapp/logout?sessionId=${currentSessionId}`, { method: 'POST', auth: true })
      checkWhatsAppStatus()
    } catch (err) { }
  }

  if (authLoading) return <LoadingScreen />

  return (
    <AdminLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 mt-4">
        <div>
          <h1 className="text-3xl font-black text-[var(--secondary)] tracking-tight">
            Transmissão <span className="text-emerald-500">WhatsApp</span>
          </h1>
          <p className="text-slate-400 font-medium mt-1">Segmentação inteligente e disparos em massa.</p>
        </div>
        <div className="flex gap-3 items-center">
          {/* Account Selector Section */}
          <div className="relative group">
            <button
              onClick={() => setShowSessionSelector(!showSessionSelector)}
              className="flex items-center gap-3 px-6 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
            >
              <Smartphone size={18} className="text-emerald-500" />
              {sessions.find(s => s.id === currentSessionId)?.instance_name || 'Minhas Contas'}
              <ChevronDown size={18} className="text-slate-300" />
            </button>
            {showSessionSelector && (
              <div className="absolute top-14 right-0 w-72 bg-white rounded-3xl shadow-2xl border border-slate-100 z-50 p-3 animate-in fade-in slide-in-from-top-4 duration-200">
                <div className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 mb-2">Contas Conectadas</div>
                <div className="space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
                  {sessions.map(s => (
                    <button
                      key={s.id}
                      onClick={() => handleSessionSwitch(s.id)}
                      className={`w-full flex items-center justify-between p-4 rounded-2xl text-sm font-bold transition-all ${currentSessionId === s.id ? 'bg-emerald-50 text-emerald-700' : 'hover:bg-slate-50 text-slate-600'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full ${s.status === 'READY' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        {s.instance_name}
                      </div>
                      {currentSessionId === s.id && <Check size={18} />}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleCreateNewSession}
                  className="w-full flex items-center gap-3 p-4 mt-2 rounded-2xl text-xs font-black text-slate-900 border-2 border-dashed border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/30 hover:text-emerald-700 transition-all"
                >
                  <PlusCircle size={18} /> CONECTAR OUTRO NÚMERO
                </button>
              </div>
            )}
          </div>

          <button
            onClick={whatsappStatus?.status === 'READY' ? checkWhatsAppStatus : handleReconnect}
            className="p-3.5 bg-white border border-slate-200 text-slate-400 rounded-2xl hover:text-emerald-500 hover:bg-slate-50 transition-all shadow-sm"
          >
            <RefreshCw size={22} className={reconnecting ? 'animate-spin' : ''} />
          </button>

          {whatsappStatus?.status === 'READY' && (
            <button
              onClick={handleLogout}
              className="p-3.5 bg-red-50 text-red-500 border border-red-100 rounded-2xl hover:bg-red-100 transition-all shadow-sm group"
              title="Desconectar"
            >
              <LogOut size={22} className="group-hover:translate-x-1 transition-transform" />
            </button>
          )}

          <div className={`flex items-center gap-3 px-6 py-3.5 rounded-2xl border-2 transition-all font-black text-[10px] uppercase tracking-widest ${whatsappStatus?.status === 'READY'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-xl shadow-emerald-500/10'
            : 'bg-red-50 border-red-200 text-red-600'
            }`}>
            <div className={`w-2 h-2 rounded-full ${whatsappStatus?.status === 'READY' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
            {whatsappStatus?.status === 'READY' ? 'Conectado' : 'Desconectado'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column - Message & Media */}
        <div className="lg:col-span-12 space-y-8">
          {/* Connection Banner inside Content */}
          {whatsappStatus?.status !== 'READY' && (
            <div className="bg-slate-900 rounded-[2.5rem] p-10 flex flex-col md:flex-row items-center gap-10 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>

              {whatsappStatus?.qrCodeBase64 ? (
                <div className="flex flex-col items-center gap-6 animate-in zoom-in-95 duration-500">
                  <div className="bg-white p-4 rounded-[2.5rem] shadow-2xl border-4 border-emerald-500 mx-auto w-fit">
                    <img src={whatsappStatus.qrCodeBase64} alt="QR" className="w-56 h-56 rounded-2xl" />
                  </div>
                  <div className="px-6 py-2 bg-emerald-500 rounded-full text-white text-[10px] font-black uppercase tracking-widest animate-pulse">Escaneie o QR Code</div>
                </div>
              ) : (
                <div className="w-48 h-48 bg-slate-800 rounded-[2.5rem] flex items-center justify-center text-slate-600 border-2 border-dashed border-slate-700">
                  <RefreshCw size={48} className={reconnecting ? 'animate-spin' : ''} />
                </div>
              )}

              <div className="flex-1 text-center md:text-left space-y-4">
                <h2 className="text-3xl font-black text-white leading-tight">Conecte seu WhatsApp para enviar transmissões.</h2>
                <p className="text-slate-400 font-medium max-w-xl">Abra o WhatsApp em seu celular, acesse Aparelhos Conectados e escaneie o código ao lado. O sistema permite manter múltiplos números conectados individualmente.</p>

                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleReconnect}
                    disabled={!currentSessionId || reconnecting}
                    className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <RefreshCw size={16} className={reconnecting ? 'animate-spin' : ''} />
                    {reconnecting ? 'Gerando QR...' : 'Reconectar Agora'}
                  </button>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      value={pairingPhone}
                      onChange={(e) => setPairingPhone(e.target.value)}
                      placeholder="Número (Ex: 1199999999)"
                      className="flex-1 bg-slate-800 border-none rounded-2xl px-5 text-white text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-slate-600"
                    />
                    <button
                      onClick={handleRequestPairingCode}
                      disabled={pairingLoading || !pairingPhone}
                      className="px-6 py-4 bg-emerald-500 text-white rounded-2xl font-black hover:bg-emerald-400 transition-all active:scale-95 disabled:opacity-50 text-[10px] uppercase tracking-widest"
                    >
                      {pairingLoading ? 'GERANDO...' : 'USAR CÓDIGO'}
                    </button>
                  </div>
                  {pairingCode && (
                    <div className="bg-white px-8 py-4 rounded-2xl flex flex-col items-center justify-center shadow-lg animate-in fade-in duration-300">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Código</span>
                      <span className="text-xl font-black text-slate-900 tracking-[0.4em]">{pairingCode}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-7 space-y-8">
          <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-full blur-2xl -mr-8 -mt-8"></div>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-emerald-400">
                <MessageSquare size={24} />
              </div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Compor Mensagem</h3>
            </div>

            <div className="space-y-6">
              <div>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Olá {nome}, como vai? Gostaria de te convidar para..."
                  className="w-full h-80 bg-slate-50 border-none rounded-3xl p-6 text-base font-medium focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:text-slate-300 resize-none shadow-inner"
                />
                <div className="mt-4 flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <span className="px-2 py-1 bg-slate-100 rounded-lg text-slate-600">Dica: Use {`{nome}`} para personalizar</span>
                  <span>{message.length} caracteres</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4 pt-4 border-t border-slate-50">
                <div className="relative flex-1 w-full">
                  <input type="file" onChange={handleMediaUpload} className="hidden" id="media-upload" accept="image/*,video/*" />
                  <label htmlFor="media-upload" className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-slate-50 border border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 transition-all font-bold text-slate-500">
                    <Upload size={20} className={isUploading ? 'animate-bounce' : ''} />
                    {uploadedMediaUrl ? 'Arquivo Carregado' : 'Carregar Imagem ou Vídeo'}
                  </label>
                </div>
                {mediaPreview && (
                  <div className="relative group">
                    <img src={mediaPreview} className="w-16 h-16 rounded-xl object-cover border-2 border-emerald-500 shadow-lg" alt="Preview" />
                    <button onClick={() => { setMediaPreview(null); setUploadedMediaUrl(null); }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"><XCircle size={14} /></button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 space-y-8">
          <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
                <Filter size={24} />
              </div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Segmentação de Leads</h3>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Tipo de Fonte</label>
                <div className="grid grid-cols-2 gap-3">
                  {['all', 'event'].map(type => (
                    <button key={type} onClick={() => setSelectedType(type as any)} className={`py-4 rounded-2xl font-bold text-xs uppercase transition-all border-2 ${selectedType === type ? 'bg-slate-900 border-slate-900 text-white shadow-xl shadow-slate-900/10' : 'bg-slate-50 border-slate-50 text-slate-400 hover:border-slate-200'}`}>
                      {type === 'all' ? 'Todos Leads' : 'Inscritos Eventos'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Estado</label>
                  <select value={selectedState} onChange={(e) => setSelectedState(e.target.value)} className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 text-slate-700">
                    <option value="">Brasil (Todos)</option>
                    {['SP', 'RJ', 'MG', 'RS', 'SC', 'PR', 'BA', 'PE', 'CE', 'DF'].map(uf => <option key={uf} value={uf}>{uf}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Cidade</label>
                  <input type="text" value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)} placeholder="Ex: São Paulo" className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 text-slate-700 placeholder:text-slate-300" />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Papel / Função</label>
                <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 text-slate-700">
                  <option value="">Todos os Papéis</option>
                  <option value="ESTUDANTE">Estudante</option>
                  <option value="PROFESSOR">Professor</option>
                  <option value="PRODUTOR">Produtor</option>
                </select>
              </div>

              {selectedType === 'event' && (
                <div className="animate-in slide-in-from-top-4 duration-300">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Selecionar Evento</label>
                  <select value={selectedEvent?.id || ''} onChange={(e) => setSelectedEvent(events.find(ev => ev.id === e.target.value))} className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 text-slate-700">
                    <option value="">Selecione um evento...</option>
                    {events.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
                  </select>
                </div>
              )}
            </div>

            <div className="mt-10 pt-10 border-t border-slate-50">
              {participants.length === 0 && !participantsLoading && (
                <div className="mb-6 p-4 bg-amber-50 border border-amber-100 rounded-2xl text-amber-700 text-xs font-bold flex items-center gap-3 animate-pulse">
                  <Info size={18} /> Nenhum participante atende aos filtros
                </div>
              )}
              <div className="flex items-center justify-between mb-8">
                <div className="flex flex-col">
                  <span className="text-3xl font-black text-slate-900 tracking-tighter">{selectedParticipantIds.size}</span>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Leads Selecionados <span className="text-emerald-500">/ {participants.length}</span></span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setSelectedParticipantIds(new Set())} className="px-5 py-2.5 bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest rounded-xl hover:bg-red-50 hover:text-red-500 transition-all underline">Limpar Seleção</button>
                  <button onClick={() => setSelectedParticipantIds(new Set(participants.map(p => p.id_contato)))} className="px-5 py-2.5 bg-emerald-50 text-[10px] font-black text-emerald-600 uppercase tracking-widest rounded-xl hover:bg-emerald-100 transition-all">Selecionar Todos</button>
                </div>
              </div>

              {/* Lista Selecionável */}
              {participants.length > 0 && (
                <div className="mb-8 max-h-[300px] overflow-y-auto custom-scrollbar border border-slate-100 rounded-2xl bg-slate-50 p-2">
                  {participants.map(p => (
                    <label key={p.id_contato} className="flex items-center gap-4 p-3 hover:bg-white rounded-xl cursor-pointer transition-all border border-transparent hover:border-slate-200 hover:shadow-sm">
                      <input
                        type="checkbox"
                        checked={selectedParticipantIds.has(p.id_contato)}
                        onChange={(e) => {
                          const newSet = new Set(selectedParticipantIds);
                          if (e.target.checked) newSet.add(p.id_contato);
                          else newSet.delete(p.id_contato);
                          setSelectedParticipantIds(newSet);
                        }}
                        className="w-5 h-5 rounded-md border-slate-300 text-emerald-500 focus:ring-emerald-500"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-bold text-slate-800">{p.nome || 'Sem Nome'}</p>
                        <p className="text-xs text-slate-500 font-medium">{p.telefone}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleSendMessage}
                  disabled={sending || selectedParticipantIds.size === 0 || whatsappStatus?.status !== 'READY'}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-6 rounded-3xl font-black text-[12px] uppercase tracking-[0.2em] flex items-center justify-center gap-4 transition-all shadow-2xl shadow-slate-900/20 active:scale-95 disabled:opacity-50 disabled:scale-100"
                >
                  {sending ? (
                    <><RefreshCw size={24} className="animate-spin text-emerald-400" /> PROCESSANDO DISPARO...</>
                  ) : (
                    <><Send size={24} className="text-emerald-400" /> ENVIAR TRANSMISSÃO</>
                  )}
                </button>

                <button
                  onClick={() => {
                    if (selectedCity && !newGroupName) setNewGroupName(`Grupo ${selectedCity}`)
                    setShowCreateGroupModal(true)
                  }}
                  disabled={selectedParticipantIds.size === 0 || whatsappStatus?.status !== 'READY'}
                  className="bg-emerald-50 text-emerald-600 px-8 py-6 rounded-3xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-100 transition-all active:scale-95 disabled:opacity-50"
                >
                  CRIAR GRUPO
                </button>
              </div>

              {error && <div className="mt-6 p-5 bg-red-50 text-red-600 rounded-2xl text-xs font-bold border border-red-100 animate-in slide-in-from-bottom-2 duration-300 flex items-center gap-3"><XCircle size={18} /> {error}</div>}
              {success && <div className="mt-6 p-5 bg-emerald-50 text-emerald-700 rounded-2xl text-xs font-bold border border-emerald-100 animate-in slide-in-from-bottom-2 duration-300 flex items-center gap-3"><CheckCircle size={18} /> {success}</div>}
            </div>
          </div>
        </div>
      </div>

      {/* Create Group Modal */}
      {showCreateGroupModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-10 border-b border-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight italic">Novo Grupo</h3>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Criar grupo com {selectedParticipantIds.size} participantes</p>
              </div>
              <button onClick={() => setShowCreateGroupModal(false)} className="p-3 hover:bg-slate-50 rounded-2xl text-slate-400 transition-all font-bold">X</button>
            </div>
            <div className="p-10 space-y-8">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome do Grupo</label>
                <input
                  type="text"
                  placeholder="Ex: Alunos de São Paulo"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full bg-slate-50 border-none rounded-2xl py-5 px-8 text-lg font-black text-slate-800 focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-inner"
                />
              </div>

              <button
                onClick={handleCreateGroup}
                disabled={isCreatingGroup || !newGroupName.trim()}
                className="w-full py-6 bg-slate-900 text-white font-black text-xs uppercase tracking-[0.2em] rounded-3xl transition-all shadow-xl shadow-slate-900/10 active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {isCreatingGroup ? (
                  <RefreshCw size={20} className="animate-spin text-emerald-400" />
                ) : (
                  <PlusCircle size={20} className="text-emerald-400" />
                )}
                CRIAR GRUPO AGORA
              </button>

              <p className="text-[10px] text-slate-400 text-center font-bold uppercase leading-relaxed">
                Nota: Todos os participantes selecionados serão adicionados ao grupo de uma vez.
              </p>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
