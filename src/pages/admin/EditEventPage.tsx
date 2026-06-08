import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Image as ImageIcon,
  Globe, Shield, Users, Save, X, MapPin, Plus, Lock, Unlock, Trash2
} from 'lucide-react'
import LoadingScreen from '@/components/ui/LoadingScreen'
import { apiFetch, getApiUrl, normalizeImageUrl } from '@/lib/api'
import { useAuth } from '@/lib/useAuth'
import AdminLayout from '@/components/layouts/AdminLayout'

interface EventCity {
  id: string
  municipality: string
  state: string
  status: 'OPEN' | 'FULL' | 'CLOSED'
  message: string | null
  defaultLimit?: number
  registrationCount?: number
  isClosed?: boolean
  closedMessage?: string | null
}

const eventSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().min(1, 'Descrição é obrigatória'),
  bannerUrl: z.string().optional().or(z.literal('')).transform((val) => {
    return val && val.trim() ? val.trim() : undefined
  }).refine(
    (val) =>
      !val ||
      val.startsWith('/') ||
      val.startsWith('http://') ||
      val.startsWith('https://') ||
      val.startsWith('data:image/'),
    { message: 'URL inválida' }
  ),
  status: z.enum(['ACTIVE', 'INACTIVE', 'CLOSED']).default('ACTIVE'),
  maxRegistrations: z.string().optional().transform((val) => {
    if (!val || !val.trim()) return ''
    const parsed = parseInt(val, 10)
    return Number.isNaN(parsed) ? '' : String(parsed)
  }),
  slug: z.string().optional().transform((val) => {
    if (!val || typeof val !== 'string' || !val.trim()) return undefined
    return val.trim().toLowerCase()
  }).refine(
    (val) => !val || /^[a-z0-9-]+$/.test(val),
    { message: 'URL personalizada deve conter apenas letras minúsculas, números e hífens' }
  ),
})

type EventFormData = z.infer<typeof eventSchema>

interface EventResponse {
  id: string
  title: string
  description: string
  bannerUrl?: string | null
  status: 'ACTIVE' | 'INACTIVE' | 'CLOSED'
  maxRegistrations?: number | null
  slug?: string | null
}

