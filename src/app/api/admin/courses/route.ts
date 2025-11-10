import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const courseSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional(),
  bannerUrl: z.string().optional().or(z.literal('')).refine(
    (val) => !val || val.startsWith('/') || val.startsWith('http://') || val.startsWith('https://'),
    { message: 'URL inválida' }
  ),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  type: z.enum(['PRESENCIAL', 'ONLINE']).default('ONLINE'),
  maxEnrollments: z.union([z.number().int().positive(), z.null()]).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  slug: z.string().optional().or(z.literal('')).refine(
    (val) => !val || val.trim() === '' || /^[a-z0-9-]+$/.test(val),
    { message: 'URL personalizada inválida' }
  ),
  firstLesson: z.object({
    title: z.string().min(1, 'Título da aula é obrigatório'),
    videoUrl: z.string().url('URL do YouTube inválida'),
    description: z.string().optional(),
    order: z.number().int().min(0).default(0),
  }).optional(),
})

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }

  return null
}

function extractYouTubeThumbnail(url: string): string | null {
  const videoId = extractYouTubeId(url)
  if (videoId) {
    // Retornar URL da thumbnail de alta qualidade
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
  }
  return null
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const courses = await prisma.course.findMany({
      select: {
        id: true,
        title: true,
        description: true,
        bannerUrl: true, // Garantir que bannerUrl seja retornado
        status: true,
        type: true,
        maxEnrollments: true,
        startDate: true,
        endDate: true,
        slug: true,
        createdAt: true,
        updatedAt: true,
        createdBy: true,
        creator: {
          select: {
            name: true,
            email: true
          }
        },
        lessons: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            title: true,
            order: true
          }
        },
        _count: {
          select: {
            enrollments: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(courses)
  } catch (error) {
    console.error('Erro ao buscar cursos:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar cursos' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = courseSchema.parse(body)

    // Verificar se o slug já existe (apenas se não for vazio)
    if (validatedData.slug && validatedData.slug.trim()) {
      const slugValue = validatedData.slug.trim().toLowerCase()
      const existingCourse = await prisma.course.findFirst({
        where: { slug: slugValue }
      })
      if (existingCourse) {
        return NextResponse.json(
          { error: 'URL personalizada já está em uso' },
          { status: 400 }
        )
      }
    }

    // Converter strings de data para DateTime
    // Tratar bannerUrl: se não fornecido, tentar extrair do YouTube da primeira aula
    let finalBannerUrl: string | null = null
    
    console.log('API: bannerUrl recebido:', validatedData.bannerUrl)
    
    // Se não houver bannerUrl fornecido, tentar extrair do vídeo do YouTube da primeira aula
    if (!validatedData.bannerUrl || !validatedData.bannerUrl.trim()) {
      console.log('API: bannerUrl vazio, tentando extrair do YouTube')
      if (validatedData.firstLesson?.videoUrl) {
        const thumbnailUrl = extractYouTubeThumbnail(validatedData.firstLesson.videoUrl)
        if (thumbnailUrl) {
          finalBannerUrl = thumbnailUrl
          console.log('API: Thumbnail extraído do YouTube:', thumbnailUrl)
        }
      }
    } else {
      finalBannerUrl = validatedData.bannerUrl.trim()
      console.log('API: Usando bannerUrl fornecido:', finalBannerUrl)
    }
    
    console.log('API: finalBannerUrl final:', finalBannerUrl)
    
    // Construir objeto de dados do curso
    const courseData: any = {
      title: validatedData.title,
      description: validatedData.description || null,
      bannerUrl: finalBannerUrl,
      status: validatedData.status,
      type: validatedData.type,
      maxEnrollments: validatedData.maxEnrollments || null,
      startDate: validatedData.startDate ? new Date(validatedData.startDate) : null,
      endDate: validatedData.endDate ? new Date(validatedData.endDate) : null,
      createdBy: session.user.id
    }
    
    // Adicionar slug apenas se fornecido (evitar null duplicado que viola constraint única)
    if (validatedData.slug && validatedData.slug.trim()) {
      courseData.slug = validatedData.slug.trim().toLowerCase()
    }
    
    console.log('API: courseData antes de criar:', JSON.stringify(courseData, null, 2))

    // Criar curso e primeira aula em uma transação
    const course = await prisma.$transaction(async (tx) => {
      const newCourse = await tx.course.create({
        data: courseData,
        select: {
          id: true,
          title: true,
          description: true,
          bannerUrl: true, // Garantir que bannerUrl seja retornado
          status: true,
          type: true,
          maxEnrollments: true,
          startDate: true,
          endDate: true,
          slug: true,
          createdAt: true,
          updatedAt: true,
          createdBy: true,
          creator: {
            select: {
              name: true,
              email: true
            }
          }
        }
      })

      // Criar primeira aula se fornecida
      if (validatedData.firstLesson) {
        const youtubeId = extractYouTubeId(validatedData.firstLesson.videoUrl)
        if (!youtubeId) {
          throw new Error('URL do YouTube inválida')
        }

        // Extrair thumbnail do YouTube automaticamente
        const thumbnailUrl = extractYouTubeThumbnail(validatedData.firstLesson.videoUrl)

        await tx.lesson.create({
          data: {
            courseId: newCourse.id,
            title: validatedData.firstLesson.title,
            description: validatedData.firstLesson.description || null,
            videoUrl: `https://www.youtube.com/watch?v=${youtubeId}`,
            bannerUrl: thumbnailUrl,
            order: validatedData.firstLesson.order || 0
          }
        })
      }

      return newCourse
    })

    return NextResponse.json(course, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Dados inválidos',
        details: error.errors 
      }, { status: 400 })
    }
    console.error('Erro ao criar curso:', error)
    
    // Retornar mensagem de erro mais específica
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Erro ao criar curso'
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

