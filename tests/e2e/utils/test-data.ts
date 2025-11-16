import { prisma } from './prisma'
import { randomUUID } from 'crypto'
import { EventStatus } from '@prisma/client'

export async function ensureAdminUser() {
  const admin = await prisma.user.findFirst({
    where: { role: 'ADMIN' }
  })

  if (!admin) {
    throw new Error('Usuário admin não encontrado. Execute o seed antes dos testes E2E.')
  }

  return admin
}

export async function createActiveEvent(overrides?: {
  title?: string
  description?: string
  bannerUrl?: string | null
}) {
  const admin = await ensureAdminUser()
  const linkId = `e2e-${randomUUID()}`

  const event = await prisma.event.create({
    data: {
      title: overrides?.title ?? `Evento E2E ${linkId}`,
      description: overrides?.description ?? 'Evento criado automaticamente para testes E2E.',
      bannerUrl: overrides?.bannerUrl ?? null,
      status: EventStatus.ACTIVE,
      linkId,
      createdBy: admin.id
    }
  })

  return event
}

export async function clearRegistrationsForEvent(eventId: string) {
  await prisma.registration.deleteMany({
    where: { eventId }
  })
}


