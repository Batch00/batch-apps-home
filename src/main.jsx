import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import WrapRoute from './WrapRoute.jsx'
import { wrapYearFromPath } from './lib/ytd'

// No router: /<year> renders the BatchWrap year in review, everything else is the home page.
const wrapYear = wrapYearFromPath(window.location.pathname)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {wrapYear ? <WrapRoute year={wrapYear} /> : <App />}
  </StrictMode>,
)
