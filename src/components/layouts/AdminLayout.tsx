import React from 'react';
import AdminSidebar from '../admin/AdminSidebar';
import AdminRightSidebar from '../admin/AdminRightSidebar';

interface AdminLayoutProps {
    children: React.ReactNode;
    hideRightSidebar?: boolean;
}

export default function AdminLayout({ children, hideRightSidebar = false }: AdminLayoutProps) {
    return (
        <div className="flex h-screen overflow-hidden bg-[var(--bg-main)]">
            {/* Sidebar - Left */}
            <AdminSidebar />

            {/* Main Content - Center */}
            <main className="flex-1 overflow-y-auto custom-scrollbar flex flex-col pt-4 px-8 pb-8">
                <div className="max-w-7xl w-full mx-auto">
                    {children}
                </div>
            </main>

            {/* Right Widget - Right Sidebar */}
            {!hideRightSidebar && <AdminRightSidebar />}
        </div>
    );
}
