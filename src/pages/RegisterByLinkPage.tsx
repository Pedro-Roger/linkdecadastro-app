import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import RegistrationForm from '@/components/forms/RegistrationForm'
import Footer from '@/components/ui/Footer'
import LoadingScreen from '@/components/ui/LoadingScreen'
import SeoMetaTags from '@/components/SeoMetaTags'
import { apiFetch } from '@/lib/api'

export default function RegisterPage() {
  const params = useParams()
  const linkId = (params.linkId || params.slug) as string
  const [event, setEvent] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
      async function fetchEvent() {
        try {
          let data
          const looksLikeLegacyLinkId = /^evt-\d+-[a-z0-9]+$/i.test(linkId)

          try {
            data = looksLikeLegacyLinkId
              ? await apiFetch(`/events/link/${linkId}`)
              : await apiFetch(`/events/slug/${linkId}`)
          } catch (primaryError) {
            data = looksLikeLegacyLinkId
              ? await apiFetch(`/events/slug/${linkId}`)
              : await apiFetch(`/events/link/${linkId}`)
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
    <div className="min-h-screen bg-[var(--bg-main)] selection:bg-[var(--primary)] selection:text-white pb-12">
      <SeoMetaTags
        title={event ? `${event.title} - Link de Cadastro` : 'Cadastro - Link de Cadastro'}
        description={event?.description || 'Faça seu cadastro neste evento'}
        image={event?.bannerUrl}
        url={shareUrl}
        type="website"
      />

      {/* Dynamic Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-[var(--primary)]/5 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-[var(--accent)]/5 blur-[120px] rounded-full"></div>
      </div>

      {event.bannerUrl && (
        <div className="w-full h-[300px] md:h-[450px] relative overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-700 hover:scale-105"
            style={{ backgroundImage: `url(${event.bannerUrl})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-main)] via-transparent to-transparent" />
        </div>
      )}

      <div className={`container mx-auto px-4 ${event.bannerUrl ? '-mt-24 relative z-10' : 'pt-12'}`}>
        <div className="max-w-3xl mx-auto glass rounded-[2.5rem] shadow-2xl overflow-hidden border border-[var(--glass-border)]">
          <div className="p-8 md:p-12">
            <div className="flex items-center justify-between mb-8">
              <Link
                to="/"
                className="flex items-center gap-2 text-sm font-bold text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors group"
              >
                <div className="w-8 h-8 rounded-full bg-[var(--bg-main)] border border-[var(--border-light)] flex items-center justify-center group-hover:bg-[var(--primary)] group-hover:text-white group-hover:border-transparent transition-all">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  </svg>
                </div>
                {!event.bannerUrl && "Voltar"}
              </Link>

              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] rounded-lg flex items-center justify-center text-white text-xs font-black shadow-lg shadow-[var(--primary)]/20">
                  L
                </div>
                <span className="font-black text-sm text-[var(--secondary)] tracking-tight">LinkCadastro</span>
              </div>
            </div>

            <div className="space-y-4 mb-10">
              <h1 className="text-4xl md:text-5xl font-black text-[var(--secondary)] tracking-tighter leading-tight italic">
                {event.title}
              </h1>
              <p className="text-lg text-[var(--text-muted)] font-medium leading-relaxed max-w-2xl">
                {event.description}
              </p>

              <div className="flex flex-wrap gap-4 pt-2">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] text-xs font-bold uppercase tracking-wider border border-[var(--primary)]/10">
                  <span className="w-2 h-2 bg-[var(--primary)] rounded-full animate-pulse"></span>
                  Inscrições Abertas
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-[var(--border-light)]">
              <RegistrationForm eventId={event.id} />
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}

