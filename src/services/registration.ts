import { prisma } from '@/lib/prisma'
import { ParticipantType } from '@prisma/client'

export async function createRegistration(data: {
  eventId: string
  name: string
  cpf: string
  phone: string
  email: string
  cep: string
  locality: string
  city: string
  state: string
  participantType: ParticipantType
  otherType?: string
  pondCount?: number
  waterDepth?: number
}) {
  // Verificar se CPF já existe
  const existingRegistration = await prisma.registration.findUnique({
    where: { cpf: data.cpf }
  })

  if (existingRegistration) {
    throw new Error('CPF já cadastrado')
  }

  // Buscar ou criar limite do município
  let municipalityLimit = await prisma.municipalityLimit.findFirst({
    where: {
      eventId: data.eventId,
      municipality: data.city,
      state: data.state
    }
  })

  if (!municipalityLimit) {
    // Criar limite padrão se não existir
    municipalityLimit = await prisma.municipalityLimit.create({
      data: {
        eventId: data.eventId,
        municipality: data.city,
        state: data.state,
        limit: 20, // Limite padrão
        currentCount: 0
      }
    })
  }

  // Verificar se atingiu o limite
  let batchNumber = 1
  if (municipalityLimit.currentCount >= municipalityLimit.limit) {
    // Contar quantas turmas já existem para este município
    const lastRegistration = await prisma.registration.findFirst({
      where: {
        eventId: data.eventId,
        municipalityId: municipalityLimit.id
      },
      orderBy: { batchNumber: 'desc' }
    })

    batchNumber = lastRegistration ? lastRegistration.batchNumber + 1 : 1
  } else {
    // Incrementar contador
    await prisma.municipalityLimit.update({
      where: { id: municipalityLimit.id },
      data: { currentCount: { increment: 1 } }
    })
  }

  // Criar registro
  const registration = await prisma.registration.create({
    data: {
      ...data,
      municipalityId: municipalityLimit.id,
      batchNumber,
      status: 'CONFIRMED'
    }
  })

  return registration
}

