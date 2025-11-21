import fs from 'fs'
import path from 'path'

// Este script pode ser chamado via API ou linha de comando
// Para gerar HTML de um curso específico após criação

interface Course {
  id: string
  slug: string | null
  title: string
  description: string | null
  bannerUrl: string | null
}

function escapeHtml(text: string | null | undefined): string {
  if (!text) return ''
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function generateCourseHTML(course: Course, baseUrl: string, apiUrl: string): string {
  const shareUrl = `${baseUrl}/enroll.html?course=${course.slug}`
  const imageUrl = course.bannerUrl 
    ? (course.bannerUrl.startsWith('http') ? course.bannerUrl : `${apiUrl}${course.bannerUrl}`)
    : `${baseUrl}/logo.png`
  
  const title = escapeHtml(course.title)
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
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #003366 0%, #FF6600 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container {
      text-align: center;
      color: white;
      padding: 2rem;
    }
    .logo {
      max-width: 200px;
      margin-bottom: 2rem;
    }
    h1 {
      font-size: 2rem;
      margin-bottom: 1rem;
    }
    p {
      font-size: 1.1rem;
      margin-bottom: 2rem;
      opacity: 0.9;
    }
    .loading {
      display: inline-block;
      width: 40px;
      height: 40px;
      border: 4px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="container">
    <img src="/logo B.png" alt="Link de Cadastro" class="logo" />
    <h1>${title}</h1>
    <p>Redirecionando para o formulário de inscrição...</p>
    <div class="loading"></div>
  </div>
  
  <script>
    // Redireciona para o formulário de inscrição
    const courseSlug = '${slug}';
    window.location.href = '/enroll.html?course=' + courseSlug;
  </script>
  
  <script src="/config.js"></script>
</body>
</html>`
}

async function generateCourseHTMLFile(courseIdOrSlug: string) {
  const API_URL = process.env.VITE_API_URL || process.env.API_URL || 'https://backend-linkdecadastro.onrender.com'
  
  try {
    // Tenta buscar por slug primeiro, depois por ID
    let course: Course | null = null
    
    try {
      const response = await fetch(`${API_URL}/courses/slug/${courseIdOrSlug}`)
      if (response.ok) {
        course = await response.json()
      }
    } catch {
      // Se não encontrar por slug, tenta por ID
    }
    
    if (!course) {
      // Busca por ID (requer autenticação, então vamos tentar buscar todos e filtrar)
      const response = await fetch(`${API_URL}/courses`)
      if (response.ok) {
        const courses = await response.json()
        course = courses.find((c: Course) => c.id === courseIdOrSlug || c.slug === courseIdOrSlug)
      }
    }
    
    if (!course || !course.slug) {
      console.error('❌ Curso não encontrado ou não possui slug')
      process.exit(1)
    }
    
    console.log(`✅ Curso encontrado: ${course.title}`)
    
    const distDir = path.resolve(__dirname, '../dist')
    const cDir = path.join(distDir, 'c')
    
    // Cria diretório c/ se não existir
    if (!fs.existsSync(cDir)) {
      fs.mkdirSync(cDir, { recursive: true })
    }
    
    const htmlContent = generateCourseHTML(course, '', API_URL)
    const filePath = path.join(cDir, `${course.slug}.html`)
    
    fs.writeFileSync(filePath, htmlContent, 'utf-8')
    console.log(`✅ Arquivo gerado: c/${course.slug}.html`)
    console.log(`📁 Arquivo salvo em: ${filePath}`)
    console.log(`🔗 Link: https://linkdecadastro.com.br/c/${course.slug}`)
    
  } catch (error) {
    console.error('❌ Erro ao gerar página:', error)
    process.exit(1)
  }
}

// Pega o ID ou slug da linha de comando
const courseIdOrSlug = process.argv[2]

if (!courseIdOrSlug) {
  console.error('❌ Uso: tsx scripts/generate-course-html-api.ts <course-id-ou-slug>')
  console.log('Exemplo: tsx scripts/generate-course-html-api.ts como-utilizar-alimentadores-automaticos')
  process.exit(1)
}

generateCourseHTMLFile(courseIdOrSlug)

