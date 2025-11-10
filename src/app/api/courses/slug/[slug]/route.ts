import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const course = await prisma.course.findFirst({
      where: { slug: params.slug },
      include: {
        creator: {
          select: {
            name: true,
            email: true
          }
        },
        lessons: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            title: true,
            description: true,
            videoUrl: true,
            bannerUrl: true,
            duration: true,
            order: true
          }
        },
        _count: {
          select: {
            enrollments: true,
            lessons: true
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

    if (course.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Curso não está disponível' },
        { status: 403 }
      )
    }

    return NextResponse.json(course)
  } catch (error) {
    console.error('Erro ao buscar curso por slug:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar curso' },
      { status: 500 }
    )
  }
}

