import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase/config'
import { subscribeToUser, setOnline } from '../firebase/db'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let unsub = null
    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser)
      if (firebaseUser) {
        setOnline(firebaseUser.uid, true)
        unsub = subscribeToUser(firebaseUser.uid, (data) => {
          setUserData(data)
          setLoading(false)
        })
        // Nastav offline při zavření okna
        const handleUnload = () => setOnline(firebaseUser.uid, false)
        window.addEventListener('beforeunload', handleUnload)
        return () => window.removeEventListener('beforeunload', handleUnload)
      } else {
        setUserData(null)
        setLoading(false)
      }
    })
    return () => { unsubAuth(); if (unsub) unsub() }
  }, [])

  return (
    <AuthContext.Provider value={{ user, userData, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
