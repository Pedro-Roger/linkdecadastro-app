import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft, Save, Globe, BookOpen, Video, MapPin,
  Plus, Trash2, Layout, Shield, Image as ImageIcon,
  CheckCircle, ChevronRight, Copy, XCircle
} from 'lucide-react'
import LoadingScreen from '@/components/ui/LoadingScreen'
import { apiFetch, getApiUrl, normalizeImageUrl } from '@/lib/api'
import { useAuth } from '@/lib/useAuth'
import AdminLayout from '@/components/layouts/AdminLayout'

const courseSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional(),
  bannerUrl: z.string().optional().or(z.literal('')).transform((val) => val && val.trim() ? val.trim() : undefined).refine(
    (val) => !val || val.startsWith('/') || val.startsWith('http://') || val.startsWith('https://'),
    { message: 'URL inválida' }
  ),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  type: z.enum(['PRESENCIAL', 'ONLINE']).default('ONLINE'),
  maxEnrollments: z.string().optional().transform((val) => {
    if (!val || !val.trim()) return null
    const parsed = parseInt(val, 10)
    return Number.isNaN(parsed) ? null : parsed
  }),
  waitlistEnabled: z.boolean().optional(),
  waitlistLimit: z.string().optional().transform((val) => {
    if (!val || !val.trim()) return 0
    const parsed = parseInt(val, 10)
    return Number.isNaN(parsed) ? 0 : parsed
  }),
  regionRestrictionEnabled: z.boolean().optional(),
  allowAllRegions: z.boolean().optional(),
  defaultRegionLimit: z.string().optional().transform((val) => {
    if (!val || !val.trim()) return null
    const parsed = parseInt(val, 10)
    return Number.isNaN(parsed) ? null : parsed
  }),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  slug: z.string().optional().transform((val) => {
    if (!val || typeof val !== 'string' || !val.trim()) return undefined;
    return val.trim().toLowerCase();
  }).refine(
    (val) => !val || /^[a-z0-9-]+$/.test(val),
    { message: 'URL personalizada deve conter apenas letras minúsculas, números e hífens' }
  ),
  firstLessonTitle: z.string().optional(),
  firstLessonVideoUrl: z.string().optional().or(z.literal('')).transform((val) => val && val.trim() ? val.trim() : undefined).refine(
    (val) => !val || val.startsWith('http://') || val.startsWith('https://'),
    { message: 'URL do YouTube inválida' }
  ),
  firstLessonDescription: z.string().optional(),
  firstLessonDuration: z.string().optional(),
})

type CourseFormData = z.infer<typeof courseSchema>

const BRAZIL_STATES = [
  { sigla: 'AC', nome: 'Acre' }, { sigla: 'AL', nome: 'Alagoas' }, { sigla: 'AP', nome: 'Amapá' },
  { sigla: 'AM', nome: 'Amazonas' }, { sigla: 'BA', nome: 'Bahia' }, { sigla: 'CE', nome: 'Ceará' },
  { sigla: 'DF', nome: 'Distrito Federal' }, { sigla: 'ES', nome: 'Espírito Santo' }, { sigla: 'GO', nome: 'Goiás' },
  { sigla: 'MA', nome: 'Maranhão' }, { sigla: 'MT', nome: 'Mato Grosso' }, { sigla: 'MS', nome: 'Mato Grosso do Sul' },
  { sigla: 'MG', nome: 'Minas Gerais' }, { sigla: 'PA', nome: 'Pará' }, { sigla: 'PB', nome: 'Paraíba' },
  { sigla: 'PR', nome: 'Paraná' }, { sigla: 'PE', nome: 'Pernambuco' }, { sigla: 'PI', nome: 'Piauí' },
  { sigla: 'RJ', nome: 'Rio de Janeiro' }, { sigla: 'RN', nome: 'Rio Grande do Norte' }, { sigla: 'RS', nome: 'Rio Grande do Sul' },
  { sigla: 'RO', nome: 'Rondônia' }, { sigla: 'RR', nome: 'Roraima' }, { sigla: 'SC', nome: 'Santa Catarina' },
  { sigla: 'SP', nome: 'São Paulo' }, { sigla: 'SE', nome: 'Sergipe' }, { sigla: 'TO', nome: 'Tocantins' }
]

