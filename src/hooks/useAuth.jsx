import { createContext, useContext, useState, useEffect } from 'react'
import { getUser, isAuthenticated, login as authLogin, register as authRegister, oauthCallback as authOAuth, logout as authLogout } from '../utils/auth'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isAuth, setIsAuth] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isAuthenticated()) {
      setUser(getUser())
      setIsAuth(true)
    }
    setLoading(false)
  }, [])

  const login = async (email, password) => {
    const result = await authLogin(email, password)
    setUser(result.user)
    setIsAuth(true)
    return result
  }

  const register = async (email, password, name) => {
    const result = await authRegister(email, password, name)
    setUser(result.user)
    setIsAuth(true)
    return result
  }

  const oauthLogin = async (email, name) => {
    const result = await authOAuth(email, name)
    setUser(result.user)
    setIsAuth(true)
    return result
  }

  const logout = () => {
    authLogout()
    setUser(null)
    setIsAuth(false)
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: isAuth, login, register, oauthLogin, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}