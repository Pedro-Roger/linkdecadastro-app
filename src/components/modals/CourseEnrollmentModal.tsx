
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { EnrollmentStatus } from '@prisma/client'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/lib/useAuth'

const participantTypes = ['ESTUDANTE', 'PROFESSOR', 'PESQUISADOR', 'PRODUTOR'] as const

const baseEnrollmentSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').optional(),
  email: z
    .string()
    .email('Email inválido')
    .optional(),
  password: z
    .string()
    .min(6, 'Senha deve ter no mínimo 6 caracteres')
    .optional(),
  cpf: z.string().min(11, 'CPF deve ter 11 dígitos'),
  birthDate: z.string().min(1, 'Data de nascimento é obrigatória'),
  participantType: z.enum(participantTypes, {
    required_error: 'Selecione o tipo de participante'
  }),
  hectares: z.string().optional(),
  state: z.string().min(2, 'Estado é obrigatório'),
  city: z.string().min(1, 'Cidade é obrigatória'),
  whatsappNumber: z.string().min(10, 'Informe o WhatsApp com DDD')
})

const createEnrollmentSchema = (needsAccount: boolean, emailExists: boolean = false) =>
  baseEnrollmentSchema.superRefine((data, ctx) => {
    const cpfDigits = data.cpf.replace(/\D/g, '')
    if (cpfDigits.length !== 11) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'CPF deve ter 11 dígitos',
        path: ['cpf']
      })
    }

    const phoneDigits = data.whatsappNumber.replace(/\D/g, '')
    if (phoneDigits.length < 10 || phoneDigits.length > 11) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Informe um número de WhatsApp válido (com DDD)',
        path: ['whatsappNumber']
      })
    }

    if (data.participantType === 'PRODUTOR') {
      const hectaresValue = parseFloat(data.hectares ?? '')
      if (Number.isNaN(hectaresValue) || hectaresValue <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Hectares é obrigatório para produtores e deve ser maior que zero',
          path: ['hectares']
        })
      }
    }

    if (needsAccount) {
      if (!data.email) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Email é obrigatório',
          path: ['email']
        })
      }
      
      // Se o email já existe, não precisa de nome e senha
      if (!emailExists) {
        if (!data.name) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Nome é obrigatório',
            path: ['name']
          })
        }
        if (!data.password) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Senha é obrigatória',
            path: ['password']
          })
        }
      }
    }
  })

type EnrollmentFormData = z.infer<typeof baseEnrollmentSchema>

interface CourseEnrollmentModalProps {
  isOpen: boolean
  onClose: () => void
  courseId: string
  courseTitle: string
  onSuccess?: (payload: {
    enrollment: any
    metadata?: { waitlistPosition?: number | null; regionQuotaId?: string | null }
  }) => void
}

interface StateOption {
  sigla: string
  nome: string
}

interface CityOption {
  nome: string
}

interface EnrollmentResult {
  status: EnrollmentStatus
  message: string
  waitlistPosition?: number | null
}

