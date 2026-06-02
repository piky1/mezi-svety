import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { loginUser } from '../firebase/db'
import { useToast } from '../components/Toast'
import Logo from '../components/Logo'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const toast = useToast()

  const handle = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await loginUser(username, password)
      toast('Vítej zpět, hrdino!', 'success')
      navigate('/')
    } catch (err) {
      setError('Nesprávné uživatelské jméno nebo heslo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Logo size={70} stack />
          <p className="text-dim text-sm mt-1">Přihlas se ke svému příběhu</p>
        </div>
        <div className="card card-gold">
          <form onSubmit={handle}>
            <div className="form-group">
              <label className="form-label">Uživatelské jméno</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Jméno hrdiny nebo oddílu..."
                required autoFocus
              />
            </div>
            <div className="form-group">
              <label className="form-label">Heslo</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            {error && <p className="form-error">{error}</p>}
            <button type="submit" className="btn btn-gold w-full mt-2" disabled={loading}>
              {loading ? 'Přihlašuji...' : 'Vstoupit do světa'}
            </button>
          </form>
          <hr className="divider" />
          <p className="text-center text-sm text-dim">
            Nemáš účet? <Link to="/registrace">Zaregistruj se</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
