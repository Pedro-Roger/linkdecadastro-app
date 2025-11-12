import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'
import PDFDocument from 'pdfkit'
import { EnrollmentStatus } from '@prisma/client'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const DEFAULT_FIELDS = ['number', 'name', 'email', 'status', 'progress', 'createdAt']

const statusLabels: Record<EnrollmentStatus, string> = {
  CONFIRMED: 'Confirmada',
  WAITLIST: 'Lista de Espera',
  PENDING_REGION: 'Pendente',
  REJECTED: 'Rejeitada'
}

type FieldDescriptor = {
  label: string
  getter: (enrollment: any, index?: number) => any
}

const availableFields: Record<string, FieldDescriptor> = {
  number: {
    label: 'Nº',
    getter: (_enrollment: any, index: number = 0) => index + 1
  },
  name: {
    label: 'Nome',
    getter: (enrollment: any) => enrollment.user.name
  },
  email: {
    label: 'Email',
    getter: (enrollment: any) => enrollment.user.email
  },
  whatsapp: {
    label: 'WhatsApp',
    getter: (enrollment: any) =>
      enrollment.whatsappNumber || enrollment.user.phone || '-'
  },
  status: {
    label: 'Status',
    getter: (enrollment: any) => statusLabels[enrollment.status as EnrollmentStatus] || enrollment.status
  },
  progress: {
    label: 'Progresso (%)',
    getter: (enrollment: any) => enrollment.progress ?? 0
  },
  participantType: {
    label: 'Tipo de Participante',
    getter: (enrollment: any) => enrollment.participantType || '-'
  },
  cpf: {
    label: 'CPF',
    getter: (enrollment: any) => enrollment.cpf || '-'
  },
  state: {
    label: 'Estado',
    getter: (enrollment: any) => enrollment.state || enrollment.user.state || '-'
  },
  city: {
    label: 'Cidade',
    getter: (enrollment: any) => enrollment.city || enrollment.user.city || '-'
  },
  createdAt: {
    label: 'Data de Inscrição',
    getter: (enrollment: any) =>
      format(new Date(enrollment.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })
  },
  completedAt: {
    label: 'Data de Conclusão',
    getter: (enrollment: any) =>
      enrollment.completedAt
        ? format(new Date(enrollment.completedAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })
        : '-'
  },
  waitlistPosition: {
    label: 'Posição na Lista de Espera',
    getter: (enrollment: any) => enrollment.waitlistPosition ?? '-'
  },
  eligibilityReason: {
    label: 'Observações',
    getter: (enrollment: any) => enrollment.eligibilityReason || '-'
  }
} as const

type FieldKey = keyof typeof availableFields

function parseFields(fields: string[] | undefined) {
  if (!fields || fields.length === 0) {
    return [...DEFAULT_FIELDS] as FieldKey[]
  }

  const parsed = fields
    .map((field) => field.trim())
    .filter((field): field is FieldKey => field in availableFields)

  return parsed.length > 0 ? parsed : ([...DEFAULT_FIELDS] as FieldKey[])
}

function getFormatFromRequest(
  request: NextRequest,
  body: any
): 'xlsx' | 'csv' | 'pdf' {
  const url = new URL(request.url)
  const formatQuery = url.searchParams.get('format')?.toLowerCase()
  const bodyFormat = typeof body?.format === 'string' ? body.format.toLowerCase() : undefined
  const format = bodyFormat || formatQuery || 'xlsx'

  if (format === 'csv' || format === 'pdf') {
    return format
  }

  return 'xlsx'
}

function parseFieldList(request: NextRequest, body: any): FieldKey[] {
  const url = new URL(request.url)
  const queryFields = url.searchParams.getAll('fields')

  let fields: string[] | undefined

  if (queryFields.length > 0) {
    fields = queryFields
      .flatMap((item) => item.split(','))
      .map((field) => field.trim())
      .filter(Boolean)
  } else if (Array.isArray(body?.fields)) {
    fields = body.fields
  }

  return parseFields(fields as string[] | undefined)
}

async function handleExport(
  request: NextRequest,
  params: { courseId: string }
) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const body =
    request.method === 'POST'
      ? await request.json().catch(() => ({}))
      : undefined

  const formatType = getFormatFromRequest(request, body)
  const selectedFields = parseFieldList(request, body)

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

  const enrollments = await prisma.enrollment.findMany({
    where: { courseId: params.courseId },
    include: {
      user: {
        select: {
          name: true,
          email: true,
          createdAt: true,
          phone: true,
          state: true,
          city: true
        }
      },
      regionQuota: {
        select: {
          state: true,
          city: true
        }
      }
    },
    orderBy: { createdAt: 'asc' }
  })

  const headerRow = selectedFields.map((key) => availableFields[key].label)
  const dataRows = enrollments.map((enrollment, index) =>
    selectedFields.map((key) => {
      const value = availableFields[key].getter(enrollment, index)
      return value === null || value === undefined ? '' : value
    })
  )

  const sanitizedTitle = course.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()

  if (formatType === 'pdf') {
    const doc = new PDFDocument({ size: 'A4', margin: 40 })
    const chunks: Buffer[] = []

    doc.on('data', (chunk) => chunks.push(chunk as Buffer))

    const pdfPromise = new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)))
    })

    doc.fontSize(16).text(`Relatório de Inscrições - ${course.title}`)
    doc.moveDown()

    if (enrollments.length === 0) {
      doc.fontSize(12).text('Nenhum inscrito encontrado.')
    } else {
      enrollments.forEach((enrollment, index) => {
        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .text(`Participante ${index + 1}`)
        doc.moveDown(0.2)

        selectedFields.forEach((fieldKey) => {
          if (fieldKey === 'number') {
            return
          }
          const descriptor = availableFields[fieldKey]
          const value = descriptor.getter(enrollment, index)
          doc
            .font('Helvetica')
            .fontSize(11)
            .text(`${descriptor.label}: ${value ?? '-'}`)
        })

        doc.moveDown()
      })
    }

    doc.end()

    const pdfBuffer = await pdfPromise
    const arrayBuffer = new Uint8Array(pdfBuffer).buffer as ArrayBuffer

    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="inscritos-${sanitizedTitle}.pdf"`
      }
    })
  }

  const worksheet = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows])
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Inscritos')

  if (formatType === 'csv') {
    const csv = XLSX.utils.sheet_to_csv(worksheet, { FS: ';' })
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="inscritos-${sanitizedTitle}.csv"`
      }
    })
  }

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

  return new NextResponse(buffer, {
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="inscritos-${sanitizedTitle}.xlsx"`
    }
  })
}

export async function GET(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    return await handleExport(request, params)
  } catch (error) {
    console.error('Erro ao exportar dados:', error)
    return NextResponse.json(
      { error: 'Erro ao exportar dados' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    return await handleExport(request, params)
  } catch (error) {
    console.error('Erro ao exportar dados:', error)
    return NextResponse.json(
      { error: 'Erro ao exportar dados' },
      { status: 500 }
    )
  }
}

