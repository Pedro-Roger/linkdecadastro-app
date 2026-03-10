import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/layouts/AdminLayout';
import { apiFetch } from '@/lib/api';
import { Bot, Save, AlertCircle, Sparkles, BrainCircuit, Database } from 'lucide-react';

export default function AiSettingsPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [config, setConfig] = useState({
        isActive: false,
        prompt: '',
        context: '',
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
            });
        } catch (error) {
            window.alert('Erro ao buscar as configurações da IA.');
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
            window.alert('Configurações da Inteligência Artificial salvas!');
        } catch (error) {
            window.alert('Erro ao salvar as configurações.');
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
                        Treinamento da Inteligência Artificial
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium">Configure como a sua IA deve agir e falar com seus clientes no atendimento humano.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-70"
                >
                    {isSaving ? <span className="animate-pulse">Salvando...</span> : <><Save size={20} /> Salvar Configurações</>}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Lado Esquerdo - Configurações */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Status Card */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${config.isActive ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                <Sparkles size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900">Atendimento Autônomo da IA</h3>
                                <p className="text-sm text-slate-500">A IA responderá os clientes automaticamente se ativada.</p>
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

                    {/* System Prompt Card */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center gap-2">
                            <BrainCircuit className="text-blue-500" size={20} />
                            <h3 className="font-bold text-slate-800">Persona e Regras de Ouro (System Prompt)</h3>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-slate-500 mb-4">Instrua a IA sobre como ela deve se portar, o tom de voz e os limites éticos que ela deve seguir ao responder.</p>
                            <textarea
                                value={config.prompt}
                                onChange={(e) => setConfig({ ...config, prompt: e.target.value })}
                                className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                                placeholder="Você é o agente de vendas da LinkDeCadastro. Seja sempre educado e feliz..."
                            />
                        </div>
                    </div>

                    {/* Context Data Card */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center gap-2">
                            <Database className="text-blue-500" size={20} />
                            <h3 className="font-bold text-slate-800">Banco de Dados e FAQs (Conhecimento da IA)</h3>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-slate-500 mb-4">Adicione nesse campo todas as perguntas frequentes, horários, preços e informações úteis que o robô usará como "memória" para responder os clientes sem errar.</p>
                            <textarea
                                value={config.context}
                                onChange={(e) => setConfig({ ...config, context: e.target.value })}
                                className="w-full h-80 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none font-mono text-sm"
                                placeholder="Ex:&#10;Q: Qual o horário do evento?&#10;R: O evento começa às 19:00.&#10;&#10;Q: Onde é o local?&#10;R: O evento será no auditório central."
                            />
                        </div>
                    </div>
                </div>

                {/* Lado Direito - Dicas */}
                <div className="space-y-6">
                    <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                        <h4 className="font-bold text-blue-900 flex items-center gap-2 mb-4">
                            <AlertCircle size={18} className="text-blue-600" />
                            Dicas de Treinamento
                        </h4>
                        <ul className="space-y-4 text-sm text-blue-800/80">
                            <li className="flex items-start gap-2">
                                <div className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></div>
                                <p><strong>Seja Direto:</strong> A IA será quem você ordenar. Escreva regras claras na Persona.</p>
                            </li>
                            <li className="flex items-start gap-2">
                                <div className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></div>
                                <p><strong>Limite de Escopo:</strong> Ao final do prompt, você pode adicionar a regra de "Não responda sobre outras empresas."</p>
                            </li>
                            <li className="flex items-start gap-2">
                                <div className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></div>
                                <p><strong>Contexto:</strong> Formatar seu contexto em Pergunta & Resposta ajuda a IA a ler as informações perfeitamente.</p>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
