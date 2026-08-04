import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { LeaveProvider } from './context/LeaveContext.jsx'
import { ChatProvider } from './context/ChatContext.jsx'
import './styles/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <LeaveProvider>
        <ChatProvider>
          <App />
        </ChatProvider>
      </LeaveProvider>
    </AuthProvider>
  </React.StrictMode>,
)

