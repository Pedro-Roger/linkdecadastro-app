import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const lessonSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional(),
  videoUrl: z.string().url('URL do YouTube inválida'),
  bannerUrl: z.string().optional().or(z.literal('')).refine(
    (val) => !val || val.startsWith('/') || val.startsWith('http://') || val.startsWith('https://'),
    { message: 'URL inválida' }
  ),
  duration: z.string().optional(),
  order: z.number().int().min(0),
})

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }

  return null
}

export async function GET(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const lessons = await prisma.lesson.findMany({
      where: { courseId: params.courseId },
      orderBy: { order: 'asc' },
      include: {
        _count: {
          select: {
            comments: true,
            progress: true
          }
        }
      }
    })

    return NextResponse.json(lessons)
  } catch (error) {
    console.error('Erro ao buscar aulas:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar aulas' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Verificar se o curso existe e pertence ao admin
    const course = await prisma.course.findUnique({
      where: { id: params.courseId }
    })

    if (!course || course.createdBy !== session.user.id) {
      return NextResponse.json(
        { error: 'Curso não encontrado ou sem permissão' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const data = lessonSchema.parse(body)

    // Extrair ID do YouTube da URL
    const youtubeId = extractYouTubeId(data.videoUrl)
    if (!youtubeId) {
      return NextResponse.json(
        { error: 'URL do YouTube inválida' },
        { status: 400 }
      )
    }

    // Se não houver bannerUrl fornecido, extrair automaticamente do YouTube
    let finalBannerUrl = data.bannerUrl && data.bannerUrl.trim() ? data.bannerUrl.trim() : null
    if (!finalBannerUrl) {
      // Extrair thumbnail do YouTube automaticamente
      finalBannerUrl = `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`
    }

    const lesson = await prisma.lesson.create({
      data: {
        title: data.title,
        description: data.description || null,
        videoUrl: `https://www.youtube.com/watch?v=${youtubeId}`, // Normalizar URL
        bannerUrl: finalBannerUrl,
        duration: data.duration || null,
        order: data.order,
        courseId: params.courseId
      }
    })

    // Criar notificação para todos os alunos inscritos
    const enrollments = await prisma.enrollment.findMany({
      where: { courseId: params.courseId },
      select: { userId: true }
    })

    await prisma.notification.createMany({
      data: enrollments.map(enrollment => ({
        userId: enrollment.userId,
        type: 'COURSE_UPDATED',
        title: 'Nova aula disponível',
        message: `Uma nova aula foi adicionada ao curso "${course.title}": ${data.title}`,
        link: `/course/${params.courseId}`
      }))
    })

    return NextResponse.json(lesson, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Erro ao criar aula:', error)
    return NextResponse.json(
      { error: 'Erro ao criar aula' },
      { status: 500 }
    )
  }
}

