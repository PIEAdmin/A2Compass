import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { store } from './store'
import App from './App'
import './styles/index.css'
import './styles/safe-area.css'
import './styles/illustrations.css'
import './styles/penguin.css'
import { initCapacitor } from './capacitor-init'

// Initialize native bridge (no-op on web)
initCapacitor()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>,
)
