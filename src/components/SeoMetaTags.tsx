import { Helmet } from 'react-helmet-async'

interface SeoMetaTagsProps {
  title?: string
  description?: string
  image?: string
  url?: string
  type?: string
}

export default function SeoMetaTags({
  title = 'Link de Cadastro',
  description = 'Sistema de cadastro e plataforma de cursos',
  image,
  url,
  type = 'website',
}: SeoMetaTagsProps) {
  const siteUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const fullUrl = url ? (url.startsWith('http') ? url : `${siteUrl}${url}`) : siteUrl
  const fullImage = image
    ? image.startsWith('http')
      ? image
      : image.startsWith('/')
      ? `${siteUrl}${image}`
      : `${siteUrl}/${image}`
    : `${siteUrl}/logo.png`

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={fullImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content="Link de Cadastro" />
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={fullUrl} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullImage} />
      
      {/* WhatsApp */}
      <meta property="og:image:type" content="image/png" />
    </Helmet>
  )
}

