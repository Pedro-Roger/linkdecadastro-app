import React, { useEffect, useState } from 'react';
import AdminLayout from '@/components/layouts/AdminLayout';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/useAuth';
import { Bot, Cpu, KeyRound, Pencil, ShieldCheck, Sparkles, Trash2, Users } from 'lucide-react';

const AGENT_MODEL_OPTIONS = [
    'z-ai/glm-4.5-air:free',
    'nvidia/llama-nemotron-embed-vl-1b-v2:free',
];

type AgentItem = {
    id: string;
    name: string;
    slug: string;
    description?: string;
    module: string;
    model: string;
    isActive: boolean;
    defaultMode: 'HUMAN' | 'COPILOT' | 'AUTONOMOUS';
    tools: string[];
    boundChannelId?: string | null;
    hasCustomApiKey?: boolean;
    apiKeyLabel?: string | null;
};

type UserItem = {
    id: string;
    name: string;
    email: string;
    role: string;
    canAccessAgents?: boolean;
};

export default function AgentsPage() {
    const { user } = useAuth({ requireAuth: true, redirectTo: '/login' });
    const [loading, setLoading] = useState(true);
    const [agents, setAgents] = useState<AgentItem[]>([]);
    const [users, setUsers] = useState<UserItem[]>([]);
    const [sessions, setSessions] = useState<any[]>([]);
    const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
    const [form, setForm] = useState({
        name: '',
        description: '',
        module: 'atendimento',
        model: 'z-ai/glm-4.5-air:free',
        apiKey: '',
        apiKeyLabel: '',
        boundChannelId: '',
        instructions: '',
        knowledgeBase: '',
        defaultMode: 'COPILOT',
    });

    const isMaster = user?.role === 'SUPER_ADMIN';

    const loadData = async () => {
        try {
            const [agentsData, usersData] = await Promise.all([
                apiFetch<AgentItem[]>('/admin/agents', { auth: true }),
                isMaster ? apiFetch<UserItem[]>('/admin/users', { auth: true }) : Promise.resolve([]),
            ]);

            setAgents(Array.isArray(agentsData) ? agentsData : []);
            setUsers(Array.isArray(usersData) ? usersData : []);
            const sessionsData = await apiFetch<any>('/api/whatsapp/sessions', { auth: true }).catch(() => ({ sessions: [] }));
            setSessions(Array.isArray(sessionsData?.sessions) ? sessionsData.sessions : []);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData().catch(console.error);
    }, []);

    const resetForm = () => {
        setEditingAgentId(null);
        setForm({
            name: '',
            description: '',
            module: 'atendimento',
            model: 'z-ai/glm-4.5-air:free',
            apiKey: '',
            apiKeyLabel: '',
            boundChannelId: '',
            instructions: '',
            knowledgeBase: '',
            defaultMode: 'COPILOT',
        });
    };

    const createAgent = async () => {
        if (!form.name.trim()) return;

        await apiFetch(editingAgentId ? `/admin/agents/${editingAgentId}` : '/admin/agents', {
            method: editingAgentId ? 'PATCH' : 'POST',
            auth: true,
            body: JSON.stringify(form),
        });

        resetForm();
        await loadData();
    };

    const startEditing = async (agentId: string) => {
        const agent = await apiFetch<any>(`/admin/agents/${agentId}`, { auth: true });
        setEditingAgentId(agent.id);
        setForm({
            name: agent.name || '',
            description: agent.description || '',
            module: agent.module || 'atendimento',
            model: agent.model || 'z-ai/glm-4.5-air:free',
            apiKey: '',
            apiKeyLabel: agent.apiKeyLabel || '',
            boundChannelId: agent.boundChannelId || '',
            instructions: agent.instructions || '',
            knowledgeBase: agent.knowledgeBase || '',
            defaultMode: agent.defaultMode || 'COPILOT',
        });
    };

    const toggleAccess = async (targetUser: UserItem) => {
        await apiFetch(`/admin/agents/access/${targetUser.id}`, {
            method: 'PUT',
            auth: true,
            body: JSON.stringify({
                enabled: !targetUser.canAccessAgents,
            }),
        });

        await loadData();
    };

    const deleteAgent = async (agentId: string, agentName: string) => {
        if (!confirm(`Deseja excluir o agente "${agentName}"?`)) return;

        await apiFetch(`/admin/agents/${agentId}`, {
            method: 'DELETE',
            auth: true,
        });

        await loadData();
    };

    return (
        <AdminLayout>
            <div className="space-y-8">
                <div className="flex items-start justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                            <Cpu className="text-teal-600" size={30} />
                            Agentes
                        </h1>
                        <p className="text-slate-500 mt-2 font-medium">
                            Central de agentes do atendimento. O SUPER_ADMIN cria e libera quem pode usar esse modulo.
                        </p>
                    </div>
                    <div className="rounded-2xl border border-teal-100 bg-teal-50 px-4 py-3 text-xs font-bold text-teal-700">
                        {isMaster ? 'Modo Master' : 'Acesso liberado pelo Master'}
                    </div>
                </div>

                {loading ? (
                    <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-400">
                        Carregando agentes...
                    </div>
                ) : (
                    <>
                        {isMaster && (
                            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                                    <div className="flex items-center gap-3">
                                        <Sparkles className="text-teal-600" size={18} />
                                        <h2 className="text-lg font-black text-slate-900">{editingAgentId ? 'Editar agente' : 'Criar agente'}</h2>
                                    </div>
                                    <input
                                        value={form.name}
                                        onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                                        placeholder="Nome do agente"
                                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-teal-500"
                                    />
                                    <input
                                        value={form.description}
                                        onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                                        placeholder="Descricao curta"
                                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-teal-500"
                                    />
                                    <div className="space-y-2">
                                        <label className="block text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                                            Modelo do agente
                                        </label>
                                        <select
                                            value={form.model}
                                            onChange={(e) => setForm((prev) => ({ ...prev, model: e.target.value }))}
                                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-teal-500"
                                        >
                                            {AGENT_MODEL_OPTIONS.map((model) => (
                                                <option key={model} value={model}>
                                                    {model}
                                                </option>
                                            ))}
                                        </select>
                                        <p className="text-xs text-slate-500">
                                            Use `z-ai/glm-4.5-air:free` para conversa. O modelo da NVIDIA fica melhor para embeddings e busca semantica.
                                        </p>
                                    </div>
                                    <input
                                        value={form.apiKeyLabel}
                                        onChange={(e) => setForm((prev) => ({ ...prev, apiKeyLabel: e.target.value }))}
                                        placeholder="Nome da chave (ex: Cliente XPTO)"
                                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-teal-500"
                                    />
                                    <input
                                        value={form.apiKey}
                                        onChange={(e) => setForm((prev) => ({ ...prev, apiKey: e.target.value }))}
                                        placeholder="API key propria do agente"
                                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-teal-500"
                                    />
                                    <div className="space-y-2">
                                        <label className="block text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                                            Numero vinculado
                                        </label>
                                        <select
                                            value={form.boundChannelId}
                                            onChange={(e) => setForm((prev) => ({ ...prev, boundChannelId: e.target.value }))}
                                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-teal-500"
                                        >
                                            <option value="">Sem numero fixo</option>
                                            {sessions.map((session) => (
                                                <option key={session.id} value={session.id}>
                                                    {session.instance_name} {session.phone_number ? `- ${session.phone_number}` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <textarea
                                        value={form.instructions}
                                        onChange={(e) => setForm((prev) => ({ ...prev, instructions: e.target.value }))}
                                        placeholder="Instrucoes do agente"
                                        rows={5}
                                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium outline-none focus:border-teal-500"
                                    />
                                    <textarea
                                        value={form.knowledgeBase}
                                        onChange={(e) => setForm((prev) => ({ ...prev, knowledgeBase: e.target.value }))}
                                        placeholder="Base de conhecimento"
                                        rows={5}
                                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium outline-none focus:border-teal-500"
                                    />
                                    <button
                                        onClick={createAgent}
                                        className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-xs font-black uppercase tracking-[0.2em] text-white"
                                    >
                                        <Bot size={16} className="text-teal-400" />
                                        {editingAgentId ? 'Salvar agente' : 'Criar agente'}
                                    </button>
                                    {editingAgentId && (
                                        <button
                                            onClick={resetForm}
                                            className="ml-3 inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-5 py-3 text-xs font-black uppercase tracking-[0.2em] text-slate-700"
                                        >
                                            Cancelar
                                        </button>
                                    )}
                                </div>

                                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                                    <div className="flex items-center gap-3">
                                        <ShieldCheck className="text-amber-600" size={18} />
                                        <h2 className="text-lg font-black text-slate-900">Liberar modulo</h2>
                                    </div>
                                    <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                                        {users.map((item) => (
                                            <div key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 flex items-center justify-between gap-4">
                                                <div>
                                                    <p className="text-sm font-black text-slate-900">{item.name}</p>
                                                    <p className="text-xs text-slate-500">{item.email}</p>
                                                </div>
                                                <button
                                                    onClick={() => toggleAccess(item)}
                                                    className={`rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] ${item.canAccessAgents ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-900 text-white'}`}
                                                >
                                                    {item.canAccessAgents ? 'Liberado' : 'Liberar'}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="flex items-center gap-3 mb-5">
                                <Users className="text-slate-500" size={18} />
                                <h2 className="text-lg font-black text-slate-900">Agentes disponiveis</h2>
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                                {agents.map((agent) => (
                                    <div key={agent.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5 space-y-3">
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <h3 className="text-base font-black text-slate-900">{agent.name}</h3>
                                                <p className="text-xs text-slate-500">{agent.description || 'Sem descricao.'}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className={`rounded-xl px-3 py-1 text-[10px] font-black uppercase ${agent.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                                                    {agent.isActive ? 'Ativo' : 'Inativo'}
                                                </div>
                                                {isMaster && (
                                                    <>
                                                        <button
                                                            onClick={() => startEditing(agent.id)}
                                                            className="rounded-xl bg-sky-50 p-2 text-sky-600 transition-all hover:bg-sky-100"
                                                            title="Editar agente"
                                                        >
                                                            <Pencil size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => deleteAgent(agent.id, agent.name)}
                                                            className="rounded-xl bg-rose-50 p-2 text-rose-600 transition-all hover:bg-rose-100"
                                                            title="Excluir agente"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-2 text-xs text-slate-600">
                                            <p><strong>Modulo:</strong> {agent.module}</p>
                                            <p><strong>Modelo:</strong> {agent.model}</p>
                                            <p><strong>Modo padrao:</strong> {agent.defaultMode}</p>
                                            <p><strong>Numero vinculado:</strong> {agent.boundChannelId || 'Sem vinculo fixo'}</p>
                                            <p><strong>Chave propria:</strong> {agent.hasCustomApiKey ? (agent.apiKeyLabel || 'Configurada') : 'Nao'}</p>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            {(agent.tools || []).slice(0, 4).map((tool) => (
                                                <span key={tool} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-bold text-slate-600">
                                                    <KeyRound size={10} className="inline mr-1" />
                                                    {tool}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </AdminLayout>
    );
}
