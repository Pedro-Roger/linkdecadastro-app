# Quero Cursos - Sistema de Cadastro e Plataforma de Cursos

Sistema completo de cadastro de eventos e plataforma de cursos com gamificação, comentários e notificações.

## 🚀 Funcionalidades

### Sistema de Cadastro
- ✅ Formulário dinâmico com campos personalizados
- ✅ Controle de limites por município
- ✅ Criação automática de turmas quando limite é atingido
- ✅ Bloqueio de CPF duplicado
- ✅ Envio automático de emails

### Plataforma de Cursos
- ✅ Sistema de gamificação com progresso de vídeos
- ✅ Player de vídeo YouTube integrado
- ✅ Comentários em cada aula
- ✅ Notificações em tempo real
- ✅ Painel administrativo completo

### Autenticação e Usuários
- ✅ Sistema de roles (ADMIN/USER)
- ✅ Cadastro automático ao se inscrever em cursos
- ✅ Página de perfil com estatísticas
- ✅ Sistema de notificações

## 📋 Pré-requisitos

- Node.js 18+ 
- MongoDB (local ou Atlas)
- npm ou yarn

## 🛠️ Instalação

1. **Clone o repositório ou navegue até a pasta do projeto:**
```bash
cd linkdecadastro-app
```

2. **Instale as dependências:**
```bash
npm install
```

3. **Configure as variáveis de ambiente:**
O arquivo `.env` já existe. Configure as seguintes variáveis:

```env
# Database
DATABASE_URL="sua-url-do-mongodb"

# NextAuth
NEXTAUTH_SECRET="seu-secret-aqui"
NEXTAUTH_URL="http://localhost:3000"

# Google OAuth (opcional - para login pelo Google)
GOOGLE_CLIENT_ID="seu-google-client-id"
GOOGLE_CLIENT_SECRET="seu-google-client-secret"

# JWT Secret (para autenticação)
JWT_SECRET="seu-jwt-secret-super-seguro-aqui-altere-em-producao"

# Next Auth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="seu-nextauth-secret-aqui-altere-em-producao"

# Email (opcional - para envio de emails)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="seu-email@gmail.com"
SMTP_PASS="sua-senha"
SMTP_FROM="noreply@linkdecadastro.com"
```

4. **Gere o Prisma Client:**
```bash
npx prisma generate
```

5. **Faça o push do schema para o MongoDB:**
```bash
npx prisma db push
```

6. **Popule o banco de dados com dados iniciais (seed):**
```bash
npm run prisma:seed
```

Isso criará:
- **Usuário Admin:**
  - Email: `admin@linkdecadastro.com`
  - Senha: `admin123`
  - Role: `ADMIN`
- **Usuários de exemplo:**
  - Email: `joao@example.com` / Senha: `user123`
  - Email: `maria@example.com` / Senha: `user123`
- **6 cursos de exemplo** com diferentes status e datas
- **Inscrições de exemplo**

> ⚠️ **IMPORTANTE:** Altere a senha do admin após o primeiro login em produção!

**Alternativa - Criar apenas o usuário admin:**
```bash
npm run create-admin
```

Você pode configurar as credenciais do admin através de variáveis de ambiente:
```env
ADMIN_EMAIL=admin@linkdecadastro.com
ADMIN_PASSWORD=admin123
ADMIN_NAME=Administrador
```

7. **Inicie o servidor de desenvolvimento:**
```bash
npm run dev
```

