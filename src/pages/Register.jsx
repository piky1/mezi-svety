import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { registerUser } from '../firebase/db'
import { useToast } from '../components/Toast'

export default function Register() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const navigate = useNavigate()
  const toast = useToast()

  const handle = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('Heslo musí mít alespoň 6 znaků.'); return }
    if (password !== password2) { setError('Hesla se neshodují.'); return }
    if (username.trim().length < 2) { setError('Jméno musí mít alespoň 2 znaky.'); return }
    setLoading(true)
    try {
      await registerUser(username.trim(), password)
      setDone(true)
    } catch (err) {
      if (err.message === 'username-taken') setError('Toto jméno je již obsazeno.')
      else setError('Registrace selhala. Zkus to znovu.')
    } finally {
      setLoading(false)
    }
  }

  if (done) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: 380, textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏳</div>
        <h2 className="heading" style={{ color: 'var(--gold)', fontSize: '1.4rem', marginBottom: '0.75rem' }}>Registrace odeslána!</h2>
        <div className="card">
          <p className="text-dim">Tvůj účet čeká na schválení adminem.</p>
          <p className="text-muted text-sm mt-2">Jakmile tě admin schválí, budeš se moci přihlásit.</p>
          <button className="btn btn-ghost w-full mt-3" onClick={() => navigate('/login')}>Zpět na přihlášení</button>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🌟</div>
          <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: '1.6rem', color: 'var(--gold)', textShadow: '0 0 30px rgba(201,168,76,0.4)' }}>
            Nová Postava
          </h1>
          <p className="text-dim text-sm mt-1">Zaregistruj svého hrdinu</p>
        </div>
        <div className="card card-gold">
          <form onSubmit={handle}>
            <div className="form-group">
              <label className="form-label">Jméno hrdiny nebo oddílu</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                placeholder="Jméno hrdiny nebo oddílu..." required autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Heslo (min. 6 znaků)</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required />
            </div>
            <div className="form-group">
              <label className="form-label">Heslo znovu</label>
              <input type="password" value={password2} onChange={e => setPassword2(e.target.value)}
                placeholder="••••••••" required />
            </div>
            {error && <p className="form-error">{error}</p>}
            <button type="submit" className="btn btn-gold w-full mt-2" disabled={loading}>
              {loading ? 'Registruji...' : 'Zaregistrovat se'}
            </button>
          </form>
          <hr className="divider" />
          <p className="text-center text-sm text-dim">Máš účet? <Link to="/login">Přihlásit se</Link></p>
        </div>
      </div>
    </div>
  )
}
