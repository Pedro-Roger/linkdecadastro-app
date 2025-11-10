import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const enrollments = await prisma.enrollment.findMany({
      where: { userId: session.user.id },
      include: {
        course: {
          include: {
            lessons: {
              orderBy: { order: 'asc' },
              select: {
                id: true,
                title: true,
                order: true
              }
            },
            _count: {
              select: {
                lessons: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Calcular progresso para cada curso
    const coursesWithProgress = await Promise.all(
      enrollments.map(async (enrollment) => {
        const completedLessons = await prisma.lessonProgress.count({
          where: {
            userId: session.user.id,
            completed: true,
            lesson: {
              courseId: enrollment.courseId
            }
          }
        })

        return {
          ...enrollment.course,
          progress: enrollment.progress,
          completedLessons,
          totalLessons: enrollment.course._count.lessons
        }
      })
    )

    return NextResponse.json(coursesWithProgress)
  } catch (error) {
    console.error('Erro ao buscar meus cursos:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar meus cursos' },
      { status: 500 }
    )
  }
}

