import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { MunicipalityClassStatus, ParticipantType } from '@prisma/client'

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const eventId = params.eventId

    const municipalityLimits = await prisma.municipalityLimit.findMany({
      where: { eventId },
      include: {
        classes: {
          orderBy: { classNumber: 'asc' }
        }
      },
      orderBy: [
        { state: 'asc' },
        { municipality: 'asc' }
      ]
    })

    const registrations = await prisma.registration.findMany({
      where: { eventId },
      select: {
        id: true,
        municipalityId: true,
        municipalityClassId: true,
        participantType: true,
        city: true,
        state: true,
        status: true
      }
    })

    const overallByState = new Map<
      string,
      {
        total: number
        byParticipantType: Partial<Record<ParticipantType, number>>
      }
    >()

    const overallByType: Partial<Record<ParticipantType, number>> = {}

    registrations.forEach((registration) => {
      if (!overallByState.has(registration.state)) {
        overallByState.set(registration.state, {
          total: 0,
          byParticipantType: {}
        })
      }
      const stateInfo = overallByState.get(registration.state)!
      stateInfo.total += 1
      stateInfo.byParticipantType[registration.participantType] =
        (stateInfo.byParticipantType[registration.participantType] ?? 0) + 1

      overallByType[registration.participantType] =
        (overallByType[registration.participantType] ?? 0) + 1
    })

    const limitsWithSummary = municipalityLimits.map((limit) => {
      const regsForMunicipality = registrations.filter(
        (registration) => registration.municipalityId === limit.id
      )

      const byParticipantType: Partial<Record<ParticipantType, number>> = {}
      regsForMunicipality.forEach((registration) => {
        byParticipantType[registration.participantType] =
          (byParticipantType[registration.participantType] ?? 0) + 1
      })

      const classes = limit.classes.map((classItem) => {
        const regsForClass = regsForMunicipality.filter(
          (registration) => registration.municipalityClassId === classItem.id
        )

        return {
          id: classItem.id,
          classNumber: classItem.classNumber,
          limit: classItem.limit,
          currentCount: classItem.currentCount,
          status: classItem.status,
          createdAt: classItem.createdAt,
          closedAt: classItem.closedAt,
          registrations: regsForClass.length
        }
      })

      const activeClass = classes.find(
        (classItem) => classItem.status === MunicipalityClassStatus.ACTIVE
      )

      return {
        id: limit.id,
        municipality: limit.municipality,
        state: limit.state,
        defaultLimit: limit.defaultLimit,
        totalRegistrations: regsForMunicipality.length,
        byParticipantType,
        classes,
        activeClassNumber: activeClass?.classNumber ?? null,
        activeClassLimit: activeClass?.limit ?? null,
        activeClassCount: activeClass?.currentCount ?? null
      }
    })

    return NextResponse.json({
      regions: limitsWithSummary,
      overall: {
        totalRegistrations: registrations.length,
        byParticipantType: overallByType,
        byState: Array.from(overallByState.entries()).map(([state, info]) => ({
          state,
          total: info.total,
          byParticipantType: info.byParticipantType
        }))
      }
    })
  } catch (error) {
    console.error('Erro ao buscar resumo regional:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar resumo regional' },
      { status: 500 }
    )
  }
}


