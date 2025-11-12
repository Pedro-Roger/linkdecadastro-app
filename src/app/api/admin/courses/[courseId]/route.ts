import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const regionQuotaSchema = z.object({
  id: z.string().optional(),
  state: z.string().min(2, 'Estado é obrigatório'),
  city: z.string().optional(),
  limit: z.number().int().nonnegative('Limite deve ser zero ou maior'),
  waitlistLimit: z.number().int().nonnegative('Limite da lista de espera deve ser zero ou maior').optional()
})

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
  waitlistEnabled: z.boolean().optional(),
  waitlistLimit: z.number().int().nonnegative().optional(),
  regionRestrictionEnabled: z.boolean().optional(),
  allowAllRegions: z.boolean().optional(),
  defaultRegionLimit: z.union([z.number().int().nonnegative(), z.null()]).optional(),
  regionQuotas: z.array(regionQuotaSchema).optional(),
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
            order: true
          }
        },
        regionQuotas: true,
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

    const normalizedRegionQuotas = validatedData.regionQuotas
      ? validatedData.regionQuotas.map((quota) => ({
          id: quota.id ?? null,
          state: quota.state.trim().toUpperCase(),
          city: quota.city ? quota.city.trim() : null,
          limit: quota.limit,
          waitlistLimit: quota.waitlistLimit ?? 0
        }))
      : null

    // Preparar dados para atualização
    const updateData: any = {}
    if (validatedData.title !== undefined) updateData.title = validatedData.title
    if (validatedData.description !== undefined) updateData.description = validatedData.description || null
    if (finalBannerUrl !== undefined) updateData.bannerUrl = finalBannerUrl
    if (validatedData.status !== undefined) updateData.status = validatedData.status
    if (validatedData.type !== undefined) updateData.type = validatedData.type
    if (validatedData.maxEnrollments !== undefined) updateData.maxEnrollments = validatedData.maxEnrollments || null
    if (validatedData.waitlistEnabled !== undefined) updateData.waitlistEnabled = validatedData.waitlistEnabled
    if (validatedData.waitlistLimit !== undefined) updateData.waitlistLimit = validatedData.waitlistLimit
    if (validatedData.regionRestrictionEnabled !== undefined) updateData.regionRestrictionEnabled = validatedData.regionRestrictionEnabled
    if (validatedData.allowAllRegions !== undefined) updateData.allowAllRegions = validatedData.allowAllRegions
    if (validatedData.defaultRegionLimit !== undefined) updateData.defaultRegionLimit = validatedData.defaultRegionLimit ?? null
    if (validatedData.startDate !== undefined) updateData.startDate = validatedData.startDate ? new Date(validatedData.startDate) : null
    if (validatedData.endDate !== undefined) updateData.endDate = validatedData.endDate ? new Date(validatedData.endDate) : null
    if (validatedData.slug !== undefined) {
      updateData.slug = validatedData.slug && validatedData.slug.trim() ? validatedData.slug.trim().toLowerCase() : null
    }

    const updatedCourse = await prisma.$transaction(async (tx) => {
      await tx.course.update({
        where: { id: params.courseId },
        data: updateData
      })

      if (normalizedRegionQuotas) {
        const existingQuotas = await tx.courseRegionQuota.findMany({
          where: { courseId: params.courseId }
        })

        const payloadIds = normalizedRegionQuotas
          .map((quota) => quota.id)
          .filter((id): id is string => !!id)

        const quotasToDelete = existingQuotas
          .filter((quota) => !payloadIds.includes(quota.id))
          .map((quota) => quota.id)

        if (quotasToDelete.length > 0) {
          await tx.courseRegionQuota.deleteMany({
            where: { id: { in: quotasToDelete } }
          })
        }

        for (const quota of normalizedRegionQuotas) {
          if (quota.id) {
            await tx.courseRegionQuota.update({
              where: { id: quota.id },
              data: {
                state: quota.state,
                city: quota.city,
                limit: quota.limit,
                waitlistLimit: quota.waitlistLimit
              }
            })
          } else {
            await tx.courseRegionQuota.create({
              data: {
                courseId: params.courseId,
                state: quota.state,
                city: quota.city,
                limit: quota.limit,
                waitlistLimit: quota.waitlistLimit
              }
            })
          }
        }
      }

      const refreshedCourse = await tx.course.findUnique({
        where: { id: params.courseId },
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
          regionQuotas: true,
          _count: {
            select: {
              enrollments: true
            }
          }
        }
      })

      return refreshedCourse
    })

    if (!updatedCourse) {
      return NextResponse.json(
        { error: 'Curso não encontrado após atualização' },
        { status: 404 }
      )
    }

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

