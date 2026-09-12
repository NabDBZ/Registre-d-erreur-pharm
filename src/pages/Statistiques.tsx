import { useMemo, useState } from 'react'
import { Download, FileSpreadsheet, Printer, Clock } from 'lucide-react'
import { listEvenements } from '../db/database'
import { Card, PageHeader, Button, Select, Input } from '../components/ui'
import {
  compterParTypeErreur,
  compterParEtape,
  compterParMedicament,
  compterParPersonne,
  compterParGravite,
  serieParSaison,
  serieParTrimestre,
  detecterRecurrences,
  delaiMoyenResolution
} from '../lib/stats'
import { graviteInfo, SEASON_LABELS } from '../constants'
import { exportCsv, exportXlsx } from '../lib/exports'
import { parseDateLocale } from '../lib/dates'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts'

type Periode = 'tout' | 'annee' | 'trimestre' | '12mois' | 'personnalise'

function filtrerParPeriode(evenements: ReturnType<typeof listEvenements>, periode: Periode, debut: string, fin: string) {
  const now = new Date()
  if (periode === 'tout') return evenements
  if (periode === 'annee') {
    return evenements.filter((e) => parseDateLocale(e.date_evenement).getFullYear() === now.getFullYear())
  }
  if (periode === 'trimestre') {
    const q = Math.floor(now.getMonth() / 3)
    return evenements.filter((e) => {
      const d = parseDateLocale(e.date_evenement)
      return d.getFullYear() === now.getFullYear() && Math.floor(d.getMonth() / 3) === q
    })
  }
  if (periode === '12mois') {
    const seuil = now.getTime() - 365 * 86400000
    return evenements.filter((e) => parseDateLocale(e.date_evenement).getTime() >= seuil)
  }
  if (periode === 'personnalise' && debut && fin) {
    return evenements.filter((e) => e.date_evenement >= debut && e.date_evenement <= fin)
  }
  return evenements
}

