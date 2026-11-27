import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import WrapRoute from './WrapRoute.jsx'
import { wrapAliasTarget, wrapYearFromPath } from './lib/ytd'

// /wrap is the current year's wrap: swap the address for /<year> before rendering, so the page,
// its share link and the year links all use the real year.
const aliasTarget = wrapAliasTarget(window.location.pathname)
if (aliasTarget) {
  window.history.replaceState(null, '', aliasTarget + window.location.search + window.location.hash)
}

// No router: /<year> renders the BatchWrap year in review, everything else is the home page.
const wrapYear = wrapYearFromPath(window.location.pathname)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {wrapYear ? <WrapRoute year={wrapYear} /> : <App />}
  </StrictMode>,
)

// Installable as an app (public/manifest.webmanifest). The worker never caches /api/* and loads
// pages network first, see public/sw.js. Production only, so dev servers never get one.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
