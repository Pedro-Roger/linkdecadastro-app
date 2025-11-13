import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { MunicipalityClassStatus } from '@prisma/client'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { municipalityId: string; classId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { status, limit } = body

    const municipalityLimit = await prisma.municipalityLimit.findUnique({
      where: { id: params.municipalityId },
      include: {
        classes: {
          orderBy: { classNumber: 'asc' }
        }
      }
    })

    if (!municipalityLimit) {
      return NextResponse.json(
        { error: 'Município não encontrado' },
        { status: 404 }
      )
    }

    const classItem = municipalityLimit.classes.find(
      (item) => item.id === params.classId
    )

    if (!classItem) {
      return NextResponse.json(
        { error: 'Turma não encontrada' },
        { status: 404 }
      )
    }

    const updates: any = {}

    if (limit !== undefined) {
      if (typeof limit !== 'number' || limit < classItem.currentCount) {
        return NextResponse.json(
          { error: 'Limite da turma inválido' },
          { status: 400 }
        )
      }
      updates.limit = limit
    }

    if (status !== undefined) {
      if (!Object.values(MunicipalityClassStatus).includes(status)) {
        return NextResponse.json(
          { error: 'Status inválido' },
          { status: 400 }
        )
      }

      if (status === MunicipalityClassStatus.ACTIVE) {
        // Fechar outras turmas ativas para este município
        await prisma.municipalityClass.updateMany({
          where: {
            municipalityLimitId: municipalityLimit.id,
            status: MunicipalityClassStatus.ACTIVE,
            id: { not: classItem.id }
          },
          data: {
            status: MunicipalityClassStatus.CLOSED,
            closedAt: new Date()
          }
        })
        updates.status = MunicipalityClassStatus.ACTIVE
        updates.closedAt = null
      } else {
        updates.status = MunicipalityClassStatus.CLOSED
        updates.closedAt = new Date()
      }
    }

    if (Object.keys(updates).length > 0) {
      await prisma.municipalityClass.update({
        where: { id: classItem.id },
        data: updates
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao atualizar turma:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar turma' },
      { status: 500 }
    )
  }
}


