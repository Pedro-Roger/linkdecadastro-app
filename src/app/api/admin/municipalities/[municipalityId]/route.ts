import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { municipalityId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { defaultLimit, activeClassLimit } = body

    if (
      defaultLimit !== undefined &&
      (typeof defaultLimit !== 'number' || defaultLimit < 1)
    ) {
      return NextResponse.json(
        { error: 'Limite padrão inválido' },
        { status: 400 }
      )
    }

    const municipalityLimit = await prisma.municipalityLimit.findUnique({
      where: { id: params.municipalityId },
      include: {
        classes: {
          where: { status: 'ACTIVE' },
          orderBy: { classNumber: 'desc' },
          take: 1
        }
      }
    })

    if (!municipalityLimit) {
      return NextResponse.json(
        { error: 'Município não encontrado' },
        { status: 404 }
      )
    }

    const updates: any = {}
    if (defaultLimit !== undefined) {
      updates.defaultLimit = defaultLimit
    }

    if (Object.keys(updates).length > 0) {
      await prisma.municipalityLimit.update({
        where: { id: municipalityLimit.id },
        data: updates
      })
    }

    const activeClass = municipalityLimit.classes[0]

    if (activeClass && activeClassLimit !== undefined) {
      if (
        typeof activeClassLimit !== 'number' ||
        activeClassLimit < activeClass.currentCount
      ) {
        return NextResponse.json(
          {
            error:
              'Limite da turma ativa inválido (precisa ser >= inscrições atuais)'
          },
          { status: 400 }
        )
      }

      await prisma.municipalityClass.update({
        where: { id: activeClass.id },
        data: {
          limit: activeClassLimit
        }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao atualizar município:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar limites do município' },
      { status: 500 }
    )
  }
}


