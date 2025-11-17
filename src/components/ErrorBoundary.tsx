import React, { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary capturou um erro:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center p-8">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Ops! Algo deu errado</h1>
            <p className="text-gray-600 mb-4">
              Ocorreu um erro ao carregar esta página.
            </p>
            {this.state.error && (
              <details className="text-left bg-gray-100 p-4 rounded mb-4 max-w-2xl">
                <summary className="cursor-pointer font-semibold mb-2">Detalhes do erro</summary>
                <pre className="text-xs overflow-auto">{this.state.error.toString()}</pre>
              </details>
            )}
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null })
                window.location.href = '/'
              }}
              className="bg-[#FF6600] text-white px-6 py-3 rounded-md font-semibold hover:bg-[#e55a00] transition-colors"
            >
              Voltar para o início
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

