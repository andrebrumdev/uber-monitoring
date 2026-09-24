import { useEffect, useState } from 'react'
import Home from './pages/Home'
import { Login } from './pages/Login'

type Session =
  | { state: 'loading' }
  | { state: 'anonymous' }
  | { state: 'authenticated'; email: string }

export function App() {
  const [session, setSession] = useState<Session>({ state: 'loading' })

  useEffect(() => {
    window.api.auth
      .status()
      .then((result) => {
        if (result.ok && result.data.configured) {
          setSession({ state: 'authenticated', email: result.data.email ?? '' })
        } else {
          setSession({ state: 'anonymous' })
        }
      })
      .catch(() => setSession({ state: 'anonymous' }))
  }, [])

  if (session.state === 'loading') return null

  if (session.state === 'anonymous') {
    return <Login onLoggedIn={(email) => setSession({ state: 'authenticated', email })} />
  }

  return <Home email={session.email} onSignedOut={() => setSession({ state: 'anonymous' })} />
}
