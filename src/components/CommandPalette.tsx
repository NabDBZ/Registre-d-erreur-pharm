import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, FilePlus2, LayoutDashboard, ClipboardList, BarChart3, Users, ScrollText, UserCog, Settings, CornerDownLeft } from 'lucide-react'
import { listEvenements } from '../db/database'
import { GraviteBadge } from './ui'
import { formatDateCourte } from '../lib/dates'
import type { SessionUtilisateur } from '../types'

interface PaletteAction {
  key: string
  label: string
  kicker: string
  icon: React.ReactNode
  onRun: () => void
}

export default function CommandPalette({ session }: { session: SessionUtilisateur }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const isCombo = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k'
      if (isCombo) {
        e.preventDefault()
        setOpen((v) => !v)
      } else if (e.key === 'Escape' && open) {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
      setTimeout(() => inputRef.current?.focus(), 10)
    }
  }, [open])

  const actions: PaletteAction[] = useMemo(() => {
    const base: PaletteAction[] = [
      { key: 'declarer', label: 'Nouveau signalement', kicker: 'Action rapide', icon: <FilePlus2 size={15} />, onRun: () => navigate('/declarer') },
      { key: 'dashboard', label: 'Tableau de bord', kicker: 'Page', icon: <LayoutDashboard size={15} />, onRun: () => navigate('/') },
      { key: 'registre', label: 'Registre', kicker: 'Page', icon: <ClipboardList size={15} />, onRun: () => navigate('/registre') },
      { key: 'stats', label: 'Statistiques', kicker: 'Page', icon: <BarChart3 size={15} />, onRun: () => navigate('/statistiques') },
      { key: 'personnel', label: 'Personnel', kicker: 'Page', icon: <Users size={15} />, onRun: () => navigate('/personnel') },
      { key: 'journal', label: "Journal d'audit", kicker: 'Page', icon: <ScrollText size={15} />, onRun: () => navigate('/journal') },
      { key: 'parametres', label: 'Paramètres', kicker: 'Page', icon: <Settings size={15} />, onRun: () => navigate('/parametres') }
    ]
    if (session.role === 'Administrateur') {
      base.push({ key: 'utilisateurs', label: 'Utilisateurs', kicker: 'Page', icon: <UserCog size={15} />, onRun: () => navigate('/utilisateurs') })
    }
    return base
  }, [session.role, navigate])

  const q = query.trim().toLowerCase()
  const matchedActions = q ? actions.filter((a) => a.label.toLowerCase().includes(q)) : actions

  const matchedEvenements = useMemo(() => {
    if (!q || q.length < 2) return []
    return listEvenements({ recherche: query.trim() }).slice(0, 5)
  }, [q, query])

  const results: { type: 'action' | 'evenement'; action?: PaletteAction; evt?: (typeof matchedEvenements)[number] }[] = [
    ...matchedActions.map((a) => ({ type: 'action' as const, action: a })),
    ...matchedEvenements.map((e) => ({ type: 'evenement' as const, evt: e }))
  ]

  function run(index: number) {
    const r = results[index]
    if (!r) return
    if (r.type === 'action') r.action!.onRun()
    else navigate(`/evenement/${r.evt!.id}`)
    setOpen(false)
  }

  function onKeyDownInput(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(a + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      run(active)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center pt-[14vh] px-4 bg-encre/60 backdrop-blur-[2px]"
      style={{ animation: 'fade-in 0.12s ease-out both' }}
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl bg-surface rounded-xl2 shadow-pop overflow-hidden border border-ligne"
        style={{ animation: 'modal-in 0.16s cubic-bezier(0.16, 1, 0.3, 1) both' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-ligne">
          <Search size={17} className="text-ardoise-300 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActive(0)
            }}
            onKeyDown={onKeyDownInput}
            placeholder="Aller à une page, un signalement (n° ou mot-clé)…"
            className="flex-1 bg-transparent outline-none text-[14px] text-ardoise-900 placeholder:text-ardoise-300"
          />
          <kbd className="font-mono text-[10px] text-ardoise-500 bg-ligne border border-ligne rounded px-1.5 py-0.5">Échap</kbd>
        </div>
        <div className="max-h-[360px] overflow-y-auto py-2">
          {results.length === 0 && (
            <p className="text-[13px] text-ardoise-500 text-center py-8">Aucun résultat pour « {query} ».</p>
          )}
          {matchedActions.length > 0 && (
            <div className="px-2">
              {matchedActions.map((a, i) => (
                <PaletteRow key={a.key} active={i === active} icon={a.icon} kicker={a.kicker} label={a.label} onClick={() => run(i)} onHover={() => setActive(i)} />
              ))}
            </div>
          )}
          {matchedEvenements.length > 0 && (
            <div className="px-2 mt-1 pt-1 border-t border-ligne">
              <p className="kicker text-ardoise-500 px-2.5 py-1.5">Signalements</p>
              {matchedEvenements.map((e, i) => {
                const idx = matchedActions.length + i
                return (
                  <button
                    key={e.id}
                    onClick={() => run(idx)}
                    onMouseEnter={() => setActive(idx)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-left transition-colors ${idx === active ? 'bg-ligne' : 'hover:bg-ligne/60'}`}
                  >
                    <GraviteBadge code={e.gravite} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-encre truncate">
                        #{e.numero} · {e.type_erreur}
                      </p>
                      <p className="text-[11px] text-ardoise-500 truncate">
                        {formatDateCourte(e.date_evenement)} {e.medicament_nom ? `· ${e.medicament_nom}` : ''}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
        <div className="flex items-center gap-4 px-4 py-2.5 border-t border-ligne bg-ligne/40 text-[11px] text-ardoise-500">
          <span className="flex items-center gap-1">
            <CornerDownLeft size={12} /> Ouvrir
          </span>
          <span>↑↓ Naviguer</span>
        </div>
      </div>
    </div>
  )
}

function PaletteRow({ active, icon, kicker, label, onClick, onHover }: { active: boolean; icon: React.ReactNode; kicker: string; label: string; onClick: () => void; onHover: () => void }) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={onHover}
      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-left transition-colors ${active ? 'bg-ligne' : 'hover:bg-ligne/60'}`}
    >
      <span className="text-ardoise-700 shrink-0">{icon}</span>
      <span className="text-[13px] text-ardoise-900 font-medium flex-1">{label}</span>
      <span className="kicker text-ardoise-300">{kicker}</span>
    </button>
  )
}
