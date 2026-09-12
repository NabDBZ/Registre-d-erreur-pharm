import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Pencil, Archive, ArchiveRestore, Printer, History, ListChecks, Plus, Trash2, CalendarClock, PenLine, FileSignature, ShieldCheck, ShieldAlert, ExternalLink } from 'lucide-react'
import {
  getEvenement,
  mettreAJourEvenement,
  archiverEvenement,
  restaurerEvenement,
  setStatutEvenement,
  listAuditLog,
  listActionsCorrectives,
  ajouterActionCorrective,
  toggleActionCorrective,
  supprimerActionCorrective,
  signerPersonneImpliquee,
  validerAvisFarpopq,
  getParametre,
  type NouvelEvenementInput
} from '../db/database'
import { Card, PageHeader, Button, GraviteBadge, StatutBadge, Select, Modal, Field, Textarea, Input, Badge } from '../components/ui'
import EvenementForm from '../components/EvenementForm'
import SignaturePad from '../components/SignaturePad'
import FeuilleSignatures from '../components/FeuilleSignatures'
import FarpopqDeclaration from '../components/FarpopqDeclaration'
import { graviteInfo, STATUTS } from '../constants'
import { formatDateLongue, formatDateHeureLongue, todayLocalIso } from '../lib/dates'
import { useAuth } from '../lib/AuthContext'
import { useToast } from '../lib/toast'
import type { PersonneImpliquee } from '../types'

function parseJsonArray(s: string | null | undefined): string[] {
  try {
    return s ? (JSON.parse(s) as string[]) : []
  } catch {
    return []
  }
}

