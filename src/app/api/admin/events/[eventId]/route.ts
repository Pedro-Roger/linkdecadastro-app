import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateEventSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  bannerUrl: z.string().url().optional().or(z.literal('')),
  maxRegistrations: z.number().int().nonnegative().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'CLOSED']).optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const data = updateEventSchema.parse(body)

    const updates: Record<string, any> = {}
    if (data.title !== undefined) updates.title = data.title
    if (data.description !== undefined) updates.description = data.description
    if (data.status !== undefined) updates.status = data.status
    if (data.maxRegistrations !== undefined) updates.maxRegistrations = data.maxRegistrations
    if (data.bannerUrl !== undefined) {
      updates.bannerUrl = data.bannerUrl ? data.bannerUrl : null
    }

    const event = await prisma.event.update({
      where: { id: params.eventId },
      data: updates,
    })

    return NextResponse.json(event)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Erro ao atualizar evento:', error)
    return NextResponse.json({ error: 'Erro ao atualizar evento' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    await prisma.event.delete({ where: { id: params.eventId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao excluir evento:', error)
    return NextResponse.json({ error: 'Erro ao excluir evento' }, { status: 500 })
  }
}
