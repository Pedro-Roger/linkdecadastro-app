import { getAppStoreUrl } from '@/constants/branding'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/useAuth'

export default function Footer() {
  const [appUrl, setAppUrl] = useState<string>('https://querocamarao.com/app')
  const { isAuthenticated } = useAuth()

  useEffect(() => {
    setAppUrl(getAppStoreUrl())
  }, [])

  return (
    <footer className={`bg-[#001f3f] text-white py-12 md:py-16 mt-12 md:mt-20 ${isAuthenticated ? 'pb-24 md:pb-16' : 'pb-8 md:pb-16'}`}>
      <div className="container mx-auto px-4">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-10">
          <div className="text-center lg:text-left flex-1 max-w-2xl">
            <h3 className="text-2xl md:text-3xl font-bold mb-4 tracking-tight">Aplicativo Quero Camarão</h3>
            <p className="text-gray-300 text-lg md:text-xl mb-6 leading-relaxed">
              Tenha o controle do mercado na palma da sua mão. Cadastre-se, anuncie e acompanhe os preços atualizados do camarão em tempo real.
            </p>
            <p className="text-gray-400 text-sm md:text-base">
              Disponível para Android e iOS. {' '}
              <a
                href={appUrl}
                className="text-[#FF6600] hover:text-[#ff8533] hover:underline font-medium transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                Clique aqui para baixar
              </a>
              .
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-6 bg-white/5 p-6 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-sm">
            <div className="bg-white p-2 rounded-xl shadow-inner">
              {/* QR Code Placeholder SVG */}
              <svg className="w-24 h-24 text-gray-900" viewBox="0 0 100 100" fill="currentColor">
                <rect x="0" y="0" width="100" height="100" fill="white" />
                <path d="M10 10h30v30h-30zM50 10h10v10h-10zM70 10h20v20h-20zM10 50h10v10h-10zM30 50h30v10h-10v20h-20zM70 40h20v10h-20zM70 60h20v30h-20zM10 70h20v20h-20z" fill="#000" />
                <path d="M15 15h20v20h-20zM75 15h10v10h-10zM15 75h10v10h-10z" fill="#000" />
              </svg>
            </div>
            <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
              <span className="text-gray-300 text-sm mb-2 font-medium uppercase tracking-wider">Aponte a câmera</span>
              <a
                href={appUrl}
                className="bg-[#FF6600] px-8 py-4 rounded-xl font-bold hover:bg-[#ff5500] hover:scale-105 hover:shadow-lg transition-all text-white text-lg whitespace-nowrap flex items-center gap-2 group"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span>Baixar App</span>
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              </a>
            </div>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} Quero Camarão. Todos os direitos reservados.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition-colors">Termos de Uso</a>
            <a href="#" className="hover:text-white transition-colors">Privacidade</a>
            <a href="#" className="hover:text-white transition-colors">Suporte</a>
          </div>
        </div>
      </div>
    </footer>
  )
}

