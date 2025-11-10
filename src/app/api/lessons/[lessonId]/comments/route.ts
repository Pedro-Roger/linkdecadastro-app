import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const commentSchema = z.object({
  content: z.string().min(1, 'Comentário não pode estar vazio').max(1000),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { lessonId: string } }
) {
  try {
    const comments = await prisma.comment.findMany({
      where: { lessonId: params.lessonId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(comments)
  } catch (error) {
    console.error('Erro ao buscar comentários:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar comentários' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { lessonId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const data = commentSchema.parse(body)

    // Verificar se a aula existe
    const lesson = await prisma.lesson.findUnique({
      where: { id: params.lessonId },
      include: { course: true }
    })

    if (!lesson) {
      return NextResponse.json(
        { error: 'Aula não encontrada' },
        { status: 404 }
      )
    }

    // Verificar se o usuário está inscrito no curso
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId: lesson.courseId
        }
      }
    })

    if (!enrollment) {
      return NextResponse.json(
        { error: 'Você precisa estar inscrito no curso para comentar' },
        { status: 403 }
      )
    }

    const comment = await prisma.comment.create({
      data: {
        userId: session.user.id,
        lessonId: params.lessonId,
        content: data.content
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            email: true
          }
        }
      }
    })

    // Criar notificação para o criador do curso (se não for o próprio usuário)
    if (lesson.course.createdBy !== session.user.id) {
      await prisma.notification.create({
        data: {
          userId: lesson.course.createdBy,
          type: 'NEW_COMMENT',
          title: 'Novo comentário',
          message: `${session.user.name} comentou na aula "${lesson.title}"`,
          link: `/course/${lesson.courseId}`
        }
      })
    }

    return NextResponse.json(comment, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Erro ao criar comentário:', error)
    return NextResponse.json(
      { error: 'Erro ao criar comentário' },
      { status: 500 }
    )
  }
}

