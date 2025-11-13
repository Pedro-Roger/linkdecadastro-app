import { prisma } from '@/lib/prisma'
import { ParticipantType, MunicipalityClassStatus } from '@prisma/client'

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
        defaultLimit: 20
      }
    })
  }

  // Garantir turma ativa (classe) para o município
  let activeClass = await prisma.municipalityClass.findFirst({
    where: {
      municipalityLimitId: municipalityLimit.id,
      status: MunicipalityClassStatus.ACTIVE
    },
    orderBy: {
      classNumber: 'desc'
    }
  })

  if (!activeClass) {
    activeClass = await prisma.municipalityClass.create({
      data: {
        municipalityLimitId: municipalityLimit.id,
        classNumber: 1,
        limit: municipalityLimit.defaultLimit,
        currentCount: 0
      }
    })
  }

  // Se turma ativa atingiu limite, fecha e cria nova
  if (activeClass.currentCount >= activeClass.limit) {
    await prisma.municipalityClass.update({
      where: { id: activeClass.id },
      data: {
        status: MunicipalityClassStatus.CLOSED,
        closedAt: new Date()
      }
    })

    activeClass = await prisma.municipalityClass.create({
      data: {
        municipalityLimitId: municipalityLimit.id,
        classNumber: activeClass.classNumber + 1,
        limit: municipalityLimit.defaultLimit,
        currentCount: 0
      }
    })
  }

  // Incrementar contagem da turma ativa
  await prisma.municipalityClass.update({
    where: { id: activeClass.id },
    data: {
      currentCount: {
        increment: 1
      }
    }
  })

  // Criar registro
  const registration = await prisma.registration.create({
    data: {
      ...data,
      municipalityId: municipalityLimit.id,
      municipalityClassId: activeClass.id,
      batchNumber: activeClass.classNumber,
      status: 'CONFIRMED'
    }
  })

  return registration
}

