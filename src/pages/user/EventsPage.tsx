import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Footer from '@/components/ui/Footer'
import MobileNavbar from '@/components/ui/MobileNavbar'
import LoadingScreen from '@/components/ui/LoadingScreen'
import { apiFetch, normalizeImageUrl } from '@/lib/api'
import EventEnrollmentModal from '@/components/modals/EventEnrollmentModal'

export default function EventsPage() {
  const navigate = useNavigate()
  const [allEvents, setAllEvents] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [enrollmentModal, setEnrollmentModal] = useState<{ isOpen: boolean; eventId: string; eventTitle: string }>({
    isOpen: false,
    eventId: '',
    eventTitle: ''
  })

  useEffect(() => {
    fetchEvents()
  }, [])

  useEffect(() => {
    filterEvents()
  }, [searchTerm, allEvents])

  const filterEvents = useCallback(() => {
    let filtered = [...allEvents]

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (event) =>
          event.title.toLowerCase().includes(term) ||
          event.description?.toLowerCase().includes(term)
      )
    }

    setEvents(filtered)
  }, [searchTerm, allEvents])

  async function fetchEvents() {
    try {
      // Endpoint is /events based on EventsController
      const data = await apiFetch<any[]>('/events') 
      setAllEvents(data)
    } catch (error) {
      console.error('Failed to fetch events', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEnroll = (eventId: string, eventTitle: string) => {
    setEnrollmentModal({
      isOpen: true,
      eventId,
      eventTitle
    })
  }

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <MobileNavbar />
      
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6 space-y-4">
          <div className="relative max-w-2xl mx-auto">
             <input
              type="text"
              placeholder="Pesquisar eventos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-4 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900"
            />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 pb-24 md:pb-8 flex-1">
        <h1 className="text-3xl font-bold mb-8 text-[#003366]">Eventos Disponíveis</h1>
        
        {events.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-gray-500 text-lg mb-4">Nenhum evento encontrado.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <div key={event.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                 {/* Banner Logic */}
                 {event.bannerUrl ? (
                    <img src={normalizeImageUrl(event.bannerUrl)} alt={event.title} className="w-full h-48 object-cover"/>
                 ) : (
                    <div className="w-full h-48 bg-gradient-to-br from-[#003366] to-[#FF6600] flex items-center justify-center text-white">Sem imagem</div>
                 )}
                 <div className="p-6">
                    <h2 className="text-xl font-semibold mb-2 text-[#003366]">{event.title}</h2>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">{event.description}</p>
                    <div className="mb-4 text-sm text-gray-500">
                      {event.date && format(new Date(event.date), 'dd/MM/yyyy', { locale: ptBR })}
                      {event.location && ` • ${event.location}`}
                    </div>
                    <button
                      onClick={() => handleEnroll(event.id, event.title)}
                      className="w-full bg-[#FF6600] text-white py-2 px-4 rounded-md font-semibold hover:bg-[#e55a00] transition-colors"
                    >
                      Inscrever-se
                    </button>
                 </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Footer />

      <EventEnrollmentModal
        isOpen={enrollmentModal.isOpen}
        onClose={() => setEnrollmentModal({ isOpen: false, eventId: '', eventTitle: '' })}
        eventId={enrollmentModal.eventId}
        eventTitle={enrollmentModal.eventTitle}
        onSuccess={() => {
           // Maybe refetch or show success message?
           // The modal handles its own success message/closing usually or we can show a toast here.
        }}
      />
    </div>
  )
}
