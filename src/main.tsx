import React from 'react'
import ReactDOM from 'react-dom/client'
import '@xyflow/react/dist/style.css'
import './styles/main.css'
import { App } from './App'

if (import.meta.env.DEV) {
  void import('react-grab')
}

const rootElement = document.getElementById('root')

const colorSchemeMedia = window.matchMedia('(prefers-color-scheme: dark)')

function syncSystemTheme() {
  document.documentElement.classList.toggle('dark', colorSchemeMedia.matches)
  document.documentElement.style.colorScheme = colorSchemeMedia.matches ? 'dark' : 'light'
}

syncSystemTheme()
colorSchemeMedia.addEventListener('change', syncSystemTheme)

if (!rootElement) {
  throw new Error('Root element not found')
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