function HBar({ data, dataKeyLabel = 'cle', color = '#0e7c74' }: { data: { cle: string; total: number }[]; dataKeyLabel?: string; color?: string }) {
  const top = data.slice(0, 8)
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, top.length * 34)}>
      <BarChart data={top} layout="vertical" margin={{ left: 8, right: 16 }}>
        <XAxis type="number" hide allowDecimals={false} />
        <YAxis
          dataKey={dataKeyLabel}
          type="category"
          width={190}
          tick={{ fontSize: 12, fill: '#3c4c50', fontWeight: 600 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip contentStyle={{ borderRadius: 4, border: '2px solid #12262b', fontSize: 13 }} />
        <Bar dataKey="total" radius={[0, 2, 2, 0]} fill={color} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export default function Statistiques() {
  const tous = useMemo(() => listEvenements(), [])
  const [periode, setPeriode] = useState<Periode>('12mois')
  const [debut, setDebut] = useState('')
  const [fin, setFin] = useState('')
  const [seuilRecurrence, setSeuilRecurrence] = useState(3)
  const [exporting, setExporting] = useState<'csv' | 'xlsx' | null>(null)

  const evenements = useMemo(() => filtrerParPeriode(tous, periode, debut, fin), [tous, periode, debut, fin])

  const parType = useMemo(() => compterParTypeErreur(evenements), [evenements])
  const parEtape = useMemo(() => compterParEtape(evenements), [evenements])
  const parMed = useMemo(() => compterParMedicament(evenements).filter((c) => c.cle !== 'Non précisé'), [evenements])
  const parPersonne = useMemo(() => compterParPersonne(evenements), [evenements])
  const parGravite = useMemo(() => compterParGravite(evenements), [evenements])
  const parSaison = useMemo(() => serieParSaison(evenements), [evenements])
  const parTrimestre = useMemo(() => serieParTrimestre(evenements), [evenements])
  const recurrences = useMemo(() => detecterRecurrences(evenements, seuilRecurrence), [evenements, seuilRecurrence])

  const incidents = evenements.filter((e) => graviteInfo(e.gravite).categorie === 'Incident').length
  const accidents = evenements.length - incidents
  const delaiMoyen = useMemo(() => delaiMoyenResolution(evenements), [evenements])

  async function handleExport(type: 'csv' | 'xlsx') {
    setExporting(type)
    try {
      if (type === 'csv') await exportCsv(evenements, 'statistiques-incidents')
      else await exportXlsx(evenements, 'statistiques-incidents')
    } finally {
      setExporting(null)
    }
  }

  return (
    <div>
      <PageHeader
        title="Statistiques et analyses"
        subtitle="Identifiez les tendances, récurrences et facteurs de risque pour orienter vos mesures préventives."
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => handleExport('csv')} disabled={exporting !== null}>
              <Download size={15} /> CSV
            </Button>
            <Button variant="secondary" size="sm" onClick={() => handleExport('xlsx')} disabled={exporting !== null}>
              <FileSpreadsheet size={15} /> Excel
            </Button>
            <Button variant="secondary" size="sm" onClick={() => window.print()}>
              <Printer size={15} /> Rapport PDF
            </Button>
          </>
        }
      />

      <Card className="p-4 mb-6 no-print">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[13px] font-medium text-ardoise-700">Période :</span>
          <Select className="w-52" value={periode} onChange={(e) => setPeriode(e.target.value as Periode)}>
            <option value="12mois">12 derniers mois</option>
            <option value="annee">Année en cours</option>
            <option value="trimestre">Trimestre en cours</option>
            <option value="tout">Depuis le début</option>
            <option value="personnalise">Période personnalisée</option>
          </Select>
          {periode === 'personnalise' && (
            <>
              <Input type="date" value={debut} onChange={(e) => setDebut(e.target.value)} className="w-40" />
              <span className="text-ardoise-500">→</span>
              <Input type="date" value={fin} onChange={(e) => setFin(e.target.value)} className="w-40" />
            </>
          )}
          <span className="ml-auto flex items-center gap-3 text-[13px] text-ardoise-500">
            <span>{evenements.length} événements · {incidents} incidents · {accidents} accidents</span>
            {delaiMoyen != null && (
              <span className="flex items-center gap-1.5 font-semibold text-ardoise-700 bg-ligne rounded-full px-3 py-1">
                <Clock size={13} /> Délai moyen de résolution : <span className="num">{delaiMoyen}</span> j
              </span>
            )}
          </span>
        </div>
      </Card>

      {recurrences.length > 0 && (
        <div className="rounded-xl2 mb-6 border border-ambre/35 bg-ambre-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[14.5px] font-semibold text-[#7a5714]">Récurrences · seuil ≥ {seuilRecurrence}</h3>
            <label className="flex items-center gap-2 text-[12px] text-ardoise-500 no-print">
              Seuil
              <Input type="number" min={2} max={20} value={seuilRecurrence} onChange={(e) => setSeuilRecurrence(Number(e.target.value) || 2)} className="w-16 py-1" />
            </label>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {recurrences.map((r) => (
              <div key={r.type + r.cle} className="flex items-center justify-between bg-white border border-ambre/30 rounded px-3 py-2 text-[13px]">
                <span className="text-ardoise-900 truncate">
                  {r.cle}
                  <span className="text-ardoise-500 ml-1">
                    ({r.type === 'medicament' ? 'médicament' : r.type === 'personne' ? 'personne' : "type d'erreur"})
                  </span>
                </span>
                <span className="num font-bold text-[#7a5714] shrink-0 ml-2">× {r.total}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-5 mb-5 print-stack stagger">
        <Card className="p-5">
          <h3 className="text-[15px] font-semibold text-encre mb-4">Top types d'erreur</h3>
          <HBar data={parType} color="#0e7c74" />
        </Card>
        <Card className="p-5">
          <h3 className="text-[15px] font-semibold text-encre mb-4">Étape du circuit du médicament</h3>
          <HBar data={parEtape} color="#234750" />
        </Card>
        <Card className="p-5">
          <h3 className="text-[15px] font-semibold text-encre mb-4">Médicaments les plus concernés</h3>
          {parMed.length === 0 ? <p className="text-[13px] text-ardoise-500">Aucune donnée.</p> : <HBar data={parMed} color="#c2871e" />}
        </Card>
        <Card className="p-5">
          <h3 className="text-[15px] font-semibold text-encre mb-4">Par personne impliquée</h3>
          {parPersonne.length === 0 ? <p className="text-[13px] text-ardoise-500">Aucune donnée.</p> : <HBar data={parPersonne} color="#3c4c50" />}
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-5 print-stack stagger">
        <Card className="p-5">
          <h3 className="text-[15px] font-semibold text-encre mb-4">Par gravité</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={parGravite}>
              <CartesianGrid strokeDasharray="3 3" stroke="#dce3e1" vertical={false} />
              <XAxis dataKey="cle" tick={{ fontSize: 12, fill: '#66787a' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#66787a' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 4, border: '2px solid #12262b', fontSize: 13 }} />
              <Bar dataKey="total" radius={[2, 2, 0, 0]}>
                {parGravite.map((entry, i) => (
                  <Cell key={i} fill={graviteInfo(entry.cle).couleur} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <h3 className="text-[15px] font-semibold text-encre mb-4">Par saison</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={parSaison.map((s) => ({ ...s, label: SEASON_LABELS[s.cle] ?? s.cle }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#dce3e1" vertical={false} />
              <XAxis dataKey="cle" tick={{ fontSize: 12, fill: '#66787a' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#66787a' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 4, border: '2px solid #12262b', fontSize: 13 }} />
              <Bar dataKey="total" radius={[2, 2, 0, 0]} fill="#0a6259" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <h3 className="text-[15px] font-semibold text-encre mb-4">Par trimestre</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={parTrimestre}>
              <CartesianGrid strokeDasharray="3 3" stroke="#dce3e1" vertical={false} />
              <XAxis dataKey="cle" tick={{ fontSize: 11, fill: '#66787a' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#66787a' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 4, border: '2px solid #12262b', fontSize: 13 }} />
              <Bar dataKey="total" radius={[2, 2, 0, 0]} fill="#12262b" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  )
}