const FALLBACK_STATES: StateOption[] = [
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

function formatCpf(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

function formatWhatsapp(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2) return digits
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

export default function CourseEnrollmentModal({
  isOpen,
  onClose,
  courseId,
  courseTitle,
  onSuccess
}: CourseEnrollmentModalProps) {
  const { user } = useAuth()
  // Se não estiver logado, precisa criar conta (name, email, password obrigatórios)
  const needsAccount = !user

  // Declarar estados antes de usar no useMemo
  const [emailExists, setEmailExists] = useState(false)
  const [checkingEmail, setCheckingEmail] = useState(false)
  const [existingUserId, setExistingUserId] = useState<string | null>(null)
  const [states, setStates] = useState<StateOption[]>([])
  const [cities, setCities] = useState<CityOption[]>([])
  const [loadingStates, setLoadingStates] = useState(false)
  const [loadingCities, setLoadingCities] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<EnrollmentResult | null>(null)

  const enrollmentSchema = useMemo(() => createEnrollmentSchema(needsAccount, emailExists), [needsAccount, emailExists])

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors }
  } = useForm<EnrollmentFormData>({
    resolver: zodResolver(enrollmentSchema),
    defaultValues: {
      name: '',
      email: '',
      state: '',
      city: '',
      whatsappNumber: ''
    },
    shouldUnregister: true
  })

  const selectedState = watch('state')
  const participantType = watch('participantType')
  const emailValue = watch('email')

  useEffect(() => {
    if (isOpen && user) {
      fetchStates()
      setResult(null)
      setError(null)
      
      // Busca os dados completos do perfil do usuário
      const fetchUserProfile = async () => {
        try {
          const userProfile = await apiFetch<any>('/user/profile', { auth: true })
          
          // Preenche automaticamente os dados do usuário logado
          const userData: Partial<EnrollmentFormData> = {}
          
          if (userProfile.phone) {
            userData.whatsappNumber = userProfile.phone
          }
          
          if (userProfile.state) {
            userData.state = userProfile.state
            // Busca as cidades do estado automaticamente
            fetchCities(userProfile.state)
          }
          
          if (userProfile.city) {
            userData.city = userProfile.city
          }
          
          if (userProfile.participantType) {
            userData.participantType = userProfile.participantType as any
          }
          
          if (userProfile.hectares) {
            userData.hectares = String(userProfile.hectares)
          }
          
          reset((prev) => ({
            ...prev,
            ...userData
          }))
        } catch (error) {
          // Se não conseguir buscar o perfil, usa apenas os dados básicos do localStorage
          console.error('Erro ao buscar perfil do usuário:', error)
          
          const basicData: Partial<EnrollmentFormData> = {
            whatsappNumber: (user as any)?.phone || ''
          }
          
          if ((user as any)?.state) {
            basicData.state = (user as any).state
            fetchCities((user as any).state)
          }
          
          if ((user as any)?.city) {
            basicData.city = (user as any).city
          }
          
          reset((prev) => ({
            ...prev,
            ...basicData
          }))
        }
      }
      
      fetchUserProfile()
    } else if (isOpen) {
      // Se não houver usuário, apenas busca estados
      fetchStates()
      setResult(null)
      setError(null)
      reset((prev) => ({
        ...prev,
        whatsappNumber: ''
      }))
    }
  }, [isOpen, reset, user])

  useEffect(() => {
    if (isOpen && selectedState && selectedState.length === 2) {
      fetchCities(selectedState)
    } else {
      setCities([])
      if (!selectedState) {
        setValue('city', '')
      }
    }
  }, [isOpen, selectedState, setValue])

  // Verifica se o email já existe quando o usuário digita
  useEffect(() => {
    if (!needsAccount || !emailValue || !emailValue.includes('@')) {
      setEmailExists(false)
      setExistingUserId(null)
      return
    }

    const checkEmailTimeout = setTimeout(async () => {
      setCheckingEmail(true)
      try {
        // Tenta fazer registro para verificar se o email já existe
        // Se der erro de "já existe", sabemos que o email está cadastrado
        try {
          await apiFetch('/auth/register', {
            method: 'POST',
            body: JSON.stringify({
              name: 'test',
              email: emailValue,
              password: 'test123456'
            })
          })
          // Se não deu erro, o email não existe
          setEmailExists(false)
          setExistingUserId(null)
        } catch (error: any) {
          // Se der erro de "já existe" ou "já cadastrado", o email existe
          if (error?.message?.includes('já existe') || 
              error?.message?.includes('already exists') || 
              error?.message?.includes('já cadastrado') ||
              error?.message?.includes('Email já cadastrado')) {
            setEmailExists(true)
          } else {
            setEmailExists(false)
            setExistingUserId(null)
          }
        }
      } catch (error) {
        setEmailExists(false)
        setExistingUserId(null)
      } finally {
        setCheckingEmail(false)
      }
    }, 800) // Debounce de 800ms

    return () => clearTimeout(checkEmailTimeout)
  }, [emailValue, needsAccount])

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

  const handleClose = () => {
    onClose()
    reset()
    setResult(null)
    setError(null)
  }

  const onSubmit = async (data: EnrollmentFormData) => {
    setSubmitting(true)
    setError(null)
    setResult(null)

    const cpf = data.cpf.replace(/\D/g, '')
    const whatsapp = data.whatsappNumber.replace(/\D/g, '')
    const hectares =
      data.participantType === 'PRODUTOR'
        ? parseFloat((data.hectares ?? '').replace(',', '.'))
        : undefined

    try {
      // Se precisa criar conta, primeiro verifica se o email já existe
      if (needsAccount && data.email) {
        setIsRegistering(true)
        
        // Se o email já existe (verificado anteriormente)
        if (emailExists) {
          // Se tem senha, faz login. Se não tem, usa endpoint especial que vincula pelo email
          if (data.password) {
            try {
              const loginResponse = await apiFetch<any>('/auth/login', {
                method: 'POST',
                body: JSON.stringify({
                  email: data.email,
                  password: data.password
                }),
              })
              if (typeof window !== 'undefined') {
                localStorage.setItem('token', loginResponse.accessToken)
                localStorage.setItem('user', JSON.stringify(loginResponse.user))
              }
              // Após login bem-sucedido, continua para fazer a inscrição normalmente
            } catch (loginError: any) {
              setError(loginError?.message || 'Senha incorreta. Se não lembrar sua senha, deixe em branco para vincular apenas com o email.')
              setIsRegistering(false)
              setSubmitting(false)
              return
            }
          } else {
            // Se não tem senha mas o email existe, usa endpoint especial que vincula pelo email
            // Faz a inscrição diretamente vinculada ao email (sem precisar de senha)
            try {
              const responseBody = await apiFetch<any>(`/courses/${courseId}/enroll-by-email`, {
                method: 'POST',
                body: JSON.stringify({
                  email: data.email,
                  cpf,
                  birthDate: data.birthDate,
                  participantType: data.participantType,
                  hectares: data.participantType === 'PRODUTOR' ? hectares : undefined,
                  state: data.state,
                  city: data.city,
                  whatsappNumber: whatsapp
                }),
              })

              const status = responseBody.enrollment?.status as EnrollmentStatus | undefined
              const waitlistPosition = responseBody.metadata?.waitlistPosition ?? null

              let message = 'Inscrição realizada com sucesso! A inscrição foi vinculada à sua conta existente.'
              if (status === 'WAITLIST') {
                message =
                  waitlistPosition && waitlistPosition > 0
                    ? `Você entrou na lista de espera deste curso. Sua posição atual é ${waitlistPosition}.`
                    : 'Você entrou na lista de espera deste curso. Aguarde a aprovação do administrador.'
              } else if (status === 'PENDING_REGION') {
                message =
                  responseBody.enrollment?.eligibilityReason ||
                  'Seu cadastro foi recebido, mas ainda não está elegível para participar deste curso.'
              } else if (status === 'REJECTED') {
                message =
                  responseBody.enrollment?.eligibilityReason ||
                  'Sua inscrição foi registrada, mas não pôde ser aprovada.'
              }

              setResult({
                status: status ?? 'CONFIRMED',
                message,
                waitlistPosition
              })

              reset({
                name: '',
                email: '',
                password: '',
                cpf: '',
                birthDate: '',
                participantType: 'ESTUDANTE',
                hectares: '',
                state: '',
                city: '',
                whatsappNumber: ''
              })

              onSuccess?.({
                enrollment: responseBody.enrollment,
                metadata: responseBody.metadata
              })
              
              setIsRegistering(false)
              setSubmitting(false)
              return
            } catch (enrollError: any) {
              setError(enrollError?.message || 'Erro ao fazer inscrição. Verifique os dados informados.')
              setIsRegistering(false)
              setSubmitting(false)
              return
            }
          }
        } else if (!emailExists && data.password && data.name) {
          // Se o email não existe, cria nova conta
          try {
            // Tenta criar a conta primeiro
            const registerResponse = await apiFetch<any>('/auth/register', {
              method: 'POST',
              body: JSON.stringify({
                name: data.name,
                email: data.email,
                password: data.password,
                cpf,
                birthDate: data.birthDate,
                participantType: data.participantType,
                hectares: data.participantType === 'PRODUTOR' ? hectares : undefined,
                state: data.state,
                city: data.city,
                phone: whatsapp
              }),
            })
            
            // Se o registro retornar token, salva no localStorage
            if (registerResponse.accessToken) {
              if (typeof window !== 'undefined') {
                localStorage.setItem('token', registerResponse.accessToken)
                localStorage.setItem('user', JSON.stringify(registerResponse.user))
              }
            }
          } catch (registerError: any) {
            // Se o usuário já existe, tenta fazer login
            if (registerError?.message?.includes('já existe') || registerError?.message?.includes('already exists') || registerError?.message?.includes('já cadastrado') || registerError?.message?.includes('Email já cadastrado')) {
              try {
                const loginResponse = await apiFetch<any>('/auth/login', {
                  method: 'POST',
                  body: JSON.stringify({
                    email: data.email,
                    password: data.password
                  }),
                })
                if (typeof window !== 'undefined') {
                  localStorage.setItem('token', loginResponse.accessToken)
                  localStorage.setItem('user', JSON.stringify(loginResponse.user))
                }
              } catch (loginError: any) {
                setError(loginError?.message || 'Erro ao fazer login. Verifique suas credenciais.')
                setIsRegistering(false)
                setSubmitting(false)
                return
              }
            } else {
              setError(registerError?.message || 'Erro ao criar conta')
              setIsRegistering(false)
              setSubmitting(false)
              return
            }
          }
        }
        setIsRegistering(false)
      }

      // Agora faz a inscrição no curso (usa auth: true que pega o token do localStorage)
      const responseBody = await apiFetch<any>(`/courses/${courseId}/enroll`, {
        method: 'POST',
        auth: true,
        body: JSON.stringify({
          cpf,
          birthDate: data.birthDate,
          participantType: data.participantType,
          hectares: data.participantType === 'PRODUTOR' ? hectares : undefined,
          state: data.state,
          city: data.city,
          whatsappNumber: whatsapp
        }),
      })

      const status = responseBody.enrollment?.status as EnrollmentStatus | undefined
      const waitlistPosition = responseBody.metadata?.waitlistPosition ?? null

      let message = 'Inscrição realizada com sucesso!'
      if (status === 'WAITLIST') {
        message =
          waitlistPosition && waitlistPosition > 0
            ? `Você entrou na lista de espera deste curso. Sua posição atual é ${waitlistPosition}.`
            : 'Você entrou na lista de espera deste curso. Aguarde a aprovação do administrador.'
      } else if (status === 'PENDING_REGION') {
        message =
          responseBody.enrollment?.eligibilityReason ||
          'Seu cadastro foi recebido, mas ainda não está elegível para participar deste curso.'
      } else if (status === 'REJECTED') {
        message =
          responseBody.enrollment?.eligibilityReason ||
          'Sua inscrição foi registrada, mas não pôde ser aprovada.'
      }

      setResult({
        status: status ?? 'CONFIRMED',
        message,
        waitlistPosition
      })

      reset({
        name: '',
        email: '',
        password: '',
        cpf: '',
        birthDate: '',
        participantType: 'ESTUDANTE',
        hectares: '',
        state: '',
        city: '',
        whatsappNumber: ''
      })

      onSuccess?.({
        enrollment: responseBody.enrollment,
        metadata: responseBody.metadata
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao processar inscrição')
      setIsRegistering(false)
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="sticky top-0 flex items-center justify-between border-b bg-white px-6 py-4">
          <h2 className="text-2xl font-bold text-[#003366]">
            {needsAccount ? 'Cadastrar e Inscrever-se' : 'Inscrever-se no Curso'}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 transition-colors hover:text-gray-600"
            type="button"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <p className="mb-6 text-gray-600">
            Curso:{' '}
            <span className="font-semibold text-[#003366]">
              {courseTitle}
            </span>
          </p>

          {result && (
            <div
              className={`mb-6 rounded-lg border px-4 py-3 text-sm ${
                result.status === 'CONFIRMED'
                  ? 'border-green-200 bg-green-50 text-green-800'
                  : result.status === 'WAITLIST'
                  ? 'border-yellow-200 bg-yellow-50 text-yellow-800'
                  : 'border-blue-200 bg-blue-50 text-blue-800'
              }`}
            >
              {result.message}
            </div>
          )}

          {error && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {!result && (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {needsAccount && (
                <>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      E-mail *
                    </label>
                    <input
                      {...register('email')}
                      type="email"
                      placeholder="seu@email.com"
                      className="w-full rounded-md border border-gray-300 px-4 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-[#FF6600]"
                    />
                    {checkingEmail && (
                      <p className="mt-1 text-sm text-blue-500">Verificando email...</p>
                    )}
                    {emailExists && !checkingEmail && (
                      <div className="mt-1">
                        <p className="text-sm text-green-600 font-medium">
                          ✓ Email já cadastrado. A inscrição será vinculada à sua conta existente.
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Você pode deixar a senha em branco para vincular apenas pelo email.
                        </p>
                      </div>
                    )}
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>
                    )}
                  </div>

                  {!emailExists && (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Nome Completo *
                      </label>
                      <input
                        {...register('name')}
                        type="text"
                        placeholder="Seu nome completo"
                        className="w-full rounded-md border border-gray-300 px-4 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-[#FF6600]"
                      />
                      {errors.name && (
                        <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>
                      )}
                    </div>
                  )}

                  {!emailExists && (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Senha *
                      </label>
                      <input
                        {...register('password')}
                        type="password"
                        placeholder="Mínimo 6 caracteres"
                        className="w-full rounded-md border border-gray-300 px-4 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-[#FF6600]"
                      />
                      {errors.password && (
                        <p className="mt-1 text-sm text-red-500">{errors.password.message}</p>
                      )}
                    </div>
                  )}

                  {emailExists && (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Senha (opcional)
                      </label>
                      <input
                        {...register('password')}
                        type="password"
                        placeholder="Digite sua senha se quiser fazer login (opcional)"
                        className="w-full rounded-md border border-gray-300 px-4 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-[#FF6600]"
                      />
                      <p className="mt-1 text-xs text-green-600">
                        ✓ Você pode deixar a senha em branco. A inscrição será vinculada automaticamente à sua conta pelo email.
                      </p>
                    </div>
                  )}
                </>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  CPF *
                </label>
                <input
                  {...register('cpf')}
                  type="text"
                  maxLength={14}
                  inputMode="numeric"
                  placeholder="000.000.000-00"
                  className="w-full rounded-md border border-gray-300 px-4 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-[#FF6600]"
                  onChange={(event) => {
                    const digits = event.target.value.replace(/\D/g, '').slice(0, 11)
                    setValue('cpf', digits, { shouldValidate: true })
                    event.target.value = formatCpf(digits)
                  }}
                />
                {errors.cpf && (
                  <p className="mt-1 text-sm text-red-500">{errors.cpf.message}</p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Data de Nascimento *
                </label>
                <input
                  {...register('birthDate')}
                  type="date"
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full rounded-md border border-gray-300 px-4 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-[#FF6600]"
                />
                {errors.birthDate && (
                  <p className="mt-1 text-sm text-red-500">{errors.birthDate.message}</p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  WhatsApp (com DDD) *
                </label>
                <input
                  {...register('whatsappNumber')}
                  type="tel"
                  inputMode="tel"
                  placeholder="(00) 00000-0000"
                  className="w-full rounded-md border border-gray-300 px-4 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-[#FF6600]"
                  onChange={(event) => {
                    const digits = event.target.value.replace(/\D/g, '').slice(0, 11)
                    setValue('whatsappNumber', digits, { shouldValidate: true })
                    event.target.value = formatWhatsapp(digits)
                  }}
                />
                {errors.whatsappNumber && (
                  <p className="mt-1 text-sm text-red-500">{errors.whatsappNumber.message}</p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 md:text-base">
                  Você é: *
                </label>
                <select
                  {...register('participantType')}
                  className="w-full rounded-md border border-gray-300 px-4 py-3 text-base text-gray-900 focus:border-transparent focus:ring-2 focus:ring-[#FF6600] md:py-2 md:text-sm appearance-none bg-white cursor-pointer min-h-[48px] touch-manipulation"
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
                {errors.participantType && (
                  <p className="mt-1 text-sm text-red-500">{errors.participantType.message}</p>
                )}
              </div>

              {participantType === 'PRODUTOR' && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Quantos hectares você possui? *
                  </label>
                  <input
                    {...register('hectares')}
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Ex: 10.5"
                    className="w-full rounded-md border border-gray-300 px-4 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-[#FF6600]"
                  />
                  {errors.hectares && (
                    <p className="mt-1 text-sm text-red-500">{errors.hectares.message}</p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 md:text-base">
                    Estado *
                  </label>
                  <select
                    {...register('state')}
                    disabled={loadingStates}
                    className="w-full rounded-md border border-gray-300 px-4 py-3 text-base text-gray-900 focus:border-transparent focus:ring-2 focus:ring-[#FF6600] disabled:opacity-50 md:py-2 md:text-sm appearance-none bg-white cursor-pointer min-h-[48px] touch-manipulation"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                      backgroundPosition: 'right 0.75rem center',
                      backgroundRepeat: 'no-repeat',
                      backgroundSize: '1.5em 1.5em',
                      paddingRight: '2.5rem'
                    }}
                  >
                    <option value="">
                      {loadingStates ? 'Carregando estados...' : 'Selecione o estado...'}
                    </option>
                    {states.map((state) => (
                      <option key={state.sigla} value={state.sigla}>
                        {state.nome}
                      </option>
                    ))}
                  </select>
                  {errors.state && (
                    <p className="mt-1 text-sm text-red-500">{errors.state.message}</p>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 md:text-base">
                    Cidade *
                  </label>
                  <select
                    {...register('city')}
                    disabled={!selectedState || loadingCities}
                    className="w-full rounded-md border border-gray-300 px-4 py-3 text-base text-gray-900 focus:border-transparent focus:ring-2 focus:ring-[#FF6600] disabled:opacity-50 md:py-2 md:text-sm appearance-none bg-white cursor-pointer min-h-[48px] touch-manipulation"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                      backgroundPosition: 'right 0.75rem center',
                      backgroundRepeat: 'no-repeat',
                      backgroundSize: '1.5em 1.5em',
                      paddingRight: '2.5rem'
                    }}
                  >
                    <option value="">
                      {loadingCities
                        ? 'Carregando cidades...'
                        : selectedState
                        ? 'Selecione a cidade...'
                        : 'Selecione o estado primeiro'}
                    </option>
                    {cities.map((city) => (
                      <option key={city.nome} value={city.nome}>
                        {city.nome}
                      </option>
                    ))}
                  </select>
                  {errors.city && (
                    <p className="mt-1 text-sm text-red-500">{errors.city.message}</p>
                  )}
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 rounded-md border border-gray-300 px-6 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-md bg-[#FF6600] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#e55a00] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting
                    ? isRegistering
                      ? 'Cadastrando...'
                      : 'Enviando...'
                    : needsAccount
                    ? 'Cadastrar e Inscrever-se'
                    : 'Confirmar Inscrição'}
                </button>
              </div>
            </form>
          )}
        </div>

        {result && (
          <div className="border-t bg-gray-50 px-6 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm text-gray-700">
                Revise suas notificações para acompanhar o status da inscrição.
              </span>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-md bg-[#FF6600] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#e55a00]"
                >
                  Entendi
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

