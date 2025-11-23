import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import RegistrationForm from '@/components/forms/RegistrationForm'
import Footer from '@/components/ui/Footer'
import LoadingScreen from '@/components/ui/LoadingScreen'
import SeoMetaTags from '@/components/SeoMetaTags'
import { apiFetch } from '@/lib/api'

export default function RegisterPage() {
  const params = useParams()
  const linkId = params.linkId as string
  const [event, setEvent] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchEvent() {
      try {
        // Tenta buscar por slug primeiro, depois por linkId
        let data
        try {
          data = await apiFetch(`/events/slug/${linkId}`)
        } catch (slugError) {
          data = await apiFetch(`/events/link/${linkId}`)
        }
        setEvent(data)
      } catch (error) {
      } finally {
        setLoading(false)
      }
    }

    if (linkId) {
      fetchEvent()
    }
  }, [linkId])

  if (loading) {
    return <LoadingScreen />
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#003366] to-[#FF6600]">
        <div className="text-white text-xl">Evento não encontrado</div>
      </div>
    )
  }

  const shareUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/register/${linkId}` 
    : `/register/${linkId}`

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#003366] to-[#FF6600]">
      <SeoMetaTags
        title={event ? `${event.title} - Link de Cadastro` : 'Cadastro - Link de Cadastro'}
        description={event?.description || 'Faça seu cadastro neste evento'}
        image={event?.bannerUrl}
        url={shareUrl}
        type="website"
      />
      {event.bannerUrl && (
        <div className="w-full h-64 md:h-96 bg-cover bg-center" 
             style={{ backgroundImage: `url(${event.bannerUrl})` }} />
      )}
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-4 text-[#003366]">{event.title}</h1>
          <p className="text-gray-600 mb-8">{event.description}</p>
          
          <RegistrationForm eventId={event.id} />
        </div>
      </div>

      <Footer />
    </div>
  )
}

