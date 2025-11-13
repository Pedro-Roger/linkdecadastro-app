'use client'

import { APP_QUERO_CAMARAO_URL } from '@/constants/branding'

export default function Footer() {
  return (
    <footer className="bg-[#003366] text-white py-8 md:py-12 mt-12 md:mt-16">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between space-y-6 md:space-y-0">
          <div className="text-center md:text-left flex-1">
            <h3 className="text-xl md:text-2xl font-bold mb-3">Aplicativo Quero Camarão</h3>
            <p className="text-gray-300 text-base md:text-lg mb-4">
              Cadastre-se, anuncie e acompanhe os preços atualizados do camarão em todo o Ceará.
            </p>
            <p className="text-gray-400 text-sm md:text-base">
              Aplicativo Quero Camarão –{' '}
              <a
                href={APP_QUERO_CAMARAO_URL}
                className="text-[#FF6600] hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Clique aqui para baixar
              </a>
              .
            </p>
          </div>
          <div className="md:ml-8">
            <a
              href={APP_QUERO_CAMARAO_URL}
              className="bg-[#FF6600] px-6 md:px-8 py-3 md:py-4 rounded-md font-semibold hover:bg-[#e55a00] transition-colors text-base md:text-lg whitespace-nowrap inline-block"
              target="_blank"
              rel="noopener noreferrer"
            >
              Baixe agora o app
            </a>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-gray-600 text-center text-sm text-gray-400">
          <p>&copy; {new Date().getFullYear()} Quero Cursos. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  )
}

