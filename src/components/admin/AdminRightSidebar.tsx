import React, { useState, useEffect } from 'react';
import {
    X,
    Send,
    Sparkles,
    Database,
    ShieldCheck,
    Cpu,
    Zap,
    Key,
    UserCircle2
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/useAuth';

export default function AdminRightSidebar() {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(true);
    const [isConnecting, setIsConnecting] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [authCode, setAuthCode] = useState(import.meta.env.VITE_OPENROUTER_API_KEY || '');

    useEffect(() => {
        if (import.meta.env.VITE_OPENROUTER_API_KEY) {
            setIsConnecting(true);
            setTimeout(() => {
                setIsConnecting(false);
                setIsConnected(true);
                setMessages([{
                    id: Date.now(),
                    role: 'assistant',
                    content: `✅ **Conectado via .env!** Olá ${user?.name?.split(' ')[0] || 'Administrador'}, sou seu AI Oracle. Como posso ajudar com seus dados hoje?`
                }]);
            }, 1000);
        }
    }, []);

    const [isLoading, setIsLoading] = useState(false);
    const [messages, setMessages] = useState<any[]>([
        { id: 1, role: 'assistant', content: 'Olá! Eu sou o seu assistente **AI**. Conecte sua conta para que eu possa acessar seus dados e ajudar na gestão do portal.' }
    ]);
    const [input, setInput] = useState('');
    const [adminContext, setAdminContext] = useState<string>('');

    useEffect(() => {
        if (isConnected) {
            const fetchContext = async () => {
                try {
                    const [coursesReq, eventsReq, aiConfigReq] = await Promise.all([
                        apiFetch<any[]>('/admin/courses', { auth: true }).catch(() => []),
                        apiFetch<any[]>('/admin/events/history', { auth: true }).catch(() => []),
                        apiFetch<any>('/admin/ai-assistant/config', { auth: true }).catch(() => ({}))
                    ]);

                    const coursesStr = coursesReq?.length ? coursesReq.map(c => `- Título: "${c.title}" | Status: ${c.status} | Inscritos: ${c._count?.enrollments || c.enrollmentsCount || 0}`).join('\n') : 'Nenhum curso criado.';
                    const eventsStr = eventsReq?.length ? eventsReq.map(e => `- Título: "${e.title}" | Status: ${e.status} | Inscritos: ${e._count?.registrations || e.registrationsCount || 0}`).join('\n') : 'Nenhum evento criado.';

                    let finalContext = `\n\n[DADOS DO ADMNISTRADOR LOGADO]\n--- NOME DO USUÁRIO ATUAL ---\nNome: ${user?.name || 'Administrador'}\nEmail: ${user?.email || 'N/A'}\nCargo: ${user?.role || 'Admin'}\n\n[DADOS ATUAIS DA SUA CONTA]\n--- CURSOS EXISTENTES ---\n${coursesStr}\n\n--- EVENTOS EXISTENTES ---\n${eventsStr}\n\n`;
                    let sysPrompt = `Você é um Assistente Analítico Oficial da Link de Cadastro focado em ajudar o dono da conta atual, o(a) ${user?.name || 'Administrador'}. Responda em português, chame-o pelo nome dele e aja como um fiel parceiro consultor com dados.`;

                    if (aiConfigReq?.context) {
                        finalContext += `[BASE DE CONHECIMENTO E DÚVIDAS E REGRAS DA EMPRESA (FAQ)]\nAs seguintes informações abaixo são verdades absolutas da sua empresa:\n${aiConfigReq.context}\n\n`;
                    }

                    if (aiConfigReq?.prompt) {
                        sysPrompt = aiConfigReq.prompt;
                    }

                    finalContext += `[REGRAS FUNDAMENTAIS DA SUA RESPOSTA HORIZONTAL E DIRETA]\n1. Se o usuário perguntar qualquer coisa que está listada na "BASE DE CONHECIMENTO (FAQ)", dê a resposta exata e direta baseada nessa base.\n2. Se ele pedir para listar os eventos ou nomes, DÊ A LISTA EXATA com status.\n3. VOCÊ NÃO PODE CRIAR EVENTOS OU CURSOS NEM OFERECER ISSO. Se quiserem criar, diga para apertar no botão verde "Novo" na tela principal.\n4. Sempre seja proativo baseando-se no contexto atual.`;

                    setAdminContext(`---INICIO DO CONTEXTO DE SISTEMA OBRIGATORIO---\n${sysPrompt}\n${finalContext}\n---FIM DO CONTEXTO DE SISTEMA---`);
                } catch (e) {
                    console.error("Erro ao buscar contexto AI", e);
                }
            };
            fetchContext();
        }
    }, [isConnected]);

    const handleConnectAI = async () => {
        if (!authCode.trim()) {
            alert('Por favor, insira o token da API OpenRouter.');
            return;
        }
        setIsConnecting(true);
        // Simulando conexão com a API
        setTimeout(() => {
            setIsConnecting(false);
            setIsConnected(true);
            setMessages(prev => [...prev, {
                id: Date.now(),
                role: 'assistant',
                content: '✅ **Conectado com sucesso!** Agora atuo como seu oráculo pessoal. Como posso te ajudar agora?'
            }]);
        }, 1000);
    };

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;
        const userMsg = input;
        const newMsg = { id: Date.now(), role: 'user', content: userMsg };
        setMessages(prev => [...prev, newMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const apiMessages = messages
                .filter(m => m.role === 'user' || m.role === 'assistant')
                .map(m => ({ role: m.role, content: m.content }));

            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${authCode}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: "meta-llama/llama-3.1-70b-instruct",
                    messages: [
                        { role: "system", content: adminContext },
                        ...apiMessages,
                        { role: "user", content: userMsg }
                    ]
                })
            });

            if (!response.ok) throw new Error("Erro na API da OpenRouter");

            const data = await response.json();
            const aiContent = data.choices[0].message.content;

            setMessages(prev => [...prev, {
                id: Date.now(),
                role: 'assistant',
                content: aiContent
            }]);
        } catch (error) {
            setMessages(prev => [...prev, {
                id: Date.now(),
                role: 'assistant',
                content: "⚠️ **Erro:** Ocorreu um problema ao comunicar com a inteligência artificial. Verifique se o Token da API está correto."
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return (
        <button
            onClick={() => setIsOpen(true)}
            className="fixed right-6 bottom-6 w-14 h-14 bg-slate-900 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-all z-40 border-2 border-emerald-500/30 group"
        >
            <Sparkles size={24} className="text-emerald-400 group-hover:rotate-12 transition-transform" />
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-black">1</div>
        </button>
    );

    return (
        <aside className="fixed lg:relative right-0 top-0 h-screen w-[400px] bg-white border-l border-[var(--border-light)] flex flex-col z-40 animate-in slide-in-from-right duration-500 shadow-2xl">
            {/* Header */}
            <div className="p-8 border-b border-[var(--border-light)] flex items-center justify-between bg-slate-900 text-white relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-8 -mt-8 group-hover:scale-125 transition-transform duration-1000"></div>

                <div className="relative z-10">
                    <h2 className="text-xl font-black flex items-center gap-2">
                        AI Assist <span className="text-emerald-400">OpenRouter</span>
                    </h2>
                    <div className="flex items-center gap-3 mt-1">
                        <div className={`flex items-center gap-2 px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-widest ${isConnected ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`}></div>
                            {isConnected ? 'Sistema: Conectado' : 'Sistema: Offline'}
                        </div>
                    </div>
                </div>
                <button onClick={() => setIsOpen(false)} className="p-2.5 hover:bg-white/10 text-white/40 hover:text-white rounded-2xl transition-all relative z-10 active:scale-90">
                    <X size={20} />
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar bg-slate-50/30">
                {!isConnected ? (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-8 p-4">
                        <div className="relative">
                            <div className="w-24 h-24 bg-slate-900 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-emerald-500/10 relative z-10 overflow-hidden group">
                                <Cpu size={48} className="text-emerald-400 group-hover:scale-110 transition-transform" />
                                <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-emerald-500/20 to-transparent"></div>
                            </div>
                            <div className="absolute -inset-4 bg-emerald-500/10 rounded-[3rem] blur-xl animate-pulse"></div>
                        </div>

                        <div className="space-y-3">
                            <h3 className="text-xl font-black text-slate-900 tracking-tight">Conectar com OpenRouter</h3>
                            <p className="text-xs text-slate-500 font-medium leading-relaxed px-4">
                                Insira a API Key do OpenRouter para que a IA possa acessar seus dados e atuar como seu **Oráculo**.
                            </p>
                        </div>

                        <div className="w-full space-y-4 pt-4">
                            <div className="relative">
                                <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="password"
                                    value={authCode}
                                    onChange={(e) => setAuthCode(e.target.value)}
                                    placeholder="Authorization Token"
                                    className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm outline-none"
                                />
                            </div>

                            <button
                                onClick={handleConnectAI}
                                disabled={isConnecting}
                                className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-xl shadow-slate-900/20 active:scale-95 disabled:opacity-50"
                            >
                                {isConnecting ? (
                                    <><Zap size={18} className="text-emerald-400 animate-bounce" /> CONECTANDO...</>
                                ) : (
                                    <><ShieldCheck size={18} className="text-emerald-400" /> ATIVAR ORÁCULO AI</>
                                )}
                            </button>

                            <a href="https://openrouter.ai" target="_blank" rel="noopener noreferrer" className="inline-block text-[10px] font-black text-emerald-600 uppercase tracking-widest hover:underline">
                                Obter Token no Site Oficial
                            </a>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-500">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] p-5 rounded-3xl text-sm leading-relaxed shadow-sm ${msg.role === 'user'
                                    ? 'bg-slate-900 text-white font-bold rounded-br-none border-b-2 border-emerald-500'
                                    : 'bg-white border border-slate-100 text-slate-700 rounded-bl-none'
                                    }`}>
                                    {msg.role === 'assistant' && <div className="flex items-center gap-2 mb-2 text-[10px] font-black text-emerald-500 uppercase tracking-widest"><Cpu size={12} /> AI Oracle</div>}
                                    <p className="whitespace-pre-wrap">{msg.content}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer Input Area */}
            {isConnected && (
                <div className="p-8 bg-white border-t border-slate-100 shadow-[0_-15px_30px_rgba(0,0,0,0.02)]">
                    <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-3xl p-2.5 focus-within:ring-2 focus-within:ring-emerald-500/10 focus-within:border-emerald-500/30 transition-all shadow-inner">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                            placeholder="Faça uma pergunta sobre seus dados..."
                            className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-2.5 px-3 outline-none resize-none max-h-32 font-medium"
                            rows={1}
                        />
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || isLoading}
                            className={`p-4 rounded-2xl shadow-xl transition-all ${!input.trim() || isLoading ? 'bg-slate-800 text-slate-500 opacity-50' : 'bg-slate-900 text-emerald-400 hover:scale-105 active:scale-95 shadow-slate-900/10'}`}
                        >
                            {isLoading ? <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div> : <Send size={20} />}
                        </button>
                    </div>
                    <div className="flex justify-between items-center mt-4 px-1">
                        <div className="flex items-center gap-4">
                            <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-1.5">
                                <Database size={12} className="text-emerald-500" /> Database Live
                            </span>
                            <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-1.5">
                                <Zap size={12} className="text-amber-500" /> 12ms Latency
                            </span>
                        </div>
                        <button className="text-[9px] text-slate-900 font-black uppercase tracking-widest hover:text-emerald-600 transition-colors flex items-center gap-1.5">
                            Sync <UserCircle2 size={12} />
                        </button>
                    </div>
                </div>
            )}
        </aside>
    );
}
