import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Verificar se o curso existe
    const course = await prisma.course.findUnique({
      where: { id: params.courseId }
    })

    if (!course || course.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Curso não encontrado ou inativo' },
        { status: 404 }
      )
    }

    // Verificar se já está inscrito
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId: params.courseId
        }
      }
    })

    if (existingEnrollment) {
      return NextResponse.json(
        { error: 'Você já está inscrito neste curso' },
        { status: 409 }
      )
    }

    // Obter dados do body
    const body = await request.json().catch(() => ({}))
    const { cpf, birthDate, participantType, hectares, state, city } = body

    // Criar inscrição
    const enrollment = await prisma.enrollment.create({
      data: {
        userId: session.user.id,
        courseId: params.courseId,
        progress: 0,
        cpf: cpf || null,
        birthDate: birthDate ? new Date(birthDate) : null,
        participantType: participantType || null,
        hectares: participantType === 'PRODUTOR' && hectares ? parseFloat(hectares) : null,
        state: state || null,
        city: city || null,
      },
      include: {
        course: true
      }
    })

    // Criar notificação
    await prisma.notification.create({
      data: {
        userId: session.user.id,
        type: 'COURSE_ENROLLED',
        title: 'Inscrição confirmada!',
        message: `Você foi inscrito no curso "${course.title}"`,
        link: `/course/${params.courseId}`
      }
    })

    return NextResponse.json(enrollment, { status: 201 })
  } catch (error) {
    console.error('Erro ao inscrever no curso:', error)
    return NextResponse.json(
      { error: 'Erro ao inscrever no curso' },
      { status: 500 }
    )
  }
}

