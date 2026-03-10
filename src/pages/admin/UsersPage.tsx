import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Users,
    Search,
    Plus,
    Shield,
    Mail,
    Calendar,
    MoreVertical,
    X,
    Check,
    ShieldAlert,
    User as UserIcon
} from 'lucide-react'
import AdminLayout from '@/components/layouts/AdminLayout'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/lib/useAuth'
import LoadingScreen from '@/components/ui/LoadingScreen'

interface UserAccount {
    id: string
    name: string
    email: string
    role: 'USER' | 'ADMIN' | 'SUPER_ADMIN'
    createdAt: string
}

export default function AdminUsersPage() {
    const navigate = useNavigate()
    const { user: currentUser, loading: authLoading, isAuthenticated } = useAuth({
        requireAuth: true,
        redirectTo: '/login',
    })

    const [users, setUsers] = useState<UserAccount[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [isModalOpen, setIsModalOpen] = useState(false)

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'ADMIN' as 'USER' | 'ADMIN' | 'SUPER_ADMIN'
    })
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true)
            const data = await apiFetch<UserAccount[]>('/admin/users', { auth: true })
            setUsers(data || [])
        } catch (err) {
            console.error('Erro ao buscar usuários:', err)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        if (!authLoading) {
            if (!isAuthenticated || currentUser?.role !== 'SUPER_ADMIN') {
                navigate('/admin/dashboard')
                return
            }
            fetchUsers()
        }
    }, [authLoading, isAuthenticated, currentUser, navigate, fetchUsers])

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)
        setError(null)

        try {
            await apiFetch('/admin/users', {
                method: 'POST',
                auth: true,
                body: JSON.stringify(formData)
            })

            setIsModalOpen(false)
            setFormData({ name: '', email: '', password: '', role: 'ADMIN' })
            fetchUsers()
        } catch (err: any) {
            setError(err?.message || 'Erro ao criar usuário')
        } finally {
            setSubmitting(false)
        }
    }

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'SUPER_ADMIN':
                return <span className="px-2 py-1 bg-purple-500/10 text-purple-600 border border-purple-500/20 text-[10px] font-black rounded-lg uppercase tracking-widest flex items-center gap-1"><ShieldAlert size={10} /> Super Admin</span>
            case 'ADMIN':
                return <span className="px-2 py-1 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px] font-black rounded-lg uppercase tracking-widest flex items-center gap-1"><Shield size={10} /> Admin</span>
            default:
                return <span className="px-2 py-1 bg-slate-500/10 text-slate-600 border border-slate-500/20 text-[10px] font-black rounded-lg uppercase tracking-widest flex items-center gap-1"><UserIcon size={10} /> Usuário</span>
        }
    }

    if (authLoading || loading) return <LoadingScreen />

    return (
        <AdminLayout>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 mt-4">
                <div>
                    <h1 className="text-3xl font-black text-[var(--secondary)] tracking-tight">
                        Gestão de <span className="text-[var(--primary)] text-emerald-500">Acessos</span>
                    </h1>
                    <p className="text-[var(--text-muted)] font-medium mt-1">
                        Controle quem pode gerenciar a plataforma Link de Cadastro.
                    </p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-6 py-3.5 bg-slate-900 text-white font-black rounded-2xl shadow-lg shadow-slate-900/20 transition-all hover:bg-slate-800 active:scale-95 uppercase text-xs tracking-widest"
                >
                    <Plus size={18} className="text-emerald-400" /> NOVO ACESSO
                </button>
            </div>

            <div className="grid grid-cols-1 gap-8">
                <div className="bg-white rounded-[2.5rem] border border-[var(--border-light)] shadow-sm overflow-hidden">
                    <div className="p-8 border-b border-[var(--border-light)] flex flex-col md:flex-row md:items-center gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                            <input
                                type="text"
                                placeholder="Pesquisar por nome ou email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-[var(--bg-main)] border-none rounded-2xl py-3 pl-12 pr-4 text-sm font-medium focus:ring-2 focus:ring-[var(--primary)]/20 transition-all shadow-inner"
                            />
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-main)] rounded-2xl text-[var(--text-muted)] text-xs font-bold">
                            <Users size={16} />
                            {filteredUsers.length} Usuários Encontrados
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50 border-b border-[var(--border-light)]">
                                    <th className="px-8 py-4 text-left text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Usuário</th>
                                    <th className="px-8 py-4 text-left text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Nível de Acesso</th>
                                    <th className="px-8 py-4 text-left text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Data de Criação</th>
                                    <th className="px-8 py-4 text-right text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-light)]">
                                {filteredUsers.map((u) => (
                                    <tr key={u.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-500 border border-slate-200 shadow-sm font-black uppercase tracking-tighter text-sm">
                                                    {u.name.substring(0, 2)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-[var(--secondary)] text-sm">{u.name}</p>
                                                    <p className="text-xs text-[var(--text-muted)] flex items-center gap-1"><Mail size={12} /> {u.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            {getRoleBadge(u.role)}
                                        </td>
                                        <td className="px-8 py-5 text-sm text-[var(--text-muted)] font-medium">
                                            <div className="flex items-center gap-2">
                                                <Calendar size={14} />
                                                {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <button className="p-2 hover:bg-slate-200 rounded-lg text-[var(--text-muted)] transition-all">
                                                <MoreVertical size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Create User Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-white border-opacity-20 animate-in zoom-in-95 duration-200">
                        <div className="p-8 border-b border-[var(--border-light)] flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-black text-[var(--secondary)] tracking-tight">Novo Acesso Administrativo</h3>
                                <p className="text-xs text-[var(--text-muted)] font-medium mt-1">Preencha os dados do novo colaborador.</p>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-3 hover:bg-[var(--bg-main)] rounded-2xl text-[var(--text-muted)] transition-all active:scale-90"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateUser} className="p-8 space-y-6">
                            {error && (
                                <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-xs font-bold animate-in slide-in-from-top-2">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1 mb-2 block">Nome Completo</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Ex: João Silva"
                                        className="w-full bg-[var(--bg-main)] border-none rounded-2xl py-3.5 px-5 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-inner placeholder:text-slate-400"
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1 mb-2 block">Email Corporativo</label>
                                    <input
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="email@empresa.com"
                                        className="w-full bg-[var(--bg-main)] border-none rounded-2xl py-3.5 px-5 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-inner placeholder:text-slate-400"
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1 mb-2 block">Senha de Acesso</label>
                                    <input
                                        type="password"
                                        required
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                        placeholder="Mínimo 6 caracteres"
                                        className="w-full bg-[var(--bg-main)] border-none rounded-2xl py-3.5 px-5 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-inner placeholder:text-slate-400"
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1 mb-2 block">Nível de Permissão</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, role: 'ADMIN' })}
                                            className={`py-3.5 rounded-2xl border-2 transition-all flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest ${formData.role === 'ADMIN'
                                                    ? 'bg-emerald-50 border-emerald-500 text-emerald-600 shadow-md shadow-emerald-500/10'
                                                    : 'bg-white border-[var(--border-light)] text-[var(--text-muted)] hover:border-emerald-200'
                                                }`}
                                        >
                                            <Shield size={14} /> Administrador
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, role: 'SUPER_ADMIN' })}
                                            className={`py-3.5 rounded-2xl border-2 transition-all flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest ${formData.role === 'SUPER_ADMIN'
                                                    ? 'bg-purple-50 border-purple-500 text-purple-600 shadow-md shadow-purple-500/10'
                                                    : 'bg-white border-[var(--border-light)] text-[var(--text-muted)] hover:border-purple-200'
                                                }`}
                                        >
                                            <ShieldAlert size={14} /> Super Admin
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-4 bg-slate-100 text-[var(--secondary)] font-black rounded-2xl hover:bg-slate-200 transition-all uppercase text-[10px] tracking-widest"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-slate-800 transition-all uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {submitting ? 'Criando...' : <><Check size={16} className="text-emerald-400" /> Confirmar</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    )
}
