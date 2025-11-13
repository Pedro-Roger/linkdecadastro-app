import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const events = await prisma.event.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        bannerUrl: true,
        status: true,
        maxRegistrations: true,
        createdAt: true,
        updatedAt: true
      }
    })

    const history = await Promise.all(
      events.map(async (event) => {
        const totalRegistrations = await prisma.registration.count({
          where: { eventId: event.id }
        })

        const municipalities = await prisma.municipalityLimit.findMany({
          where: { eventId: event.id },
          select: {
            id: true,
            municipality: true,
            state: true,
            defaultLimit: true,
            classes: {
              select: {
                id: true,
                classNumber: true,
                limit: true,
                currentCount: true,
                status: true,
                createdAt: true,
                closedAt: true
              },
              orderBy: { classNumber: 'asc' }
            }
          }
        })

        return {
          ...event,
          totalRegistrations,
          municipalitiesCount: municipalities.length,
          municipalities
        }
      })
    )

    return NextResponse.json(history)
  } catch (error) {
    console.error('Erro ao buscar histórico de eventos:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar histórico de eventos' },
      { status: 500 }
    )
  }
}


