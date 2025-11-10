import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateCourseSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').optional(),
  description: z.string().optional(),
  bannerUrl: z.string().optional().or(z.literal('')).refine(
    (val) => !val || val.startsWith('/') || val.startsWith('http://') || val.startsWith('https://'),
    { message: 'URL inválida' }
  ),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  type: z.enum(['PRESENCIAL', 'ONLINE']).optional(),
  maxEnrollments: z.union([z.number().int().positive(), z.null()]).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  slug: z.string().optional().or(z.literal('')).refine(
    (val) => !val || val.trim() === '' || /^[a-z0-9-]+$/.test(val),
    { message: 'URL personalizada inválida' }
  ),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const course = await prisma.course.findUnique({
      where: { id: params.courseId },
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
            name: true,
            email: true
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
            enrollments: true
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

    return NextResponse.json(course)
  } catch (error) {
    console.error('Erro ao buscar curso:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar curso' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Verificar se o curso existe
    const course = await prisma.course.findUnique({
      where: { id: params.courseId }
    })

    if (!course) {
      return NextResponse.json(
        { error: 'Curso não encontrado' },
        { status: 404 }
      )
    }

    // Excluir o curso (cascata vai excluir aulas, inscrições, etc)
    await prisma.course.delete({
      where: { id: params.courseId }
    })

    return NextResponse.json({ message: 'Curso excluído com sucesso' })
  } catch (error) {
    console.error('Erro ao excluir curso:', error)
    return NextResponse.json(
      { error: 'Erro ao excluir curso' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Verificar se o curso existe e pertence ao admin
    const existingCourse = await prisma.course.findUnique({
      where: { id: params.courseId }
    })

    if (!existingCourse) {
      return NextResponse.json(
        { error: 'Curso não encontrado' },
        { status: 404 }
      )
    }

    if (existingCourse.createdBy !== session.user.id) {
      return NextResponse.json(
        { error: 'Sem permissão para editar este curso' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = updateCourseSchema.parse(body)

    // Tratar bannerUrl: se for string vazia ou undefined, manter o valor atual, senão atualizar
    let finalBannerUrl: string | null | undefined = undefined
    if (validatedData.bannerUrl !== undefined) {
      if (validatedData.bannerUrl && validatedData.bannerUrl.trim()) {
        finalBannerUrl = validatedData.bannerUrl.trim()
      } else {
        finalBannerUrl = null
      }
    }

    // Preparar dados para atualização
    const updateData: any = {}
    if (validatedData.title !== undefined) updateData.title = validatedData.title
    if (validatedData.description !== undefined) updateData.description = validatedData.description || null
    if (finalBannerUrl !== undefined) updateData.bannerUrl = finalBannerUrl
    if (validatedData.status !== undefined) updateData.status = validatedData.status
    if (validatedData.type !== undefined) updateData.type = validatedData.type
    if (validatedData.maxEnrollments !== undefined) updateData.maxEnrollments = validatedData.maxEnrollments || null
    if (validatedData.startDate !== undefined) updateData.startDate = validatedData.startDate ? new Date(validatedData.startDate) : null
    if (validatedData.endDate !== undefined) updateData.endDate = validatedData.endDate ? new Date(validatedData.endDate) : null
    if (validatedData.slug !== undefined) {
      updateData.slug = validatedData.slug && validatedData.slug.trim() ? validatedData.slug.trim().toLowerCase() : null
    }

    const updatedCourse = await prisma.course.update({
      where: { id: params.courseId },
      data: updateData,
      include: {
        creator: {
          select: {
            name: true,
            email: true
          }
        },
        lessons: {
          orderBy: { order: 'asc' }
        },
        _count: {
          select: {
            enrollments: true
          }
        }
      }
    })

    return NextResponse.json(updatedCourse)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Dados inválidos',
        details: error.errors 
      }, { status: 400 })
    }
    console.error('Erro ao atualizar curso:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar curso' },
      { status: 500 }
    )
  }
}

