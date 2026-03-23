import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Plus, Image as ImageIcon,
  Globe, Shield, Users, Save, X
} from 'lucide-react'
import LoadingScreen from '@/components/ui/LoadingScreen'
import { apiFetch, getApiUrl } from '@/lib/api'
import { useAuth } from '@/lib/useAuth'
import AdminLayout from '@/components/layouts/AdminLayout'

const eventSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().min(1, 'Descrição é obrigatória'),
  bannerUrl: z.string().optional().or(z.literal('')).transform((val) => {
    return val && val.trim() ? val.trim() : undefined
  }).refine(
    (val) => !val || val.startsWith('/') || val.startsWith('http://') || val.startsWith('https://') || val.startsWith('data:image/'),
    { message: 'URL inválida' }
  ),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  maxRegistrations: z.string().optional().transform((val) => {
    if (!val || !val.trim()) return null
    const parsed = parseInt(val, 10)
    return Number.isNaN(parsed) ? null : parsed
  }),
  slug: z.string().optional().transform((val) => {
    if (!val || typeof val !== 'string' || !val.trim()) return undefined;
    return val.trim().toLowerCase();
  }).refine(
    (val) => !val || /^[a-z0-9-]+$/.test(val),
    { message: 'URL personalizada deve conter apenas letras minúsculas, números e hífens' }
  ),
})

type EventFormData = z.infer<typeof eventSchema>

