import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Save, AlertTriangle, Info, FileClock } from 'lucide-react'
import { Card, Field, Input, Select, Textarea, Button, MultiCheck, GraviteBadge, AutocompleteInput, type Suggestion } from './ui'
import { listOptions, listPersonnel, listEvenementsSimilaires, listMedicamentsConnus, type NouvelEvenementInput, type MedicamentConnu } from '../db/database'
import { GRAVITES, ROLES_EVENEMENT, STATUTS, MEDICAMENTS_COURANTS } from '../constants'
import { formatDateCourte, todayLocalIso } from '../lib/dates'
import type { EvenementAvecPersonnes } from '../types'
import medicamentsDpd from '../data/medicamentsDpd.json'

interface SuggestionMedicament extends Suggestion, MedicamentConnu {}

const DRAFT_KEY = 'pharma-brouillon-declarer'

interface Brouillon {
  savedAt: string
  fields: Record<string, unknown>
}

interface PersonneLigne {
  key: string
  personnel_id: string
  nom_libre: string
  role_evenement: string
}

function parseJsonArray(s: string | null | undefined): string[] {
  try {
    return s ? (JSON.parse(s) as string[]) : []
  } catch {
    return []
  }
}

export default function EvenementForm({
  existing,
  onSubmit,
  onCancel,
  submitLabel = 'Enregistrer le signalement'
}: {
  existing?: EvenementAvecPersonnes
  onSubmit: (input: NouvelEvenementInput) => Promise<void> | void
  onCancel?: () => void
  submitLabel?: string
}) {
  const milieux = useMemo(() => listOptions('milieu'), [])
  const etapes = useMemo(() => listOptions('etape_circuit'), [])
  const typesErreur = useMemo(() => listOptions('type_erreur'), [])
  const causes = useMemo(() => listOptions('cause_probable'), [])
  const classes = useMemo(() => listOptions('classe_therapeutique'), [])
  const personnelDisponible = useMemo(() => listPersonnel(false), [])
  const suggestionsMedicament = useMemo<SuggestionMedicament[]>(() => {
    const connus: SuggestionMedicament[] = listMedicamentsConnus().map((m) => ({ ...m, detail: undefined }))
    const courants: SuggestionMedicament[] = MEDICAMENTS_COURANTS.map((nom) => ({ label: nom, concentrationForme: null, classe: null, din: null }))
    const dpd: SuggestionMedicament[] = (medicamentsDpd as MedicamentConnu[]).map((m) => ({ ...m, detail: m.classe && m.classe !== 'Autre' ? m.classe : undefined }))

    const vus = new Set<string>()
    const merged: SuggestionMedicament[] = []
    for (const item of [...connus, ...courants, ...dpd]) {
      const cle = item.label.trim().toLowerCase()
      if (cle && !vus.has(cle)) {
        vus.add(cle)
        merged.push(item)
      }
    }
    return merged.sort((a, b) => a.label.localeCompare(b.label, 'fr'))
  }, [])

  const [dateEvenement, setDateEvenement] = useState(existing?.date_evenement ?? todayLocalIso())
  const [heure, setHeure] = useState(existing?.heure_evenement ?? '')
  const [milieu, setMilieu] = useState(existing?.milieu ?? milieux[0]?.valeur ?? '')
  const [succursale, setSuccursale] = useState(existing?.succursale ?? '')
  const [etape, setEtape] = useState(existing?.etape_circuit ?? etapes[0]?.valeur ?? '')
  const [typeErreur, setTypeErreur] = useState(existing?.type_erreur ?? typesErreur[0]?.valeur ?? '')
  const [gravite, setGravite] = useState(existing?.gravite ?? 'B')
  const [statut, setStatut] = useState<string>(existing?.statut ?? 'Ouvert')
  const [patientId, setPatientId] = useState(existing?.patient_identifiant ?? '')
  const [medNom, setMedNom] = useState(existing?.medicament_nom ?? '')
  const [medDin, setMedDin] = useState(existing?.medicament_din ?? '')
  const [classeTherapeutique, setClasseTherapeutique] = useState(existing?.classe_therapeutique ?? '')
  const [concentration, setConcentration] = useState(existing?.concentration_forme ?? '')
  const [description, setDescription] = useState(existing?.description ?? '')
  const [causesSelectionnees, setCausesSelectionnees] = useState<string[]>(parseJsonArray(existing?.cause_probable))
  const [mesures, setMesures] = useState(existing?.mesures_correctives ?? '')
  const [divulgue, setDivulgue] = useState(!!existing?.divulgue_patient)
  const [divulgueLe, setDivulgueLe] = useState(existing?.divulgue_le ?? '')
  const [divulguePar, setDivulguePar] = useState(existing?.divulgue_par ?? '')
  const [farpopqAvise, setFarpopqAvise] = useState(!!existing?.farpopq_avise)
  const [farpopqAviseLe, setFarpopqAviseLe] = useState(existing?.farpopq_avise_le ?? '')
  const [farpopqAvisePar, setFarpopqAvisePar] = useState(existing?.farpopq_avise_par ?? '')
  const [personnes, setPersonnes] = useState<PersonneLigne[]>(
    existing && existing.personnes.length
      ? existing.personnes.map((p) => ({ key: crypto.randomUUID(), personnel_id: p.personnel_id ?? '', nom_libre: p.nom_libre ?? '', role_evenement: p.role_evenement }))
      : [{ key: crypto.randomUUID(), personnel_id: '', nom_libre: '', role_evenement: 'A commis' }]
  )
  const [saving, setSaving] = useState(false)
  const [erreur, setErreur] = useState('')
  const [brouillonPropose, setBrouillonPropose] = useState<Brouillon | null>(null)

  const graviteSelectionnee = GRAVITES.find((g) => g.code === gravite)!

  // ---- Brouillon automatique (nouveau signalement seulement) ----
  useEffect(() => {
    if (existing) return
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (raw) setBrouillonPropose(JSON.parse(raw))
    } catch {
      // brouillon corrompu ou indisponible — ignoré silencieusement
    }
  }, [existing])

  useEffect(() => {
    if (existing || brouillonPropose) return
    const champsVides = !description.trim() && !medNom.trim() && !patientId.trim() && causesSelectionnees.length === 0 && !mesures.trim()
    const timer = setTimeout(() => {
      if (champsVides) {
        localStorage.removeItem(DRAFT_KEY)
        return
      }
      const fields = { dateEvenement, heure, milieu, succursale, etape, typeErreur, gravite, patientId, medNom, medDin, classeTherapeutique, concentration, description, causesSelectionnees, mesures }
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ savedAt: new Date().toISOString(), fields }))
    }, 700)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing, brouillonPropose, dateEvenement, heure, milieu, succursale, etape, typeErreur, gravite, patientId, medNom, medDin, classeTherapeutique, concentration, description, causesSelectionnees, mesures])

  function reprendreBrouillon() {
    if (!brouillonPropose) return
    const f = brouillonPropose.fields as any
    if (f.dateEvenement) setDateEvenement(f.dateEvenement)
    if (f.heure) setHeure(f.heure)
    if (f.milieu) setMilieu(f.milieu)
    if (f.succursale) setSuccursale(f.succursale)
    if (f.etape) setEtape(f.etape)
    if (f.typeErreur) setTypeErreur(f.typeErreur)
    if (f.gravite) setGravite(f.gravite)
    if (f.patientId) setPatientId(f.patientId)
    if (f.medNom) setMedNom(f.medNom)
    if (f.medDin) setMedDin(f.medDin)
    if (f.classeTherapeutique) setClasseTherapeutique(f.classeTherapeutique)
    if (f.concentration) setConcentration(f.concentration)
    if (f.description) setDescription(f.description)
    if (Array.isArray(f.causesSelectionnees)) setCausesSelectionnees(f.causesSelectionnees)
    if (f.mesures) setMesures(f.mesures)
    setBrouillonPropose(null)
  }

  function ignorerBrouillon() {
    localStorage.removeItem(DRAFT_KEY)
    setBrouillonPropose(null)
  }

  // ---- Événements semblables (aide à repérer un doublon ou un cas récurrent) ----
  const semblables = useMemo(
    () => listEvenementsSimilaires({ typeErreur, medicamentNom: medNom, dateEvenement, excludeId: existing?.id }),
    [typeErreur, medNom, dateEvenement, existing?.id]
  )
  const doublonProbable = semblables.some((s) => s.memeJour)

  function ajouterPersonne() {
    setPersonnes((p) => [...p, { key: crypto.randomUUID(), personnel_id: '', nom_libre: '', role_evenement: 'Impliqué' }])
  }
  function retirerPersonne(key: string) {
    setPersonnes((p) => p.filter((x) => x.key !== key))
  }
  function majPersonne(key: string, patch: Partial<PersonneLigne>) {
    setPersonnes((p) => p.map((x) => (x.key === key ? { ...x, ...patch } : x)))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErreur('')
    if (!description.trim()) {
      setErreur('Veuillez décrire la situation.')
      return
    }
    if (!milieu || !etape || !typeErreur) {
      setErreur('Certaines listes déroulantes sont vides — ajoutez au moins une option dans Paramètres avant de continuer.')
      return
    }
    setSaving(true)
    try {
      const input: NouvelEvenementInput = {
        date_evenement: dateEvenement,
        heure_evenement: heure || null,
        milieu,
        succursale: succursale || null,
        etape_circuit: etape,
        type_erreur: typeErreur,
        gravite,
        statut,
        patient_identifiant: patientId || null,
        medicament_nom: medNom || null,
        medicament_din: medDin || null,
        classe_therapeutique: classeTherapeutique || null,
        concentration_forme: concentration || null,
        description: description.trim(),
        cause_probable: causesSelectionnees,
        mesures_correctives: mesures || null,
        divulgue_patient: divulgue,
        divulgue_le: divulgue ? divulgueLe || null : null,
        divulgue_par: divulgue ? divulguePar || null : null,
        farpopq_avise: farpopqAvise,
        farpopq_avise_le: farpopqAvise ? farpopqAviseLe || null : null,
        farpopq_avise_par: farpopqAvise ? farpopqAvisePar || null : null,
        personnes: personnes
          .filter((p) => p.personnel_id || p.nom_libre)
          .map((p) => ({ personnel_id: p.personnel_id || null, nom_libre: p.personnel_id ? null : p.nom_libre, role_evenement: p.role_evenement }))
      }
      await onSubmit(input)
      if (!existing) localStorage.removeItem(DRAFT_KEY)
    } catch (err: any) {
      setErreur(err?.message ?? String(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {erreur && <div className="mb-4 text-[13px] font-medium text-hazard-h bg-signal-red/10 border-2 border-signal-red/40 rounded-md px-4 py-2.5">{erreur}</div>}

      {brouillonPropose && (
        <div className="flex items-center gap-3 mb-4 px-4 py-3 rounded-md border-2 border-brand-300 bg-brand-50">
          <FileClock size={17} className="text-brand-700 shrink-0" />
          <p className="text-[13px] text-brand-700 flex-1">
            Un brouillon non enregistré a été trouvé (interrompu le {new Date(brouillonPropose.savedAt).toLocaleString('fr-CA', { dateStyle: 'short', timeStyle: 'short' })}).
          </p>
          <Button type="button" size="sm" onClick={reprendreBrouillon}>
            Reprendre
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={ignorerBrouillon}>
            Ignorer
          </Button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 space-y-5">
          <Card className="p-6">
            <h3 className="kicker text-steel mb-4">Contexte de l'événement</h3>
            <div className="grid grid-cols-2 gap-x-4">
              <Field label="Date de l'événement" required>
                <Input type="date" value={dateEvenement} onChange={(e) => setDateEvenement(e.target.value)} required />
              </Field>
              <Field label="Heure (approximative)">
                <Input type="time" value={heure} onChange={(e) => setHeure(e.target.value)} />
              </Field>
              <Field
                label="Milieu / type de pharmacie"
                required
                hint={milieux.length === 0 ? 'Aucune option active — ajoutez-en dans Paramètres.' : undefined}
              >
                <Select value={milieu} onChange={(e) => setMilieu(e.target.value)} disabled={milieux.length === 0}>
                  {milieux.length === 0 && <option value="">Aucune option disponible</option>}
                  {milieux.map((m) => (
                    <option key={m.valeur} value={m.valeur}>
                      {m.valeur}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Succursale / point de service" hint="Optionnel — utile si plusieurs sites">
                <Input value={succursale} onChange={(e) => setSuccursale(e.target.value)} placeholder="Ex. : Succursale Centre-ville" />
              </Field>
              <Field
                label="Étape du circuit du médicament"
                required
                hint={etapes.length === 0 ? 'Aucune option active — ajoutez-en dans Paramètres.' : undefined}
              >
                <Select value={etape} onChange={(e) => setEtape(e.target.value)} disabled={etapes.length === 0}>
                  {etapes.length === 0 && <option value="">Aucune option disponible</option>}
                  {etapes.map((m) => (
                    <option key={m.valeur} value={m.valeur}>
                      {m.valeur}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                label="Type d'erreur / circonstance"
                required
                hint={typesErreur.length === 0 ? 'Aucune option active — ajoutez-en dans Paramètres.' : undefined}
              >
                <Select value={typeErreur} onChange={(e) => setTypeErreur(e.target.value)} disabled={typesErreur.length === 0}>
                  {typesErreur.length === 0 && <option value="">Aucune option disponible</option>}
                  {typesErreur.map((m) => (
                    <option key={m.valeur} value={m.valeur}>
                      {m.valeur}
                    </option>
                  ))}
                </Select>
              </Field>
              {existing && (
                <Field label="Statut du dossier">
                  <Select value={statut} onChange={(e) => setStatut(e.target.value)}>
                    {STATUTS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="kicker text-steel mb-4">Médicament concerné</h3>
            <p className="text-[12px] text-steel mb-4 -mt-2">Laissez vide si l'événement n'implique pas un médicament précis (ex. : erreur de livraison, facturation).</p>
            <div className="grid grid-cols-2 gap-x-4">
              <Field label="Nom du médicament" hint="Suggestions à partir d'une liste usuelle et des médicaments déjà utilisés ici — vous pouvez toujours saisir un autre nom.">
                <AutocompleteInput
                  value={medNom}
                  onChange={setMedNom}
                  suggestions={suggestionsMedicament}
                  placeholder="Ex. : Apo-Metformin 500mg"
                  onSelect={(item) => {
                    if (item.concentrationForme) setConcentration(item.concentrationForme)
                    if (item.classe) setClasseTherapeutique(item.classe)
                    if (item.din) setMedDin(item.din)
                  }}
                />
              </Field>
              <Field label="DIN">
                <Input value={medDin} onChange={(e) => setMedDin(e.target.value)} placeholder="Ex. : 02245678" />
              </Field>
              <Field label="Classe thérapeutique">
                <Select value={classeTherapeutique} onChange={(e) => setClasseTherapeutique(e.target.value)}>
                  <option value="">— Non précisé —</option>
                  {classes.map((m) => (
                    <option key={m.valeur} value={m.valeur}>
                      {m.valeur}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Concentration / forme">
                <Input value={concentration} onChange={(e) => setConcentration(e.target.value)} placeholder="Ex. : Comprimé 500 mg" />
              </Field>
            </div>
          </Card>

          {semblables.length > 0 && (
            <Card className={`p-5 ${doublonProbable ? 'border-2 border-hazard-h bg-signal-red/5' : 'border-2 border-signal-amber/50 bg-signal-amber/5'}`}>
              <div className="flex items-start gap-2.5 mb-3">
                {doublonProbable ? <AlertTriangle size={17} className="text-hazard-h shrink-0 mt-0.5" /> : <Info size={17} className="text-[#8a5c07] shrink-0 mt-0.5" />}
                <div>
                  <h3 className={`text-[13px] font-bold ${doublonProbable ? 'text-hazard-h' : 'text-[#8a5c07]'}`}>
                    {doublonProbable ? 'Possible doublon — même type d\'erreur, même date' : 'Événements semblables récents'}
                  </h3>
                  <p className="text-[12px] text-graphite mt-0.5">
                    {doublonProbable
                      ? "Un signalement identique semble déjà exister pour aujourd'hui. Vérifiez qu'il ne s'agit pas d'une double déclaration avant d'enregistrer."
                      : "Ces signalements partagent le même type d'erreur ou médicament au cours des 90 derniers jours — utile pour repérer une récurrence."}
                  </p>
                </div>
              </div>
              <div className="space-y-1.5">
                {semblables.slice(0, 4).map((s) => (
                  <Link
                    key={s.id}
                    to={`/evenement/${s.id}`}
                    target="_blank"
                    className="flex items-center gap-2.5 bg-white/70 hover:bg-white rounded-md px-3 py-2 text-[12.5px] transition-colors"
                  >
                    <GraviteBadge code={s.gravite} size="sm" />
                    <span className="text-ink font-semibold">#{s.numero}</span>
                    <span className="text-graphite truncate flex-1">
                      {formatDateCourte(s.date_evenement)} · {s.type_erreur}
                      {s.medicament_nom ? ` · ${s.medicament_nom}` : ''}
                    </span>
                  </Link>
                ))}
              </div>
            </Card>
          )}

          <Card className="p-6">
            <h3 className="kicker text-steel mb-4">Description et analyse</h3>
            <Field label="Description détaillée de la situation" required>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Que s'est-il passé ? Comment l'erreur a-t-elle été détectée ?" required rows={4} />
            </Field>
            <Field label="Causes probables / facteurs contributifs">
              <MultiCheck options={causes.map((c) => c.valeur)} values={causesSelectionnees} onChange={setCausesSelectionnees} />
            </Field>
            <Field label="Mesures correctives / plan d'action">
              <Textarea value={mesures} onChange={(e) => setMesures(e.target.value)} placeholder="Actions entreprises ou prévues pour éviter une récidive" rows={3} />
            </Field>
          </Card>

          <Card className="p-6">
            <h3 className="kicker text-steel mb-1">Personnes impliquées</h3>
            <p className="text-[12px] text-steel mb-4">Sélectionnez dans le répertoire du personnel ou saisissez un nom (ex. : livreur externe).</p>
            <div className="space-y-3">
              {personnes.map((p) => (
                <div key={p.key} className="flex items-center gap-2">
                  <Select className="flex-1" value={p.personnel_id} onChange={(e) => majPersonne(p.key, { personnel_id: e.target.value })}>
                    <option value="">— Saisir un nom libre —</option>
                    {personnelDisponible.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nom} ({m.role})
                      </option>
                    ))}
                  </Select>
                  {!p.personnel_id && (
                    <Input className="flex-1" placeholder="Nom" value={p.nom_libre} onChange={(e) => majPersonne(p.key, { nom_libre: e.target.value })} />
                  )}
                  <Select className="w-44" value={p.role_evenement} onChange={(e) => majPersonne(p.key, { role_evenement: e.target.value })}>
                    {ROLES_EVENEMENT.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </Select>
                  <button type="button" onClick={() => retirerPersonne(p.key)} className="text-steel hover:text-hazard-h px-2 text-lg leading-none">
                    ×
                  </button>
                </div>
              ))}
            </div>
            <Button type="button" variant="ghost" size="sm" className="mt-3" onClick={ajouterPersonne}>
              + Ajouter une personne
            </Button>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="p-6">
            <h3 className="kicker text-steel mb-4">Gravité de l'événement</h3>
            <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
              {GRAVITES.map((g) => (
                <label
                  key={g.code}
                  className={`flex items-start gap-3 p-2.5 rounded-md cursor-pointer border-2 transition-colors ${
                    gravite === g.code ? 'border-ink bg-mist' : 'border-transparent hover:bg-mist/60'
                  }`}
                >
                  <input type="radio" name="gravite" className="sr-only" checked={gravite === g.code} onChange={() => setGravite(g.code)} />
                  <span
                    className="hazard-diamond shrink-0 mt-0.5 inline-flex items-center justify-center font-mono font-bold text-white text-[9px]"
                    style={{ width: 22, height: 22, backgroundColor: g.couleur }}
                  >
                    {g.code}
                  </span>
                  <div>
                    <span className="text-[13px] font-bold text-ink">{g.label}</span>
                    <p className="text-[12px] text-steel mt-0.5">{g.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="kicker text-steel mb-4">Patient</h3>
            <Field label="Identifiant du patient" hint="Utilisez des initiales ou un numéro de dossier — évitez le nom complet pour protéger la confidentialité.">
              <Input value={patientId} onChange={(e) => setPatientId(e.target.value)} placeholder="Ex. : J.T. — dossier 48213" />
            </Field>
          </Card>

          <Card className="p-6">
            <h3 className="kicker text-steel mb-4">Divulgation au patient</h3>
            <label className="flex items-center gap-2 mb-3 cursor-pointer">
              <input type="checkbox" checked={divulgue} onChange={(e) => setDivulgue(e.target.checked)} />
              <span className="text-[13px] text-graphite">L'événement a été divulgué au patient / à ses proches</span>
            </label>
            {divulgue && (
              <div className="space-y-3">
                <Field label="Date de divulgation">
                  <Input type="date" value={divulgueLe} onChange={(e) => setDivulgueLe(e.target.value)} />
                </Field>
                <Field label="Divulgué par">
                  <Input value={divulguePar} onChange={(e) => setDivulguePar(e.target.value)} placeholder="Nom du pharmacien" />
                </Field>
              </div>
            )}
            {graviteSelectionnee.poids >= 4 && !divulgue && (
              <p className="text-[12px] font-medium text-[#8a5c07] bg-signal-amber/10 border-2 border-signal-amber/40 rounded-md px-3 py-2 mt-1">
                Gravité {graviteSelectionnee.code} : la divulgation au patient est généralement obligatoire selon les standards de l'OPQ.
              </p>
            )}
          </Card>

          <Card className="p-6">
            <h3 className="kicker text-steel mb-4">Avis à la FARPOPQ</h3>
            <label className="flex items-center gap-2 mb-3 cursor-pointer">
              <input type="checkbox" checked={farpopqAvise} onChange={(e) => setFarpopqAvise(e.target.checked)} />
              <span className="text-[13px] text-graphite">Le Fonds d'assurance responsabilité professionnelle (FARPOPQ) a été avisé</span>
            </label>
            {farpopqAvise && (
              <div className="space-y-3">
                <Field label="Date de l'avis">
                  <Input type="date" value={farpopqAviseLe} onChange={(e) => setFarpopqAviseLe(e.target.value)} />
                </Field>
                <Field label="Avisé par">
                  <Input value={farpopqAvisePar} onChange={(e) => setFarpopqAvisePar(e.target.value)} placeholder="Nom du pharmacien" />
                </Field>
              </div>
            )}
            {graviteSelectionnee.poids >= 6 && !farpopqAvise && (
              <p className="text-[12px] font-medium text-[#8a5c07] bg-signal-amber/10 border-2 border-signal-amber/40 rounded-md px-3 py-2 mt-1">
                Gravité {graviteSelectionnee.code} : envisagez d'aviser la FARPOPQ pour assurer votre couverture en cas de poursuite.
              </p>
            )}
          </Card>
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-6">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Annuler
          </Button>
        )}
        <Button type="submit" disabled={saving}>
          <Save size={16} /> {saving ? 'Enregistrement…' : submitLabel}
        </Button>
      </div>
    </form>
  )
}
