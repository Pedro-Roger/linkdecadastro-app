'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import Image from 'next/image'

const profileSchema = z.object({
  fullName: z.string().min(3, 'Nome completo deve ter pelo menos 3 caracteres'),
  phone: z.string().min(10, 'Telefone inválido').regex(/^[\d\s()+-]+$/, 'Telefone inválido'),
  cpf: z.string().min(11, 'CPF inválido').regex(/^\d{11}$/, 'CPF deve conter apenas números'),
})

type ProfileFormData = z.infer<typeof profileSchema>

export default function CompleteProfilePage() {
  const { data: session, status, update } = useSession()
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors } } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema)
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated' && !session?.user?.needsProfileCompletion) {
      // Se não precisa completar perfil, redirecionar
      router.push(session.user.role === 'ADMIN' ? '/admin/dashboard' : '/my-courses')
    }
  }, [status, session, router])

  const onSubmit = async (data: ProfileFormData) => {
    setSubmitting(true)
    setError(null)

    try {
      // Validar CPF (formato básico)
      const cpf = data.cpf.replace(/\D/g, '')
      if (cpf.length !== 11) {
        throw new Error('CPF deve conter 11 dígitos')
      }

      // Formatar telefone (remover caracteres não numéricos)
      const phone = data.phone.replace(/\D/g, '')

      const response = await fetch('/api/user/complete-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: data.fullName.trim(),
          phone: phone,
          cpf: cpf,
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao completar cadastro')
      }

      // Atualizar sessão
      await update()
      
      // Aguardar um pouco para garantir que a sessão foi atualizada
      setTimeout(() => {
        const userRole = session?.user?.role || 'USER'
        router.push(userRole === 'ADMIN' ? '/admin/dashboard' : '/my-courses')
      }, 500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao completar cadastro')
    } finally {
      setSubmitting(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-xl">Carregando...</div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <Link href="/" className="flex items-center">
            <Image
              src="/logo B.png"
              alt="Quero Cursos"
              width={300}
              height={100}
              className="h-16 md:h-20 w-auto object-contain"
              priority
            />
          </Link>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <div className="container mx-auto px-4 py-8 flex-1 flex items-center justify-center">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-md p-8">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-[#003366] mb-2">
                Complete seu Cadastro
              </h1>
              <p className="text-gray-600 text-sm">
                Preencha os dados abaixo para finalizar seu cadastro
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome Completo *
                </label>
                <input
                  {...register('fullName')}
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900"
                  placeholder="Seu nome completo"
                />
                {errors.fullName && (
                  <p className="text-red-500 text-sm mt-1">{errors.fullName.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefone/WhatsApp *
                </label>
                <input
                  {...register('phone')}
                  type="tel"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900"
                  placeholder="(00) 00000-0000"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Formato: (00) 00000-0000 ou 00000000000
                </p>
                {errors.phone && (
                  <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CPF *
                </label>
                <input
                  {...register('cpf')}
                  type="text"
                  maxLength={11}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900"
                  placeholder="00000000000"
                  onChange={(e) => {
                    // Remover caracteres não numéricos
                    const value = e.target.value.replace(/\D/g, '')
                    e.target.value = value
                  }}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Apenas números (11 dígitos)
                </p>
                {errors.cpf && (
                  <p className="text-red-500 text-sm mt-1">{errors.cpf.message}</p>
                )}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#FF6600] text-white py-3 px-4 rounded-md font-semibold hover:bg-[#e55a00] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Salvando...' : 'Finalizar Cadastro'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

