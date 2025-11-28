import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { apiFetch } from '@/lib/api'

const profileSchema = z.object({
  fullName: z.string().min(3, 'Nome completo deve ter pelo menos 3 caracteres'),
  phone: z.string().min(10, 'Telefone inválido').regex(/^[\d\s()+-]+$/, 'Telefone inválido'),
  cpf: z.string().min(11, 'CPF inválido').regex(/^\d{11}$/, 'CPF deve conter apenas números'),
})

type ProfileFormData = z.infer<typeof profileSchema>

export default function CompleteProfilePage() {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors } } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema)
  })

  useEffect(() => {
    const token =
      typeof window !== 'undefined'
        ? localStorage.getItem('token')
        : null

    if (!token) {
      navigate('/login')
      return
    }
  }, [navigate])

  const onSubmit = async (data: ProfileFormData) => {
    setSubmitting(true)
    setError(null)

    try {

      const cpf = data.cpf.replace(/\D/g, '')
      if (cpf.length !== 11) {
        throw new Error('CPF deve conter 11 dígitos')
      }


      const phone = data.phone.replace(/\D/g, '')

      await apiFetch(
        '/user/complete-profile',
        {
          method: 'POST',
          auth: true,
          body: JSON.stringify({
            fullName: data.fullName.trim(),
            phone: phone,
            cpf: cpf,
          }),
        },
      )

      navigate('/my-courses')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao completar cadastro')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <Link to="/" className="flex items-center">
            <img src="/logo B.png"
              alt="Link de Cadastro"
              
              
              className="h-16 md:h-20 w-auto object-contain"
              
            />
          </Link>
        </div>
      </header>

      
      <div className="container mx-auto px-4 py-8 flex-1 flex items-center justify-center">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-md p-8">
            <div className="text-center mb-6 relative">
              <Link
                to="/"
                className="absolute top-0 left-0 flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors text-gray-700 hover:text-[#003366]"
                title="Voltar para a página inicial"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </Link>
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
