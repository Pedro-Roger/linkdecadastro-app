import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        })

        if (!user || !user.password) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          needsProfileCompletion: user.needsProfileCompletion,
        }
      }
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Se for login do Google
      if (account?.provider === 'google') {
        try {
          // Verificar se o usuário já existe
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email || '' }
          })

          if (!existingUser) {
            // Criar novo usuário do Google
            const newUser = await prisma.user.create({
              data: {
                email: user.email || '',
                name: user.name || '',
                password: null, // Usuários do Google não têm senha
                avatar: user.image || null,
                needsProfileCompletion: true, // Precisa completar cadastro
              }
            })
            user.id = newUser.id
            user.role = newUser.role
            user.needsProfileCompletion = true
          } else {
            // Usuário existe, verificar se precisa completar perfil
            user.id = existingUser.id
            user.role = existingUser.role
            user.needsProfileCompletion = existingUser.needsProfileCompletion || 
              !existingUser.fullName || 
              !existingUser.phone || 
              !existingUser.cpf
          }
        } catch (error) {
          console.error('Erro ao processar login do Google:', error)
          return false
        }
      }
      return true
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.role = user.role
        token.id = user.id
        token.needsProfileCompletion = user.needsProfileCompletion || false
      }
      
      // Se for login do Google, buscar dados atualizados do usuário
      if (account?.provider === 'google' && token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string }
        })
        if (dbUser) {
          token.role = dbUser.role
          // Verificar se precisa completar perfil (se não tem fullName, phone ou cpf)
          token.needsProfileCompletion = dbUser.needsProfileCompletion || 
            !dbUser.fullName || 
            !dbUser.phone || 
            !dbUser.cpf
        }
      }
      
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string
        session.user.id = token.id as string
        session.user.needsProfileCompletion = token.needsProfileCompletion as boolean
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      // Permitir callbackUrl
      if (url.includes('callbackUrl')) {
        return url
      }
      // Redirecionar para URL válida
      return url.startsWith(baseUrl) ? url : baseUrl
    }
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
}

