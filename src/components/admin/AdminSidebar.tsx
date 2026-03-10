import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    BookOpen,
    Calendar,
    Users,
    MessageSquare,
    Send,
    Settings,
    LogOut,
    ChevronLeft,
    Moon,
    Sun,
    ShieldCheck,
    Bot
} from 'lucide-react';
import { useAuth } from '@/lib/useAuth';

export default function AdminSidebar() {
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

    if (user?.role === 'SUPER_ADMIN') {
        menuItems.push({ icon: ShieldCheck, label: 'Acessos', path: '/admin/users' });
    }

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        document.documentElement.classList.toggle('dark-theme');
    };

    return (
        <aside
            className={`h-screen bg-[var(--bg-sidebar)] border-r border-[var(--border-light)] flex flex-col transition-all duration-300 z-30 ${collapsed ? 'w-20' : 'w-72'
                }`}
        >
            {/* Header */}
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
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="p-2 hover:bg-[var(--bg-main)] rounded-lg text-[var(--text-muted)] transition-colors"
                >
                    <ChevronLeft className={`transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} size={20} />
                </button>
            </div>

            {/* Main Menu */}
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

            {/* Bottom Section */}
            <div className="p-4 bg-[var(--bg-main)]/50 border-t border-[var(--border-light)] space-y-4">
                {/* Ad Space Card (Inspired by mockup) */}
                {!collapsed && (
                    <div className="bg-gradient-to-br from-[#7C3AED] to-[#4F46E5] rounded-2xl p-4 text-white relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-8 -mt-8"></div>
                        <h4 className="font-bold text-sm mb-1 z-10 relative">Cresça seu negócio</h4>
                        <p className="text-[10px] text-white/80 mb-3 z-10 relative">Assine ferramentas premium para escalar suas vendas.</p>
                        <button className="w-full py-2 bg-white text-[#7C3AED] rounded-lg text-[10px] font-bold hover:bg-opacity-90 transition-all z-10 relative">
                            VER PLANOS
                        </button>
                    </div>
                )}

                {/* Theme Toggle */}
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

                {/* User Profile */}
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
    );
}
// HMR force update
