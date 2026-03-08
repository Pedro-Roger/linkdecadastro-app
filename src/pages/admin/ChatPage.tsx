import React, { useState, useEffect, useRef } from 'react';
import {
    Search,
    MoreVertical,
    Plus,
    Filter,
    MessageSquare,
    User,
    Clock,
    CheckCheck,
    Paperclip,
    Smile,
    Send,
    Phone,
    Video,
    Info,
    ChevronRight,
    Archive,
    Star,
    Trash2,
    Bell,
    Sidebar as SidebarIcon,
    X,
    UserPlus
} from 'lucide-react';
import MobileNavbar from '@/components/ui/MobileNavbar';
import { useAuth } from '@/lib/useAuth';
import { useNavigate } from 'react-router-dom';
import LoadingScreen from '@/components/ui/LoadingScreen';

// Mock Data
const MOCK_CONVERSATIONS = [
    {
        id: '1',
        name: 'João Silva',
        lastMessage: 'Olá, gostaria de saber mais sobre o curso de piscicultura.',
        time: '14:25',
        unreadCount: 2,
        avatar: 'https://i.pravatar.cc/150?u=joao',
        status: 'online',
        phone: '(88) 99876-5432'
    },
    {
        id: '2',
        name: 'Maria Oliveira',
        lastMessage: 'Obrigada pelas informações!',
        time: '12:10',
        unreadCount: 0,
        avatar: 'https://i.pravatar.cc/150?u=maria',
        status: 'offline',
        phone: '(85) 98765-4321'
    },
    {
        id: '3',
        name: 'Carlos Santos',
        lastMessage: 'A inscrição foi confirmada?',
        time: 'Ontem',
        unreadCount: 0,
        avatar: 'https://i.pravatar.cc/150?u=carlos',
        status: 'online',
        phone: '(11) 97654-3210'
    },
    {
        id: '4',
        name: 'Ana Costa',
        lastMessage: 'Pode me enviar o link do evento?',
        time: 'Ontem',
        unreadCount: 5,
        avatar: 'https://i.pravatar.cc/150?u=ana',
        status: 'offline',
        phone: '(21) 96543-2109'
    }
];

const MOCK_MESSAGES = [
    { id: '1', sender: 'other', text: 'Olá, boa tarde!', time: '14:20' },
    { id: '2', sender: 'other', text: 'Vi o curso de piscicultura no site e me interessei.', time: '14:21' },
    { id: '3', sender: 'me', text: 'Boa tarde, João! Que ótimo que se interessou.', time: '14:22' },
    { id: '4', sender: 'me', text: 'Como posso te ajudar hoje? Tem alguma dúvida específica sobre o conteúdo ou inscrições?', time: '14:23' },
    { id: '5', sender: 'other', text: 'Olá, gostaria de saber mais sobre o curso de piscicultura.', time: '14:25' }
];

