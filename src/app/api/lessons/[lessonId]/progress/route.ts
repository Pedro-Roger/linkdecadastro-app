import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const progressSchema = z.object({
  watchedTime: z.number().int().min(0),
  completed: z.boolean().default(false),
})

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
    const data = progressSchema.parse(body)

    // Buscar aula e curso
    const lesson = await prisma.lesson.findUnique({
      where: { id: params.lessonId },
      include: {
        course: true
      }
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
        { error: 'Você não está inscrito neste curso' },
        { status: 403 }
      )
    }

    // Atualizar ou criar progresso
    const progress = await prisma.lessonProgress.upsert({
      where: {
        userId_lessonId: {
          userId: session.user.id,
          lessonId: params.lessonId
        }
      },
      update: {
        watchedTime: data.watchedTime,
        completed: data.completed,
        completedAt: data.completed ? new Date() : null
      },
      create: {
        userId: session.user.id,
        lessonId: params.lessonId,
        watchedTime: data.watchedTime,
        completed: data.completed,
        completedAt: data.completed ? new Date() : null
      }
    })

    // Se completou a aula, atualizar progresso do curso
    if (data.completed) {
      const totalLessons = await prisma.lesson.count({
        where: { courseId: lesson.courseId }
      })

      const completedLessons = await prisma.lessonProgress.count({
        where: {
          userId: session.user.id,
          completed: true,
          lesson: {
            courseId: lesson.courseId
          }
        }
      })

      const courseProgress = Math.round((completedLessons / totalLessons) * 100)

      await prisma.enrollment.update({
        where: {
          userId_courseId: {
            userId: session.user.id,
            courseId: lesson.courseId
          }
        },
        data: {
          progress: courseProgress,
          completedAt: courseProgress === 100 ? new Date() : null
        }
      })

      // Criar notificação de conclusão
      await prisma.notification.create({
        data: {
          userId: session.user.id,
          type: 'LESSON_COMPLETED',
          title: 'Aula concluída!',
          message: `Você concluiu a aula "${lesson.title}"`,
          link: `/course/${lesson.courseId}`
        }
      })
    }

    return NextResponse.json(progress)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Erro ao atualizar progresso:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar progresso' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { lessonId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const progress = await prisma.lessonProgress.findUnique({
      where: {
        userId_lessonId: {
          userId: session.user.id,
          lessonId: params.lessonId
        }
      }
    })

    return NextResponse.json(progress || { completed: false, watchedTime: 0 })
  } catch (error) {
    console.error('Erro ao buscar progresso:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar progresso' },
      { status: 500 }
    )
  }
}