export default function EditEventPage() {
  const navigate = useNavigate()
  const { eventId } = useParams<{ eventId: string }>()
  const { loading: authLoading } = useAuth({
    requireAuth: true,
    redirectTo: '/login',
  })
  const [pageLoading, setPageLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [bannerPreview, setBannerPreview] = useState<string | null>(null)

  // Participating cities state
  const [eventCities, setEventCities] = useState<EventCity[]>([])
  const [newCity, setNewCity] = useState({ municipality: '', state: '', defaultLimit: '' })
  const [addingCity, setAddingCity] = useState(false)
  const [cityActionLoading, setCityActionLoading] = useState<string | null>(null)
  const [editingMessages, setEditingMessages] = useState<Record<string, string>>({})
  const [editingLimits, setEditingLimits] = useState<Record<string, string>>({})
  const [cityFeedback, setCityFeedback] = useState<{ id: string; msg: string; type: 'ok' | 'err' } | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors }
  } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      status: 'ACTIVE',
      maxRegistrations: '',
    }
  })

  const bannerUrl = watch('bannerUrl')
  const slugValue = watch('slug')
  const publicUrl = slugValue?.trim()
    ? `${window.location.origin}/e/${slugValue.trim()}`
    : null

  useEffect(() => {
    if (!eventId) {
      setError('Evento não informado')
      setPageLoading(false)
      return
    }

    const loadEvent = async () => {
      try {
        setPageLoading(true)
        const data = await apiFetch<EventResponse>(`/admin/events/${eventId}`, {
          auth: true,
        })

        reset({
          title: data.title,
          description: data.description,
          bannerUrl: data.bannerUrl || undefined,
          status: data.status,
          maxRegistrations:
            data.maxRegistrations === null || data.maxRegistrations === undefined
              ? ''
              : String(data.maxRegistrations),
          slug: data.slug || undefined,
        })

        setBannerPreview(data.bannerUrl || null)
      } catch (err: any) {
        setError(err?.message || 'Erro ao carregar evento')
      } finally {
        setPageLoading(false)
      }
    }

    loadEvent()
    loadCities()
  }, [eventId, reset])

  const loadCities = async () => {
    if (!eventId) return
    try {
      const data = await apiFetch<EventCity[]>(`/admin/events/${eventId}/cities`, { auth: true })
      if (Array.isArray(data)) setEventCities(data)
    } catch { /* no cities yet */ }
  }

  const showFeedback = (id: string, msg: string, type: 'ok' | 'err') => {
    setCityFeedback({ id, msg, type })
    setTimeout(() => setCityFeedback(null), 3000)
  }

  const handleAddCity = async () => {
    if (!newCity.municipality.trim() || !newCity.state.trim()) return
    setAddingCity(true)
    try {
      await apiFetch(`/admin/events/${eventId}/cities`, {
        method: 'POST',
        auth: true,
        body: JSON.stringify({
          municipality: newCity.municipality.trim(),
          state: newCity.state.trim().toUpperCase(),
          defaultLimit: newCity.defaultLimit ? Number(newCity.defaultLimit) : 0,
        }),
      })
      setNewCity({ municipality: '', state: '', defaultLimit: '' })
      await loadCities()
    } catch (err: any) {
      setError(err?.message || 'Erro ao adicionar cidade')
    } finally {
      setAddingCity(false)
    }
  }

  const handleToggleClosed = async (city: EventCity) => {
    setCityActionLoading(city.id)
    const willClose = !city.isClosed
    try {
      await apiFetch(`/admin/events/${eventId}/cities/${city.id}/status`, {
        method: 'PATCH',
        auth: true,
        body: JSON.stringify({ isClosed: willClose }),
      })
      await loadCities()
      showFeedback(city.id, willClose ? 'Inscrições encerradas.' : 'Inscrições reabertas.', 'ok')
    } catch (err: any) {
      showFeedback(city.id, err?.message || 'Erro ao atualizar.', 'err')
    } finally {
      setCityActionLoading(null)
    }
  }

  const handleSaveMessage = async (city: EventCity) => {
    setCityActionLoading(city.id + '-msg')
    try {
      await apiFetch(`/admin/events/${eventId}/cities/${city.id}/status`, {
        method: 'PATCH',
        auth: true,
        body: JSON.stringify({ closedMessage: editingMessages[city.id] ?? city.closedMessage ?? '' }),
      })
      await loadCities()
      showFeedback(city.id + '-msg', 'Mensagem salva.', 'ok')
    } catch (err: any) {
      showFeedback(city.id + '-msg', err?.message || 'Erro ao salvar.', 'err')
    } finally {
      setCityActionLoading(null)
    }
  }

  const handleSaveLimit = async (city: EventCity) => {
    const raw = editingLimits[city.id]
    if (raw === undefined) return
    const parsed = raw.trim() === '' ? 0 : parseInt(raw, 10)
    if (isNaN(parsed) || parsed < 0) {
      showFeedback(city.id + '-limit', 'Limite inválido.', 'err')
      return
    }
    setCityActionLoading(city.id + '-limit')
    try {
      await apiFetch(`/admin/events/${eventId}/cities/${city.id}/status`, {
        method: 'PATCH',
        auth: true,
        body: JSON.stringify({ defaultLimit: parsed }),
      })
      setEditingLimits((p) => { const n = { ...p }; delete n[city.id]; return n })
      await loadCities()
      showFeedback(city.id + '-limit', parsed === 0 ? 'Limite removido (ilimitado).' : `Limite definido: ${parsed} vagas.`, 'ok')
    } catch (err: any) {
      showFeedback(city.id + '-limit', err?.message || 'Erro ao salvar limite.', 'err')
    } finally {
      setCityActionLoading(null)
    }
  }

  const handleFileUpload = async (file: File) => {
    setUploading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const uploadUrl = `${getApiUrl()}/admin/upload`
      const token = localStorage.getItem('token')
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      if (!response.ok) throw new Error('Erro no upload')
      const data = await response.json()
      const imageUrl = data.url || data.path
      setValue('bannerUrl', imageUrl, { shouldValidate: true, shouldDirty: true })
      setBannerPreview(imageUrl)
    } catch (err: any) {
      setError(err?.message || 'Erro ao fazer upload')
    } finally {
      setUploading(false)
    }
  }

  const onSubmit = async (data: EventFormData) => {
    if (!eventId) return

    setSubmitting(true)
    setError(null)
    try {
      await apiFetch(`/admin/events/${eventId}`, {
        method: 'PATCH',
        auth: true,
        body: JSON.stringify({
          title: data.title,
          description: data.description,
          bannerUrl: data.bannerUrl || '',
          status: data.status,
          maxRegistrations: data.maxRegistrations ? Number(data.maxRegistrations) : null,
          slug: data.slug || '',
        }),
      })

      navigate('/admin/events')
    } catch (err: any) {
      setError(err?.message || 'Erro ao atualizar evento')
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading || pageLoading) return <LoadingScreen />

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto py-8 px-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/admin/events')}
              className="p-3 bg-white hover:bg-[var(--bg-main)] text-[var(--text-muted)] rounded-2xl border border-[var(--border-light)] transition-all shadow-sm active:scale-90"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-3xl font-black text-[var(--secondary)] tracking-tight">
                Editar <span className="text-indigo-600">Evento</span>
              </h1>
              <p className="text-[var(--text-muted)] font-medium text-sm mt-1">Atualize o link, banner e configurações do evento.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/admin/events')}
              className="px-6 py-3.5 bg-white text-[var(--text-muted)] font-bold rounded-2xl border border-[var(--border-light)] hover:bg-slate-50 transition-all text-xs"
            >
              CANCELAR
            </button>
            <button
              onClick={handleSubmit(onSubmit)}
              disabled={submitting}
              className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-xl shadow-indigo-600/20 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50 text-xs"
            >
              {submitting ? 'SALVANDO...' : <><Save size={18} /> SALVAR ALTERAÇÕES</>}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-50 border-l-4 border-red-500 rounded-xl text-red-700 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
            <X size={20} className="shrink-0" />
            <p className="text-sm font-bold">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <section className="bg-white rounded-[2.5rem] border border-[var(--border-light)] p-8 shadow-sm">
              <h2 className="text-lg font-black text-[var(--secondary)] mb-6 flex items-center gap-2">
                Informações Básicas <Globe size={20} className="text-indigo-600" />
              </h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2 px-1">Título do Evento</label>
                  <input
                    type="text"
                    {...register('title')}
                    className="w-full bg-[var(--bg-main)]/50 border-2 border-transparent focus:border-indigo-600/20 rounded-2xl px-5 py-4 text-sm font-bold text-[var(--secondary)] transition-all outline-none"
                    placeholder="Ex: Workshop de Liderança 2024"
                  />
                  {errors.title && <p className="text-red-500 text-[10px] font-bold mt-1.5 px-1">{errors.title.message}</p>}
                </div>

                <div>
                  <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2 px-1">Descrição / Detalhes</label>
                  <textarea
                    {...register('description')}
                    rows={5}
                    className="w-full bg-[var(--bg-main)]/50 border-2 border-transparent focus:border-indigo-600/20 rounded-2xl px-5 py-4 text-sm font-medium text-[var(--secondary)] transition-all outline-none resize-none"
                    placeholder="Descreva o que os participantes encontrarão neste evento..."
                  />
                  {errors.description && <p className="text-red-500 text-[10px] font-bold mt-1.5 px-1">{errors.description.message}</p>}
                </div>
              </div>
            </section>

            <section className="bg-white rounded-[2.5rem] border border-[var(--border-light)] p-8 shadow-sm">
              <h2 className="text-lg font-black text-[var(--secondary)] mb-6 flex items-center gap-2">
                Link Público <ImageIcon size={20} className="text-purple-600" />
              </h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2 px-1">URL Personalizada (Slug)</label>
                  <div className="flex items-center gap-3 bg-[var(--bg-main)]/50 rounded-2xl px-5 py-1 border-2 border-transparent focus-within:border-indigo-600/20 transition-all">
                    <span className="text-[var(--text-muted)] text-[10px] font-bold py-3">/e/</span>
                    <input
                      type="text"
                      {...register('slug')}
                      className="bg-transparent border-none flex-1 py-3 text-sm font-bold text-indigo-600 outline-none"
                      placeholder="lancamento-vip"
                    />
                  </div>
                  <p className="text-[9px] text-[var(--text-muted)] font-medium mt-2 px-1 uppercase tracking-tighter">Use hífens para separar palavras. Ex: workshop-gratis</p>
                  {publicUrl && (
                    <p className="text-[10px] text-indigo-600 font-bold mt-2 px-1 break-all">
                      {publicUrl}
                    </p>
                  )}
                  {errors.slug && <p className="text-red-500 text-[10px] font-bold mt-1.5 px-1">{errors.slug.message}</p>}
                </div>

                <div>
                  <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-3 px-1">Banner de Capa (Opcional)</label>
                  <div className="relative group cursor-pointer overflow-hidden rounded-[2rem] border-2 border-dashed border-[var(--border-light)] hover:border-indigo-600 transition-all aspect-video flex flex-col items-center justify-center bg-[var(--bg-main)]/30">
                    {(bannerPreview || bannerUrl) ? (
                      <img src={normalizeImageUrl(bannerUrl || bannerPreview || '')} className="w-full h-full object-cover" alt="Banner preview" />
                    ) : (
                      <>
                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-indigo-600 mb-4 shadow-sm border border-[var(--border-light)]">
                          <ImageIcon size={32} />
                        </div>
                        <p className="text-xs font-bold text-[var(--secondary)] mb-1">Upload de Banner</p>
                        <p className="text-[10px] text-[var(--text-muted)] font-medium">Recomendado: 1200x630px</p>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                      disabled={uploading}
                    />
                  </div>
                  <div className="mt-4">
                    <input
                      type="text"
                      {...register('bannerUrl')}
                      className="w-full bg-[var(--bg-main)]/50 border-2 border-transparent focus:border-indigo-600/20 rounded-2xl px-5 py-3 text-[11px] font-medium text-[var(--text-muted)] transition-all outline-none"
                      placeholder="Ou cole a URL da imagem aqui..."
                    />
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Participating Cities */}
          <section className="bg-white rounded-[2.5rem] border border-[var(--border-light)] p-8 shadow-sm lg:col-span-3">
            <h2 className="text-lg font-black text-[var(--secondary)] mb-6 flex items-center gap-2">
              Cidades Participantes <MapPin size={20} className="text-indigo-600" />
            </h2>

            {/* Add new city */}
            <div className="flex flex-wrap gap-3 mb-6 p-4 bg-[var(--bg-main)]/60 rounded-2xl border border-[var(--border-light)]">
              <input
                type="text"
                placeholder="Município"
                value={newCity.municipality}
                onChange={(e) => setNewCity((p) => ({ ...p, municipality: e.target.value }))}
                className="flex-1 min-w-[160px] bg-white border border-[var(--border-light)] rounded-xl px-4 py-3 text-sm font-bold text-[var(--secondary)] outline-none focus:border-indigo-500 transition-all"
              />
              <input
                type="text"
                placeholder="UF"
                maxLength={2}
                value={newCity.state}
                onChange={(e) => setNewCity((p) => ({ ...p, state: e.target.value.toUpperCase() }))}
                className="w-20 bg-white border border-[var(--border-light)] rounded-xl px-4 py-3 text-sm font-bold text-[var(--secondary)] outline-none focus:border-indigo-500 transition-all uppercase"
              />
              <input
                type="number"
                placeholder="Limite (0 = ilimitado)"
                value={newCity.defaultLimit}
                onChange={(e) => setNewCity((p) => ({ ...p, defaultLimit: e.target.value }))}
                className="flex-1 min-w-[160px] bg-white border border-[var(--border-light)] rounded-xl px-4 py-3 text-sm font-bold text-[var(--secondary)] outline-none focus:border-indigo-500 transition-all"
              />
              <button
                type="button"
                disabled={addingCity || !newCity.municipality.trim() || !newCity.state.trim()}
                onClick={handleAddCity}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={16} /> {addingCity ? 'ADICIONANDO...' : 'ADICIONAR'}
              </button>
            </div>

            {/* Cities list */}
            {eventCities.length === 0 ? (
              <p className="text-center text-[var(--text-muted)] text-sm font-medium py-8">
                Nenhuma cidade configurada. Adicione cidades acima para controlar as vagas por município.
              </p>
            ) : (
              <div className="space-y-3">
                {eventCities.map((city) => {
                  const lockLoading = cityActionLoading === city.id
                  const msgLoading = cityActionLoading === city.id + '-msg'
                  const limitLoading = cityActionLoading === city.id + '-limit'
                  const msgValue = editingMessages[city.id] !== undefined ? editingMessages[city.id] : (city.closedMessage ?? '')
                  const limitValue = editingLimits[city.id] !== undefined ? editingLimits[city.id] : String(city.defaultLimit ?? 0)
                  const limitDirty = editingLimits[city.id] !== undefined
                  const feedbackKey = [city.id, city.id + '-msg', city.id + '-limit']
                  const feedback = feedbackKey.includes(cityFeedback?.id ?? '') ? cityFeedback : null
                  const count = city.registrationCount ?? 0
                  const limit = city.defaultLimit ?? 0
                  return (
                    <div key={city.id} className={`p-4 rounded-2xl border-2 transition-all ${city.isClosed ? 'border-red-200 bg-red-50/40' : city.status === 'FULL' ? 'border-orange-200 bg-orange-50/40' : 'border-[var(--border-light)] bg-white'}`}>
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-[var(--secondary)]">{city.municipality} — <span className="text-indigo-600">{city.state}</span></p>
                          <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mt-0.5">
                            <span className="text-[var(--secondary)]">{count}</span> inscrições
                            {limit > 0 ? <> · <span className="text-[var(--secondary)]">{limit}</span> vagas</> : ' · Sem limite'}
                          </p>
                          {limit > 0 && (
                            <div className="mt-1.5 h-1.5 bg-slate-200 rounded-full overflow-hidden w-32">
                              <div
                                className={`h-full rounded-full transition-all ${count >= limit ? 'bg-orange-500' : 'bg-emerald-500'}`}
                                style={{ width: `${Math.min(100, (count / limit) * 100)}%` }}
                              />
                            </div>
                          )}
                        </div>

                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                          city.isClosed ? 'bg-red-100 text-red-600'
                          : city.status === 'FULL' ? 'bg-orange-100 text-orange-600'
                          : 'bg-emerald-100 text-emerald-600'
                        }`}>
                          {city.isClosed ? 'ENCERRADA' : city.status === 'FULL' ? 'LOTADA' : 'ABERTA'}
                        </span>

                        <button
                          type="button"
                          disabled={lockLoading}
                          onClick={() => handleToggleClosed(city)}
                          title={city.isClosed ? 'Reabrir inscrições' : 'Encerrar inscrições'}
                          className={`p-2.5 rounded-xl border transition-all disabled:opacity-50 active:scale-90 ${city.isClosed ? 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100' : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'}`}
                        >
                          {lockLoading
                            ? <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                            : city.isClosed ? <Unlock size={16} /> : <Lock size={16} />
                          }
                        </button>
                      </div>

                      {/* Limit editor */}
                      <div className="flex gap-2 mt-3 items-center">
                        <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest whitespace-nowrap">Vagas:</label>
                        <input
                          type="number"
                          min={0}
                          value={limitValue}
                          onChange={(e) => setEditingLimits((p) => ({ ...p, [city.id]: e.target.value }))}
                          placeholder="0 = ilimitado"
                          className={`w-36 bg-[var(--bg-main)]/60 border rounded-xl px-3 py-2 text-xs font-bold text-[var(--secondary)] outline-none transition-all ${limitDirty ? 'border-indigo-400' : 'border-[var(--border-light)]'} focus:border-indigo-500`}
                        />
                        <span className="text-[9px] text-[var(--text-muted)] font-medium">0 = ilimitado</span>
                        {limitDirty && (
                          <button
                            type="button"
                            disabled={limitLoading}
                            onClick={() => handleSaveLimit(city)}
                            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[9px] uppercase rounded-xl transition-all disabled:opacity-50 flex items-center gap-1 ml-auto"
                          >
                            {limitLoading ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Save size={11} /> SALVAR</>}
                          </button>
                        )}
                      </div>

                      {/* Message editor */}
                      <div className="flex gap-2 mt-2">
                        <input
                          type="text"
                          placeholder="Mensagem quando encerrada/lotada (opcional)"
                          value={msgValue}
                          onChange={(e) => setEditingMessages((p) => ({ ...p, [city.id]: e.target.value }))}
                          className="flex-1 bg-[var(--bg-main)]/60 border border-[var(--border-light)] rounded-xl px-4 py-2.5 text-xs font-medium text-[var(--secondary)] outline-none focus:border-indigo-500 transition-all"
                        />
                        <button
                          type="button"
                          disabled={msgLoading}
                          onClick={() => handleSaveMessage(city)}
                          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase rounded-xl transition-all disabled:opacity-50 flex items-center gap-1.5 min-w-[80px] justify-center"
                        >
                          {msgLoading ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'SALVAR'}
                        </button>
                      </div>

                      {feedback && (
                        <div className={`mt-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wide flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200 ${feedback.type === 'ok' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                          {feedback.type === 'ok'
                            ? <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                            : <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          }
                          {feedback.msg}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          <div className="space-y-8">
            <section className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/20 rounded-full blur-3xl -mr-16 -mt-16 transition-transform group-hover:scale-125"></div>
              <h3 className="text-lg font-black mb-6 relative z-10 flex items-center gap-2">Configurações <Shield size={18} className="text-indigo-400" /></h3>

              <div className="space-y-6 relative z-10">
                <div>
                  <label className="block text-[9px] font-black text-white/50 uppercase tracking-widest mb-2 px-1">Status do Evento</label>
                  <div className="grid grid-cols-3 gap-1 p-1 bg-white/10 rounded-2xl">
                    {(['ACTIVE', 'INACTIVE', 'CLOSED'] as const).map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setValue('status', status)}
                        className={`py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${
                          watch('status') === status ? 'bg-indigo-600 text-white shadow-lg' : 'text-white/40 hover:text-white'
                        }`}
                      >
                        {status === 'ACTIVE' ? 'ATIVO' : status === 'INACTIVE' ? 'INATIVO' : 'ENCERRADO'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-black text-white/50 uppercase tracking-widest mb-2 px-1 flex items-center justify-between">
                    <span>Limite de Vagas</span>
                    <span className="text-indigo-400 text-[8px]">Opcional</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      {...register('maxRegistrations')}
                      className="w-full bg-white/10 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold text-white outline-none focus:border-indigo-500/50 transition-all pr-12"
                      placeholder="Ex: 100"
                    />
                    <Users size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30" />
                  </div>
                </div>
              </div>
            </section>

            <div className="bg-white rounded-[2.5rem] border border-[var(--border-light)] p-8 text-center shadow-sm">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Shield size={24} />
              </div>
              <h4 className="text-sm font-black text-[var(--secondary)] mb-2">Atualizar agora?</h4>
              <p className="text-[10px] text-[var(--text-muted)] font-medium mb-6">As alterações ficam disponíveis logo após salvar.</p>
              <button
                onClick={handleSubmit(onSubmit)}
                className="w-full py-4 bg-[var(--bg-main)] hover:bg-slate-100 text-[var(--secondary)] font-black text-[10px] uppercase rounded-2xl transition-all"
              >
                SALVAR EVENTO
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
