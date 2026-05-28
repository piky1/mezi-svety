import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase/config'
import { subscribeToUser, subscribeToSettings } from '../firebase/db'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [levelsHidden, setLevelsHiddenState] = useState(false)

  // Globální nastavení (skrytí levelů) — sleduj nezávisle na přihlášení
  useEffect(() => {
    return subscribeToSettings((s) => setLevelsHiddenState(!!s.levelsHidden))
  }, [])

  useEffect(() => {
    let unsub = null
    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser)
      if (firebaseUser) {
        unsub = subscribeToUser(firebaseUser.uid, (data) => {
          setUserData(data)
          setLoading(false)
        })
      } else {
        setUserData(null)
        setLoading(false)
      }
    })
    return () => { unsubAuth(); if (unsub) unsub() }
  }, [])

  return (
    <AuthContext.Provider value={{ user, userData, loading, levelsHidden }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
