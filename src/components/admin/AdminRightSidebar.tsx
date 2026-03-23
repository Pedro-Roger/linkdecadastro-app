import React, { useState } from 'react';
import {
    X,
    Send,
    Sparkles,
    Database,
    Cpu,
    Zap,
    UserCircle2
} from 'lucide-react';
import { apiFetch } from '@/lib/api';

type SidebarMessage = {
    id: number;
    role: 'user' | 'assistant';
    content: string;
};

export default function AdminRightSidebar() {
    const [isOpen, setIsOpen] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [messages, setMessages] = useState<SidebarMessage[]>([
        {
            id: 1,
            role: 'assistant',
            content: 'Estou pronto para ajudar com eventos, cursos, atendimentos e operação. Suas perguntas agora passam pelo backend, sem pedir API key no navegador.',
        },
    ]);
    const [input, setInput] = useState('');

    const handleSend = async () => {
        const userMsg = input.trim();
        if (!userMsg || isLoading) return;

        const nextUserMessage: SidebarMessage = {
            id: Date.now(),
            role: 'user',
            content: userMsg,
        };

        const nextHistory = [...messages, nextUserMessage];
        setMessages(nextHistory);
        setInput('');
        setIsLoading(true);

        try {
            const response = await apiFetch<{ message: string }>('/admin/ai-assistant/chat', {
                method: 'POST',
                auth: true,
                body: JSON.stringify({
                    message: userMsg,
                    history: nextHistory.map(({ role, content }) => ({ role, content })),
                }),
            });

            setMessages((prev) => [
                ...prev,
                {
                    id: Date.now() + 1,
                    role: 'assistant',
                    content: response.message || 'Não consegui gerar uma resposta agora.',
                },
            ]);
        } catch (error: any) {
            setMessages((prev) => [
                ...prev,
                {
                    id: Date.now() + 1,
                    role: 'assistant',
                    content:
                        error?.message ||
                        'Não consegui falar com a IA agora. Verifique se a chave está configurada no backend.',
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed right-6 bottom-6 z-40 flex h-14 w-14 items-center justify-center rounded-full border-2 border-emerald-500/30 bg-slate-900 text-white shadow-2xl transition-all hover:scale-110 group"
            >
                <Sparkles size={24} className="text-emerald-400 transition-transform group-hover:rotate-12" />
            </button>
        );
    }

    return (
        <aside className="fixed top-0 right-0 z-40 flex h-screen w-[400px] flex-col border-l border-[var(--border-light)] bg-white shadow-2xl animate-in slide-in-from-right duration-500 lg:relative">
            <div className="relative overflow-hidden border-b border-[var(--border-light)] bg-slate-900 p-8 text-white">
                <div className="absolute top-0 right-0 -mt-8 -mr-8 h-32 w-32 rounded-full bg-emerald-500/10 blur-3xl" />
                <div className="relative z-10 flex items-center justify-between">
                    <div>
                        <h2 className="flex items-center gap-2 text-xl font-black">
                            AI Assist <span className="text-emerald-400">Backend</span>
                        </h2>
                        <div className="mt-1 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-emerald-400">
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Contexto seguro no servidor
                        </div>
                    </div>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="relative z-10 rounded-2xl p-2.5 text-white/40 transition-all hover:bg-white/10 hover:text-white active:scale-90"
                    >
                        <X size={20} />
                    </button>
                </div>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto bg-slate-50/30 p-8 custom-scrollbar">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div
                            className={`max-w-[85%] rounded-3xl p-5 text-sm leading-relaxed shadow-sm ${msg.role === 'user'
                                ? 'rounded-br-none border-b-2 border-emerald-500 bg-slate-900 font-bold text-white'
                                : 'rounded-bl-none border border-slate-100 bg-white text-slate-700'
                                }`}
                        >
                            {msg.role === 'assistant' && (
                                <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-500">
                                    <Cpu size={12} /> AI Oracle
                                </div>
                            )}
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="border-t border-slate-100 bg-white p-8 shadow-[0_-15px_30px_rgba(0,0,0,0.02)]">
                <div className="flex items-center gap-3 rounded-3xl border border-slate-100 bg-slate-50 p-2.5 shadow-inner transition-all focus-within:border-emerald-500/30 focus-within:ring-2 focus-within:ring-emerald-500/10">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                        placeholder="Pergunte algo sobre seus dados, eventos ou operação..."
                        className="max-h-32 flex-1 resize-none border-none bg-transparent px-3 py-2.5 text-sm font-medium outline-none focus:ring-0"
                        rows={1}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading}
                        className={`rounded-2xl p-4 shadow-xl transition-all ${!input.trim() || isLoading ? 'bg-slate-800 text-slate-500 opacity-50' : 'bg-slate-900 text-emerald-400 shadow-slate-900/10 hover:scale-105 active:scale-95'}`}
                    >
                        {isLoading ? (
                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
                        ) : (
                            <Send size={20} />
                        )}
                    </button>
                </div>
                <div className="mt-4 flex items-center justify-between px-1">
                    <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400">
                            <Database size={12} className="text-emerald-500" /> Backend Context
                        </span>
                        <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400">
                            <Zap size={12} className="text-amber-500" /> OpenRouter via env
                        </span>
                    </div>
                    <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-900">
                        Sync <UserCircle2 size={12} />
                    </span>
                </div>
            </div>
        </aside>
    );
}
