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
  { params }: { params: { courseId: string; lessonId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const lesson = await prisma.lesson.findUnique({
      where: { id: params.lessonId },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            createdBy: true
          }
        }
      }
    })

    if (!lesson) {
      return NextResponse.json(
        { error: 'Aula não encontrada' },
        { status: 404 }
      )
    }

    // Verificar se o curso pertence ao admin
    if (lesson.course.createdBy !== session.user.id) {
      return NextResponse.json(
        { error: 'Sem permissão' },
        { status: 403 }
      )
    }

    return NextResponse.json(lesson)
  } catch (error) {
    console.error('Erro ao buscar aula:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar aula' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { courseId: string; lessonId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Verificar se a aula existe e pertence ao curso do admin
    const lesson = await prisma.lesson.findUnique({
      where: { id: params.lessonId },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            createdBy: true
          }
        }
      }
    })

    if (!lesson) {
      return NextResponse.json(
        { error: 'Aula não encontrada' },
        { status: 404 }
      )
    }

    if (lesson.course.createdBy !== session.user.id) {
      return NextResponse.json(
        { error: 'Sem permissão' },
        { status: 403 }
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

    const updatedLesson = await prisma.lesson.update({
      where: { id: params.lessonId },
      data: {
        title: data.title,
        description: data.description || null,
        videoUrl: `https://www.youtube.com/watch?v=${youtubeId}`, // Normalizar URL
        bannerUrl: finalBannerUrl,
        duration: data.duration || null,
        order: data.order
      }
    })

    return NextResponse.json(updatedLesson)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Erro ao atualizar aula:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar aula' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { courseId: string; lessonId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Verificar se a aula existe e pertence ao curso do admin
    const lesson = await prisma.lesson.findUnique({
      where: { id: params.lessonId },
      include: {
        course: {
          select: {
            id: true,
            createdBy: true
          }
        }
      }
    })

    if (!lesson) {
      return NextResponse.json(
        { error: 'Aula não encontrada' },
        { status: 404 }
      )
    }

    if (lesson.course.createdBy !== session.user.id) {
      return NextResponse.json(
        { error: 'Sem permissão' },
        { status: 403 }
      )
    }

    await prisma.lesson.delete({
      where: { id: params.lessonId }
    })

    return NextResponse.json({ message: 'Aula excluída com sucesso' })
  } catch (error) {
    console.error('Erro ao excluir aula:', error)
    return NextResponse.json(
      { error: 'Erro ao excluir aula' },
      { status: 500 }
    )
  }
}

