import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../common/styles/index.css'
import { AlertApp } from './AlertApp.tsx'

const container = document.getElementById('root')
if (!container) {
  throw new Error('alert root element is missing')
}

createRoot(container).render(
  <StrictMode>
    <AlertApp />
  </StrictMode>,
)
