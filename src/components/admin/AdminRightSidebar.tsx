import React, { useEffect, useRef, useState } from 'react';
import {
    Minus,
    Send,
    Sparkles,
    Database,
    Cpu,
    Zap,
    UserCircle2,
    Maximize2,
    Move,
    Paperclip,
    X,
    Link2,
} from 'lucide-react';
import { apiFetch, getApiUrl } from '@/lib/api';

type SidebarMessage = {
    id: number;
    role: 'user' | 'assistant';
    content: string;
    actionCard?: {
        title: string;
        subtitle: string;
        fields: Array<{ label: string; value: string }>;
        link?: string;
        status: 'pending' | 'completed';
    } | null;
};

const DEFAULT_POSITION = { x: 0, y: 0 };

export default function AdminRightSidebar() {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [messages, setMessages] = useState<SidebarMessage[]>([
        {
            id: 1,
            role: 'assistant',
            content: 'Estou pronto para ajudar com operacao, CRM, eventos, cursos e atendimento. Posso conversar e tambem executar algumas acoes por voce.',
        },
    ]);
    const [input, setInput] = useState('');
    const [position, setPosition] = useState(DEFAULT_POSITION);
    const [dragging, setDragging] = useState(false);
    const [pendingAction, setPendingAction] = useState<any>(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [attachedImageUrl, setAttachedImageUrl] = useState<string | null>(null);
    const [attachedImagePreview, setAttachedImagePreview] = useState<string | null>(null);

    const dragOffsetRef = useRef({ x: 0, y: 0 });
    const panelRef = useRef<HTMLDivElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        const handleMove = (event: MouseEvent) => {
            if (!dragging) return;
            setPosition({
                x: event.clientX - dragOffsetRef.current.x,
                y: event.clientY - dragOffsetRef.current.y,
            });
        };

        const handleUp = () => setDragging(false);

        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleUp);

        return () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleUp);
        };
    }, [dragging]);

    const handleDragStart = (event: React.MouseEvent<HTMLDivElement>) => {
        if (!panelRef.current) return;
        const rect = panelRef.current.getBoundingClientRect();
        dragOffsetRef.current = {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
        };
        setDragging(true);
    };

    const handleSend = async () => {
        const userMsg = input.trim();
        if (!userMsg || isLoading) return;

        const nextUserMessage: SidebarMessage = {
            id: Date.now(),
            role: 'user',
            content: userMsg,
            actionCard: null,
        };

        const nextHistory = [...messages, nextUserMessage];
        setMessages(nextHistory);
        setInput('');
        setIsLoading(true);

        try {
            const response = await apiFetch<{ message: string; pendingAction?: any; actionCard?: any }>('/admin/ai-assistant/chat', {
                method: 'POST',
                auth: true,
                body: JSON.stringify({
                    message: userMsg,
                    mediaUrl: attachedImageUrl,
                    pendingAction,
                    history: nextHistory.map(({ role, content }) => ({ role, content })),
                }),
            });

            setPendingAction(response.pendingAction || null);
            setMessages((prev) => [
                ...prev,
                {
                    id: Date.now() + 1,
                    role: 'assistant',
                    content: response.message || 'Nao consegui gerar uma resposta agora.',
                    actionCard: response.actionCard || null,
                },
            ]);
            setAttachedImageUrl(null);
            setAttachedImagePreview(null);
        } catch (error: any) {
            setMessages((prev) => [
                ...prev,
                {
                    id: Date.now() + 1,
                    role: 'assistant',
                    content:
                        error?.message ||
                        'Nao consegui falar com a IA agora. Verifique a configuracao no backend.',
                    actionCard: null,
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setUploadingImage(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`${getApiUrl()}/admin/upload`, {
                method: 'POST',
                body: formData,
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            });

            const data = await response.json();
            if (data.url) {
                setAttachedImageUrl(data.url);
                setAttachedImagePreview(URL.createObjectURL(file));
            }
        } catch (error) {
            setMessages((prev) => [
                ...prev,
                {
                    id: Date.now() + 1,
                    role: 'assistant',
                    content: 'Nao consegui subir a imagem agora. Tente novamente.',
                    actionCard: null,
                },
            ]);
        } finally {
            setUploadingImage(false);
            if (event.target) event.target.value = '';
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => {
                    setIsOpen(true);
                    setIsMinimized(false);
                }}
                className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full border-2 border-emerald-500/30 bg-slate-900 text-white shadow-2xl transition-all hover:scale-110 group"
            >
                <Sparkles size={24} className="text-emerald-400 transition-transform group-hover:rotate-12" />
            </button>
        );
    }

    return (
        <div
            ref={panelRef}
            className="fixed z-40 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl"
            style={{
                width: 420,
                right: position.x === 0 ? 24 : 'auto',
                bottom: position.y === 0 ? 24 : 'auto',
                left: position.x !== 0 ? position.x : 'auto',
                top: position.y !== 0 ? position.y : 'auto',
            }}
        >
            <div
                onMouseDown={handleDragStart}
                className="relative cursor-move overflow-hidden border-b border-[var(--border-light)] bg-slate-900 px-6 py-5 text-white"
            >
                <div className="absolute top-0 right-0 -mt-8 -mr-8 h-32 w-32 rounded-full bg-emerald-500/10 blur-3xl" />
                <div className="relative z-10 flex items-center justify-between gap-4">
                    <div>
                        <h2 className="flex items-center gap-2 text-lg font-black">
                            AI Assist <span className="text-emerald-400">Workspace</span>
                        </h2>
                        <div className="mt-1 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-emerald-400">
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Modal flutuante com backend seguro
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="rounded-xl bg-white/10 p-2 text-white/70">
                            <Move size={14} />
                        </span>
                        <button
                            onClick={() => setIsMinimized((prev) => !prev)}
                            className="rounded-2xl p-2.5 text-white/40 transition-all hover:bg-white/10 hover:text-white active:scale-90"
                        >
                            {isMinimized ? <Maximize2 size={18} /> : <Minus size={18} />}
                        </button>
                    </div>
                </div>
            </div>

            {!isMinimized && (
                <>
                    <div className="flex h-[28rem] flex-col">
                        <div className="flex-1 space-y-6 overflow-y-auto bg-slate-50/30 p-6 custom-scrollbar">
                            {messages.map((msg) => (
                                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div
                                        className={`max-w-[88%] rounded-3xl p-4 text-sm leading-relaxed shadow-sm ${msg.role === 'user'
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
                                        {msg.actionCard && (
                                            <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
                                                <div className="flex items-center justify-between gap-2">
                                                    <div>
                                                        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                                                            {msg.actionCard.title}
                                                        </p>
                                                        <p className="mt-1 text-sm font-bold text-slate-900">
                                                            {msg.actionCard.subtitle}
                                                        </p>
                                                    </div>
                                                    <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${msg.actionCard.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                        {msg.actionCard.status === 'completed' ? 'Concluido' : 'Pendente'}
                                                    </span>
                                                </div>
                                                <div className="mt-3 space-y-2">
                                                    {msg.actionCard.fields.map((field, index) => (
                                                        <div key={`${field.label}-${index}`} className="flex items-center justify-between gap-4 text-xs">
                                                            <span className="font-black uppercase tracking-[0.16em] text-slate-400">{field.label}</span>
                                                            <span className="text-right font-semibold text-slate-700">{field.value}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                                {msg.actionCard.link && (
                                                    <a
                                                        href={msg.actionCard.link}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="mt-3 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-emerald-400"
                                                    >
                                                        <Link2 size={12} /> Abrir link
                                                    </a>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="border-t border-slate-100 bg-white p-5 shadow-[0_-15px_30px_rgba(0,0,0,0.02)]">
                            {attachedImagePreview && (
                                <div className="mb-3 flex items-center justify-between rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        <img src={attachedImagePreview} alt="Preview" className="h-12 w-12 rounded-xl object-cover" />
                                        <div>
                                            <p className="text-sm font-bold text-emerald-700">Imagem pronta para envio</p>
                                            <p className="text-xs font-medium text-emerald-600">Ela sera usada na proxima acao da AI Assist.</p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setAttachedImageUrl(null);
                                            setAttachedImagePreview(null);
                                        }}
                                        className="rounded-xl p-2 text-emerald-700 hover:bg-white/60"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            )}
                            <div className="flex items-center gap-3 rounded-3xl border border-slate-100 bg-slate-50 p-2.5 shadow-inner transition-all focus-within:border-emerald-500/30 focus-within:ring-2 focus-within:ring-emerald-500/10">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleImageUpload}
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="rounded-2xl p-3 text-slate-500 transition-all hover:bg-white hover:text-emerald-500"
                                >
                                    <Paperclip size={18} className={uploadingImage ? 'animate-pulse' : ''} />
                                </button>
                                <textarea
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                                    placeholder="Ex: crie um evento com nome Convenção Comercial com limite para 1000 pessoas"
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
                                        <Zap size={12} className="text-amber-500" /> Acoes Reais
                                    </span>
                                </div>
                                <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-900">
                                    {pendingAction ? 'Aguardando midia' : 'Sync'} <UserCircle2 size={12} />
                                </span>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
