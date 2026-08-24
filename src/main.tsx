import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import MiniWealthManager from './mwm/MiniWealthManager'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MiniWealthManager />
  </StrictMode>,
)
