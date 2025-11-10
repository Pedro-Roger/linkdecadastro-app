import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const profileSchema = z.object({
  fullName: z.string().min(3, 'Nome completo deve ter pelo menos 3 caracteres'),
  phone: z.string().min(10, 'Telefone inválido').regex(/^\d+$/, 'Telefone deve conter apenas números'),
  cpf: z.string().length(11, 'CPF deve conter 11 dígitos').regex(/^\d{11}$/, 'CPF deve conter apenas números'),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const data = profileSchema.parse(body)

    // Verificar se o CPF já está em uso por outro usuário
    const existingUserWithCpf = await prisma.user.findFirst({
      where: {
        cpf: data.cpf,
        id: { not: session.user.id }
      }
    })

    if (existingUserWithCpf) {
      return NextResponse.json(
        { error: 'CPF já está em uso por outro usuário' },
        { status: 400 }
      )
    }

    // Atualizar perfil do usuário
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        fullName: data.fullName.trim(),
        phone: data.phone.trim(),
        cpf: data.cpf,
        needsProfileCompletion: false, // Marcar como completo
      }
    })

    return NextResponse.json({
      message: 'Perfil completado com sucesso',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        fullName: updatedUser.fullName,
        phone: updatedUser.phone,
        cpf: updatedUser.cpf,
      }
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Erro ao completar perfil:', error)
    return NextResponse.json(
      { error: 'Erro ao completar perfil' },
      { status: 500 }
    )
  }
}

