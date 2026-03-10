import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/useAuth';
import {
  ArrowUpRight,
  Monitor,
  Calendar,
  Users,
  Clock,
  ChevronRight,
  Globe,
  Rocket
} from 'lucide-react';
import Footer from '@/components/ui/Footer';
import { apiFetch, normalizeImageUrl } from '@/lib/api';

export default function HomePage() {
  const { isAuthenticated } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [eventsData, coursesData] = await Promise.all([
          apiFetch('/events/active').catch(() => []),
          apiFetch('/courses').catch(() => [])
        ]);
        setEvents(eventsData || []);
        setCourses(coursesData || []);
      } catch (error) {
        console.error('Failed to fetch data', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const allItems = useMemo(() => {
    const combined = [
      ...events.map(e => ({ ...e, itemType: 'event' })),
      ...courses.map(c => ({ ...c, itemType: 'course' }))
    ];
    return combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [events, courses]);

  return (
    <div className="min-h-screen bg-[var(--bg-main)] selection:bg-[var(--primary)] selection:text-white flex flex-col relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-[var(--primary)]/5 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-[var(--accent)]/5 blur-[120px] rounded-full"></div>
      </div>

      {/* Modern Navbar */}
      <nav className="relative w-full z-50 pt-8">
        <div className="container mx-auto px-6 flex items-center justify-between glass rounded-3xl py-4 border border-[var(--glass-border)] shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] rounded-xl flex items-center justify-center text-white shadow-lg shadow-[var(--primary)]/30">
              <Rocket className="w-5 h-5 fill-white/20" />
            </div>
            <span className="font-black text-2xl tracking-tighter text-[var(--secondary)] italic">
              LinkDe<span className="text-[var(--primary)]">Cadastro</span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8 font-bold text-[var(--text-muted)] text-sm uppercase tracking-widest">
            <a href="#" className="text-[var(--primary)] border-b-2 border-[var(--primary)] pb-1">Início</a>
            <a href="#" className="hover:text-[var(--primary)] transition-all">Soluções</a>
            <a href="#" className="hover:text-[var(--primary)] transition-all">Suporte</a>
            <div className="relative group cursor-help">
              <span className="text-slate-300 transition-all">Contatos</span>
              <span className="absolute -top-4 -right-8 px-1.5 py-0.5 bg-[var(--accent)] text-white text-[8px] font-black rounded-md tracking-tighter">EM BREVE</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link
              to={isAuthenticated ? '/admin/dashboard' : '/login'}
              className="px-8 py-3 bg-[var(--secondary)] hover:bg-slate-800 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl shadow-slate-900/10 active:scale-95 flex items-center gap-2"
            >
              {isAuthenticated ? 'Meu Painel' : 'Acesse Agora'}
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-1 relative z-10 flex flex-col pt-24 pb-32">
        {/* Massive Hero Section */}
        <div className="container mx-auto px-6 mb-32">
          <div className="max-w-5xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] text-xs font-black uppercase tracking-widest border border-[var(--primary)]/10 mb-8 animate-in fade-in slide-in-from-left duration-700">
              <span className="w-2 h-2 bg-[var(--primary)] rounded-full animate-pulse"></span>
              Plataforma para Profissionais
            </div>

            <h1 className="text-6xl md:text-8xl font-black text-[var(--secondary)] tracking-tighter leading-[0.9] mb-10 italic animate-in fade-in slide-in-from-top-10 duration-700 delay-150">
              Transforme Cliques em <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--primary)] to-[var(--accent)]">Sucesso Absoluto.</span>
            </h1>

            <p className="text-xl md:text-2xl text-[var(--text-muted)] max-w-3xl mb-12 leading-relaxed font-medium animate-in fade-in slide-in-from-top-10 duration-700 delay-300">
              A LinkCadastro automatiza sua captação de leads, gerencia seus eventos e conecta você diretamente ao seu público via WhatsApp com inteligência artificial.
            </p>

            <div className="flex flex-wrap gap-6 animate-in fade-in slide-in-from-top-10 duration-700 delay-500">
              <Link
                to={isAuthenticated ? '/admin/dashboard' : '/login'}
                className="inline-flex px-10 py-5 bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-white font-black text-sm uppercase tracking-[0.2em] rounded-[1.5rem] transition-all shadow-2xl shadow-[var(--primary)]/30 hover:shadow-[var(--primary)]/50 hover:-translate-y-1 active:scale-95"
              >
                Começar Gratuitamente
              </Link>
              <button className="inline-flex px-10 py-5 bg-white border border-[var(--border-light)] text-[var(--secondary)] font-black text-sm uppercase tracking-[0.2em] rounded-[1.5rem] transition-all hover:bg-slate-50 shadow-xl shadow-slate-200/50">
                Ver Demonstração
              </button>
            </div>
          </div>
        </div>

        {/* Live Slider Section */}
        <div className="container mx-auto px-6">
          <div className="flex items-end justify-between mb-12">
            <div>
              <h2 className="text-xs font-black text-[var(--primary)] uppercase tracking-[0.3em] mb-3">Live & On-demand</h2>
              <h3 className="text-4xl font-black text-[var(--secondary)] tracking-tighter italic">Eventos & Cursos Disponíveis</h3>
            </div>
            <div className="hidden md:flex gap-3">
              <button className="w-12 h-12 rounded-2xl bg-white border border-[var(--border-light)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--primary)] transition-all shadow-sm">
                <ChevronRight className="w-5 h-5 rotate-180" />
              </button>
              <button className="w-12 h-12 rounded-2xl bg-white border border-[var(--border-light)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--primary)] transition-all shadow-sm">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-[450px] bg-slate-200 rounded-[2.5rem] animate-pulse"></div>
              ))}
            </div>
          ) : allItems.length === 0 ? (
            <div className="bg-white/50 border-2 border-dashed border-[var(--border-light)] rounded-[3rem] p-24 text-center">
              <div className="w-20 h-20 bg-[var(--bg-main)] rounded-3xl flex items-center justify-center mx-auto mb-6 text-[var(--text-muted)]">
                <Globe className="w-10 h-10 opacity-20" />
              </div>
              <p className="text-xl font-bold text-[var(--text-muted)] italic">Nenhum evento ou curso disponível no momento.</p>
            </div>
          ) : (
            <div className="flex gap-8 overflow-x-auto pb-12 pt-4 snap-x snap-mandatory no-scrollbar custom-scrollbar-hide">
              {allItems.map((item) => (
                <div
                  key={item.id}
                  className="flex-shrink-0 w-[340px] md:w-[400px] snap-center"
                >
                  <div className="group relative bg-white rounded-[2.5rem] overflow-hidden shadow-2xl shadow-slate-200/50 h-[500px] border border-[var(--border-light)] transition-all hover:-translate-y-2 hover:shadow-[var(--primary)]/10">
                    {/* Banner */}
                    <div className="h-2/3 bg-slate-100 overflow-hidden relative">
                      {item.bannerUrl ? (
                        <img
                          src={normalizeImageUrl(item.bannerUrl)}
                          alt={item.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[var(--secondary)] to-[var(--primary)] flex flex-col items-center justify-center text-white/20 p-12">
                          {item.itemType === 'course' ? (
                            <Monitor className="w-32 h-32 opacity-10 mb-4" />
                          ) : (
                            <Calendar className="w-32 h-32 opacity-10 mb-4" />
                          )}
                          <Rocket className="w-20 h-20 absolute bottom-[-20px] right-[-20px] opacity-5 -rotate-12" />
                        </div>
                      )}

                      <div className="absolute top-6 left-6">
                        <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg ${item.itemType === 'course'
                          ? 'bg-[var(--primary)] text-white'
                          : 'bg-emerald-500 text-white'
                          }`}>
                          {item.itemType === 'course' ? 'Curso Online' : 'Evento Ao Vivo'}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-8 pb-10 flex flex-col h-1/3 justify-between">
                      <div>
                        <h4 className="text-2xl font-black text-[var(--secondary)] tracking-tight line-clamp-1 italic mb-2">
                          {item.title}
                        </h4>
                        <p className="text-sm text-[var(--text-muted)] line-clamp-2 font-medium">
                          {item.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-[var(--text-muted)]">
                          <div className="flex items-center gap-1.5">
                            <Users className="w-4 h-4" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">
                              {item._count?.enrollments || item._count?.registrations || 0}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Aberto</span>
                          </div>
                        </div>

                        <Link
                          to={item.itemType === 'course' ? `/course/${item.slug || item.id}` : `/register/${item.slug || item.linkId}`}
                          className="w-12 h-12 bg-[var(--bg-main)] border border-[var(--border-light)] rounded-2xl flex items-center justify-center text-[var(--secondary)] hover:bg-[var(--primary)] hover:text-white hover:border-transparent transition-all group-hover:bg-[var(--primary)] group-hover:text-white group-hover:border-transparent"
                        >
                          <ArrowUpRight className="w-6 h-6" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />

      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
