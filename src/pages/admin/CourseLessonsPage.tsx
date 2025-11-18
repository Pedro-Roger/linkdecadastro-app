import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import NotificationBell from '@/components/notifications/NotificationBell'
import Footer from '@/components/ui/Footer'
import LoadingScreen from '@/components/ui/LoadingScreen'
import { apiFetch, getApiUrl, normalizeImageUrl } from '@/lib/api'
import { useAuth } from '@/lib/useAuth'

const lessonSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional(),
  videoUrl: z.string().url('URL do YouTube inválida'),
  bannerUrl: z.string().optional().or(z.literal('')).refine(
    (val) => {

      if (!val || val.trim() === '') return true
      return val.startsWith('/') || val.startsWith('http://') || val.startsWith('https://')
    },
    { message: 'URL inválida' }
  ),
  duration: z.string().optional(),
  order: z.number().int().min(0),
})

type LessonFormData = z.infer<typeof lessonSchema>

const courseEditSchema = z.object({
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
  slug: z.string().optional().refine(
    (val) => !val || /^[a-z0-9-]+$/.test(val),
    { message: 'URL personalizada deve conter apenas letras minúsculas, números e hífens' }
  ),
})

type CourseEditFormData = z.infer<typeof courseEditSchema>

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

export default function CourseLessonsPage() {
  const params = useParams()
  const navigate = useNavigate()
  const { user, loading: authLoading, isAuthenticated, signOut } = useAuth({
    requireAuth: true,
    redirectTo: '/login',
  })
  const courseId = params.courseId as string
  
  const [course, setCourse] = useState<any>(null)
  const [lessons, setLessons] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingLesson, setEditingLesson] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [bannerPreview, setBannerPreview] = useState<string | null>(null)
  const [showCourseEdit, setShowCourseEdit] = useState(false)
  const [editingCourse, setEditingCourse] = useState(false)
  const [courseEditError, setCourseEditError] = useState<string | null>(null)
  const [regionQuotas, setRegionQuotas] = useState<
    Array<{
      id?: string
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

  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<LessonFormData>({
    resolver: zodResolver(lessonSchema),
    defaultValues: {
      order: 0
    }
  })

  const { 
    register: registerCourse, 
    handleSubmit: handleSubmitCourse, 
    formState: { errors: courseErrors }, 
    reset: resetCourse, 
    setValue: setCourseValue, 
    watch: watchCourse 
  } = useForm<CourseEditFormData>({
    resolver: zodResolver(courseEditSchema),
    defaultValues: {
      status: 'ACTIVE',
      type: 'ONLINE',
      waitlistEnabled: false,
      waitlistLimit: 0,
      regionRestrictionEnabled: false,
      allowAllRegions: true
    }
  })

  const waitlistEnabled = watchCourse('waitlistEnabled')
  const regionRestrictionEnabled = watchCourse('regionRestrictionEnabled')
  const allowAllRegions = watchCourse('allowAllRegions')
  const courseBannerUrl = watchCourse('bannerUrl')

  const videoUrl = watch('videoUrl')
  const bannerUrl = watch('bannerUrl')


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
    if (videoUrl && videoUrl.trim()) {
      const thumbnail = extractYouTubeThumbnail(videoUrl)
      if (thumbnail && (!bannerUrl || bannerUrl === '')) {
        setValue('bannerUrl', thumbnail, { shouldValidate: false })
        setBannerPreview(thumbnail)
      }
    }
  }, [videoUrl, bannerUrl, setValue])

  const handleFileUpload = async (file: File, isCourseBanner = false) => {
    setUploading(true)
    setError(null)
    setCourseEditError(null)

    try {
      if (!file.type.startsWith('image/')) {
        throw new Error('Apenas imagens são permitidas')
      }

      const maxSize = 5 * 1024 * 1024 // 5MB
      if (file.size > maxSize) {
        throw new Error('Arquivo muito grande. Máximo: 5MB')
      }

      const formData = new FormData()
      formData.append('file', file)

      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('token')
          : null

      const response = await fetch(
        `${getApiUrl()}/admin/upload`,
        {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          body: formData,
        },
      )

      if (!response.ok) {
        let message = 'Erro ao fazer upload'
        try {
          const errorData = await response.json()
          if (errorData?.error) {
            message = errorData.error
          }
        } catch {
          // ignore
        }
        throw new Error(message)
      }

      const data = await response.json()

      if (isCourseBanner) {
        setCourseValue('bannerUrl', data.url, { shouldValidate: true })
        setBannerPreview(data.url)
      } else {
        setValue('bannerUrl', data.url, { shouldValidate: true })
        setBannerPreview(data.url)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao fazer upload'
      if (isCourseBanner) {
        setCourseEditError(errorMessage)
      } else {
        setError(errorMessage)
      }
    } finally {
      setUploading(false)
    }
  }

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
        waitlistLimit: Number.isNaN(waitlistValue) || waitlistValue < 0 ? 0 : waitlistValue
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

  const fetchCourse = useCallback(async () => {
    try {
      const data = await apiFetch<any>(`/admin/courses/${courseId}`, {
        auth: true,
      })
      setCourse(data)
      
      // Preencher formulário de edição do curso
      if (data) {
        setCourseValue('title', data.title)
        setCourseValue('description', data.description || '')
        setCourseValue('bannerUrl', data.bannerUrl || '')
        setCourseValue('status', data.status || 'ACTIVE')
        setCourseValue('type', data.type || 'ONLINE')
        setCourseValue('maxEnrollments', data.maxEnrollments ? String(data.maxEnrollments) : '')
        setCourseValue('waitlistEnabled', data.waitlistEnabled || false)
        setCourseValue('waitlistLimit', data.waitlistLimit ? String(data.waitlistLimit) : '0')
        setCourseValue('regionRestrictionEnabled', data.regionRestrictionEnabled || false)
        setCourseValue('allowAllRegions', data.allowAllRegions ?? true)
        setCourseValue('defaultRegionLimit', data.defaultRegionLimit ? String(data.defaultRegionLimit) : '')
        setCourseValue('startDate', data.startDate ? data.startDate.split('T')[0] : '')
        setCourseValue('endDate', data.endDate ? data.endDate.split('T')[0] : '')
        setCourseValue('slug', data.slug || '')
        
        if (data.bannerUrl) {
          setBannerPreview(data.bannerUrl)
        }
        
        // Preencher quotas regionais
        if (data.regionQuotas && data.regionQuotas.length > 0) {
          setRegionQuotas(data.regionQuotas.map((q: any) => ({
            id: q.id,
            state: q.state,
            city: q.city || '',
            limit: q.limit,
            waitlistLimit: q.waitlistLimit || 0,
          })))
        } else {
          setRegionQuotas([])
        }
      }
    } catch (error) {
    }
  }, [courseId, setCourseValue])

  const onCourseEditSubmit = useCallback(async (data: CourseEditFormData) => {
    setEditingCourse(true)
    setCourseEditError(null)

    try {
      if (data.regionRestrictionEnabled && regionQuotas.length === 0) {
        setCourseEditError('Adicione pelo menos uma região com limite de vagas ou desative a restrição regional.')
        setEditingCourse(false)
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
        waitlistLimit: typeof data.waitlistLimit === 'number' && data.waitlistLimit >= 0 ? data.waitlistLimit : 0,
        regionRestrictionEnabled: data.regionRestrictionEnabled ?? false,
        allowAllRegions: data.regionRestrictionEnabled ?? false ? data.allowAllRegions ?? true : true,
        defaultRegionLimit: typeof data.defaultRegionLimit === 'number' && data.defaultRegionLimit > 0 ? data.defaultRegionLimit : null,
        startDate: data.startDate && data.startDate.trim() ? data.startDate : undefined,
        endDate: data.endDate && data.endDate.trim() ? data.endDate : undefined,
        slug: data.slug && data.slug.trim() ? data.slug.trim().toLowerCase() : undefined,
        regionQuotas: data.regionRestrictionEnabled
          ? regionQuotas.map((quota) => ({
              id: quota.id || null,
              state: quota.state,
              city: quota.city || null,
              limit: quota.limit,
              waitlistLimit: quota.waitlistLimit ?? 0
            }))
          : []
      }

      const updated = await apiFetch<any>(`/admin/courses/${courseId}`, {
        method: 'PUT',
        auth: true,
        body: JSON.stringify(payload),
      })

      setCourse(updated)
      setShowCourseEdit(false)
      alert('Curso atualizado com sucesso!')
      fetchCourse() // Recarregar dados
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar curso'
      setCourseEditError(errorMessage)
      alert(errorMessage)
    } finally {
      setEditingCourse(false)
    }
  }, [courseId, regionQuotas, bannerPreview, fetchCourse])

  const fetchLessons = useCallback(async () => {
    try {
      const data = await apiFetch<any[]>(
        `/admin/courses/${courseId}/lessons`,
        { auth: true },
      )
      setLessons(data)
      reset({ order: data.length })
    } catch (error) {
    }
  }, [courseId, reset])

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated || user?.role !== 'ADMIN') {
        navigate('/my-courses')
      } else if (courseId) {
        fetchCourse()
        fetchLessons()
      }
    }
  }, [authLoading, isAuthenticated, user, courseId, fetchCourse, fetchLessons, navigate])

  const onSubmit = async (data: LessonFormData) => {
    setSubmitting(true)
    setError(null)

    try {
      if (editingLesson) {
        await apiFetch(
          `/admin/courses/${courseId}/lessons/${editingLesson}`,
          {
            method: 'PUT',
            auth: true,
            body: JSON.stringify(data),
          },
        )
      } else {
        await apiFetch(`/admin/courses/${courseId}/lessons`, {
          method: 'POST',
          auth: true,
          body: JSON.stringify(data),
        })
      }

      reset()
      setShowForm(false)
      setEditingLesson(null)
      setBannerPreview(null)
      fetchLessons()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar aula')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = async (lessonId: string) => {
    try {
      const lesson = await apiFetch<any>(
        `/admin/courses/${courseId}/lessons/${lessonId}`,
        { auth: true },
      )
      setValue('title', lesson.title)
      setValue('description', lesson.description || '')
      setValue('videoUrl', lesson.videoUrl)
      setValue('bannerUrl', lesson.bannerUrl || '')
      setValue('duration', lesson.duration || '')
      setValue('order', lesson.order)
      setEditingLesson(lessonId)
      setBannerPreview(lesson.bannerUrl || null)
      setShowForm(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error) {
      setError('Erro ao carregar aula para edição')
    }
  }

  const handleDelete = async (lessonId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta aula?')) {
      return
    }

    try {
      await apiFetch(`/admin/courses/${courseId}/lessons/${lessonId}`, {
        method: 'DELETE',
        auth: true,
      })
      fetchLessons()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir aula')
    }
  }

  const handleCancel = () => {
    reset()
    setShowForm(false)
    setEditingLesson(null)
    setBannerPreview(null)
  }

  if (authLoading || !course) {
    return <LoadingScreen />
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      
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

      <div className="container mx-auto px-4 py-8 pb-24 md:pb-8 flex-1">
        <div className="mb-8">
          <Link
            to="/admin/courses"
            className="text-[#FF6600] hover:underline mb-4 inline-block"
          >
            ← Voltar para Cursos
          </Link>
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold text-[#003366]">
                {course?.title || 'Carregando...'}
              </h1>
              <p className="text-gray-600 mt-2">{course?.description}</p>
            </div>
            <button
              onClick={() => setShowCourseEdit(!showCourseEdit)}
              className="bg-[#FF6600] text-white px-6 py-2 rounded-md font-semibold hover:bg-[#e55a00] transition-colors"
            >
              {showCourseEdit ? '✕ Fechar Edição' : '✏️ Editar Curso'}
            </button>
          </div>

          {showCourseEdit && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-2xl font-bold text-[#003366] mb-6">Editar Curso</h2>
              <form onSubmit={handleSubmitCourse(onCourseEditSubmit)} className="space-y-6">
                {courseEditError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    {courseEditError}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Título do Curso *
                  </label>
                  <input
                    {...registerCourse('title')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900"
                  />
                  {courseErrors.title && <p className="text-red-500 text-sm mt-1">{courseErrors.title.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descrição (opcional)
                  </label>
                  <textarea
                    {...registerCourse('description')}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900"
                    placeholder="Descreva o curso..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Banner do Curso (opcional)
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    Formatos aceitos: JPG, PNG, GIF. Tamanho máximo: 5MB.
                  </p>
                  <div className="space-y-3">
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          handleFileUpload(file, true)
                        }
                      }}
                      disabled={uploading}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900 disabled:opacity-50"
                    />
                    {uploading && <p className="text-sm text-blue-600">Fazendo upload...</p>}
                    <input
                      type="text"
                      {...registerCourse('bannerUrl')}
                      placeholder="Ou informe a URL do banner"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900"
                      onChange={(e) => {
                        const value = e.target.value.trim() || ''
                        setCourseValue('bannerUrl', value, { shouldValidate: false })
                        if (value) setBannerPreview(value)
                      }}
                    />
                    {(courseBannerUrl || bannerPreview) && (
                      <div className="mt-3">
                        <p className="text-sm text-gray-600 mb-2">Preview:</p>
                        <img
                          src={normalizeImageUrl(courseBannerUrl || bannerPreview || '')}
                          alt="Preview do banner"
                          className="w-full h-48 object-cover rounded-md border border-gray-300"
                          onError={() => setBannerPreview(null)}
                        />
                      </div>
                    )}
                  </div>
                  {courseErrors.bannerUrl && <p className="text-red-500 text-sm mt-1">{courseErrors.bannerUrl.message}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status *
                    </label>
                    <select
                      {...registerCourse('status')}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900"
                    >
                      <option value="ACTIVE">Ativo</option>
                      <option value="INACTIVE">Inativo</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tipo *
                    </label>
                    <select
                      {...registerCourse('type')}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900"
                    >
                      <option value="ONLINE">Online</option>
                      <option value="PRESENCIAL">Presencial</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Limite de Vagas (opcional)
                    </label>
                    <input
                      type="number"
                      min="1"
                      {...registerCourse('maxEnrollments')}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900"
                      placeholder="Ex: 50"
                    />
                    <p className="text-xs text-gray-500 mt-1">Deixe em branco para ilimitado</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Data de Início (opcional)
                    </label>
                    <input
                      type="date"
                      {...registerCourse('startDate')}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Data de Término (opcional)
                    </label>
                    <input
                      type="date"
                      {...registerCourse('endDate')}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    URL Personalizada (opcional)
                  </label>
                  <input
                    type="text"
                    {...registerCourse('slug')}
                    placeholder="ex: meu-curso-online"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900"
                  />
                  <p className="text-xs text-gray-500 mt-1">Apenas letras minúsculas, números e hífens</p>
                  {courseErrors.slug && <p className="text-red-500 text-sm mt-1">{courseErrors.slug.message}</p>}
                </div>

                <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-[#003366]">Lista de Espera</h3>
                      <p className="text-sm text-gray-500">Permita que interessados entrem em uma lista de espera</p>
                    </div>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        {...registerCourse('waitlistEnabled')}
                        className="h-5 w-5 rounded border-gray-300 text-[#FF6600] focus:ring-[#FF6600]"
                      />
                      Ativar
                    </label>
                  </div>
                  {waitlistEnabled && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Limite de vagas na lista de espera
                      </label>
                      <input
                        type="number"
                        min="0"
                        {...registerCourse('waitlistLimit')}
                        className="w-full rounded-md border border-gray-300 px-4 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-[#FF6600]"
                        placeholder="Ex: 10"
                      />
                      <p className="mt-1 text-xs text-gray-500">Use 0 para ilimitado</p>
                    </div>
                  )}
                </div>

                <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-[#003366]">Restrição por Região</h3>
                      <p className="text-sm text-gray-500">Defina limites de vagas por estado/cidade</p>
                    </div>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        {...registerCourse('regionRestrictionEnabled')}
                        className="h-5 w-5 rounded border-gray-300 text-[#FF6600] focus:ring-[#FF6600]"
                      />
                      Ativar
                    </label>
                  </div>

                  {regionRestrictionEnabled && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                          <input
                            type="checkbox"
                            {...registerCourse('allowAllRegions')}
                            className="h-5 w-5 rounded border-gray-300 text-[#FF6600] focus:ring-[#FF6600]"
                          />
                          Permitir inscrições fora das regiões listadas
                        </label>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Limite padrão por região (opcional)
                          </label>
                          <input
                            type="number"
                            min="0"
                            {...registerCourse('defaultRegionLimit')}
                            className="w-full rounded-md border border-gray-300 px-4 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-[#FF6600]"
                            placeholder="Ex: 30"
                          />
                        </div>
                      </div>

                      <div className="rounded-md border border-dashed border-gray-300 p-4">
                        <h4 className="text-sm font-semibold text-[#003366] mb-3">Adicionar limite por região</h4>
                        {regionQuotaError && (
                          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded mb-3 text-sm">
                            {regionQuotaError}
                          </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                          <select
                            value={newRegionQuota.state}
                            onChange={(e) => setNewRegionQuota({ ...newRegionQuota, state: e.target.value })}
                            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] text-gray-900"
                          >
                            <option value="">Estado *</option>
                            {BRAZIL_STATES.map((state) => (
                              <option key={state.sigla} value={state.sigla}>
                                {state.nome}
                              </option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={newRegionQuota.city}
                            onChange={(e) => setNewRegionQuota({ ...newRegionQuota, city: e.target.value })}
                            placeholder="Cidade (opcional)"
                            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] text-gray-900"
                          />
                          <input
                            type="number"
                            min="1"
                            value={newRegionQuota.limit}
                            onChange={(e) => setNewRegionQuota({ ...newRegionQuota, limit: e.target.value })}
                            placeholder="Limite de vagas *"
                            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] text-gray-900"
                          />
                          <div className="flex gap-2">
                            <input
                              type="number"
                              min="0"
                              value={newRegionQuota.waitlistLimit}
                              onChange={(e) => setNewRegionQuota({ ...newRegionQuota, waitlistLimit: e.target.value })}
                              placeholder="Lista espera"
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] text-gray-900"
                            />
                            <button
                              type="button"
                              onClick={handleAddRegionQuota}
                              className="bg-[#FF6600] text-white px-4 py-2 rounded-md hover:bg-[#e55a00] transition-colors text-sm whitespace-nowrap"
                            >
                              Adicionar
                            </button>
                          </div>
                        </div>
                      </div>

                      {regionQuotas.length > 0 && (
                        <div className="mt-4">
                          <h4 className="text-sm font-semibold text-[#003366] mb-2">Regiões configuradas:</h4>
                          <div className="space-y-2">
                            {regionQuotas.map((quota, index) => (
                              <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
                                <div>
                                  <span className="font-medium">{quota.state}</span>
                                  {quota.city && <span> - {quota.city}</span>}
                                  <span className="text-gray-600 ml-2">({quota.limit} vagas</span>
                                  {quota.waitlistLimit > 0 && <span>, {quota.waitlistLimit} lista de espera</span>}
                                  <span>)</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveRegionQuota(index)}
                                  className="text-red-600 hover:text-red-800 text-sm"
                                >
                                  Remover
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4 border-t">
                  <button
                    type="submit"
                    disabled={editingCourse}
                    className="flex-1 bg-[#FF6600] text-white py-2 px-4 rounded-md font-semibold hover:bg-[#e55a00] transition-colors disabled:opacity-50"
                  >
                    {editingCourse ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCourseEdit(false)
                      fetchCourse() // Recarregar dados originais
                    }}
                    className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-[#003366]">Aulas do Curso</h2>
            <button
              onClick={() => {
                if (showForm) {
                  handleCancel()
                } else {
                  setShowForm(true)
                  setEditingLesson(null)
                  reset({ order: lessons.length })
                }
              }}
              className="bg-[#FF6600] text-white px-4 py-2 rounded-md hover:bg-[#e55a00] transition-colors"
            >
              {showForm ? 'Cancelar' : '+ Adicionar Aula'}
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mb-6 p-4 bg-gray-50 rounded-lg">
              {editingLesson && (
                <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2 rounded mb-4">
                  <strong>Editando aula:</strong> Você está editando uma aula existente. As alterações serão salvas quando você clicar em &quot;Salvar Aula&quot;.
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Título da Aula *
                </label>
                <input
                  {...register('title')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900"
                />
                {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>}
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
                          {...register('videoUrl')}
                          placeholder="Cole aqui o link do YouTube (ex: https://www.youtube.com/watch?v=... ou https://youtu.be/...)"
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-[#FF6600] text-gray-900"
                          onChange={(e) => {
                            const value = e.target.value
                            setValue('videoUrl', value, { shouldValidate: false })

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
                {errors.videoUrl && <p className="text-red-500 text-sm mt-1">{errors.videoUrl.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Banner/Thumbnail da Aula (opcional)
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  O banner será extraído automaticamente do YouTube quando você inserir o link do vídeo. 
                  Ou você pode fazer upload de uma imagem personalizada.
                </p>
                
                <div className="space-y-3">
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          handleFileUpload(file, false)
                        }
                      }}
                      disabled={uploading}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900 disabled:opacity-50"
                    />
                    {uploading && (
                      <p className="text-sm text-blue-600 mt-1">Fazendo upload...</p>
                    )}
                  </div>
                  
                          <div>
                            <label className="block text-sm text-gray-600 mb-1">
                              Ou informe a URL do banner:
                            </label>
                            <input
                              type="text"
                              {...register('bannerUrl')}
                              placeholder="URL do banner/thumbnail (ex: https://exemplo.com/banner.jpg ou /uploads/banners/banner.jpg)"
                              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900"
                              onChange={(e) => {
                                const value = e.target.value.trim()
                                setValue('bannerUrl', value, { shouldValidate: false })
                                setBannerPreview(value || null)
                              }}
                            />
                          </div>

                  {bannerPreview && (
                    <div className="mt-3">
                      <p className="text-sm text-gray-600 mb-2">Preview do banner:</p>
                      <div className="relative w-full h-48 border border-gray-300 rounded-md overflow-hidden">
                        <img
                          src={normalizeImageUrl(bannerPreview)}
                          alt="Preview do banner"
                          className="w-full h-full object-cover"
                          onError={() => setBannerPreview(null)}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setValue('bannerUrl', '')
                          setBannerPreview(null)
                        }}
                        className="mt-2 text-sm text-red-600 hover:text-red-800"
                      >
                        Remover banner
                      </button>
                    </div>
                  )}
                </div>
                
                {errors.bannerUrl && <p className="text-red-500 text-sm mt-1">{errors.bannerUrl.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duração (opcional)
                  </label>
                  <input
                    {...register('duration')}
                    placeholder="Ex: 25:30"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ordem *
                  </label>
                  <input
                    type="number"
                    {...register('order', { valueAsNumber: true })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900"
                  />
                  {errors.order && <p className="text-red-500 text-sm mt-1">{errors.order.message}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição (opcional)
                </label>
                <textarea
                  {...register('description')}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-[#FF6600] text-white py-2 px-4 rounded-md font-semibold hover:bg-[#e55a00] transition-colors disabled:opacity-50"
                >
                  {submitting ? (editingLesson ? 'Salvando...' : 'Adicionando...') : (editingLesson ? 'Salvar Aula' : 'Adicionar Aula')}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}

          <div className="space-y-2">
            {lessons.map((lesson, index) => (
              <div
                key={lesson.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center space-x-4 flex-1">
                  <span className="w-8 h-8 rounded-full bg-[#FF6600] text-white flex items-center justify-center font-bold">
                    {index + 1}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-start gap-3">
                      {lesson.bannerUrl && (
                        <div className="relative w-24 h-16 flex-shrink-0 rounded overflow-hidden border border-gray-200">
                          <img
                            src={normalizeImageUrl(lesson.bannerUrl)} alt={lesson.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-[#003366]">{lesson.title}</h3>
                        {lesson.duration && (
                          <p className="text-sm text-gray-500">Duração: {lesson.duration}</p>
                        )}
                        {lesson.videoUrl && (
                          <p className="text-xs text-gray-400 mt-1 truncate max-w-md">
                            {lesson.videoUrl}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-sm text-gray-500">
                    {lesson._count?.comments || 0} comentários
                  </div>
                  <button
                    onClick={() => handleEdit(lesson.id)}
                    className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(lesson.id)}
                    className="text-red-600 hover:text-red-800 font-medium text-sm"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            ))}

            {lessons.length === 0 && (
              <p className="text-center text-gray-500 py-24">
                Nenhuma aula adicionada ainda. Clique em &quot;Adicionar Aula&quot; para começar.
              </p>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}

