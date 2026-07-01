import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import axios from 'axios'
import './index.css'

const apiBaseUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '' : 'https://crm-lead-q8g4.onrender.com')
axios.defaults.baseURL = apiBaseUrl

ReactDOM.createRoot(document.getElementById('root')).render(<App />)
