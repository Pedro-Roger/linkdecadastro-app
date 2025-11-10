'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import Image from 'next/image'
import NotificationBell from '@/components/notifications/NotificationBell'
import Footer from '@/components/ui/Footer'

const profileSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  bio: z.string().max(500).optional(),
  avatar: z.string().url().optional().or(z.literal('')),
})

type ProfileFormData = z.infer<typeof profileSchema>

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const { register, handleSubmit, formState: { errors }, reset } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema)
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch('/api/user/profile')
      if (res.ok) {
        const data = await res.json()
        setUser(data)
        reset({
          name: data.name,
          email: data.email,
          bio: data.bio || '',
          avatar: data.avatar || ''
        })
      }
    } catch (error) {
      console.error(error)
    }
  }, [])

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/user/stats')
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch (error) {
      console.error(error)
    }
  }, [])

  useEffect(() => {
    if (status === 'authenticated') {
      fetchUser()
      fetchStats()
    }
  }, [status, fetchUser, fetchStats])

  const onSubmit = async (data: ProfileFormData) => {
    setSubmitting(true)
    setSuccess(false)

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (res.ok) {
        const updated = await res.json()
        setUser(updated)
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      }
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error)
    } finally {
      setSubmitting(false)
    }
  }

  if (status === 'loading' || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Responsivo */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-2">
          <div className="flex flex-col md:flex-row items-center justify-between space-y-2 md:space-y-0">
            <Link href="/" className="flex items-center">
              <Image
                src="/logo B.png"
                alt="Link de Cadastro"
                width={300}
                height={100}
                className="h-20 md:h-24 w-auto object-contain"
                priority
              />
            </Link>
            <nav className="flex items-center space-x-4 md:space-x-6 text-sm md:text-base">
              <Link href="/courses" className="text-gray-700 hover:text-[#FF6600]">Cursos</Link>
              <Link href="/my-courses" className="text-gray-700 hover:text-[#FF6600]">Meus Cursos</Link>
              <NotificationBell />
              <Link href="/profile" className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#FF6600] text-white font-bold flex items-center justify-center">
                {user.name.charAt(0).toUpperCase()}
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="bg-red-500 text-white px-4 py-2 rounded-md font-semibold hover:bg-red-600 transition-colors text-sm md:text-base"
              >
                Sair
              </button>
            </nav>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-[#003366]">Meu Perfil</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Sidebar com Estatísticas */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="flex flex-col items-center mb-4">
                <div className="w-20 h-20 rounded-full bg-[#FF6600] text-white flex items-center justify-center text-2xl font-bold mb-3">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <h2 className="text-xl font-semibold text-[#003366]">{user.name}</h2>
                <p className="text-gray-500 text-sm">{user.email}</p>
              </div>

              {stats && (
                <div className="space-y-4 pt-4 border-t border-gray-200">
                  <div>
                    <div className="text-2xl font-bold text-[#FF6600]">{stats.coursesEnrolled}</div>
                    <div className="text-sm text-gray-600">Cursos Inscritos</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-[#FF6600]">{stats.lessonsCompleted}</div>
                    <div className="text-sm text-gray-600">Aulas Concluídas</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-[#FF6600]">{stats.totalProgress}%</div>
                    <div className="text-sm text-gray-600">Progresso Médio</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Formulário de Edição */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6 md:p-8">
              <h2 className="text-xl font-semibold mb-6 text-[#003366]">Editar Perfil</h2>

              {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
                  Perfil atualizado com sucesso!
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome Completo *
                  </label>
                  <input
                    {...register('name')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900"
                  />
                  {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    E-mail *
                  </label>
                  <input
                    type="email"
                    {...register('email')}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">O e-mail não pode ser alterado</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    URL do Avatar (opcional)
                  </label>
                  <input
                    type="url"
                    {...register('avatar')}
                    placeholder="https://exemplo.com/avatar.jpg"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900"
                  />
                  {errors.avatar && <p className="text-red-500 text-sm mt-1">{errors.avatar.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bio (opcional)
                  </label>
                  <textarea
                    {...register('bio')}
                    rows={4}
                    maxLength={500}
                    placeholder="Conte um pouco sobre você..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900"
                  />
                  {errors.bio && <p className="text-red-500 text-sm mt-1">{errors.bio.message}</p>}
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-[#FF6600] text-white py-3 px-6 rounded-md font-semibold hover:bg-[#e55a00] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}

