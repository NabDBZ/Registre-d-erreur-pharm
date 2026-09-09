import { useState } from 'react'
import { UserPlus, Pencil, Users } from 'lucide-react'
import { listPersonnel, upsertPersonnel, setPersonnelActif, ajouterAudit } from '../db/database'
import type { PersonnelMembre } from '../types'
import { Card, PageHeader, Button, Input, Select, Modal, Field, Badge, EmptyState } from '../components/ui'
import { ROLES_PERSONNEL } from '../constants'
import { useAuth } from '../lib/AuthContext'

export default function Personnel() {
  const { session } = useAuth()
  const [version, setVersion] = useState(0)
  const [modalOuvert, setModalOuvert] = useState(false)
  const [enEdition, setEnEdition] = useState<PersonnelMembre | null>(null)

  const membres = listPersonnel(true)

  function ouvrirNouveau() {
    setEnEdition(null)
    setModalOuvert(true)
  }
  function ouvrirEdition(m: PersonnelMembre) {
    setEnEdition(m)
    setModalOuvert(true)
  }

  return (
    <div>
      <PageHeader
        kicker="Équipe"
        title="Personnel"
        subtitle="Répertoire des pharmaciens, ATP, stagiaires et livreurs pour associer les personnes impliquées dans un événement."
        actions={
          <Button onClick={ouvrirNouveau}>
            <UserPlus size={16} /> Ajouter une personne
          </Button>
        }
      />

      <Card className="overflow-hidden">
        {membres.length === 0 ? (
          <EmptyState
            icon={<Users size={30} />}
            title="Aucun membre du personnel"
            description="Ajoutez les pharmaciens, ATP et autres membres de votre équipe pour pouvoir les associer aux signalements."
            action={
              <Button size="sm" onClick={ouvrirNouveau}>
                <UserPlus size={15} /> Ajouter une personne
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-[13px] min-w-[640px]">
            <thead>
              <tr className="text-left bg-console text-console-dim">
                <th className="px-4 py-3 kicker font-bold">Nom</th>
                <th className="px-4 py-3 kicker font-bold">Rôle</th>
                <th className="px-4 py-3 kicker font-bold">Statut</th>
                <th className="px-4 py-3 kicker font-bold">Notes</th>
                <th className="px-4 py-3 kicker font-bold"></th>
              </tr>
            </thead>
            <tbody>
              {membres.map((m) => (
                <tr key={m.id} className="border-b border-fog last:border-0 hover:bg-mist/60 transition-colors">
                  <td className="px-4 py-3 text-ink font-medium">{m.nom}</td>
                  <td className="px-4 py-3 text-graphite">{m.role}</td>
                  <td className="px-4 py-3">
                    <Badge tone={m.actif ? 'success' : 'neutral'}>{m.actif ? 'Actif' : 'Inactif'}</Badge>
                  </td>
                  <td className="px-4 py-3 text-steel">{m.notes || '—'}</td>
                  <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                    <button onClick={() => ouvrirEdition(m)} className="text-steel hover:text-brand-600">
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => {
                        setPersonnelActif(m.id, !m.actif)
                        ajouterAudit({
                          utilisateur_id: session.id,
                          utilisateur_nom: session.nom,
                          action: m.actif ? 'desactivation_personnel' : 'reactivation_personnel',
                          cible_type: 'personnel',
                          cible_id: m.id,
                          cible_libelle: m.nom
                        })
                        setVersion((v) => v + 1)
                      }}
                      className="text-[12px] text-graphite hover:text-brand-600 underline"
                    >
                      {m.actif ? 'Désactiver' : 'Réactiver'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </Card>

      <PersonnelModal
        open={modalOuvert}
        onClose={() => setModalOuvert(false)}
        existing={enEdition}
        onSaved={() => {
          setVersion((v) => v + 1)
          setModalOuvert(false)
        }}
      />
      <div className="hidden">{version}</div>
    </div>
  )
}

function PersonnelModal({ open, onClose, existing, onSaved }: { open: boolean; onClose: () => void; existing: PersonnelMembre | null; onSaved: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title={existing ? 'Modifier le membre' : 'Ajouter un membre du personnel'}>
      {open && <ModalBody existing={existing} onSaved={onSaved} onClose={onClose} />}
    </Modal>
  )
}

function ModalBody({ existing, onSaved, onClose }: { existing: PersonnelMembre | null; onSaved: () => void; onClose: () => void }) {
  const { session } = useAuth()
  const [nom, setNom] = useState(existing?.nom ?? '')
  const [role, setRole] = useState(existing?.role ?? ROLES_PERSONNEL[0])
  const [notes, setNotes] = useState(existing?.notes ?? '')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nom.trim()) return
    const membre = upsertPersonnel({ id: existing?.id, nom: nom.trim(), role, notes: notes || null, actif: existing?.actif ?? 1 })
    ajouterAudit({
      utilisateur_id: session.id,
      utilisateur_nom: session.nom,
      action: existing ? 'modification_personnel' : 'creation_personnel',
      cible_type: 'personnel',
      cible_id: membre.id,
      cible_libelle: membre.nom
    })
    onSaved()
  }

  return (
    <form onSubmit={handleSubmit}>
      <Field label="Nom complet" required>
        <Input value={nom} onChange={(e) => setNom(e.target.value)} autoFocus required />
      </Field>
      <Field label="Rôle" required>
        <Select value={role} onChange={(e) => setRole(e.target.value)}>
          {ROLES_PERSONNEL.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Notes" hint="Optionnel">
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      <div className="flex justify-end gap-2 mt-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          Annuler
        </Button>
        <Button type="submit">Enregistrer</Button>
      </div>
    </form>
  )
}
