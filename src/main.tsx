import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

const rootElement = document.getElementById('root')
if (!rootElement) {
  document.body.innerHTML = '<h1 style="color: red; padding: 20px;">Erro: Elemento #root não encontrado no HTML</h1>'
  throw new Error('Root element not found')
}

try {
  const root = ReactDOM.createRoot(rootElement)
  
  root.render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  )
} catch (error) {
  rootElement.innerHTML = `
    <div style="padding: 20px; color: red;">
      <h1>Erro ao renderizar a aplicação</h1>
      <pre>${error instanceof Error ? error.message : String(error)}</pre>
      <pre>${error instanceof Error ? error.stack : ''}</pre>
    </div>
  `
}
