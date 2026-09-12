import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { listAuditLog, listUtilisateurs } from '../db/database'
import { Card, PageHeader, Select, Input, Badge, EmptyState } from '../components/ui'
import { formatDateLongue } from '../lib/dates'

const ACTIONS_LABELS: Record<string, { label: string; tone: 'neutral' | 'brand' | 'warn' | 'critical' | 'success' }> = {
  creation: { label: 'Création', tone: 'brand' },
  modification: { label: 'Modification', tone: 'warn' },
  changement_statut: { label: 'Changement de statut', tone: 'neutral' },
  archivage: { label: 'Archivage', tone: 'critical' },
  restauration: { label: 'Restauration', tone: 'success' },
  connexion: { label: 'Connexion', tone: 'neutral' },
  connexion_echouee: { label: 'Connexion échouée', tone: 'critical' },
  desactivation_compte: { label: 'Compte désactivé', tone: 'critical' },
  reactivation_compte: { label: 'Compte réactivé', tone: 'success' },
  reinitialisation_mdp: { label: 'Mot de passe réinitialisé', tone: 'warn' },
  creation_personnel: { label: 'Membre ajouté', tone: 'brand' },
  modification_personnel: { label: 'Membre modifié', tone: 'warn' },
  desactivation_personnel: { label: 'Membre désactivé', tone: 'critical' },
  reactivation_personnel: { label: 'Membre réactivé', tone: 'success' },
  action_corrective_ajoutee: { label: 'Action corrective ajoutée', tone: 'brand' },
  action_corrective_completee: { label: 'Action corrective complétée', tone: 'success' },
  action_corrective_reouverte: { label: 'Action corrective réouverte', tone: 'warn' },
  action_corrective_retiree: { label: 'Action corrective retirée', tone: 'critical' },
  signature_personne: { label: 'Signature électronique', tone: 'success' },
  declaration_farpopq_validee: { label: 'Déclaration FARPOPQ validée', tone: 'success' }
}

function actionInfo(action: string) {
  return ACTIONS_LABELS[action] ?? { label: action, tone: 'neutral' as const }
}

export default function Journal() {
  const utilisateurs = useMemo(() => listUtilisateurs(), [])
  const [utilisateurNom, setUtilisateurNom] = useState('')
  const [action, setAction] = useState('')
  const [dateDebut, setDateDebut] = useState('')
  const [dateFin, setDateFin] = useState('')

  const entrees = useMemo(
    () =>
      listAuditLog({
        utilisateur_nom: utilisateurNom || undefined,
        action: action || undefined,
        dateDebut: dateDebut || undefined,
        dateFin: dateFin || undefined
      }),
    [utilisateurNom, action, dateDebut, dateFin]
  )

  return (
    <div>
      <PageHeader
        title="Journal d'audit"
        subtitle="Historique complet et infalsifiable des actions effectuées dans le registre : qui, quoi, quand."
      />

      <Card className="p-4 mb-5">
        <div className="grid grid-cols-4 gap-3">
          <Select value={utilisateurNom} onChange={(e) => setUtilisateurNom(e.target.value)}>
            <option value="">Tous les utilisateurs</option>
            {utilisateurs.map((u) => (
              <option key={u.id} value={u.nom}>
                {u.nom}
              </option>
            ))}
          </Select>
          <Select value={action} onChange={(e) => setAction(e.target.value)}>
            <option value="">Toutes les actions</option>
            {Object.entries(ACTIONS_LABELS).map(([key, v]) => (
              <option key={key} value={key}>
                {v.label}
              </option>
            ))}
          </Select>
          <Input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} title="Depuis le" />
          <Input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} title="Jusqu'au" />
        </div>
      </Card>

      <Card className="overflow-hidden">
        {entrees.length === 0 ? (
          <EmptyState title="Aucune entrée" description="Aucune action ne correspond aux filtres sélectionnés." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] min-w-[760px]">
              <thead>
                <tr className="text-left bg-papier text-ardoise-500 border-b border-ligne-forte">
                  <th className="px-4 py-3 kicker font-bold">Date et heure</th>
                  <th className="px-4 py-3 kicker font-bold">Utilisateur</th>
                  <th className="px-4 py-3 kicker font-bold">Action</th>
                  <th className="px-4 py-3 kicker font-bold">Cible</th>
                  <th className="px-4 py-3 kicker font-bold">Détails</th>
                </tr>
              </thead>
              <tbody>
                {entrees.map((e) => {
                  const info = actionInfo(e.action)
                  const contenu = (
                    <>
                      <td className="px-4 py-3 num text-ardoise-700 whitespace-nowrap">
                        {formatDateLongue(e.horodatage.slice(0, 10))} · {e.horodatage.slice(11, 16)}
                      </td>
                      <td className="px-4 py-3 text-encre font-medium whitespace-nowrap">{e.utilisateur_nom}</td>
                      <td className="px-4 py-3">
                        <Badge tone={info.tone}>{info.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-ardoise-700 whitespace-nowrap">{e.cible_libelle || '—'}</td>
                      <td className="px-4 py-3 text-ardoise-500">{e.details || '—'}</td>
                    </>
                  )
                  return e.cible_type === 'evenement' && e.cible_id ? (
                    <tr key={e.id} className="border-b border-ligne last:border-0 hover:bg-ligne/60 transition-colors">
                      {contenu}
                      <td className="px-2">
                        <Link to={`/evenement/${e.cible_id}`} className="text-[12px] text-sarcelle-600 font-semibold hover:underline whitespace-nowrap">
                          Voir →
                        </Link>
                      </td>
                    </tr>
                  ) : (
                    <tr key={e.id} className="border-b border-ligne last:border-0">
                      {contenu}
                      <td />
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
