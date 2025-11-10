'use client'

import { useState, useEffect } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const enrollmentSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  cpf: z.string().min(11, 'CPF deve ter 11 dígitos').max(11, 'CPF deve ter 11 dígitos').regex(/^\d+$/, 'CPF deve conter apenas números'),
  birthDate: z.string().min(1, 'Data de nascimento é obrigatória'),
  participantType: z.enum(['ESTUDANTE', 'PROFESSOR', 'PESQUISADOR', 'PRODUTOR'], {
    required_error: 'Selecione o tipo de participante'
  }),
  hectares: z.string().optional().transform((val) => {
    if (!val || val.trim() === '') return undefined
    const num = parseFloat(val)
    return isNaN(num) ? undefined : num
  }),
  state: z.string().min(2, 'Estado é obrigatório'),
  city: z.string().min(1, 'Cidade é obrigatória'),
}).refine((data) => {
  // Se for produtor, hectares é obrigatório
  if (data.participantType === 'PRODUTOR') {
    return data.hectares !== undefined && data.hectares !== null && data.hectares > 0
  }
  return true
}, {
  message: 'Hectares é obrigatório para produtores e deve ser maior que zero',
  path: ['hectares']
})

type EnrollmentFormData = z.infer<typeof enrollmentSchema>

interface CourseEnrollmentModalProps {
  isOpen: boolean
  onClose: () => void
  courseId: string
  courseTitle: string
  onSuccess?: () => void
}

interface State {
  sigla: string
  nome: string
}

interface City {
  nome: string
}

