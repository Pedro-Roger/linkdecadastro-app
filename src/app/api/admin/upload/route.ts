import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      console.error('Upload: Sessão não encontrada')
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      console.error('Upload: Usuário não é admin', session.user.role)
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      console.error('Upload: Nenhum arquivo recebido')
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
    }

    console.log('Upload: Arquivo recebido', {
      name: file.name,
      type: file.type,
      size: file.size
    })

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      console.error('Upload: Tipo de arquivo inválido', file.type)
      return NextResponse.json({ error: 'Apenas imagens são permitidas' }, { status: 400 })
    }

    // Validar tamanho (máximo 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      console.error('Upload: Arquivo muito grande', file.size)
      return NextResponse.json({ error: 'Arquivo muito grande. Máximo: 5MB' }, { status: 400 })
    }

    // Ler o arquivo como buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Criar nome único para o arquivo
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const extension = file.name.split('.').pop() || 'jpg'
    const filename = `banner-${timestamp}-${randomString}.${extension}`

    // Criar diretório se não existir
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'banners')
    console.log('Upload: Diretório de destino', uploadDir)
    
    if (!existsSync(uploadDir)) {
      console.log('Upload: Criando diretório', uploadDir)
      await mkdir(uploadDir, { recursive: true })
    }

    // Salvar arquivo
    const filepath = join(uploadDir, filename)
    console.log('Upload: Salvando arquivo', filepath)
    await writeFile(filepath, buffer)

    // Retornar URL do arquivo
    const url = `/uploads/banners/${filename}`
    console.log('Upload: Upload concluído com sucesso', url)

    return NextResponse.json({ url, filename })
  } catch (error) {
    console.error('Erro ao fazer upload:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    return NextResponse.json(
      { error: `Erro ao fazer upload: ${errorMessage}` },
      { status: 500 }
    )
  }
}
