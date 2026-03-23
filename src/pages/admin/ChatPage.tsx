import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Search,
    MoreVertical,
    Plus,
    Filter,
    MessageSquare,
    User,
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
    Sidebar as SidebarIcon,
    UserPlus,
    Clock,
    BadgeCheck,
    Calendar,
    MapPin,
    Mail,
    RefreshCw,
    LogOut,
    Check,
    ChevronDown,
    PlusCircle,
    Users
} from 'lucide-react';
import { useAuth } from '@/lib/useAuth';
import { useNavigate } from 'react-router-dom';
import LoadingScreen from '@/components/ui/LoadingScreen';
import AdminLayout from '@/components/layouts/AdminLayout';
import { apiFetch } from '@/lib/api';

export default function ChatPage() {
    const navigate = useNavigate();
    const { user, loading: authLoading, isAuthenticated } = useAuth({
        requireAuth: true,
        redirectTo: '/login',
    });

    // Sessions state
    const [sessions, setSessions] = useState<any[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(localStorage.getItem('active_whatsapp_session'));
    const [showSessionSelector, setShowSessionSelector] = useState(false);

    const [conversations, setConversations] = useState<any[]>([]);
    const [selectedChat, setSelectedChat] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [showRightPanel, setShowRightPanel] = useState(true);
    const [activeTab, setActiveTab] = useState('all');
    const [activeRightTab, setActiveRightTab] = useState('info');
    const [contactDetails, setContactDetails] = useState<any>(null);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [loadingConversations, setLoadingConversations] = useState(true);
    const [whatsappStatus, setWhatsappStatus] = useState<any>(null);
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [pairingCode, setPairingCode] = useState<string | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showNewChatModal, setShowNewChatModal] = useState(false);
    const [newChatNumber, setNewChatNumber] = useState('');
    const [groupIdInput, setGroupIdInput] = useState('');
    const [groupParticipantsInput, setGroupParticipantsInput] = useState('');
    const [groupAddLoading, setGroupAddLoading] = useState(false);
    const [groupAddError, setGroupAddError] = useState<string | null>(null);
    const [groupAddSuccess, setGroupAddSuccess] = useState<string | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fallbackAvatar = useCallback(
        (name: string) =>
            `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'WhatsApp')}&background=random`,
        [],
    );

    const fetchSessions = useCallback(async () => {
        try {
            const data = await apiFetch<any>('/api/whatsapp/sessions', { auth: true });
            if (data.success && data.sessions.length > 0) {
                setSessions(data.sessions);
                if (!currentSessionId || !data.sessions.find((s: any) => s.id === currentSessionId)) {
                    setCurrentSessionId(data.sessions[0].id);
                    localStorage.setItem('active_whatsapp_session', data.sessions[0].id);
                }
            } else if (data.success && data.sessions.length === 0) {
                // Criar uma sessão padrão se não existir
                const newSess = await apiFetch<any>('/api/whatsapp/sessions', {
                    method: 'POST',
                    auth: true,
                    body: JSON.stringify({ name: 'Meu WhatsApp' })
                });
                if (newSess.success) {
                    setSessions([newSess.session]);
                    setCurrentSessionId(newSess.session.id);
                    localStorage.setItem('active_whatsapp_session', newSess.session.id);
                }
            }
        } catch (err) {
            console.error('Erro ao buscar sessões:', err);
        }
    }, [currentSessionId]);

    const checkWhatsAppStatus = useCallback(async () => {
        if (!currentSessionId) return;
        try {
            const data = await apiFetch<any>(`/api/whatsapp/status?sessionId=${currentSessionId}`, { auth: true });
            if (data.success) {
                setWhatsappStatus(data.status);
                if (data.status === 'QR_CODE') {
                    setQrCode(data.qrCodeBase64);
                } else {
                    setQrCode(null);
                }
            }
        } catch (error) {
            console.error('Error checking WhatsApp status:', error);
        }
    }, [currentSessionId]);

    const fetchConversations = useCallback(async () => {
        if (!currentSessionId || whatsappStatus !== 'READY') return;
        try {
            setLoadingConversations(true);
            const [participantsData, chatsData, groupsData] = await Promise.all([
                apiFetch<any>('/api/whatsapp/participantes', { auth: true }),
                apiFetch<any>(`/api/whatsapp/chats?sessionId=${currentSessionId}`, { auth: true }),
                apiFetch<any>(`/api/whatsapp/groups?sessionId=${currentSessionId}`, { auth: true }).catch(() => ({ groups: [] }))
            ]);

            const dbParticipants = (participantsData.participantes || []).map((p: any) => {
                let id = p.id_contato.replace(/\D/g, '');
                if (id.startsWith('0')) id = id.substring(1);

                // Força o 55 se não tiver
                if (id.length >= 10 && id.length <= 11 && !id.startsWith('55')) {
                    // Se tiver 11 dígitos, remove o 9º dígito (terceiro dígito após o país ser adicionado ou antes)
                    if (id.length === 11 && id[2] === '9') {
                        id = id.substring(0, 2) + id.substring(3);
                    }
                    id = '55' + id;
                } else if (id.length === 13 && id.startsWith('55') && id[4] === '9') {
                    // Se já tiver o 55 e tiver 13 dígitos (55 + DD + 9 + 8), remove o 9
                    id = id.substring(0, 4) + id.substring(5);
                }

                const jid = id.includes('@') ? id : `${id}@s.whatsapp.net`;
                return {
                    id: p.id_contato,
                    jid: jid,
                    name: p.nome || p.id_contato,
                    lastMessage: 'Contato da Base',
                    avatar: fallbackAvatar(p.nome || p.id_contato),
                    profile_pic_url: undefined,
                    phone: p.id_contato,
                    type: 'crm',
                    unreadCount: 0,
                };
            });

            const waChats = (chatsData.chats || []).map((c: any) => ({
                ...c,
                avatar: c.profile_pic_url || c.avatar || fallbackAvatar(c.name),
            }));

            const groups = (groupsData.groups || []).map((group: any) => ({
                ...group,
                avatar: group.profile_pic_url || group.avatar || fallbackAvatar(group.name),
            }));

            const combinedMap = new Map<string, any>();

            [...waChats, ...groups].forEach((chat: any) => {
                combinedMap.set(chat.jid, chat);
            });

            dbParticipants.forEach((dbP: any) => {
                if (!combinedMap.has(dbP.jid)) {
                    combinedMap.set(dbP.jid, dbP);
                }
            });

            setConversations(Array.from(combinedMap.values()));
        } catch (error) {
            console.error('Erro ao buscar conversas:', error);
        } finally {
            setLoadingConversations(false);
        }
    }, [currentSessionId, whatsappStatus, fallbackAvatar]);

    const handleStartNewChat = () => {
        if (!newChatNumber.trim()) return;
        let phone = newChatNumber.replace(/\D/g, '');

        // Remove leading zero if exists
        if (phone.startsWith('0')) phone = phone.substring(1);

        // Se for número brasileiro com 11 dígitos (DD + 9 + 8 dígitos)
        // O WhatsApp geralmente usa o JID sem o 9º dígito para DDDs fora de SP/RJ (ou dependendo da conta)
        // O usuário pediu especificamente para ignorar o primeiro 9.
        if (phone.length === 11 && phone[2] === '9') {
            phone = phone.substring(0, 2) + phone.substring(3);
        }

        // Add 55 se não tiver
        if ((phone.length === 10 || phone.length === 11) && !phone.startsWith('55')) {
            phone = '55' + phone;
        }

        const jid = `${phone}@s.whatsapp.net`;
        const newChat = {
            id: jid,
            jid: jid,
            name: newChatNumber,
            lastMessage: 'Nova conversa',
            avatar: fallbackAvatar(newChatNumber),
            type: 'person',
            phone: phone
        };
        setSelectedChat(newChat);
        setConversations(prev => {
            if (prev.find(c => c.jid === jid)) return prev;
            return [newChat, ...prev];
        });
        setShowNewChatModal(false);
        setNewChatNumber('');
    };

    const handleAddToGroup = async () => {
        const trimmedGroupId = groupIdInput.trim();
        const parsedParticipants = Array.from(new Set(groupParticipantsInput
            .split(/[\n,;]+/)
            .map(item => item.trim())
            .filter(Boolean)));

        if (!trimmedGroupId) {
            setGroupAddError('Informe o ID do grupo.');
            setGroupAddSuccess(null);
            return;
        }

        if (parsedParticipants.length === 0) {
            setGroupAddError('Adicione pelo menos um número ou JID válido.');
            setGroupAddSuccess(null);
            return;
        }

        if (!currentSessionId) {
            setGroupAddError('Nenhuma sessão de WhatsApp ativa.');
            setGroupAddSuccess(null);
            return;
        }

        setGroupAddLoading(true);
        setGroupAddError(null);
        setGroupAddSuccess(null);

        try {
            const response = await apiFetch<any>('/api/whatsapp/add-to-group', {
                method: 'POST',
                auth: true,
                body: JSON.stringify({
                    sessionId: currentSessionId,
                    groupId: trimmedGroupId,
                    participants: parsedParticipants,
                }),
            });

            if (response.success) {
                const addedCount = response.added ?? parsedParticipants.length;
                setGroupAddSuccess(`${addedCount} participante(s) adicionados ao grupo.`);
                setGroupParticipantsInput('');
            } else {
                setGroupAddError(response.message || 'Não foi possível adicionar participantes.');
            }
        } catch (error: any) {
            setGroupAddError(error?.message || 'Erro ao adicionar participantes.');
        } finally {
            setGroupAddLoading(false);
        }
    };

    const fetchMessages = useCallback(async () => {
        if (!selectedChat || !currentSessionId) return;
        try {
            const data = await apiFetch<any>(`/api/whatsapp/messages?sessionId=${currentSessionId}&jid=${selectedChat.jid}`, { auth: true });
            if (data.success) {
                setMessages(data.messages);
            }
        } catch (error) {
            console.error('Erro ao buscar mensagens:', error);
        }
    }, [selectedChat, currentSessionId]);

    useEffect(() => {
        if (isAuthenticated) {
            fetchSessions();
        }
    }, [isAuthenticated, fetchSessions]);

    useEffect(() => {
        if (currentSessionId) {
            checkWhatsAppStatus();
            const interval = setInterval(checkWhatsAppStatus, 10000);
            return () => clearInterval(interval);
        }
    }, [currentSessionId, checkWhatsAppStatus]);

    useEffect(() => {
        if (whatsappStatus === 'READY') {
            fetchConversations();
            const interval = setInterval(fetchConversations, 30000); // 30s to update contact names/source
            return () => clearInterval(interval);
        }
    }, [whatsappStatus, fetchConversations]);

    useEffect(() => {
        if (!selectedChat) return;
        const refreshedSelectedChat = conversations.find((chat) => chat.jid === selectedChat.jid);
        if (refreshedSelectedChat) {
            setSelectedChat(refreshedSelectedChat);
        }
    }, [conversations, selectedChat]);

    useEffect(() => {
        if (selectedChat) {
            fetchMessages();
            const interval = setInterval(fetchMessages, 3000); // Polling 3s

            // Fetch CRM details
            const fetchCRMDetails = async () => {
                if (selectedChat.type === 'group') {
                    setContactDetails(null);
                    setLoadingDetails(false);
                    return;
                }
                setLoadingDetails(true);
                try {
                    const phone = selectedChat.jid.split('@')[0];
                    const data = await apiFetch<any>(`/api/whatsapp/contact-info?phone=${phone}`, { auth: true });
                    setContactDetails(data);
                } catch (e) {
                    console.error('Error fetching contact info:', e);
                } finally {
                    setLoadingDetails(false);
                }
            };
            fetchCRMDetails();

            return () => clearInterval(interval);
        } else {
            setContactDetails(null);
        }
    }, [selectedChat, fetchMessages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedChat || !currentSessionId) return;

        const msgObj = {
            id: Date.now().toString(),
            text: newMessage,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            sender: 'me',
            status: 'sent'
        };

        setMessages(prev => [...prev, msgObj]);
        setNewMessage('');

        try {
            await apiFetch('/api/whatsapp/send-message', {
                method: 'POST',
                auth: true,
                body: JSON.stringify({
                    sessionId: currentSessionId,
                    jid: selectedChat.jid,
                    message: newMessage
                })
            });
        } catch (error) {
            console.error('Erro ao enviar mensagem:', error);
        }
    };

    const handleCreateNewSession = async () => {
        const name = prompt('Nome para esta conexão (ex: Celular 2):');
        if (!name) return;

        try {
            const data = await apiFetch<any>('/api/whatsapp/sessions', {
                method: 'POST',
                auth: true,
                body: JSON.stringify({ name })
            });
            if (data.success) {
                setSessions(prev => [...prev, data.session]);
                setCurrentSessionId(data.session.id);
                localStorage.setItem('active_whatsapp_session', data.session.id);
                setShowSessionSelector(false);
            }
        } catch (err) {
            console.error('Erro ao criar sessão:', err);
        }
    };

    const handleSessionSwitch = (id: string) => {
        setCurrentSessionId(id);
        localStorage.setItem('active_whatsapp_session', id);
        setShowSessionSelector(false);
        setConversations([]);
        setSelectedChat(null);
        setWhatsappStatus(null);
        setMessages([]);
    };

    const handleLogout = async () => {
        if (!currentSessionId) return;
        if (!confirm('Deseja realmente desconectar este WhatsApp?')) return;

        try {
            await apiFetch(`/api/whatsapp/logout?sessionId=${currentSessionId}`, {
                method: 'POST',
                auth: true
            });
            checkWhatsAppStatus();
        } catch (error) {
            console.error('Erro ao fazer logout:', error);
        }
    };

    const handleReconnect = async () => {
        if (!currentSessionId || isRefreshing) return;

        setIsRefreshing(true);
        setPairingCode(null);

        try {
            const data = await apiFetch<any>('/api/whatsapp/reconnect', {
                method: 'POST',
                auth: true,
                body: JSON.stringify({ sessionId: currentSessionId })
            });

            if (data.success) {
                setWhatsappStatus(data.status);
                setQrCode(data.qrCodeBase64 || null);
                await fetchSessions();
            }
        } catch (error) {
            console.error('Erro ao reconectar WhatsApp:', error);
        } finally {
            setIsRefreshing(false);
        }
    };

    if (authLoading) return <LoadingScreen />;

    return (
        <AdminLayout>
            <>
                <div className="flex h-[calc(100vh-120px)] bg-slate-50 rounded-[2.5rem] overflow-hidden border border-[var(--border-light)] shadow-sm">

                    {/* Conversations Sidebar */}
                    <div className="w-80 md:w-96 bg-white border-r border-[var(--border-light)] flex flex-col">
                        {/* Sidebar Header */}
                        <div className="p-6 border-b border-[var(--border-light)] bg-slate-50/50">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-black text-[var(--secondary)] tracking-tight">Atendimento</h2>
                                <div className="flex gap-2 relative">
                                    {/* Session Selector */}
                                    <button
                                        onClick={() => setShowSessionSelector(!showSessionSelector)}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
                                    >
                                        <Phone size={14} className="text-emerald-500" />
                                        {sessions.find(s => s.id === currentSessionId)?.instance_name || 'Contas'}
                                        <ChevronDown size={14} />
                                    </button>

                                    {showSessionSelector && (
                                        <div className="absolute top-10 right-0 w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 p-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                            <div className="p-2 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 mb-1">Minhas Contas</div>
                                            {sessions.map(s => (
                                                <button
                                                    key={s.id}
                                                    onClick={() => handleSessionSwitch(s.id)}
                                                    className={`w-full flex items-center justify-between p-3 rounded-xl text-sm font-semibold transition-all ${currentSessionId === s.id ? 'bg-emerald-50 text-emerald-700' : 'hover:bg-slate-50 text-slate-600'}`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-2 h-2 rounded-full ${s.status === 'READY' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                                        {s.instance_name}
                                                    </div>
                                                    {currentSessionId === s.id && <Check size={14} />}
                                                </button>
                                            ))}
                                            <button
                                                onClick={handleCreateNewSession}
                                                className="w-full flex items-center gap-2 p-3 mt-1 rounded-xl text-xs font-bold text-slate-900 border border-dashed border-slate-300 hover:border-emerald-500 hover:text-emerald-600 transition-all"
                                            >
                                                <PlusCircle size={14} /> Conectar Outro Número
                                            </button>
                                        </div>
                                    )}


                                    <button
                                        onClick={() => setShowNewChatModal(true)}
                                        className="p-2 hover:bg-emerald-50 text-slate-400 hover:text-emerald-500 rounded-xl transition-all"
                                        title="Nova Conversa"
                                    >
                                        <PlusCircle size={20} />
                                    </button>

                                    <button onClick={handleLogout} className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl transition-all" title="Desconectar Conta Atual">
                                        <LogOut size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* WhatsApp Status Banner */}
                            {whatsappStatus !== 'READY' && (
                                <div className="mb-6 p-4 bg-slate-900 rounded-2xl text-white shadow-xl shadow-slate-900/10">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className={`w-3 h-3 rounded-full animate-pulse ${whatsappStatus === 'QR_CODE' ? 'bg-amber-400' : 'bg-red-500'}`} />
                                        <span className="text-xs font-black uppercase tracking-widest">
                                            {whatsappStatus === 'QR_CODE' ? 'Aguardando Escaneamento' : 'WhatsApp Desconectado'}
                                        </span>
                                    </div>
                                    {qrCode && (
                                        <div className="bg-white p-3 rounded-xl inline-block mx-auto mb-3">
                                            <img src={qrCode} alt="WhatsApp QR Code" className="w-40 h-40" />
                                        </div>
                                    )}
                                    <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                                        {whatsappStatus === 'QR_CODE'
                                            ? 'Abra o WhatsApp no seu celular e escaneie o código acima para começar.'
                                            : 'A conta selecionada está desconectada. Clique em reconectar para gerar um novo QR.'}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={handleReconnect}
                                        disabled={!currentSessionId || isRefreshing}
                                        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-white transition-all hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
                                        {isRefreshing ? 'Gerando QR...' : 'Reconectar'}
                                    </button>
                                </div>
                            )}

                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                                <input
                                    type="text"
                                    placeholder="Pesquisar conversas..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    autoComplete="off"
                                    name="chat-search"
                                    className="w-full bg-slate-100 border-none rounded-2xl py-3 pl-12 pr-4 text-sm font-medium focus:ring-2 focus:ring-[var(--primary)]/20 transition-all shadow-inner"
                                />
                            </div>
                        </div>
                        <div className="px-6 pb-4 border-b border-[var(--border-light)]">
                            <div className="bg-white border border-slate-100 rounded-3xl p-4 space-y-3 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Grupo existente</p>
                                        <h3 className="text-sm font-black text-slate-800">
                                            Adicionar participantes
                                        </h3>
                                    </div>
                                    <UserPlus size={18} className="text-emerald-500" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID do grupo</label>
                                    <input
                                        type="text"
                                        value={groupIdInput}
                                        onChange={(e) => {
                                            setGroupIdInput(e.target.value);
                                            setGroupAddError(null);
                                            setGroupAddSuccess(null);
                                        }}
                                        placeholder="ex: 1234567890-123456@g.us"
                                        className="w-full rounded-2xl border border-slate-200 text-sm font-bold px-4 py-3 outline-none focus:border-emerald-500 transition-all"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Participantes</label>
                                    <textarea
                                        rows={3}
                                        value={groupParticipantsInput}
                                        onChange={(e) => {
                                            setGroupParticipantsInput(e.target.value);
                                            setGroupAddError(null);
                                            setGroupAddSuccess(null);
                                        }}
                                        placeholder="Informe números ou JIDs separados por quebra de linha ou vírgula"
                                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 text-sm font-semibold px-4 py-3 resize-none focus:border-emerald-500 transition-all"
                                    />
                                    <p className="text-[10px] text-slate-400">Você pode usar números nacionais (ex: 5511999998888) ou JIDs (@s.whatsapp.net).</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleAddToGroup}
                                    disabled={
                                        groupAddLoading ||
                                        !groupIdInput.trim() ||
                                        !groupParticipantsInput.trim() ||
                                        !currentSessionId
                                    }
                                    className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 text-white text-xs font-black uppercase tracking-[0.3em] py-3 transition-all shadow-lg shadow-slate-900/10 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                                >
                                    {groupAddLoading ? (
                                        <RefreshCw size={16} className="animate-spin text-emerald-400" />
                                    ) : (
                                        <>
                                            <PlusCircle size={16} />
                                            Adicionar
                                        </>
                                    )}
                                </button>
                                {groupAddSuccess && (
                                    <p className="text-[11px] font-semibold text-emerald-500">{groupAddSuccess}</p>
                                )}
                                {groupAddError && (
                                    <p className="text-[11px] font-semibold text-rose-500">{groupAddError}</p>
                                )}
                            </div>
                        </div>

                        {/* Chat List */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
                            {loadingConversations ? (
                                <div className="flex flex-col items-center justify-center h-40 gap-3">
                                    <RefreshCw className="animate-spin text-emerald-500" size={24} />
                                    <span className="text-xs font-bold text-slate-400">Sincronizando contatos...</span>
                                </div>
                            ) : conversations.length > 0 ? (
                                conversations.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase())).map((chat) => (
                                    <button
                                        key={chat.id}
                                        onClick={() => setSelectedChat(chat)}
                                        className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all group ${selectedChat?.id === chat.id
                                            ? 'bg-emerald-50 shadow-sm border border-emerald-100'
                                            : 'hover:bg-slate-50'}`}
                                    >
                                        <div className="relative">
                                            <img src={chat.profile_pic_url || chat.avatar || fallbackAvatar(chat.name)} alt={chat.name} className="w-12 h-12 rounded-xl object-cover border border-slate-100 shadow-sm" />
                                            <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center ${chat.type === 'group' ? 'bg-indigo-500' : 'bg-emerald-500'}`}>
                                                {chat.type === 'group' ? <Users size={8} className="text-white" /> : <div className="w-1 h-1 bg-white rounded-full" />}
                                            </div>
                                        </div>
                                        <div className="flex-1 text-left min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <h4 className="font-bold text-sm text-slate-800 truncate">{chat.name}</h4>
                                            </div>
                                            <p className="text-xs text-slate-400 truncate font-medium">{chat.lastMessage}</p>
                                        </div>
                                    </button>
                                ))
                            ) : (
                                <div className="text-center p-8 text-slate-400">
                                    {whatsappStatus === 'READY' ? 'Nenhuma conversa encontrada.' : 'Conecte o WhatsApp para ver as conversas.'}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Main Chat Area */}
                    <div className="flex-1 flex flex-col bg-slate-50/30">
                        {selectedChat ? (
                            <>
                                {/* Chat Header */}
                                <div className="h-20 bg-white border-b border-slate-100 px-8 flex items-center justify-between shadow-sm">
                                    <div className="flex items-center gap-4">
                                        <img src={selectedChat.profile_pic_url || selectedChat.avatar || fallbackAvatar(selectedChat.name)} alt={selectedChat.name} className="w-10 h-10 rounded-xl shadow-sm border border-slate-100 object-cover" />
                                        <div>
                                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                                {selectedChat.name}
                                                <BadgeCheck size={16} className="text-emerald-500" />
                                            </h3>
                                            <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest flex items-center gap-1">
                                                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Disponível no WhatsApp
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button className="p-3 hover:bg-slate-100 rounded-2xl text-slate-400 transition-all"><Phone size={20} /></button>
                                        <button className="p-3 hover:bg-slate-100 rounded-2xl text-slate-400 transition-all"><Video size={20} /></button>
                                        <button
                                            onClick={() => setShowRightPanel(!showRightPanel)}
                                            className={`p-3 rounded-2xl transition-all ${showRightPanel ? 'bg-emerald-50 text-emerald-600' : 'hover:bg-slate-100 text-slate-400'}`}
                                        >
                                            <Info size={20} />
                                        </button>
                                    </div>
                                </div>

                                {/* Messages */}
                                <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                                    <div className="flex justify-center">
                                        <span className="bg-slate-200 text-slate-500 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-tighter">Hoje</span>
                                    </div>

                                    {messages.map((msg) => (
                                        <div key={msg.id} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[70%] p-4 rounded-2xl shadow-sm border ${msg.sender === 'me'
                                                ? 'bg-slate-900 text-white border-slate-800 rounded-br-none'
                                                : 'bg-white text-slate-700 border-slate-100 rounded-bl-none'}`}>
                                                {selectedChat.type === 'group' && msg.sender === 'them' && msg.senderName && (
                                                    <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-indigo-500">{msg.senderName}</p>
                                                )}
                                                <p className="text-sm font-medium leading-relaxed">{msg.text}</p>
                                                <div className="flex items-center justify-end gap-1 mt-2">
                                                    <span className={`text-[9px] font-bold uppercase ${msg.sender === 'me' ? 'text-slate-400' : 'text-slate-300'}`}>{msg.time}</span>
                                                    {msg.sender === 'me' && <CheckCheck size={12} className="text-emerald-400" />}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Input Area */}
                                <div className="p-6 bg-white border-t border-slate-100 shadow-[0_-4px_24px_rgba(0,0,0,0.02)]">
                                    <form onSubmit={handleSendMessage} className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-100 shadow-inner">
                                        <div className="flex items-center gap-1">
                                            <button type="button" className="p-2.5 hover:bg-white rounded-xl text-slate-400 transition-all"><Smile size={22} /></button>
                                            <button type="button" className="p-2.5 hover:bg-white rounded-xl text-slate-400 transition-all"><Paperclip size={22} /></button>
                                        </div>
                                        <input
                                            type="text"
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            placeholder="Digite uma mensagem..."
                                            autoComplete="off"
                                            name="chat-message"
                                            className="flex-1 bg-transparent border-none py-3 text-sm font-medium focus:ring-0 placeholder:text-slate-400"
                                        />
                                        <button
                                            type="submit"
                                            disabled={!newMessage.trim()}
                                            className="bg-slate-900 hover:bg-slate-800 text-white p-3.5 rounded-xl shadow-lg shadow-slate-900/10 transition-all active:scale-90 disabled:opacity-50 disabled:scale-100"
                                        >
                                            <Send size={20} className="text-emerald-400" />
                                        </button>
                                    </form>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-slate-50/50">
                                <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center text-emerald-500 shadow-2xl shadow-emerald-500/10 mb-8 border border-slate-100 animate-bounce duration-[2000ms]">
                                    <MessageSquare size={48} />
                                </div>
                                <h3 className="text-2xl font-black text-slate-800 mb-4 tracking-tight">Atendimento Inteligente</h3>
                                <p className="text-slate-400 max-w-sm font-medium leading-relaxed">
                                    Selecione um contato ou grupo na lateral para iniciar uma conversa via WhatsApp.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Right Info Panel */}
                    {selectedChat && showRightPanel && (
                        <div className="w-80 bg-white border-l border-slate-100 flex flex-col animate-in slide-in-from-right duration-300">
                            <div className="p-10 flex flex-col items-center text-center border-b border-slate-50">
                                <img
                                    src={selectedChat.profile_pic_url || selectedChat.avatar}
                                    alt={selectedChat.name}
                                    className="w-24 h-24 rounded-3xl border-4 border-white shadow-2xl mb-6 object-cover"
                                />
                                <h3 className="text-xl font-black text-slate-800 leading-tight mb-2 tracking-tight">
                                    {contactDetails?.name || selectedChat.name}
                                </h3>
                                <div className="flex flex-wrap justify-center gap-2">
                                    {selectedChat.type === 'group' ? (
                                        <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase rounded-lg border border-indigo-100">Grupo WhatsApp</span>
                                    ) : (
                                        <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase rounded-lg border border-emerald-100">
                                            {contactDetails?.role || 'Cliente'}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
                                {loadingDetails ? (
                                    <div className="flex justify-center p-10"><RefreshCw className="animate-spin text-emerald-500" /></div>
                                ) : (
                                    <>
                                        <div className="space-y-6">
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                <Info size={12} /> Informações Básicas
                                            </h4>
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-slate-50 rounded-xl text-slate-400"><Phone size={16} /></div>
                                                    <div className="text-left text-ellipsis overflow-hidden">
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">WhatsApp</p>
                                                        <p className="text-sm font-bold text-slate-700">{selectedChat.jid.split('@')[0]}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {contactDetails?.courses?.length > 0 && (
                                            <div className="space-y-4">
                                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                    <BadgeCheck size={12} className="text-emerald-500" /> Cursos Inscritos
                                                </h4>
                                                <div className="space-y-2">
                                                    {contactDetails.courses.map((course: string, i: number) => (
                                                        <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                            <p className="text-xs font-bold text-slate-700">{course}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {contactDetails?.events?.length > 0 && (
                                            <div className="space-y-4">
                                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                    <Calendar size={12} className="text-indigo-500" /> Eventos
                                                </h4>
                                                <div className="space-y-2">
                                                    {contactDetails.events.map((event: string, i: number) => (
                                                        <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                            <p className="text-xs font-bold text-slate-700">{event}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* New Chat Modal */}
                {showNewChatModal && (
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                        <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                                <h3 className="text-xl font-black text-slate-800 tracking-tight italic">Nova Conversa</h3>
                                <button onClick={() => setShowNewChatModal(false)} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 transition-all"><Plus size={20} className="rotate-45" /></button>
                            </div>
                            <div className="p-8 space-y-6">
                                <p className="text-sm text-slate-400 font-medium">Informe o número do destinatário com DDD (apenas números).</p>
                                <input
                                    type="text"
                                    placeholder="Ex: 11999999999"
                                    value={newChatNumber}
                                    onChange={(e) => setNewChatNumber(e.target.value)}
                                    className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-inner"
                                />
                                <button
                                    onClick={handleStartNewChat}
                                    className="w-full py-4 bg-slate-900 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl shadow-slate-900/10 active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <Send size={16} className="text-emerald-400" /> Iniciar Chat
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </>
        </AdminLayout>
    );
}
