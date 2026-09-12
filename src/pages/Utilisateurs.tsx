import { useState } from 'react'
import { UserPlus, KeyRound } from 'lucide-react'
import { listUtilisateurs, creerUtilisateur, setUtilisateurActif, reinitialiserMotDePasse, ajouterAudit } from '../db/database'
import { hashPassword, validatePasswordStrength } from '../lib/auth'
import type { Utilisateur, RoleUtilisateur } from '../types'
import { Card, PageHeader, Button, Input, Select, Modal, Field, Badge, EmptyState } from '../components/ui'
import { formatDateCourte } from '../lib/dates'
import { useAuth } from '../lib/AuthContext'

export default function Utilisateurs() {
  const { session } = useAuth()
  const [version, setVersion] = useState(0)
  const [modalOuvert, setModalOuvert] = useState(false)
  const [resetPourId, setResetPourId] = useState<string | null>(null)

  const utilisateurs = listUtilisateurs()

  return (
    <div>
      <PageHeader
        title="Utilisateurs"
        subtitle="Gérez les comptes autorisés à accéder au registre. Toutes les actions sont journalisées dans le journal d'audit."
        actions={
          <Button onClick={() => setModalOuvert(true)}>
            <UserPlus size={16} /> Ajouter un utilisateur
          </Button>
        }
      />

      <Card className="overflow-hidden">
        {utilisateurs.length === 0 ? (
          <EmptyState title="Aucun utilisateur" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] min-w-[700px]">
              <thead>
                <tr className="text-left bg-papier text-ardoise-500 border-b border-ligne-forte">
                  <th className="px-4 py-3 kicker font-bold">Nom</th>
                  <th className="px-4 py-3 kicker font-bold">Identifiant</th>
                  <th className="px-4 py-3 kicker font-bold">Rôle</th>
                  <th className="px-4 py-3 kicker font-bold">Dernier accès</th>
                  <th className="px-4 py-3 kicker font-bold">Statut</th>
                  <th className="px-4 py-3 kicker font-bold"></th>
                </tr>
              </thead>
              <tbody>
                {utilisateurs.map((u) => (
                  <tr key={u.id} className="border-b border-ligne last:border-0 hover:bg-ligne/60 transition-colors">
                    <td className="px-4 py-3 text-encre font-medium">
                      {u.nom} {u.id === session.id && <span className="text-[11px] text-sarcelle-600">(vous)</span>}
                    </td>
                    <td className="px-4 py-3 num text-ardoise-700">{u.nom_utilisateur}</td>
                    <td className="px-4 py-3">
                      <Badge tone={u.role === 'Administrateur' ? 'brand' : 'neutral'}>{u.role}</Badge>
                    </td>
                    <td className="px-4 py-3 text-ardoise-500 num">{u.dernier_acces ? formatDateCourte(u.dernier_acces) : '—'}</td>
                    <td className="px-4 py-3">
                      <Badge tone={u.actif ? 'success' : 'neutral'}>{u.actif ? 'Actif' : 'Inactif'}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right space-x-3 whitespace-nowrap">
                      <button onClick={() => setResetPourId(u.id)} className="text-ardoise-500 hover:text-sarcelle-600" title="Réinitialiser le mot de passe">
                        <KeyRound size={15} />
                      </button>
                      {u.id !== session.id && (
                        <button
                          onClick={() => {
                            setUtilisateurActif(u.id, !u.actif)
                            ajouterAudit({
                              utilisateur_id: session.id,
                              utilisateur_nom: session.nom,
                              action: u.actif ? 'desactivation_compte' : 'reactivation_compte',
                              cible_type: 'utilisateur',
                              cible_id: u.id,
                              cible_libelle: u.nom
                            })
                            setVersion((v) => v + 1)
                          }}
                          className="text-[12px] text-ardoise-700 hover:text-sarcelle-600 underline"
                        >
                          {u.actif ? 'Désactiver' : 'Réactiver'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <NouvelUtilisateurModal open={modalOuvert} onClose={() => setModalOuvert(false)} onCree={() => { setVersion((v) => v + 1); setModalOuvert(false) }} />
      <ReinitialiserModal utilisateurId={resetPourId} onClose={() => setResetPourId(null)} />
      <div className="hidden">{version}</div>
    </div>
  )
}

function NouvelUtilisateurModal({ open, onClose, onCree }: { open: boolean; onClose: () => void; onCree: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Ajouter un utilisateur">
      {open && <NouvelUtilisateurForm onClose={onClose} onCree={onCree} />}
    </Modal>
  )
}

function NouvelUtilisateurForm({ onClose, onCree }: { onClose: () => void; onCree: () => void }) {
  const { session } = useAuth()
  const [nom, setNom] = useState('')
  const [nomUtilisateur, setNomUtilisateur] = useState('')
  const [role, setRole] = useState<RoleUtilisateur>('Utilisateur')
  const [motDePasse, setMotDePasse] = useState('')
  const [erreur, setErreur] = useState('')
  const [enCours, setEnCours] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErreur('')
    const forceErr = validatePasswordStrength(motDePasse)
    if (!nom.trim() || !nomUtilisateur.trim()) {
      setErreur('Veuillez remplir tous les champs.')
      return
    }
    if (forceErr) {
      setErreur(forceErr)
      return
    }
    setEnCours(true)
    try {
      const { salt, hash } = await hashPassword(motDePasse)
      const user = creerUtilisateur({ nom: nom.trim(), nom_utilisateur: nomUtilisateur.trim(), role, salt, hash })
      ajouterAudit({ utilisateur_id: session.id, utilisateur_nom: session.nom, action: 'creation', cible_type: 'utilisateur', cible_id: user.id, cible_libelle: user.nom })
      onCree()
    } catch (err: any) {
      setErreur(err?.message ?? String(err))
    } finally {
      setEnCours(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {erreur && <div className="mb-4 text-[13px] font-medium text-alerte bg-alerte/10 border-2 border-alerte/40 rounded-xl2 px-4 py-2.5">{erreur}</div>}
      <Field label="Nom complet" required>
        <Input value={nom} onChange={(e) => setNom(e.target.value)} autoFocus required />
      </Field>
      <Field label="Nom d'utilisateur" required hint="Sans espace, ex. : jroy">
        <Input value={nomUtilisateur} onChange={(e) => setNomUtilisateur(e.target.value)} required />
      </Field>
      <Field label="Rôle" required>
        <Select value={role} onChange={(e) => setRole(e.target.value as RoleUtilisateur)}>
          <option value="Utilisateur">Utilisateur</option>
          <option value="Administrateur">Administrateur</option>
        </Select>
      </Field>
      <Field label="Mot de passe temporaire" required hint="Au moins 6 caractères">
        <Input type="password" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} required />
      </Field>
      <div className="flex justify-end gap-2 mt-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          Annuler
        </Button>
        <Button type="submit" disabled={enCours}>
          {enCours ? 'Création…' : 'Créer le compte'}
        </Button>
      </div>
    </form>
  )
}

function ReinitialiserModal({ utilisateurId, onClose }: { utilisateurId: string | null; onClose: () => void }) {
  return (
    <Modal open={!!utilisateurId} onClose={onClose} title="Réinitialiser le mot de passe">
      {utilisateurId && <ReinitialiserForm utilisateurId={utilisateurId} onClose={onClose} />}
    </Modal>
  )
}

function ReinitialiserForm({ utilisateurId, onClose }: { utilisateurId: string; onClose: () => void }) {
  const { session } = useAuth()
  const [motDePasse, setMotDePasse] = useState('')
  const [erreur, setErreur] = useState('')
  const [enCours, setEnCours] = useState(false)
  const [succes, setSucces] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const forceErr = validatePasswordStrength(motDePasse)
    if (forceErr) {
      setErreur(forceErr)
      return
    }
    setEnCours(true)
    try {
      const { salt, hash } = await hashPassword(motDePasse)
      reinitialiserMotDePasse(utilisateurId, salt, hash)
      ajouterAudit({ utilisateur_id: session.id, utilisateur_nom: session.nom, action: 'reinitialisation_mdp', cible_type: 'utilisateur', cible_id: utilisateurId })
      setSucces(true)
    } finally {
      setEnCours(false)
    }
  }

  if (succes) {
    return (
      <div>
        <p className="text-[13px] text-ardoise-700 mb-4">Mot de passe mis à jour. Communiquez-le en personne à l'utilisateur concerné.</p>
        <Button onClick={onClose} className="w-full">
          Fermer
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      {erreur && <div className="mb-4 text-[13px] font-medium text-alerte bg-alerte/10 border-2 border-alerte/40 rounded-xl2 px-4 py-2.5">{erreur}</div>}
      <Field label="Nouveau mot de passe" required hint="Au moins 6 caractères — à communiquer en personne">
        <Input type="password" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} autoFocus required />
      </Field>
      <div className="flex justify-end gap-2 mt-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          Annuler
        </Button>
        <Button type="submit" disabled={enCours}>
          {enCours ? 'Enregistrement…' : 'Réinitialiser'}
        </Button>
      </div>
    </form>
  )
}
