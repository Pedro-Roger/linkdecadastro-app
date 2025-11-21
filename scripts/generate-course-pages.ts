import fs from 'fs'
import path from 'path'

// URL da API - pode ser configurada via variável de ambiente
// Em produção, use a URL do backend
const API_URL = process.env.VITE_API_URL || process.env.API_URL || 'https://backend-linkdecadastro.onrender.com'

interface Course {
  id: string
  slug: string | null
  title: string
  description: string | null
  bannerUrl: string | null
}

async function fetchCourses(): Promise<Course[]> {
  try {
    const response = await fetch(`${API_URL}/courses`)
    if (!response.ok) {
      console.error(`Erro ao buscar cursos: ${response.statusText}`)
      return []
    }
    const courses = await response.json()
    return courses.filter((course: Course) => course.slug) // Apenas cursos com slug
  } catch (error) {
    console.error('Erro ao buscar cursos da API:', error)
    return []
  }
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

function generateCourseHTML(course: Course, baseUrl: string): string {
  // Agora aponta para enroll.html com parâmetro course
  const shareUrl = `${baseUrl}/enroll.html?course=${course.slug}`
  const imageUrl = course.bannerUrl 
    ? (course.bannerUrl.startsWith('http') ? course.bannerUrl : `${baseUrl}${course.bannerUrl}`)
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
    // Redireciona para o formulário de inscrição com o curso pré-selecionado
    const courseSlug = '${slug}';
    window.location.href = '/enroll.html?course=' + courseSlug;
  </script>
  
  <!-- Configuração da API -->
  <script src="/config.js"></script>
</body>
</html>`
}

async function generateCoursePages() {
  console.log('🔄 Buscando cursos da API...')
  const courses = await fetchCourses()
  
  if (courses.length === 0) {
    console.log('⚠️  Nenhum curso encontrado. Pulando geração de páginas.')
    return
  }
  
  console.log(`✅ Encontrados ${courses.length} cursos com slug`)
  
  const distDir = path.resolve(__dirname, '../dist')
  const cDir = path.join(distDir, 'c')
  
  // Cria diretório c/ se não existir
  if (!fs.existsSync(cDir)) {
    fs.mkdirSync(cDir, { recursive: true })
  }
  
  // Gera HTML para cada curso
  let generated = 0
  for (const course of courses) {
    if (!course.slug) continue
    
    const htmlContent = generateCourseHTML(course, '')
    const filePath = path.join(cDir, `${course.slug}.html`)
    
    fs.writeFileSync(filePath, htmlContent, 'utf-8')
    generated++
    console.log(`  ✓ Gerado: c/${course.slug}.html`)
  }
  
  console.log(`\n✅ ${generated} arquivos HTML gerados com sucesso!`)
  console.log(`📁 Arquivos salvos em: ${cDir}`)
}

// Executa o script
generateCoursePages().catch((error) => {
  console.error('❌ Erro ao gerar páginas:', error)
  process.exit(1)
})

