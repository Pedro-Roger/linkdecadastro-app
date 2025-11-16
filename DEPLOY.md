# Instruções de Deploy para Hostgator

## ✅ Migração Concluída: Next.js → React + Vite

O projeto foi migrado com sucesso de Next.js para React puro usando Vite.

## 📦 Build

Para gerar os arquivos estáticos:

```bash
npm run build
```

Os arquivos serão gerados na pasta `dist/`.

## 🚀 Deploy na Hostgator

1. **Gere o build:**
   ```bash
   npm run build
   ```

2. **Acesse o cPanel da Hostgator**

3. **Abra o Gerenciador de Arquivos** (File Manager)

4. **Navegue até `public_html`** (ou o diretório do seu domínio)

5. **Faça upload do conteúdo da pasta `dist/`** para `public_html`

   ⚠️ **Importante:** Faça upload do **conteúdo** da pasta `dist/`, não a pasta `dist/` em si.

6. **Configure o `.htaccess`** (se necessário para React Router):

   Crie um arquivo `.htaccess` na raiz do `public_html` com:

   ```apache
   <IfModule mod_rewrite.c>
     RewriteEngine On
     RewriteBase /
     RewriteRule ^index\.html$ - [L]
     RewriteCond %{REQUEST_FILENAME} !-f
     RewriteCond %{REQUEST_FILENAME} !-d
     RewriteRule . /index.html [L]
   </IfModule>
   ```

   Isso é necessário para que o React Router funcione corretamente com rotas dinâmicas.

## ⚙️ Variáveis de Ambiente

Certifique-se de configurar a variável `NEXT_PUBLIC_API_URL` apontando para o backend Nest:

1. **Durante o build**, a variável `VITE_API_URL` (ou `NEXT_PUBLIC_API_URL`) será incorporada no bundle
2. Ou configure via arquivo `.env.production`:
   ```
   VITE_API_URL=https://seu-backend.com
   ```

## 📁 Estrutura Final

```
linkdecadastro-app/
├── dist/                    # Arquivos para deploy (gerados pelo build)
│   ├── index.html
│   ├── assets/
│   └── ...
├── src/
│   ├── pages/              # Páginas React
│   ├── components/         # Componentes
│   ├── lib/               # Utilitários
│   └── ...
├── public/                # Arquivos estáticos
├── vite.config.ts        # Configuração do Vite
└── package.json
```

## 🔄 Comandos Disponíveis

- `npm run dev` - Inicia servidor de desenvolvimento
- `npm run build` - Gera build para produção
- `npm run preview` - Pré-visualiza o build de produção

## ✅ O que foi migrado

- ✅ Todas as páginas do Next.js para React puro
- ✅ Next Router → React Router
- ✅ Next Image → `<img>` tags
- ✅ useRouter → useNavigate
- ✅ usePathname → useLocation
- ✅ Todas as rotas dinâmicas configuradas
- ✅ Componentes e hooks adaptados
- ✅ Build estático configurado para Hostgator

## 🎉 Pronto para Deploy!

O projeto está pronto para deploy na Hostgator compartilhada. Basta fazer upload dos arquivos da pasta `dist/` para o `public_html`.

