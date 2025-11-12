import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { EnrollmentStatus } from '@prisma/client'

export async function POST(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Obter dados do body
    const body = await request.json().catch(() => ({}))
    const {
      cpf,
      birthDate,
      participantType,
      hectares,
      state,
      city,
      whatsappNumber
    } = body

    if (!whatsappNumber || typeof whatsappNumber !== 'string') {
      return NextResponse.json(
        { error: 'Número de WhatsApp é obrigatório' },
        { status: 400 }
      )
    }

    const formattedState = state?.toString().trim() || null
    const formattedCity = city?.toString().trim() || null

    const result = await prisma.$transaction(async (tx) => {
      // Verificar se o curso existe
      const course = await tx.course.findUnique({
        where: { id: params.courseId },
        include: {
          regionQuotas: true
        }
      })

      if (!course || course.status !== 'ACTIVE') {
        return {
          error: {
            message: 'Curso não encontrado ou inativo',
            status: 404
          }
        }
      }

      // Verificar se já está inscrito
      const existingEnrollment = await tx.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId: session.user.id,
            courseId: params.courseId
          }
        }
      })

      if (existingEnrollment) {
        return {
          error: {
            message: 'Você já possui uma inscrição para este curso',
            status: 409
          }
        }
      }

      const confirmedCount = await tx.enrollment.count({
        where: {
          courseId: params.courseId,
          status: EnrollmentStatus.CONFIRMED
        }
      })

      const waitlistCount = await tx.enrollment.count({
        where: {
          courseId: params.courseId,
          status: EnrollmentStatus.WAITLIST
        }
      })

      const regionQuota = course.regionQuotas.find((quota) => {
        if (!formattedState) return false

        const sameState = quota.state.toLowerCase() === formattedState.toLowerCase()
        if (!sameState) return false

        if (!quota.city) {
          // Quota por estado
          return true
        }

        if (!formattedCity) return false
        return quota.city.toLowerCase() === formattedCity.toLowerCase()
      })

      let regionConfirmedCount = 0
      let regionWaitlistCount = 0

      if (regionQuota) {
        regionConfirmedCount = await tx.enrollment.count({
          where: {
            courseId: params.courseId,
            status: EnrollmentStatus.CONFIRMED,
            regionQuotaId: regionQuota.id
          }
        })

        regionWaitlistCount = await tx.enrollment.count({
          where: {
            courseId: params.courseId,
            status: EnrollmentStatus.WAITLIST,
            regionQuotaId: regionQuota.id
          }
        })
      }

      const courseIsFull =
        !!course.maxEnrollments && confirmedCount >= course.maxEnrollments
      const regionIsFull =
        !!regionQuota && regionConfirmedCount >= regionQuota.limit

      const waitlistAvailable =
        course.waitlistEnabled &&
        (!course.waitlistLimit || waitlistCount < course.waitlistLimit)

      const regionWaitlistAvailable =
        regionQuota &&
        regionQuota.waitlistLimit > 0 &&
        regionWaitlistCount < regionQuota.waitlistLimit

      let enrollmentStatus: EnrollmentStatus = EnrollmentStatus.CONFIRMED
      let eligibilityReason: string | null = null
      let waitlistPosition: number | null = null
      let regionQuotaId: string | null = regionQuota ? regionQuota.id : null

      if (course.regionRestrictionEnabled) {
        if (!regionQuota) {
          if (course.allowAllRegions) {
            enrollmentStatus = EnrollmentStatus.PENDING_REGION
            eligibilityReason = 'Participante fora das regiões prioritárias'
            regionQuotaId = null
          } else {
            enrollmentStatus = EnrollmentStatus.PENDING_REGION
            eligibilityReason = 'Região não elegível para este curso'
            regionQuotaId = null
          }
        }
      }

      if (
        enrollmentStatus === EnrollmentStatus.CONFIRMED &&
        (courseIsFull || regionIsFull)
      ) {
        if (waitlistAvailable) {
          enrollmentStatus = EnrollmentStatus.WAITLIST
          waitlistPosition = waitlistCount + 1
          if (regionQuota && regionIsFull && regionWaitlistAvailable) {
            waitlistPosition = regionWaitlistCount + 1
          }
        } else {
          enrollmentStatus = EnrollmentStatus.PENDING_REGION
          eligibilityReason = courseIsFull
            ? 'Curso atingiu o limite de vagas'
            : 'Limite regional atingido'
        }
      }

      const enrollment = await tx.enrollment.create({
        data: {
          userId: session.user.id,
          courseId: params.courseId,
          progress: 0,
          cpf: cpf || null,
          birthDate: birthDate ? new Date(birthDate) : null,
          participantType: participantType || null,
          hectares:
            participantType === 'PRODUTOR' && hectares
              ? parseFloat(hectares)
              : null,
          state: formattedState,
          city: formattedCity,
          status: enrollmentStatus,
          waitlistPosition,
          regionQuotaId,
          eligibilityReason,
          whatsappNumber
        },
        include: {
          course: true
        }
      })

      await tx.user.update({
        where: { id: session.user.id },
        data: {
          phone: whatsappNumber,
          ...(formattedState ? { state: formattedState } : {}),
          ...(formattedCity ? { city: formattedCity } : {})
        }
      })

      if (regionQuota && enrollmentStatus === EnrollmentStatus.CONFIRMED) {
        await tx.courseRegionQuota.update({
          where: { id: regionQuota.id },
          data: {
            currentCount: { increment: 1 }
          }
        })
      }

      if (regionQuota && enrollmentStatus === EnrollmentStatus.WAITLIST) {
        await tx.courseRegionQuota.update({
          where: { id: regionQuota.id },
          data: {
            waitlistCount: { increment: 1 }
          }
        })
      }

      let notificationTitle = 'Inscrição confirmada!'
      let notificationMessage = `Você foi inscrito no curso "${course.title}"`

      if (enrollmentStatus === EnrollmentStatus.WAITLIST) {
        notificationTitle = 'Inscrição em lista de espera'
        notificationMessage = `Você entrou na lista de espera do curso "${course.title}". Aguarde a confirmação do administrador.`
      } else if (enrollmentStatus === EnrollmentStatus.PENDING_REGION) {
        notificationTitle = 'Inscrição pendente'
        notificationMessage = `Sua inscrição no curso "${course.title}" foi registrada, mas ainda não está elegível. Motivo: ${eligibilityReason}.`
      }

      return {
        course,
        enrollment,
        metadata: {
          courseIsFull,
          waitlistAvailable,
          regionQuota,
          waitlistPosition
        },
        notification: {
          title: notificationTitle,
          message: notificationMessage
        }
      }
    })

    if ('error' in result && result.error) {
      return NextResponse.json(
        { error: result.error.message },
        { status: result.error.status }
      )
    }

    const { enrollment, notification, metadata, course } = result

    // Criar notificação
    await prisma.notification.create({
      data: {
        userId: session.user.id,
        type: 'COURSE_ENROLLED',
        title: notification.title,
        message: notification.message,
        link: `/course/${params.courseId}`
      }
    })

    return NextResponse.json(
      {
        enrollment,
        metadata: {
          isFull: metadata.courseIsFull,
          waitlistPosition: metadata.waitlistPosition,
          regionQuotaId: metadata.regionQuota?.id || null
        },
        course: {
          id: course.id,
          title: course.title,
          waitlistEnabled: course.waitlistEnabled
        }
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Erro ao inscrever no curso:', error)
    return NextResponse.json(
      { error: 'Erro ao inscrever no curso' },
      { status: 500 }
    )
  }
}

