'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import NotificationBell from '@/components/notifications/NotificationBell'
import Footer from '@/components/ui/Footer'

const lessonSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional(),
  videoUrl: z.string().url('URL do YouTube inválida'),
  bannerUrl: z.string().optional().or(z.literal('')).refine(
    (val) => {
      // Aceitar vazio, URL relativa (começa com /) ou URL absoluta
      if (!val || val.trim() === '') return true
      return val.startsWith('/') || val.startsWith('http://') || val.startsWith('https://')
    },
    { message: 'URL inválida' }
  ),
  duration: z.string().optional(),
  order: z.number().int().min(0),
})

type LessonFormData = z.infer<typeof lessonSchema>

export default function CourseLessonsPage() {
  const params = useParams()
  const { data: session, status } = useSession()
  const router = useRouter()
  const courseId = params.courseId as string
  
  const [course, setCourse] = useState<any>(null)
  const [lessons, setLessons] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingLesson, setEditingLesson] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [bannerPreview, setBannerPreview] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<LessonFormData>({
    resolver: zodResolver(lessonSchema),
    defaultValues: {
      order: 0
    }
  })

  const videoUrl = watch('videoUrl')
  const bannerUrl = watch('bannerUrl')

  // Função para extrair ID do YouTube e gerar thumbnail
  const extractYouTubeThumbnail = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match && match[1]) {
        const videoId = match[1]
        // Retornar URL da thumbnail de alta qualidade (maxresdefault)
        // Se não existir, o YouTube retorna hqdefault automaticamente
        return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
      }
    }

    return null
  }

  // Atualizar banner automaticamente quando o link do YouTube mudar
  useEffect(() => {
    if (videoUrl && videoUrl.trim()) {
      const thumbnail = extractYouTubeThumbnail(videoUrl)
      if (thumbnail && (!bannerUrl || bannerUrl === '')) {
        setValue('bannerUrl', thumbnail, { shouldValidate: false })
        setBannerPreview(thumbnail)
      }
    }
  }, [videoUrl, bannerUrl, setValue])

  const handleFileUpload = async (file: File) => {
    setUploading(true)
    setError(null)

    try {
      // Validar tipo de arquivo
      if (!file.type.startsWith('image/')) {
        throw new Error('Apenas imagens são permitidas')
      }

      // Validar tamanho (máximo 5MB)
      const maxSize = 5 * 1024 * 1024 // 5MB
      if (file.size > maxSize) {
        throw new Error('Arquivo muito grande. Máximo: 5MB')
      }

      // Fazer upload
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao fazer upload')
      }

      const data = await response.json()
      // Preencher o campo bannerUrl com a URL retornada e validar
      setValue('bannerUrl', data.url, { shouldValidate: true })
      setBannerPreview(data.url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer upload')
    } finally {
      setUploading(false)
    }
  }

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated' && session?.user?.role !== 'ADMIN') {
      router.push('/my-courses')
    }
  }, [status, session, router])

  const fetchCourse = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/courses/${courseId}`)
      if (res.ok) {
        const data = await res.json()
        setCourse(data)
      }
    } catch (error) {
      console.error(error)
    }
  }, [courseId, reset])

  const fetchLessons = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/lessons`)
      if (res.ok) {
        const data = await res.json()
        setLessons(data)
        reset({ order: data.length })
      }
    } catch (error) {
      console.error(error)
    }
  }, [courseId, reset])

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role === 'ADMIN' && courseId) {
      fetchCourse()
      fetchLessons()
    }
  }, [status, session, courseId, fetchCourse, fetchLessons])

  const onSubmit = async (data: LessonFormData) => {
    setSubmitting(true)
    setError(null)

    try {
      if (editingLesson) {
        // Atualizar aula existente
        const response = await fetch(`/api/admin/courses/${courseId}/lessons/${editingLesson}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Erro ao atualizar aula')
        }
      } else {
        // Criar nova aula
        const response = await fetch(`/api/admin/courses/${courseId}/lessons`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Erro ao criar aula')
        }
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
      const response = await fetch(`/api/admin/courses/${courseId}/lessons/${lessonId}`)
      if (response.ok) {
        const lesson = await response.json()
        setValue('title', lesson.title)
        setValue('description', lesson.description || '')
        setValue('videoUrl', lesson.videoUrl)
        setValue('bannerUrl', lesson.bannerUrl || '')
        setValue('duration', lesson.duration || '')
        setValue('order', lesson.order)
        setEditingLesson(lessonId)
        setBannerPreview(lesson.bannerUrl || null)
        setShowForm(true)
        // Scroll para o formulário
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    } catch (error) {
      console.error('Erro ao carregar aula:', error)
      setError('Erro ao carregar aula para edição')
    }
  }

  const handleDelete = async (lessonId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta aula?')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/courses/${courseId}/lessons/${lessonId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao excluir aula')
      }

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

  if (status === 'loading' || !course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header Responsivo */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-2">
          <div className="flex flex-col md:flex-row items-center justify-between space-y-2 md:space-y-0">
            <Link href="/" className="flex items-center">
              <img
                src="/logo B.png"
                alt="Link de Cadastro"
                className="h-20 md:h-24 w-auto object-contain"
              />
            </Link>
            <nav className="flex items-center space-x-4 md:space-x-6 text-sm md:text-base">
              <Link href="/admin/dashboard" className="text-gray-700 hover:text-[#FF6600]">Dashboard</Link>
              <Link href="/admin/courses" className="text-gray-700 hover:text-[#FF6600]">Cursos</Link>
              <Link href="/admin/events" className="text-gray-700 hover:text-[#FF6600]">Eventos</Link>
              <NotificationBell />
              <Link href="/profile" className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#FF6600] text-white font-bold flex items-center justify-center">
                {session?.user?.name?.charAt(0).toUpperCase() || 'A'}
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="bg-red-500 text-white px-4 py-2 rounded-md font-semibold hover:bg-red-600 transition-colors text-sm md:text-base"
              >
                Sair
              </button>
            </nav>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 flex-1">
        <div className="mb-8">
          <Link
            href="/admin/courses"
            className="text-[#FF6600] hover:underline mb-4 inline-block"
          >
            ← Voltar para Cursos
          </Link>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-[#003366]">
                {course?.title || 'Carregando...'}
              </h1>
              <p className="text-gray-600 mt-2">{course?.description}</p>
            </div>
            <button
              onClick={async () => {
                const bannerUrl = prompt('Digite a URL do banner do curso (ou deixe vazio para remover):')
                if (bannerUrl !== null) {
                  try {
                    const response = await fetch(`/api/admin/courses/${courseId}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ bannerUrl: bannerUrl.trim() || null })
                    })
                    if (response.ok) {
                      const updated = await response.json()
                      setCourse(updated)
                      alert('Banner do curso atualizado com sucesso!')
                      // Recarregar a página para ver o banner atualizado
                      window.location.reload()
                    } else {
                      const error = await response.json()
                      alert(error.error || 'Erro ao atualizar banner')
                    }
                  } catch (error) {
                    console.error('Erro ao atualizar banner:', error)
                    alert('Erro ao atualizar banner')
                  }
                }
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-md font-semibold hover:bg-blue-700 transition-colors text-sm"
            >
              📸 Atualizar Banner do Curso
            </button>
          </div>
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
                            // Extrair thumbnail automaticamente
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
                          handleFileUpload(file)
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
                          src={bannerPreview}
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
                            src={lesson.bannerUrl}
                            alt={lesson.title}
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

