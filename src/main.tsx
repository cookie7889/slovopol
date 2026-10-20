import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { getSdk } from './sdk'

// Инициализация SDK не блокирует рендер (fire-and-forget):
// getSdk() закеширован, дальше init() → ready(); ошибки — только в консоль
getSdk()
  .then(async (sdk) => {
    await sdk.init()
    sdk.ready()
  })
  .catch((error: unknown) => {
    console.warn(
      '[SDK] инициализация не удалась, игра продолжает работу',
      error,
    )
  })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