export default function ChatPage() {
    const navigate = useNavigate();
    const { user, loading: authLoading, isAuthenticated } = useAuth({
        requireAuth: true,
        redirectTo: '/login',
    });

    const [selectedChat, setSelectedChat] = useState<any>(MOCK_CONVERSATIONS[0]);
    const [messages, setMessages] = useState(MOCK_MESSAGES);
    const [newMessage, setNewMessage] = useState('');
    const [showRightPanel, setShowRightPanel] = useState(true);
    const [activeTab, setActiveTab] = useState('all'); // all, mine, waiting
    const [activeRightTab, setActiveRightTab] = useState('info'); // info, quick, notes
    const [searchQuery, setSearchQuery] = useState('');

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (!authLoading) {
            if (!isAuthenticated || user?.role !== 'ADMIN') {
                navigate('/my-courses');
                return;
            }
        }
    }, [authLoading, isAuthenticated, user, navigate]);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        const msg = {
            id: Date.now().toString(),
            sender: 'me',
            text: newMessage,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessages([...messages, msg]);
        setNewMessage('');
    };

    if (authLoading) return <LoadingScreen />;

    return (
        <div className="flex flex-col h-screen bg-[#0f172a] text-slate-200 overflow-hidden">
            <MobileNavbar />

            <div className="flex flex-1 overflow-hidden relative">

                {/* Left Column: Conversations List */}
                <div className="w-full md:w-[380px] border-r border-slate-700/50 flex flex-col bg-slate-900/50 backdrop-blur-xl z-20">
                    <div className="p-4 flex flex-col gap-4 border-b border-slate-700/50">
                        <div className="flex items-center justify-between">
                            <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                                Atendimento
                            </h1>
                            <div className="flex gap-2">
                                <button className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400">
                                    <Plus size={20} />
                                </button>
                                <button className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400">
                                    <MoreVertical size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                            <input
                                type="text"
                                placeholder="Pesquisar conversas..."
                                className="w-full bg-slate-800 border-none rounded-xl py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-emerald-500/50 transition-all placeholder:text-slate-600"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="flex gap-1 p-1 bg-slate-800/50 rounded-lg">
                            {['all', 'mine', 'waiting'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === tab
                                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                                        }`}
                                >
                                    {tab === 'all' && 'Todos'}
                                    {tab === 'mine' && 'Meus'}
                                    {tab === 'waiting' && 'Aguardando'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {MOCK_CONVERSATIONS.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase())).map((chat) => (
                            <div
                                key={chat.id}
                                onClick={() => setSelectedChat(chat)}
                                className={`p-4 flex items-center gap-4 cursor-pointer transition-all border-b border-slate-800/30 group relative ${selectedChat?.id === chat.id
                                    ? 'bg-slate-800/80 border-r-4 border-r-emerald-500'
                                    : 'hover:bg-slate-800/40'
                                    }`}
                            >
                                <div className="relative shrink-0">
                                    <img src={chat.avatar} alt={chat.name} className="w-12 h-12 rounded-full object-cover border-2 border-slate-700 group-hover:border-emerald-500/50 transition-colors" />
                                    {chat.status === 'online' && (
                                        <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-900 rounded-full shadow-sm" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="font-semibold text-slate-200 truncate group-hover:text-emerald-400 transition-colors">{chat.name}</h3>
                                        <span className="text-[10px] text-slate-500 uppercase font-bold">{chat.time}</span>
                                    </div>
                                    <div className="flex justify-between items-center gap-2">
                                        <p className="text-xs text-slate-400 truncate flex-1">{chat.lastMessage}</p>
                                        {chat.unreadCount > 0 && (
                                            <span className="bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                                {chat.unreadCount}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Middle Column: Chat Interface */}
                <div className="flex-1 flex flex-col bg-slate-950 relative overflow-hidden">
                    {selectedChat ? (
                        <>
                            {/* Chat Header */}
                            <div className="p-4 h-[75px] flex items-center justify-between border-b border-slate-800/50 backdrop-blur-md bg-slate-950/80 z-10">
                                <div className="flex items-center gap-3">
                                    <div className="md:hidden p-2 text-slate-400 mr-2">
                                        <ChevronRight className="rotate-180" size={24} />
                                    </div>
                                    <img src={selectedChat.avatar} className="w-10 h-10 rounded-full border border-slate-700" alt="" />
                                    <div>
                                        <h2 className="font-bold text-slate-100">{selectedChat.name}</h2>
                                        <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">online</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button className="p-2.5 text-slate-400 hover:bg-slate-800 rounded-full transition-colors"><Phone size={18} /></button>
                                    <button className="p-2.5 text-slate-400 hover:bg-slate-800 rounded-full transition-colors"><Video size={18} /></button>
                                    <button
                                        onClick={() => setShowRightPanel(!showRightPanel)}
                                        className={`p-2.5 rounded-full transition-colors ${showRightPanel ? 'bg-emerald-500/10 text-emerald-400' : 'text-slate-400 hover:bg-slate-800'}`}
                                    >
                                        <Info size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Messages Area */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[url('https://whatsapp-clone-react-js.netlify.app/bg-chat-tile-light_6860684d79a2033691ac1d0f50882e3c.png')] bg-repeat bg-fixed opacity-95 custom-scrollbar">
                                <div className="flex justify-center my-6">
                                    <span className="bg-slate-800/80 backdrop-blur-sm text-slate-400 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest border border-slate-700">HOJE</span>
                                </div>

                                {messages.map((msg) => (
                                    <div key={msg.id} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                                        <div className={`max-w-[70%] relative group ${msg.sender === 'me'
                                            ? 'bg-emerald-600 text-white rounded-2xl rounded-tr-none shadow-lg shadow-emerald-900/10'
                                            : 'bg-slate-800 text-slate-100 rounded-2xl rounded-tl-none border border-slate-700/50'
                                            } p-3 sm:p-4`}>
                                            <span className="text-sm leading-relaxed block">{msg.text}</span>
                                            <div className={`flex items-center gap-1 mt-2 justify-end ${msg.sender === 'me' ? 'text-emerald-200' : 'text-slate-500'}`}>
                                                <span className="text-[9px] font-bold">{msg.time}</span>
                                                {msg.sender === 'me' && <CheckCheck size={12} className="text-blue-300" />}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Message Input */}
                            <div className="p-4 bg-slate-900/80 backdrop-blur-xl border-t border-slate-800/50">
                                <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex items-end gap-3">
                                    <div className="flex gap-1 pb-1">
                                        <button type="button" className="p-2 text-slate-400 hover:bg-slate-800 rounded-full transition-colors"><Smile size={22} /></button>
                                        <button type="button" className="p-2 text-slate-400 hover:bg-slate-800 rounded-full transition-colors"><Paperclip size={22} /></button>
                                    </div>
                                    <div className="flex-1 relative group">
                                        <textarea
                                            rows={1}
                                            placeholder="Digite sua mensagem..."
                                            className="w-full bg-slate-800 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500/50 text-slate-200 placeholder:text-slate-600 resize-none max-h-32 transition-all outline-none"
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleSendMessage(e);
                                                }
                                            }}
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        className="shrink-0 p-3 bg-emerald-500 hover:bg-emerald-400 text-white rounded-full shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                                    >
                                        <Send size={20} />
                                    </button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                            <div className="w-24 h-24 bg-slate-900 rounded-full flex items-center justify-center mb-6 shadow-xl border border-slate-800">
                                <MessageSquare size={44} className="text-emerald-500/50" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-200 mb-2">WhatsApp Atendimento</h2>
                            <p className="text-slate-500 max-w-sm">Selecione uma conversa para começar a atender seus alunos e clientes em tempo real.</p>
                        </div>
                    )}
                </div>

                {/* Right Column: Contact Details */}
                {showRightPanel && selectedChat && (
                    <div className="hidden lg:flex w-[350px] border-l border-slate-800/50 flex-col bg-slate-900/30 backdrop-blur-3xl animate-in slide-in-from-right duration-300">
                        <div className="p-8 flex flex-col items-center text-center border-b border-slate-800/50">
                            <div className="relative mb-6">
                                <img src={selectedChat.avatar} className="w-28 h-28 rounded-3xl object-cover shadow-2xl border-4 border-slate-800" alt="" />
                                <div className="absolute -bottom-2 -right-2 bg-emerald-500 p-2 rounded-xl shadow-lg border-4 border-slate-900">
                                    <User size={18} className="text-white" />
                                </div>
                            </div>
                            <h3 className="text-xl font-bold text-slate-100">{selectedChat.name}</h3>
                            <p className="text-sm text-slate-500 font-medium mb-4">{selectedChat.phone}</p>

                            <div className="flex gap-4">
                                <button className="flex flex-col items-center gap-2 group">
                                    <div className="p-3 bg-slate-800 rounded-2xl text-slate-300 group-hover:bg-slate-700 group-hover:text-emerald-400 transition-all border border-slate-700/50"><Star size={18} /></div>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">Favorito</span>
                                </button>
                                <button className="flex flex-col items-center gap-2 group">
                                    <div className="p-3 bg-slate-800 rounded-2xl text-slate-300 group-hover:bg-slate-700 group-hover:text-amber-400 transition-all border border-slate-700/50"><Archive size={18} /></div>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">Arquivar</span>
                                </button>
                                <button className="flex flex-col items-center gap-2 group">
                                    <div className="p-3 bg-slate-800 rounded-2xl text-slate-300 group-hover:bg-red-500/20 group-hover:text-red-400 transition-all border border-slate-700/50"><Trash2 size={18} /></div>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">Banir</span>
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            <div className="flex border-b border-slate-800/50 sticky top-0 bg-slate-950/20 backdrop-blur-md z-10">
                                {['info', 'quick', 'notes'].map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveRightTab(tab)}
                                        className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${activeRightTab === tab
                                            ? 'text-emerald-400 border-b-2 border-emerald-500'
                                            : 'text-slate-500 hover:text-slate-300'
                                            }`}
                                    >
                                        {tab === 'info' && 'Infos'}
                                        {tab === 'quick' && 'Rápidas'}
                                        {tab === 'notes' && 'Notas'}
                                    </button>
                                ))}
                            </div>

                            <div className="p-6 space-y-8">
                                {activeRightTab === 'info' && (
                                    <>
                                        <div>
                                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Informações do Cliente</h4>
                                            <div className="space-y-4">
                                                <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/30">
                                                    <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">E-mail</p>
                                                    <p className="text-sm text-slate-200 truncate">joao.silva@email.com</p>
                                                </div>
                                                <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/30">
                                                    <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Localização</p>
                                                    <p className="text-sm text-slate-200">Fortaleza, CE</p>
                                                </div>
                                                <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/30">
                                                    <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Tipo de Participante</p>
                                                    <p className="text-sm text-emerald-400 font-bold flex items-center gap-2">
                                                        <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                                        PRODUTOR
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <div className="flex items-center justify-between mb-4">
                                                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Cursos Inscritos</h4>
                                                <span className="bg-emerald-500/10 text-emerald-400 text-[9px] font-black px-2 py-0.5 rounded-full">3 CURSOS</span>
                                            </div>
                                            <div className="space-y-2">
                                                {['Piscicultura Básica', 'Gestão de Fazendas', 'Manejo de Solo'].map((course) => (
                                                    <div key={course} className="flex items-center justify-between p-3 bg-slate-800/20 hover:bg-slate-800/50 rounded-xl transition-all border border-slate-700/10 group">
                                                        <span className="text-xs text-slate-400 group-hover:text-slate-200">{course}</span>
                                                        <ChevronRight size={14} className="text-slate-700 group-hover:text-slate-400" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <button className="w-full py-4 bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold rounded-2xl shadow-xl shadow-emerald-900/20 transition-all flex items-center justify-center gap-2 active:scale-95">
                                            <UserPlus size={18} />
                                            VINCULAR AO SISTEMA
                                        </button>
                                    </>
                                )}

                                {activeRightTab === 'quick' && (
                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Respostas Favoritas</h4>
                                        {[
                                            { title: 'Boas Vindas', text: 'Olá! Seja muito bem-vindo ao Link de Cadastro. Como posso te ajudar hoje?' },
                                            { title: 'Inscrição Pendente', text: 'Notei que sua inscrição ainda está pendente. Precisa de ajuda com o pagamento?' },
                                            { title: 'Link do Curso', text: 'Aqui está o seu link de acesso exclusivo: system.linkdecadastro.com.br' },
                                            { title: 'Finalizar Atendimento', text: 'Fico feliz em ter ajudado! Se precisar de mais alguma coisa, conte conosco.' },
                                        ].map((q, idx) => (
                                            <div
                                                key={idx}
                                                className="bg-slate-800/30 border border-slate-700/30 p-4 rounded-2xl hover:bg-slate-800 hover:border-emerald-500/30 cursor-pointer transition-all group"
                                                onClick={() => setNewMessage(q.text)}
                                            >
                                                <h5 className="text-xs font-bold text-emerald-400 mb-1 group-hover:text-emerald-300">{q.title}</h5>
                                                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{q.text}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {activeRightTab === 'notes' && (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Observações Internas</h4>
                                            <button className="p-1 hover:bg-slate-800 rounded-md transition-colors text-emerald-400"><Plus size={14} /></button>
                                        </div>
                                        <div className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-2xl">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
                                                <span className="text-[10px] font-bold text-amber-500/70 uppercase">Urgente</span>
                                            </div>
                                            <p className="text-[11px] text-slate-300 leading-relaxed italic">"Cliente interessado no curso presencial em Juazeiro. Retornar amanhã sem falta."</p>
                                            <p className="text-[9px] text-slate-500 mt-2">Adicionado por Admin às 10:45</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(148, 163, 184, 0.3);
        }
      `}} />
        </div>
    );
}
