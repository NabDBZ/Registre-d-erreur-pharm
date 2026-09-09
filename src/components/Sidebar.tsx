import { NavLink } from 'react-router-dom'
import { LayoutDashboard, FilePlus2, ClipboardList, BarChart3, Users, Settings, ShieldPlus, ScrollText, UserCog, LogOut } from 'lucide-react'
import type { SessionUtilisateur } from '../types'

const items = [
  { to: '/', label: 'Tableau de bord', icon: LayoutDashboard, end: true },
  { to: '/declarer', label: 'Nouveau signalement', icon: FilePlus2 },
  { to: '/registre', label: 'Registre', icon: ClipboardList },
  { to: '/statistiques', label: 'Statistiques', icon: BarChart3 },
  { to: '/personnel', label: 'Personnel', icon: Users },
  { to: '/journal', label: "Journal d'audit", icon: ScrollText }
]

export default function Sidebar({ pharmacyName, session, onLogout }: { pharmacyName: string; session: SessionUtilisateur; onLogout: () => void }) {
  return (
    <aside className="w-[240px] shrink-0 bg-console flex flex-col h-full no-print relative">
      <div className="absolute top-0 right-0 bottom-0 w-[3px] hazard-stripe" style={{ ['--stripe-a' as any]: '#0b1613', ['--stripe-b' as any]: '#0f9d53' }} />
      <div className="h-16 flex items-center gap-2.5 px-5 border-b border-console-line">
        <div className="w-8 h-8 rounded-md bg-brand-500 flex items-center justify-center text-white shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]">
          <ShieldPlus size={18} />
        </div>
        <div className="min-w-0">
          <div className="text-[13px] font-bold text-white leading-tight truncate">{pharmacyName || 'Registre Pharmacie'}</div>
          <p className="kicker text-console-dim leading-tight truncate">Sécurité du circuit</p>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-md text-[14px] font-medium transition-colors border-l-[3px] ${
                isActive
                  ? 'bg-console-raised text-white border-brand-400'
                  : 'text-console-text border-transparent hover:bg-console-raised/60 hover:text-white'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
        {session.role === 'Administrateur' && (
          <NavLink
            to="/utilisateurs"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-md text-[14px] font-medium transition-colors border-l-[3px] ${
                isActive
                  ? 'bg-console-raised text-white border-brand-400'
                  : 'text-console-text border-transparent hover:bg-console-raised/60 hover:text-white'
              }`
            }
          >
            <UserCog size={18} />
            Utilisateurs
          </NavLink>
        )}
        <NavLink
          to="/parametres"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-md text-[14px] font-medium transition-colors border-l-[3px] ${
              isActive ? 'bg-console-raised text-white border-brand-400' : 'text-console-text border-transparent hover:bg-console-raised/60 hover:text-white'
            }`
          }
        >
          <Settings size={18} />
          Paramètres
        </NavLink>
      </nav>
      <div className="px-4 py-3 border-t border-console-line">
        <div className="flex items-center gap-2.5 px-1 py-1.5">
          <div className="w-8 h-8 rounded-full bg-console-raised flex items-center justify-center text-[12px] font-bold text-brand-400 shrink-0">
            {session.nom
              .split(' ')
              .map((p) => p[0])
              .slice(0, 2)
              .join('')
              .toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-white truncate">{session.nom}</p>
            <p className="kicker text-console-dim truncate">{session.role}</p>
          </div>
          <button onClick={onLogout} title="Se déconnecter" className="text-console-dim hover:text-white shrink-0 p-1">
            <LogOut size={16} />
          </button>
        </div>
        <div className="flex items-center gap-2 mt-2 px-1">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-400 shrink-0 pulse-dot" />
          <p className="kicker text-console-dim leading-tight">Hors ligne · Données locales</p>
        </div>
        <div className="flex items-center gap-1.5 mt-2 px-1">
          <kbd className="font-mono text-[10px] text-console-dim bg-console-raised border border-console-line rounded px-1.5 py-0.5">Ctrl</kbd>
          <kbd className="font-mono text-[10px] text-console-dim bg-console-raised border border-console-line rounded px-1.5 py-0.5">K</kbd>
          <p className="kicker text-console-dim leading-tight">Recherche rapide</p>
        </div>
      </div>
    </aside>
  )
}
