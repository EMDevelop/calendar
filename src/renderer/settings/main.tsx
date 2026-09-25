import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../common/styles/index.css'
import { SettingsApp } from './SettingsApp.tsx'

const container = document.getElementById('root')
if (!container) {
  throw new Error('settings root element is missing')
}

createRoot(container).render(
  <StrictMode>
    <SettingsApp />
  </StrictMode>,
)
