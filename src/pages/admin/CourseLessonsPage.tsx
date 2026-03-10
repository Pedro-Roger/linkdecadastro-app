import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  ArrowLeft, Plus, Video, Trash2, Edit, Save,
  ChevronRight, GripVertical, PlayCircle, Clock,
  Layout, Shield, BookOpen, Globe, CheckCircle,
  MoreVertical, Image as ImageIcon, XCircle
} from 'lucide-react'
import LoadingScreen from '@/components/ui/LoadingScreen'
import { apiFetch, getApiUrl, normalizeImageUrl } from '@/lib/api'
import { useAuth } from '@/lib/useAuth'
import AdminLayout from '@/components/layouts/AdminLayout'

const lessonSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional(),
  videoUrl: z.string().url('URL do YouTube inválida'),
  bannerUrl: z.string().optional().or(z.literal('')).transform(val => val && val.trim() ? val.trim() : undefined),
  duration: z.string().optional(),
  order: z.number().int().min(0),
})

type LessonFormData = z.infer<typeof lessonSchema>

export default function CourseLessonsPage() {
  const params = useParams()
  const navigate = useNavigate()
  const { user, loading: authLoading, isAuthenticated } = useAuth({
    requireAuth: true,
    redirectTo: '/login',
  })
  const courseId = params.courseId as string

  const [course, setCourse] = useState<any>(null)
  const [lessons, setLessons] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [bannerPreview, setBannerPreview] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<LessonFormData>({
    resolver: zodResolver(lessonSchema),
    defaultValues: { order: 0 }
  })

  const videoUrl = watch('videoUrl')
  const bannerUrl = watch('bannerUrl')

  const fetchCourse = useCallback(async () => {
    try {
      const data = await apiFetch<any>(`/admin/courses/${courseId}`, { auth: true })
      setCourse(data)
    } catch (err) { }
  }, [courseId])

  const fetchLessons = useCallback(async () => {
    try {
      const data = await apiFetch<any[]>(`/admin/courses/${courseId}/lessons`, { auth: true })
      setLessons(data.sort((a, b) => a.order - b.order))
      if (!editingLessonId) reset({ order: data.length })
    } catch (err) { }
  }, [courseId, reset, editingLessonId])

  useEffect(() => {
    if (!authLoading && isAuthenticated && courseId) {
      fetchCourse()
      fetchLessons()
    }
  }, [authLoading, isAuthenticated, courseId, fetchCourse, fetchLessons])

  const handleFileUpload = async (file: File) => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await apiFetch<any>('/admin/upload', { method: 'POST', body: formData, auth: true })
      setValue('bannerUrl', res.url)
      setBannerPreview(res.url)
    } catch (err) { setError('Erro no upload') } finally { setUploading(false) }
  }

  const onSubmit = async (data: LessonFormData) => {
    setSubmitting(true)
    setError(null)
    try {
      if (editingLessonId) {
        await apiFetch(`/admin/courses/${courseId}/lessons/${editingLessonId}`, {
          method: 'PUT', auth: true, body: JSON.stringify(data)
        })
      } else {
        await apiFetch(`/admin/courses/${courseId}/lessons`, {
          method: 'POST', auth: true, body: JSON.stringify(data)
        })
      }
      reset(); setShowForm(false); setEditingLessonId(null); setBannerPreview(null);
      fetchLessons();
    } catch (err: any) { setError(err.message || 'Erro ao salvar aula') } finally { setSubmitting(false) }
  }

  const handleEdit = (lesson: any) => {
    setValue('title', lesson.title)
    setValue('description', lesson.description || '')
    setValue('videoUrl', lesson.videoUrl)
    setValue('bannerUrl', lesson.bannerUrl || '')
    setValue('order', lesson.order)
    setValue('duration', lesson.duration || '')
    setEditingLessonId(lesson.id)
    setBannerPreview(lesson.bannerUrl || null)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta aula permanentemente?')) return
    try {
      await apiFetch(`/admin/courses/${courseId}/lessons/${id}`, { method: 'DELETE', auth: true })
      fetchLessons()
    } catch (err) { setError('Erro ao excluir') }
  }

  if (authLoading || !course) return <LoadingScreen />

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto py-8 px-4">
        {/* Header Breadcrumb */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/admin/courses')}
              className="p-3 bg-white hover:bg-[var(--bg-main)] text-[var(--text-muted)] rounded-2xl border border-[var(--border-light)] transition-all shadow-sm active:scale-90"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <div className="flex items-center gap-2 text-[10px] font-black text-violet-600 uppercase tracking-widest mb-1">
                <BookOpen size={12} /> Cursos <ChevronRight size={10} /> Conteúdo
              </div>
              <h1 className="text-3xl font-black text-[var(--secondary)] tracking-tight">
                Gestão de <span className="text-violet-600">Aulas</span>
              </h1>
              <p className="text-[var(--text-muted)] font-medium text-sm mt-1">{course.title}</p>
            </div>
          </div>
          <button
            onClick={() => { setShowForm(!showForm); if (showForm) { reset(); setEditingLessonId(null); } }}
            className={`px-8 py-3.5 font-bold rounded-2xl shadow-xl transition-all flex items-center gap-2 active:scale-95 text-[10px] uppercase ${showForm ? 'bg-white text-[var(--secondary)] border border-[var(--border-light)]' : 'bg-violet-600 text-white shadow-violet-600/20'
              }`}
          >
            {showForm ? <><XCircle size={18} /> CANCELAR</> : <><Plus size={18} /> NOVA AULA</>}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Form Section (Conditional) */}
          {showForm && (
            <div className="lg:col-span-12 animate-in slide-in-from-top-6 duration-500 mb-10">
              <section className="bg-white rounded-[2.5rem] border-2 border-violet-600/10 p-10 shadow-xl shadow-violet-600/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
                <h2 className="text-2xl font-black text-[var(--secondary)] mb-8 flex items-center gap-3 relative z-10">
                  {editingLessonId ? <Edit size={24} className="text-violet-600" /> : <Plus size={24} className="text-violet-600" />}
                  {editingLessonId ? 'Editar Aula' : 'Configurar Nova Aula'}
                </h2>

                <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2 px-1">Título da Aula</label>
                      <input {...register('title')} className="w-full bg-[var(--bg-main)]/50 border-2 border-transparent focus:border-violet-600/20 rounded-2xl px-6 py-4 text-sm font-bold text-[var(--secondary)] outline-none transition-all" placeholder="Ex: Introdução ao Módulo 01" />
                      {errors.title && <p className="text-red-500 text-[10px] font-bold mt-1.5 px-1">{errors.title.message}</p>}
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2 px-1">URL do Vídeo (YouTube)</label>
                      <div className="flex items-center gap-3 bg-[var(--bg-main)]/50 rounded-2xl px-5 py-1 border-2 border-transparent focus-within:border-violet-600/20">
                        <PlayCircle size={18} className="text-red-500 ml-1" />
                        <input {...register('videoUrl')} className="bg-transparent border-none flex-1 py-4 text-sm font-medium text-[var(--secondary)] outline-none" placeholder="https://www.youtube.com/watch?v=..." />
                      </div>
                      {errors.videoUrl && <p className="text-red-500 text-[10px] font-bold mt-1.5 px-1">{errors.videoUrl.message}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2 px-1">Ordem</label>
                        <input type="number" {...register('order')} className="w-full bg-[var(--bg-main)]/50 border-none rounded-xl px-5 py-3 text-xs font-bold text-[var(--secondary)]" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2 px-1">Duração</label>
                        <input {...register('duration')} className="w-full bg-[var(--bg-main)]/50 border-none rounded-xl px-5 py-3 text-xs font-bold text-[var(--secondary)]" placeholder="15:00" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2 px-1">Descrição Curta</label>
                      <textarea {...register('description')} rows={3} className="w-full bg-[var(--bg-main)]/50 border-none rounded-2xl px-5 py-4 text-xs font-medium text-[var(--secondary)] resize-none" placeholder="O que o aluno aprenderá nesta aula?" />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2 px-1">Banner de Capa</label>
                    <div className="relative aspect-video bg-[var(--bg-main)] rounded-[2rem] border-2 border-dashed border-[var(--border-light)] hover:border-violet-600 transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center">
                      {(bannerPreview || bannerUrl) ? (
                        <img src={bannerUrl || bannerPreview || ''} className="w-full h-full object-cover" alt="Preview" />
                      ) : (
                        <>
                          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-violet-600 mb-4 shadow-sm border border-[var(--border-light)]"><ImageIcon size={32} /></div>
                          <p className="text-xs font-black text-[var(--secondary)] uppercase tracking-widest">Upload Capa</p>
                        </>
                      )}
                      <input type="file" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" disabled={uploading} />
                      {uploading && <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center z-10 text-violet-600 font-black text-xs">SUBINDO...</div>}
                    </div>
                    <div className="p-6 bg-violet-50/50 rounded-3xl border border-violet-100 italic text-[11px] text-violet-700/70 font-medium leading-relaxed">
                      "Aulas com boas capas e títulos descritivos aumentam a taxa de conclusão dos alunos em até 60%."
                    </div>
                    <div className="pt-4 flex justify-end">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full py-5 bg-violet-600 hover:bg-violet-700 text-white font-black rounded-2xl shadow-xl shadow-violet-600/20 transition-all flex items-center justify-center gap-3 active:scale-[0.98] text-[11px] uppercase tracking-widest"
                      >
                        <Save size={20} /> {editingLessonId ? 'ATUALIZAR AULA' : 'SALVAR E PUBLICAR'}
                      </button>
                    </div>
                  </div>
                </form>
              </section>
            </div>
          )}

          {/* Lessons List */}
          <div className="lg:col-span-12 space-y-4">
            <div className="flex items-center justify-between px-4 mb-2">
              <h3 className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2">
                Grade de Aulas <span className="w-5 h-5 bg-violet-100 text-violet-600 rounded-full flex items-center justify-center text-[9px]">{lessons.length}</span>
              </h3>
              <div className="text-[10px] text-[var(--text-muted)] font-medium italic">* Arraste para reordenar (em breve)</div>
            </div>

            {lessons.length === 0 ? (
              <div className="bg-white rounded-[2.5rem] border border-[var(--border-light)] p-20 text-center">
                <div className="w-20 h-20 bg-[var(--bg-main)] rounded-[2rem] flex items-center justify-center text-[var(--text-muted)] mx-auto mb-6 opacity-40">
                  <Video size={40} />
                </div>
                <h4 className="text-xl font-black text-[var(--secondary)] mb-2">Nenhuma aula cadastrada</h4>
                <p className="text-sm text-[var(--text-muted)] font-medium mb-8">Comece adicionando a primeira aula do seu curso.</p>
                <button onClick={() => setShowForm(true)} className="px-8 py-3.5 bg-violet-100 text-violet-600 font-black rounded-2xl hover:bg-violet-200 transition-all text-xs">CRIAR PRIMEIRA AULA</button>
              </div>
            ) : (
              <div className="space-y-4">
                {lessons.map((lesson, index) => (
                  <div key={lesson.id} className="group bg-white rounded-[2.2rem] border border-[var(--border-light)] hover:border-violet-300 hover:shadow-xl hover:shadow-violet-600/5 transition-all p-5 flex items-center gap-6">
                    <div className="shrink-0 flex items-center gap-4">
                      <div className="w-6 text-[var(--text-muted)] group-hover:text-violet-400 transition-colors cursor-grab active:cursor-grabbing"><GripVertical size={20} /></div>
                      <div className="relative w-32 md:w-44 aspect-video rounded-2xl overflow-hidden bg-slate-100 shadow-sm">
                        {lesson.bannerUrl ? (
                          <img src={lesson.bannerUrl} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon size={24} /></div>
                        )}
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <PlayCircle size={32} className="text-white" />
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[9px] font-black text-violet-600/50 uppercase tracking-widest">{String(index + 1).padStart(2, '0')}</span>
                        <div className="h-0.5 w-4 bg-violet-100"></div>
                        {lesson.duration && (
                          <div className="flex items-center gap-1 text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-tighter bg-[var(--bg-main)] px-2 py-0.5 rounded-full">
                            <Clock size={10} /> {lesson.duration}
                          </div>
                        )}
                      </div>
                      <h4 className="text-base font-black text-[var(--secondary)] truncate group-hover:text-violet-600 transition-colors">{lesson.title}</h4>
                      <p className="text-xs text-[var(--text-muted)] font-medium truncate mt-1">{lesson.description || 'Sem descrição definida.'}</p>
                    </div>

                    <div className="shrink-0 flex items-center gap-3 md:opacity-0 group-hover:opacity-100 transition-all pr-2">
                      <button onClick={() => handleEdit(lesson)} className="p-3 bg-violet-50 text-violet-600 rounded-2xl hover:bg-violet-600 hover:text-white transition-all shadow-sm"><Edit size={18} /></button>
                      <button onClick={() => handleDelete(lesson.id)} className="p-3 bg-red-50 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-sm"><Trash2 size={18} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
