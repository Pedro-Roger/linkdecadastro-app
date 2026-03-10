import { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
    Search, User, Mail, Phone, MapPin, Calendar,
    ExternalLink, ArrowRight, Filter, Download,
    MessageCircle, MoreVertical, BadgeCheck
} from 'lucide-react'
import LoadingScreen from '@/components/ui/LoadingScreen'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/lib/useAuth'
import AdminLayout from '@/components/layouts/AdminLayout'

interface Contact {
    id: string
    name: string
    email: string
    phone: string
    city: string
    state: string
    type: 'USER' | 'GUEST'
    participantType: string
    lastInteraction: string
    source: string[]
}

export default function CrmContactsPage() {
    const navigate = useNavigate()
    const { user, loading: authLoading, isAuthenticated } = useAuth({
        requireAuth: true,
        redirectTo: '/login',
    })
    const [contacts, setContacts] = useState<Contact[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')

    const fetchData = useCallback(async () => {
        try {
            setLoading(true)
            const data = await apiFetch<Contact[]>('/admin/crm/contacts', { auth: true })
            setContacts(data || [])
        } catch (error) {
            console.error('Erro ao carregar contatos:', error)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        if (!authLoading) {
            if (!isAuthenticated || (user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN')) {
                navigate('/my-courses')
            } else {
                fetchData()
            }
        }
    }, [authLoading, isAuthenticated, user, fetchData, navigate])

    const filteredContacts = useMemo(() => {
        const term = searchTerm.toLowerCase()
        return contacts.filter(
            (c) =>
                c.name.toLowerCase().includes(term) ||
                c.email?.toLowerCase().includes(term) ||
                c.phone?.toLowerCase().includes(term) ||
                c.city?.toLowerCase().includes(term)
        )
    }, [searchTerm, contacts])

    const getParticipantTypeStyle = (type: string) => {
        const styles: Record<string, string> = {
            PRODUTOR: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
            PROFESSOR: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
            ESTUDANTE: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
            PESQUISADOR: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
        }
        return styles[type] || 'bg-slate-500/10 text-slate-600 border-slate-500/20'
    }

    if (authLoading || loading) return <LoadingScreen />

    return (
        <AdminLayout>
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 mt-4">
                <div>
                    <h1 className="text-3xl font-black text-[var(--secondary)] tracking-tight">
                        Gestão de <span className="text-[var(--primary)]">Clientes</span>
                    </h1>
                    <p className="text-[var(--text-muted)] font-medium mt-1">
                        Base unificada de todos os seus leads e alunos (CRM).
                    </p>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-6 py-3 bg-white hover:bg-slate-50 text-[var(--secondary)] border border-[var(--border-light)] font-bold rounded-2xl shadow-sm transition-all active:scale-95">
                        <Download size={18} /> EXPORTAR
                    </button>
                    <Link
                        to="/admin/whatsapp/send"
                        className="flex items-center gap-2 px-6 py-3 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-bold rounded-2xl shadow-xl shadow-[var(--primary)]/20 transition-all active:scale-95 whitespace-nowrap"
                    >
                        <MessageCircle size={18} /> DISPARO EM MASSA
                    </Link>
                </div>
            </div>

            {/* Control Bar */}
            <div className="bg-white rounded-3xl border border-[var(--border-light)] p-2 shadow-sm mb-8 flex flex-col lg:flex-row gap-2">
                <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por nome, email, telefone ou cidade..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-[var(--bg-main)] border-none rounded-2xl text-sm focus:ring-2 focus:ring-[var(--primary)]/20 transition-all font-medium"
                    />
                </div>
                <button className="px-6 py-2 bg-[var(--bg-main)] hover:bg-[var(--sidebar-active)] text-[var(--text-muted)] hover:text-[var(--primary)] rounded-2xl flex items-center justify-center gap-2 transition-all">
                    <Filter size={18} /> <span>Filtros Avançados</span>
                </button>
            </div>

            {/* Contacts Table */}
            <div className="bg-white rounded-[2.5rem] border border-[var(--border-light)] shadow-sm overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-[var(--border-light)] bg-slate-50/50">
                                <th className="px-8 py-5 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Informações Pessoais</th>
                                <th className="px-6 py-5 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest text-center">Localização</th>
                                <th className="px-6 py-5 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Segmento</th>
                                <th className="px-6 py-5 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Atividade</th>
                                <th className="px-8 py-5 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest text-right">Perfil</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-light)]">
                            {filteredContacts.map((contact) => (
                                <tr key={contact.id} className="hover:bg-[var(--bg-main)]/30 transition-colors group">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold shadow-lg shadow-indigo-500/10">
                                                {contact.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-bold text-[var(--secondary)] truncate max-w-[180px]">{contact.name}</span>
                                                    {contact.type === 'USER' && <BadgeCheck size={14} className="text-blue-500 shrink-0" />}
                                                </div>
                                                <div className="text-[10px] text-[var(--text-muted)] font-medium flex flex-col gap-0.5 mt-0.5">
                                                    <span className="flex items-center gap-1"><Mail size={10} /> {contact.email || '-'}</span>
                                                    <span className="flex items-center gap-1"><Phone size={10} /> {contact.phone || '-'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-center">
                                        <div className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 rounded-xl text-[10px] font-bold text-slate-600">
                                            <MapPin size={10} /> {contact.city || 'N/A'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${getParticipantTypeStyle(contact.participantType)}`}>
                                            {contact.participantType || 'Geral'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col gap-1.5">
                                            <div className="flex items-center gap-1 text-[10px] font-bold text-[var(--secondary)]">
                                                <Calendar size={10} className="text-indigo-500" />
                                                {format(new Date(contact.lastInteraction), 'dd/MM/yyyy', { locale: ptBR })}
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                                {contact.source?.slice(0, 2).map((src, i) => (
                                                    <span key={i} className="text-[8px] font-black bg-indigo-50 text-indigo-500 px-1.5 py-0.5 rounded uppercase">{src}</span>
                                                ))}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button className="p-2.5 bg-white hover:bg-slate-50 text-[var(--text-muted)] border border-[var(--border-light)] rounded-xl transition-all shadow-sm">
                                                <MoreVertical size={16} />
                                            </button>
                                            <Link
                                                to={`/admin/crm/contacts/${contact.id}`}
                                                className="flex items-center gap-2 pl-4 pr-3 py-2.5 bg-white hover:bg-slate-50 text-[var(--secondary)] border border-[var(--border-light)] rounded-xl text-[10px] font-bold shadow-sm transition-all group/btn"
                                            >
                                                PERFIL <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filteredContacts.length === 0 && (
                    <div className="py-24 text-center">
                        <div className="w-20 h-20 bg-[var(--bg-main)] rounded-full flex items-center justify-center mx-auto mb-6 text-[var(--text-muted)]">
                            <User size={40} />
                        </div>
                        <h3 className="text-xl font-black text-[var(--secondary)] mb-2">Nenhum cliente na base</h3>
                        <p className="text-[var(--text-muted)] text-sm max-w-sm mx-auto">
                            Sua base de CRM será populada conforme as pessoas se inscreverem em seus links.
                        </p>
                    </div>
                )}
            </div>

            {/* Bottom Insight Card */}
            <div className="mt-8 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[2.5rem] p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-indigo-600/20">
                <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-white border border-white/20">
                        <Users size={32} />
                    </div>
                    <div>
                        <div className="text-3xl font-black">{filteredContacts.length}</div>
                        <div className="text-sm font-bold opacity-80 uppercase tracking-widest text-indigo-100">Total de Leads Unificados</div>
                    </div>
                </div>
                <div className="flex gap-4 w-full md:w-auto">
                    <button className="flex-1 md:flex-none px-8 py-4 bg-white text-indigo-600 font-black rounded-2xl shadow-lg hover:scale-105 transition-all text-sm">
                        RELATÓRIO CRM
                    </button>
                    <Link to="/admin/whatsapp/send" className="flex-1 md:flex-none px-8 py-4 bg-indigo-500/30 hover:bg-indigo-500/50 text-white font-black rounded-2xl border border-white/20 transition-all text-sm flex items-center justify-center gap-2">
                        ENVIAR MENSAGENS <ArrowRight size={18} />
                    </Link>
                </div>
            </div>
        </AdminLayout>
    )
}
