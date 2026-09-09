import { getParametre } from '../db/database'
import { graviteInfo } from '../constants'
import { formatDateLongue, formatDateHeureLongue } from '../lib/dates'
import type { EvenementAvecPersonnes } from '../types'

/** Print-only acknowledgment sheet: lists everyone involved in one signalement, for a wet-ink signature where no electronic one exists yet. */
export default function FeuilleSignatures({ evenement }: { evenement: EvenementAvecPersonnes }) {
  const pharmacyName = getParametre('nom_pharmacie', '')
  const gi = graviteInfo(evenement.gravite)

  return (
    <div className="max-w-[820px] mx-auto py-4">
      <div className="flex items-start justify-between border-b-2 border-ink pb-4 mb-6">
        <div>
          <p className="kicker text-steel mb-1">{pharmacyName || 'Registre des incidents pharmacie'}</p>
          <h1 className="text-[22px] font-bold text-ink">Feuille de signatures — Signalement #{evenement.numero}</h1>
          <p className="text-[13px] text-graphite mt-1">
            Événement du {formatDateLongue(evenement.date_evenement)} · {evenement.type_erreur} · Gravité {gi.code}
          </p>
        </div>
      </div>

      <p className="text-[13px] text-graphite mb-6 leading-relaxed">
        En signant ci-dessous, chaque personne confirme avoir pris connaissance du signalement décrit dans le dossier #{evenement.numero}
        {evenement.medicament_nom ? ` concernant ${evenement.medicament_nom}` : ''}, déclaré le {formatDateLongue(evenement.date_declaration.slice(0, 10))}.
      </p>

      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-b-2 border-ink text-left">
            <th className="py-2 pr-3 font-bold text-ink">Nom</th>
            <th className="py-2 pr-3 font-bold text-ink">Rôle</th>
            <th className="py-2 pr-3 font-bold text-ink">Signature</th>
            <th className="py-2 font-bold text-ink w-32">Date</th>
          </tr>
        </thead>
        <tbody>
          {evenement.personnes.map((p) => (
            <tr key={p.id} className="border-b border-fog" style={{ height: 74 }}>
              <td className="py-2 pr-3 align-bottom text-ink font-medium">{p.nom_affiche}</td>
              <td className="py-2 pr-3 align-bottom text-graphite">{p.role_evenement}</td>
              <td className="py-2 pr-3 align-bottom">
                {p.signature_data ? (
                  <div>
                    <img src={p.signature_data} alt={`Signature de ${p.nom_affiche}`} style={{ height: 42 }} />
                    <p className="text-[10.5px] text-brand-700 font-semibold mt-0.5">Signé électroniquement</p>
                  </div>
                ) : (
                  <div className="border-b border-ink" style={{ height: 40 }} />
                )}
              </td>
              <td className="py-2 align-bottom text-graphite">{p.signature_data ? formatDateHeureLongue(p.signe_le) : ''}</td>
            </tr>
          ))}
          {evenement.personnes.length === 0 && (
            <tr>
              <td colSpan={4} className="py-6 text-center text-steel">
                Aucune personne impliquée n'est enregistrée sur ce dossier.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <p className="text-[11px] text-silver mt-8">
        Document généré le {formatDateHeureLongue(new Date().toISOString())} depuis le Registre des Incidents Pharmacie — Signalement #{evenement.numero}.
      </p>
    </div>
  )
}
