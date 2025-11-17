export default function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#003366] via-[#003366] to-[#FF6600]">
      {/* Logo e Propaganda do App Quero Camarão */}
      <div className="text-center mb-8 px-4">
        <div className="mb-6">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Quero Camarão
          </h2>
          <p className="text-white/90 text-lg md:text-xl max-w-md mx-auto">
            Cadastre-se, anuncie e acompanhe os preços atualizados do camarão em todo o Ceará
          </p>
        </div>
      </div>

      {/* Loader Animado */}
      <div className="relative mb-8">
        <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 bg-[#FF6600] rounded-full animate-pulse"></div>
        </div>
      </div>

      {/* Texto de Carregamento */}
      <p className="text-white/80 text-sm md:text-base animate-pulse">
        Carregando...
      </p>

      {/* Link para Download do App */}
      <div className="mt-8 text-center">
        <a
          href="https://play.google.com/store/apps/details?id=com.querocamarao.app"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block bg-white text-[#FF6600] px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors shadow-lg"
        >
          📱 Baixe o App Agora
        </a>
      </div>

      {/* Rodapé com mais informações */}
      <div className="mt-8 text-center px-4">
        <p className="text-white/70 text-xs md:text-sm">
          Aplicativo Quero Camarão – Clique aqui para baixar
        </p>
      </div>
    </div>
  )
}

