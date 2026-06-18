import React from 'react';
import { Menu } from 'lucide-react';
import AdminSidebar from '../admin/AdminSidebar';
import AdminRightSidebar from '../admin/AdminRightSidebar';

interface AdminLayoutProps {
    children: React.ReactNode;
    hideRightSidebar?: boolean;
    fullWidth?: boolean;
}

export default function AdminLayout({
    children,
    hideRightSidebar = false,
    fullWidth = false,
}: AdminLayoutProps) {
    const [mobileOpen, setMobileOpen] = React.useState(false);

    return (
        <div className="flex h-screen overflow-hidden bg-[var(--bg-main)]">
            {/* Sidebar - Left (off-canvas drawer on mobile) */}
            <AdminSidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

            {/* Center column: mobile topbar + main content */}
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                {/* Mobile topbar with hamburger */}
                <header className="lg:hidden flex items-center justify-between h-14 px-4 border-b border-[var(--border-light)] bg-[var(--bg-sidebar)] shrink-0">
                    <button
                        onClick={() => setMobileOpen(true)}
                        className="p-2 -ml-2 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-main)] transition-colors"
                        aria-label="Abrir menu"
                    >
                        <Menu size={24} />
                    </button>
                    <span className="font-extrabold text-lg text-[var(--secondary)] tracking-tight">
                        Link<span className="text-[var(--primary)]">Cadastro</span>
                    </span>
                    <div className="w-9" aria-hidden="true" />
                </header>

                {/* Main Content - Center */}
                <main className="flex-1 overflow-y-auto custom-scrollbar flex flex-col pt-4 px-4 sm:px-6 lg:px-8 pb-8">
                    <div className={`${fullWidth ? 'w-full' : 'max-w-7xl w-full mx-auto'}`}>
                        {children}
                    </div>
                </main>
            </div>

            {/* Right Widget - Right Sidebar */}
            {!hideRightSidebar && <AdminRightSidebar />}
        </div>
    );
}
