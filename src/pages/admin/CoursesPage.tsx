import { useEffect, useState, useCallback, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Search, Filter, BookOpen, Users, MoreHorizontal, ArrowRight, TrendingUp, Calendar, Download, Share2 } from 'lucide-react'
import LoadingScreen from '@/components/ui/LoadingScreen'
import { apiFetch, normalizeImageUrl } from '@/lib/api'
import { useAuth } from '@/lib/useAuth'
import AdminLayout from '@/components/layouts/AdminLayout'

export default function AdminCoursesPage() {
  const navigate = useNavigate()
  const { user, loading: authLoading, isAuthenticated } = useAuth({
    requireAuth: true,
    redirectTo: '/login'
  })

  const [courses, setCourses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilter, setActiveFilter] = useState<string>('all')

  const fetchCourses = useCallback(async () => {
    try {
      const data = await apiFetch<any[]>('/admin/courses', { auth: true })
      setCourses(data)
    } catch (error) {
      console.error('Erro ao buscar cursos:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated || (user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN')) {
        navigate('/my-courses')
      } else {
        fetchCourses()
      }
    }
  }, [authLoading, isAuthenticated, user, navigate, fetchCourses])

  // Definitiva contra preenchimento automático (auto-fill)
  useEffect(() => {
    const inputId = 'search_courses_no_fill';
    const clearInput = () => {
      const input = document.getElementById(inputId) as HTMLInputElement;
      if (input && searchTerm === '' && input.value !== '') {
        input.value = '';
      }
    };

    // Tentar limpar imediatamente e em intervalos nos primeiros 2 segundos
    clearInput();
    const interval = setInterval(clearInput, 200);
    const timeout = setTimeout(() => clearInterval(interval), 2000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [searchTerm]);

  const filteredCourses = useMemo(() => {
    let filtered = [...courses]

    if (activeFilter !== 'all') {
      filtered = filtered.filter((course) => {
        switch (activeFilter) {
          case 'active': return course.status === 'ACTIVE'
          case 'inactive': return course.status === 'INACTIVE'
          default: return true
        }
      })
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (course) =>
          course.title.toLowerCase().includes(term) ||
          course.description?.toLowerCase().includes(term)
      )
    }

    return filtered
  }, [courses, activeFilter, searchTerm])

  if (authLoading || loading) return <LoadingScreen />

  return (
    <AdminLayout>
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 mt-4">
        <div>
          <h1 className="text-3xl font-black text-[var(--secondary)] tracking-tight">
            Gestão de <span className="text-[var(--primary)]">Cursos</span>
          </h1>
          <p className="text-[var(--text-muted)] font-medium mt-1">
            Crie, edite e acompanhe o desempenho de seus conteúdos.
          </p>
        </div>
        <Link
          to="/admin/courses/new"
          className="flex items-center justify-center gap-2 px-6 py-3.5 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-bold rounded-2xl shadow-xl shadow-[var(--primary)]/20 transition-all active:scale-95 whitespace-nowrap"
        >
          <Plus size={20} />
          NOVO CURSO
        </Link>
      </div>

      {/* Stats Quick View */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-3xl p-6 border border-[var(--border-light)] shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-violet-100 text-violet-600 rounded-2xl flex items-center justify-center">
            <BookOpen size={24} />
          </div>
          <div>
            <div className="text-2xl font-black text-[var(--secondary)]">{courses.length}</div>
            <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Total de Cursos</div>
          </div>
        </div>
        <div className="bg-white rounded-3xl p-6 border border-[var(--border-light)] shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
            <Users size={24} />
          </div>
          <div>
            <div className="text-2xl font-black text-[var(--secondary)]">
              {courses.reduce((sum, c) => sum + (c._count?.enrollments || 0), 0)}
            </div>
            <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Alunos Ativos</div>
          </div>
        </div>
        <div className="bg-white rounded-3xl p-6 border border-[var(--border-light)] shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
            <TrendingUp size={24} />
          </div>
          <div>
            <div className="text-2xl font-black text-[var(--secondary)]">
              {courses.filter(c => c.status === 'ACTIVE').length}
            </div>
            <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Publicados</div>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-3xl border border-[var(--border-light)] p-6 mb-8 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex gap-2 p-1 bg-[var(--bg-main)] rounded-2xl w-full md:w-auto">
            {['all', 'active', 'inactive'].map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`flex-1 md:flex-none px-6 py-2 rounded-xl text-xs font-bold transition-all ${activeFilter === filter
                  ? 'bg-white text-[var(--primary)] shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--primary)]'
                  }`}
              >
                {filter === 'all' ? 'Todos' : filter === 'active' ? 'Ativos' : 'Inativos'}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
            <input
              type="text"
              placeholder="Pesquisar por nome ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoComplete="off"
              className="w-full pl-12 pr-4 py-3 bg-[var(--bg-main)] border-none rounded-2xl text-sm focus:ring-2 focus:ring-[var(--primary)]/20 transition-all font-medium"
            />
          </div>
        </div>
      </div>

      {/* Courses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {filteredCourses.map((course) => (
          <div
            key={course.id}
            className="bg-white rounded-[2.5rem] border border-[var(--border-light)] overflow-hidden shadow-sm hover:shadow-xl hover:shadow-[var(--primary)]/5 transition-all group flex flex-col"
          >
            {/* Course Card Header/Image */}
            <div className="relative h-48 sm:h-56 bg-slate-100 overflow-hidden">
              {course.bannerUrl ? (
                <img
                  src={normalizeImageUrl(course.bannerUrl)}
                  alt={course.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--primary)]/20 to-[var(--accent)]/20 text-[var(--primary)]">
                  <BookOpen size={48} />
                </div>
              )}
              {/* Badge Overlay */}
              <div className="absolute top-4 left-4">
                <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/20 backdrop-blur-md shadow-lg ${course.status === 'ACTIVE' ? 'bg-emerald-500/90 text-white' : 'bg-slate-500/90 text-white'
                  }`}>
                  {course.status === 'ACTIVE' ? 'Ativo' : 'Rascunho'}
                </span>
              </div>
            </div>

            {/* Course Card Body */}
            <div className="p-8 flex flex-1 flex-col">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-[var(--secondary)] line-clamp-1 group-hover:text-[var(--primary)] transition-colors">
                  {course.title}
                </h3>
                <button className="p-2 text-[var(--text-muted)] hover:bg-[var(--bg-main)] rounded-xl transition-colors">
                  <MoreHorizontal size={20} />
                </button>
              </div>

              <p className="text-sm text-[var(--text-muted)] line-clamp-2 leading-relaxed mb-6 flex-1">
                {course.description || 'Nenhuma descrição fornecida para este curso.'}
              </p>

              {/* Stats within card */}
              <div className="grid grid-cols-2 gap-4 py-4 border-y border-[var(--border-light)] mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-violet-50 text-[var(--primary)] rounded-xl flex items-center justify-center">
                    <Users size={18} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[var(--secondary)]">{course._count?.enrollments || 0}</div>
                    <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-tighter">Alunos</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center">
                    <Calendar size={18} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[var(--secondary)]">{course.lessons?.length || 0}</div>
                    <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-tighter">Aulas</div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => navigate(`/admin/courses/${course.id}/lessons`)}
                  className="py-3 px-4 bg-[var(--bg-main)] hover:bg-[var(--sidebar-active)] text-[var(--secondary)] text-xs font-bold rounded-2xl border border-[var(--border-light)] transition-all flex items-center justify-center gap-2 group/btn"
                >
                  CONTEÚDO <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={() => navigate(`/admin/courses/${course.id}/enrollments`)}
                  className="py-3 px-4 bg-white hover:bg-[var(--primary)] text-[var(--primary)] hover:text-white text-xs font-bold rounded-2xl border-2 border-[var(--primary)]/20 hover:border-[var(--primary)] transition-all shadow-sm"
                >
                  VER ALUNOS
                </button>
              </div>

              <div className="flex gap-2 mt-4">
                <button className="flex-1 py-1.5 flex items-center justify-center gap-1.5 text-[9px] font-black uppercase text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors">
                  <Download size={12} /> Excel
                </button>
                <div className="w-px h-3 bg-[var(--border-light)] self-center"></div>
                <button className="flex-1 py-1.5 flex items-center justify-center gap-1.5 text-[9px] font-black uppercase text-[var(--text-muted)] hover:text-indigo-500 transition-colors">
                  <Share2 size={12} /> Compartilhar
                </button>
              </div>
            </div>
          </div>
        ))}
        {filteredCourses.length === 0 && (
          <div className="col-span-full py-32 text-center bg-white rounded-[3rem] border-2 border-dashed border-[var(--border-light)]">
            <div className="w-20 h-20 bg-[var(--bg-main)] rounded-full flex items-center justify-center mx-auto mb-6">
              <BookOpen size={40} className="text-[var(--text-muted)]" />
            </div>
            <h3 className="text-xl font-bold text-[var(--secondary)] mb-2">Nenhum curso encontrado</h3>
            <p className="text-[var(--text-muted)] max-w-sm mx-auto">
              Não encontramos resultados para sua busca ou filtros atuais.
            </p>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
