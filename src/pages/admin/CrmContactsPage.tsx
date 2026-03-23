import { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
    Search, User, Mail, Phone, MapPin, Calendar,
    ArrowRight, Filter, Download, MessageCircle,
    MoreVertical, BadgeCheck, Users, GripVertical
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
    crmStage: string
    crmUpdatedAt?: string
}

interface PipelineStage {
    key: string
    label: string
}

export default function CrmContactsPage() {
    const navigate = useNavigate()
    const { user, loading: authLoading, isAuthenticated } = useAuth({
        requireAuth: true,
        redirectTo: '/login',
    })
    const [contacts, setContacts] = useState<Contact[]>([])
    const [stages, setStages] = useState<PipelineStage[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [draggedContactId, setDraggedContactId] = useState<string | null>(null)
    const [savingStageId, setSavingStageId] = useState<string | null>(null)

    const fetchData = useCallback(async () => {
        try {
            setLoading(true)
            const [contactsData, stagesData] = await Promise.all([
                apiFetch<Contact[]>('/admin/crm/contacts', { auth: true }),
                apiFetch<PipelineStage[]>('/admin/crm/pipeline-stages', { auth: true }),
            ])

            setContacts(contactsData || [])
            setStages(stagesData || [])
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
            (contact) =>
                contact.name?.toLowerCase().includes(term) ||
                contact.email?.toLowerCase().includes(term) ||
                contact.phone?.toLowerCase().includes(term) ||
                contact.city?.toLowerCase().includes(term) ||
                contact.crmStage?.toLowerCase().includes(term)
        )
    }, [searchTerm, contacts])

    const contactsByStage = useMemo(() => {
        const grouped = new Map<string, Contact[]>()

        stages.forEach((stage) => grouped.set(stage.key, []))

        filteredContacts.forEach((contact) => {
            const stageKey = contact.crmStage || stages[0]?.key || 'NOVO_LEAD'
            if (!grouped.has(stageKey)) {
                grouped.set(stageKey, [])
            }
            grouped.get(stageKey)?.push(contact)
        })

        return grouped
    }, [filteredContacts, stages])

    const getParticipantTypeStyle = (type: string) => {
        const styles: Record<string, string> = {
            PRODUTOR: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
            PROFESSOR: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
            ESTUDANTE: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
            PESQUISADOR: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
        }
        return styles[type] || 'bg-slate-500/10 text-slate-600 border-slate-500/20'
    }

    const getStageAccent = (stage: string) => {
        const styles: Record<string, string> = {
            NOVO_LEAD: 'from-sky-500 to-cyan-500',
            CONTATO_INICIAL: 'from-indigo-500 to-blue-500',
            QUALIFICACAO: 'from-violet-500 to-fuchsia-500',
            PROPOSTA: 'from-amber-500 to-orange-500',
            NEGOCIACAO: 'from-pink-500 to-rose-500',
            FECHADO: 'from-emerald-500 to-green-500',
            PERDIDO: 'from-slate-500 to-slate-700',
        }
        return styles[stage] || 'from-slate-500 to-slate-700'
    }

    const handleStageChange = useCallback(async (contact: Contact, stage: string) => {
        if (contact.crmStage === stage) return

        const previousStage = contact.crmStage
        setSavingStageId(contact.id)
        setContacts((prev) =>
            prev.map((item) =>
                item.id === contact.id ? { ...item, crmStage: stage } : item
            )
        )

        try {
            await apiFetch('/admin/crm/contacts/stage', {
                method: 'PATCH',
                auth: true,
                body: JSON.stringify({
                    contactId: contact.id,
                    type: contact.type,
                    email: contact.email,
                    phone: contact.phone,
                    stage,
                }),
            })
        } catch (error) {
            console.error('Erro ao atualizar etapa do funil:', error)
            setContacts((prev) =>
                prev.map((item) =>
                    item.id === contact.id ? { ...item, crmStage: previousStage } : item
                )
            )
        } finally {
            setSavingStageId(null)
        }
    }, [])

    if (authLoading || loading) return <LoadingScreen />

    return (
        <AdminLayout>
            <div className="flex flex-col gap-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mt-4">
                    <div>
                        <h1 className="text-3xl font-black text-[var(--secondary)] tracking-tight">
                            Gestao de <span className="text-[var(--primary)]">Clientes</span>
                        </h1>
                        <p className="text-[var(--text-muted)] font-medium mt-1">
                            CRM com base unificada e quadro visual do seu funil de vendas.
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

                <div className="bg-white rounded-3xl border border-[var(--border-light)] p-2 shadow-sm flex flex-col lg:flex-row gap-2">
                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por nome, email, telefone, cidade ou etapa..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-[var(--bg-main)] border-none rounded-2xl text-sm focus:ring-2 focus:ring-[var(--primary)]/20 transition-all font-medium"
                        />
                    </div>
                    <button className="px-6 py-2 bg-[var(--bg-main)] hover:bg-[var(--sidebar-active)] text-[var(--text-muted)] hover:text-[var(--primary)] rounded-2xl flex items-center justify-center gap-2 transition-all">
                        <Filter size={18} /> <span>Filtros Avancados</span>
                    </button>
                </div>

                <div className="bg-white rounded-[2.5rem] border border-[var(--border-light)] shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-8 py-6 border-b border-[var(--border-light)] bg-slate-50/70">
                        <div>
                            <h2 className="text-xl font-black text-[var(--secondary)] tracking-tight">Funil de Vendas</h2>
                            <p className="text-sm text-[var(--text-muted)] font-medium">
                                Arraste os cards ou troque a etapa para mover seus leads no CRM.
                            </p>
                        </div>
                        <div className="px-4 py-2 rounded-2xl bg-[var(--bg-main)] text-[var(--secondary)] text-sm font-black">
                            {filteredContacts.length} lead(s)
                        </div>
                    </div>

                    <div className="overflow-x-auto custom-scrollbar px-6 py-6">
                        <div className="flex gap-5 min-w-max">
                            {stages.map((stage) => {
                                const stageContacts = contactsByStage.get(stage.key) || []
                                return (
                                    <div
                                        key={stage.key}
                                        onDragOver={(e) => e.preventDefault()}
                                        onDrop={() => {
                                            const contact = contacts.find((item) => item.id === draggedContactId)
                                            if (contact) {
                                                handleStageChange(contact, stage.key)
                                            }
                                            setDraggedContactId(null)
                                        }}
                                        className="w-[320px] rounded-[2rem] border border-slate-100 bg-slate-50/60 p-4 shadow-inner"
                                    >
                                        <div className={`rounded-[1.5rem] bg-gradient-to-r ${getStageAccent(stage.key)} p-[1px] mb-4`}>
                                            <div className="rounded-[1.45rem] bg-white px-4 py-4">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div>
                                                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.18em]">
                                                            {stage.label}
                                                        </h3>
                                                        <p className="text-xs text-slate-400 font-medium mt-1">
                                                            {stageContacts.length} contato(s)
                                                        </p>
                                                    </div>
                                                    <div className={`h-10 w-10 rounded-2xl bg-gradient-to-r ${getStageAccent(stage.key)} text-white flex items-center justify-center shadow-lg`}>
                                                        <Users size={18} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-3 min-h-[12rem]">
                                            {stageContacts.map((contact) => (
                                                <div
                                                    key={contact.id}
                                                    draggable
                                                    onDragStart={() => setDraggedContactId(contact.id)}
                                                    className="rounded-[1.75rem] border border-slate-100 bg-white p-4 shadow-sm transition-all hover:shadow-md"
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <button className="mt-1 text-slate-300 hover:text-slate-500 transition-colors">
                                                            <GripVertical size={16} />
                                                        </button>
                                                        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-black shadow-lg shadow-indigo-500/10">
                                                            {(contact.name || 'C').charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center gap-1.5">
                                                                <h4 className="truncate text-sm font-black text-slate-900">
                                                                    {contact.name || 'Sem nome'}
                                                                </h4>
                                                                {contact.type === 'USER' && (
                                                                    <BadgeCheck size={14} className="shrink-0 text-blue-500" />
                                                                )}
                                                            </div>
                                                            <p className="mt-1 truncate text-xs font-medium text-slate-500">
                                                                {contact.phone || contact.email || 'Sem telefone'}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="mt-4 flex flex-wrap gap-2">
                                                        {contact.participantType && (
                                                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${getParticipantTypeStyle(contact.participantType)}`}>
                                                                {contact.participantType}
                                                            </span>
                                                        )}
                                                        {(contact.city || contact.state) && (
                                                            <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-slate-200 bg-slate-50 text-slate-500">
                                                                {[contact.city, contact.state].filter(Boolean).join(' - ')}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="mt-4">
                                                        <select
                                                            value={contact.crmStage || stage.key}
                                                            onChange={(e) => handleStageChange(contact, e.target.value)}
                                                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-slate-600 outline-none transition-all focus:ring-2 focus:ring-[var(--primary)]/20"
                                                        >
                                                            {stages.map((stageOption) => (
                                                                <option key={stageOption.key} value={stageOption.key}>
                                                                    {stageOption.label}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    <div className="mt-4 flex items-center justify-between">
                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                            {savingStageId === contact.id ? 'Salvando...' : 'Atualizado no funil'}
                                                        </span>
                                                        <Link
                                                            to={`/admin/crm/contacts/${contact.id}`}
                                                            className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.16em] text-[var(--primary)]"
                                                        >
                                                            Perfil <ArrowRight size={12} />
                                                        </Link>
                                                    </div>
                                                </div>
                                            ))}

                                            {stageContacts.length === 0 && (
                                                <div className="rounded-[1.75rem] border border-dashed border-slate-200 bg-white/70 px-4 py-10 text-center text-sm font-bold text-slate-300">
                                                    Nenhum lead nesta etapa
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-[2.5rem] border border-[var(--border-light)] shadow-sm overflow-hidden">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-[var(--border-light)] bg-slate-50/50">
                                    <th className="px-8 py-5 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Informacoes Pessoais</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest text-center">Localizacao</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Segmento</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Funil</th>
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
                                                    {(contact.name || 'C').charAt(0).toUpperCase()}
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
                                            <select
                                                value={contact.crmStage || 'NOVO_LEAD'}
                                                onChange={(e) => handleStageChange(contact, e.target.value)}
                                                className="min-w-[180px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-slate-600 outline-none transition-all focus:ring-2 focus:ring-[var(--primary)]/20"
                                            >
                                                {stages.map((stage) => (
                                                    <option key={stage.key} value={stage.key}>
                                                        {stage.label}
                                                    </option>
                                                ))}
                                            </select>
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
                                Sua base de CRM sera populada conforme as pessoas se inscreverem em seus links.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    )
}
