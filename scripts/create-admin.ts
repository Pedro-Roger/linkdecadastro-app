import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function createAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@linkdecadastro.com'
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'
  const adminName = process.env.ADMIN_NAME || 'Administrador'

  try {
    // Verificar se o admin já existe
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail }
    })

    if (existingAdmin) {
      console.log('✅ Usuário admin já existe:', adminEmail)
      return
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(adminPassword, 10)

    // Criar usuário admin
    const admin = await prisma.user.create({
      data: {
        name: adminName,
        email: adminEmail,
        password: hashedPassword,
        role: 'ADMIN'
      }
    })

    console.log('✅ Usuário admin criado com sucesso!')
    console.log('📧 Email:', admin.email)
    console.log('👤 Nome:', admin.name)
    console.log('🔑 Senha padrão:', adminPassword)
    console.log('⚠️  IMPORTANTE: Altere a senha após o primeiro login!')
  } catch (error) {
    console.error('❌ Erro ao criar usuário admin:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

createAdmin()

