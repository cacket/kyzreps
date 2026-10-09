import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { FavProvider } from './context/FavContext'
import { PrefsProvider } from './context/PrefsContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <PrefsProvider>
      <FavProvider>
        <App />
      </FavProvider>
    </PrefsProvider>
  </BrowserRouter>
)
