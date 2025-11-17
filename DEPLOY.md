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

## ⚙️ Configuração da URL da API

### Opção 1: Configuração Dinâmica no Servidor (Recomendado)

Após fazer o upload dos arquivos para a Hostgator, você pode editar a URL da API diretamente no servidor:

1. **Acesse o cPanel da Hostgator**
2. **Abra o Gerenciador de Arquivos** (File Manager)
3. **Navegue até `public_html`** (ou o diretório do seu domínio)
4. **Abra o arquivo `config.js`** na raiz do `public_html`
5. **Edite a URL da API**:
   ```javascript
   window.APP_CONFIG = {
     API_URL: 'https://backend-linkdecadastro.onrender.com'
   };
   ```
6. **Salve o arquivo**

✅ **Vantagem:** Você pode alterar a URL da API sem precisar fazer um novo build!

### Opção 2: Configuração no Build

Se preferir configurar durante o build, crie um arquivo `.env.production` na raiz do projeto:

```
VITE_API_URL=https://backend-linkdecadastro.onrender.com
```

Depois execute:
```bash
npm run build
```

⚠️ **Nota:** Com esta opção, você precisará fazer um novo build sempre que quiser alterar a URL da API.

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

