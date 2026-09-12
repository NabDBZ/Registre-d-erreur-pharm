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

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 px-3 py-2.5 rounded-xl2 text-[14px] font-medium transition-colors ${
    isActive ? 'bg-sarcelle text-white' : 'text-ardoise-300 hover:bg-encre-600/60 hover:text-white'
  }`

export default function Sidebar({ pharmacyName, session, onLogout }: { pharmacyName: string; session: SessionUtilisateur; onLogout: () => void }) {
  return (
    <aside className="w-[240px] shrink-0 bg-encre flex flex-col h-full no-print">
      <div className="h-16 flex items-center gap-2.5 px-5 border-b border-encre-700/60">
        <div className="w-8 h-8 rounded-xl2 bg-sarcelle flex items-center justify-center text-white shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
          <ShieldPlus size={18} />
        </div>
        <div className="min-w-0">
          <div className="text-[13px] font-bold text-white leading-tight truncate">{pharmacyName || 'Registre Pharmacie'}</div>
          <p className="kicker text-ardoise-300 leading-tight truncate">Sécurité du circuit</p>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={navLinkClass}>
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
        {session.role === 'Administrateur' && (
          <NavLink to="/utilisateurs" className={navLinkClass}>
            <UserCog size={18} />
            Utilisateurs
          </NavLink>
        )}
        <NavLink to="/parametres" className={navLinkClass}>
          <Settings size={18} />
          Paramètres
        </NavLink>
      </nav>
      <div className="px-4 py-3 border-t border-encre-700/60">
        <div className="flex items-center gap-2.5 px-1 py-1.5">
          <div className="w-8 h-8 rounded-full bg-encre-600 flex items-center justify-center text-[12px] font-bold text-sarcelle-100 shrink-0">
            {session.nom
              .split(' ')
              .map((p) => p[0])
              .slice(0, 2)
              .join('')
              .toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-white truncate">{session.nom}</p>
            <p className="kicker text-ardoise-300 truncate">{session.role}</p>
          </div>
          <button onClick={onLogout} title="Se déconnecter" className="text-ardoise-300 hover:text-white shrink-0 p-1">
            <LogOut size={16} />
          </button>
        </div>
        <div className="flex items-center gap-2 mt-2 px-1">
          <span className="w-1.5 h-1.5 rounded-full bg-sarcelle shrink-0 pulse-dot" />
          <p className="kicker text-ardoise-300 leading-tight">Hors ligne · Données locales</p>
        </div>
        <div className="flex items-center gap-1.5 mt-2 px-1">
          <kbd className="font-mono text-[10px] text-ardoise-300 bg-encre-600 border border-encre-700 rounded px-1.5 py-0.5">Ctrl</kbd>
          <kbd className="font-mono text-[10px] text-ardoise-300 bg-encre-600 border border-encre-700 rounded px-1.5 py-0.5">K</kbd>
          <p className="kicker text-ardoise-300 leading-tight">Recherche rapide</p>
        </div>
      </div>
    </aside>
  )
}