export default function Detail({ onChanged }: { onChanged: () => void }) {
  const { id } = useParams<{ id: string }>()
  const { session } = useAuth()
  const { push } = useToast()
  const isAdmin = session.role === 'Administrateur'
  const [editing, setEditing] = useState(false)
  const [archiveModal, setArchiveModal] = useState(false)
  const [motifArchive, setMotifArchive] = useState('')
  const [version, setVersion] = useState(0)
  const [nouvelleAction, setNouvelleAction] = useState({ description: '', responsable: '', echeance: '' })
  const [signataire, setSignataire] = useState<PersonneImpliquee | null>(null)
  const [modeFeuille, setModeFeuille] = useState(false)
  const [farpopqModal, setFarpopqModal] = useState(false)

  const evenement = useMemo(() => (id ? getEvenement(id) : null), [id, version])
  const historique = useMemo(() => (id ? listAuditLog({ cible_type: 'evenement', cible_id: id }) : []), [id, version])
  const actionsCorrectives = useMemo(() => (id ? listActionsCorrectives(id) : []), [id, version])
  const pharmacyName = useMemo(() => getParametre('nom_pharmacie', ''), [])

  useEffect(() => {
    if (!modeFeuille) return
    const onAfterPrint = () => setModeFeuille(false)
    window.addEventListener('afterprint', onAfterPrint)
    const t = setTimeout(() => window.print(), 80)
    return () => {
      window.removeEventListener('afterprint', onAfterPrint)
      clearTimeout(t)
    }
  }, [modeFeuille])

  if (!evenement) {
    return (
      <div>
        <Link to="/registre" className="text-[13px] text-sarcelle-600 flex items-center gap-1 mb-4">
          <ArrowLeft size={14} /> Retour au registre
        </Link>
        <p className="text-ardoise-500">Événement introuvable.</p>
      </div>
    )
  }

  async function handleUpdate(input: NouvelEvenementInput) {
    if (!id) return
    mettreAJourEvenement(id, input, session.nom)
    onChanged()
    setEditing(false)
    setVersion((v) => v + 1)
    push('Modifications enregistrées.')
  }

  function handleArchive() {
    if (!id) return
    archiverEvenement(id, session.nom, motifArchive.trim() || 'Aucun motif précisé')
    onChanged()
    setArchiveModal(false)
    setMotifArchive('')
    setVersion((v) => v + 1)
    push('Signalement archivé.', 'warn')
  }

  function handleRestore() {
    if (!id) return
    restaurerEvenement(id, session.nom)
    onChanged()
    setVersion((v) => v + 1)
    push('Signalement restauré.')
  }

  function handleStatutChange(statut: string) {
    if (!id) return
    setStatutEvenement(id, statut, session.nom)
    onChanged()
    setVersion((v) => v + 1)
    push(`Statut changé pour « ${statut} ».`)
  }

  function handleAjouterAction(e: React.FormEvent) {
    e.preventDefault()
    if (!id || !nouvelleAction.description.trim()) return
    ajouterActionCorrective(
      id,
      { description: nouvelleAction.description.trim(), responsable: nouvelleAction.responsable.trim() || null, echeance: nouvelleAction.echeance || null },
      session.nom
    )
    setNouvelleAction({ description: '', responsable: '', echeance: '' })
    setVersion((v) => v + 1)
    push('Action corrective ajoutée.')
  }

  function handleToggleAction(actionId: string, complete: boolean) {
    toggleActionCorrective(actionId, complete, session.nom)
    setVersion((v) => v + 1)
  }

  function handleSupprimerAction(actionId: string) {
    supprimerActionCorrective(actionId, session.nom)
    setVersion((v) => v + 1)
    push('Action corrective retirée.', 'info')
  }

  function handleSigner(dataUrl: string) {
    if (!signataire) return
    signerPersonneImpliquee(signataire.id, dataUrl, session.nom)
    push(`Signature de ${signataire.nom_affiche} enregistrée.`)
    setSignataire(null)
    setVersion((v) => v + 1)
  }

  function handleValiderFarpopq(input: { avise_le: string; avise_par: string; resume: string }) {
    if (!id) return
    validerAvisFarpopq(id, input, session.nom)
    setFarpopqModal(false)
    setVersion((v) => v + 1)
    push('Avis FARPOPQ validé.')
    window.api?.ouvrirFarpopq()?.catch(() => {})
  }

  function handleOuvrirFarpopq() {
    window.api?.ouvrirFarpopq()?.catch(() => {})
  }

  const gi = graviteInfo(evenement.gravite)
  const causes = parseJsonArray(evenement.cause_probable)
  const estArchive = evenement.supprime === 1

  if (editing) {
    return (
      <div>
        <PageHeader kicker="Modification" title={`Modifier le signalement #${evenement.numero}`} />
        <EvenementForm existing={evenement} onSubmit={handleUpdate} onCancel={() => setEditing(false)} submitLabel="Enregistrer les modifications" />
      </div>
    )
  }

  if (modeFeuille) {
    return (
      <div>
        <div className="no-print flex items-center justify-between mb-4">
          <Button variant="secondary" size="sm" onClick={() => setModeFeuille(false)}>
            <ArrowLeft size={14} /> Retour au dossier
          </Button>
          <Button size="sm" onClick={() => window.print()}>
            <Printer size={15} /> Imprimer
          </Button>
        </div>
        <FeuilleSignatures evenement={evenement} />
      </div>
    )
  }

  return (
    <div>
      <Link to="/registre" className="text-[13px] text-sarcelle-600 flex items-center gap-1 mb-4 no-print">
        <ArrowLeft size={14} /> Retour au registre
      </Link>

      <PageHeader
        kicker="Dossier"
        title={`Signalement #${evenement.numero}`}
        subtitle={`Déclaré le ${formatDateLongue(evenement.date_declaration.slice(0, 10))}${evenement.cree_par ? ' par ' + evenement.cree_par : ''}`}
        actions={
          <div className="no-print flex items-center gap-2">
            {!estArchive && (
              <Select value={evenement.statut} onChange={(e) => handleStatutChange(e.target.value)} className="w-44">
                {STATUTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            )}
            <Button variant="secondary" size="sm" onClick={() => window.print()}>
              <Printer size={15} /> Imprimer / PDF
            </Button>
            {evenement.personnes.length > 0 && (
              <Button variant="secondary" size="sm" onClick={() => setModeFeuille(true)}>
                <FileSignature size={15} /> Feuille de signatures
              </Button>
            )}
            {!estArchive && (
              <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
                <Pencil size={15} /> Modifier
              </Button>
            )}
            {isAdmin && !estArchive && (
              <Button variant="danger" size="sm" onClick={() => setArchiveModal(true)}>
                <Archive size={15} /> Archiver
              </Button>
            )}
            {isAdmin && estArchive && (
              <Button size="sm" onClick={handleRestore}>
                <ArchiveRestore size={15} /> Restaurer
              </Button>
            )}
          </div>
        }
      />

      {estArchive && (
        <Card className="p-4 mb-6 border-2 border-alerte bg-alerte/5">
          <div className="flex items-start gap-3">
            <Archive className="text-alerte shrink-0 mt-0.5" size={18} />
            <div>
              <p className="text-[13px] font-bold text-alerte">
                Signalement archivé le {evenement.supprime_le ? formatDateLongue(evenement.supprime_le.slice(0, 10)) : '—'} par {evenement.supprime_par || '—'}
              </p>
              <p className="text-[13px] text-ardoise-700 mt-0.5">Motif : {evenement.motif_suppression || '—'}</p>
            </div>
          </div>
        </Card>
      )}

      <div className="flex items-center gap-3 mb-6">
        <GraviteBadge code={evenement.gravite} />
        <span className="text-[13px] text-ardoise-700">{gi.description}</span>
        <StatutBadge statut={evenement.statut} />
        {estArchive && <Badge tone="critical">Archivé</Badge>}
      </div>

      <div className="grid grid-cols-3 gap-5 print-stack">
        <div className="col-span-2 space-y-5">
          <Card className="p-6">
            <h3 className="kicker text-ardoise-500 mb-4">Contexte</h3>
            <dl className="grid grid-cols-2 gap-y-3 text-[13px]">
              <Info label="Date de l'événement" value={`${formatDateLongue(evenement.date_evenement)}${evenement.heure_evenement ? ' à ' + evenement.heure_evenement : ''}`} />
              <Info label="Milieu" value={evenement.milieu} />
              <Info label="Succursale" value={evenement.succursale || '—'} />
              <Info label="Étape du circuit" value={evenement.etape_circuit} />
              <Info label="Type d'erreur" value={evenement.type_erreur} />
              <Info label="Patient (identifiant)" value={evenement.patient_identifiant || '—'} />
            </dl>
          </Card>

          {(evenement.medicament_nom || evenement.medicament_din || evenement.classe_therapeutique) && (
            <Card className="p-6">
              <h3 className="kicker text-ardoise-500 mb-4">Médicament concerné</h3>
              <dl className="grid grid-cols-2 gap-y-3 text-[13px]">
                <Info label="Nom" value={evenement.medicament_nom || '—'} />
                <Info label="DIN" value={evenement.medicament_din || '—'} />
                <Info label="Classe thérapeutique" value={evenement.classe_therapeutique || '—'} />
                <Info label="Concentration / forme" value={evenement.concentration_forme || '—'} />
              </dl>
            </Card>
          )}

          <Card className="p-6">
            <h3 className="kicker text-ardoise-500 mb-3">Description</h3>
            <p className="text-[13px] text-ardoise-700 whitespace-pre-wrap leading-relaxed">{evenement.description}</p>

            {causes.length > 0 && (
              <>
                <h4 className="text-[13px] font-semibold text-encre mt-5 mb-2">Causes probables</h4>
                <div className="flex flex-wrap gap-2">
                  {causes.map((c) => (
                    <span key={c} className="text-[12px] bg-ligne rounded-full px-3 py-1 text-ardoise-700">
                      {c}
                    </span>
                  ))}
                </div>
              </>
            )}

            {evenement.mesures_correctives && (
              <>
                <h4 className="text-[13px] font-semibold text-encre mt-5 mb-2">Mesures correctives</h4>
                <p className="text-[13px] text-ardoise-700 whitespace-pre-wrap leading-relaxed">{evenement.mesures_correctives}</p>
              </>
            )}
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 mb-1">
              <ListChecks size={15} className="text-ardoise-500" />
              <h3 className="kicker text-ardoise-500">Mesures correctives — suivi</h3>
            </div>
            <p className="text-[12px] text-ardoise-500 mb-4">Transformez le plan d'action en tâches concrètes, avec responsable et échéance.</p>
            {actionsCorrectives.length === 0 ? (
              <p className="text-[13px] text-ardoise-500 mb-4">Aucune action de suivi ajoutée.</p>
            ) : (
              <div className="space-y-2 mb-4">
                {actionsCorrectives.map((a) => {
                  const enRetard = !a.complete && a.echeance && a.echeance < todayLocalIso()
                  return (
                    <div key={a.id} className={`flex items-start gap-3 rounded-xl2 px-3 py-2.5 border ${a.complete ? 'bg-ligne/50 border-ligne' : enRetard ? 'bg-alerte/5 border-alerte/40' : 'bg-white border-ligne'}`}>
                      <input
                        type="checkbox"
                        checked={!!a.complete}
                        disabled={estArchive}
                        onChange={(e) => handleToggleAction(a.id, e.target.checked)}
                        className="no-print mt-1 shrink-0 accent-sarcelle disabled:cursor-not-allowed"
                      />
                      <div className="min-w-0 flex-1">
                        <p className={`text-[13px] font-medium ${a.complete ? 'text-ardoise-500 line-through' : 'text-encre'}`}>
                          <span className="hidden print:inline mr-1.5">{a.complete ? '☑' : '☐'}</span>
                          {a.description}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-[11.5px] text-ardoise-500">
                          {a.responsable && <span>Responsable : {a.responsable}</span>}
                          {a.echeance && (
                            <span className={`flex items-center gap-1 ${enRetard ? 'text-alerte font-semibold' : ''}`}>
                              <CalendarClock size={12} /> {enRetard ? 'En retard depuis le ' : 'Échéance : '}
                              {formatDateLongue(a.echeance)}
                            </span>
                          )}
                          {a.complete && a.complete_le && <span>Complétée le {formatDateLongue(a.complete_le.slice(0, 10))}</span>}
                        </div>
                      </div>
                      {!estArchive && (
                        <button onClick={() => handleSupprimerAction(a.id)} className="no-print text-ardoise-500 hover:text-alerte shrink-0 p-1" title="Retirer">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
            {!estArchive && (
              <form onSubmit={handleAjouterAction} className="no-print space-y-2">
                <Input
                  placeholder="Nouvelle action (ex. : Rappel LASA à l'équipe)"
                  value={nouvelleAction.description}
                  onChange={(e) => setNouvelleAction((s) => ({ ...s, description: e.target.value }))}
                />
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <Input
                      placeholder="Responsable"
                      value={nouvelleAction.responsable}
                      onChange={(e) => setNouvelleAction((s) => ({ ...s, responsable: e.target.value }))}
                    />
                  </div>
                  <div className="w-44 shrink-0">
                    <Input type="date" value={nouvelleAction.echeance} onChange={(e) => setNouvelleAction((s) => ({ ...s, echeance: e.target.value }))} />
                  </div>
                  <Button type="submit" variant="secondary" size="sm" disabled={!nouvelleAction.description.trim()} className="shrink-0">
                    <Plus size={14} /> Ajouter
                  </Button>
                </div>
              </form>
            )}
          </Card>

          <Card className="p-6">
            <h3 className="kicker text-ardoise-500 mb-1">Personnes impliquées</h3>
            <p className="text-[12px] text-ardoise-500 mb-4">La signature électronique confirme la prise de connaissance du signalement par la personne concernée.</p>
            {evenement.personnes.length === 0 ? (
              <p className="text-[13px] text-ardoise-500">Aucune personne enregistrée.</p>
            ) : (
              <div className="space-y-2">
                {evenement.personnes.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-3 text-[13px] bg-ligne rounded-lg px-3 py-2.5">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-encre font-medium">{p.nom_affiche}</span>
                        <span className="text-ardoise-500">· {p.role_evenement}</span>
                      </div>
                      {p.signature_data ? (
                        <p className="flex items-center gap-1.5 text-[11.5px] text-sarcelle-600 font-semibold mt-1">
                          <ShieldCheck size={13} /> Signé électroniquement le {formatDateHeureLongue(p.signe_le)}
                        </p>
                      ) : (
                        <p className="text-[11.5px] text-ardoise-500 mt-1">Non signé</p>
                      )}
                    </div>
                    {p.signature_data ? (
                      <img src={p.signature_data} alt="" className="no-print h-9 shrink-0 bg-white rounded border border-ligne px-1" />
                    ) : (
                      !estArchive && (
                        <Button variant="secondary" size="sm" className="no-print shrink-0" onClick={() => setSignataire(p)}>
                          <PenLine size={14} /> Signer
                        </Button>
                      )
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-6 no-print">
            <div className="flex items-center gap-2 mb-3">
              <History size={15} className="text-ardoise-500" />
              <h3 className="kicker text-ardoise-500">Historique et traçabilité</h3>
            </div>
            {historique.length === 0 ? (
              <p className="text-[13px] text-ardoise-500">Aucune entrée.</p>
            ) : (
              <div className="space-y-2.5">
                {historique.map((h) => (
                  <div key={h.id} className="flex items-start gap-3 text-[13px] border-b border-ligne last:border-0 pb-2.5 last:pb-0">
                    <span className="num text-[11px] text-ardoise-500 whitespace-nowrap mt-0.5">
                      {h.horodatage.slice(0, 10)} {h.horodatage.slice(11, 16)}
                    </span>
                    <div className="min-w-0">
                      <span className="text-encre font-medium">{h.utilisateur_nom}</span>
                      <span className="text-ardoise-500"> — {h.details || h.action}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="p-6">
            <h3 className="kicker text-ardoise-500 mb-4">Divulgation au patient</h3>
            <p className="text-[13px] text-ardoise-700 mb-2">{evenement.divulgue_patient ? 'Divulgué' : 'Non divulgué'}</p>
            {evenement.divulgue_patient === 1 && (
              <dl className="text-[13px] space-y-2">
                <Info label="Date" value={evenement.divulgue_le || '—'} />
                <Info label="Par" value={evenement.divulgue_par || '—'} />
              </dl>
            )}
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <ShieldAlert size={15} className="text-ardoise-500" />
              <h3 className="kicker text-ardoise-500">Avis à la FARPOPQ</h3>
            </div>
            <p className="text-[13px] text-ardoise-700 mb-2">{evenement.farpopq_avise ? "Fonds d'assurance avisé" : 'Non avisé'}</p>
            {evenement.farpopq_avise === 1 && (
              <>
                <dl className="text-[13px] space-y-2 mb-3">
                  <Info label="Date" value={evenement.farpopq_avise_le ? formatDateLongue(evenement.farpopq_avise_le) : '—'} />
                  <Info label="Par" value={evenement.farpopq_avise_par || '—'} />
                </dl>
                {evenement.farpopq_resume && (
                  <details className="text-[12px]">
                    <summary className="text-sarcelle-600 font-semibold cursor-pointer select-none">Voir le résumé transmis</summary>
                    <pre className="mt-2 text-ardoise-900 bg-ligne border border-ligne rounded-xl2 p-3 max-h-[220px] overflow-y-auto whitespace-pre-wrap font-mono leading-relaxed">
                      {evenement.farpopq_resume}
                    </pre>
                  </details>
                )}
              </>
            )}
            <div className="flex flex-wrap gap-2 mt-3 no-print">
              {!evenement.farpopq_avise && isAdmin && !estArchive && (
                <Button variant="secondary" size="sm" onClick={() => setFarpopqModal(true)}>
                  <ShieldAlert size={14} /> Préparer la déclaration
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={handleOuvrirFarpopq}>
                <ExternalLink size={14} /> Espace membre FARPOPQ
              </Button>
            </div>
          </Card>

          <Card className="p-6 no-print">
            <h3 className="kicker text-ardoise-500 mb-3">Traçabilité</h3>
            <dl className="text-[13px] space-y-2.5">
              <Info label="Créé par" value={evenement.cree_par || '—'} />
              <Info label="Créé le" value={formatDateLongue(evenement.cree_le.slice(0, 10))} />
              {evenement.modifie_par && <Info label="Dernière modification" value={`${evenement.modifie_par} · ${formatDateLongue((evenement.modifie_le ?? '').slice(0, 10))}`} />}
            </dl>
          </Card>
        </div>
      </div>

      <Modal open={archiveModal} onClose={() => setArchiveModal(false)} title="Archiver ce signalement">
        <p className="text-[13px] text-ardoise-700 mb-4">
          Le signalement #{evenement.numero} sera retiré du registre actif mais <strong>jamais supprimé</strong> — il reste consultable dans les archives et
          cette action est journalisée avec votre nom.
        </p>
        <Field label="Motif de l'archivage" required hint="Obligatoire — visible dans le journal d'audit">
          <Textarea value={motifArchive} onChange={(e) => setMotifArchive(e.target.value)} placeholder="Ex. : Doublon avec le signalement #4" rows={3} autoFocus />
        </Field>
        <div className="flex justify-end gap-2 mt-2">
          <Button variant="secondary" onClick={() => setArchiveModal(false)}>
            Annuler
          </Button>
          <Button variant="danger" onClick={handleArchive} disabled={!motifArchive.trim()}>
            <Archive size={15} /> Confirmer l'archivage
          </Button>
        </div>
      </Modal>

      <SignaturePad
        open={!!signataire}
        onClose={() => setSignataire(null)}
        onConfirm={handleSigner}
        nomSignataire={signataire?.nom_affiche ?? ''}
      />

      <FarpopqDeclaration
        open={farpopqModal}
        onClose={() => setFarpopqModal(false)}
        onValider={handleValiderFarpopq}
        evenement={evenement}
        pharmacyName={pharmacyName}
        nomParDefaut={session.nom}
      />
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-ardoise-500 text-[12px] mb-0.5">{label}</dt>
      <dd className="text-encre font-medium">{value}</dd>
    </div>
  )
}
