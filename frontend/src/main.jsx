import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import axios from 'axios'
import './index.css'

const apiBaseUrl = import.meta.env.VITE_API_URL || 'https://crm-lead-fpvd.onrender.com/'
axios.defaults.baseURL = apiBaseUrl

ReactDOM.createRoot(document.getElementById('root')).render(<App />)
