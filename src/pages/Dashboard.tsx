import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, FilePlus2, TrendingUp, Inbox, CheckCircle2, Clock } from 'lucide-react'
import { listEvenements, listDossiersStagnants } from '../db/database'
import { Card, PageHeader, Button, GraviteBadge, StatutBadge, EmptyState, BlisterStat } from '../components/ui'
import { serieParMois, compterParGravite, detecterRecurrences } from '../lib/stats'
import { graviteInfo } from '../constants'
import { formatDateCourte, parseDateLocale } from '../lib/dates'
import { ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Cell } from 'recharts'

function moisLabel(cle: string): string {
  const [y, m] = cle.split('-')
  const d = new Date(Number(y), Number(m) - 1, 1)
  return d.toLocaleDateString('fr-CA', { month: 'short', year: '2-digit' })
}

export default function Dashboard() {
  const evenements = useMemo(() => listEvenements(), [])

  const now = new Date()
  const debutMois = new Date(now.getFullYear(), now.getMonth(), 1)
  const ceMois = evenements.filter((e) => parseDateLocale(e.date_evenement) >= debutMois)
  const ouverts = evenements.filter((e) => e.statut !== 'Fermé')
  const derniers90 = evenements.filter((e) => parseDateLocale(e.date_evenement).getTime() >= now.getTime() - 90 * 86400000)
  const recurrences = detecterRecurrences(derniers90, 3).slice(0, 5)
  const stagnants = useMemo(() => listDossiersStagnants(14), [evenements.length])

  const serieMois = useMemo(() => serieParMois(evenements).slice(-12).map((p) => ({ ...p, label: moisLabel(p.cle) })), [evenements])
  const parGravite = useMemo(() => compterParGravite(evenements).map((c) => ({ ...c, couleur: graviteInfo(c.cle).couleur })), [evenements])

  const recents = evenements.slice(0, 6)

  return (
    <div>
      <PageHeader
        kicker="Vue d'ensemble"
        title="Tableau de bord"
        subtitle="Sécurité du circuit du médicament — suivi en temps réel"
        actions={
          <Link to="/declarer">
            <Button>
              <FilePlus2 size={16} /> Nouveau signalement
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-4 gap-4 mb-6 stagger">
        <BlisterStat icon={<Inbox size={20} />} label="Total déclarés" value={evenements.length} tone="brand" />
        <BlisterStat icon={<TrendingUp size={20} />} label="Ce mois-ci" value={ceMois.length} tone="brand" />
        <BlisterStat icon={<AlertTriangle size={20} />} label="Dossiers ouverts" value={ouverts.length} tone={ouverts.length > 0 ? 'warn' : 'neutral'} />
        <BlisterStat icon={<CheckCircle2 size={20} />} label="Fermés" value={evenements.length - ouverts.length} tone="neutral" />
      </div>

      {recurrences.length > 0 && (
        <div className="relative rounded-xl2 mb-6 border border-ligne border-l-4 border-l-ambre bg-ambre-100 overflow-hidden">
          <div className="p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-[#7a5714] shrink-0 mt-0.5" size={20} />
              <div>
                <h3 className="kicker text-[#7a5714] mb-1.5">Récurrences détectées · 90 derniers jours</h3>
                <p className="text-[13px] text-ardoise-700 mb-3">Ces éléments reviennent fréquemment — une analyse des causes pourrait être utile.</p>
                <div className="flex flex-wrap gap-2">
                  {recurrences.map((r) => (
                    <span key={r.type + r.cle} className="text-[12px] bg-white border-2 border-ambre/50 rounded px-3 py-1 text-[#7a5714] font-semibold">
                      {r.cle} <span className="num">× {r.total}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {stagnants.length > 0 && (
        <Card className="p-5 mb-6" accent="#3c4c50">
          <div className="flex items-start gap-3">
            <Clock className="text-ardoise-500 shrink-0 mt-0.5" size={20} />
            <div className="flex-1 min-w-0">
              <h3 className="kicker text-ardoise-500 mb-1.5">Dossiers en attente de suivi · sans mise à jour depuis 14 jours et plus</h3>
              <p className="text-[13px] text-ardoise-700 mb-3">Ces dossiers restent ouverts sans activité récente — un suivi rapide évite qu'ils ne s'égarent.</p>
              <div className="space-y-1.5">
                {stagnants.slice(0, 4).map((d) => (
                  <Link key={d.id} to={`/evenement/${d.id}`} className="flex items-center gap-3 bg-ligne/60 hover:bg-ligne rounded-xl2 px-3 py-2 text-[12.5px] transition-colors">
                    <span className="num font-bold text-ardoise-700">#{d.numero}</span>
                    <span className="text-encre flex-1 truncate">{d.type_erreur}</span>
                    <StatutBadge statut={d.statut} />
                    <span className="text-ardoise-500 whitespace-nowrap">{d.joursSansActivite} j sans activité</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="p-5 col-span-2" accent="#0e7c74">
          <h3 className="kicker text-ardoise-500 mb-4">Tendance mensuelle · 12 derniers mois</h3>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={serieMois}>
              <defs>
                <linearGradient id="totalGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0e7c74" stopOpacity={0.22} />
                  <stop offset="95%" stopColor="#0e7c74" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#dce3e1" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#66787a', fontFamily: 'IBM Plex Mono, Consolas, monospace' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#66787a', fontFamily: 'IBM Plex Mono, Consolas, monospace' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 6, border: '2px solid #12262b', fontSize: 13 }} cursor={{ stroke: '#12262b', strokeWidth: 1, strokeDasharray: '3 3' }} />
              <Area type="monotone" dataKey="total" stroke="none" fill="url(#totalGradient)" isAnimationActive={false} />
              <Line type="monotone" dataKey="incidents" stroke="#0e7c74" strokeWidth={2.5} dot={false} name="Incidents" animationDuration={900} />
              <Line type="monotone" dataKey="accidents" stroke="#b23b3b" strokeWidth={2.5} dot={false} name="Accidents" animationDuration={900} />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5" accent="#b23b3b">
          <h3 className="kicker text-ardoise-500 mb-4">Par gravité</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={parGravite} layout="vertical" margin={{ left: 0 }}>
              <XAxis type="number" hide allowDecimals={false} />
              <YAxis dataKey="cle" type="category" width={28} tick={{ fontSize: 11, fill: '#3c4c50', fontFamily: 'IBM Plex Mono, Consolas, monospace', fontWeight: 700 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 6, border: '2px solid #12262b', fontSize: 13 }} />
              <Bar dataKey="total" radius={[0, 3, 3, 0]}>
                {parGravite.map((entry, i) => (
                  <Cell key={i} fill={entry.couleur} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="kicker text-ardoise-500">Signalements récents</h3>
          <Link to="/registre" className="text-[13px] text-sarcelle-600 font-bold hover:underline">
            Voir le registre complet →
          </Link>
        </div>
        {recents.length === 0 ? (
          <EmptyState
            icon={<Inbox size={30} />}
            title="Aucun signalement"
            description="Le registre est vide pour l'instant — commencez par déclarer un premier événement."
            action={
              <Link to="/declarer">
                <Button size="sm">
                  <FilePlus2 size={15} /> Nouveau signalement
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="divide-y divide-ligne stagger">
            {recents.map((e) => (
              <Link
                to={`/evenement/${e.id}`}
                key={e.id}
                className="flex items-center gap-4 py-3 hover:bg-ligne/60 -mx-2 px-2 rounded-xl2 transition-all hover:translate-x-[2px]"
              >
                <GraviteBadge code={e.gravite} />
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] text-encre font-semibold truncate">{e.type_erreur}</p>
                  <p className="text-[12px] text-ardoise-500 truncate">
                    <span className="num">{formatDateCourte(e.date_evenement)}</span> · {e.etape_circuit} {e.medicament_nom ? `· ${e.medicament_nom}` : ''}
                  </p>
                </div>
                <StatutBadge statut={e.statut} />
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
