import fs from 'fs'
import path from 'path'

// URL da API
const API_URL = process.env.VITE_API_URL || process.env.API_URL || 'https://backend-linkdecadastro.onrender.com'

// Template base para todas as páginas HTML
// Simplesmente redireciona para a rota sem .html
function generateBaseHTML(title: string, description: string, route: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} - Link de Cadastro</title>
  <meta name="description" content="${description}" />
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content="" />
  <meta property="og:title" content="${title} - Link de Cadastro" />
  <meta property="og:description" content="${description}" />
  <meta property="og:image" content="/logo.png" />
  <meta property="og:site_name" content="Link de Cadastro" />
  
  <link rel="icon" type="image/png" href="/logo.png" />
  <meta http-equiv="refresh" content="0; url=${route}" />
  <script>window.location.replace('${route}');</script>
</head>
<body>
  <p>Redirecionando... <a href="${route}">Clique aqui se não redirecionar automaticamente</a></p>
</body>
</html>`
}

// Rotas estáticas (não dependem de dados da API)
const staticRoutes = [
  { path: '/', title: 'Início', description: 'Página inicial - Link de Cadastro' },
  { path: '/login', title: 'Entrar', description: 'Faça login na sua conta' },
  { path: '/register', title: 'Cadastrar', description: 'Crie sua conta' },
  { path: '/complete-profile', title: 'Completar Perfil', description: 'Complete seu perfil' },
  { path: '/courses', title: 'Cursos', description: 'Lista de cursos disponíveis' },
  { path: '/my-courses', title: 'Meus Cursos', description: 'Cursos em que você está inscrito' },
  { path: '/profile', title: 'Perfil', description: 'Seu perfil de usuário' },
  { path: '/admin/dashboard', title: 'Painel Admin', description: 'Painel de administração' },
  { path: '/admin/courses', title: 'Gerenciar Cursos', description: 'Gerenciar cursos' },
  { path: '/admin/courses/new', title: 'Novo Curso', description: 'Criar novo curso' },
  { path: '/admin/events', title: 'Eventos', description: 'Gerenciar eventos' },
  { path: '/auth/google/callback', title: 'Autenticação Google', description: 'Processando login do Google' },
]

// Função para gerar HTML de uma rota
function generateRouteHTML(route: { path: string; title: string; description: string }): string {
  return generateBaseHTML(route.title, route.description, route.path)
}

// Função para criar estrutura de diretórios
function ensureDirectoryExists(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

// Função para salvar arquivo HTML
function saveHTMLFile(filePath: string, content: string) {
  ensureDirectoryExists(path.dirname(filePath))
  fs.writeFileSync(filePath, content, 'utf-8')
}

// Função para buscar cursos da API
async function fetchCourses(): Promise<any[]> {
  try {
    const response = await fetch(`${API_URL}/courses`)
    if (!response.ok) {
      console.error(`Erro ao buscar cursos: ${response.statusText}`)
      return []
    }
    return await response.json()
  } catch (error) {
    console.error('Erro ao buscar cursos:', error)
    return []
  }
}

// Função para buscar eventos da API
async function fetchEvents(): Promise<any[]> {
  try {
    const response = await fetch(`${API_URL}/events`)
    if (!response.ok) {
      // Eventos podem requerer autenticação, então apenas loga e retorna vazio
      if (response.status === 401 || response.status === 403) {
        console.log('⚠️  Eventos requerem autenticação, pulando geração de páginas de eventos')
      } else {
        console.log(`⚠️  Erro ao buscar eventos: ${response.statusText}`)
      }
      return []
    }
    return await response.json()
  } catch (error) {
    // Não é crítico se não conseguir buscar eventos
    console.log('⚠️  Não foi possível buscar eventos (pode requerer autenticação)')
    return []
  }
}

// Função para escapar HTML
function escapeHtml(text: string | null | undefined): string {
  if (!text) return ''
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// Função para gerar HTML para curso específico
function generateCourseHTML(course: any, baseUrl: string): string {
  const shareUrl = `${baseUrl}/enroll.html?course=${course.slug}`
  const imageUrl = course.bannerUrl 
    ? (course.bannerUrl.startsWith('http') ? course.bannerUrl : `${API_URL}${course.bannerUrl}`)
    : `${baseUrl}/logo.png`
  
  const title = escapeHtml(course.title || 'Curso')
  const description = escapeHtml(course.description || 'Inscreva-se neste curso no Link de Cadastro')
  const slug = escapeHtml(course.slug || '')

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} - Link de Cadastro</title>
  <meta name="description" content="${description}" />
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${shareUrl}" />
  <meta property="og:title" content="${title} - Link de Cadastro" />
  <meta property="og:description" content="${description}" />
  <meta property="og:image" content="${imageUrl}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:site_name" content="Link de Cadastro" />
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:url" content="${shareUrl}" />
  <meta name="twitter:title" content="${title} - Link de Cadastro" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${imageUrl}" />
  
  <link rel="icon" type="image/png" href="/logo.png" />
  <meta http-equiv="refresh" content="0; url=/enroll.html?course=${slug}" />
  <script>window.location.replace('/enroll.html?course=${slug}');</script>
</head>
<body>
  <p>Redirecionando... <a href="/enroll.html?course=${slug}">Clique aqui se não redirecionar automaticamente</a></p>
</body>
</html>`
}

