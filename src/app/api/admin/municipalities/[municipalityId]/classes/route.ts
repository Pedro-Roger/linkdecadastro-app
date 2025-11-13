import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { MunicipalityClassStatus } from '@prisma/client'

export async function POST(
  request: NextRequest,
  { params }: { params: { municipalityId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { limit } = body

    const municipalityLimit = await prisma.municipalityLimit.findUnique({
      where: { id: params.municipalityId },
      include: {
        classes: {
          orderBy: { classNumber: 'desc' }
        }
      }
    })

    if (!municipalityLimit) {
      return NextResponse.json(
        { error: 'Município não encontrado' },
        { status: 404 }
      )
    }

    const latestClass = municipalityLimit.classes[0]
    const nextClassNumber = latestClass ? latestClass.classNumber + 1 : 1

    const classLimit =
      typeof limit === 'number' && limit > 0
        ? limit
        : municipalityLimit.defaultLimit

    // Fechar classes ativas existentes
    await prisma.municipalityClass.updateMany({
      where: {
        municipalityLimitId: municipalityLimit.id,
        status: MunicipalityClassStatus.ACTIVE
      },
      data: {
        status: MunicipalityClassStatus.CLOSED,
        closedAt: new Date()
      }
    })

    const newClass = await prisma.municipalityClass.create({
      data: {
        municipalityLimitId: municipalityLimit.id,
        classNumber: nextClassNumber,
        limit: classLimit,
        currentCount: 0,
        status: MunicipalityClassStatus.ACTIVE
      }
    })

    return NextResponse.json(newClass, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar nova turma:', error)
    return NextResponse.json(
      { error: 'Erro ao criar nova turma' },
      { status: 500 }
    )
  }
}


