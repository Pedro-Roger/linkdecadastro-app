import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    BookOpen,
    Calendar,
    Users,
    MessageSquare,
    Send,
    LogOut,
    ChevronLeft,
    Moon,
    Sun,
    ShieldCheck,
    Bot,
    Cpu,
    X
} from 'lucide-react';
import { useAuth } from '@/lib/useAuth';

interface AdminSidebarProps {
    mobileOpen?: boolean;
    onClose?: () => void;
}

export default function AdminSidebar({ mobileOpen = false, onClose }: AdminSidebarProps) {
    const location = useLocation();
    const { user, signOut } = useAuth();
    const [collapsed, setCollapsed] = React.useState(false);
    const [theme, setTheme] = React.useState<'light' | 'dark'>('light');

    const menuItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard' },
        { icon: BookOpen, label: 'Cursos', path: '/admin/courses' },
        { icon: Calendar, label: 'Eventos', path: '/admin/events' },
        { icon: Users, label: 'CRM Clientes', path: '/admin/crm/contacts' },
        { icon: MessageSquare, label: 'Atendimento', path: '/admin/chat' },
        { icon: Send, label: 'WhatsApp', path: '/admin/whatsapp/send' },
        { icon: Bot, label: 'Inteligência Artificial', path: '/admin/ai-settings' },
    ];

    if (user?.role === 'SUPER_ADMIN' || user?.canAccessAgents) {
        menuItems.push({ icon: Cpu, label: 'Agentes', path: '/admin/agents' });
    }

    if (user?.role === 'SUPER_ADMIN') {
        menuItems.push({ icon: ShieldCheck, label: 'Acessos', path: '/admin/users' });
    }

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        document.documentElement.classList.toggle('dark-theme');
    };

    return (
        <>
            {/* Backdrop - mobile only */}
            {mobileOpen && (
                <div
                    onClick={onClose}
                    className="lg:hidden fixed inset-0 bg-black/40 z-40"
                    aria-hidden="true"
                />
            )}

            <aside
                className={`fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 lg:static lg:z-30 lg:translate-x-0 h-screen bg-[var(--bg-sidebar)] border-r border-[var(--border-light)] flex flex-col ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} ${collapsed ? 'lg:w-20' : 'lg:w-72'}`}
            >
                <div className="p-6 flex items-center justify-between">
                    {!collapsed && (
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-[var(--primary)]/20 transition-transform hover:scale-105">
                                L
                            </div>
                            <span className="font-extrabold text-xl text-[var(--secondary)] tracking-tight">
                                Link<span className="text-[var(--primary)]">Cadastro</span>
                            </span>
                        </div>
                    )}
                    {/* Close button - mobile */}
                    <button
                        onClick={onClose}
                        className="lg:hidden p-2 hover:bg-[var(--bg-main)] rounded-lg text-[var(--text-muted)] transition-colors"
                        aria-label="Fechar menu"
                    >
                        <X size={20} />
                    </button>
                    {/* Collapse button - desktop */}
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className="hidden lg:block p-2 hover:bg-[var(--bg-main)] rounded-lg text-[var(--text-muted)] transition-colors"
                        aria-label="Recolher menu"
                    >
                        <ChevronLeft className={`transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} size={20} />
                    </button>
                </div>

            <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto custom-scrollbar">
                <div className="px-3 mb-2 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                    {!collapsed ? 'Menu Principal' : 'Menu'}
                </div>
                {menuItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            onClick={onClose}
                            className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all group ${isActive
                                ? 'bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/25'
                                : 'text-[var(--text-muted)] hover:bg-[var(--sidebar-active)] hover:text-[var(--primary)]'
                                }`}
                        >
                            <item.icon size={22} className={isActive ? 'text-white' : 'group-hover:scale-110 transition-transform'} />
                            {!collapsed && <span className="font-semibold">{item.label}</span>}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 bg-[var(--bg-main)]/50 border-t border-[var(--border-light)] space-y-4">
                {!collapsed && (
                    <div className="bg-gradient-to-br from-[#0f766e] to-[#155e75] rounded-2xl p-4 text-white relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-8 -mt-8"></div>
                        <h4 className="font-bold text-sm mb-1 z-10 relative">Operação assistida</h4>
                        <p className="text-[10px] text-white/80 mb-3 z-10 relative">Centralize atendimento, WhatsApp e agentes na mesma operação.</p>
                        <button className="w-full py-2 bg-white text-[#0f766e] rounded-lg text-[10px] font-bold hover:bg-opacity-90 transition-all z-10 relative">
                            VER MÓDULOS
                        </button>
                    </div>
                )}

                <div className={`flex items-center gap-2 p-1 bg-[var(--border-light)] rounded-xl ${collapsed ? 'justify-center' : ''}`}>
                    <button
                        onClick={toggleTheme}
                        className={`flex items-center gap-2 flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all ${theme === 'light' ? 'bg-white text-[var(--secondary)] shadow-sm' : 'text-[var(--text-muted)]'
                            }`}
                    >
                        <Sun size={14} />
                        {!collapsed && <span>Claro</span>}
                    </button>
                    <button
                        onClick={toggleTheme}
                        className={`flex items-center gap-2 flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all ${theme === 'dark' ? 'bg-[#1E293B] text-white shadow-sm' : 'text-[var(--text-muted)]'
                            }`}
                    >
                        <Moon size={14} />
                        {!collapsed && <span>Escuro</span>}
                    </button>
                </div>

                <div className={`flex items-center gap-3 p-2 rounded-xl hover:bg-[var(--border-light)] cursor-pointer transition-all ${collapsed ? 'justify-center' : ''}`}>
                    <img
                        src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=FF6600&color=fff`}
                        alt="User"
                        className="w-10 h-10 rounded-full border-2 border-white shadow-sm"
                    />
                    {!collapsed && (
                        <div className="flex-1 min-w-0">
                            <h5 className="font-bold text-sm text-[var(--secondary)] truncate">{user?.name}</h5>
                            <p className="text-[10px] text-[var(--text-muted)] truncate">{user?.email}</p>
                        </div>
                    )}
                    {!collapsed && (
                        <button
                            onClick={() => signOut()}
                            className="p-2 text-[var(--text-muted)] hover:text-red-500 transition-colors"
                        >
                            <LogOut size={16} />
                        </button>
                    )}
                </div>
            </div>
            </aside>
        </>
    );
}
