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
    <footer className={`bg-[var(--secondary)] text-white py-16 mt-20 relative overflow-hidden ${isAuthenticated ? 'pb-32 md:pb-16' : 'pb-16'}`}>
      {/* Background patterns */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--primary)] blur-[100px] rounded-full -mr-48 -mt-48"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[var(--accent)] blur-[100px] rounded-full -ml-48 -mb-48"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col md:flex-row items-start justify-between gap-12">
          <div className="max-w-xl space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] rounded-xl flex items-center justify-center text-white text-lg font-black shadow-lg shadow-[var(--primary)]/20">
                L
              </div>
              <span className="text-2xl font-black tracking-tight italic">LinkDe<span className="text-[var(--primary)]">Cadastro</span></span>
            </div>

            <p className="text-slate-400 text-lg font-medium leading-relaxed">
              A maior rede de gestão e automação para produtores e consultores.
              Simplifique seus processos, automatize seu WhatsApp e escale seus resultados.
            </p>

            <div className="flex items-center gap-6">
              <a href="#" className="text-slate-500 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
              </a>
              <a href="#" className="text-slate-500 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-12 sm:gap-24">
            <div className="space-y-6">
              <h4 className="text-xs font-black uppercase tracking-[0.2em] text-[var(--primary)]">Plataforma</h4>
              <ul className="space-y-4 text-sm font-bold text-slate-400">
                <li><a href="#" className="hover:text-white transition-colors">Recursos</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Segurança</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Novidades</a></li>
              </ul>
            </div>
            <div className="space-y-6">
              <h4 className="text-xs font-black uppercase tracking-[0.2em] text-[var(--primary)]">App Mobile</h4>
              <div className="space-y-4">
                <a
                  href={appUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 px-6 py-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all group"
                >
                  <div className="w-8 h-8 rounded-lg bg-[var(--primary)] flex items-center justify-center text-white">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.523 15.341c-.551 0-1.002-.451-1.002-1.002 0-.553.451-1.002 1.002-1.002.553 0 1.002.449 1.002 1.002 0 .551-.449 1.002-1.002 1.002zm-5.523 0c-.551 0-1.002-.451-1.002-1.002 0-.553.451-1.002 1.002-1.002.553 0 1.002.449 1.002 1.002 0 .551-.449 1.002-1.002 1.002zm11.236-8.232c-.015-.246-.667-10.435-11.231-10.435-10.565 0-11.218 10.189-11.233 10.435-.015.22.023.418.113.585.093.17.218.286.376.353v13.633c0 1.281 1.042 2.321 2.321 2.321h16.836c1.282 0 2.322-1.04 2.322-2.321v-13.633c.158-.067.284-.183.376-.353.09-.167.128-.365.12-.585zm-1.892 14.218c0 .54-.438.978-.978.978h-16.836c-.54 0-.978-.438-.978-.978v-13.344c.414.07 10.404.757 18.792 0v13.344zm-.793-14.734c-6.195.441-12.801.441-18.997 0 .285-1.579 1.259-8.261 9.499-8.261 8.24 0 9.213 6.682 9.498 8.261z" /></svg>
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Download</p>
                    <p className="text-sm font-black text-white">App Store</p>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-20 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-slate-500 text-sm font-bold">
            &copy; {new Date().getFullYear()} Link de Cadastro. Todos os direitos reservados.
          </p>
          <div className="flex items-center gap-8 text-sm font-bold text-slate-500">
            <a href="#" className="hover:text-white transition-colors">Privacidade</a>
            <a href="#" className="hover:text-white transition-colors">Termos</a>
          </div>
        </div>
      </div>
    </footer>
  )
}

