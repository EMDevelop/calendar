import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../common/styles/index.css'
import { WidgetApp } from './WidgetApp.tsx'

const container = document.getElementById('root')
if (!container) {
  throw new Error('widget root element is missing')
}

createRoot(container).render(
  <StrictMode>
    <WidgetApp />
  </StrictMode>,
)
