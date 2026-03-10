import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
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
  waterArea: z.number().optional(),
}).refine((data) => {
  if (data.participantType === 'PRODUTOR') {
    return data.pondCount !== undefined && data.waterArea !== undefined
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
      <div className="text-center py-12 space-y-6 animate-in fade-in zoom-in duration-500">
        <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-black text-[var(--secondary)] tracking-tight">Cadastro Confirmado!</h2>
          <p className="text-[var(--text-muted)] font-medium">
            Tudo certo! Você receberá um e-mail com os detalhes em breve.
          </p>
        </div>
        <div className="pt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center px-8 py-4 bg-[var(--secondary)] text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10 active:scale-95"
          >
            Voltar para Início
          </Link>
        </div>
      </div>
    )
  }

  const inputClass = "w-full px-5 py-4 bg-[var(--bg-main)] border border-[var(--border-light)] rounded-2xl focus:ring-4 focus:ring-[var(--primary)]/10 focus:border-[var(--primary)] text-[var(--text-main)] font-medium transition-all outline-none placeholder:text-slate-400";
  const labelClass = "block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2 ml-1";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <div className="space-y-6">
        <div>
          <label className={labelClass}>Nome Completo *</label>
          <input
            {...register('name')}
            placeholder="Seu nome completo"
            className={inputClass}
          />
          {errors.name && <p className="text-red-500 text-[10px] font-bold uppercase tracking-wider mt-2 ml-1">{errors.name.message}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={labelClass}>CPF *</label>
            <input
              {...register('cpf')}
              placeholder="000.000.000-00"
              maxLength={11}
              className={inputClass}
            />
            {errors.cpf && <p className="text-red-500 text-[10px] font-bold uppercase tracking-wider mt-2 ml-1">{errors.cpf.message}</p>}
          </div>

          <div>
            <label className={labelClass}>WhatsApp / Telefone *</label>
            <input
              {...register('phone')}
              placeholder="(00) 00000-0000"
              className={inputClass}
            />
            {errors.phone && <p className="text-red-500 text-[10px] font-bold uppercase tracking-wider mt-2 ml-1">{errors.phone.message}</p>}
          </div>
        </div>

        <div>
          <label className={labelClass}>E-mail Principal *</label>
          <input
            type="email"
            {...register('email')}
            placeholder="exemplo@email.com"
            className={inputClass}
          />
          {errors.email && <p className="text-red-500 text-[10px] font-bold uppercase tracking-wider mt-2 ml-1">{errors.email.message}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className={labelClass}>CEP *</label>
            <input
              {...register('cep')}
              placeholder="00000-000"
              maxLength={8}
              className={inputClass}
            />
            {errors.cep && <p className="text-red-500 text-[10px] font-bold uppercase tracking-wider mt-2 ml-1">{errors.cep.message}</p>}
          </div>

          <div>
            <label className={labelClass}>Bairro / Localidade *</label>
            <input
              {...register('locality')}
              placeholder="Ex: Centro"
              className={inputClass}
            />
            {errors.locality && <p className="text-red-500 text-[10px] font-bold uppercase tracking-wider mt-2 ml-1">{errors.locality.message}</p>}
          </div>

          <div>
            <label className={labelClass}>Estado *</label>
            <SearchableSelect
              value={watch('state')}
              onChange={(val) => {
                setValue('state', val, { shouldValidate: true })
                setValue('city', '', { shouldValidate: true })
              }}
              options={states.map((s) => ({ value: s.sigla, label: s.nome }))}
              placeholder={loadingStates ? '...' : 'UF'}
              searchPlaceholder="UF..."
              disabled={loadingStates}
              loading={loadingStates}
              error={!!errors.state}
            />
            {errors.state && <p className="text-red-500 text-[10px] font-bold uppercase tracking-wider mt-2 ml-1">{errors.state.message}</p>}
          </div>
        </div>

        <div>
          <label className={labelClass}>Cidade *</label>
          <SearchableSelect
            value={watch('city')}
            onChange={(val) => setValue('city', val, { shouldValidate: true })}
            options={cities.map((c) => ({ value: c.nome, label: c.nome }))}
            placeholder={
              loadingCities ? 'Carregando...' : selectedState ? 'Selecione a cidade...' : 'Selecione o estado primeiro'
            }
            searchPlaceholder="Buscar cidade..."
            disabled={!selectedState || loadingCities}
            loading={loadingCities}
            error={!!errors.city}
          />
          {errors.city && <p className="text-red-500 text-[10px] font-bold uppercase tracking-wider mt-2 ml-1">{errors.city.message}</p>}
        </div>

        <div>
          <label className={labelClass}>Perfil do Participante *</label>
          <div className="relative group">
            <select
              {...register('participantType')}
              className={`${inputClass} appearance-none cursor-pointer pr-12`}
            >
              <option value="">Selecione seu perfil...</option>
              <option value="PRODUTOR">Sou Produtor</option>
              <option value="OUTROS">Outros / Visitante</option>
            </select>
            <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-[var(--primary)] transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          {errors.participantType && <p className="text-red-500 text-[10px] font-bold uppercase tracking-wider mt-2 ml-1">{errors.participantType.message}</p>}
        </div>

        {participantType === 'PRODUTOR' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-[var(--primary)]/5 rounded-[2rem] border border-[var(--primary)]/10 animate-in slide-in-from-top-4 duration-300">
            <div>
              <label className={labelClass}>Qtd. de Viveiros *</label>
              <input
                type="number"
                {...register('pondCount', { valueAsNumber: true })}
                placeholder="0"
                className={inputClass}
              />
              {errors.pondCount && <p className="text-red-500 text-[10px] font-bold uppercase tracking-wider mt-2 ml-1">{errors.pondCount.message}</p>}
            </div>

            <div>
              <label className={labelClass}>Hectares d'água *</label>
              <input
                type="number"
                step="0.01"
                {...register('waterArea', { valueAsNumber: true })}
                placeholder="0.00"
                className={inputClass}
              />
              {errors.waterArea && <p className="text-red-500 text-[10px] font-bold uppercase tracking-wider mt-2 ml-1">{errors.waterArea.message}</p>}
            </div>
          </div>
        )}

        {participantType === 'OUTROS' && (
          <div className="animate-in slide-in-from-top-4 duration-300">
            <label className={labelClass}>Especifique seu Perfil *</label>
            <input
              {...register('otherType')}
              placeholder="Ex: Estudante, Palestrante, etc"
              className={inputClass}
            />
            {errors.otherType && <p className="text-red-500 text-[10px] font-bold uppercase tracking-wider mt-2 ml-1">{errors.otherType.message}</p>}
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-600 rounded-2xl text-xs font-bold uppercase tracking-wide flex items-center gap-3">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-5 bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-white font-black text-xs uppercase tracking-[0.2em] rounded-[1.5rem] shadow-2xl shadow-[var(--primary)]/30 hover:shadow-[var(--primary)]/40 hover:-translate-y-1 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0"
      >
        {submitting ? (
          <div className="flex items-center justify-center gap-3">
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            PROCESSANDO...
          </div>
        ) : (
          'FINALIZAR INSCRIÇÃO'
        )}
      </button>
    </form>
  )
}

