import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import ErrorBoundary from './components/ErrorBoundary'
import CommandPalette from './components/CommandPalette'
import { initDatabase, getParametre, waitForPendingSave } from './db/database'
import { AuthContext } from './lib/AuthContext'
import { ToastProvider } from './lib/toast'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Declarer from './pages/Declarer'
import Registre from './pages/Registre'
import Detail from './pages/Detail'
import Statistiques from './pages/Statistiques'
import Personnel from './pages/Personnel'
import Utilisateurs from './pages/Utilisateurs'
import Journal from './pages/Journal'
import Parametres from './pages/Parametres'
import { ShieldPlus } from 'lucide-react'
import type { SessionUtilisateur } from './types'

export default function App() {
  return (
    <ToastProvider>
      <AppInner />
    </ToastProvider>
  )
}

function AppInner() {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pharmacyName, setPharmacyName] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [session, setSession] = useState<SessionUtilisateur | null>(null)
  const location = useLocation()

  useEffect(() => {
    initDatabase()
      .then(() => {
        setPharmacyName(getParametre('nom_pharmacie', ''))
        setReady(true)
        window.api?.autoBackup()?.catch(() => {})
      })
      .catch((e) => setError(String(e?.message ?? e)))
  }, [])

  useEffect(() => {
    if (!window.api) return
    return window.api.onCloseRequested(() => {
      waitForPendingSave().finally(() => window.api!.confirmFlushed())
    })
  }, [])

  const bump = () => setRefreshKey((k) => k + 1)

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-papier text-center px-6">
        <div>
          <p className="text-alerte font-semibold mb-2">Erreur d'initialisation de la base de données</p>
          <p className="text-ardoise-500 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="h-screen flex items-center justify-center bg-papier">
        <div className="flex flex-col items-center gap-3 text-ardoise-700">
          <div className="w-10 h-10 rounded-xl2 bg-sarcelle text-white flex items-center justify-center animate-pulse">
            <ShieldPlus size={20} />
          </div>
          <p className="kicker">Chargement du registre…</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return <Login onLogin={setSession} />
  }

  const isAdmin = session.role === 'Administrateur'

  return (
    <AuthContext.Provider value={{ session, logout: () => setSession(null) }}>
      <CommandPalette session={session} />
      <div className="h-screen flex bg-papier">
        <Sidebar pharmacyName={pharmacyName} session={session} onLogout={() => setSession(null)} />
        <main className="flex-1 overflow-y-auto chart-paper">
          <div key={location.pathname} className="max-w-[1180px] mx-auto px-8 py-8 page-enter">
            <ErrorBoundary key={refreshKey}>
              <Routes>
                <Route path="/" element={<Dashboard key={refreshKey} />} />
                <Route path="/declarer" element={<Declarer onSaved={bump} />} />
                <Route path="/registre" element={<Registre key={refreshKey} />} />
                <Route path="/evenement/:id" element={<Detail onChanged={bump} />} />
                <Route path="/statistiques" element={<Statistiques key={refreshKey} />} />
                <Route path="/personnel" element={<Personnel />} />
                <Route path="/journal" element={<Journal key={refreshKey} />} />
                <Route path="/utilisateurs" element={isAdmin ? <Utilisateurs key={refreshKey} /> : <Navigate to="/" replace />} />
                <Route
                  path="/parametres"
                  element={
                    <Parametres
                      onPharmacyNameChange={(n) => {
                        setPharmacyName(n)
                        bump()
                      }}
                    />
                  }
                />
              </Routes>
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </AuthContext.Provider>
  )
}
