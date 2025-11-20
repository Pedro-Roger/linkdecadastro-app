import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import MobileNavbar from '@/components/ui/MobileNavbar'
import Footer from '@/components/ui/Footer'
import { apiFetch, getApiUrl, normalizeImageUrl } from '@/lib/api'
import { useAuth } from '@/lib/useAuth'

interface EventItem {
  id: string
  title: string
  description: string
  bannerUrl?: string | null
  linkId: string
  status: 'ACTIVE' | 'INACTIVE' | 'CLOSED'
  createdAt: string
  maxRegistrations?: number | null
  _count?: {
    registrations: number
  }
}

interface ShareData {
  url: string
  bannerUrl?: string
  message: string
}

export default function AdminEventsPage() {
  const navigate = useNavigate()
  const { user, loading, isAuthenticated } = useAuth({ requireAuth: true, redirectTo: '/login' })
  const [events, setEvents] = useState<EventItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE' | 'CLOSED'>('ALL')
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [copyStatus, setCopyStatus] = useState<'idle' | 'success'>('idle')
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    bannerUrl: '',
    maxRegistrations: '',
  })

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated || user?.role !== 'ADMIN') {
        navigate('/my-courses')
      } else {
        fetchEvents()
      }
    }
  }, [loading, isAuthenticated, user, navigate])

  async function fetchEvents() {
    try {
      setIsLoading(true)
      setError(null)
      const data = await apiFetch<EventItem[]>('/events', { auth: true })
      setEvents(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar eventos')
    } finally {
      setIsLoading(false)
    }
  }

  const filteredEvents = useMemo(() => {
    return events
      .filter((event) => {
        if (statusFilter === 'ALL') return true
        return event.status === statusFilter
      })
      .filter((event) => {
        if (!searchTerm.trim()) return true
        const term = searchTerm.toLowerCase()
        return (
          event.title.toLowerCase().includes(term) ||
          event.description.toLowerCase().includes(term) ||
          event.linkId.toLowerCase().includes(term)
        )
      })
  }, [events, statusFilter, searchTerm])

  const buildShareData = (eventItem: EventItem): ShareData => {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const url = origin ? `${origin}/register/${eventItem.linkId}` : `/register/${eventItem.linkId}`

    let bannerUrl = eventItem.bannerUrl ?? undefined
    if (bannerUrl && bannerUrl.startsWith('/')) {
      bannerUrl = origin ? `${origin}${bannerUrl}` : bannerUrl
    }

    return {
      url,
      bannerUrl,
      message: `Confira o link de cadastro "${eventItem.title}" no Link de Cadastro: ${url}`,
    }
  }

  const selectedShareData = useMemo(() => {
    if (!selectedEvent) return null
    return buildShareData(selectedEvent)
  }, [selectedEvent])

  const openCreateModal = () => {
    setCreateError(null)
    setNewEvent({ title: '', description: '', bannerUrl: '', maxRegistrations: '' })
    setCreateModalOpen(true)
  }

  const closeCreateModal = () => {
    setCreateModalOpen(false)
  }

  const openShareModal = (eventItem: EventItem) => {
    setSelectedEvent(eventItem)
    setCopyStatus('idle')
    setShareModalOpen(true)
  }

  const closeShareModal = () => {
    setShareModalOpen(false)
  }

  const handleCopyLink = async () => {
    if (!selectedShareData) return
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(selectedShareData.url)
        setCopyStatus('success')
        setTimeout(() => setCopyStatus('idle'), 2000)
      }
    } catch (err) {
    }
  }

  const handleShareNow = async () => {
    if (!selectedShareData || !selectedEvent) return
    const sharePayload = {
      title: selectedEvent.title,
      text: selectedShareData.message,
      url: selectedShareData.url,
    }
    try {
      if (navigator.share) {
        await navigator.share(sharePayload)
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(selectedShareData.message)
        setCopyStatus('success')
        setTimeout(() => setCopyStatus('idle'), 2000)
      }
    } catch (err) {
    }
  }

  const handleShareWhatsapp = (shareData: ShareData, event?: EventItem) => {
    // Usa a URL do frontend que funciona corretamente
    const message = shareData.message
    const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`
    window.open(waUrl, '_blank', 'noopener,noreferrer')
  }

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setCreateError(null)
    try {
      const payload: Record<string, any> = {
        title: newEvent.title,
        description: newEvent.description,
      }
      if (newEvent.bannerUrl.trim()) {
        payload.bannerUrl = newEvent.bannerUrl.trim()
      }
      if (newEvent.maxRegistrations.trim()) {
        const value = Number(newEvent.maxRegistrations)
        if (Number.isNaN(value) || value < 0) {
          throw new Error('Informe um limite válido de vagas')
        }
        payload.maxRegistrations = value
      }

      await apiFetch('/events', {
        method: 'POST',
        auth: true,
        body: JSON.stringify(payload),
      })

      await fetchEvents()
      setCreateModalOpen(false)
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Erro ao criar evento')
    } finally {
      setCreating(false)
    }
  }

  const handleUpdateStatus = async (eventItem: EventItem, newStatus: 'ACTIVE' | 'INACTIVE' | 'CLOSED') => {
    try {
      await apiFetch(`/admin/events/${eventItem.id}`, {
        method: 'PATCH',
        auth: true,
        body: JSON.stringify({ status: newStatus }),
      })

      await fetchEvents()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao atualizar status')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <MobileNavbar />

      <main className="flex-1">
        <div className="container mx-auto px-4 py-6">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[#003366]">Histórico de Links</h1>
              <p className="text-gray-600 text-sm">Gerencie os links de cadastro criados para eventos e campanhas.</p>
            </div>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 rounded-lg bg-[#FF6600] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#e55a00]"
            >
              <span className="text-lg">+</span>
              Novo link
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4 md:p-6 space-y-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-1 items-center gap-3">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por título, descrição ou link"
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-[#FF6600]"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-500">Status:</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-[#FF6600]"
                >
                  <option value="ALL">Todos</option>
                  <option value="ACTIVE">Ativos</option>
                  <option value="INACTIVE">Inativos</option>
                  <option value="CLOSED">Encerrados</option>
                </select>
              </div>
            </div>

            {isLoading ? (
              <div className="py-16 text-center text-gray-500">Carregando links...</div>
            ) : error ? (
              <div className="py-16 text-center text-red-500">{error}</div>
            ) : filteredEvents.length === 0 ? (
              <div className="py-16 text-center text-gray-500">Nenhum link encontrado.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Título</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Link</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Criado em</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Inscritos</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredEvents.map((event) => {
                      const shareData = buildShareData(event)
                      return (
                        <tr key={event.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 align-top">
                            <div className="font-semibold text-[#003366]">{event.title}</div>
                            <div className="text-xs text-gray-500 line-clamp-2">{event.description}</div>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <span className="truncate max-w-[240px]">{shareData.url}</span>
                              <button
                                onClick={async () => {
                                  try {
                                    if (navigator.clipboard?.writeText) {
                                      await navigator.clipboard.writeText(shareData.url)
                                      alert('Link copiado!')
                                    }
                                  } catch (err) {
                                  }
                                }}
                                className="rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100"
                              >
                                Copiar
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3 align-top text-xs text-gray-600">
                            {format(new Date(event.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </td>
                          <td className="px-4 py-3 align-top text-xs text-gray-600">
                            {event._count?.registrations ?? 0}
                          </td>
                          <td className="px-4 py-3 align-top">
                            <span
                              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                                event.status === 'ACTIVE'
                                  ? 'bg-green-100 text-green-700'
                                  : event.status === 'INACTIVE'
                                  ? 'bg-gray-100 text-gray-700'
                                  : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {event.status === 'ACTIVE'
                                ? 'Ativo'
                                : event.status === 'INACTIVE'
                                ? 'Inativo'
                                : 'Encerrado'}
                            </span>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <div className="flex flex-col gap-2">
                              <Link
                                to={`/admin/events/${event.id}/registrations`}
                                className="rounded-md bg-[#FF6600] px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-[#e55a00] text-center"
                              >
                                Ver Registros
                              </Link>
                              <Link
                                to={`/admin/events/${event.id}/classes`}
                                className="rounded-md bg-[#003366] px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-[#00264d] text-center"
                              >
                                Ver Turmas
                              </Link>
                              <button
                                onClick={() => openShareModal(event)}
                                className="rounded-md bg-[#003366] px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-[#00264d]"
                              >
                                Compartilhar
                              </button>
                              <button
                                onClick={() => handleShareWhatsapp(shareData, event)}
                                className="rounded-md bg-green-600 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-green-700"
                              >
                                WhatsApp
                              </button>
                              {event.status !== 'ACTIVE' && (
                                <button
                                  onClick={() => handleUpdateStatus(event, 'ACTIVE')}
                                  className="rounded-md border border-[#FF6600] px-3 py-1 text-xs font-semibold text-[#FF6600] transition-colors hover:bg-orange-50"
                                >
                                  Ativar
                                </button>
                              )}
                              {event.status === 'ACTIVE' && (
                                <button
                                  onClick={() => handleUpdateStatus(event, 'INACTIVE')}
                                  className="rounded-md border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-100"
                                >
                                  Inativar
                                </button>
                              )}
                              {event.status !== 'CLOSED' && (
                                <button
                                  onClick={() => handleUpdateStatus(event, 'CLOSED')}
                                  className="rounded-md border border-red-500 px-3 py-1 text-xs font-semibold text-red-500 transition-colors hover:bg-red-50"
                                >
                                  Encerrar
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />

      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-semibold text-[#003366]">Criar novo link</h2>
              <button
                onClick={closeCreateModal}
                className="text-gray-400 transition-colors hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreateEvent} className="space-y-4 px-6 py-6">
              <div>
                <label className="text-sm font-medium text-gray-700">Título *</label>
                <input
                  type="text"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent((prev) => ({ ...prev, title: e.target.value }))}
                  required
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-[#FF6600]"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Descrição *</label>
                <textarea
                  value={newEvent.description}
                  onChange={(e) => setNewEvent((prev) => ({ ...prev, description: e.target.value }))}
                  required
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-[#FF6600]"
                />
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-gray-700">Banner (URL)</label>
                  <input
                    type="url"
                    value={newEvent.bannerUrl}
                    onChange={(e) => setNewEvent((prev) => ({ ...prev, bannerUrl: e.target.value }))}
                    placeholder="https://..."
                    className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-[#FF6600]"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Limite de vagas (opcional)</label>
                  <input
                    type="number"
                    min={0}
                    value={newEvent.maxRegistrations}
                    onChange={(e) => setNewEvent((prev) => ({ ...prev, maxRegistrations: e.target.value }))}
                    placeholder="Ex: 100"
                    className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-[#FF6600]"
                  />
                </div>
              </div>
              {createError && <p className="text-sm text-red-500">{createError}</p>}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-lg bg-[#FF6600] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#e55a00] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {creating ? 'Criando...' : 'Criar link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {shareModalOpen && selectedEvent && selectedShareData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-[#003366]">Compartilhar link</h3>
                <p className="text-sm text-gray-500">Revise as informações antes de enviar</p>
              </div>
              <button onClick={closeShareModal} className="text-gray-400 transition-colors hover:text-gray-600">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid gap-4 px-6 py-4 md:grid-cols-[160px,1fr]">
              <div className="flex items-center justify-center">
                {selectedShareData.bannerUrl ? (
                  <img
                    src={normalizeImageUrl(selectedShareData.bannerUrl)} alt={`Banner do evento ${selectedEvent.title}`}
                    className="h-32 w-32 rounded-lg object-cover shadow-sm"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex h-32 w-32 items-center justify-center rounded-lg bg-gradient-to-br from-[#003366] to-[#FF6600] text-center text-xs font-semibold text-white">
                    Sem banner
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#003366]">{selectedEvent.title}</p>
                  <p className="mt-1 text-sm text-gray-600 line-clamp-3">{selectedEvent.description}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Link do evento</label>
                  <div className="mt-1 grid grid-cols-[1fr,auto] gap-2 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                    <input
                      readOnly
                      value={selectedShareData.url}
                      className="truncate bg-transparent px-3 py-2 text-sm text-gray-700 outline-none"
                    />
                    <button
                      onClick={handleCopyLink}
                      className="m-1 flex items-center justify-center rounded-md bg-white px-3 text-xs font-semibold text-[#003366] transition-colors hover:bg-gray-100"
                    >
                      {copyStatus === 'success' ? 'Copiado!' : 'Copiar'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t bg-gray-50 px-6 py-4 md:flex-row md:justify-end">
              <button
                onClick={handleShareNow}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#003366] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#00264d]"
              >
                Compartilhar agora
              </button>
              <button
                onClick={() => selectedShareData && selectedEvent && handleShareWhatsapp(selectedShareData, selectedEvent)}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700"
              >
                WhatsApp
              </button>
              <button
                onClick={closeShareModal}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-100"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
