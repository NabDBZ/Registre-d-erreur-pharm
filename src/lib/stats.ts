import type { EvenementAvecPersonnes } from '../types'
import { seasonForMonth, trimestreForMonth, graviteInfo } from '../constants'
import { parseDateLocale } from './dates'

export interface CompteEtiquette {
  cle: string
  total: number
}

export function compterPar(evenements: EvenementAvecPersonnes[], champ: (e: EvenementAvecPersonnes) => string | null | undefined): CompteEtiquette[] {
  const map = new Map<string, number>()
  for (const e of evenements) {
    const v = champ(e) || 'Non précisé'
    map.set(v, (map.get(v) ?? 0) + 1)
  }
  return [...map.entries()].map(([cle, total]) => ({ cle, total })).sort((a, b) => b.total - a.total)
}

export function compterParMedicament(evenements: EvenementAvecPersonnes[]): CompteEtiquette[] {
  return compterPar(evenements, (e) => e.medicament_nom)
}

export function compterParTypeErreur(evenements: EvenementAvecPersonnes[]): CompteEtiquette[] {
  return compterPar(evenements, (e) => e.type_erreur)
}

export function compterParEtape(evenements: EvenementAvecPersonnes[]): CompteEtiquette[] {
  return compterPar(evenements, (e) => e.etape_circuit)
}

export function compterParGravite(evenements: EvenementAvecPersonnes[]): CompteEtiquette[] {
  const map = new Map<string, number>()
  for (const e of evenements) map.set(e.gravite, (map.get(e.gravite) ?? 0) + 1)
  return [...map.entries()]
    .map(([cle, total]) => ({ cle, total }))
    .sort((a, b) => graviteInfo(a.cle).poids - graviteInfo(b.cle).poids)
}

export function compterParPersonne(evenements: EvenementAvecPersonnes[]): CompteEtiquette[] {
  const map = new Map<string, number>()
  for (const e of evenements) {
    for (const p of e.personnes) {
      const nom = p.nom_affiche ?? 'Inconnu'
      map.set(nom, (map.get(nom) ?? 0) + 1)
    }
  }
  return [...map.entries()].map(([cle, total]) => ({ cle, total })).sort((a, b) => b.total - a.total)
}

export interface PointTemporel {
  cle: string
  total: number
  incidents: number
  accidents: number
}

export function serieParMois(evenements: EvenementAvecPersonnes[]): PointTemporel[] {
  const map = new Map<string, { total: number; incidents: number; accidents: number }>()
  for (const e of evenements) {
    const d = parseDateLocale(e.date_evenement)
    const cle = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const cur = map.get(cle) ?? { total: 0, incidents: 0, accidents: 0 }
    cur.total += 1
    if (graviteInfo(e.gravite).categorie === 'Incident') cur.incidents += 1
    else cur.accidents += 1
    map.set(cle, cur)
  }
  return [...map.entries()]
    .map(([cle, v]) => ({ cle, ...v }))
    .sort((a, b) => a.cle.localeCompare(b.cle))
}

export function serieParSaison(evenements: EvenementAvecPersonnes[]): CompteEtiquette[] {
  const map = new Map<string, number>()
  for (const e of evenements) {
    const d = parseDateLocale(e.date_evenement)
    const s = seasonForMonth(d.getMonth())
    map.set(s, (map.get(s) ?? 0) + 1)
  }
  const order = ['Hiver', 'Printemps', 'Été', 'Automne']
  return order.filter((s) => map.has(s)).map((s) => ({ cle: s, total: map.get(s)! }))
}

export function serieParTrimestre(evenements: EvenementAvecPersonnes[]): CompteEtiquette[] {
  const map = new Map<string, number>()
  for (const e of evenements) {
    const d = parseDateLocale(e.date_evenement)
    const cle = `${d.getFullYear()} ${trimestreForMonth(d.getMonth())}`
    map.set(cle, (map.get(cle) ?? 0) + 1)
  }
  return [...map.entries()].map(([cle, total]) => ({ cle, total })).sort((a, b) => a.cle.localeCompare(b.cle))
}

/** Délai moyen (en jours) entre la création et la fermeture, pour les dossiers fermés du sous-ensemble fourni. Retourne null si aucun dossier fermé. */
export function delaiMoyenResolution(evenements: EvenementAvecPersonnes[]): number | null {
  const fermes = evenements.filter((e) => e.ferme_le)
  if (fermes.length === 0) return null
  const totalJours = fermes.reduce((acc, e) => acc + (new Date(e.ferme_le!).getTime() - new Date(e.cree_le).getTime()) / 86400000, 0)
  return Math.round((totalJours / fermes.length) * 10) / 10
}

export interface Recurrence {
  type: 'medicament' | 'personne' | 'type_erreur'
  cle: string
  total: number
}

export function detecterRecurrences(evenements: EvenementAvecPersonnes[], seuil = 3): Recurrence[] {
  const out: Recurrence[] = []
  for (const c of compterParMedicament(evenements)) {
    if (c.total >= seuil && c.cle !== 'Non précisé') out.push({ type: 'medicament', cle: c.cle, total: c.total })
  }
  for (const c of compterParPersonne(evenements)) {
    if (c.total >= seuil && c.cle !== 'Inconnu') out.push({ type: 'personne', cle: c.cle, total: c.total })
  }
  for (const c of compterParTypeErreur(evenements)) {
    if (c.total >= seuil) out.push({ type: 'type_erreur', cle: c.cle, total: c.total })
  }
  return out.sort((a, b) => b.total - a.total)
}
