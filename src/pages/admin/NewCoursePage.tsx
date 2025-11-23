import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import NotificationBell from '@/components/notifications/NotificationBell'
import Footer from '@/components/ui/Footer'
import LoadingScreen from '@/components/ui/LoadingScreen'
import { apiFetch, getApiUrl, normalizeImageUrl } from '@/lib/api'
import { useAuth } from '@/lib/useAuth'

const courseSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional(),
  bannerUrl: z.string().optional().or(z.literal('')).transform((val) => {

    return val && val.trim() ? val.trim() : undefined
  }).refine(
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
    // Transformar string vazia em undefined
    if (!val || typeof val !== 'string' || !val.trim()) return undefined;
    return val.trim().toLowerCase();
  }).refine(
    (val) => !val || /^[a-z0-9-]+$/.test(val),
    { message: 'URL personalizada deve conter apenas letras minúsculas, números e hífens' }
  ),

  firstLessonTitle: z.string().optional(),
  firstLessonVideoUrl: z.string().optional().or(z.literal('')).refine(
    (val) => !val || val.trim() === '' || val.startsWith('http://') || val.startsWith('https://'),
    { message: 'URL do YouTube inválida' }
  ),
  firstLessonDescription: z.string().optional(),
})

type CourseFormData = z.infer<typeof courseSchema>

const BRAZIL_STATES = [
  { sigla: 'AC', nome: 'Acre' },
  { sigla: 'AL', nome: 'Alagoas' },
  { sigla: 'AP', nome: 'Amapá' },
  { sigla: 'AM', nome: 'Amazonas' },
  { sigla: 'BA', nome: 'Bahia' },
  { sigla: 'CE', nome: 'Ceará' },
  { sigla: 'DF', nome: 'Distrito Federal' },
  { sigla: 'ES', nome: 'Espírito Santo' },
  { sigla: 'GO', nome: 'Goiás' },
  { sigla: 'MA', nome: 'Maranhão' },
  { sigla: 'MT', nome: 'Mato Grosso' },
  { sigla: 'MS', nome: 'Mato Grosso do Sul' },
  { sigla: 'MG', nome: 'Minas Gerais' },
  { sigla: 'PA', nome: 'Pará' },
  { sigla: 'PB', nome: 'Paraíba' },
  { sigla: 'PR', nome: 'Paraná' },
  { sigla: 'PE', nome: 'Pernambuco' },
  { sigla: 'PI', nome: 'Piauí' },
  { sigla: 'RJ', nome: 'Rio de Janeiro' },
  { sigla: 'RN', nome: 'Rio Grande do Norte' },
  { sigla: 'RS', nome: 'Rio Grande do Sul' },
  { sigla: 'RO', nome: 'Rondônia' },
  { sigla: 'RR', nome: 'Roraima' },
  { sigla: 'SC', nome: 'Santa Catarina' },
  { sigla: 'SP', nome: 'São Paulo' },
  { sigla: 'SE', nome: 'Sergipe' },
  { sigla: 'TO', nome: 'Tocantins' }
]

