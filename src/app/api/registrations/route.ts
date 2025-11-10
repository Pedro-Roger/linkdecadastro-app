import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createRegistration } from '@/services/registration'
import { sendRegistrationEmail, sendAdminNotificationEmail } from '@/services/email'
import { z } from 'zod'

const registrationSchema = z.object({
  eventId: z.string(),
  name: z.string().min(1),
  cpf: z.string().min(11).max(11),
  phone: z.string().min(10),
  email: z.string().email(),
  cep: z.string().min(8).max(8),
  locality: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(2).max(2),
  participantType: z.enum(['ESTUDANTE', 'PROFESSOR', 'PESQUISADOR', 'PRODUTOR', 'OUTROS']),
  otherType: z.string().optional(),
  pondCount: z.number().optional(),
  waterDepth: z.number().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = registrationSchema.parse(body)

    // Verificar se evento existe e está ativo
    const event = await prisma.event.findUnique({
      where: { id: data.eventId }
    })

    if (!event || event.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Evento não encontrado ou inativo' },
        { status: 404 }
      )
    }

    // Mapear 'OUTROS' para um valor válido do enum (usar ESTUDANTE como padrão)
    const participantType = data.participantType === 'OUTROS' ? 'ESTUDANTE' : data.participantType
    
    const registration = await createRegistration({
      ...data,
      participantType: participantType as 'ESTUDANTE' | 'PROFESSOR' | 'PESQUISADOR' | 'PRODUTOR'
    })

    // Enviar emails
    try {
      await sendRegistrationEmail(data.email, data.name, event.title)
      
      // Buscar admin para notificar
      const admin = await prisma.user.findFirst({
        where: { role: 'ADMIN' }
      })
      
      if (admin) {
        await sendAdminNotificationEmail(admin.email, {
          name: data.name,
          email: data.email,
          cpf: data.cpf,
          city: data.city,
          eventTitle: event.title
        })
      }
    } catch (emailError) {
      console.error('Erro ao enviar email:', emailError)
    }

    return NextResponse.json(registration, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    
    if (error instanceof Error && error.message === 'CPF já cadastrado') {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Erro ao processar cadastro' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('eventId')

    const registrations = await prisma.registration.findMany({
      where: eventId ? { eventId } : undefined,
      include: {
        event: {
          select: {
            title: true
          }
        },
        municipality: {
          select: {
            municipality: true,
            state: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(registrations)
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao buscar cadastros' },
      { status: 500 }
    )
  }
}

