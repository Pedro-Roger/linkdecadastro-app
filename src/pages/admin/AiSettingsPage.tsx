import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/layouts/AdminLayout';
import { apiFetch } from '@/lib/api';
import { Bot, Save, AlertCircle, Sparkles, BrainCircuit, Database, KeyRound, Settings2, WandSparkles } from 'lucide-react';

export default function AiSettingsPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [config, setConfig] = useState({
        isActive: false,
        prompt: '',
        context: '',
        model: 'openai/gpt-oss-20b',
        apiKey: '',
        apiKeyLabel: '',
        hasCustomApiKey: false,
        allowEventCreation: true,
        allowCourseCreation: true,
        defaultMaxRegistrations: 1000,
    });

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const data = await apiFetch<any>('/admin/ai-assistant/config', { auth: true });
            setConfig({
                isActive: data.isActive || false,
                prompt: data.prompt || '',
                context: data.context || '',
                model: data.model || 'openai/gpt-oss-20b',
                apiKey: '',
                apiKeyLabel: data.apiKeyLabel || '',
                hasCustomApiKey: Boolean(data.hasCustomApiKey),
                allowEventCreation: data.allowEventCreation ?? true,
                allowCourseCreation: data.allowCourseCreation ?? true,
                defaultMaxRegistrations: data.defaultMaxRegistrations || 1000,
            });
        } catch (error) {
            window.alert('Erro ao buscar as configuracoes da IA.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await apiFetch('/admin/ai-assistant/config', {
                method: 'PUT',
                body: JSON.stringify(config),
                auth: true,
            });
            window.alert('Configuracoes da AI Assist salvas!');
            fetchConfig();
        } catch (error) {
            window.alert('Erro ao salvar as configuracoes.');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <AdminLayout>
                <div className="flex h-[400px] items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                        <Bot className="text-blue-500" size={32} />
                        Configuracao da AI Assist
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium">
                        Transforme a IA da plataforma em um copiloto operacional com modelo, chave e acoes configuraveis.
                    </p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-70"
                >
                    {isSaving ? <span className="animate-pulse">Salvando...</span> : <><Save size={20} /> Salvar Configuracoes</>}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${config.isActive ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                <Sparkles size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900">AI Assist ativa</h3>
                                <p className="text-sm text-slate-500">Quando ativada, a IA da plataforma conversa no modal e pode executar acoes administrativas liberadas.</p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={config.isActive}
                                onChange={(e) => setConfig({ ...config, isActive: e.target.checked })}
                            />
                            <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-500"></div>
                        </label>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center gap-2">
                            <Settings2 className="text-blue-500" size={20} />
                            <h3 className="font-bold text-slate-800">Motor e Credenciais</h3>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="text-sm font-bold text-slate-700 block mb-2">Modelo</label>
                                <input
                                    value={config.model}
                                    onChange={(e) => setConfig({ ...config, model: e.target.value })}
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="z-ai/glm-4.5-air:free"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-bold text-slate-700 block mb-2">Nome da chave</label>
                                <input
                                    value={config.apiKeyLabel}
                                    onChange={(e) => setConfig({ ...config, apiKeyLabel: e.target.value })}
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Cliente XPTO"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-bold text-slate-700 block mb-2">API key propria</label>
                                <input
                                    type="password"
                                    value={config.apiKey}
                                    onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder={config.hasCustomApiKey ? 'Ja existe uma chave salva. Digite para trocar.' : 'Cole uma chave propria opcional'}
                                />
                                {config.hasCustomApiKey && (
                                    <p className="mt-2 text-xs font-medium text-emerald-600">Existe uma chave personalizada salva para esta AI Assist.</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center gap-2">
                            <WandSparkles className="text-blue-500" size={20} />
                            <h3 className="font-bold text-slate-800">Acoes Permitidas</h3>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
                                <div>
                                    <div className="font-bold text-slate-900">Criar eventos</div>
                                    <div className="text-sm text-slate-500">Permite que a IA crie eventos e retorne o link do formulario.</div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={config.allowEventCreation}
                                    onChange={(e) => setConfig({ ...config, allowEventCreation: e.target.checked })}
                                    className="h-5 w-5"
                                />
                            </label>
                            <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
                                <div>
                                    <div className="font-bold text-slate-900">Criar cursos</div>
                                    <div className="text-sm text-slate-500">Permite que a IA crie cursos e retorne o link publico.</div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={config.allowCourseCreation}
                                    onChange={(e) => setConfig({ ...config, allowCourseCreation: e.target.checked })}
                                    className="h-5 w-5"
                                />
                            </label>
                            <div className="md:col-span-2">
                                <label className="text-sm font-bold text-slate-700 block mb-2">Limite padrao de vagas</label>
                                <input
                                    type="number"
                                    min={1}
                                    value={config.defaultMaxRegistrations}
                                    onChange={(e) => setConfig({ ...config, defaultMaxRegistrations: Number(e.target.value) || 1000 })}
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                                <p className="mt-2 text-xs text-slate-500">Se voce nao informar limite no pedido, a AI usara esse valor por padrao.</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center gap-2">
                            <BrainCircuit className="text-blue-500" size={20} />
                            <h3 className="font-bold text-slate-800">Persona e Regras</h3>
                        </div>
                        <div className="p-6">
                            <textarea
                                value={config.prompt}
                                onChange={(e) => setConfig({ ...config, prompt: e.target.value })}
                                className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                placeholder="Voce e minha assistente administrativa. Sempre que eu pedir para criar evento, crie com clareza e devolva o link."
                            />
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center gap-2">
                            <Database className="text-blue-500" size={20} />
                            <h3 className="font-bold text-slate-800">Contexto e Memoria</h3>
                        </div>
                        <div className="p-6">
                            <textarea
                                value={config.context}
                                onChange={(e) => setConfig({ ...config, context: e.target.value })}
                                className="w-full h-80 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none font-mono text-sm"
                                placeholder="Explique aqui regras comerciais, padrao de criacao, convencoes de nome, funil, horarios e outras instrucoes uteis."
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                        <h4 className="font-bold text-blue-900 flex items-center gap-2 mb-4">
                            <AlertCircle size={18} className="text-blue-600" />
                            Como Usar
                        </h4>
                        <ul className="space-y-4 text-sm text-blue-800/80">
                            <li className="flex items-start gap-2">
                                <div className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></div>
                                <p><strong>Janela flutuante:</strong> abra o AI Assist pelo botao no canto, mova pela tela e minimize quando quiser.</p>
                            </li>
                            <li className="flex items-start gap-2">
                                <div className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></div>
                                <p><strong>Criacao rapida:</strong> use comandos como "crie um evento com nome Convenção de Vendas com limite para 500 pessoas".</p>
                            </li>
                            <li className="flex items-start gap-2">
                                <div className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></div>
                                <p><strong>Chave propria:</strong> se quiser monitorar custo por cliente, salve uma API key especifica aqui.</p>
                            </li>
                        </ul>
                    </div>

                    <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl">
                        <div className="flex items-center gap-3 mb-4">
                            <KeyRound className="text-emerald-400" size={20} />
                            <h4 className="font-black">Exemplos de Comandos</h4>
                        </div>
                        <div className="space-y-3 text-sm text-slate-300">
                            <p>crie um evento com nome Workshop Comercial</p>
                            <p>crie um evento com nome Convenção 2026 com limite para 250 pessoas</p>
                            <p>crie um curso com nome Treinamento de Lideranca</p>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