export default function NewCoursePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const cloneCourseId = searchParams.get('clone')
  const { user, loading: authLoading, isAuthenticated, signOut } = useAuth({
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
  const [regionQuotas, setRegionQuotas] = useState<
    Array<{
      state: string
      city: string
      limit: number
      waitlistLimit: number
    }>
  >([])
  const [newRegionQuota, setNewRegionQuota] = useState<{
    state: string
    city: string
    limit: string
    waitlistLimit: string
  }>({
    state: '',
    city: '',
    limit: '',
    waitlistLimit: ''
  })
  const [regionQuotaError, setRegionQuotaError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<CourseFormData>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      status: 'ACTIVE',
      type: 'ONLINE',
      waitlistEnabled: false,
      waitlistLimit: 0,
      regionRestrictionEnabled: false,
      allowAllRegions: true
    }
  })

  const bannerUrl = watch('bannerUrl')
  const firstLessonVideoUrl = watch('firstLessonVideoUrl')
  const waitlistEnabled = watch('waitlistEnabled')
  const regionRestrictionEnabled = watch('regionRestrictionEnabled')
  const allowAllRegions = watch('allowAllRegions')

  const handleAddRegionQuota = () => {
    if (!newRegionQuota.state || !newRegionQuota.limit.trim()) {
      setRegionQuotaError('Selecione o estado e informe o limite de vagas.')
      return
    }

    const limitValue = parseInt(newRegionQuota.limit, 10)
    if (Number.isNaN(limitValue) || limitValue <= 0) {
      setRegionQuotaError('Informe um limite de vagas válido (maior que zero).')
      return
    }

    const waitlistValue = newRegionQuota.waitlistLimit
      ? parseInt(newRegionQuota.waitlistLimit, 10)
      : 0

    setRegionQuotas((prev) => [
      ...prev,
      {
        state: newRegionQuota.state,
        city: newRegionQuota.city.trim(),
        limit: limitValue,
        waitlistLimit:
          Number.isNaN(waitlistValue) || waitlistValue < 0 ? 0 : waitlistValue
      }
    ])

    setNewRegionQuota({
      state: '',
      city: '',
      limit: '',
      waitlistLimit: ''
    })
    setRegionQuotaError(null)
  }

  const handleRemoveRegionQuota = (index: number) => {
    setRegionQuotas((prev) => prev.filter((_, quotaIndex) => quotaIndex !== index))
  }


  const extractYouTubeThumbnail = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match && match[1]) {
        const videoId = match[1]

        return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
      }
    }

    return null
  }


  useEffect(() => {
    if (firstLessonVideoUrl && firstLessonVideoUrl.trim() && showFirstLesson) {
      const thumbnail = extractYouTubeThumbnail(firstLessonVideoUrl)
      if (thumbnail && (!bannerUrl || bannerUrl === '' || bannerUrl === bannerPreview)) {
        setValue('bannerUrl', thumbnail, { shouldValidate: false })
        setBannerPreview(thumbnail)
      }
    }
  }, [firstLessonVideoUrl, showFirstLesson, setValue])

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
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      })


      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }))
        throw new Error(errorData.error || `Erro ao fazer upload (${response.status})`)
      }

      const data = await response.json()

      if (!data.url) {
        throw new Error('URL não retornada pelo servidor')
      }

      setValue('bannerUrl', data.url, { shouldValidate: true })
      setBannerPreview(data.url)
      

      setError(null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao fazer upload'
      setError(errorMessage)
    } finally {
      setUploading(false)
    }
  }

  const cloneCourse = async (courseId: string) => {
    setCloning(true)
    setError(null)
    try {
      const course = await apiFetch<any>(`/admin/courses/${courseId}`, {
        auth: true,
      })

      if (!course) {
        throw new Error('Curso não encontrado')
      }

      // Preencher formulário com dados do curso clonado
      setValue('title', `${course.title} (Cópia)`)
      if (course.description) setValue('description', course.description)
      if (course.bannerUrl) {
        setValue('bannerUrl', course.bannerUrl)
        setBannerPreview(course.bannerUrl)
      }
      setValue('status', course.status || 'ACTIVE')
      setValue('type', course.type || 'ONLINE')
      if (course.maxEnrollments) setValue('maxEnrollments', String(course.maxEnrollments))
      setValue('waitlistEnabled', course.waitlistEnabled || false)
      if (course.waitlistLimit) setValue('waitlistLimit', String(course.waitlistLimit))
      setValue('regionRestrictionEnabled', course.regionRestrictionEnabled || false)
      setValue('allowAllRegions', course.allowAllRegions ?? true)
      if (course.defaultRegionLimit) setValue('defaultRegionLimit', String(course.defaultRegionLimit))
      // Não clonar datas e slug (deixa vazio para o usuário definir)
      setValue('slug', '') // Garantir que o slug seja limpo ao clonar
      
      // Preencher quotas regionais
      if (course.regionQuotas && course.regionQuotas.length > 0) {
        const quotas = course.regionQuotas.map((q: any) => ({
          state: q.state,
          city: q.city || '',
          limit: q.limit,
          waitlistLimit: q.waitlistLimit || 0,
        }))
        setRegionQuotas(quotas)
      }

      // Guardar aulas para clonagem após criação
      if (course.lessons && course.lessons.length > 0) {
        // Armazena todas as aulas menos a primeira (que será criada junto com o curso)
        setClonedLessons(course.lessons.slice(1))
      } else {
        setClonedLessons([])
      }

      // Se houver primeira aula, preencher campos
      if (course.lessons && course.lessons.length > 0 && course.lessons[0]) {
        const firstLesson = course.lessons[0]
        setShowFirstLesson(true)
        if (firstLesson.title) setValue('firstLessonTitle', firstLesson.title)
        if (firstLesson.description) setValue('firstLessonDescription', firstLesson.description)
        if (firstLesson.videoUrl) setValue('firstLessonVideoUrl', firstLesson.videoUrl)
        if (firstLesson.bannerUrl) setValue('bannerUrl', firstLesson.bannerUrl)
        if (firstLesson.duration) setValue('firstLessonDuration', firstLesson.duration)
      } else {
        setShowFirstLesson(false)
      }
    } catch (error: any) {
      console.error('Erro ao clonar curso:', error)
      const errorMessage = error?.message || 'Erro ao carregar curso para clonagem. Verifique se você tem permissão.'
      setError(errorMessage)
      alert(errorMessage)
    } finally {
      setCloning(false)
    }
  }

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated || user?.role !== 'ADMIN') {
        navigate('/my-courses')
        return
      }
      if (cloneCourseId) {
        cloneCourse(cloneCourseId)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated, user, navigate, cloneCourseId])

  const onSubmit = async (data: CourseFormData) => {
    setSubmitting(true)
    setError(null)

    try {
      if (data.regionRestrictionEnabled && regionQuotas.length === 0) {
        setError('Adicione pelo menos uma região com limite de vagas ou desative a restrição regional.')
        setSubmitting(false)
        return
      }



      const finalBannerUrl = (data.bannerUrl && data.bannerUrl.trim()) || (bannerPreview && bannerPreview.trim()) || undefined
      
      

      const payload: any = {
        title: data.title,
        description: data.description || undefined,
        bannerUrl: finalBannerUrl,
        status: data.status || 'ACTIVE',
        type: data.type || 'ONLINE',
        maxEnrollments: data.maxEnrollments && typeof data.maxEnrollments === 'number' ? data.maxEnrollments : null,
        waitlistEnabled: data.waitlistEnabled ?? false,
        waitlistLimit:
          typeof data.waitlistLimit === 'number' && data.waitlistLimit >= 0
            ? data.waitlistLimit
            : 0,
        regionRestrictionEnabled: data.regionRestrictionEnabled ?? false,
        allowAllRegions:
          data.regionRestrictionEnabled ?? false
            ? data.allowAllRegions ?? true
            : true,
        defaultRegionLimit:
          typeof data.defaultRegionLimit === 'number' && data.defaultRegionLimit > 0
            ? data.defaultRegionLimit
            : null,
        startDate: data.startDate && data.startDate.trim() ? data.startDate : undefined,
        endDate: data.endDate && data.endDate.trim() ? data.endDate : undefined,
        slug: data.slug || undefined, // Já vem transformado do schema

        firstLesson: (data.firstLessonTitle && data.firstLessonTitle.trim() && 
                     data.firstLessonVideoUrl && data.firstLessonVideoUrl.trim()) ? {
          title: data.firstLessonTitle.trim(),
          videoUrl: data.firstLessonVideoUrl.trim(),
          description: data.firstLessonDescription?.trim() || undefined,
          order: 0
        } : undefined,
        regionQuotas:
          data.regionRestrictionEnabled
            ? regionQuotas.map((quota) => ({
                state: quota.state,
                city: quota.city || null,
                limit: quota.limit,
                waitlistLimit: quota.waitlistLimit ?? 0
              }))
            : []
      }


      const course = await apiFetch<any>('/admin/courses', {
        method: 'POST',
        auth: true,
        body: JSON.stringify(payload),
      })

      // Se há aulas clonadas (além da primeira que já foi criada com o curso), criar elas também
      if (clonedLessons.length > 0) {
        try {
          // clonedLessons já contém apenas as aulas após a primeira (feito no cloneCourse)
          for (const lesson of clonedLessons) {
            await apiFetch(`/admin/courses/${course.id}/lessons`, {
              method: 'POST',
              auth: true,
              body: JSON.stringify({
                title: lesson.title,
                description: lesson.description || undefined,
                videoUrl: lesson.videoUrl || undefined,
                bannerUrl: lesson.bannerUrl || undefined,
                duration: lesson.duration || undefined,
                order: lesson.order,
              }),
            })
          }
        } catch (error) {
          console.error('Erro ao clonar aulas:', error)
          // Não bloquear navegação se houver erro ao clonar aulas
        }
      }

      navigate(`/admin/courses/${course.id}/lessons`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao criar curso'
      setError(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading || cloning) {
    return <LoadingScreen />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-2">
          <div className="flex flex-col md:flex-row items-center justify-between space-y-2 md:space-y-0">
            <Link to="/" className="flex items-center">
              <img
                src="/logo B.png"
                alt="Link de Cadastro"
                className="h-20 md:h-24 w-auto object-contain"
              />
            </Link>
            <nav className="flex items-center space-x-4 md:space-x-6 text-sm md:text-base">
              <Link to="/admin/dashboard" className="text-gray-700 hover:text-[#FF6600]">Dashboard</Link>
              <Link to="/admin/courses" className="text-gray-700 hover:text-[#FF6600]">Cursos</Link>
              <Link to="/admin/events" className="text-gray-700 hover:text-[#FF6600]">Eventos</Link>
              <NotificationBell />
              <Link to="/profile" className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#FF6600] text-white font-bold flex items-center justify-center">
                {user?.name?.charAt(0).toUpperCase() || 'A'}
              </Link>
              <button
                onClick={() => signOut()}
                className="bg-red-500 text-white px-4 py-2 rounded-md font-semibold hover:bg-red-600 transition-colors text-sm md:text-base"
              >
                Sair
              </button>
            </nav>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 pb-24 md:pb-8">
        <div className="max-w-3xl mx-auto">
          <Link
            to="/admin/courses"
            className="text-[#FF6600] hover:underline mb-4 inline-block"
          >
            ← Voltar para Cursos
          </Link>
          <h1 className="text-3xl font-bold mb-8 text-[#003366]">Criar Novo Curso</h1>

          <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-lg shadow-md p-8 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Título do Curso *
              </label>
              <input
                {...register('title')}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900"
                placeholder="Ex: Workshop de Gestão de Viveiros"
              />
              {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descrição
              </label>
              <textarea
                {...register('description')}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900"
                placeholder="Descreva o curso..."
              />
              {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Banner do Curso (opcional)
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Formatos aceitos: JPG, PNG, GIF. Tamanho máximo: 5MB. Se não fornecer, o banner será extraído automaticamente do vídeo do YouTube da primeira aula.
              </p>
              
              <div className="space-y-3">
                <div>
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        handleFileUpload(file)
                      } else {
                      }
                    }}
                    disabled={uploading}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900 disabled:opacity-50 cursor-pointer"
                  />
                  {uploading && (
                    <p className="text-sm text-blue-600 mt-1 flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Fazendo upload...
                    </p>
                  )}
                  {bannerPreview && !uploading && (
                    <p className="text-sm text-green-600 mt-1">✅ Upload concluído com sucesso!</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Ou informe a URL do banner (opcional):
                  </label>
                  <input
                    type="text"
                    {...register('bannerUrl')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900"
                    placeholder="https://exemplo.com/banner.jpg ou /uploads/banners/banner.jpg"
                    onChange={(e) => {
                      const value = e.target.value.trim() || ''
                      setValue('bannerUrl', value, { shouldValidate: false })
                      if (value) {
                        setBannerPreview(value)
                      }
                    }}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Deixe em branco se já fez upload de uma imagem acima
                  </p>
                </div>
                
                {(bannerUrl || bannerPreview) && (
                  <div className="mt-3">
                    <p className="text-sm text-gray-600 mb-2">Preview:</p>
                    <img
                      src={normalizeImageUrl(bannerUrl || bannerPreview || '')}
                      alt="Preview do banner"
                      className="w-full h-48 object-cover rounded-md border border-gray-300"
                      onError={() => setBannerPreview(null)}
                    />
                  </div>
                )}
              </div>
              {errors.bannerUrl && <p className="text-red-500 text-sm mt-1">{errors.bannerUrl.message}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Curso *
                </label>
                <select
                  {...register('type')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900"
                >
                  <option value="ONLINE">Online</option>
                  <option value="PRESENCIAL">Presencial</option>
                </select>
                {errors.type && <p className="text-red-500 text-sm mt-1">{errors.type.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Limite de Vagas (opcional)
                </label>
                <input
                  type="number"
                  min="1"
                  {...register('maxEnrollments')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900"
                  placeholder="Ex: 50"
                />
                {errors.maxEnrollments && <p className="text-red-500 text-sm mt-1">{errors.maxEnrollments.message}</p>}
                <p className="text-xs text-gray-500 mt-1">Deixe em branco para ilimitado</p>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-[#003366]">Lista de Espera</h3>
                  <p className="text-sm text-gray-500">
                    Permita que interessados entrem em uma lista de espera quando as vagas acabarem.
                  </p>
                </div>
                <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    {...register('waitlistEnabled')}
                    className="h-5 w-5 rounded border-gray-300 text-[#FF6600] focus:ring-[#FF6600]"
                  />
                  Ativar lista de espera
                </label>
              </div>

              {waitlistEnabled && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Limite de vagas na lista de espera
                  </label>
                  <input
                    type="number"
                    min="0"
                    {...register('waitlistLimit')}
                    className="w-full rounded-md border border-gray-300 px-4 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-[#FF6600]"
                    placeholder="Ex: 10"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Utilize 0 para ilimitado. Sugestão: abrir até 10 vagas extras.
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-[#003366]">Restrição por Região</h3>
                  <p className="text-sm text-gray-500">
                    Defina limites de vagas por estado/cidade e controle inscrições fora das regiões alvo.
                  </p>
                </div>
                <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    {...register('regionRestrictionEnabled')}
                    className="h-5 w-5 rounded border-gray-300 text-[#FF6600] focus:ring-[#FF6600]"
                  />
                  Ativar restrição regional
                </label>
              </div>

              {regionRestrictionEnabled && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <input
                        type="checkbox"
                        {...register('allowAllRegions')}
                        className="h-5 w-5 rounded border-gray-300 text-[#FF6600] focus:ring-[#FF6600]"
                      />
                      Permitir inscrições fora das regiões listadas (ficarão pendentes)
                    </label>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Limite padrão por região (opcional)
                      </label>
                      <input
                        type="number"
                        min="0"
                        {...register('defaultRegionLimit')}
                        className="w-full rounded-md border border-gray-300 px-4 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-[#FF6600]"
                        placeholder="Ex: 30"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Caso definido, aplica um limite padrão para regiões não especificadas.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-md border border-dashed border-gray-300 p-4">
                    <h4 className="text-sm font-semibold text-[#003366] mb-3">Adicionar limite por região</h4>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
                      <select
                        value={newRegionQuota.state}
                        onChange={(event) =>
                          setNewRegionQuota((prev) => ({ ...prev, state: event.target.value }))
                        }
                        className="md:col-span-1 rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-[#FF6600]"
                      >
                        <option value="">Estado</option>
                        {BRAZIL_STATES.map((state) => (
                          <option key={state.sigla} value={state.sigla}>
                            {state.nome}
                          </option>
                        ))}
                      </select>
                      <input
                        value={newRegionQuota.city}
                        onChange={(event) =>
                          setNewRegionQuota((prev) => ({ ...prev, city: event.target.value }))
                        }
                        className="md:col-span-1 rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-[#FF6600]"
                        placeholder="Cidade (opcional)"
                      />
                      <input
                        type="number"
                        min="1"
                        value={newRegionQuota.limit}
                        onChange={(event) =>
                          setNewRegionQuota((prev) => ({ ...prev, limit: event.target.value }))
                        }
                        className="rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-[#FF6600]"
                        placeholder="Vagas"
                      />
                      <input
                        type="number"
                        min="0"
                        value={newRegionQuota.waitlistLimit}
                        onChange={(event) =>
                          setNewRegionQuota((prev) => ({
                            ...prev,
                            waitlistLimit: event.target.value
                          }))
                        }
                        className="rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-[#FF6600]"
                        placeholder="Lista espera"
                      />
                      <button
                        type="button"
                        onClick={handleAddRegionQuota}
                        className="rounded-md bg-[#003366] px-4 py-2 text-white font-semibold transition-colors hover:bg-[#00264d]"
                      >
                        Adicionar
                      </button>
                    </div>
                    {regionQuotaError && (
                      <p className="mt-2 text-sm text-red-500">{regionQuotaError}</p>
                    )}

                    {regionQuotas.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {regionQuotas.map((quota, index) => (
                          <div
                            key={`${quota.state}-${quota.city || 'all'}-${index}`}
                            className="flex flex-col gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 md:flex-row md:items-center md:justify-between"
                          >
                            <div className="space-y-1">
                              <p className="font-semibold text-[#003366]">
                                {quota.state}
                                {quota.city ? ` - ${quota.city}` : ' (Estado inteiro)'}
                              </p>
                              <p>
                                Limite de vagas: <strong>{quota.limit}</strong> · Lista de espera:{' '}
                                <strong>{quota.waitlistLimit}</strong>
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveRegionQuota(index)}
                              className="inline-flex items-center gap-1 text-sm font-medium text-red-600 hover:text-red-700"
                            >
                              Remover
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {regionQuotas.length === 0 && (
                      <p className="mt-3 text-xs text-gray-500">
                        Defina ao menos uma região com limite para ativar a restrição.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                {...register('status')}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900"
              >
                <option value="ACTIVE">Ativo</option>
                <option value="INACTIVE">Inativo</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data de Início (opcional)
                </label>
                <input
                  type="datetime-local"
                  {...register('startDate')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900"
                />
                {errors.startDate && <p className="text-red-500 text-sm mt-1">{errors.startDate.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data de Fim (opcional)
                </label>
                <input
                  type="datetime-local"
                  {...register('endDate')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900"
                />
                {errors.endDate && <p className="text-red-500 text-sm mt-1">{errors.endDate.message}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                URL Personalizada (opcional)
              </label>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="text-gray-500 text-sm sm:text-base whitespace-nowrap">https://seudominio.com/c/</span>
                <input
                  type="text"
                  {...register('slug')}
                  placeholder="meu-curso-especial"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Use apenas letras minúsculas, números e hífens. Ex: meu-curso-especial
              </p>
              {errors.slug && <p className="text-red-500 text-sm mt-1">{errors.slug.message}</p>}
            </div>

            
            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-[#003366]">Primeira Aula (opcional)</h3>
                  <p className="text-sm text-gray-500">Adicione a primeira aula do curso agora</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowFirstLesson(!showFirstLesson)}
                  className="text-[#FF6600] hover:text-[#e55a00] font-medium text-sm"
                >
                  {showFirstLesson ? 'Ocultar' : 'Adicionar Primeira Aula'}
                </button>
              </div>

              {showFirstLesson && (
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Título da Primeira Aula *
                    </label>
                    <input
                      {...register('firstLessonTitle')}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900"
                      placeholder="Ex: Introdução ao Curso"
                    />
                    {errors.firstLessonTitle && <p className="text-red-500 text-sm mt-1">{errors.firstLessonTitle.message}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <span className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                        </svg>
                        Link do Vídeo do YouTube *
                      </span>
                    </label>
                    <input
                      type="text"
                      {...register('firstLessonVideoUrl')}
                      placeholder="Cole aqui o link do YouTube (ex: https://www.youtube.com/watch?v=... ou https://youtu.be/...)"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-[#FF6600] text-gray-900"
                      onChange={(e) => {
                        const value = e.target.value
                        setValue('firstLessonVideoUrl', value, { shouldValidate: false })

                        if (value && value.trim()) {
                          const thumbnail = extractYouTubeThumbnail(value)
                          if (thumbnail && (!bannerUrl || bannerUrl === '')) {
                            setValue('bannerUrl', thumbnail, { shouldValidate: false })
                            setBannerPreview(thumbnail)
                          }
                        }
                      }}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Aceita links do YouTube em qualquer formato: youtube.com/watch?v=..., youtu.be/..., ou youtube.com/embed/...
                    </p>
                    {errors.firstLessonVideoUrl && <p className="text-red-500 text-sm mt-1">{errors.firstLessonVideoUrl.message}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Descrição da Primeira Aula (opcional)
                    </label>
                    <textarea
                      {...register('firstLessonDescription')}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900"
                      placeholder="Descreva a primeira aula..."
                    />
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-[#FF6600] text-white py-3 px-6 rounded-md font-semibold hover:bg-[#e55a00] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Criando...' : 'Criar Curso'}
              </button>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-6 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>

      <Footer />
    </div>
  )
}

