import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, Calendar, BookOpen } from 'lucide-react';

interface StatItem {
    id: string;
    type: 'course' | 'event';
    title: string;
    totalInscribed: number;
    todayInscribed: number;
    percentage?: number;
}

interface UserStatsCarouselProps {
    stats: StatItem[];
}

export default function UserStatsCarousel({ stats }: UserStatsCarouselProps) {
    const [activeIndex, setActiveIndex] = useState(0);

    useEffect(() => {
        if (stats.length <= 1) return;
        const interval = setInterval(() => {
            setActiveIndex((prev) => (prev + 1) % stats.length);
        }, 5000);
        return () => clearInterval(interval);
    }, [stats.length]);

    if (stats.length === 0) return null;

    return (
        <div className="relative w-full overflow-hidden rounded-3xl bg-[var(--bg-card)] border border-[var(--border-light)] p-6 shadow-sm group">
            <div className="flex transition-transform duration-700 ease-in-out" style={{ transform: `translateX(-${activeIndex * 100}%)` }}>
                {stats.map((stat) => (
                    <div key={`${stat.type}-${stat.id}`} className="w-full shrink-0 flex items-center justify-between px-2">
                        <div className="flex items-center gap-6">
                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-inner ${stat.type === 'course' ? 'bg-[var(--primary)]/10 text-[var(--primary)]' : 'bg-indigo-500/10 text-indigo-500'
                                }`}>
                                {stat.type === 'course' ? <BookOpen size={30} /> : <Calendar size={30} />}
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${stat.type === 'course' ? 'bg-[var(--primary-light)] text-[var(--primary)]' : 'bg-indigo-100 text-indigo-700'
                                        }`}>
                                        {stat.type === 'course' ? 'Curso Atual' : 'Evento Atual'}
                                    </span>
                                    <span className="text-xs text-[var(--text-muted)] font-medium">• {stat.type === 'course' ? 'Online' : 'Presencial'}</span>
                                </div>
                                <h3 className="text-xl font-bold text-[var(--secondary)] mb-1 truncate max-w-[300px] tracking-tight">{stat.title}</h3>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-1.5 text-xs text-emerald-500 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                                        <TrendingUp size={14} />
                                        <span>+{stat.todayInscribed} hoje</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="text-center px-4 py-2 bg-[var(--bg-main)] rounded-2xl border border-[var(--border-light)] min-w-[100px]">
                                <div className="text-xl font-black text-[var(--secondary)]">{stat.totalInscribed}</div>
                                <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Inscritos</div>
                            </div>
                            <div className="text-center px-4 py-2 bg-emerald-50 rounded-2xl border border-emerald-100 min-w-[100px]">
                                <div className="text-xl font-black text-emerald-600">{stat.todayInscribed}</div>
                                <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Hoje</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Pagination Dots */}
            {stats.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {stats.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setActiveIndex(i)}
                            className={`h-1.5 rounded-full transition-all duration-300 ${activeIndex === i ? 'w-6 bg-[var(--primary)]' : 'w-1.5 bg-[var(--border-light)]'
                                }`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
