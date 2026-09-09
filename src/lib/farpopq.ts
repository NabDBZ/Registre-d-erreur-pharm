import { graviteInfo } from '../constants'
import { formatDateLongue } from './dates'
import type { EvenementAvecPersonnes } from '../types'

function parseJsonArray(s: string | null | undefined): string[] {
  try {
    return s ? (JSON.parse(s) as string[]) : []
  } catch {
    return []
  }
}

/** Plain-text summary of a signalement, formatted to paste directly into the FARPOPQ member-portal declaration form. */
export function genererResumeFarpopq(evenement: EvenementAvecPersonnes, pharmacyName: string): string {
  const gi = graviteInfo(evenement.gravite)
  const causes = parseJsonArray(evenement.cause_probable)
  const lignes: string[] = []

  lignes.push(`DÉCLARATION — ${pharmacyName || 'Registre des incidents pharmacie'}`)
  lignes.push(`Signalement interne #${evenement.numero}`)
  lignes.push('')
  lignes.push(`Date de l'événement : ${formatDateLongue(evenement.date_evenement)}${evenement.heure_evenement ? ' à ' + evenement.heure_evenement : ''}`)
  lignes.push(`Milieu : ${evenement.milieu}${evenement.succursale ? ' — ' + evenement.succursale : ''}`)
  lignes.push(`Étape du circuit du médicament : ${evenement.etape_circuit}`)
  lignes.push(`Type d'erreur / circonstance : ${evenement.type_erreur}`)
  lignes.push(`Gravité : ${gi.code} — ${gi.label.replace(/^[A-Z0-9]+ — /, '')} (${gi.categorie})`)
  lignes.push('')

  if (evenement.medicament_nom) {
    lignes.push('Médicament concerné :')
    lignes.push(
      `  ${evenement.medicament_nom}${evenement.medicament_din ? ' — DIN ' + evenement.medicament_din : ''}${evenement.concentration_forme ? ' — ' + evenement.concentration_forme : ''}`
    )
    if (evenement.classe_therapeutique) lignes.push(`  Classe thérapeutique : ${evenement.classe_therapeutique}`)
    lignes.push('')
  }

  lignes.push('Description de la situation :')
  lignes.push(evenement.description)
  lignes.push('')

  if (causes.length) {
    lignes.push(`Causes probables : ${causes.join(', ')}`)
    lignes.push('')
  }

  if (evenement.mesures_correctives) {
    lignes.push('Mesures correctives / plan d\'action :')
    lignes.push(evenement.mesures_correctives)
    lignes.push('')
  }

  if (evenement.personnes.length > 0) {
    lignes.push('Personnes impliquées :')
    for (const p of evenement.personnes) {
      lignes.push(`  - ${p.nom_affiche} (${p.role_evenement})`)
    }
    lignes.push('')
  }

  lignes.push(`Divulgation au patient : ${evenement.divulgue_patient ? `Oui, le ${evenement.divulgue_le ?? '—'}, par ${evenement.divulgue_par ?? '—'}` : 'Non'}`)
  lignes.push(`Statut actuel du dossier : ${evenement.statut}`)
  lignes.push(`Signalement déclaré le ${formatDateLongue(evenement.date_declaration.slice(0, 10))} par ${evenement.cree_par ?? '—'}.`)

  return lignes.join('\n')
}