export default function NewEventPage() {
  const navigate = useNavigate()
  const { user, loading: authLoading, isAuthenticated } = useAuth({
    requireAuth: true,
    redirectTo: '/login',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [bannerPreview, setBannerPreview] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      status: 'ACTIVE',
    }
  })

  const bannerUrl = watch('bannerUrl')
  const slugValue = watch('slug')
  const publicUrl = slugValue?.trim()
    ? `${window.location.origin}/e/${slugValue.trim()}`
    : null

  const handleFileUpload = async (file: File) => {
    setUploading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const uploadUrl = `${getApiUrl()}/admin/upload`
      const token = localStorage.getItem('token')
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      if (!response.ok) throw new Error('Erro no upload')
      const data = await response.json()
      const imageUrl = data.url || data.path
      setValue('bannerUrl', imageUrl, { shouldValidate: true })
      setBannerPreview(imageUrl)
    } catch (err: any) {
      setError(err?.message || 'Erro ao fazer upload')
    } finally {
      setUploading(false)
    }
  }

  const onSubmit = async (data: EventFormData) => {
    setSubmitting(true)
    setError(null)
    try {
      const payload: any = {
        title: data.title,
        description: data.description,
        bannerUrl: data.bannerUrl || bannerPreview || undefined,
        status: data.status,
        maxRegistrations: data.maxRegistrations,
        slug: data.slug,
      }
      await apiFetch('/events', {
        method: 'POST',
        auth: true,
        body: JSON.stringify(payload),
      })
      navigate('/admin/events')
    } catch (err: any) {
      setError(err?.message || 'Erro ao criar evento')
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading) return <LoadingScreen />

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto py-8 px-4">
        {/* Header Navigation */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/admin/events')}
              className="p-3 bg-white hover:bg-[var(--bg-main)] text-[var(--text-muted)] rounded-2xl border border-[var(--border-light)] transition-all shadow-sm active:scale-90"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-3xl font-black text-[var(--secondary)] tracking-tight">
                Novo <span className="text-indigo-600">Evento</span>
              </h1>
              <p className="text-[var(--text-muted)] font-medium text-sm mt-1">Crie um link de cadastro personalizado para sua campanha.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/admin/events')}
              className="px-6 py-3.5 bg-white text-[var(--text-muted)] font-bold rounded-2xl border border-[var(--border-light)] hover:bg-slate-50 transition-all text-xs"
            >
              CANCELAR
            </button>
            <button
              onClick={handleSubmit(onSubmit)}
              disabled={submitting}
              className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-xl shadow-indigo-600/20 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50 text-xs"
            >
              {submitting ? 'CRIANDO...' : <><Save size={18} /> SALVAR LINK</>}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-50 border-l-4 border-red-500 rounded-xl text-red-700 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
            <X size={20} className="shrink-0" />
            <p className="text-sm font-bold">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Info Sidebar */}
          <div className="lg:col-span-2 space-y-8">
            <section className="bg-white rounded-[2.5rem] border border-[var(--border-light)] p-8 shadow-sm">
              <h2 className="text-lg font-black text-[var(--secondary)] mb-6 flex items-center gap-2">
                Informações Básicas <Globe size={20} className="text-indigo-600" />
              </h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2 px-1">Título do Evento</label>
                  <input
                    type="text"
                    {...register('title')}
                    className="w-full bg-[var(--bg-main)]/50 border-2 border-transparent focus:border-indigo-600/20 rounded-2xl px-5 py-4 text-sm font-bold text-[var(--secondary)] transition-all outline-none"
                    placeholder="Ex: Workshop de Liderança 2024"
                  />
                  {errors.title && <p className="text-red-500 text-[10px] font-bold mt-1.5 px-1">{errors.title.message}</p>}
                </div>

                <div>
                  <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2 px-1">Descrição / Detalhes</label>
                  <textarea
                    {...register('description')}
                    rows={5}
                    className="w-full bg-[var(--bg-main)]/50 border-2 border-transparent focus:border-indigo-600/20 rounded-2xl px-5 py-4 text-sm font-medium text-[var(--secondary)] transition-all outline-none resize-none"
                    placeholder="Descreva o que os participantes encontrarão neste evento..."
                  />
                  {errors.description && <p className="text-red-500 text-[10px] font-bold mt-1.5 px-1">{errors.description.message}</p>}
                </div>
              </div>
            </section>

            <section className="bg-white rounded-[2.5rem] border border-[var(--border-light)] p-8 shadow-sm">
              <h2 className="text-lg font-black text-[var(--secondary)] mb-6 flex items-center gap-2">
                Link Público <ImageIcon size={20} className="text-purple-600" />
              </h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2 px-1">URL Personalizada (Slug)</label>
                  <div className="flex items-center gap-3 bg-[var(--bg-main)]/50 rounded-2xl px-5 py-1 border-2 border-transparent focus-within:border-indigo-600/20 transition-all">
                    <span className="text-[var(--text-muted)] text-[10px] font-bold py-3">/e/</span>
                    <input
                      type="text"
                      {...register('slug')}
                      className="bg-transparent border-none flex-1 py-3 text-sm font-bold text-indigo-600 outline-none"
                      placeholder="lançamento-vip"
                    />
                  </div>
                  <p className="text-[9px] text-[var(--text-muted)] font-medium mt-2 px-1 uppercase tracking-tighter">Use hífens para separar palavras. Ex: workshop-gratis</p>
                  {publicUrl && (
                    <p className="text-[10px] text-indigo-600 font-bold mt-2 px-1 break-all">
                      {publicUrl}
                    </p>
                  )}
                  {errors.slug && <p className="text-red-500 text-[10px] font-bold mt-1.5 px-1">{errors.slug.message}</p>}
                </div>

                <div>
                  <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-3 px-1">Banner de Capa (Opcional)</label>
                  <div className="relative group cursor-pointer overflow-hidden rounded-[2rem] border-2 border-dashed border-[var(--border-light)] hover:border-indigo-600 transition-all aspect-video flex flex-col items-center justify-center bg-[var(--bg-main)]/30">
                    {(bannerPreview || bannerUrl) ? (
                      <img src={bannerUrl || bannerPreview || ''} className="w-full h-full object-cover" alt="Banner preview" />
                    ) : (
                      <>
                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-indigo-600 mb-4 shadow-sm border border-[var(--border-light)]">
                          <ImageIcon size={32} />
                        </div>
                        <p className="text-xs font-bold text-[var(--secondary)] mb-1">Upload de Banner</p>
                        <p className="text-[10px] text-[var(--text-muted)] font-medium">Recomendado: 1200x630px</p>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                      disabled={uploading}
                    />
                  </div>
                  <div className="mt-4">
                    <input
                      type="text"
                      {...register('bannerUrl')}
                      className="w-full bg-[var(--bg-main)]/50 border-2 border-transparent focus:border-indigo-600/20 rounded-2xl px-5 py-3 text-[11px] font-medium text-[var(--text-muted)] transition-all outline-none"
                      placeholder="Ou cole a URL da imagem aqui..."
                    />
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Right Column Config */}
          <div className="space-y-8">
            <section className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/20 rounded-full blur-3xl -mr-16 -mt-16 transition-transform group-hover:scale-125"></div>
              <h3 className="text-lg font-black mb-6 relative z-10 flex items-center gap-2">Configurações <Shield size={18} className="text-indigo-400" /></h3>

              <div className="space-y-6 relative z-10">
                <div>
                  <label className="block text-[9px] font-black text-white/50 uppercase tracking-widest mb-2 px-1">Status Inicial</label>
                  <div className="p-1 bg-white/10 rounded-2xl flex gap-1">
                    <button
                      type="button"
                      onClick={() => setValue('status', 'ACTIVE')}
                      className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${watch('status') === 'ACTIVE' ? 'bg-indigo-600 text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
                    >
                      ATIVO
                    </button>
                    <button
                      type="button"
                      onClick={() => setValue('status', 'INACTIVE')}
                      className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${watch('status') === 'INACTIVE' ? 'bg-slate-700 text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
                    >
                      RASCUNHO
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-black text-white/50 uppercase tracking-widest mb-2 px-1 flex items-center justify-between">
                    <span>Limite de Vagas</span>
                    <span className="text-indigo-400 text-[8px]">Opcional</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      {...register('maxRegistrations')}
                      className="w-full bg-white/10 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold text-white outline-none focus:border-indigo-500/50 transition-all pr-12"
                      placeholder="Ex: 100"
                    />
                    <Users size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30" />
                  </div>
                </div>

                <div className="bg-indigo-600/10 border border-indigo-500/20 p-6 rounded-[2rem]">
                  <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Dica Pro</h4>
                  <p className="text-[11px] text-indigo-100/70 font-medium leading-relaxed italic">
                    "Use uma URL chamativa. Links personalizados têm 3x mais taxa de clique que links genéricos."
                  </p>
                </div>
              </div>
            </section>

            <div className="bg-white rounded-[2.5rem] border border-[var(--border-light)] p-8 text-center shadow-sm">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Shield size={24} />
              </div>
              <h4 className="text-sm font-black text-[var(--secondary)] mb-2">Pronto para Lançar?</h4>
              <p className="text-[10px] text-[var(--text-muted)] font-medium mb-6">Ao salvar, o link estará disponível imediatamente para compartilhamento.</p>
              <button
                onClick={handleSubmit(onSubmit)}
                className="w-full py-4 bg-[var(--bg-main)] hover:bg-slate-100 text-[var(--secondary)] font-black text-[10px] uppercase rounded-2xl transition-all"
              >
                SALVAR COMO RASCUNHO
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
