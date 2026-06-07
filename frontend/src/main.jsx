import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import axios from 'axios'
import './index.css'

axios.defaults.baseURL = "https://crm-lead-q8g4.onrender.com";
ReactDOM.createRoot(document.getElementById('root')).render(<App />)
