import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'

import Login from './Login.jsx'
import CreateAccount from './CreateAccount.jsx'
import Dashboard from './Dashboard.jsx'

// Protected Route Helper
function ProtectedRoute({ children }) {
  const user = localStorage.getItem('user');
  if (!user) {
    return <Navigate to="/Login" replace />;
  }
  return children;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/Login" element={<Login />} />
        <Route path="/CreateAccount" element={<CreateAccount />} />
        <Route path="/Dashboard" element={<ProtectedRoute> <Dashboard /> </ProtectedRoute>} /> 
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
