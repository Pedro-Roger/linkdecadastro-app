import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { EnrollmentStatus } from '@prisma/client'
import { z } from 'zod'

const updateEnrollmentSchema = z.object({
  status: z.nativeEnum(EnrollmentStatus),
  notifyUser: z.boolean().optional().default(true),
  message: z.string().optional(),
  regionQuotaId: z.string().optional().nullable()
})

type QuotaDeltas = Record<
  string,
  {
    confirmed: number
    waitlist: number
  }
>

function applyDelta(
  deltas: QuotaDeltas,
  quotaId: string,
  type: 'confirmed' | 'waitlist',
  amount: number
) {
  if (!quotaId || amount === 0) {
    return
  }

  if (!deltas[quotaId]) {
    deltas[quotaId] = { confirmed: 0, waitlist: 0 }
  }

  deltas[quotaId][type] += amount
}

function normalizeRegionQuota(
  regionQuotaId: string | null | undefined,
  courseRegionQuotas: Array<{
    id: string
    state: string
    city: string | null
  }>,
  participantState?: string | null,
  participantCity?: string | null
) {
  if (regionQuotaId) {
    const quota = courseRegionQuotas.find((item) => item.id === regionQuotaId)
    if (quota) {
      return quota.id
    }
  }

  if (!participantState) {
    return null
  }

  const normalizedState = participantState.trim().toUpperCase()
  const normalizedCity = participantCity?.trim().toLowerCase()

  const cityQuota = normalizedCity
    ? courseRegionQuotas.find(
        (item) =>
          item.state.toUpperCase() === normalizedState &&
          item.city?.toLowerCase() === normalizedCity
      )
    : null

  if (cityQuota) {
    return cityQuota.id
  }

  const stateQuota = courseRegionQuotas.find(
    (item) =>
      item.state.toUpperCase() === normalizedState && (!item.city || item.city.trim() === '')
  )

  return stateQuota?.id ?? null
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { courseId: string; enrollmentId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { status: targetStatus, notifyUser, message, regionQuotaId } =
      updateEnrollmentSchema.parse(body)

    const result = await prisma.$transaction(async (tx) => {
      const enrollment = await tx.enrollment.findUnique({
        where: { id: params.enrollmentId },
        include: {
          user: true,
          course: {
            include: {
              regionQuotas: true
            }
          },
          regionQuota: true
        }
      })

      if (!enrollment || enrollment.courseId !== params.courseId) {
        return {
          error: {
            status: 404,
            message: 'Inscrição não encontrada'
          }
        }
      }

      const course = enrollment.course
      const oldStatus = enrollment.status

      if (oldStatus === targetStatus) {
        return {
          enrollment,
          noChanges: true
        }
      }

      const quotaDeltas: QuotaDeltas = {}
      const normalizedQuotaId = normalizeRegionQuota(
        regionQuotaId,
        course.regionQuotas,
        enrollment.state,
        enrollment.city
      )

      const targetQuota =
        normalizedQuotaId &&
        course.regionQuotas.find((quota) => quota.id === normalizedQuotaId)

      if (
        targetStatus === EnrollmentStatus.CONFIRMED &&
        course.regionRestrictionEnabled &&
        !targetQuota &&
        !course.allowAllRegions
      ) {
        return {
          error: {
            status: 400,
            message: 'É necessário associar a inscrição a uma região válida'
          }
        }
      }

      if (targetStatus === EnrollmentStatus.CONFIRMED) {
        const confirmedCountExcludingCurrent = await tx.enrollment.count({
          where: {
            courseId: params.courseId,
            status: EnrollmentStatus.CONFIRMED,
            NOT: { id: enrollment.id }
          }
        })

        const newConfirmedCount = confirmedCountExcludingCurrent + 1

        if (course.maxEnrollments && newConfirmedCount > course.maxEnrollments) {
          return {
            error: {
              status: 400,
              message: 'Limite máximo de vagas atingido para o curso'
            }
          }
        }

        if (targetQuota) {
          const regionConfirmedCountExcludingCurrent = await tx.enrollment.count({
            where: {
              courseId: params.courseId,
              status: EnrollmentStatus.CONFIRMED,
              regionQuotaId: targetQuota.id,
              NOT: { id: enrollment.id }
            }
          })

          if (regionConfirmedCountExcludingCurrent + 1 > targetQuota.limit) {
            return {
              error: {
                status: 400,
                message: 'Limite de vagas para a região selecionada foi atingido'
              }
            }
          }
        }
      }

      if (targetStatus === EnrollmentStatus.WAITLIST) {
        if (!course.waitlistEnabled) {
          return {
            error: {
              status: 400,
              message: 'Lista de espera não habilitada para este curso'
            }
          }
        }

        const waitlistCountExcludingCurrent = await tx.enrollment.count({
          where: {
            courseId: params.courseId,
            status: EnrollmentStatus.WAITLIST,
            NOT: { id: enrollment.id }
          }
        })

        if (
          course.waitlistLimit > 0 &&
          waitlistCountExcludingCurrent + 1 > course.waitlistLimit
        ) {
          return {
            error: {
              status: 400,
              message: 'Limite da lista de espera atingido'
            }
          }
        }

        if (targetQuota && targetQuota.waitlistLimit > 0) {
          const regionWaitlistCountExcludingCurrent = await tx.enrollment.count({
            where: {
              courseId: params.courseId,
              status: EnrollmentStatus.WAITLIST,
              regionQuotaId: targetQuota.id,
              NOT: { id: enrollment.id }
            }
          })

          if (regionWaitlistCountExcludingCurrent + 1 > targetQuota.waitlistLimit) {
            return {
              error: {
                status: 400,
                message: 'Limite da lista de espera para essa região foi atingido'
              }
            }
          }
        }
      }

      const updateData: any = {
        status: targetStatus,
        regionQuotaId: normalizedQuotaId,
        waitlistPosition: null
      }

      if (targetStatus === EnrollmentStatus.CONFIRMED) {
        updateData.eligibilityReason = null
      } else if (targetStatus === EnrollmentStatus.WAITLIST) {
        const waitlistCount = await tx.enrollment.count({
          where: {
            courseId: params.courseId,
            status: EnrollmentStatus.WAITLIST,
            NOT: { id: enrollment.id }
          }
        })
        updateData.waitlistPosition = waitlistCount + 1
        updateData.eligibilityReason = message || 'Em lista de espera para avaliação do administrador'
      } else {
        updateData.eligibilityReason =
          message ||
          (targetStatus === EnrollmentStatus.PENDING_REGION
            ? 'Inscrição pendente para análise do administrador'
            : 'Inscrição não aprovada pelo administrador')
      }

      if (
        enrollment.regionQuotaId &&
        (oldStatus === EnrollmentStatus.CONFIRMED ||
          targetStatus === EnrollmentStatus.CONFIRMED)
      ) {
        applyDelta(
          quotaDeltas,
          enrollment.regionQuotaId,
          'confirmed',
          oldStatus === EnrollmentStatus.CONFIRMED ? -1 : 0
        )
        applyDelta(
          quotaDeltas,
          normalizedQuotaId ?? enrollment.regionQuotaId,
          'confirmed',
          targetStatus === EnrollmentStatus.CONFIRMED ? 1 : 0
        )
      } else {
        if (oldStatus === EnrollmentStatus.CONFIRMED) {
          applyDelta(quotaDeltas, enrollment.regionQuotaId ?? '', 'confirmed', -1)
        }
        if (targetStatus === EnrollmentStatus.CONFIRMED) {
          applyDelta(quotaDeltas, normalizedQuotaId ?? '', 'confirmed', 1)
        }
      }

      if (
        enrollment.regionQuotaId &&
        (oldStatus === EnrollmentStatus.WAITLIST ||
          targetStatus === EnrollmentStatus.WAITLIST)
      ) {
        applyDelta(
          quotaDeltas,
          enrollment.regionQuotaId,
          'waitlist',
          oldStatus === EnrollmentStatus.WAITLIST ? -1 : 0
        )
        applyDelta(
          quotaDeltas,
          normalizedQuotaId ?? enrollment.regionQuotaId,
          'waitlist',
          targetStatus === EnrollmentStatus.WAITLIST ? 1 : 0
        )
      } else {
        if (oldStatus === EnrollmentStatus.WAITLIST) {
          applyDelta(quotaDeltas, enrollment.regionQuotaId ?? '', 'waitlist', -1)
        }
        if (targetStatus === EnrollmentStatus.WAITLIST) {
          applyDelta(quotaDeltas, normalizedQuotaId ?? '', 'waitlist', 1)
        }
      }

      const updatedEnrollment = await tx.enrollment.update({
        where: { id: enrollment.id },
        data: updateData,
        include: {
          user: true,
          course: true,
          regionQuota: true
        }
      })

      for (const [quotaId, delta] of Object.entries(quotaDeltas)) {
        const updates: any = {}
        if (delta.confirmed > 0) {
          updates.currentCount = { increment: delta.confirmed }
        } else if (delta.confirmed < 0) {
          updates.currentCount = { decrement: Math.abs(delta.confirmed) }
        }

        if (delta.waitlist > 0) {
          updates.waitlistCount = {
            ...(updates.waitlistCount ?? {}),
            increment: delta.waitlist
          }
        } else if (delta.waitlist < 0) {
          updates.waitlistCount = {
            ...(updates.waitlistCount ?? {}),
            decrement: Math.abs(delta.waitlist)
          }
        }

        if (Object.keys(updates).length > 0 && quotaId) {
          await tx.courseRegionQuota.update({
            where: { id: quotaId },
            data: updates
          })
        }
      }

      // Reordenar posições da lista de espera
      const waitlistEnrollments = await tx.enrollment.findMany({
        where: {
          courseId: params.courseId,
          status: EnrollmentStatus.WAITLIST
        },
        orderBy: {
          createdAt: 'asc'
        },
        select: {
          id: true
        }
      })

      await Promise.all(
        waitlistEnrollments.map((item, index) =>
          tx.enrollment.update({
            where: { id: item.id },
            data: { waitlistPosition: index + 1 }
          })
        )
      )

      return {
        enrollment: updatedEnrollment,
        message:
          targetStatus === EnrollmentStatus.CONFIRMED
            ? 'Inscrição confirmada com sucesso'
            : targetStatus === EnrollmentStatus.WAITLIST
            ? 'Inscrição movida para a lista de espera'
            : 'Status da inscrição atualizado'
      }
    })

    if ('error' in result && result.error) {
      return NextResponse.json({ error: result.error.message }, { status: result.error.status })
    }

    const { enrollment, message: successMessage, noChanges } = result

    if (!noChanges && notifyUser) {
      await prisma.notification.create({
        data: {
          userId: enrollment.userId,
          type:
            targetStatus === EnrollmentStatus.CONFIRMED
              ? 'COURSE_ENROLLED'
              : 'COURSE_UPDATED',
          title:
            targetStatus === EnrollmentStatus.CONFIRMED
              ? 'Inscrição aprovada!'
              : 'Status da inscrição atualizado',
          message:
            message ||
            (targetStatus === EnrollmentStatus.CONFIRMED
              ? `Parabéns! Sua inscrição no curso "${enrollment.course.title}" foi confirmada.`
              : targetStatus === EnrollmentStatus.WAITLIST
              ? `Sua inscrição no curso "${enrollment.course.title}" está na lista de espera. Aguarde novas vagas.`
              : `Sua inscrição no curso "${enrollment.course.title}" foi atualizada: ${targetStatus}.`),
          link: `/course/${enrollment.courseId}`
        }
      })
    }

    return NextResponse.json({
      enrollment,
      message: noChanges ? 'Nenhuma alteração realizada' : successMessage
    })
  } catch (error) {
    console.error('Erro ao atualizar inscrição:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar inscrição' },
      { status: 500 }
    )
  }
}


