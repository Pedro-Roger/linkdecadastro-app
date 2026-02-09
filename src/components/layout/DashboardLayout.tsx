import { useState, useEffect } from 'react'
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/useAuth'

interface SidebarItem {
    label: string
    path: string
    icon: JSX.Element
    adminOnly?: boolean
}

export default function DashboardLayout() {
    const { user, signOut } = useAuth()
    const location = useLocation()
    const navigate = useNavigate()
    const [isCollapsed, setIsCollapsed] = useState(false)
    const [isMobileOpen, setIsMobileOpen] = useState(false)

    // Items mapped to the "Upsprints" style but with real app routes
    const items: SidebarItem[] = [
        {
            label: 'Home',
            path: '/admin/dashboard', // Assuming admin home is dashboard, or '/' if general
            adminOnly: true,
            icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
        },
        {
            label: 'Meu Aprendizado',
            path: '/my-courses',
            adminOnly: false,
            icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
        },
        {
            label: 'Cursos',
            path: '/admin/courses',
            adminOnly: true,
            icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
        },
        {
            label: 'Eventos',
            path: '/admin/events',
            adminOnly: true,
            icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
        },
        {
            label: 'Atendimento',
            path: '/admin/whatsapp/chat', // New Chat Page
            adminOnly: true,
            icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
        },
        {
            label: 'Clientes',
            path: '/admin/customers', // Assuming we might build this, or use enrollments page
            adminOnly: true,
            icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
        },
        {
            label: 'Perfil',
            path: '/profile',
            adminOnly: false,
            icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
        }
    ]

    const filteredItems = items.filter(item => !item.adminOnly || (user?.role === 'ADMIN'))

    const handleLogout = () => {
        signOut()
        navigate('/login')
    }

    return (
        <div className="flex h-screen bg-[#F3F4F6] overflow-hidden font-sans">
            {/* Sidebar - Desktop */}
            <aside
                className={`hidden md:flex flex-col bg-gradient-to-b from-[#5b4eff] to-[#8d4eff] text-white transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-64'} shadow-2xl relative z-20`}
            >
                <div className="flex items-center justify-between p-4 h-16 border-b border-white/10">
                    {!isCollapsed && <span className="font-bold text-xl tracking-tight">Quero Camarão</span>}
                    <button onClick={() => setIsCollapsed(!isCollapsed)} className="p-1 rounded-lg hover:bg-white/10 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isCollapsed ? "M13 5l7 7-7 7M5 5l7 7-7 7" : "M11 19l-7-7 7-7m8 14l-7-7 7-7"} /></svg>
                    </button>
                </div>

                <nav className="flex-1 py-6 px-2 space-y-1 overflow-y-auto">
                    {filteredItems.map((item) => {
                        const isActive = location.pathname.startsWith(item.path)
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center px-3 py-3 rounded-xl transition-all group ${isActive
                                        ? 'bg-white/20 text-white font-semibold shadow-inner'
                                        : 'text-blue-100 hover:bg-white/10 hover:text-white'
                                    }`}
                                title={isCollapsed ? item.label : ''}
                            >
                                <span className={`${isActive ? 'text-white' : 'text-blue-200 group-hover:text-white'}`}>
                                    {item.icon}
                                </span>
                                {!isCollapsed && <span className="ml-3 truncate">{item.label}</span>}
                                {isActive && !isCollapsed && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"></div>}
                            </Link>
                        )
                    })}
                </nav>

                <div className="p-4 border-t border-white/10">
                    <button
                        onClick={handleLogout}
                        className={`flex items-center w-full px-3 py-3 rounded-xl text-blue-100 hover:bg-white/10 hover:text-white transition-all ${isCollapsed ? 'justify-center' : ''}`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        {!isCollapsed && <span className="ml-3">Sair</span>}
                    </button>
                </div>
            </aside>

            {/* Mobile Sidebar Overlay */}
            {isMobileOpen && (
                <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsMobileOpen(false)} />
            )}

            {/* Sidebar - Mobile */}
            <aside className={`fixed inset-y-0 left-0 bg-[#5b4eff] text-white w-64 transform transition-transform duration-300 ease-in-out z-50 md:hidden ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <span className="font-bold text-xl">Quero Camarão</span>
                    <button onClick={() => setIsMobileOpen(false)} className="p-1"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
                <nav className="p-4 space-y-2">
                    {filteredItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            onClick={() => setIsMobileOpen(false)}
                            className={`flex items-center px-4 py-3 rounded-lg ${location.pathname.startsWith(item.path)
                                    ? 'bg-white/20 font-semibold'
                                    : 'hover:bg-white/10'
                                }`}
                        >
                            {item.icon}
                            <span className="ml-3">{item.label}</span>
                        </Link>
                    ))}
                    <button onClick={handleLogout} className="flex w-full items-center px-4 py-3 rounded-lg hover:bg-white/10 mt-4 text-red-100">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        <span className="ml-3">Sair</span>
                    </button>
                </nav>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
                {/* Top Header */}
                <header className="h-16 bg-white shadow-sm flex items-center justify-between px-6 z-10 shrink-0">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsMobileOpen(true)} className="md:hidden p-2 text-gray-600">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                        </button>
                        <h2 className="text-xl font-bold text-gray-800 hidden sm:block">
                            {items.find(i => location.pathname.startsWith(i.path))?.label || 'Dashboard'}
                        </h2>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                            <span className="text-xs font-medium text-gray-600">Sistema Online</span>
                        </div>

                        <div className="h-8 w-px bg-gray-200 mx-2 hidden md:block"></div>

                        <Link to="/profile" className="flex items-center gap-3 hover:bg-gray-50 p-1.5 rounded-lg transition-colors">
                            <div className="text-right hidden md:block">
                                <p className="text-sm font-bold text-gray-800 leading-none">{user?.name}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{user?.role === 'ADMIN' ? 'Administrador' : 'Aluno'}</p>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#5b4eff] to-[#8d4eff] flex items-center justify-center text-white font-bold shadow-md ring-2 ring-white">
                                {user?.name?.charAt(0).toUpperCase()}
                            </div>
                        </Link>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto bg-[#F3F4F6] p-4 md:p-8">
                    <div className="max-w-7xl mx-auto h-full flex flex-col">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    )
}