export default function NewCoursePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const cloneCourseId = searchParams.get('clone')
  const { user, loading: authLoading, isAuthenticated } = useAuth({
    requireAuth: true,
    redirectTo: '/login',
  })

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [bannerPreview, setBannerPreview] = useState<string | null>(null)
  const [showFirstLesson, setShowFirstLesson] = useState(false)
  const [cloning, setCloning] = useState(false)
  const [clonedLessons, setClonedLessons] = useState<any[]>([])
  const [regionQuotas, setRegionQuotas] = useState<any[]>([])
  const [newRegionQuota, setNewRegionQuota] = useState({ state: '', city: '', limit: '', waitlistLimit: '' })

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<CourseFormData>({
    resolver: zodResolver(courseSchema),
    defaultValues: { status: 'ACTIVE', type: 'ONLINE', waitlistEnabled: false, waitlistLimit: 0, regionRestrictionEnabled: false, allowAllRegions: true }
  })

  const waitlistEnabled = watch('waitlistEnabled')
  const regionRestrictionEnabled = watch('regionRestrictionEnabled')
  const bannerUrl = watch('bannerUrl')

  useEffect(() => {
    if (!authLoading && isAuthenticated && cloneCourseId) {
      setCloning(true)
      apiFetch<any>(`/admin/courses/${cloneCourseId}`, { auth: true }).then(course => {
        setValue('title', `${course.title} (Cópia)`)
        if (course.description) setValue('description', course.description)
        if (course.bannerUrl) { setValue('bannerUrl', course.bannerUrl); setBannerPreview(course.bannerUrl); }
        setValue('status', course.status || 'ACTIVE')
        setValue('type', course.type || 'ONLINE')
        if (course.maxEnrollments) setValue('maxEnrollments', course.maxEnrollments.toString() as any)
        setValue('waitlistEnabled', course.waitlistEnabled || false)
        if (course.waitlistLimit) setValue('waitlistLimit', course.waitlistLimit.toString() as any)
        setValue('regionRestrictionEnabled', course.regionRestrictionEnabled || false)
        setValue('allowAllRegions', course.allowAllRegions ?? true)
        if (course.defaultRegionLimit) setValue('defaultRegionLimit', course.defaultRegionLimit.toString() as any)
        setRegionQuotas(course.regionQuotas || [])
        setClonedLessons(course.lessons || [])
      }).catch(err => setError('Erro ao clonar curso')).finally(() => setCloning(false))
    }
  }, [cloneCourseId, authLoading, isAuthenticated, setValue])

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

  const onSubmit = async (data: CourseFormData) => {
    setSubmitting(true)
    setError(null)
    try {
      const payload: any = {
        ...data,
        bannerUrl: data.bannerUrl || bannerPreview || undefined,
        regionQuotas: regionRestrictionEnabled ? regionQuotas : [],
        firstLesson: showFirstLesson ? {
          title: data.firstLessonTitle,
          videoUrl: data.firstLessonVideoUrl,
          description: data.firstLessonDescription,
          order: 0
        } : undefined
      }
      const course = await apiFetch<any>('/admin/courses', { method: 'POST', auth: true, body: JSON.stringify(payload) })

      if (clonedLessons.length > 0) {
        for (const lesson of clonedLessons.slice(1)) {
          await apiFetch(`/admin/courses/${course.id}/lessons`, {
            method: 'POST', auth: true, body: JSON.stringify({ ...lesson, id: undefined, courseId: undefined })
          })
        }
      }
      navigate(`/admin/courses/${course.id}/lessons`)
    } catch (err: any) { setError(err?.message || 'Erro ao salvar curso') } finally { setSubmitting(false) }
  }

  if (authLoading || cloning) return <LoadingScreen />

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto py-8 px-4">
        {/* Header Navigation */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/admin/courses')}
              className="p-3 bg-white hover:bg-[var(--bg-main)] text-[var(--text-muted)] rounded-2xl border border-[var(--border-light)] transition-all shadow-sm active:scale-90"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-3xl font-black text-[var(--secondary)] tracking-tight">
                {cloneCourseId ? 'Clonar' : 'Novo'} <span className="text-violet-600">Curso</span>
              </h1>
              <p className="text-[var(--text-muted)] font-medium text-sm mt-1">Configure sua jornada de aprendizado ou treinamento.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => navigate('/admin/courses')} className="px-6 py-3.5 bg-white text-[var(--text-muted)] font-bold rounded-2xl border border-[var(--border-light)] hover:bg-slate-50 transition-all text-[10px] uppercase">CANCELAR</button>
            <button
              onClick={handleSubmit(onSubmit)}
              disabled={submitting}
              className="px-8 py-3.5 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-2xl shadow-xl shadow-violet-600/20 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50 text-[10px] uppercase"
            >
              {submitting ? 'SALVANDO...' : <><Save size={18} /> PUBLICAR CURSO</>}
            </button>
          </div>
        </div>

        {error && <div className="mb-8 p-4 bg-red-50 border-l-4 border-red-500 rounded-xl text-red-700 text-sm font-bold flex items-center gap-3"><XCircle size={18} /> {error}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-8 space-y-8">

            {/* Details Section */}
            <section className="bg-white rounded-[2.5rem] border border-[var(--border-light)] p-8 shadow-sm">
              <h2 className="text-lg font-black text-[var(--secondary)] mb-8 flex items-center gap-3">
                <BookOpen size={20} className="text-violet-600" /> Detalhes do Curso
              </h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2 px-1">Título do Projeto</label>
                  <input {...register('title')} className="w-full bg-[var(--bg-main)]/50 border-2 border-transparent focus:border-violet-600/20 rounded-2xl px-6 py-4 text-sm font-bold text-[var(--secondary)] outline-none transition-all" placeholder="Ex: Masterclass de Marketing 2.0" />
                  {errors.title && <p className="text-red-500 text-[10px] font-bold mt-1.5 px-1">{errors.title.message}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2 px-1">Formato</label>
                    <select {...register('type')} className="w-full bg-[var(--bg-main)]/50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-[var(--secondary)] outline-none focus:ring-2 focus:ring-violet-600/20">
                      <option value="ONLINE">Digital / Online</option>
                      <option value="PRESENCIAL">Presencial / Local</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2 px-1">URL Personalizada</label>
                    <div className="flex items-center gap-2 bg-[var(--bg-main)]/50 rounded-2xl px-5 py-1 border-2 border-transparent focus-within:border-violet-600/20 transition-all">
                      <span className="text-[10px] font-black text-[var(--text-muted)]">/c/</span>
                      <input {...register('slug')} className="bg-transparent border-none flex-1 py-3 text-sm font-bold text-violet-600 outline-none" placeholder="meu-curso-top" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2 px-1">Descrição</label>
                  <textarea {...register('description')} rows={4} className="w-full bg-[var(--bg-main)]/50 border-2 border-transparent focus:border-violet-600/20 rounded-2xl px-6 py-4 text-sm font-medium text-[var(--secondary)] outline-none transition-all resize-none" placeholder="Conte mais sobre o que será ensinado..." />
                </div>
              </div>
            </section>

            {/* Appearance Section */}
            <section className="bg-white rounded-[2.5rem] border border-[var(--border-light)] p-8 shadow-sm">
              <h2 className="text-lg font-black text-[var(--secondary)] mb-8 flex items-center gap-3">
                <ImageIcon size={20} className="text-indigo-600" /> Identidade Visual
              </h2>

              <div className="relative group rounded-[2rem] border-2 border-dashed border-[var(--border-light)] hover:border-violet-600 transition-all aspect-video flex flex-col items-center justify-center bg-[var(--bg-main)]/30 overflow-hidden">
                {(bannerPreview || bannerUrl) ? (
                  <img src={bannerUrl || bannerPreview || ''} className="w-full h-full object-cover" alt="Banner" />
                ) : (
                  <>
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-violet-600 mb-4 shadow-sm border border-[var(--border-light)]"><ImageIcon size={32} /></div>
                    <p className="text-xs font-black text-[var(--secondary)] uppercase tracking-widest">Upload de Banner</p>
                  </>
                )}
                <input type="file" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" disabled={uploading} />
                {uploading && <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center text-violet-600 font-black text-xs animate-pulse">SUBINDO...</div>}
              </div>
            </section>

            {/* First Lesson Quick Add */}
            <section className="bg-indigo-50/50 rounded-[2.5rem] border border-indigo-100 p-8 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-lg font-black text-indigo-900 flex items-center gap-3">
                  <Video size={20} className="text-indigo-600" /> Primeira Aula (Opcional)
                </h2>
                <button type="button" onClick={() => setShowFirstLesson(!showFirstLesson)} className={`w-12 h-6 rounded-full transition-all relative ${showFirstLesson ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${showFirstLesson ? 'left-7' : 'left-1'}`}></div>
                </button>
              </div>

              {showFirstLesson && (
                <div className="space-y-6 animate-in slide-in-from-top-4 duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[9px] font-black text-indigo-900/40 uppercase tracking-widest mb-2">Título da Aula</label>
                      <input {...register('firstLessonTitle')} className="w-full bg-white border-2 border-transparent focus:border-indigo-600/20 rounded-xl px-5 py-3 text-xs font-bold text-indigo-900" placeholder="Aula 01 - Introdução" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-indigo-900/40 uppercase tracking-widest mb-2">URL do Vídeo (YouTube)</label>
                      <input {...register('firstLessonVideoUrl')} className="w-full bg-white border-2 border-transparent focus:border-indigo-600/20 rounded-xl px-5 py-3 text-xs font-bold text-indigo-900" placeholder="https://youtube..." />
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* Sidebar Config */}
          <div className="lg:col-span-4 space-y-8">

            {/* Limits & Rules */}
            <section className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/20 rounded-full blur-3xl -mr-16 -mt-16 group-hover:scale-125 transition-transform"></div>
              <h3 className="text-lg font-black mb-8 relative z-10 flex items-center gap-3">Configurações <Shield size={20} className="text-violet-400" /></h3>

              <div className="space-y-8 relative z-10">
                <div>
                  <label className="block text-[9px] font-black text-white/40 uppercase tracking-widest mb-3 px-1">Capacidade</label>
                  <input type="number" {...register('maxEnrollments')} className="w-full bg-white/10 border border-white/10 rounded-2xl px-5 py-4 text-xs font-bold text-white outline-none focus:border-violet-500/50 transition-all" placeholder="Ilimitado" />
                </div>

                <div className="p-6 bg-white/5 border border-white/10 rounded-[2rem] space-y-6">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Lista de Espera</span>
                    <button type="button" onClick={() => setValue('waitlistEnabled', !waitlistEnabled)} className={`w-10 h-5 rounded-full transition-all relative ${waitlistEnabled ? 'bg-violet-600' : 'bg-white/10'}`}>
                      <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${waitlistEnabled ? 'left-6' : 'left-1'}`}></div>
                    </button>
                  </div>
                  {waitlistEnabled && (
                    <input type="number" {...register('waitlistLimit')} className="w-full bg-slate-800 border-none rounded-xl px-4 py-3 text-xs font-bold text-white" placeholder="Qtde vagas extras" />
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Restrição Regional</span>
                    <button type="button" onClick={() => setValue('regionRestrictionEnabled', !regionRestrictionEnabled)} className={`w-10 h-5 rounded-full transition-all relative ${regionRestrictionEnabled ? 'bg-indigo-600' : 'bg-white/10'}`}>
                      <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${regionRestrictionEnabled ? 'left-6' : 'left-1'}`}></div>
                    </button>
                  </div>
                </div>

                {regionRestrictionEnabled && (
                  <div className="space-y-4 animate-in fade-in">
                    <div className="flex gap-2">
                      <select value={newRegionQuota.state} onChange={e => setNewRegionQuota({ ...newRegionQuota, state: e.target.value })} className="bg-white/10 border-none rounded-xl px-3 py-3 text-[10px] text-white flex-1 outline-none">
                        <option value="">UF</option>
                        {BRAZIL_STATES.map(s => <option key={s.sigla} value={s.sigla}>{s.sigla}</option>)}
                      </select>
                      <input value={newRegionQuota.limit} onChange={e => setNewRegionQuota({ ...newRegionQuota, limit: e.target.value })} className="bg-white/10 border-none rounded-xl px-3 py-3 text-[10px] text-white w-20 outline-none" placeholder="Vagas" />
                      <button type="button" onClick={() => { if (newRegionQuota.state && newRegionQuota.limit) { setRegionQuotas([...regionQuotas, newRegionQuota]); setNewRegionQuota({ state: '', city: '', limit: '', waitlistLimit: '' }); } }} className="p-3 bg-violet-600 rounded-xl text-white hover:bg-violet-500 transition-colors"><Plus size={16} /></button>
                    </div>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {regionQuotas.map((q, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                          <span className="text-[10px] font-bold text-white/80">{q.state} • {q.limit} vagas</span>
                          <button onClick={() => setRegionQuotas(regionQuotas.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-300"><Trash2 size={12} /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Summary Card */}
            <section className="bg-white rounded-[2.5rem] border border-[var(--border-light)] p-8 text-center shadow-sm">
              <div className="w-12 h-12 bg-violet-50 text-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-4"><CheckCircle size={28} /></div>
              <h4 className="text-sm font-black text-[var(--secondary)] mb-2 uppercase tracking-widest">Publicação Inteligente</h4>
              <p className="text-[10px] text-[var(--text-muted)] font-medium mb-8 leading-relaxed px-4">Ao publicar, seu curso será listado automaticamente no portal e seu link de captura estará ativo.</p>
              <button onClick={handleSubmit(onSubmit)} className="w-full py-4 bg-[var(--bg-main)] hover:bg-slate-100 text-[var(--secondary)] font-black text-[10px] uppercase rounded-2xl transition-all tracking-widest">SALVAR COMO RASCUNHO</button>
            </section>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
