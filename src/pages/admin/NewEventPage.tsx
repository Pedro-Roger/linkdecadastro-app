import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import MobileNavbar from '@/components/ui/MobileNavbar'
import NotificationBell from '@/components/notifications/NotificationBell'
import Footer from '@/components/ui/Footer'
import LoadingScreen from '@/components/ui/LoadingScreen'
import { apiFetch, getApiUrl } from '@/lib/api'
import { useAuth } from '@/lib/useAuth'

const eventSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().min(1, 'Descrição é obrigatória'),
  bannerUrl: z.string().optional().or(z.literal('')).transform((val) => {
    return val && val.trim() ? val.trim() : undefined
  }).refine(
    (val) => !val || val.startsWith('/') || val.startsWith('http://') || val.startsWith('https://'),
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
  const { user, loading: authLoading, isAuthenticated, signOut } = useAuth({
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

  const handleFileUpload = async (file: File) => {
    setUploading(true)
    setError(null)

    try {
      if (!file.type.startsWith('image/')) {
        throw new Error('Apenas imagens são permitidas (JPG, PNG, GIF)')
      }

      const maxSize = 5 * 1024 * 1024
      if (file.size > maxSize) {
        throw new Error(`Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(2)}MB). Máximo: 5MB`)
      }

      const formData = new FormData()
      formData.append('file', file)

      const uploadUrl = `${getApiUrl()}/admin/upload`
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('token')
          : null

      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || 'Erro ao fazer upload da imagem')
      }

      const data = await response.json()
      const imageUrl = data.url || data.path

      setValue('bannerUrl', imageUrl, { shouldValidate: true })
      setBannerPreview(imageUrl)
    } catch (err: any) {
      const errorMessage = err?.message || 'Erro ao fazer upload da imagem'
      setError(errorMessage)
    } finally {
      setUploading(false)
    }
  }

  const handleBannerUrlChange = (url: string) => {
    setValue('bannerUrl', url, { shouldValidate: true })
    setBannerPreview(url)
  }

  const onSubmit = async (data: EventFormData) => {
    setSubmitting(true)
    setError(null)

    try {
      const finalBannerUrl = (data.bannerUrl && data.bannerUrl.trim()) || (bannerPreview && bannerPreview.trim()) || undefined

      const payload: any = {
        title: data.title,
        description: data.description,
        bannerUrl: finalBannerUrl,
        status: data.status || 'ACTIVE',
        maxRegistrations: data.maxRegistrations && typeof data.maxRegistrations === 'number' ? data.maxRegistrations : null,
        slug: data.slug || undefined,
      }

      const event = await apiFetch<any>('/events', {
        method: 'POST',
        auth: true,
        body: JSON.stringify(payload),
      })

      navigate('/admin/events')
    } catch (err: any) {
      const errorMessage = err?.message || 'Erro ao criar evento'
      setError(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading) {
    return <LoadingScreen />
  }

  if (!isAuthenticated || user?.role !== 'ADMIN') {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <MobileNavbar user={user} onSignOut={signOut} />
      <NotificationBell />

      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 pb-24 md:pb-8">
          <div className="mb-6">
            <Link
              to="/admin/events"
              className="text-[#FF6600] hover:underline mb-4 inline-block"
            >
              ← Voltar para Eventos
            </Link>
            <h1 className="text-3xl font-bold text-[#003366] mb-2">
              Criar Novo Evento
            </h1>
            <p className="text-gray-600">
              Preencha os dados abaixo para criar um novo evento
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-lg shadow-md p-6 space-y-6">
            {/* Título */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Título *
              </label>
              <input
                type="text"
                {...register('title')}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900"
                placeholder="Ex: Workshop de Aquicultura"
              />
              {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>}
            </div>

            {/* Descrição */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descrição *
              </label>
              <textarea
                {...register('description')}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900"
                placeholder="Descreva o evento..."
              />
              {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>}
            </div>

            {/* URL Personalizada */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                URL Personalizada (opcional)
              </label>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">https://seudominio.com/register-event.html?event=</span>
                <input
                  type="text"
                  {...register('slug')}
                  placeholder="meu-evento-especial"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Use apenas letras minúsculas, números e hífens. Ex: meu-evento-especial
              </p>
              {errors.slug && <p className="text-red-500 text-sm mt-1">{errors.slug.message}</p>}
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status *
              </label>
              <select
                {...register('status')}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900"
              >
                <option value="ACTIVE">Ativo</option>
                <option value="INACTIVE">Inativo</option>
              </select>
              {errors.status && <p className="text-red-500 text-sm mt-1">{errors.status.message}</p>}
            </div>

            {/* Limite de Registros */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Limite de Registros (opcional)
              </label>
              <input
                type="number"
                min="0"
                {...register('maxRegistrations')}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900"
                placeholder="Ex: 100"
              />
              <p className="text-xs text-gray-500 mt-1">
                Deixe em branco para sem limite
              </p>
              {errors.maxRegistrations && <p className="text-red-500 text-sm mt-1">{errors.maxRegistrations.message}</p>}
            </div>

            {/* Banner */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Banner (URL ou Upload)
              </label>
              <div className="space-y-2">
                <input
                  type="url"
                  {...register('bannerUrl')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900"
                  placeholder="https://..."
                  onChange={(e) => handleBannerUrlChange(e.target.value)}
                />
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-sm">ou</span>
                  <label className="cursor-pointer">
                    <span className="inline-flex items-center px-4 py-2 bg-[#FF6600] text-white rounded-md hover:bg-[#e55a00] transition-colors">
                      {uploading ? 'Enviando...' : 'Fazer Upload'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleFileUpload(file)
                      }}
                      disabled={uploading}
                    />
                  </label>
                </div>
              </div>
              {errors.bannerUrl && <p className="text-red-500 text-sm mt-1">{errors.bannerUrl.message}</p>}
              
              {(bannerUrl || bannerPreview) && (
                <div className="mt-4">
                  <img
                    src={bannerUrl || bannerPreview || ''}
                    alt="Preview do banner"
                    className="max-w-full h-48 object-cover rounded-md border border-gray-300"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                </div>
              )}
            </div>

            {/* Botões */}
            <div className="flex justify-end gap-4 pt-4 border-t">
              <Link
                to="/admin/events"
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 bg-[#FF6600] text-white rounded-md hover:bg-[#e55a00] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Criando...' : 'Criar Evento'}
              </button>
            </div>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  )
}