8. **Acesse a aplicação:**
Abra [http://localhost:3000](http://localhost:3000) no seu navegador.

## 📁 Estrutura do Projeto

```
linkdecadastro-app/
├── prisma/
│   └── schema.prisma          # Schema do banco de dados
├── src/
│   ├── app/
│   │   ├── api/               # APIs REST
│   │   ├── (auth)/           # Páginas de autenticação
│   │   ├── (admin)/           # Páginas administrativas
│   │   ├── (user)/            # Páginas do usuário
│   │   ├── (public)/          # Páginas públicas
│   │   └── page.tsx           # Página inicial
│   ├── components/
│   │   ├── forms/             # Componentes de formulário
│   │   ├── notifications/     # Componentes de notificação
│   │   └── ui/                # Componentes UI
│   ├── lib/
│   │   ├── prisma.ts          # Cliente Prisma
│   │   └── auth.ts            # Configuração NextAuth
│   ├── services/
│   │   ├── email.ts           # Serviço de email
│   │   └── registration.ts   # Serviço de registro
│   └── types/
│       └── index.ts           # Tipos TypeScript
└── package.json
```

## 🎯 Uso

### Como Admin

1. Faça login com a conta admin:
   - **Email:** `admin@linkdecadastro.com`
   - **Senha:** `admin123`
2. Acesse o Dashboard em `/admin/dashboard`
3. Crie cursos em `/admin/courses/new`
4. Adicione aulas aos cursos em `/admin/courses/[courseId]/lessons`
5. Cole a URL do YouTube na aula - o sistema fará o embed automaticamente
6. Configure datas de início e fim dos cursos para controle de disponibilidade

### Como Usuário

1. Faça login ou cadastre-se
2. Navegue pelos cursos disponíveis em `/courses`
3. Inscreva-se em um curso
4. Assista às aulas e acompanhe seu progresso
5. Deixe comentários nas aulas
6. Acompanhe suas estatísticas no perfil

### Sistema de Cadastro

1. Acesse um link de cadastro: `/register/[linkId]`
2. Preencha o formulário
3. O sistema criará automaticamente um usuário se necessário
4. Emails de confirmação serão enviados

## 🔧 Tecnologias Utilizadas

- **Next.js 14** - Framework React
- **TypeScript** - Tipagem estática
- **Prisma** - ORM para MongoDB
- **NextAuth** - Autenticação
- **Tailwind CSS** - Estilização
- **React Hook Form** - Formulários
- **Zod** - Validação
- **React Player** - Player de vídeo
- **date-fns** - Manipulação de datas

## 📝 Notas Importantes

- O sistema cria usuários automaticamente quando alguém se cadastra em um evento
- O progresso dos vídeos é salvo automaticamente quando 90% é assistido
- Notificações são criadas automaticamente para eventos importantes
- O sistema suporta criação automática de turmas quando o limite de vagas é atingido
- **Usuários cadastrados sempre terão role USER** - apenas o seed cria usuários ADMIN
- Use `npm run prisma:seed` para resetar e popular o banco com dados de exemplo

## 🔐 Login pelo Google

O sistema suporta login pelo Google. Para configurar:

1. **Criar projeto no Google Cloud Console:**
   - Acesse [Google Cloud Console](https://console.cloud.google.com/)
   - Crie um novo projeto ou selecione um existente
   - Vá em "APIs e Serviços" > "Credenciais"
   - Clique em "Criar credenciais" > "ID do cliente OAuth"

2. **Configurar OAuth 2.0:**
   - Tipo de aplicativo: Aplicativo da Web
   - Nome: Quero Cursos
   - URLs de redirecionamento autorizadas:
     - `http://localhost:3000/api/auth/callback/google` (desenvolvimento)
     - `https://seudominio.com/api/auth/callback/google` (produção)

3. **Adicionar variáveis de ambiente:**
   - Adicione `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` ao arquivo `.env.local`

4. **Completar cadastro:**
   - Usuários que fizerem login pelo Google serão redirecionados para completar o cadastro
   - Campos obrigatórios: Nome completo, Telefone/WhatsApp e CPF

## 🐛 Troubleshooting

**Erro ao conectar ao MongoDB:**
- Verifique se a URL do DATABASE_URL está correta
- Certifique-se de que o MongoDB está rodando (se local) ou acessível (se Atlas)

**Erro ao gerar Prisma Client:**
- Execute `npx prisma generate` novamente
- Verifique se o schema.prisma está correto

**Erro de autenticação:**
- Verifique se NEXTAUTH_SECRET está configurado
- Certifique-se de que o usuário existe no banco de dados

## 📄 Licença

Este projeto é privado e proprietário.

# linkdecadastro-app
# linkdecadastro-app
