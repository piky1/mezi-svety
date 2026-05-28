import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { logoutUser } from '../firebase/db'
import { useToast } from './Toast'

export default function Nav() {
  const { userData } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()

  const handleLogout = async () => {
    await logoutUser(userData?.uid)
    toast('Odhlášení proběhlo úspěšně.', 'info')
    navigate('/login')
  }

  const hasSpinnable = (userData?.inventory || []).some(i => i.type === 'spin_token' || i.type === 'pending_curse')

  return (
    <nav className="nav">
      <span className="nav-title">✦ Mezi Světy</span>
      <div className="nav-links">
        <NavLink to="/" className={({ isActive }) => `nav-btn${isActive ? ' active' : ''}`}>Postavy</NavLink>
        <NavLink to="/profil" className={({ isActive }) => `nav-btn${isActive ? ' active' : ''}`}>Profil</NavLink>
        <NavLink to="/chat" className={({ isActive }) => `nav-btn${isActive ? ' active' : ''}`}>💬</NavLink>
        {!userData?.isAdmin && (
          <NavLink to="/kolo" className={({ isActive }) => `nav-btn${isActive ? ' active' : ''}`}>
            🎡{hasSpinnable ? <span style={{ color: 'var(--gold)', marginLeft: 2, fontSize: '0.6rem' }}>●</span> : ''}
          </NavLink>
        )}
        {userData?.isAdmin && (
          <NavLink to="/admin" className={({ isActive }) => `nav-btn${isActive ? ' active' : ''}`}>Admin</NavLink>
        )}
        <button className="nav-logout" onClick={handleLogout}>Odejít</button>
      </div>
    </nav>
  )
}
