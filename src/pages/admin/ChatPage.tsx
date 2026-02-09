import { useState, useEffect, useRef, useCallback } from 'react'
import { apiFetch } from '@/lib/api'

// Types based on Evolution API structures
interface Message {
    id: string
    key: {
        fromMe: boolean
    }
    message: {
        conversation?: string
        imageMessage?: { caption: string; url: string }
        videoMessage?: { caption: string; url: string }
        extendedTextMessage?: { text: string }
    }
    pushName?: string
    messageTimestamp: number
}

interface Chat {
    id: string
    name: string
    unreadCount: number
    profilePictureUrl?: string
    lastMessage?: string
    lastMessageTime?: number
    tags?: string[]
}

export default function ChatPage() {
    const [chats, setChats] = useState<Chat[]>([])
    const [selectedChatId, setSelectedChatId] = useState<string | null>(null)
    const [messages, setMessages] = useState<Message[]>([])
    const [inputMessage, setInputMessage] = useState('')
    const [loading, setLoading] = useState(false)
    const [status, setStatus] = useState<'CONNECTING' | 'READY' | 'DISCONNECTED'>('CONNECTING')
    const [error, setError] = useState<string | null>(null)
    const [userInfo, setUserInfo] = useState<any>(null)

    // Polling refs
    const pollInterval = useRef<NodeJS.Timeout | null>(null)

    const checkStatus = useCallback(async () => {
        try {
            const data = await apiFetch<any>('/api/whatsapp/status', { auth: true })
            if (data?.status === 'READY') {
                setStatus('READY')
                setUserInfo(data.me)
            } else {
                setStatus('DISCONNECTED')
                setUserInfo(null)
            }
        } catch (err) {
            console.error('Error checking status:', err)
            setStatus('DISCONNECTED')
        }
    }, [])

    const fetchChats = useCallback(async () => {
        if (status !== 'READY') return
        try {
            // Fetch chats from proxy endpoint
            const response = await apiFetch<any>('/api/whatsapp/chats', { auth: true })

            // Normalize response: Evolution might return array directly or { result: [...] } or { data: [...] }
            let chatData: Chat[] = []
            if (Array.isArray(response)) {
                chatData = response
            } else if (response && Array.isArray(response.data)) {
                chatData = response.data
            } else if (response && Array.isArray(response.result)) {
                chatData = response.result
            } else {
                console.warn('Unexpected chat response format:', response)
            }

            console.log('[ChatPage] Fetched chats:', chatData.length)
            setChats(chatData)
        } catch (err) {
            console.error('Error fetching chats:', err)
        }
    }, [status])

    const fetchMessages = useCallback(async (chatId: string) => {
        try {
            setLoading(true)
            const data = await apiFetch<Message[]>(`/api/whatsapp/messages/${chatId}`, { auth: true })
            // Sort by timestamp
            const sorted = (Array.isArray(data) ? data : []).sort((a, b) => a.messageTimestamp - b.messageTimestamp)
            setMessages(sorted)
        } catch (err) {
            console.error('Error fetching messages:', err)
            setError('Erro ao carregar mensagens')
            setMessages([])
        } finally {
            setLoading(false)
        }
    }, [])

    // Initial Status Check
    useEffect(() => {
        checkStatus()
        // Poll status every 30s
        const statusInterval = setInterval(checkStatus, 30000)
        return () => clearInterval(statusInterval)
    }, [checkStatus])

    // Load Chats when READY
    useEffect(() => {
        if (status === 'READY') {
            fetchChats()
            // Poll chats every 15s
            const chatInterval = setInterval(fetchChats, 15000)
            return () => clearInterval(chatInterval)
        }
    }, [status, fetchChats])

    // Load Messages when Chat Selected
    useEffect(() => {
        if (selectedChatId) {
            fetchMessages(selectedChatId)
            // Poll messages for active chat every 5s
            pollInterval.current = setInterval(() => {
                // Background update - silent fetch
                apiFetch<Message[]>(`/api/whatsapp/messages/${selectedChatId}`, { auth: true })
                    .then(data => {
                        const sorted = (Array.isArray(data) ? data : []).sort((a, b) => a.messageTimestamp - b.messageTimestamp)
                        setMessages(prev => {
                            // Only update if length changed or last message different to avoid jitters
                            if (sorted.length !== prev.length || sorted[sorted.length - 1]?.id !== prev[prev.length - 1]?.id) {
                                return sorted
                            }
                            return prev
                        })
                    })
                    .catch(console.error)
            }, 5000)
        } else {
            setMessages([])
        }

        return () => {
            if (pollInterval.current) clearInterval(pollInterval.current)
        }
    }, [selectedChatId, fetchMessages])

    const handleSendMessage = async () => {
        if (!inputMessage.trim() || !selectedChatId) return

        const textToSend = inputMessage

        // Optimistic Update
        const tempId = `temp-${Date.now()}`
        const newMsg: Message = {
            id: tempId,
            key: { fromMe: true },
            message: { conversation: textToSend },
            messageTimestamp: Date.now() / 1000
        }
        setMessages(prev => [...prev, newMsg])
        setInputMessage('')

        try {
            await apiFetch('/api/whatsapp/message/send', {
                method: 'POST',
                auth: true,
                body: JSON.stringify({
                    chatId: selectedChatId,
                    text: textToSend
                })
            })
            // Refresh messages shortly after
            setTimeout(() => fetchMessages(selectedChatId), 1000)
        } catch (err) {
            console.error('Error sending message:', err)
            setError('Falha ao enviar mensagem')
        }
    }

    const selectedChat = chats.find(c => c.id === selectedChatId)

    if (status !== 'READY') {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] bg-white rounded-2xl shadow-sm border border-gray-200">
                {status === 'CONNECTING' ? (
                    <div className="flex flex-col items-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                        <p className="text-gray-500">Conectando ao WhatsApp...</p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center text-center p-8">
                        <div className="w-20 h-20 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">
                            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        </div>
                        <h2 className="text-xl font-bold text-gray-800 mb-2">WhatsApp Desconectado</h2>
                        <p className="text-gray-500 mb-6 max-w-md">Para acessar o chat, é necessário conectar seu dispositivo WhatsApp.</p>
                        <a href="/admin/whatsapp/send" className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition">
                            Ir para Conexão
                        </a>
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="flex h-[calc(100vh-8rem)] bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden font-sans">
            {/* Left Sidebar: Chat List */}
            <div className="w-80 border-r border-gray-100 flex flex-col bg-white">
                <div className="p-4 border-b border-gray-100">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                            <h2 className="font-bold text-xl text-gray-900">Atendimento</h2>
                            <span className="px-1.5 py-0.5 bg-orange-100 text-orange-600 text-[10px] font-bold rounded uppercase tracking-wide">Live</span>
                        </div>
                        {/* User Info / Refresh */}
                        <div className="flex items-center gap-2">
                            <button onClick={fetchChats} className="text-gray-400 hover:text-blue-600 p-1" title="Atualizar">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                            </button>
                        </div>
                    </div>

                    <div className="relative mb-4">
                        <input
                            type="text"
                            placeholder="Buscar conversas..."
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-transparent focus:bg-white focus:border-blue-500 rounded-lg text-sm transition-all outline-none"
                        />
                        <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>

                    <div className="flex gap-2 w-full">
                        <button className="flex-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full text-xs font-semibold hover:bg-blue-100 transition-colors">Todos</button>
                        <button className="flex-1 px-3 py-1.5 bg-gray-50 text-gray-500 rounded-full text-xs font-semibold hover:bg-gray-100 transition-colors">Meus</button>
                        <button className="flex-1 px-3 py-1.5 bg-gray-50 text-gray-500 rounded-full text-xs font-semibold hover:bg-gray-100 transition-colors">Aguardando</button>
                        <button className="p-1.5 text-gray-400 hover:text-gray-600">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {chats.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-center p-4">
                            <p className="text-gray-800 font-medium mb-1">Nenhuma conversa</p>
                            <p className="text-gray-400 text-xs">Aguardando novas mensagens...</p>
                        </div>
                    ) : (
                        chats.map(chat => (
                            <div
                                key={chat.id}
                                onClick={() => setSelectedChatId(chat.id)}
                                className={`group p-4 flex gap-3 cursor-pointer transition-colors border-l-[3px] hover:bg-gray-50 ${selectedChatId === chat.id ? 'bg-blue-50/50 border-l-blue-600' : 'bg-white border-l-transparent'}`}
                            >
                                <div className="relative shrink-0">
                                    {chat.profilePictureUrl ? (
                                        <img src={chat.profilePictureUrl} alt="" className="w-12 h-12 rounded-full object-cover" />
                                    ) : (
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-600 flex items-center justify-center font-bold text-lg">
                                            {chat.name?.charAt(0) || chat.id.slice(-2)}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className={`text-sm truncate pr-2 ${selectedChatId === chat.id ? 'font-bold text-gray-900' : 'font-semibold text-gray-800'}`}>
                                            {chat.name || formatPhone(chat.id)}
                                        </h3>
                                        {chat.lastMessageTime && (
                                            <span className="text-[10px] text-gray-400 shrink-0">
                                                {new Date(chat.lastMessageTime * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <p className="text-xs text-gray-500 truncate mr-2">
                                            {chat.lastMessage || '...'}
                                        </p>
                                        {chat.unreadCount > 0 && (
                                            <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 h-4 min-w-[16px] flex items-center justify-center rounded-full">
                                                {chat.unreadCount}
                                            </span>
                                        )}
                                    </div>
                                    {/* Optional tags */}
                                    {chat.tags && chat.tags.length > 0 && (
                                        <div className="flex gap-1 mt-1.5">
                                            {chat.tags.slice(0, 2).map((tag, i) => (
                                                <span key={i} className="px-1.5 py-0.5 bg-orange-100 text-orange-600 text-[9px] font-bold rounded uppercase">{tag}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Center: Chat Area */}
            <div className="flex-1 flex flex-col bg-[#F0F2F5] relative min-w-0">
                {selectedChat ? (
                    <>
                        {/* Chat Window Header */}
                        <div className="h-[72px] bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm z-10">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold overflow-hidden">
                                    {selectedChat.profilePictureUrl ? (
                                        <img src={selectedChat.profilePictureUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        (selectedChat.name?.charAt(0) || '?')
                                    )}
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 leading-tight">
                                        {selectedChat.name || formatPhone(selectedChat.id)}
                                    </h3>
                                    <div className="flex items-center gap-2 text-xs">
                                        <span className="flex items-center gap-1 text-green-600 font-medium">
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                            Online
                                        </span>
                                        <span className="text-gray-300">|</span>
                                        <span className="text-gray-500">{formatPhone(selectedChat.id)}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors">
                                    Assumir
                                </button>
                                <button className="px-3 py-1.5 border border-gray-300 text-gray-600 text-xs font-bold rounded-lg hover:bg-gray-50 transition-colors">
                                    Transferir
                                </button>
                                <button className="px-3 py-1.5 bg-red-50 text-red-600 text-xs font-bold rounded-lg hover:bg-red-100 transition-colors">
                                    Encerrar
                                </button>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4" style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', backgroundRepeat: 'repeat' }}>
                            {/* Encryption Warning Style */}
                            <div className="flex justify-center mb-4">
                                <div className="bg-[#FFEECD] text-yellow-800 text-[10px] px-3 py-1.5 rounded-lg shadow-sm max-w-sm text-center">
                                    As mensagens e as chamadas são protegidas com a criptografia de ponta a ponta.
                                </div>
                            </div>

                            {messages.map((msg, idx) => {
                                const isMe = msg.key.fromMe
                                const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || (msg.message?.imageMessage ? '📷 [Imagem]' : (msg.message?.videoMessage ? '🎥 [Vídeo]' : '📄 [Mídia/Documento]'))
                                const timestamp = typeof msg.messageTimestamp === 'number'
                                    ? (msg.messageTimestamp > 10000000000 ? msg.messageTimestamp : msg.messageTimestamp * 1000)
                                    : Date.now()

                                return (
                                    <div key={msg.id || idx} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`
                                            relative max-w-[65%] px-4 py-2 text-sm shadow-sm rounded-xl
                                            ${isMe ? 'bg-[#E7FFDB] text-gray-900 rounded-tr-none' : 'bg-white text-gray-900 rounded-tl-none'}
                                        `}>
                                            <div className="whitespace-pre-wrap leading-relaxed break-words">{text}</div>
                                            <div className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${isMe ? 'text-green-800/60' : 'text-gray-400'}`}>
                                                <span>{new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                {isMe && <span className="text-blue-500">✓✓</span>}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                            <div ref={(el) => el?.scrollIntoView({ behavior: 'smooth' })} />
                        </div>

                        {/* Input Area */}
                        <div className="p-4 bg-white border-t border-gray-200">
                            {/* Floating Quick Actions (optional) */}
                            <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
                                {['Olá, tudo bem?', 'Vou verificar agora', 'Pode me enviar o comprovante?'].map(reply => (
                                    <button
                                        key={reply}
                                        onClick={() => setInputMessage(reply)}
                                        className="px-3 py-1.5 bg-gray-50 border border-gray-200 text-gray-600 rounded-full text-xs hover:bg-gray-100 transition-colors whitespace-nowrap"
                                    >
                                        {reply}
                                    </button>
                                ))}
                            </div>

                            <div className="flex items-end gap-2 bg-gray-100 p-2 rounded-2xl border border-transparent focus-within:border-gray-300 focus-within:bg-white transition-all">
                                <button className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200 transition-colors">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                </button>
                                <button className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200 transition-colors">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
                                </button>
                                <textarea
                                    value={inputMessage}
                                    onChange={(e) => setInputMessage(e.target.value)}
                                    // Handle Enter to send, Shift+Enter for new line
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault()
                                            handleSendMessage()
                                        }
                                    }}
                                    rows={1}
                                    placeholder="Escreva sua mensagem..."
                                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-gray-900 placeholder-gray-400 resize-none py-3 max-h-32"
                                    style={{ minHeight: '44px' }}
                                />
                                <button
                                    onClick={handleSendMessage}
                                    disabled={!inputMessage.trim()}
                                    className={`p-2 rounded-full transition-all shadow-sm ${inputMessage.trim() ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-400'}`}
                                >
                                    <svg className="w-5 h-5 transform rotate-90" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-50/50">
                        <div className="w-24 h-24 bg-blue-50/80 rounded-full flex items-center justify-center text-blue-400 mb-6 ring-4 ring-white shadow-xl">
                            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">WhatsApp Web</h3>
                        <p className="text-gray-500 text-center max-w-sm text-sm leading-relaxed">
                            Envie e receba mensagens sem precisar manter seu celular conectado.
                            <br />Selecione uma conversa para começar.
                        </p>
                    </div>
                )}
            </div>

            {/* Right Sidebar */}
            {selectedChat && (
                <div className="w-80 border-l border-gray-200 bg-white hidden 2xl:flex flex-col h-full overflow-hidden">
                    <div className="p-8 flex flex-col items-center border-b border-gray-100">
                        <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 font-bold text-2xl mb-4 overflow-hidden relative shadow-inner">
                            {selectedChat.profilePictureUrl ? (
                                <img src={selectedChat.profilePictureUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                                (selectedChat.name?.charAt(0) || '?')
                            )}
                        </div>
                        <h2 className="text-lg font-bold text-gray-900 text-center leading-tight mb-1">
                            {selectedChat.name || formatPhone(selectedChat.id)}
                        </h2>
                        {/* Optional Badges like in screenshot */}
                        <div className="flex gap-2 mt-2">
                            <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-bold rounded uppercase">Lead Quente</span>
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded uppercase">Vendas</span>
                        </div>
                    </div>

                    <div className="p-6 flex-1 overflow-y-auto">
                        <div className="mb-8">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Informações de Contato</h3>
                                <button className="text-blue-600 text-xs font-semibold hover:underline">Editar</button>
                            </div>

                            <div className="space-y-4">
                                <div className="flex gap-3 items-start">
                                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 mb-0.5">E-mail</p>
                                        <p className="text-sm font-medium text-gray-900 break-all">Não informado</p>
                                    </div>
                                </div>

                                <div className="flex gap-3 items-start">
                                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 mb-0.5">WhatsApp</p>
                                        <p className="text-sm font-medium text-gray-900">{formatPhone(selectedChat.id)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mb-8">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Notas Internas</h3>
                                <button className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center hover:bg-orange-200 transition-colors">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"></path></svg>
                                </button>
                            </div>
                            <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-100">
                                <p className="text-xs text-gray-600 italic leading-relaxed">"Cliente solicitou entrega prioritária para o próximo pedido."</p>
                                <div className="mt-2 flex justify-between items-center text-[10px] text-gray-400">
                                    <span>Por: Sistema</span>
                                    <span>Ontem</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function formatPhone(phone: string) {
    if (!phone) return '-'
    const clean = phone.replace(/\D/g, '')
    // Format: +55 85 98658-3270
    if (clean.length >= 12 && clean.startsWith('55')) {
        return `+${clean.substring(0, 2)} ${clean.substring(2, 4)} ${clean.substring(4, 9)}-${clean.substring(9)}`
    }
    return phone
}
