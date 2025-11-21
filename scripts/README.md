# Scripts de Build

## generate-course-pages.ts

Este script gera arquivos HTML estáticos para cada curso durante o build, resolvendo o problema de 404 em links compartilhados.

### Como funciona:

1. **Durante o build**: O script busca todos os cursos da API
2. **Gera HTML**: Cria um arquivo `c/{slug}.html` para cada curso
3. **Redireciona**: Cada HTML redireciona automaticamente para `/?enroll={slug}`
4. **Meta tags**: Inclui Open Graph tags para compartilhamento no WhatsApp

### Estrutura gerada:

```
dist/
  c/
    como-utilizar-alimentadores-automaticos.html
    outro-curso.html
    ...
```

### Configuração:

O script usa a variável de ambiente `VITE_API_URL` ou `API_URL` para buscar os cursos. Se não estiver definida, usa o valor padrão: `https://backend-linkdecadastro.onrender.com`

### Execução:

O script é executado automaticamente durante o build:

```bash
npm run build
```

Ou manualmente:

```bash
npm run generate-course-pages
```

### Requisitos:

- Node.js com suporte a `fetch` (Node 18+)
- Acesso à API do backend durante o build
- `tsx` instalado (já está nas devDependencies)

