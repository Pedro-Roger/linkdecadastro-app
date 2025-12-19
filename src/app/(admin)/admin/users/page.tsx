
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import NotificationBell from '@/components/notifications/NotificationBell'
import Footer from '@/components/ui/Footer'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/lib/useAuth'

interface User {
  id: string
  name: string
  email: string
  phone: string | null
  state: string | null
  city: string | null
  participantType: string | null
  role: string
  createdAt: string
  _count: {
    enrollments: number
    registrations: number
  }
}

interface StateOption {
  sigla: string
  nome: string
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
  { sigla: 'TO', nome: 'Tocantins' },
]

export default function AdminUsersPage() {
  const router = useRouter()
  const { user, loading, isAuthenticated } = useAuth({ requireAuth: true, redirectTo: '/login' })
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [stateFilter, setStateFilter] = useState<string>('')
  const [cityFilter, setCityFilter] = useState<string>('')
  const [cities, setCities] = useState<string[]>([])
  const [loadingCities, setLoadingCities] = useState(false)

  const hasLoadedInitial = useRef(false)

  useEffect(() => {
    if (!loading && !hasLoadedInitial.current) {
      if (!isAuthenticated || user?.role !== 'ADMIN') {
        router.push('/my-courses')
      } else {
        hasLoadedInitial.current = true
        fetchUsers()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, isAuthenticated, user?.role, router])

  useEffect(() => {
    if (stateFilter) {
      fetchCities(stateFilter)
    } else {
      setCities([])
      setCityFilter('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateFilter])

  useEffect(() => {
    // Recarregar usuários quando os filtros mudarem (após o carregamento inicial)
    if (hasLoadedInitial.current && !loading && isAuthenticated && user?.role === 'ADMIN') {
      fetchUsers()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateFilter, cityFilter])

  async function fetchUsers() {
    try {
      setIsLoading(true)
      setError(null)
      const params = new URLSearchParams()
      if (stateFilter) {
        params.append('state', stateFilter)
      }
      if (cityFilter) {
        params.append('city', cityFilter)
      }
      const url = `/admin/users${params.toString() ? `?${params.toString()}` : ''}`
      console.log('Buscando usuários na URL:', url)
      const data = await apiFetch<User[]>(url, { auth: true })
      console.log('Usuários recebidos:', data)
      setUsers(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Erro ao buscar usuários:', err)
      setError(err instanceof Error ? err.message : 'Erro ao carregar usuários')
      setUsers([])
    } finally {
      setIsLoading(false)
    }
  }

  async function fetchCities(state: string) {
    try {
      setLoadingCities(true)
      // Buscar todas as cidades dos usuários deste estado
      const allUsers = await apiFetch<User[]>('/admin/users', { auth: true })
      const citiesInState = Array.from(
        new Set(
          allUsers
            .filter((u) => u.state === state && u.city)
            .map((u) => u.city!)
        )
      ).sort()
      setCities(citiesInState)
    } catch (err) {
      console.error('Erro ao buscar cidades:', err)
    } finally {
      setLoadingCities(false)
    }
  }

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      if (!searchTerm.trim()) return true
      const term = searchTerm.toLowerCase()
      return (
        user.name.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term) ||
        (user.phone && user.phone.toLowerCase().includes(term))
      )
    })
  }, [users, searchTerm])

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-xl text-gray-600">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
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
              <Link href="/admin/dashboard" className="text-gray-700 hover:text-[#FF6600]">Dashboard</Link>
              <Link href="/admin/courses" className="text-gray-700 hover:text-[#FF6600]">Cursos</Link>
              <Link href="/admin/events" className="text-gray-700 hover:text-[#FF6600]">Eventos</Link>
              <Link href="/admin/users" className="text-gray-700 hover:text-[#FF6600] font-semibold">Usuários</Link>
              <NotificationBell />
              <Link href="/profile" className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#FF6600] text-white font-bold flex items-center justify-center">
                {user?.name?.charAt(0).toUpperCase() || 'A'}
              </Link>
              <button
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    localStorage.removeItem('token')
                    router.push('/login')
                  }
                }}
                className="bg-red-500 text-white px-4 py-2 rounded-md font-semibold hover:bg-red-600 transition-colors text-sm md:text-base"
              >
                Sair
              </button>
            </nav>
          </div>
        </div>
      </header>
      
      <div className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link
            href="/admin/dashboard"
            className="text-[#FF6600] hover:underline mb-4 inline-block"
          >
            ← Voltar para Dashboard
          </Link>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-[#003366]">Usuários da Plataforma</h1>
              <p className="text-gray-600 text-sm mt-1">
                Visualize e filtre todos os usuários cadastrados na plataforma
              </p>
            </div>
            <button
              onClick={() => fetchUsers()}
              disabled={isLoading}
              className="bg-[#FF6600] text-white px-4 py-2 rounded-md font-semibold hover:bg-[#e55a00] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <svg className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {isLoading ? 'Carregando...' : 'Atualizar'}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p className="font-semibold">Erro ao carregar usuários:</p>
            <p>{error}</p>
            <button
              onClick={() => fetchUsers()}
              className="mt-2 text-sm text-red-700 hover:underline"
            >
              Tentar novamente
            </button>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-4 md:p-6 space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 items-center gap-3">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome, email ou telefone"
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-[#FF6600]"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <label className="text-sm text-gray-500">Estado:</label>
              <select
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-[#FF6600]"
              >
                <option value="">Todos</option>
                {FALLBACK_STATES.map((state) => (
                  <option key={state.sigla} value={state.sigla}>
                    {state.nome}
                  </option>
                ))}
              </select>
              {stateFilter && (
                <>
                  <label className="text-sm text-gray-500">Cidade:</label>
                  <select
                    value={cityFilter}
                    onChange={(e) => setCityFilter(e.target.value)}
                    disabled={loadingCities}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-[#FF6600] disabled:opacity-50"
                  >
                    <option value="">Todas</option>
                    {cities.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                </>
              )}
              {(stateFilter || cityFilter) && (
                <button
                  onClick={() => {
                    setStateFilter('')
                    setCityFilter('')
                  }}
                  className="text-sm text-[#FF6600] hover:underline"
                >
                  Limpar filtros
                </button>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">Carregando usuários...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg mb-2">
                {users.length === 0 
                  ? 'Nenhum usuário encontrado na plataforma' 
                  : 'Nenhum usuário encontrado com os filtros aplicados'}
              </p>
              <p className="text-gray-400 text-sm mb-4">
                {users.length === 0 
                  ? 'Ainda não há usuários cadastrados na plataforma.' 
                  : 'Tente ajustar os filtros ou a busca.'}
              </p>
              {users.length > 0 && (stateFilter || cityFilter || searchTerm) && (
                <button
                  onClick={() => {
                    setStateFilter('')
                    setCityFilter('')
                    setSearchTerm('')
                  }}
                  className="text-sm text-[#FF6600] hover:underline"
                >
                  Limpar todos os filtros
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nome
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Telefone
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cidade
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Inscrições
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cadastro
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {user.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.phone || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.state || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.city || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.participantType || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user._count.enrollments} cursos, {user._count.registrations} eventos
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(new Date(user.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {filteredUsers.length > 0 && (
            <div className="mt-4 text-sm text-gray-600">
              {searchTerm || stateFilter || cityFilter ? (
                <>
                  Mostrando <strong>{filteredUsers.length}</strong> de <strong>{users.length}</strong> usuários
                </>
              ) : (
                <>
                  Total de usuários: <strong>{filteredUsers.length}</strong>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  )
}