// Função principal
async function generateAllPages() {
  console.log('🔄 Iniciando geração de todas as páginas HTML...\n')
  
  const distDir = path.resolve(__dirname, '../dist')
  
  // 1. Gerar rotas estáticas
  console.log('📄 Gerando rotas estáticas...')
  let staticCount = 0
  for (const route of staticRoutes) {
    // Pula a raiz, já tem index.html do Vite
    if (route.path === '/') {
      continue
    }
    
    const html = generateRouteHTML(route)
    // Remove barra inicial e cria arquivo
    const cleanPath = route.path.replace(/^\//, '').replace(/\/$/, '')
    
    // Cria estrutura de diretórios
    const pathParts = cleanPath.split('/')
    let filePath: string
    
    if (pathParts.length > 1) {
      // Rota aninhada, cria diretório com index.html
      // Exemplo: /admin/courses -> /admin/courses/index.html
      const dirPath = path.join(distDir, ...pathParts)
      ensureDirectoryExists(dirPath)
      filePath = path.join(dirPath, 'index.html')
    } else {
      // Rota simples, cria arquivo.html
      // Exemplo: /login -> /login.html
      filePath = path.join(distDir, `${cleanPath}.html`)
    }
    
    saveHTMLFile(filePath, html)
    staticCount++
    console.log(`  ✓ ${route.path} -> ${filePath.replace(distDir, '')}`)
  }
  console.log(`✅ ${staticCount} rotas estáticas geradas\n`)
  
  // 2. Gerar páginas dinâmicas de cursos
  console.log('📚 Buscando cursos da API...')
  const courses = await fetchCourses()
  const coursesWithSlug = courses.filter((c: any) => c.slug)
  console.log(`✅ Encontrados ${coursesWithSlug.length} cursos com slug\n`)
  
  console.log('📄 Gerando páginas de cursos...')
  const cDir = path.join(distDir, 'c')
  ensureDirectoryExists(cDir)
  
  let courseCount = 0
  for (const course of coursesWithSlug) {
    const html = generateCourseHTML(course, '')
    const filePath = path.join(cDir, `${course.slug}.html`)
    saveHTMLFile(filePath, html)
    courseCount++
    console.log(`  ✓ /c/${course.slug}`)
  }
  console.log(`✅ ${courseCount} páginas de cursos geradas\n`)
  
  // 3. Gerar páginas dinâmicas de eventos (register/:linkId)
  console.log('📅 Buscando eventos da API...')
  const events = await fetchEvents()
  const eventsWithLink = events.filter((e: any) => e.linkId)
  console.log(`✅ Encontrados ${eventsWithLink.length} eventos com linkId\n`)
  
  console.log('📄 Gerando páginas de registro por link...')
  const registerDir = path.join(distDir, 'register')
  ensureDirectoryExists(registerDir)
  
  let eventCount = 0
  for (const event of eventsWithLink) {
    const html = generateBaseHTML(
      event.title || 'Registro de Evento',
      event.description || 'Registre-se neste evento',
      `/register/${event.linkId}`
    )
    const filePath = path.join(registerDir, `${event.linkId}.html`)
    saveHTMLFile(filePath, html)
    eventCount++
    console.log(`  ✓ /register/${event.linkId}`)
  }
  console.log(`✅ ${eventCount} páginas de eventos geradas\n`)
  
  console.log('🎉 Geração concluída!')
  console.log(`\n📊 Resumo:`)
  console.log(`   - Rotas estáticas: ${staticCount}`)
  console.log(`   - Páginas de cursos: ${courseCount}`)
  console.log(`   - Páginas de eventos: ${eventCount}`)
  console.log(`   - Total: ${staticCount + courseCount + eventCount} arquivos HTML`)
  console.log(`\n📁 Arquivos salvos em: ${distDir}`)
}

// Executa o script
generateAllPages().catch((error) => {
  console.error('❌ Erro ao gerar páginas:', error)
  process.exit(1)
})

