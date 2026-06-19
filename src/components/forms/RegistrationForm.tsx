import { useState, useEffect, useRef } from 'react'
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

interface EventCity {
  id: string
  municipality: string
  state: string
  status: 'OPEN' | 'FULL' | 'CLOSED'
  message: string | null
}

interface ExistingRegistrationInfo {
  id: string
  createdAt: string
}

function formatDateTime(value?: string | Date | null) {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

export default function RegistrationForm({ eventId, formCities = [] }: { eventId: string; formCities?: { city: string; state: string }[] }) {
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadingCpf, setLoadingCpf] = useState(false)
  const [existingRegistration, setExistingRegistration] = useState<ExistingRegistrationInfo | null>(null)
  // Cidade que a pessoa já tinha escolhido (para o modo "trocar cidade")
  const [previousCity, setPreviousCity] = useState<{ city: string; state: string } | null>(null)

  const hasFormCities = Array.isArray(formCities) && formCities.length > 0
  const [cityShake, setCityShake] = useState(false)
  const citySectionRef = useRef<HTMLDivElement>(null)

  // Sinaliza que falta escolher a cidade: mostra erro, treme e rola até os botões.
  const flagCityMissing = () => {
    setCityError('Selecione a cidade do evento para continuar.')
    setCityShake(true)
    setTimeout(() => setCityShake(false), 600)
    citySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  // Event participating cities
  const [eventCities, setEventCities] = useState<EventCity[]>([])
  const [selectedEventCity, setSelectedEventCity] = useState<EventCity | null>(null)
  const [cityError, setCityError] = useState<string | null>(null)

  // State for selectors
  const [states, setStates] = useState<StateOption[]>([])
  const [cities, setCities] = useState<CityOption[]>([])
  const [loadingStates, setLoadingStates] = useState(false)
  const [loadingCities, setLoadingCities] = useState(false)
  const [loadingCep, setLoadingCep] = useState(false)

  const { register, handleSubmit, watch, setValue, getValues, formState: { errors } } = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema)
  })

  const participantType = watch('participantType')
  const selectedState = watch('state')
  const cepValue = watch('cep')
  const cpfValue = watch('cpf')

  useEffect(() => {
    fetchStates()
    fetchEventCities()
  }, [])

  const fetchEventCities = async () => {
    try {
      const data = await apiFetch<EventCity[]>(`/events/${eventId}/cities`)
      if (Array.isArray(data) && data.length > 0) {
        setEventCities(data)
      }
    } catch {
      // no participating cities configured — form works normally
    }
  }

  const handleEventCitySelect = (city: EventCity) => {
    if (city.status !== 'OPEN') {
      setCityError(city.message || 'Inscrições encerradas para esta cidade.')
      return
    }
    setCityError(null)
    setSelectedEventCity(city)
    setValue('city', city.municipality, { shouldValidate: true, shouldDirty: true })
    setValue('state', city.state, { shouldValidate: true, shouldDirty: true })
    fetchCities(city.state, city.municipality)
  }

  // Seleção na lista de cidades do formulário (formCities). value = "Cidade|UF"
  const selectFormCity = (value: string) => {
    setCityError(null)
    if (!value) {
      setValue('city', '', { shouldValidate: true, shouldDirty: true })
      return
    }
    const [c, s] = value.split('|')
    setValue('city', c, { shouldValidate: true, shouldDirty: true })
    setValue('state', s, { shouldValidate: true, shouldDirty: true })
  }

  useEffect(() => {
    if (selectedState && selectedState.length === 2) {
      fetchCities(selectedState)
    } else {
      setCities([])
    }
  }, [selectedState])

  useEffect(() => {
    const normalizedCep = (cepValue || '').replace(/\D/g, '')
    if (normalizedCep.length === 8) {
      lookupCep(normalizedCep)
    }
  }, [cepValue])

  useEffect(() => {
    const normalizedCpf = (cpfValue || '').replace(/\D/g, '')

    if (normalizedCpf.length !== 11) {
      setExistingRegistration(null)
      setLoadingCpf(false)
      return
    }

    const timeoutId = window.setTimeout(() => {
      lookupCpf(normalizedCpf)
    }, 400)

    return () => window.clearTimeout(timeoutId)
  }, [cpfValue, eventId])

  const fetchStates = async () => {
    try {
      setLoadingStates(true)
      const data = await apiFetch<StateOption[]>('/locations/states')
      setStates(Array.isArray(data) && data.length > 0 ? data : FALLBACK_STATES)
    } catch (fetchError) {
      setStates(FALLBACK_STATES)
    } finally {
      setLoadingStates(false)
    }
  }

  const ensureCityOption = (cityName: string) => {
    if (!cityName) return

    setCities((prev) => {
      if (prev.some((city) => city.nome === cityName)) {
        return prev
      }

      return [...prev, { nome: cityName }].sort((a, b) => a.nome.localeCompare(b.nome))
    })
  }

  const fetchCities = async (stateSigla: string, preferredCity?: string) => {
    try {
      setLoadingCities(true)
      const data = await apiFetch<CityOption[]>(`/locations/states/${stateSigla}/cities`)
      const sorted = (Array.isArray(data) ? data : []).sort((a, b) => a.nome.localeCompare(b.nome))
      const merged = preferredCity && !sorted.some((city) => city.nome === preferredCity)
        ? [...sorted, { nome: preferredCity }].sort((a, b) => a.nome.localeCompare(b.nome))
        : sorted
      setCities(merged)
    } catch (fetchError) {
      if (preferredCity) {
        setCities([{ nome: preferredCity }])
      } else {
        setCities([])
      }
    } finally {
      setLoadingCities(false)
    }
  }

  const lookupCep = async (cep: string) => {
    try {
      setLoadingCep(true)
      const data = await apiFetch<any>(`/locations/cep/${cep}`)

      if (!data) return

      // Com lista de cidades do formulário, a cidade/estado vêm SÓ do dropdown.
      // O CEP preenche apenas o bairro, sem sobrescrever a cidade escolhida.
      if (!hasFormCities) {
        if (data.state) {
          setValue('state', data.state, { shouldValidate: true, shouldDirty: true })
        }

        if (data.city) {
          ensureCityOption(data.city)
          setValue('city', data.city, { shouldValidate: true, shouldDirty: true })
          if (data.state) {
            await fetchCities(data.state, data.city)
          }
        }
      }

      if (data.neighborhood) {
        setValue('locality', data.neighborhood, { shouldValidate: true, shouldDirty: true })
      }
    } catch (error) {
    } finally {
      setLoadingCep(false)
    }
  }

  const applyProfileData = async (profile: any) => {
    if (!profile) return

    const updates: Array<[keyof RegistrationFormData, any]> = [
      ['name', profile.name || ''],
      ['email', profile.email || ''],
      ['phone', profile.phone || ''],
      ['cep', profile.cep || ''],
      ['locality', profile.locality || ''],
      ['participantType', profile.participantType === 'PRODUTOR' ? 'PRODUTOR' : 'OUTROS'],
      ['otherType', profile.participantType === 'PRODUTOR' ? '' : (profile.otherType || '')],
      ['pondCount', profile.pondCount ?? undefined],
      ['waterArea', profile.waterArea ?? undefined],
    ]

    // Com lista de cidades do formulário, NÃO pré-preenche cidade/estado do
    // perfil — a cidade é escolhida no dropdown (evita herdar a cidade de casa).
    if (!hasFormCities) {
      updates.push(['state', profile.state || ''])
      updates.push(['city', profile.city || ''])
    }

    updates.forEach(([field, value]) => {
      if (value !== undefined) {
        setValue(field, value, { shouldValidate: false, shouldDirty: true })
      }
    })

    if (!hasFormCities && profile.state) {
      await fetchCities(profile.state, profile.city)
    }
  }

  const lookupCpf = async (cpf: string) => {
    try {
      setLoadingCpf(true)
      const response = await apiFetch<any>(`/registrations/cpf/${cpf}?eventId=${eventId}`)
      await applyProfileData(response?.profile)
      setExistingRegistration(response?.existingRegistration || null)
      if (response?.existingRegistration && response?.profile?.city) {
        setPreviousCity({ city: response.profile.city, state: response.profile.state || '' })
      } else {
        setPreviousCity(null)
      }
    } catch (lookupError: any) {
      if (lookupError?.status === 404) {
        setExistingRegistration(null)
        return
      }
    } finally {
      setLoadingCpf(false)
    }
  }

  // Troca de cidade (re-inscrição): envia direto com os dados do perfil já
  // carregados + a nova cidade, sem revalidar o formulário inteiro (campos ocultos).
  const handleCityChange = async () => {
    const data = getValues()
    if (!data.city || !data.state) {
      flagCityMissing()
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const response = await apiFetch<any>('/registrations', {
        method: 'POST',
        body: JSON.stringify({ ...data, eventId }),
      })
      if (response?.error && !response?.id) {
        setError(typeof response.error === 'string' ? response.error : 'Erro ao atualizar inscrição')
        return
      }
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar inscrição')
    } finally {
      setSubmitting(false)
    }
  }

  const onSubmit = async (data: RegistrationFormData) => {
    // Re-inscrição (trocar de cidade) é permitida — não bloqueia mais.
    if (hasFormCities && !data.city) {
      flagCityMissing()
      return
    }

    if (!hasFormCities && eventCities.length > 0 && !selectedEventCity) {
      flagCityMissing()
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const response = await apiFetch<any>('/registrations', {
        method: 'POST',
        body: JSON.stringify({ ...data, eventId }),
      })

      if (response?.error) {
        setExistingRegistration(response.existingRegistration || null)
        setError(
          response?.existingRegistration?.createdAt
            ? `Você já está inscrito neste evento desde ${formatDateTime(response.existingRegistration.createdAt)}.`
            : response.error,
        )
        return
      }

      setSuccess(true)
    } catch (err) {
      const apiError = err as any
      const duplicateRegistration = apiError?.body?.existingRegistration
      setExistingRegistration(duplicateRegistration || null)
      setError(
        duplicateRegistration?.createdAt
          ? `Você já está inscrito neste evento desde ${formatDateTime(duplicateRegistration.createdAt)}.`
          : err instanceof Error ? err.message : 'Erro ao processar cadastro',
      )
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
            Tudo certo! Sua inscrição foi confirmada com sucesso.
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

  const inputClass = "w-full px-5 py-4 bg-[var(--bg-main)] border border-[var(--border-light)] rounded-2xl focus:ring-4 focus:ring-[var(--primary)]/10 focus:border-[var(--primary)] text-[var(--text-main)] text-base font-medium transition-all outline-none placeholder:text-slate-400";
  const labelClass = "block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2 ml-1";

  const currentCity = watch('city')
  const currentState = watch('state')

  const resetReRegistration = () => {
    setExistingRegistration(null)
    setPreviousCity(null)
    setValue('cpf', '', { shouldValidate: false, shouldDirty: true })
  }

  // Botões da lista de cidades do formulário (formCities) — clicar escolhe.
  const formCityDropdown = (
    <div className="flex flex-wrap gap-2">
      {formCities.map((c) => {
        const selected = c.city === currentCity && c.state === currentState
        return (
          <button
            key={`${c.city}|${c.state}`}
            type="button"
            onClick={() => selectFormCity(`${c.city}|${c.state}`)}
            className={`px-4 py-3 rounded-2xl border-2 text-sm font-bold transition-all active:scale-95 ${
              selected
                ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)] shadow-sm'
                : `bg-[var(--bg-main)] text-[var(--text-main)] hover:border-[var(--primary)]/40 ${cityError ? 'border-red-300' : 'border-[var(--border-light)]'}`
            }`}
          >
            {c.city} <span className="opacity-60 font-medium">- {c.state}</span>
          </button>
        )
      })}
    </div>
  )

  // MODO TROCA DE CIDADE: CPF já inscrito neste evento
  const shakeStyle = (
    <style>{`@keyframes shake {0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}`}</style>
  )

  if (existingRegistration) {
    return (
      <div className="space-y-6">
        {shakeStyle}
        <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl">
          <p className="font-black text-[var(--secondary)] text-lg">Você já está inscrito! ✓</p>
          <p className="text-xs text-[var(--text-muted)] font-medium mt-1">
            Inscrição feita em {formatDateTime(existingRegistration.createdAt)}.
          </p>
          {previousCity?.city && (
            <p className="text-sm font-bold text-[var(--secondary)] mt-3">
              Cidade atual: <span className="text-[var(--primary)]">{previousCity.city}{previousCity.state ? ` - ${previousCity.state}` : ''}</span>
            </p>
          )}
        </div>

        <div ref={citySectionRef} className={`space-y-3 ${cityShake ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}>
          <label className={labelClass}>Deseja mudar de cidade?</label>
          {hasFormCities ? (
            formCityDropdown
          ) : (
            <SearchableSelect
              value={currentCity}
              onChange={(val) => setValue('city', val, { shouldValidate: true })}
              options={cities.map((c) => ({ value: c.nome, label: c.nome }))}
              placeholder={loadingCities ? 'Carregando...' : 'Selecione a cidade...'}
              searchPlaceholder="Buscar cidade..."
              disabled={loadingCities}
              loading={loadingCities}
            />
          )}
          <p className="text-[11px] text-[var(--text-muted)] font-medium">
            Selecione a nova cidade e confirme — você entrará no grupo de WhatsApp da cidade escolhida.
          </p>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-600 rounded-2xl text-xs font-bold uppercase tracking-wide">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleCityChange}
          disabled={submitting}
          className="w-full py-5 bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-white font-black text-xs uppercase tracking-[0.2em] rounded-[1.5rem] shadow-2xl shadow-[var(--primary)]/30 hover:-translate-y-1 transition-all active:scale-95 disabled:opacity-50"
        >
          {submitting ? 'ATUALIZANDO...' : 'CONFIRMAR / TROCAR CIDADE'}
        </button>

        <button
          type="button"
          onClick={resetReRegistration}
          className="w-full text-center text-[11px] font-bold text-[var(--text-muted)] hover:text-[var(--primary)] uppercase tracking-wider transition-colors"
        >
          Não é você? Usar outro CPF
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {shakeStyle}

      {(hasFormCities || eventCities.length > 0) && (
        <div ref={citySectionRef} className={`space-y-3 ${cityShake ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}>
          <label className={labelClass}>Cidade do Evento *</label>
          {hasFormCities ? formCityDropdown : (
          <select
            value={selectedEventCity?.id ?? ''}
            onChange={(e) => {
              const city = eventCities.find((c) => c.id === e.target.value)
              if (city) handleEventCitySelect(city)
              else { setSelectedEventCity(null); setCityError(null) }
            }}
            className={`${inputClass} ${!selectedEventCity && cityError ? 'border-red-400 focus:border-red-400' : ''}`}
          >
            <option value="">Selecione a cidade do evento...</option>
            {eventCities.map((city) => (
              <option key={city.id} value={city.id} disabled={city.status !== 'OPEN'}>
                {city.municipality} — {city.state}{city.status === 'FULL' ? ' (LOTADA)' : city.status === 'CLOSED' ? ' (ENCERRADA)' : ''}
              </option>
            ))}
          </select>
          )}
          {cityError && (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-2xl text-orange-700 text-[11px] font-bold uppercase tracking-wide flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {cityError}
            </div>
          )}
        </div>
      )}

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
            {loadingCpf && <p className="text-[10px] font-bold uppercase tracking-wider mt-2 ml-1 text-[var(--primary)]">Buscando cadastro anterior...</p>}
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

        <div className={`grid grid-cols-1 gap-6 ${hasFormCities ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
          <div>
            <label className={labelClass}>CEP *</label>
            <input
              {...register('cep')}
              placeholder="00000-000"
              maxLength={8}
              className={inputClass}
            />
            {loadingCep && <p className="text-[10px] font-bold uppercase tracking-wider mt-2 ml-1 text-[var(--primary)]">Buscando endereco...</p>}
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

          {!hasFormCities && (
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
          )}
        </div>

        {!hasFormCities && (
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
        )}

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

      {existingRegistration && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-700 rounded-2xl text-xs font-bold uppercase tracking-wide flex items-center gap-3">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Você já está inscrito neste evento desde {formatDateTime(existingRegistration.createdAt)}.
        </div>
      )}

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
        disabled={submitting || !!existingRegistration}
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

