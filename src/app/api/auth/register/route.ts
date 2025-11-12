import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const registerSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  cpf: z.string().min(11, 'CPF deve ter 11 dígitos').max(11, 'CPF deve ter 11 dígitos').regex(/^\d+$/, 'CPF deve conter apenas números').optional(),
  birthDate: z.string().optional(),
  participantType: z.enum(['ESTUDANTE', 'PROFESSOR', 'PESQUISADOR', 'PRODUTOR']).optional(),
  hectares: z.union([z.number().positive(), z.string()]).optional().transform((val) => {
    if (val === undefined || val === null || val === '') return undefined
    const num = typeof val === 'string' ? parseFloat(val) : val
    return isNaN(num) ? undefined : num
  }),
  state: z.string().optional(),
  city: z.string().optional(),
  phone: z.string().min(10, 'Informe um número de telefone válido').optional()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = registerSchema.parse(body)

    // Verificar se email já existe
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email já cadastrado' },
        { status: 409 }
      )
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(data.password, 10)

    // Criar usuário
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        role: 'USER',
        cpf: data.cpf || null,
        birthDate: data.birthDate ? new Date(data.birthDate) : null,
        participantType: data.participantType || null,
        hectares: data.participantType === 'PRODUTOR' && data.hectares ? (typeof data.hectares === 'number' ? data.hectares : parseFloat(data.hectares)) : null,
        state: data.state || null,
        city: data.city || null,
        phone: data.phone || null
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    })

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Erro ao registrar usuário:', error)
    return NextResponse.json(
      { error: 'Erro ao registrar usuário' },
      { status: 500 }
    )
  }
}

