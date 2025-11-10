import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    const course = await prisma.course.findUnique({
      where: { id: params.courseId },
      include: {
        creator: {
          select: {
            name: true,
            email: true
          }
        },
        lessons: {
          orderBy: { order: 'asc' },
          include: {
            _count: {
              select: {
                comments: true
              }
            }
          }
        }
      }
    })

    if (!course) {
      return NextResponse.json(
        { error: 'Curso não encontrado' },
        { status: 404 }
      )
    }

    // Se o usuário está logado, incluir progresso
    if (session) {
      const enrollment = await prisma.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId: session.user.id,
            courseId: params.courseId
          }
        },
        include: {
          course: {
            include: {
              lessons: {
                include: {
                  progress: {
                    where: {
                      userId: session.user.id
                    }
                  }
                }
              }
            }
          }
        }
      })

      if (enrollment) {
        return NextResponse.json({
          ...course,
          enrollment,
          progress: enrollment.progress
        })
      }
    }

    return NextResponse.json(course)
  } catch (error) {
    console.error('Erro ao buscar curso:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar curso' },
      { status: 500 }
    )
  }
}

