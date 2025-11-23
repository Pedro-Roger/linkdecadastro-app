
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Footer from '@/components/ui/Footer'
import MobileNavbar from '@/components/ui/MobileNavbar'
import { apiFetch } from '@/lib/api'

const registerSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  cpf: z.string().min(11, 'CPF deve ter 11 dígitos').max(11, 'CPF deve ter 11 dígitos').regex(/^\d+$/, 'CPF deve conter apenas números'),
  birthDate: z.string().min(1, 'Data de nascimento é obrigatória'),
  participantType: z.enum(['ESTUDANTE', 'PROFESSOR', 'PESQUISADOR', 'PRODUTOR'], {
    required_error: 'Selecione o tipo de participante'
  }),
  schoolOrUniversity: z.string().optional(),
  hectares: z.string().optional().transform((val) => {
    if (!val || val.trim() === '') return undefined
    const num = parseFloat(val)
    return isNaN(num) ? undefined : num
  }).refine((val) => val === undefined || val > 0, {
    message: 'Hectares deve ser um número positivo'
  }),
  waterArea: z.string().optional().transform((val) => {
    if (!val || val.trim() === '') return undefined
    const num = parseFloat(val)
    return isNaN(num) ? undefined : num
  }).refine((val) => val === undefined || val > 0, {
    message: 'Hectares de lâmina d\'água deve ser um número positivo'
  }),
  ponds: z.string().optional().transform((val) => {
    if (!val || val.trim() === '') return undefined
    const num = parseInt(val)
    return isNaN(num) ? undefined : num
  }).refine((val) => val === undefined || val > 0, {
    message: 'Quantidade de viveiros deve ser um número positivo'
  }),
  state: z.string().min(2, 'Estado é obrigatório'),
  city: z.string().min(1, 'Cidade é obrigatória'),
}).refine((data) => {
  if (data.participantType === 'PROFESSOR') {
    return data.schoolOrUniversity !== undefined && data.schoolOrUniversity.trim().length > 0
  }
  return true
}, {
  message: 'Escola ou universidade é obrigatória para professores',
  path: ['schoolOrUniversity']
}).refine((data) => {
  if (data.participantType === 'PRODUTOR') {
    return data.hectares !== undefined && data.hectares > 0
  }
  return true
}, {
  message: 'Hectares é obrigatório para produtores',
  path: ['hectares']
}).refine((data) => {
  if (data.participantType === 'PRODUTOR') {
    return data.waterArea !== undefined && data.waterArea > 0
  }
  return true
}, {
  message: 'Hectares de lâmina d\'água é obrigatório para produtores',
  path: ['waterArea']
}).refine((data) => {
  if (data.participantType === 'PRODUTOR') {
    return data.ponds !== undefined && data.ponds > 0
  }
  return true
}, {
  message: 'Quantidade de viveiros é obrigatória para produtores',
  path: ['ponds']
})

type RegisterFormData = z.infer<typeof registerSchema>

interface State {
  sigla: string
  nome: string
}

interface City {
  nome: string
}

export default function RegisterPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [states, setStates] = useState<State[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [loadingStates, setLoadingStates] = useState(false)
  const [loadingCities, setLoadingCities] = useState(false)

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema)
  })

  const selectedState = watch('state')
  const participantType = watch('participantType')

  // Buscar estados da API do IBGE
  useEffect(() => {
    fetchStates()
  }, [])

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

  const onSubmit = async (data: RegisterFormData) => {
    setError('')
    setLoading(true)

    try {
      await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password,
          cpf: data.cpf.replace(/\D/g, ''),
          birthDate: data.birthDate,
          participantType: data.participantType,
          schoolOrUniversity: data.participantType === 'PROFESSOR' ? data.schoolOrUniversity : undefined,
          hectares: data.participantType === 'PRODUTOR' ? data.hectares : undefined,
          waterArea: data.participantType === 'PRODUTOR' ? data.waterArea : undefined,
          ponds: data.participantType === 'PRODUTOR' ? data.ponds : undefined,
          state: data.state,
          city: data.city,
        }),
      })
      router.push('/login?registered=true')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao cadastrar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <MobileNavbar />

      <div className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-center mb-8 text-[#003366]">
            Cadastrar
          </h1>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
              <label className="block text-sm font-medium text-gray-700 mb-2 md:text-base">
                Você é: *
              </label>
              <select
                {...register('participantType')}
                className="w-full px-4 py-3 text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900 md:py-2 md:text-sm appearance-none bg-white cursor-pointer min-h-[48px] touch-manipulation"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: 'right 0.75rem center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '1.5em 1.5em',
                  paddingRight: '2.5rem'
                }}
              >
                <option value="">Selecione...</option>
                <option value="ESTUDANTE">Estudante</option>
                <option value="PROFESSOR">Professor</option>
                <option value="PESQUISADOR">Pesquisador</option>
                <option value="PRODUTOR">Produtor</option>
              </select>
              {errors.participantType && <p className="text-red-500 text-sm mt-1">{errors.participantType.message}</p>}
            </div>

            {participantType === 'PROFESSOR' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Escola ou Universidade *
                </label>
                <input
                  {...register('schoolOrUniversity')}
                  type="text"
                  placeholder="Ex: Universidade Federal de Alagoas"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900"
                />
                {errors.schoolOrUniversity && <p className="text-red-500 text-sm mt-1">{errors.schoolOrUniversity.message}</p>}
              </div>
            )}

            {participantType === 'PRODUTOR' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantidade de Viveiros *
                  </label>
                  <input
                    {...register('ponds')}
                    type="number"
                    step="1"
                    min="1"
                    placeholder="Ex: 5"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900"
                  />
                  {errors.ponds && <p className="text-red-500 text-sm mt-1">{errors.ponds.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hectares de Lâmina d'Água *
                  </label>
                  <input
                    {...register('waterArea')}
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Ex: 10.5"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900"
                  />
                  {errors.waterArea && <p className="text-red-500 text-sm mt-1">{errors.waterArea.message}</p>}
                </div>
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
              </>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 md:text-base">
                  Estado *
                </label>
                <select
                  {...register('state')}
                  disabled={loadingStates}
                  className="w-full px-4 py-3 text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900 disabled:opacity-50 md:py-2 md:text-sm appearance-none bg-white cursor-pointer min-h-[48px] touch-manipulation"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: 'right 0.75rem center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '1.5em 1.5em',
                    paddingRight: '2.5rem'
                  }}
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
                <label className="block text-sm font-medium text-gray-700 mb-2 md:text-base">
                  Cidade *
                </label>
                <select
                  {...register('city')}
                  disabled={!selectedState || loadingCities}
                  className="w-full px-4 py-3 text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900 disabled:opacity-50 md:py-2 md:text-sm appearance-none bg-white cursor-pointer min-h-[48px] touch-manipulation"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: 'right 0.75rem center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '1.5em 1.5em',
                    paddingRight: '2.5rem'
                  }}
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

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#FF6600] text-white py-3 px-6 rounded-md font-semibold hover:bg-[#e55a00] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Cadastrando...' : 'Cadastrar'}
            </button>
          </form>

          <p className="mt-6 text-center text-gray-600">
            Já tem uma conta?{' '}
            <Link href="/login" className="text-[#FF6600] hover:underline">
              Entrar
            </Link>
          </p>
        </div>
      </div>

      <Footer />
    </div>
  )
}
