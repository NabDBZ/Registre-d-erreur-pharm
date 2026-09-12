import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Download, FileSpreadsheet, Search, SearchX, X, FilePlus2, Archive, SlidersHorizontal } from 'lucide-react'
import { listEvenements, listOptions, listPersonnel } from '../db/database'
import type { FiltresRegistre } from '../types'
import { Card, PageHeader, Button, Input, Select, GraviteBadge, StatutBadge, Badge, EmptyState } from '../components/ui'
import { exportCsv, exportXlsx } from '../lib/exports'
import { formatDateCourte } from '../lib/dates'
import { useAuth } from '../lib/AuthContext'

export default function Registre() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const milieux = useMemo(() => listOptions('milieu'), [])
  const etapes = useMemo(() => listOptions('etape_circuit'), [])
  const typesErreur = useMemo(() => listOptions('type_erreur'), [])
  const personnelListe = useMemo(() => listPersonnel(true), [])

  const [filtres, setFiltres] = useState<FiltresRegistre>({})
  const [voirArchives, setVoirArchives] = useState(false)
  const [exporting, setExporting] = useState<'csv' | 'xlsx' | null>(null)
  const [filtresAvancesOuverts, setFiltresAvancesOuverts] = useState(false)

  const evenements = useMemo(() => listEvenements({ ...filtres, archivesSeulement: voirArchives }), [filtres, voirArchives])

  function patch(p: Partial<FiltresRegistre>) {
    setFiltres((f) => ({ ...f, ...p }))
  }

  const filtresActifs = Object.values(filtres).some((v) => v)
  const filtresAvancesActifs = [filtres.milieu, filtres.etapeCircuit, filtres.typeErreur, filtres.gravite, filtres.personnelId, filtres.medicament].filter(Boolean).length

  async function handleExport(type: 'csv' | 'xlsx') {
    setExporting(type)
    try {
      if (type === 'csv') await exportCsv(evenements)
      else await exportXlsx(evenements)
    } finally {
      setExporting(null)
    }
  }

  return (
    <div>
      <PageHeader
        title="Registre des événements"
        subtitle={`${evenements.length} événement${evenements.length > 1 ? 's' : ''} correspondant${evenements.length > 1 ? 's' : ''}`}
        actions={
          <>
            {session.role === 'Administrateur' && (
              <Button variant={voirArchives ? 'primary' : 'secondary'} size="sm" onClick={() => setVoirArchives((v) => !v)}>
                <Archive size={15} /> {voirArchives ? 'Retour au registre actif' : 'Voir les archives'}
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={() => handleExport('csv')} disabled={exporting !== null || evenements.length === 0}>
              <Download size={15} /> {exporting === 'csv' ? 'Export…' : 'Exporter CSV'}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => handleExport('xlsx')} disabled={exporting !== null || evenements.length === 0}>
              <FileSpreadsheet size={15} /> {exporting === 'xlsx' ? 'Export…' : 'Exporter Excel'}
            </Button>
            <Link to="/declarer">
              <Button size="sm">
                <FilePlus2 size={15} /> Nouveau
              </Button>
            </Link>
          </>
        }
      />

      <Card className="p-4 mb-5">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ardoise-300" />
            <Input className="pl-9" placeholder="Rechercher (description, médicament, patient)" value={filtres.recherche ?? ''} onChange={(e) => patch({ recherche: e.target.value })} />
          </div>
          <Input type="date" className="w-[150px]" value={filtres.dateDebut ?? ''} onChange={(e) => patch({ dateDebut: e.target.value })} title="Date de début" />
          <Input type="date" className="w-[150px]" value={filtres.dateFin ?? ''} onChange={(e) => patch({ dateFin: e.target.value })} title="Date de fin" />
          <Select className="w-44" value={filtres.statut ?? ''} onChange={(e) => patch({ statut: e.target.value || undefined })}>
            <option value="">Tous les statuts</option>
            {['Ouvert', 'En analyse', 'Mesures en cours', 'Fermé'].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <Button variant={filtresAvancesOuverts || filtresAvancesActifs > 0 ? 'primary' : 'secondary'} size="sm" onClick={() => setFiltresAvancesOuverts((v) => !v)}>
            <SlidersHorizontal size={14} /> Filtres avancés{filtresAvancesActifs > 0 ? ` (${filtresAvancesActifs})` : ''}
          </Button>
          {filtresActifs && (
            <Button variant="ghost" size="sm" onClick={() => setFiltres({})}>
              <X size={14} /> Réinitialiser
            </Button>
          )}
        </div>

        {filtresAvancesOuverts && (
          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-ligne">
            <Select value={filtres.milieu ?? ''} onChange={(e) => patch({ milieu: e.target.value || undefined })}>
              <option value="">Tous les milieux</option>
              {milieux.map((m) => (
                <option key={m.valeur} value={m.valeur}>
                  {m.valeur}
                </option>
              ))}
            </Select>
            <Select value={filtres.etapeCircuit ?? ''} onChange={(e) => patch({ etapeCircuit: e.target.value || undefined })}>
              <option value="">Toutes les étapes</option>
              {etapes.map((m) => (
                <option key={m.valeur} value={m.valeur}>
                  {m.valeur}
                </option>
              ))}
            </Select>
            <Select value={filtres.typeErreur ?? ''} onChange={(e) => patch({ typeErreur: e.target.value || undefined })}>
              <option value="">Tous les types d'erreur</option>
              {typesErreur.map((m) => (
                <option key={m.valeur} value={m.valeur}>
                  {m.valeur}
                </option>
              ))}
            </Select>
            <Select value={filtres.gravite ?? ''} onChange={(e) => patch({ gravite: e.target.value || undefined })}>
              <option value="">Toutes les gravités</option>
              {['A', 'B', 'C', 'D', 'E1', 'E2', 'F', 'G', 'H', 'I'].map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </Select>
            <Select value={filtres.personnelId ?? ''} onChange={(e) => patch({ personnelId: e.target.value || undefined })}>
              <option value="">Toutes les personnes</option>
              {personnelListe.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nom}
                </option>
              ))}
            </Select>
            <Input placeholder="Médicament contient…" value={filtres.medicament ?? ''} onChange={(e) => patch({ medicament: e.target.value || undefined })} />
          </div>
        )}
      </Card>

      <Card className="overflow-hidden">
        {evenements.length === 0 ? (
          <EmptyState
            icon={<SearchX size={30} />}
            title={filtresActifs ? 'Aucun résultat pour ces filtres' : voirArchives ? 'Aucun dossier archivé' : 'Aucun événement'}
            description={filtresActifs ? 'Essayez d\'élargir la plage de dates ou de réinitialiser les filtres.' : 'Aucun signalement ne correspond à cette vue pour le moment.'}
            action={
              filtresActifs ? (
                <Button variant="secondary" size="sm" onClick={() => setFiltres({})}>
                  <X size={14} /> Réinitialiser les filtres
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-[13px] min-w-[900px]">
            <thead>
              <tr className="text-left border-b border-ligne-forte">
                <th className="px-4 py-3 kicker font-bold text-ardoise-500">N°</th>
                <th className="px-4 py-3 kicker font-bold text-ardoise-500">Date</th>
                <th className="px-4 py-3 kicker font-bold text-ardoise-500">Gravité</th>
                <th className="px-4 py-3 kicker font-bold text-ardoise-500">Type d'erreur</th>
                <th className="px-4 py-3 kicker font-bold text-ardoise-500">Étape</th>
                <th className="px-4 py-3 kicker font-bold text-ardoise-500">Médicament</th>
                <th className="px-4 py-3 kicker font-bold text-ardoise-500">Statut</th>
              </tr>
            </thead>
            <tbody>
              {evenements.map((e) => (
                <tr
                  key={e.id}
                  onClick={() => navigate(`/evenement/${e.id}`)}
                  className="border-b border-ligne last:border-0 hover:bg-ligne/60 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3 num text-ardoise-700 font-bold">#{e.numero}</td>
                  <td className="px-4 py-3 text-ardoise-700 whitespace-nowrap num">{formatDateCourte(e.date_evenement)}</td>
                  <td className="px-4 py-3">
                    <GraviteBadge code={e.gravite} size="sm" />
                  </td>
                  <td className="px-4 py-3 text-encre font-medium max-w-[220px] truncate">{e.type_erreur}</td>
                  <td className="px-4 py-3 text-ardoise-700 max-w-[200px] truncate">{e.etape_circuit}</td>
                  <td className="px-4 py-3 text-ardoise-700">{e.medicament_nom || '—'}</td>
                  <td className="px-4 py-3">{e.supprime === 1 ? <Badge tone="critical">Archivé</Badge> : <StatutBadge statut={e.statut} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </Card>
    </div>
  )
}
