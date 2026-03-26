import React, { useEffect, useState } from 'react';
import AdminLayout from '@/components/layouts/AdminLayout';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/useAuth';
import {
  Bot,
  ChevronDown,
  ChevronUp,
  Cpu,
  KeyRound,
  Pencil,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react';

const AGENT_MODEL_OPTIONS = [
  'openai/gpt-oss-20b',
  'openai/gpt-4.1-mini',
  'openai/gpt-4.1',
  'nvidia/llama-nemotron-embed-vl-1b-v2:free',
];

const AGENT_MODULE_OPTIONS = [
  { value: 'atendimento', label: 'Atendimento' },
  { value: 'comercial', label: 'Comercial' },
  { value: 'suporte', label: 'Suporte' },
  { value: 'cobranca', label: 'Cobranca' },
  { value: 'operacional', label: 'Operacional' },
  { value: 'analitico', label: 'Analitico' },
];

type AgentMode = 'HUMAN' | 'COPILOT' | 'AUTONOMOUS';

type AgentItem = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  module: string;
  model: string;
  isActive: boolean;
  defaultMode: AgentMode;
  tools: string[];
  boundChannelId?: string | null;
  allowedChannelIds?: string[];
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

type AvailableTool = {
  key: string;
  enabledByDefault?: boolean;
};

type AgentFormState = {
  name: string;
  slug: string;
  description: string;
  module: string;
  model: string;
  apiKey: string;
  apiKeyLabel: string;
  boundChannelId: string;
  allowedChannelIds: string[];
  instructions: string;
  knowledgeBase: string;
  defaultMode: AgentMode;
  tools: string[];
  isActive: boolean;
};

const createInitialFormState = (): AgentFormState => ({
  name: '',
  slug: '',
  description: '',
  module: 'atendimento',
  model: 'openai/gpt-oss-20b',
  apiKey: '',
  apiKeyLabel: '',
  boundChannelId: '',
  allowedChannelIds: [],
  instructions: '',
  knowledgeBase: '',
  defaultMode: 'COPILOT',
  tools: [],
  isActive: true,
});

const labelBase =
  'block text-xs font-black uppercase tracking-[0.2em] text-slate-500';
const inputBase =
  'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-teal-500';

export default function AgentsPage() {
  const { user } = useAuth({ requireAuth: true, redirectTo: '/login' });
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<AgentItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [availableTools, setAvailableTools] = useState<AvailableTool[]>([]);
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [form, setForm] = useState<AgentFormState>(createInitialFormState);

  const isMaster = user?.role === 'SUPER_ADMIN';

  const loadData = async () => {
    try {
      const [agentsData, usersData, toolsData] = await Promise.all([
        apiFetch<AgentItem[]>('/admin/agents', { auth: true }),
        isMaster
          ? apiFetch<UserItem[]>('/admin/users', { auth: true })
          : Promise.resolve([]),
        apiFetch<AvailableTool[]>('/admin/agents/tools', { auth: true }).catch(
          () => [],
        ),
      ]);

      setAgents(Array.isArray(agentsData) ? agentsData : []);
      setUsers(Array.isArray(usersData) ? usersData : []);
      setAvailableTools(Array.isArray(toolsData) ? toolsData : []);
      const sessionsData = await apiFetch<any>('/api/whatsapp/sessions', {
        auth: true,
      }).catch(() => ({ sessions: [] }));
      setSessions(Array.isArray(sessionsData?.sessions) ? sessionsData.sessions : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData().catch(console.error);
  }, []);

  const updateForm = <K extends keyof AgentFormState>(
    key: K,
    value: AgentFormState[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const resetForm = () => {
    setEditingAgentId(null);
    setShowAdvanced(false);
    setForm(createInitialFormState());
  };

  const createAgent = async () => {
    if (!form.name.trim()) return;

    await apiFetch(editingAgentId ? `/admin/agents/${editingAgentId}` : '/admin/agents', {
      method: editingAgentId ? 'PATCH' : 'POST',
      auth: true,
      body: JSON.stringify({
        ...form,
        slug: form.slug.trim() || undefined,
        apiKey: form.apiKey.trim() || undefined,
        apiKeyLabel: form.apiKeyLabel.trim() || undefined,
        boundChannelId: form.boundChannelId || undefined,
        allowedChannelIds: form.allowedChannelIds,
      }),
    });

    resetForm();
    await loadData();
  };

  const startEditing = async (agentId: string) => {
    const agent = await apiFetch<any>(`/admin/agents/${agentId}`, { auth: true });
    setEditingAgentId(agent.id);
    setShowAdvanced(true);
    setForm({
      name: agent.name || '',
      slug: agent.slug || '',
      description: agent.description || '',
      module: agent.module || 'atendimento',
      model: agent.model || 'openai/gpt-oss-20b',
      apiKey: '',
      apiKeyLabel: agent.apiKeyLabel || '',
      boundChannelId: agent.boundChannelId || '',
      allowedChannelIds: Array.isArray(agent.allowedChannelIds)
        ? agent.allowedChannelIds
        : [],
      instructions: agent.instructions || '',
      knowledgeBase: agent.knowledgeBase || '',
      defaultMode: agent.defaultMode || 'COPILOT',
      tools: Array.isArray(agent.tools) ? agent.tools : [],
      isActive: agent.isActive !== false,
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

  const toggleTool = (toolKey: string) => {
    updateForm(
      'tools',
      form.tools.includes(toolKey)
        ? form.tools.filter((tool) => tool !== toolKey)
        : [...form.tools, toolKey],
    );
  };

  const toggleAllowedChannel = (channelId: string) => {
    updateForm(
      'allowedChannelIds',
      form.allowedChannelIds.includes(channelId)
        ? form.allowedChannelIds.filter((id) => id !== channelId)
        : [...form.allowedChannelIds, channelId],
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="flex items-center gap-3 text-3xl font-extrabold tracking-tight text-slate-900">
              <Cpu className="text-teal-600" size={30} />
              Agentes
            </h1>
            <p className="mt-2 font-medium text-slate-500">
              Central de agentes do atendimento. O SUPER_ADMIN cria e libera quem
              pode usar esse modulo.
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
                <div className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-3">
                    <Sparkles className="text-teal-600" size={18} />
                    <h2 className="text-lg font-black text-slate-900">
                      {editingAgentId ? 'Editar agente' : 'Criar agente'}
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2 md:col-span-2">
                      <label className={labelBase}>Nome do agente</label>
                      <input
                        value={form.name}
                        onChange={(e) => updateForm('name', e.target.value)}
                        placeholder="Ex: Agente Comercial"
                        className={inputBase}
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <label className={labelBase}>Descricao curta</label>
                      <input
                        value={form.description}
                        onChange={(e) => updateForm('description', e.target.value)}
                        placeholder="Resumo rapido da funcao do agente"
                        className={inputBase}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className={labelBase}>Modulo</label>
                      <select
                        value={form.module}
                        onChange={(e) => updateForm('module', e.target.value)}
                        className={inputBase}
                      >
                        {AGENT_MODULE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className={labelBase}>Slug interno</label>
                      <input
                        value={form.slug}
                        onChange={(e) => updateForm('slug', e.target.value)}
                        placeholder="Opcional. Ex: agente-comercial"
                        className={inputBase}
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <label className={labelBase}>Modelo do agente</label>
                      <select
                        value={form.model}
                        onChange={(e) => updateForm('model', e.target.value)}
                        className={inputBase}
                      >
                        {AGENT_MODEL_OPTIONS.map((model) => (
                          <option key={model} value={model}>
                            {model}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-slate-500">
                        Use `openai/gpt-oss-20b` como padrao mais economico.
                        O modelo da NVIDIA fica melhor para embeddings e busca semantica.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className={labelBase}>Numero vinculado</label>
                      <select
                        value={form.boundChannelId}
                        onChange={(e) => updateForm('boundChannelId', e.target.value)}
                        className={inputBase}
                      >
                        <option value="">Sem numero fixo</option>
                        {sessions.map((session) => (
                          <option key={session.id} value={session.id}>
                            {session.instance_name}
                            {session.phone_number ? ` - ${session.phone_number}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className={labelBase}>Modo padrao do agente</label>
                      <select
                        value={form.defaultMode}
                        onChange={(e) =>
                          updateForm('defaultMode', e.target.value as AgentMode)
                        }
                        className={inputBase}
                      >
                        <option value="HUMAN">HUMAN</option>
                        <option value="COPILOT">COPILOT</option>
                        <option value="AUTONOMOUS">AUTONOMOUS</option>
                      </select>
                      <p className="text-xs text-slate-500">
                        Use <strong>AUTONOMOUS</strong> apenas quando o agente
                        puder agir sozinho com seguranca.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className={labelBase}>Instrucoes do agente</label>
                    <textarea
                      value={form.instructions}
                      onChange={(e) => updateForm('instructions', e.target.value)}
                      placeholder="Explique como o agente deve agir, responder e decidir."
                      rows={5}
                      className={`${inputBase} font-medium`}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className={labelBase}>Base de conhecimento</label>
                    <textarea
                      value={form.knowledgeBase}
                      onChange={(e) => updateForm('knowledgeBase', e.target.value)}
                      placeholder="Cole regras, contexto de negocio, produtos, politicas e respostas comuns."
                      rows={5}
                      className={`${inputBase} font-medium`}
                    />
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
                    <button
                      type="button"
                      onClick={() => setShowAdvanced((prev) => !prev)}
                      className="flex w-full items-center justify-between gap-3 text-left"
                    >
                      <div className="flex items-center gap-3">
                        <Settings2 className="text-slate-600" size={17} />
                        <div>
                          <p className="text-sm font-black text-slate-900">
                            Configuracoes avancadas
                          </p>
                          <p className="text-xs text-slate-500">
                            API propria, tools permitidas, canais e status do agente.
                          </p>
                        </div>
                      </div>
                      {showAdvanced ? (
                        <ChevronUp className="text-slate-500" size={18} />
                      ) : (
                        <ChevronDown className="text-slate-500" size={18} />
                      )}
                    </button>

                    {showAdvanced && (
                      <div className="mt-5 space-y-5">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <label className={labelBase}>Nome da chave</label>
                            <input
                              value={form.apiKeyLabel}
                              onChange={(e) =>
                                updateForm('apiKeyLabel', e.target.value)
                              }
                              placeholder="Ex: Cliente XPTO"
                              className={inputBase}
                            />
                          </div>

                          <div className="space-y-2">
                            <label className={labelBase}>API key propria</label>
                            <input
                              value={form.apiKey}
                              onChange={(e) => updateForm('apiKey', e.target.value)}
                              placeholder="Opcional. Use apenas se este agente tiver chave propria."
                              className={inputBase}
                            />
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-4">
                            <label className={labelBase}>Status do agente</label>
                            <button
                              type="button"
                              onClick={() => updateForm('isActive', !form.isActive)}
                              className={`rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-[0.2em] ${
                                form.isActive
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {form.isActive ? 'Ativo' : 'Inativo'}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <label className={labelBase}>Tools permitidas</label>
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            {availableTools.map((tool) => {
                              const enabled = form.tools.includes(tool.key);
                              return (
                                <button
                                  key={tool.key}
                                  type="button"
                                  onClick={() => toggleTool(tool.key)}
                                  className={`rounded-2xl border px-4 py-3 text-left transition ${
                                    enabled
                                      ? 'border-teal-400 bg-teal-50 text-teal-900'
                                      : 'border-slate-200 bg-white text-slate-700'
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <span className="text-sm font-black">
                                      {tool.key}
                                    </span>
                                    {tool.enabledByDefault && (
                                      <span className="rounded-full bg-slate-900 px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white">
                                        Padrao
                                      </span>
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <label className={labelBase}>Canais permitidos</label>
                          <p className="text-xs text-slate-500">
                            Limite onde este agente pode ser usado. Deixe vazio para
                            nao restringir.
                          </p>
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            {sessions.map((session) => {
                              const channelId = session.id;
                              const checked =
                                form.allowedChannelIds.includes(channelId);
                              return (
                                <button
                                  key={channelId}
                                  type="button"
                                  onClick={() => toggleAllowedChannel(channelId)}
                                  className={`rounded-2xl border px-4 py-3 text-left transition ${
                                    checked
                                      ? 'border-sky-400 bg-sky-50 text-sky-900'
                                      : 'border-slate-200 bg-white text-slate-700'
                                  }`}
                                >
                                  <p className="text-sm font-black">
                                    {session.instance_name}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {session.phone_number || 'Numero nao informado'}
                                  </p>
                                </button>
                              );
                            })}
                            {!sessions.length && (
                              <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-4 text-sm text-slate-500">
                                Nenhuma sessao encontrada para restringir canais.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
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
                        className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-5 py-3 text-xs font-black uppercase tracking-[0.2em] text-slate-700"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="text-amber-600" size={18} />
                    <h2 className="text-lg font-black text-slate-900">
                      Liberar modulo
                    </h2>
                  </div>
                  <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
                    {users.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4"
                      >
                        <div>
                          <p className="text-sm font-black text-slate-900">
                            {item.name}
                          </p>
                          <p className="text-xs text-slate-500">{item.email}</p>
                        </div>
                        <button
                          onClick={() => toggleAccess(item)}
                          className={`rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] ${
                            item.canAccessAgents
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-900 text-white'
                          }`}
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
              <div className="mb-5 flex items-center gap-3">
                <Users className="text-slate-500" size={18} />
                <h2 className="text-lg font-black text-slate-900">
                  Agentes disponiveis
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {agents.map((agent) => (
                  <div
                    key={agent.id}
                    className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50 p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-base font-black text-slate-900">
                          {agent.name}
                        </h3>
                        <p className="text-xs text-slate-500">
                          {agent.description || 'Sem descricao.'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className={`rounded-xl px-3 py-1 text-[10px] font-black uppercase ${
                            agent.isActive
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
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
                      <p>
                        <strong>Modulo:</strong> {agent.module}
                      </p>
                      <p>
                        <strong>Slug:</strong> {agent.slug}
                      </p>
                      <p>
                        <strong>Modelo:</strong> {agent.model}
                      </p>
                      <p>
                        <strong>Modo padrao:</strong> {agent.defaultMode}
                      </p>
                      <p>
                        <strong>Numero vinculado:</strong>{' '}
                        {agent.boundChannelId || 'Sem vinculo fixo'}
                      </p>
                      <p>
                        <strong>Chave propria:</strong>{' '}
                        {agent.hasCustomApiKey
                          ? agent.apiKeyLabel || 'Configurada'
                          : 'Nao'}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {(agent.tools || []).slice(0, 6).map((tool) => (
                        <span
                          key={tool}
                          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-bold text-slate-600"
                        >
                          <KeyRound size={10} className="mr-1 inline" />
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
