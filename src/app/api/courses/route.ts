import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const filter = searchParams.get('filter') // 'available', 'ongoing', 'all'

    const now = new Date()

    let whereClause: any = { status: 'ACTIVE' }

    if (filter === 'available') {
      // Cursos disponíveis para inscrição: ainda não começaram ou estão em andamento
      whereClause = {
        status: 'ACTIVE',
        OR: [
          { startDate: null }, // Sem data de início
          { startDate: { gte: now } }, // Ainda não começou
          {
            startDate: { lte: now },
            OR: [
              { endDate: null },
              { endDate: { gte: now } }
            ]
          } // Em andamento
        ]
      }
    } else if (filter === 'ongoing') {
      // Cursos em andamento: já começaram e ainda não terminaram
      whereClause = {
        status: 'ACTIVE',
        AND: [
          {
            OR: [
              { startDate: null },
              { startDate: { lte: now } }
            ]
          },
          {
            OR: [
              { endDate: null },
              { endDate: { gte: now } }
            ]
          }
        ]
      }
    }

    const courses = await prisma.course.findMany({
      where: whereClause,
      select: {
        id: true,
        title: true,
        description: true,
        bannerUrl: true, // Garantir que bannerUrl seja retornado
        status: true,
        type: true,
        maxEnrollments: true,
        startDate: true,
        endDate: true,
        slug: true,
        createdAt: true,
        updatedAt: true,
        createdBy: true,
        creator: {
          select: {
            name: true
          }
        },
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
            enrollments: true,
            lessons: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(courses)
  } catch (error) {
    console.error('Erro ao buscar cursos:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar cursos' },
      { status: 500 }
    )
  }
}