export default function CourseEnrollmentModal({
  isOpen,
  onClose,
  courseId,
  courseTitle,
  onSuccess
}: CourseEnrollmentModalProps) {
  const { data: session } = useSession()
  const [states, setStates] = useState<State[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [loadingStates, setLoadingStates] = useState(false)
  const [loadingCities, setLoadingCities] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isRegistering, setIsRegistering] = useState(false)

  const { register, handleSubmit, watch, setValue, formState: { errors }, reset } = useForm<EnrollmentFormData>({
    resolver: zodResolver(enrollmentSchema)
  })

  const selectedState = watch('state')
  const participantType = watch('participantType')

  // Buscar estados da API do IBGE
  useEffect(() => {
    if (isOpen) {
      fetchStates()
    }
  }, [isOpen])

  // Buscar cidades quando o estado mudar
  useEffect(() => {
    if (selectedState && selectedState.length === 2) {
      fetchCities(selectedState)
    } else {
      setCities([])
      setValue('city', '')
    }
  }, [selectedState, setValue])

  const fetchStates = async () => {
    try {
      setLoadingStates(true)
      const response = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome')
      if (response.ok) {
        const data = await response.json()
        setStates(data)
      } else {
        // Fallback: lista básica de estados
        setStates([
          { sigla: 'AC', nome: 'Acre' },
          { sigla: 'AL', nome: 'Alagoas' },
          { sigla: 'AP', nome: 'Amapá' },
          { sigla: 'AM', nome: 'Amazonas' },
          { sigla: 'BA', nome: 'Bahia' },
          { sigla: 'CE', nome: 'Ceará' },
          { sigla: 'DF', nome: 'Distrito Federal' },
          { sigla: 'ES', nome: 'Espírito Santo' },
          { sigla: 'GO', nome: 'Goiás' },
          { sigla: 'MA', nome: 'Maranhão' },
          { sigla: 'MT', nome: 'Mato Grosso' },
          { sigla: 'MS', nome: 'Mato Grosso do Sul' },
          { sigla: 'MG', nome: 'Minas Gerais' },
          { sigla: 'PA', nome: 'Pará' },
          { sigla: 'PB', nome: 'Paraíba' },
          { sigla: 'PR', nome: 'Paraná' },
          { sigla: 'PE', nome: 'Pernambuco' },
          { sigla: 'PI', nome: 'Piauí' },
          { sigla: 'RJ', nome: 'Rio de Janeiro' },
          { sigla: 'RN', nome: 'Rio Grande do Norte' },
          { sigla: 'RS', nome: 'Rio Grande do Sul' },
          { sigla: 'RO', nome: 'Rondônia' },
          { sigla: 'RR', nome: 'Roraima' },
          { sigla: 'SC', nome: 'Santa Catarina' },
          { sigla: 'SP', nome: 'São Paulo' },
          { sigla: 'SE', nome: 'Sergipe' },
          { sigla: 'TO', nome: 'Tocantins' },
        ])
      }
    } catch (error) {
      console.error('Erro ao buscar estados:', error)
      // Usar lista fallback
      setStates([
        { sigla: 'AC', nome: 'Acre' },
        { sigla: 'AL', nome: 'Alagoas' },
        { sigla: 'AP', nome: 'Amapá' },
        { sigla: 'AM', nome: 'Amazonas' },
        { sigla: 'BA', nome: 'Bahia' },
        { sigla: 'CE', nome: 'Ceará' },
        { sigla: 'DF', nome: 'Distrito Federal' },
        { sigla: 'ES', nome: 'Espírito Santo' },
        { sigla: 'GO', nome: 'Goiás' },
        { sigla: 'MA', nome: 'Maranhão' },
        { sigla: 'MT', nome: 'Mato Grosso' },
        { sigla: 'MS', nome: 'Mato Grosso do Sul' },
        { sigla: 'MG', nome: 'Minas Gerais' },
        { sigla: 'PA', nome: 'Pará' },
        { sigla: 'PB', nome: 'Paraíba' },
        { sigla: 'PR', nome: 'Paraná' },
        { sigla: 'PE', nome: 'Pernambuco' },
        { sigla: 'PI', nome: 'Piauí' },
        { sigla: 'RJ', nome: 'Rio de Janeiro' },
        { sigla: 'RN', nome: 'Rio Grande do Norte' },
        { sigla: 'RS', nome: 'Rio Grande do Sul' },
        { sigla: 'RO', nome: 'Rondônia' },
        { sigla: 'RR', nome: 'Roraima' },
        { sigla: 'SC', nome: 'Santa Catarina' },
        { sigla: 'SP', nome: 'São Paulo' },
        { sigla: 'SE', nome: 'Sergipe' },
        { sigla: 'TO', nome: 'Tocantins' },
      ])
    } finally {
      setLoadingStates(false)
    }
  }

  const fetchCities = async (stateSigla: string) => {
    try {
      setLoadingCities(true)
      const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${stateSigla}/municipios`)
      if (response.ok) {
        const data = await response.json()
        const sortedCities = data.sort((a: City, b: City) => a.nome.localeCompare(b.nome))
        setCities(sortedCities)
      } else {
        setCities([])
      }
    } catch (error) {
      console.error('Erro ao buscar cidades:', error)
      setCities([])
    } finally {
      setLoadingCities(false)
    }
  }

  const onSubmit = async (data: EnrollmentFormData) => {
    setSubmitting(true)
    setError(null)

    try {
      // Se o usuário não estiver logado, primeiro registrar
      if (!session) {
        setIsRegistering(true)
        
        // Registrar o usuário
        const registerResponse = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: data.name,
            email: data.email,
            password: data.password,
            cpf: data.cpf.replace(/\D/g, ''),
            birthDate: data.birthDate,
            participantType: data.participantType,
            hectares: data.participantType === 'PRODUTOR' ? (typeof data.hectares === 'number' ? data.hectares : parseFloat(data.hectares || '0')) : undefined,
            state: data.state,
            city: data.city,
          })
        })

        if (!registerResponse.ok) {
          const errorData = await registerResponse.json()
          throw new Error(errorData.error || 'Erro ao registrar usuário')
        }

        // Fazer login automaticamente após registro
        const signInResult = await signIn('credentials', {
          email: data.email,
          password: data.password,
          redirect: false,
        })

        if (!signInResult?.ok) {
          throw new Error('Erro ao fazer login após registro')
        }

        setIsRegistering(false)
      }

      // Inscrever no curso
      const enrollResponse = await fetch(`/api/courses/${courseId}/enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cpf: data.cpf.replace(/\D/g, ''),
          birthDate: data.birthDate,
          participantType: data.participantType,
          hectares: data.participantType === 'PRODUTOR' ? (typeof data.hectares === 'number' ? data.hectares : parseFloat(data.hectares || '0')) : undefined,
          state: data.state,
          city: data.city,
        })
      })

      if (!enrollResponse.ok) {
        const errorData = await enrollResponse.json()
        throw new Error(errorData.error || 'Erro ao inscrever no curso')
      }

      reset()
      if (onSuccess) {
        onSuccess()
      }
      onClose()
      
      // Recarregar a página para atualizar a sessão
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao processar inscrição')
      setIsRegistering(false)
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-[#003366]">
            {session ? 'Inscrever-se no Curso' : 'Cadastrar e Inscrever-se no Curso'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          <p className="text-gray-600 mb-6">Curso: <span className="font-semibold text-[#003366]">{courseTitle}</span></p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {!session && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome Completo *
                  </label>
                  <input
                    {...register('name')}
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900"
                  />
                  {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    E-mail *
                  </label>
                  <input
                    {...register('email')}
                    type="email"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900"
                  />
                  {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Senha *
                  </label>
                  <input
                    {...register('password')}
                    type="password"
                    minLength={6}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900"
                  />
                  <p className="text-xs text-gray-500 mt-1">Mínimo de 6 caracteres</p>
                  {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>}
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CPF *
              </label>
              <input
                {...register('cpf')}
                type="text"
                maxLength={14}
                placeholder="000.000.000-00"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900"
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '')
                  const formatted = value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
                  e.target.value = formatted
                  setValue('cpf', value, { shouldValidate: true })
                }}
              />
              {errors.cpf && <p className="text-red-500 text-sm mt-1">{errors.cpf.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data de Nascimento *
              </label>
              <input
                {...register('birthDate')}
                type="date"
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900"
              />
              {errors.birthDate && <p className="text-red-500 text-sm mt-1">{errors.birthDate.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Você é: *
              </label>
              <select
                {...register('participantType')}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900"
              >
                <option value="">Selecione...</option>
                <option value="ESTUDANTE">Estudante</option>
                <option value="PROFESSOR">Professor</option>
                <option value="PESQUISADOR">Pesquisador</option>
                <option value="PRODUTOR">Produtor</option>
              </select>
              {errors.participantType && <p className="text-red-500 text-sm mt-1">{errors.participantType.message}</p>}
            </div>

            {participantType === 'PRODUTOR' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantos hectares você possui? *
                </label>
                <input
                  {...register('hectares')}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Ex: 10.5"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900"
                />
                {errors.hectares && <p className="text-red-500 text-sm mt-1">{errors.hectares.message}</p>}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estado *
                </label>
                <select
                  {...register('state')}
                  disabled={loadingStates}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900 disabled:opacity-50"
                >
                  <option value="">Selecione o estado...</option>
                  {states.map((state) => (
                    <option key={state.sigla} value={state.sigla}>
                      {state.nome}
                    </option>
                  ))}
                </select>
                {errors.state && <p className="text-red-500 text-sm mt-1">{errors.state.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cidade *
                </label>
                <select
                  {...register('city')}
                  disabled={!selectedState || loadingCities}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900 disabled:opacity-50"
                >
                  <option value="">
                    {loadingCities ? 'Carregando...' : selectedState ? 'Selecione a cidade...' : 'Selecione o estado primeiro'}
                  </option>
                  {cities.map((city, index) => (
                    <option key={index} value={city.nome}>
                      {city.nome}
                    </option>
                  ))}
                </select>
                {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city.message}</p>}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-[#FF6600] text-white px-6 py-3 rounded-md font-semibold hover:bg-[#e55a00] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting 
                  ? (isRegistering ? 'Cadastrando...' : 'Inscrevendo...') 
                  : (session ? 'Confirmar Inscrição' : 'Cadastrar e Inscrever-se')
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
