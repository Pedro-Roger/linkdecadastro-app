'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import ReactPlayer from 'react-player/youtube'
import Link from 'next/link'
import Image from 'next/image'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import NotificationBell from '@/components/notifications/NotificationBell'
import Footer from '@/components/ui/Footer'

export default function CourseBySlugPage() {
  const params = useParams()
  const { data: session, status } = useSession()
  const router = useRouter()
  const slug = params.slug as string
  
  const [course, setCourse] = useState<any>(null)
  const [selectedLesson, setSelectedLesson] = useState<any>(null)
  const [comments, setComments] = useState<any[]>([])
  const [newComment, setNewComment] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [progress, setProgress] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [enrolled, setEnrolled] = useState(false)

  useEffect(() => {
    if (slug) {
      fetchCourse()
    }
  }, [slug])

  useEffect(() => {
    if (course && status === 'authenticated') {
      checkEnrollment()
      if (selectedLesson) {
        fetchComments()
        fetchProgress()
      }
    }
  }, [course, selectedLesson, status])

  async function fetchCourse() {
    try {
      const res = await fetch(`/api/courses/slug/${slug}`)
      if (res.ok) {
        const data = await res.json()
        // Debug: verificar se bannerUrl está presente
        console.log('Curso recebido (slug):', { id: data.id, title: data.title, bannerUrl: data.bannerUrl })
        setCourse(data)
        if (data.lessons && data.lessons.length > 0) {
          setSelectedLesson(data.lessons[0])
        }
      } else {
        router.push('/')
      }
    } catch (error) {
      console.error(error)
      router.push('/')
    } finally {
      setLoading(false)
    }
  }

  async function checkEnrollment() {
    if (!session || !course) return
    
    try {
      const res = await fetch(`/api/courses/${course.id}/enrollments/check`)
      if (res.ok) {
        const data = await res.json()
        setEnrolled(data.enrolled || false)
      }
    } catch (error) {
      console.error(error)
    }
  }

  async function fetchComments() {
    if (!selectedLesson) return
    
    try {
      const res = await fetch(`/api/lessons/${selectedLesson.id}/comments`)
      if (res.ok) {
        const data = await res.json()
        setComments(data)
      }
    } catch (error) {
      console.error(error)
    }
  }

  async function fetchProgress() {
    if (!selectedLesson || !session) return
    
    try {
      const res = await fetch(`/api/lessons/${selectedLesson.id}/progress`)
      if (res.ok) {
        const data = await res.json()
        setProgress(data)
      }
    } catch (error) {
      console.error(error)
    }
  }

  const handleEnroll = async () => {
    if (!session) {
      router.push('/login')
      return
    }

    try {
      const res = await fetch(`/api/courses/${course.id}/enroll`, {
        method: 'POST'
      })

      if (res.ok) {
        setEnrolled(true)
        router.push(`/course/${course.id}`)
      } else {
        const errorData = await res.json()
        alert(errorData.error || 'Erro ao inscrever no curso')
      }
    } catch (error) {
      console.error('Erro ao inscrever:', error)
      alert('Erro ao inscrever no curso')
    }
  }

  const handleVideoProgress = async (progress: any) => {
    if (!selectedLesson || !session || !progress.playedSeconds) return

    try {
      await fetch(`/api/lessons/${selectedLesson.id}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          watchedTime: Math.floor(progress.playedSeconds),
          completed: progress.played >= 0.9
        })
      })
    } catch (error) {
      console.error('Erro ao salvar progresso:', error)
    }
  }

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedLesson || !session || !newComment.trim()) return

    setSubmittingComment(true)
    try {
      const res = await fetch(`/api/lessons/${selectedLesson.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment })
      })

      if (res.ok) {
        setNewComment('')
        fetchComments()
      }
    } catch (error) {
      console.error('Erro ao comentar:', error)
    } finally {
      setSubmittingComment(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Carregando...</div>
      </div>
    )
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
      {/* Header Responsivo */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-2">
          <div className="flex flex-col md:flex-row items-center justify-between space-y-2 md:space-y-0">
            <Link href="/" className="flex items-center">
              <Image
                src="/logo B.png"
                alt="Link de Cadastro"
                width={300}
                height={100}
                className="h-20 md:h-24 w-auto object-contain"
                priority
              />
            </Link>
            <nav className="flex items-center space-x-4 md:space-x-6 text-sm md:text-base">
              {session ? (
                <>
                  <Link href="/courses" className="text-gray-700 hover:text-[#FF6600]">Cursos</Link>
                  <Link href="/my-courses" className="text-gray-700 hover:text-[#FF6600]">Meus Cursos</Link>
                  <NotificationBell />
                  <Link href="/profile" className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#FF6600] text-white font-bold flex items-center justify-center">
                    {session.user?.name?.charAt(0).toUpperCase() || 'A'}
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/login" className="text-gray-700 hover:text-[#FF6600]">Entrar</Link>
                  <Link href="/register" className="bg-[#FF6600] text-white px-4 py-2 rounded-md font-semibold hover:bg-[#e55a00] transition-colors">
                    Cadastrar
                  </Link>
                </>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Informações do Curso */}
      <div className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-4 md:py-6">
          <Link href="/" className="text-[#FF6600] hover:underline mb-4 inline-block">
            ← Voltar para Início
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-[#003366] mb-2">{course.title}</h1>
          {course.description && (
            <p className="text-gray-600 text-sm md:text-base">{course.description}</p>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">

        {!enrolled && session ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <p className="text-blue-800 mb-4">Você precisa se inscrever neste curso para assistir às aulas.</p>
            <button
              onClick={handleEnroll}
              className="bg-[#FF6600] text-white px-6 py-3 rounded-md font-semibold hover:bg-[#e55a00] transition-colors"
            >
              Inscrever-se no Curso
            </button>
          </div>
        ) : !session ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
            <p className="text-yellow-800 mb-4">Faça login para assistir às aulas deste curso.</p>
            <Link
              href="/login"
              className="bg-[#FF6600] text-white px-6 py-3 rounded-md font-semibold hover:bg-[#e55a00] transition-colors inline-block"
            >
              Fazer Login
            </Link>
          </div>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-8">
          {/* Sidebar - Aulas */}
          <div className="lg:col-span-1 order-2 lg:order-1">
            <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
              <h3 className="text-base md:text-lg font-semibold mb-4 text-[#003366]">Aulas do Curso</h3>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {course.lessons?.map((lesson: any, index: number) => {
                  const lessonProgress = progress
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
                        <span className="font-semibold flex-shrink-0">{index + 1}.</span>
                        <span className="flex-1">{lesson.title}</span>
                        {isCompleted && (
                          <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Main Content - Video Player e Comentários */}
          <div className="lg:col-span-3 order-1 lg:order-2 space-y-4 md:space-y-6">
            {/* Video Player */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              {selectedLesson?.videoUrl && enrolled ? (
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
                  <p className="text-gray-500">
                    {!enrolled ? 'Inscreva-se no curso para assistir às aulas' : 'Nenhum vídeo disponível'}
                  </p>
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

            {/* Comentários */}
            {enrolled && selectedLesson && (
              <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
                <h3 className="text-lg md:text-xl font-semibold mb-4 text-[#003366]">
                  Comentários ({comments.length})
                </h3>

                {/* Formulário de Comentário */}
                <form onSubmit={handleSubmitComment} className="mb-6">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Deixe seu comentário sobre esta aula..."
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-sm md:text-base text-gray-900"
                  />
                  <button
                    type="submit"
                    disabled={submittingComment || !newComment.trim()}
                    className="mt-2 bg-[#FF6600] text-white px-4 py-2 rounded-md font-semibold hover:bg-[#e55a00] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base"
                  >
                    {submittingComment ? 'Enviando...' : 'Comentar'}
                  </button>
                </form>

                {/* Lista de Comentários */}
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
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}

