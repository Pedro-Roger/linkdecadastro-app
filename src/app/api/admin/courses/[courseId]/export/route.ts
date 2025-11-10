import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

export async function GET(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Buscar curso
    const course = await prisma.course.findUnique({
      where: { id: params.courseId },
      select: {
        title: true
      }
    })

    if (!course) {
      return NextResponse.json(
        { error: 'Curso não encontrado' },
        { status: 404 }
      )
    }

    // Buscar inscrições
    const enrollments = await prisma.enrollment.findMany({
      where: { courseId: params.courseId },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            createdAt: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Preparar dados para exportação
    const data = enrollments.map((enrollment, index) => ({
      'Nº': index + 1,
      'Nome': enrollment.user.name,
      'Email': enrollment.user.email,
      'Progresso (%)': enrollment.progress,
      'Data de Inscrição': new Date(enrollment.createdAt).toLocaleDateString('pt-BR'),
      'Data de Conclusão': enrollment.completedAt 
        ? new Date(enrollment.completedAt).toLocaleDateString('pt-BR')
        : '-'
    }))

    // Criar workbook
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(data)
    
    // Ajustar largura das colunas
    const colWidths = [
      { wch: 5 },  // Nº
      { wch: 30 }, // Nome
      { wch: 30 }, // Email
      { wch: 15 }, // Progresso
      { wch: 20 }, // Data de Inscrição
      { wch: 20 }  // Data de Conclusão
    ]
    worksheet['!cols'] = colWidths

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inscritos')

    // Gerar buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    // Retornar arquivo
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="inscritos-${course.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.xlsx"`
      }
    })
  } catch (error) {
    console.error('Erro ao exportar dados:', error)
    return NextResponse.json(
      { error: 'Erro ao exportar dados' },
      { status: 500 }
    )
  }
}

