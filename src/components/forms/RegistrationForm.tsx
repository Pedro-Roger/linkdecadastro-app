import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { apiFetch } from '@/lib/api'
import { SearchableSelect } from '@/components/ui/SearchableSelect'

const FALLBACK_STATES = [
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
  { sigla: 'TO', nome: 'Tocantins' }
]

const registrationSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  cpf: z.string().min(11, 'CPF inválido').max(11, 'CPF inválido'),
  phone: z.string().min(10, 'Telefone inválido'),
  email: z.string().email('Email inválido'),
  cep: z.string().min(8, 'CEP inválido').max(8, 'CEP inválido'),
  locality: z.string().min(1, 'Localidade é obrigatória'),
  city: z.string().min(1, 'Cidade é obrigatória'),
  state: z.string().min(2, 'Estado é obrigatório').max(2, 'Estado inválido'),
  participantType: z.enum(['PRODUTOR', 'OUTROS']),
  otherType: z.string().optional(),
  pondCount: z.number().optional(),
  waterDepth: z.number().optional(),
}).refine((data) => {
  if (data.participantType === 'PRODUTOR') {
    return data.pondCount !== undefined && data.waterDepth !== undefined
  }
  return true
}, {
  message: 'Campos de produtor são obrigatórios',
  path: ['pondCount']
})

type RegistrationFormData = z.infer<typeof registrationSchema>

interface StateOption {
  sigla: string
  nome: string
}

interface CityOption {
  nome: string
}

export default function RegistrationForm({ eventId }: { eventId: string }) {
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // State for selectors
  const [states, setStates] = useState<StateOption[]>([])
  const [cities, setCities] = useState<CityOption[]>([])
  const [loadingStates, setLoadingStates] = useState(false)
  const [loadingCities, setLoadingCities] = useState(false)

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema)
  })

  const participantType = watch('participantType')
  const selectedState = watch('state')

  useEffect(() => {
    fetchStates()
  }, [])

  useEffect(() => {
    if (selectedState && selectedState.length === 2) {
      fetchCities(selectedState)
    } else {
      setCities([])
    }
  }, [selectedState])

  const fetchStates = async () => {
    try {
      setLoadingStates(true)
      const response = await fetch(
        'https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome'
      )
      if (response.ok) {
        const data = await response.json()
        setStates(data)
      } else {
        setStates(FALLBACK_STATES)
      }
    } catch (fetchError) {
      setStates(FALLBACK_STATES)
    } finally {
      setLoadingStates(false)
    }
  }

  const fetchCities = async (stateSigla: string) => {
    try {
      setLoadingCities(true)
      const response = await fetch(
        `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${stateSigla}/municipios`
      )
      if (response.ok) {
        const data = await response.json()
        const sorted = (data as CityOption[]).sort((a, b) => a.nome.localeCompare(b.nome))
        setCities(sorted)
      } else {
        setCities([])
      }
    } catch (fetchError) {
      setCities([])
    } finally {
      setLoadingCities(false)
    }
  }

  const onSubmit = async (data: RegistrationFormData) => {
    setSubmitting(true)
    setError(null)

    try {
      await apiFetch('/registrations', {
        method: 'POST',
        body: JSON.stringify({ ...data, eventId }),
      })
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao processar cadastro')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="text-center py-8">
        <div className="text-green-600 text-2xl font-bold mb-4">
          ✓ Cadastro realizado com sucesso!
        </div>
        <p className="text-gray-600">
          Você receberá um email de confirmação em breve.
        </p>
        <a
          href="/"
          className="inline-flex mt-4 px-6 py-3 bg-[#003366] text-white font-semibold rounded-full hover:bg-[#00264d] transition-colors"
        >
          Voltar para página inicial
        </a>
      </div>
    )
  }

  return (
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            CPF *
          </label>
          <input
            {...register('cpf')}
            maxLength={11}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900"
          />
          {errors.cpf && <p className="text-red-500 text-sm mt-1">{errors.cpf.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Telefone *
          </label>
          <input
            {...register('phone')}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900"
          />
          {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          E-mail *
        </label>
        <input
          type="email"
          {...register('email')}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900"
        />
        {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            CEP *
          </label>
          <input
            {...register('cep')}
            maxLength={8}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900"
          />
          {errors.cep && <p className="text-red-500 text-sm mt-1">{errors.cep.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Localidade/Bairro *
          </label>
          <input
            {...register('locality')}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900"
          />
          {errors.locality && <p className="text-red-500 text-sm mt-1">{errors.locality.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cidade *
          </label>
          <SearchableSelect
            value={watch('city')}
            onChange={(val) => setValue('city', val, { shouldValidate: true })}
            options={cities.map((c) => ({ value: c.nome, label: c.nome }))}
            placeholder={
              loadingCities
                ? 'Carregando cidades...'
                : selectedState
                  ? 'Selecione a cidade...'
                  : 'Selecione o estado primeiro'
            }
            searchPlaceholder="Buscar cidade..."
            disabled={!selectedState || loadingCities}
            loading={loadingCities}
            error={!!errors.city}
          />
          {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city.message}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Estado *
        </label>
        <SearchableSelect
          value={watch('state')}
          onChange={(val) => {
            setValue('state', val, { shouldValidate: true })
            // Reset city when state changes
            setValue('city', '', { shouldValidate: true })
          }}
          options={states.map((s) => ({ value: s.sigla, label: s.nome }))}
          placeholder={loadingStates ? 'Carregando estados...' : 'Selecione o estado...'}
          searchPlaceholder="Buscar estado..."
          disabled={loadingStates}
          loading={loadingStates}
          error={!!errors.state}
        />
        {errors.state && <p className="text-red-500 text-sm mt-1">{errors.state.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2 md:text-base">
          Selecione a opção que melhor descreve você *
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
          <option value="PRODUTOR">Produtor</option>
          <option value="OUTROS">Outros</option>
        </select>
        {errors.participantType && <p className="text-red-500 text-sm mt-1">{errors.participantType.message}</p>}
      </div>

      {participantType === 'PRODUTOR' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantidade de Viveiros *
            </label>
            <input
              type="number"
              {...register('pondCount', { valueAsNumber: true })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900"
            />
            {errors.pondCount && <p className="text-red-500 text-sm mt-1">{errors.pondCount.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Lâmina d&apos;água (metros) *
            </label>
            <input
              type="number"
              step="0.01"
              {...register('waterDepth', { valueAsNumber: true })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900"
            />
            {errors.waterDepth && <p className="text-red-500 text-sm mt-1">{errors.waterDepth.message}</p>}
          </div>
        </>
      )}

      {participantType === 'OUTROS' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            O que você é? *
          </label>
          <input
            {...register('otherType')}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900"
          />
          {errors.otherType && <p className="text-red-500 text-sm mt-1">{errors.otherType.message}</p>}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-[#FF6600] text-white py-3 px-6 rounded-md font-semibold hover:bg-[#e55a00] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? 'Enviando...' : 'Confirmar Cadastro'}
      </button>
    </form>
  )
}

