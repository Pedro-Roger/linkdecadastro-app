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

    const coursesEnrolled = await prisma.enrollment.count({
      where: { userId: session.user.id }
    })

    const lessonsCompleted = await prisma.lessonProgress.count({
      where: {
        userId: session.user.id,
        completed: true
      }
    })

    const enrollments = await prisma.enrollment.findMany({
      where: { userId: session.user.id },
      select: { progress: true }
    })

    const totalProgress = enrollments.length > 0
      ? Math.round(
          enrollments.reduce((sum, e) => sum + e.progress, 0) / enrollments.length
        )
      : 0

    return NextResponse.json({
      coursesEnrolled,
      lessonsCompleted,
      totalProgress
    })
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar estatísticas' },
      { status: 500 }
    )
  }
}

