import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/useAuth';
import {
  ArrowUpRight,
  Calendar,
  CheckCheck,
  ChevronRight,
  Clock,
  Globe,
  Monitor,
  Rocket,
  Users,
} from 'lucide-react';
import Footer from '@/components/ui/Footer';
import { apiFetch, normalizeImageUrl } from '@/lib/api';

const pricingPlans = [
  {
    name: 'Simples',
    price: 'R$ 40',
    highlight: 'Essencial',
    description: 'Para quem quer organizar leads, eventos e contatos sem automacoes avancadas.',
    features: [
      'Cadastro de leads e inscritos',
      'Gestao de eventos e formularios',
      'Painel administrativo completo',
      'CRM basico com funil visual',
    ],
    accent: 'from-slate-700 to-slate-900',
  },
  {
    name: 'WhatsApp',
    price: 'R$ 60',
    highlight: 'Mais vendido',
    description: 'Ideal para conectar sua base ao WhatsApp e acelerar o relacionamento comercial.',
    features: [
      'Tudo do plano Simples',
      'Multiplos numeros de WhatsApp',
      'Transmissoes e atendimento',
      'Sincronizacao de grupos e contatos',
    ],
    accent: 'from-emerald-500 to-teal-500',
    featured: true,
  },
  {
    name: 'Agentes',
    price: 'R$ 100',
    highlight: 'IA ativa',
    description: 'Perfeito para quem quer agentes respondendo e automatizando operacoes do sistema.',
    features: [
      'Tudo do plano WhatsApp',
      '1 agente inteligente configuravel',
      'Atendimento autonomo por numero',
      'Acionamento de automacoes e contexto',
    ],
    accent: 'from-[var(--primary)] to-[var(--accent)]',
  },
  {
    name: 'Personalizado',
    price: 'R$ 120',
    highlight: 'Sob medida',
    description: 'Plano para operacoes mais avancadas com dois agentes e configuracao dedicada.',
    features: [
      'Tudo do plano Agentes',
      '2 agentes inclusos',
      'Fluxos personalizados por cliente',
      'Acompanhamento de implantacao',
    ],
    accent: 'from-amber-500 to-orange-500',
  },
];

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
          apiFetch('/courses').catch(() => []),
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
      ...events.map((event) => ({ ...event, itemType: 'event' })),
      ...courses.map((course) => ({ ...course, itemType: 'course' })),
    ];

    return combined.sort(
      (first, second) =>
        new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime(),
    );
  }, [courses, events]);

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[var(--bg-main)] selection:bg-[var(--primary)] selection:text-white">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute right-[-10%] top-[-10%] h-[50%] w-[50%] rounded-full bg-[var(--primary)]/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] h-[50%] w-[50%] rounded-full bg-[var(--accent)]/5 blur-[120px]" />
      </div>

      <nav className="relative z-50 w-full pt-8">
        <div className="container mx-auto flex items-center justify-between rounded-3xl border border-[var(--glass-border)] px-6 py-4 shadow-xl glass">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] text-white shadow-lg shadow-[var(--primary)]/30">
              <Rocket className="h-5 w-5 fill-white/20" />
            </div>
            <span className="text-2xl font-black tracking-tighter text-[var(--secondary)] italic">
              LinkDe<span className="text-[var(--primary)]">Cadastro</span>
            </span>
          </div>

          <div className="hidden items-center gap-8 text-sm font-bold uppercase tracking-widest text-[var(--text-muted)] md:flex">
            <a href="#inicio" className="border-b-2 border-[var(--primary)] pb-1 text-[var(--primary)]">
              Inicio
            </a>
            <a href="#solucoes" className="transition-all hover:text-[var(--primary)]">
              Solucoes
            </a>
            <a href="#precos" className="transition-all hover:text-[var(--primary)]">
              Precos
            </a>
            <a href="#suporte" className="transition-all hover:text-[var(--primary)]">
              Suporte
            </a>
            <div className="group relative cursor-help">
              <span className="text-slate-300 transition-all">Contatos</span>
              <span className="absolute -right-8 -top-4 rounded-md bg-[var(--accent)] px-1.5 py-0.5 text-[8px] font-black tracking-tighter text-white">
                EM BREVE
              </span>
            </div>
          </div>

          <Link
            to={isAuthenticated ? '/admin/dashboard' : '/login'}
            className="flex items-center gap-2 rounded-2xl bg-[var(--secondary)] px-8 py-3 text-xs font-black uppercase tracking-[0.2em] text-white shadow-xl shadow-slate-900/10 transition-all active:scale-95 hover:bg-slate-800"
          >
            {isAuthenticated ? 'Meu Painel' : 'Acesse Agora'}
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </nav>

      <main className="relative z-10 flex flex-1 flex-col pt-24 pb-32">
        <section id="inicio" className="container mx-auto mb-32 px-6">
          <div className="max-w-5xl">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[var(--primary)]/10 bg-[var(--primary)]/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-[var(--primary)] animate-in fade-in slide-in-from-left duration-700">
              <span className="h-2 w-2 rounded-full bg-[var(--primary)] animate-pulse" />
              Plataforma para profissionais
            </div>

            <h1 className="mb-10 text-5xl font-black leading-[0.92] tracking-tighter text-[var(--secondary)] italic animate-in fade-in slide-in-from-top-10 duration-700 delay-150 md:text-7xl">
              Transforme Cliques em <br />
              <span className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] bg-clip-text text-transparent">
                Sucesso Absoluto.
              </span>
            </h1>

            <p className="mb-12 max-w-3xl text-xl font-medium leading-relaxed text-[var(--text-muted)] animate-in fade-in slide-in-from-top-10 duration-700 delay-300 md:text-2xl">
              A LinkCadastro automatiza sua captacao de leads, gerencia seus eventos e conecta voce
              diretamente ao seu publico via WhatsApp com inteligencia artificial.
            </p>

            <div className="flex flex-wrap gap-6 animate-in fade-in slide-in-from-top-10 duration-700 delay-500">
              <Link
                to={isAuthenticated ? '/admin/dashboard' : '/login'}
                className="inline-flex rounded-[1.5rem] bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] px-10 py-5 text-sm font-black uppercase tracking-[0.2em] text-white shadow-2xl shadow-[var(--primary)]/30 transition-all hover:-translate-y-1 hover:shadow-[var(--primary)]/50 active:scale-95"
              >
                Comecar Gratuitamente
              </Link>
              <a
                href="#precos"
                className="inline-flex rounded-[1.5rem] border border-[var(--border-light)] bg-white px-10 py-5 text-sm font-black uppercase tracking-[0.2em] text-[var(--secondary)] shadow-xl shadow-slate-200/50 transition-all hover:bg-slate-50"
              >
                Ver Planos
              </a>
            </div>
          </div>
        </section>

        <section id="precos" className="container mx-auto mb-32 px-6">
          <div className="mb-12 max-w-3xl">
            <h2 className="mb-3 text-xs font-black uppercase tracking-[0.3em] text-[var(--primary)]">
              Precos
            </h2>
            <h3 className="mb-5 text-4xl font-black tracking-tighter text-[var(--secondary)] italic md:text-5xl">
              Planos para cada etapa do seu crescimento.
            </h3>
            <p className="text-lg leading-relaxed text-[var(--text-muted)]">
              Escolha a estrutura ideal para comecar, vender mais no WhatsApp ou operar com agentes
              inteligentes dentro da sua plataforma.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 xl:grid-cols-4 md:grid-cols-2">
            {pricingPlans.map((plan) => (
              <div
                key={plan.name}
                className={`relative overflow-hidden rounded-[2.25rem] border bg-white p-8 shadow-xl shadow-slate-200/40 transition-all hover:-translate-y-2 ${
                  plan.featured
                    ? 'border-[var(--primary)] shadow-[var(--primary)]/15'
                    : 'border-[var(--border-light)]'
                }`}
              >
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div>
                    <span
                      className={`inline-flex rounded-full bg-gradient-to-r px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-white ${plan.accent}`}
                    >
                      {plan.highlight}
                    </span>
                    <h4 className="mt-4 text-3xl font-black tracking-tight text-[var(--secondary)] italic">
                      {plan.name}
                    </h4>
                  </div>
                  {plan.featured ? (
                    <span className="rounded-full bg-[var(--primary)]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--primary)]">
                      Recomendado
                    </span>
                  ) : null}
                </div>

                <div className="mb-5">
                  <div className="flex items-end gap-2">
                    <span className="text-4xl font-black tracking-tight text-[var(--secondary)]">
                      {plan.price}
                    </span>
                    <span className="pb-1 text-sm font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                      por mes
                    </span>
                  </div>
                  <p className="mt-4 min-h-[72px] text-sm leading-6 text-[var(--text-muted)]">
                    {plan.description}
                  </p>
                </div>

                <div className="mb-8 space-y-3">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">
                        <CheckCheck className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-semibold leading-6 text-[var(--secondary)]/85">
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>

                <Link
                  to={isAuthenticated ? '/admin/dashboard' : '/login'}
                  className={`inline-flex w-full items-center justify-center rounded-2xl px-6 py-4 text-xs font-black uppercase tracking-[0.22em] text-white transition-all ${
                    plan.featured
                      ? 'bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] shadow-lg shadow-[var(--primary)]/30'
                      : `bg-gradient-to-r ${plan.accent}`
                  }`}
                >
                  Escolher Plano
                </Link>
              </div>
            ))}
          </div>
        </section>

        <section id="solucoes" className="container mx-auto px-6">
          <div className="mb-12 flex items-end justify-between">
            <div>
              <h2 className="mb-3 text-xs font-black uppercase tracking-[0.3em] text-[var(--primary)]">
                Live & On-demand
              </h2>
              <h3 className="text-4xl font-black tracking-tighter text-[var(--secondary)] italic">
                Eventos & Cursos Disponiveis
              </h3>
            </div>
            <div className="hidden gap-3 md:flex">
              <button className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--border-light)] bg-white text-[var(--text-muted)] shadow-sm transition-all hover:text-[var(--primary)]">
                <ChevronRight className="h-5 w-5 rotate-180" />
              </button>
              <button className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--border-light)] bg-white text-[var(--text-muted)] shadow-sm transition-all hover:text-[var(--primary)]">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="h-[450px] animate-pulse rounded-[2.5rem] bg-slate-200" />
              ))}
            </div>
          ) : allItems.length === 0 ? (
            <div className="rounded-[3rem] border-2 border-dashed border-[var(--border-light)] bg-white/50 p-24 text-center">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-[var(--bg-main)] text-[var(--text-muted)]">
                <Globe className="h-10 w-10 opacity-20" />
              </div>
              <p className="text-xl font-bold italic text-[var(--text-muted)]">
                Nenhum evento ou curso disponivel no momento.
              </p>
            </div>
          ) : (
            <div className="custom-scrollbar-hide no-scrollbar flex snap-x snap-mandatory gap-8 overflow-x-auto pb-12 pt-4">
              {allItems.map((item) => (
                <div key={item.id} className="w-[340px] flex-shrink-0 snap-center md:w-[400px]">
                  <div className="group relative h-[500px] overflow-hidden rounded-[2.5rem] border border-[var(--border-light)] bg-white shadow-2xl shadow-slate-200/50 transition-all hover:-translate-y-2 hover:shadow-[var(--primary)]/10">
                    <div className="relative h-2/3 overflow-hidden bg-slate-100">
                      {item.bannerUrl ? (
                        <img
                          src={normalizeImageUrl(item.bannerUrl)}
                          alt={item.title}
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                      ) : (
                        <div className="relative flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[var(--secondary)] to-[var(--primary)] p-12 text-white/20">
                          {item.itemType === 'course' ? (
                            <Monitor className="mb-4 h-32 w-32 opacity-10" />
                          ) : (
                            <Calendar className="mb-4 h-32 w-32 opacity-10" />
                          )}
                          <Rocket className="absolute bottom-[-20px] right-[-20px] h-20 w-20 -rotate-12 opacity-5" />
                        </div>
                      )}

                      <div className="absolute left-6 top-6">
                        <span
                          className={`rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white shadow-lg ${
                            item.itemType === 'course'
                              ? 'bg-[var(--primary)]'
                              : 'bg-emerald-500'
                          }`}
                        >
                          {item.itemType === 'course' ? 'Curso Online' : 'Evento Ao Vivo'}
                        </span>
                      </div>
                    </div>

                    <div className="flex h-1/3 flex-col justify-between p-8 pb-10">
                      <div>
                        <h4 className="mb-2 line-clamp-1 text-2xl font-black tracking-tight text-[var(--secondary)] italic">
                          {item.title}
                        </h4>
                        <p className="line-clamp-2 text-sm font-medium text-[var(--text-muted)]">
                          {item.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-[var(--text-muted)]">
                          <div className="flex items-center gap-1.5">
                            <Users className="h-4 w-4" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">
                              {item._count?.enrollments || item._count?.registrations || 0}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-4 w-4" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">
                              Aberto
                            </span>
                          </div>
                        </div>

                        <Link
                          to={
                            item.itemType === 'course'
                              ? `/course/${item.slug || item.id}`
                              : `/register/${item.slug || item.linkId}`
                          }
                          className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--border-light)] bg-[var(--bg-main)] text-[var(--secondary)] transition-all hover:border-transparent hover:bg-[var(--primary)] hover:text-white group-hover:border-transparent group-hover:bg-[var(--primary)] group-hover:text-white"
                        >
                          <ArrowUpRight className="h-6 w-6" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section id="suporte" className="container mx-auto mt-12 px-6">
          <div className="rounded-[2.5rem] border border-[var(--border-light)] bg-white/80 p-8 shadow-xl shadow-slate-200/30 md:p-10">
            <div className="max-w-3xl">
              <h2 className="mb-3 text-xs font-black uppercase tracking-[0.3em] text-[var(--primary)]">
                Suporte
              </h2>
              <h3 className="mb-4 text-3xl font-black tracking-tighter text-[var(--secondary)] italic">
                Estrutura pronta para vender, atender e crescer.
              </h3>
              <p className="text-base leading-7 text-[var(--text-muted)] md:text-lg">
                Do plano mais simples ao atendimento com agentes, a plataforma foi pensada para
                acompanhar sua operacao desde a captacao ate a conversa com o cliente.
              </p>
            </div>
          </div>
        </section>
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
