import { useEffect, useMemo, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Plus, Search, Filter, Calendar, Users, MoreHorizontal,
  ArrowRight, Link as LinkIcon, Share2, Copy, Trash2, CheckCircle, XCircle, LayoutGrid, MessageCircle, Pencil
} from 'lucide-react'
import LoadingScreen from '@/components/ui/LoadingScreen'
import { apiFetch, normalizeImageUrl } from '@/lib/api'
import { useAuth } from '@/lib/useAuth'
import AdminLayout from '@/components/layouts/AdminLayout'

interface EventItem {
  id: string
  title: string
  description: string
  bannerUrl?: string | null
  linkId: string
  slug?: string | null
  status: 'ACTIVE' | 'INACTIVE' | 'CLOSED'
  createdAt: string
  maxRegistrations?: number | null
  _count?: {
    registrations: number
  }
}

import EventRegistrationsPage from './EventRegistrationsPage'
import EventClassesPage from './EventClassesPage'

export default function AdminEventsPage() {
  const navigate = useNavigate()
  const { user, loading: authLoading, isAuthenticated } = useAuth({
    requireAuth: true,
    redirectTo: '/login'
  })

  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE' | 'CLOSED'>('ALL')
  const [activeModal, setActiveModal] = useState<{ type: 'registrations' | 'classes' | null, eventId: string | null }>({ type: null, eventId: null })

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true)
      const data = await apiFetch<EventItem[]>('/events', { auth: true })
      setEvents(data)
    } catch (error) {
      console.error('Erro ao carregar eventos:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated || (user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN')) {
        navigate('/my-courses')
      } else {
        fetchEvents()
      }
    }
  }, [authLoading, isAuthenticated, user, navigate, fetchEvents])

  // Definitiva contra preenchimento automático (auto-fill)
  useEffect(() => {
    const inputId = 'search_events_final_no_autofill';
    const clearInput = () => {
      const input = document.getElementById(inputId) as HTMLInputElement;
      if (input && searchTerm === '' && input.value !== '') {
        input.value = '';
      }
    };

    // Tentar limpar imediatamente e em intervalos nos primeiros 2 segundos
    clearInput();
    const interval = setInterval(clearInput, 200);
    const timeout = setTimeout(() => clearInterval(interval), 2000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [searchTerm]);

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
          event.linkId.toLowerCase().includes(term) ||
          (event.slug && event.slug.toLowerCase().includes(term))
        )
      })
  }, [events, statusFilter, searchTerm])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
      case 'INACTIVE': return 'bg-slate-500/10 text-slate-600 border-slate-500/20'
      case 'CLOSED': return 'bg-red-500/10 text-red-600 border-red-500/20'
      default: return 'bg-slate-100 text-slate-600'
    }
  }

  const handleUpdateStatus = async (eventId: string, newStatus: string) => {
    try {
      await apiFetch(`/admin/events/${eventId}`, {
        method: 'PATCH',
        auth: true,
        body: JSON.stringify({ status: newStatus }),
      })
      fetchEvents()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao atualizar status')
    }
  }

  if (authLoading || loading) return <LoadingScreen />

  return (
    <AdminLayout>
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 mt-4">
        <div>
          <h1 className="text-3xl font-black text-[var(--secondary)] tracking-tight">
            Gestão de <span className="text-indigo-600">Eventos</span>
          </h1>
          <p className="text-[var(--text-muted)] font-medium mt-1">
            Links de cadastro e controle de presença para seus eventos.
          </p>
        </div>
        <Link
          to="/admin/events/new"
          className="flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-xl shadow-indigo-600/20 transition-all active:scale-95 whitespace-nowrap"
        >
          <Plus size={20} />
          NOVO EVENTO
        </Link>
      </div>

      {/* Control Panel: Search & Filter */}
      <div className="bg-white rounded-[2rem] border border-[var(--border-light)] p-2 shadow-sm mb-8 flex flex-col lg:flex-row gap-2 relative overflow-hidden">
        {/* Bait input to catch Chrome's auto-fill */}
        <input
          type="text"
          name="email"
          autoComplete="email"
          className="absolute -top-[5000px] left-0 opacity-0 pointer-events-none"
          tabIndex={-1}
        />

        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" size={18} />
          <input
            type="search"
            placeholder="Pesquisar evento, descrição ou slug..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoComplete="off"
            name="search_events_unique_no_fill"
            id="search_events_final_no_autofill"
            className="w-full pl-12 pr-4 py-3 bg-[var(--bg-main)] border-none rounded-2xl text-sm focus:ring-0 focus:outline-none focus:bg-white transition-all font-medium appearance-none"
          />
        </div>
        <div className="flex gap-1 p-1 bg-[var(--bg-main)] rounded-2xl">
          {['ALL', 'ACTIVE', 'INACTIVE', 'CLOSED'].map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f as any)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${statusFilter === f
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-[var(--text-muted)] hover:text-indigo-600'
                }`}
            >
              {f === 'ALL' ? 'Todos' : f === 'ACTIVE' ? 'Ativos' : f === 'INACTIVE' ? 'Inativos' : 'Finais'}
            </button>
          ))}
        </div>
      </div>

      {/* Events View: Responsive Table/Cards */}
      <div className="bg-white rounded-[2.5rem] border border-[var(--border-light)] shadow-sm overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-light)] bg-slate-50/50">
                <th className="px-8 py-5 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Informações do Evento</th>
                <th className="px-6 py-5 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest text-center">Inscritos</th>
                <th className="px-6 py-5 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Status</th>
                <th className="px-6 py-5 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Data de Criação</th>
                <th className="px-8 py-5 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-light)]">
              {filteredEvents.map((event) => (
                <tr key={event.id} className="hover:bg-[var(--bg-main)]/30 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl border border-[var(--border-light)] bg-white overflow-hidden shrink-0 flex items-center justify-center text-indigo-600">
                        {event.bannerUrl ? (
                          <img src={normalizeImageUrl(event.bannerUrl)} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <Calendar size={20} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-[var(--secondary)] truncate group-hover:text-indigo-600 transition-colors">{event.title}</div>
                        <div className="text-[10px] text-[var(--text-muted)] font-medium flex items-center gap-1 mt-1 uppercase tracking-tight">
                          <LinkIcon size={10} /> /{event.slug || event.linkId}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6 text-center">
                    <div className="inline-flex flex-col items-center px-4 py-1.5 bg-indigo-50 rounded-xl border border-indigo-100">
                      <span className="text-sm font-black text-indigo-700">{event._count?.registrations || 0}</span>
                      <span className="text-[8px] font-bold text-indigo-400 uppercase tracking-tighter">Check-ins</span>
                    </div>
                  </td>
                  <td className="px-6 py-6 font-medium">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${getStatusColor(event.status)}`}>
                      {event.status === 'ACTIVE' ? 'Ativo' : event.status === 'INACTIVE' ? 'Inativo' : 'Encerrado'}
                    </span>
                  </td>
                  <td className="px-6 py-6 text-xs text-[var(--text-muted)] font-medium">
                    {format(new Date(event.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="grid grid-cols-2 gap-1.5 w-[240px] ml-auto">
                      <button
                        onClick={() => setActiveModal({ type: 'registrations', eventId: event.id })}
                        className="flex items-center justify-center gap-2 h-9 bg-white border border-[var(--border-light)] text-[var(--secondary)] text-[10px] font-black uppercase tracking-widest rounded-xl shadow-sm hover:text-indigo-600 hover:border-indigo-100 hover:bg-indigo-50/30 transition-all active:scale-95"
                      >
                        <Users size={14} className="text-indigo-500" />
                        Registros
                      </button>
                      <button
                        onClick={() => setActiveModal({ type: 'classes', eventId: event.id })}
                        className="flex items-center justify-center gap-2 h-9 bg-white border border-[var(--border-light)] text-[var(--secondary)] text-[10px] font-black uppercase tracking-widest rounded-xl shadow-sm hover:text-violet-600 hover:border-violet-100 hover:bg-violet-50/30 transition-all active:scale-95"
                      >
                        <LayoutGrid size={14} className="text-violet-500" />
                        Turmas
                      </button>
                      <button
                        onClick={() => {
                          const url = `${window.location.origin}/register/${event.linkId}`
                          navigator.clipboard.writeText(url)
                          alert('Link copiado!')
                        }}
                        className="flex items-center justify-center gap-2 h-9 bg-white border border-[var(--border-light)] text-[var(--secondary)] text-[10px] font-black uppercase tracking-widest rounded-xl shadow-sm hover:text-blue-600 hover:border-blue-100 hover:bg-blue-50/30 transition-all active:scale-95"
                      >
                        <Share2 size={14} className="text-blue-500" />
                        Link
                      </button>
                      <Link
                        to={`/admin/whatsapp/send?eventId=${event.id}`}
                        className="flex items-center justify-center gap-2 h-9 bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest rounded-xl shadow-sm hover:bg-emerald-100 transition-all active:scale-95"
                      >
                        <MessageCircle size={14} />
                        WhatsApp
                      </Link>
                      <Link
                        to={`/admin/events/${event.id}/edit`}
                        className="flex items-center justify-center gap-2 h-9 bg-amber-50 border border-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-widest rounded-xl shadow-sm hover:bg-amber-100 transition-all active:scale-95"
                      >
                        <Pencil size={14} />
                        Editar
                      </Link>

                      {event.status === 'ACTIVE' ? (
                        <button
                          onClick={() => handleUpdateStatus(event.id, 'INACTIVE')}
                          className="flex items-center justify-center h-9 bg-white border border-[var(--border-light)] text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest rounded-xl shadow-sm hover:bg-slate-50 hover:text-slate-600 transition-all active:scale-95"
                        >
                          Inativar
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUpdateStatus(event.id, 'ACTIVE')}
                          className="flex items-center justify-center h-9 bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-widest rounded-xl shadow-sm hover:bg-indigo-100 transition-all active:scale-95"
                        >
                          Ativar
                        </button>
                      )}

                      {event.status !== 'CLOSED' ? (
                        <button
                          onClick={() => {
                            if (window.confirm('Tem certeza que deseja encerrar este evento? Não será possível reabri-lo.')) {
                              handleUpdateStatus(event.id, 'CLOSED')
                            }
                          }}
                          className="flex items-center justify-center h-9 bg-rose-50 border border-rose-100 text-rose-600 text-[10px] font-black uppercase tracking-widest rounded-xl shadow-sm hover:bg-rose-100 transition-all active:scale-95"
                        >
                          Encerrar
                        </button>
                      ) : (
                        <div className="flex items-center justify-center h-9 bg-slate-100 border border-slate-200 text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-xl cursor-not-allowed">
                          Finalizado
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredEvents.length === 0 && (
          <div className="py-24 text-center">
            <div className="w-16 h-16 bg-[var(--bg-main)] rounded-full flex items-center justify-center mx-auto mb-4 text-[var(--text-muted)]">
              <Calendar size={32} />
            </div>
            <p className="text-[var(--text-muted)] font-bold">Nenhum evento encontrado.</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Ajuste os filtros ou crie um novo link.</p>
          </div>
        )}
      </div>

      {/* Quick Action Cards (Optional footer area) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl -mr-24 -mt-24 group-hover:scale-110 transition-transform"></div>
          <h3 className="text-xl font-black mb-2 relative z-10">Novo Lançamento?</h3>
          <p className="text-white/60 text-sm mb-6 relative z-10">Crie um link de captura rápida e comece a receber inscritos em segundos.</p>
          <Link to="/admin/events/new" className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 px-6 py-3 rounded-2xl text-xs font-bold transition-all relative z-10">
            CRIAR AGORA <Plus size={16} />
          </Link>
        </div>
        <div className="bg-white rounded-[2.5rem] p-8 border border-[var(--border-light)] shadow-sm group">
          <h3 className="text-xl font-black text-[var(--secondary)] mb-2 group-hover:text-indigo-600 transition-colors">Relatórios Avançados</h3>
          <p className="text-[var(--text-muted)] text-sm mb-6">Exporte todos os dados consolidados de seus eventos em formato Excel ou PDF.</p>
          <button className="flex items-center gap-2 text-indigo-600 font-black text-xs uppercase tracking-widest hover:translate-x-1 transition-transform">
            Exportar Dados <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {activeModal.eventId && activeModal.type === 'registrations' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-6xl max-h-[90vh] bg-gray-50 rounded-2xl flex flex-col overflow-y-auto border border-white/20 shadow-2xl animate-in zoom-in-95 duration-200">
            <EventRegistrationsPage eventIdProp={activeModal.eventId} onClose={() => setActiveModal({ type: null, eventId: null })} />
          </div>
        </div>
      )}

      {activeModal.eventId && activeModal.type === 'classes' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-6xl max-h-[90vh] bg-gray-50 rounded-2xl flex flex-col overflow-y-auto border border-white/20 shadow-2xl animate-in zoom-in-95 duration-200">
            <EventClassesPage eventIdProp={activeModal.eventId} onClose={() => setActiveModal({ type: null, eventId: null })} />
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
