const fs = require('fs')
const path = require('path')

// Mapeamento de rotas Next.js para React Router
const routeMapping = {
  'src/app/page.tsx': 'src/pages/HomePage.tsx',
  'src/app/login/page.tsx': 'src/pages/auth/LoginPage.tsx',
  'src/app/register/page.tsx': 'src/pages/auth/RegisterPage.tsx',
  'src/app/(auth)/login/page.tsx': 'src/pages/auth/LoginPage.tsx',
  'src/app/(auth)/register/page.tsx': 'src/pages/auth/RegisterPage.tsx',
  'src/app/(auth)/complete-profile/page.tsx': 'src/pages/auth/CompleteProfilePage.tsx',
  'src/app/(user)/courses/page.tsx': 'src/pages/user/CoursesPage.tsx',
  'src/app/(user)/my-courses/page.tsx': 'src/pages/user/MyCoursesPage.tsx',
  'src/app/(user)/profile/page.tsx': 'src/pages/user/ProfilePage.tsx',
  'src/app/course/[courseId]/page.tsx': 'src/pages/user/CoursePage.tsx',
  'src/app/(admin)/admin/dashboard/page.tsx': 'src/pages/admin/DashboardPage.tsx',
  'src/app/(admin)/admin/courses/page.tsx': 'src/pages/admin/CoursesPage.tsx',
  'src/app/(admin)/admin/courses/new/page.tsx': 'src/pages/admin/NewCoursePage.tsx',
  'src/app/(admin)/admin/courses/[courseId]/page.tsx': 'src/pages/admin/CoursePage.tsx',
  'src/app/(admin)/admin/courses/[courseId]/lessons/page.tsx': 'src/pages/admin/CourseLessonsPage.tsx',
  'src/app/(admin)/admin/courses/[courseId]/enrollments/page.tsx': 'src/pages/admin/CourseEnrollmentsPage.tsx',
  'src/app/(admin)/admin/events/page.tsx': 'src/pages/admin/EventsPage.tsx',
  'src/app/c/[slug]/page.tsx': 'src/pages/CourseBySlugPage.tsx',
  'src/app/register/[linkId]/page.tsx': 'src/pages/RegisterByLinkPage.tsx',
}

function migrateFile(sourcePath, targetPath) {
  if (!fs.existsSync(sourcePath)) {
    console.log(`⚠️  Arquivo não encontrado: ${sourcePath}`)
    return false
  }

  let content = fs.readFileSync(sourcePath, 'utf8')

  // Remover 'use client'
  content = content.replace(/'use client'\s*\n/g, '')
  content = content.replace(/"use client"\s*\n/g, '')

  // Substituir imports do Next.js
  content = content.replace(/from ['"]next\/link['"]/g, "from 'react-router-dom'")
  content = content.replace(/from ['"]next\/navigation['"]/g, "from 'react-router-dom'")
  content = content.replace(/from ['"]next\/image['"]/g, '// Image removido - usar <img>')

  // Substituir componentes do Next.js
  content = content.replace(/import Link from ['"]next\/link['"]/g, "import { Link } from 'react-router-dom'")
  content = content.replace(/import { useRouter } from ['"]next\/navigation['"]/g, "import { useNavigate } from 'react-router-dom'")
  content = content.replace(/import { useParams } from ['"]next\/navigation['"]/g, "import { useParams } from 'react-router-dom'")
  content = content.replace(/import { usePathname } from ['"]next\/navigation['"]/g, "import { useLocation } from 'react-router-dom'")

  // Substituir uso de useRouter
  content = content.replace(/const router = useRouter\(\)/g, 'const navigate = useNavigate()')
  content = content.replace(/router\.push\(/g, 'navigate(')
  content = content.replace(/router\.replace\(/g, 'navigate(')
  content = content.replace(/router\.back\(\)/g, 'navigate(-1)')
  content = content.replace(/router\.refresh\(\)/g, 'window.location.reload()')

  // Substituir uso de usePathname
  content = content.replace(/const pathname = usePathname\(\)/g, "const location = useLocation()")
  content = content.replace(/pathname ===/g, 'location.pathname ===')

  // Substituir Link do Next.js
  content = content.replace(/<Link href=/g, '<Link to=')
  content = content.replace(/<Link\s+to={['"](.*)['"]}/g, (match, path) => {
    // Converter rotas dinâmicas do Next.js para React Router
    if (path.includes('[')) {
      // Manter como está, será ajustado manualmente se necessário
      return match
    }
    return match
  })

  // Substituir Image do Next.js por img
  content = content.replace(/<Image\s+/g, '<img ')
  content = content.replace(/<\/Image>/g, '</img>')
  content = content.replace(/src=\{([^}]+)\}\s+alt=\{([^}]+)\}/g, (match, src, alt) => {
    return `src={${src}} alt={${alt}}`
  })
  content = content.replace(/width=\{(\d+)\}/g, '')
  content = content.replace(/height=\{(\d+)\}/g, '')
  content = content.replace(/priority/g, '')

  // Criar diretório de destino se não existir
  const targetDir = path.dirname(targetPath)
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true })
  }

  fs.writeFileSync(targetPath, content, 'utf8')
  console.log(`✅ Migrado: ${sourcePath} -> ${targetPath}`)
  return true
}

// Migrar todos os arquivos
console.log('🚀 Iniciando migração de páginas...\n')
let migrated = 0
let failed = 0

for (const [source, target] of Object.entries(routeMapping)) {
  if (migrateFile(source, target)) {
    migrated++
  } else {
    failed++
  }
}

console.log(`\n✅ Migração concluída!`)
console.log(`   Migrados: ${migrated}`)
console.log(`   Falhados: ${failed}`)
console.log(`\n⚠️  Verifique os arquivos migrados e ajuste manualmente se necessário.`)

