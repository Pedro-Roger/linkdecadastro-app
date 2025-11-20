import { useEffect, useState, useCallback, useMemo } from 'react'
import ReactPlayer from 'react-player/youtube'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import NotificationBell from '@/components/notifications/NotificationBell'
import Footer from '@/components/ui/Footer'
import LoadingScreen from '@/components/ui/LoadingScreen'
import { apiFetch, normalizeImageUrl, getApiUrl } from '@/lib/api'

export default function CoursePage() {
  const params = useParams()
  const navigate = useNavigate()
  const courseId = params.courseId as string
  
  const [course, setCourse] = useState<any>(null)
  const [selectedLesson, setSelectedLesson] = useState<any>(null)
  const [comments, setComments] = useState<any[]>([])
  const [newComment, setNewComment] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [progress, setProgress] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [copyStatus, setCopyStatus] = useState<'idle' | 'success'>('idle')

  const fetchCourse = useCallback(async () => {
    try {
      const data = await apiFetch<any>(`/courses/${courseId}`, {
        auth: true,
      })
      setCourse(data)
      if (data.lessons && data.lessons.length > 0) {
        setSelectedLesson(data.lessons[0])
      }
    } catch (error) {
    } finally {
      setLoading(false)
    }
  }, [courseId])

  const fetchComments = useCallback(async () => {
    if (!selectedLesson) return
    
    try {
      const data = await apiFetch<any[]>(
        `/lessons/${selectedLesson.id}/comments`,
      )
      setComments(data)
    } catch (error) {
    }
  }, [selectedLesson])

  const fetchProgress = useCallback(async () => {
    if (!selectedLesson) return
    
    try {
      const data = await apiFetch<any>(
        `/lessons/${selectedLesson.id}/progress`,
        { auth: true },
      )
      setProgress(data)
    } catch (error) {
    }
  }, [selectedLesson])

  useEffect(() => {
    const token =
      typeof window !== 'undefined'
        ? localStorage.getItem('token')
        : null

    if (!token) {
      navigate('/login')
      return
    }

    if (courseId) {
      fetchCourse()
    }
  }, [courseId, fetchCourse, navigate])

  useEffect(() => {
    if (selectedLesson) {
      fetchComments()
      fetchProgress()
    }
  }, [selectedLesson, fetchComments, fetchProgress])

  const handleVideoProgress = async (state: { playedSeconds: number, played: number }) => {
    if (!selectedLesson) return

    const watchedTime = Math.floor(state.playedSeconds)
    const completed = state.played >= 0.9 // 90% assistido = completo

    try {
      await apiFetch(`/lessons/${selectedLesson.id}/progress`, {
        method: 'POST',
        auth: true,
        body: JSON.stringify({
          watchedTime,
          completed,
        }),
      })

      if (completed && !progress?.completed) {
        fetchProgress()
        fetchCourse() // Atualizar progresso do curso
      }
    } catch (error) {
    }
  }

  const courseShareData = useMemo(() => {
    if (!course) return null

    const origin =
      typeof window !== 'undefined' ? window.location.origin : ''
    // Usa ?enroll=slug para ir direto para a página principal e abrir o modal
    const path = course.slug ? `/?enroll=${course.slug}` : `/?enroll=${course.id}`
    const url = origin ? `${origin}${path}` : path

    let bannerUrl: string | undefined = course.bannerUrl
    if (bannerUrl) {
      bannerUrl = normalizeImageUrl(bannerUrl)
    }

    const message = `Confira o curso "${course.title}" no Link de Cadastro: ${url}`

    return {
      url,
      bannerUrl,
      message
    }
  }, [course])

  const handleShareCourse = useCallback(async () => {
    if (!courseShareData || !course) return

    const shareData = {
      title: course.title,
      text: `Confira o curso "${course.title}" no Link de Cadastro.`,
      url: courseShareData.url
    }

    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share(shareData)
      } else if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(courseShareData.message)
        setCopyStatus('success')
        setTimeout(() => setCopyStatus('idle'), 2000)
      }
    } catch (error) {
    }
  }, [courseShareData, course])

  const handleShareWhatsapp = useCallback(() => {
    if (!courseShareData || !course) return

    // Usa a URL do frontend que funciona corretamente
    const message = `${course.title}${course.description ? `\n\n${course.description.substring(0, 150)}${course.description.length > 150 ? '...' : ''}` : ''}\n\n${courseShareData.url}`
    const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`

    if (typeof window !== 'undefined') {
      window.open(waUrl, '_blank', 'noopener,noreferrer')
    }
  }, [courseShareData, course])

  const handleCopyLink = useCallback(async () => {
    if (!courseShareData) return

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(courseShareData.url)
        setCopyStatus('success')
        setTimeout(() => setCopyStatus('idle'), 2000)
      }
    } catch (error) {
    }
  }, [courseShareData])

  const openShareModal = useCallback(() => {
    setCopyStatus('idle')
    setShareModalOpen(true)
  }, [])

  const closeShareModal = useCallback(() => {
    setShareModalOpen(false)
  }, [])

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || !selectedLesson) return

    setSubmittingComment(true)
    try {
      const comment = await apiFetch(
        `/lessons/${selectedLesson.id}/comments`,
        {
          method: 'POST',
          auth: true,
          body: JSON.stringify({ content: newComment }),
        },
      )
      setComments([comment, ...comments])
      setNewComment('')
    } catch (error) {
    } finally {
      setSubmittingComment(false)
    }
  }

  if (loading) {
    return <LoadingScreen />
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Curso não encontrado</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-2">
          <div className="flex flex-col md:flex-row items-center justify-between space-y-2 md:space-y-0">
            <Link to="/" className="flex items-center">
              <img src="/logo B.png"
                alt="Link de Cadastro"
                
                
                className="h-20 md:h-24 w-auto object-contain"
                
              />
            </Link>
            <nav className="flex items-center space-x-4 md:space-x-6 text-sm md:text-base">
              <Link to="/courses" className="text-gray-700 hover:text-[#FF6600]">Cursos</Link>
              <Link to="/my-courses" className="text-gray-700 hover:text-[#FF6600]">Meus Cursos</Link>
              <NotificationBell />
              
              <Link to="/profile" className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#FF6600] text-white font-bold flex items-center justify-center">
                A
              </Link>
            </nav>
          </div>
        </div>
      </header>

      
      <div className="bg-gray-100 py-2">
        <div className="container mx-auto px-4">
          <nav className="text-xs md:text-sm text-gray-600">
            <Link to="/courses" className="hover:text-[#FF6600]">Cursos</Link>
            {' / '}
            <Link to="/my-courses" className="hover:text-[#FF6600]">Meus Cursos</Link>
            {' / '}
            <span className="text-gray-900">{course.title}</span>
          </nav>
        </div>
      </div>

      
      <div className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-4 md:py-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold text-[#003366] mb-2">{course.title}</h1>
              {course.description && (
                <p className="text-gray-600 text-sm md:text-base">{course.description}</p>
              )}
            </div>
            <div className="flex flex-none items-center gap-3">
              <button
                onClick={openShareModal}
                className="inline-flex items-center gap-2 bg-[#FF6600] text-white px-4 py-2 rounded-md font-semibold hover:bg-[#e55a00] transition-colors"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-6.219-8.56"
                  />
                </svg>
                Compartilhar
              </button>
              <button
                onClick={openShareModal}
                className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md font-semibold hover:bg-green-700 transition-colors"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.52 3.48A11.77 11.77 0 0 0 12.02 0 11.84 11.84 0 0 0 .15 11.85a11.6 11.6 0 0 0 1.58 5.84L0 24l6.42-1.68a11.85 11.85 0 0 0 5.6 1.42h.01A11.84 11.84 0 0 0 24 11.86a11.7 11.7 0 0 0-3.48-8.38ZM12 21.15h-.01a9.9 9.9 0 0 1-5.04-1.38l-.36-.21-3.81.99 1.02-3.7-.23-.38a9.84 9.84 0 0 1 8.43-15.1h.01a9.8 9.8 0 0 1 9.82 9.84A9.86 9.86 0 0 1 12 21.15Zm5.41-7.36c-.3-.15-1.77-.87-2.04-.97s-.47-.15-.66.15-.76.97-.93 1.17-.34.22-.63.07a8.07 8.07 0 0 1-2.37-1.46 8.84 8.84 0 0 1-1.62-2 1.77 1.77 0 0 1 .11-1.86c.18-.23.4-.48.6-.73s.25-.38.37-.62.06-.45 0-.62-.66-1.59-.91-2.18-.5-.5-.68-.51h-.58a1.12 1.12 0 0 0-.81.38 3.36 3.36 0 0 0-1.06 2.5 5.86 5.86 0 0 0 1.24 3.13 13.35 13.35 0 0 0 5.15 4.52 5.9 5.9 0 0 0 2.4.73 2 2 0 0 0 1.31-.86 1.6 1.6 0 0 0 .11-.86c-.05-.09-.27-.17-.57-.31Z" />
                </svg>
                WhatsApp
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4 md:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-8">
          
          <div className="lg:col-span-1 order-2 lg:order-1">
            <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
              <h3 className="text-base md:text-lg font-semibold mb-4 text-[#003366]">Aulas do Curso</h3>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {course.lessons?.map((lesson: any, index: number) => {
                  const lessonProgress = course.enrollment?.course?.lessons?.find((l: any) => l.id === lesson.id)?.progress?.[0]
                  const isCompleted = lessonProgress?.completed || false
                  return (
                    <button
                      key={lesson.id}
                      onClick={() => setSelectedLesson(lesson)}
                      className={`w-full text-left p-2 md:p-3 rounded-lg transition-colors text-sm md:text-base ${
                        selectedLesson?.id === lesson.id
                          ? 'bg-[#FF6600] text-white'
                          : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          selectedLesson?.id === lesson.id
                            ? 'bg-white text-[#FF6600]'
                            : isCompleted
                            ? 'bg-green-500 text-white'
                            : 'bg-[#FF6600] text-white'
                        }`}>
                          {isCompleted ? '✓' : index + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{lesson.title}</div>
                          {lesson.duration && (
                            <div className="text-xs opacity-75">{lesson.duration}</div>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>

              
              <div className="mt-4 md:mt-6 pt-4 md:pt-6 border-t border-gray-200">
                <h4 className="text-xs md:text-sm font-semibold mb-3 text-[#003366]">Informações do Curso</h4>
                <div className="space-y-2 text-xs md:text-sm text-gray-600">
                  <div>
                    <span className="font-medium">Data:</span> 22/04/2024
                  </div>
                  <div>
                    <span className="font-medium">Local:</span> Recife - PE
                  </div>
                  <div>
                    <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                      Em Andamento
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          
          <div className="lg:col-span-3 order-1 lg:order-2 space-y-4 md:space-y-6">
            
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              {selectedLesson?.videoUrl ? (
                <div className="aspect-video bg-black">
                  <ReactPlayer
                    url={selectedLesson.videoUrl}
                    width="100%"
                    height="100%"
                    controls
                    onProgress={handleVideoProgress}
                  />
                </div>
              ) : (
                <div className="aspect-video bg-gray-200 flex items-center justify-center">
                  <p className="text-gray-500">Nenhum vídeo disponível</p>
                </div>
              )}

              <div className="p-4 md:p-6">
                <h2 className="text-xl md:text-2xl font-bold mb-2 text-[#003366]">
                  {selectedLesson?.title || 'Selecione uma aula'}
                </h2>
                {selectedLesson?.duration && (
                  <p className="text-gray-600 mb-4 text-sm md:text-base">
                    Duração: {selectedLesson.duration}
                  </p>
                )}
                {selectedLesson?.description && (
                  <p className="text-gray-700 text-sm md:text-base">{selectedLesson.description}</p>
                )}
              </div>
            </div>

            
            <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
              <h3 className="text-lg md:text-xl font-semibold mb-4 text-[#003366]">
                Comentários ({comments.length})
              </h3>
              

              
              <form onSubmit={handleSubmitComment} className="mb-6">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Deixe seu comentário sobre esta aula..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-sm md:text-base"
                />
                <button
                  type="submit"
                  disabled={submittingComment || !newComment.trim()}
                  className="mt-2 bg-[#FF6600] text-white px-4 py-2 rounded-md font-semibold hover:bg-[#e55a00] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base"
                >
                  {submittingComment ? 'Enviando...' : 'Comentar'}
                </button>
              </form>

              
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="border-b border-gray-200 pb-4 last:border-0">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#FF6600] text-white flex items-center justify-center font-bold text-sm md:text-base">
                        {comment.user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-semibold text-[#003366] text-sm md:text-base">
                            {comment.user.name}
                          </span>
                          <span className="text-xs md:text-sm text-gray-500">
                            {formatDistanceToNow(new Date(comment.createdAt), {
                              addSuffix: true,
                              locale: ptBR
                            })}
                          </span>
                        </div>
                        <p className="text-gray-700 text-sm md:text-base whitespace-pre-wrap break-words">
                          {comment.content}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                {comments.length === 0 && (
                  <p className="text-center text-gray-500 py-8 text-sm md:text-base">
                    Nenhum comentário ainda. Seja o primeiro a comentar!
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {shareModalOpen && courseShareData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-[#003366]">Compartilhar curso</h3>
                <p className="text-sm text-gray-500">Revise como o link aparecerá antes de enviar</p>
              </div>
              <button
                onClick={closeShareModal}
                className="text-gray-400 transition-colors hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid gap-4 px-6 py-4 md:grid-cols-[160px,1fr]">
              <div className="flex items-center justify-center">
                {courseShareData.bannerUrl ? (
                  <img
                    src={normalizeImageUrl(courseShareData.bannerUrl)} alt={`Banner do curso ${course.title}`}
                    className="h-32 w-32 rounded-lg object-cover shadow-sm"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex h-32 w-32 items-center justify-center rounded-lg bg-gradient-to-br from-[#003366] to-[#FF6600] text-center text-xs font-semibold text-white">
                    Sem banner
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#003366]">{course.title}</p>
                  {course.description && (
                    <p className="mt-1 text-sm text-gray-600 line-clamp-3">{course.description}</p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Link do curso</label>
                  <div className="mt-1 grid grid-cols-[1fr,auto] gap-2 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                    <input
                      readOnly
                      value={courseShareData.url}
                      className="truncate bg-transparent px-3 py-2 text-sm text-gray-700 outline-none"
                    />
                    <button
                      onClick={handleCopyLink}
                      className="m-1 flex items-center justify-center rounded-md bg-white px-3 text-xs font-semibold text-[#003366] transition-colors hover:bg-gray-100"
                    >
                      {copyStatus === 'success' ? 'Copiado!' : 'Copiar'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t bg-gray-50 px-6 py-4 md:flex-row md:justify-end">
              <button
                onClick={handleShareCourse}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#003366] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#00264d]"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12v.01M12 12v.01M20 12v.01M7 12a5 5 0 0110 0" />
                </svg>
                Compartilhar agora
              </button>
              <button
                onClick={handleShareWhatsapp}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.52 3.48A11.77 11.77 0 0 0 12.02 0 11.84 11.84 0 0 0 .15 11.85a11.6 11.6 0 0 0 1.58 5.84L0 24l6.42-1.68a11.85 11.85 0 0 0 5.6 1.42h.01A11.84 11.84 0 0 0 24 11.86a11.7 11.7 0 0 0-3.48-8.38ZM12 21.15h-.01a9.9 9.9 0 0 1-5.04-1.38l-.36-.21-3.81.99 1.02-3.7-.23-.38a9.84 9.84 0 0 1 8.43-15.1h.01a9.8 9.8 0 0 1 9.82 9.84A9.86 9.86 0 0 1 12 21.15Zm5.41-7.36c-.3-.15-1.77-.87-2.04-.97s-.47-.15-.66.15-.76.97-.93 1.17-.34.22-.63.07a8.07 8.07 0 0 1-2.37-1.46 8.84 8.84 0 0 1-1.62-2 1.77 1.77 0 0 1 .11-1.86c.18-.23.4-.48.6-.73s.25-.38.37-.62.06-.45 0-.62-.66-1.59-.91-2.18-.5-.5-.68-.51h-.58a1.12 1.12 0 0 0-.81.38 3.36 3.36 0 0 0-1.06 2.5 5.86 5.86 0 0 0 1.24 3.13 13.35 13.35 0 0 0 5.15 4.52 5.9 5.9 0 0 0 2.4.73 2 2 0 0 0 1.31-.86 1.6 1.6 0 0 0 .11-.86c-.05-.09-.27-.17-.57-.31Z" />
                </svg>
                WhatsApp
              </button>
              <button
                onClick={closeShareModal}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-100"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  )
}

