import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { ToastProvider } from './components/Toast'
import Nav from './components/Nav'
import Login from './pages/Login'
import Register from './pages/Register'
import Postavy from './pages/Postavy'
import Profil from './pages/Profil'
import Spin from './pages/Spin'
import Admin from './pages/Admin'
import Chat from './pages/Chat'

function Cekani() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: 400, textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏳</div>
        <h2 className="heading" style={{ color: 'var(--gold)', fontSize: '1.4rem', marginBottom: '0.75rem' }}>Čekej na potvrzení</h2>
        <div className="card">
          <p className="text-dim">Tvůj účet ještě nebyl schválen adminem.</p>
          <p className="text-muted text-sm mt-2">Jakmile tě admin schválí, stránka se automaticky obnoví.</p>
        </div>
      </div>
    </div>
  )
}

function PrivateRoute({ children }) {
  const { user, userData, loading } = useAuth()
  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem', animation: 'spin 2s linear infinite' }}>✦</div>
        <p className="text-dim text-sm">Načítám svět...</p>
      </div>
    </div>
  )
  if (!user) return <Navigate to="/login" />
  if (userData && !userData.approved && !userData.isAdmin) return <Cekani />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/registrace" element={<Register />} />
      <Route path="/" element={<PrivateRoute><><Nav /><Postavy /></></PrivateRoute>} />
      <Route path="/profil" element={<PrivateRoute><><Nav /><Profil /></></PrivateRoute>} />
      <Route path="/kolo" element={<PrivateRoute><><Nav /><Spin /></></PrivateRoute>} />
      <Route path="/chat" element={<PrivateRoute><><Nav /><Chat /></></PrivateRoute>} />
      <Route path="/admin" element={<PrivateRoute><><Nav /><Admin /></></PrivateRoute>} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <div className="app-shell">
            <AppRoutes />
          </div>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
