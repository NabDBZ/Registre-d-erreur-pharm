import initSqlJs, { type Database as SqlJsDatabase } from 'sql.js'
import { SCHEMA_SQL } from './schema'
import { getPersistenceAdapter } from './persistence'
import type { Evenement, EvenementAvecPersonnes, FiltresRegistre, OptionListe, PersonnelMembre, PersonneImpliquee, Utilisateur, RoleUtilisateur, AuditEntry, ActionCorrective } from '../types'
import {
  MILIEUX,
  ETAPES_CIRCUIT,
  TYPES_ERREUR,
  CAUSES_PROBABLES,
  CLASSES_THERAPEUTIQUES,
  GRAVITES
} from '../constants'

let db: SqlJsDatabase | null = null
const persistence = getPersistenceAdapter()
let lastSavePromise: Promise<void> = Promise.resolve()

function uid(): string {
  return crypto.randomUUID()
}

function nowIso(): string {
  return new Date().toISOString()
}

async function fetchWasmBytes(): Promise<ArrayBuffer> {
  if (typeof window !== 'undefined' && window.api) {
    return window.api.getWasmBytes()
  }
  const res = await fetch('./sql-wasm.wasm')
  return res.arrayBuffer()
}

function seedDefaultOptions(): void {
  const seed = (categorie: string, values: string[]) => {
    values.forEach((v, i) => {
      db!.run('INSERT OR IGNORE INTO listes_options (categorie, valeur, actif, ordre) VALUES (?,?,1,?)', [categorie, v, i])
    })
  }
  seed('milieu', MILIEUX)
  seed('etape_circuit', ETAPES_CIRCUIT)
  seed('type_erreur', TYPES_ERREUR)
  seed('cause_probable', CAUSES_PROBABLES)
  seed('classe_therapeutique', CLASSES_THERAPEUTIQUES)
}

/** Upgrades a database created by an earlier version of the app without touching existing rows. */
function migrateSchema(): void {
  const tryAlter = (sql: string) => {
    try {
      db!.run(sql)
    } catch {
      // column already exists — database was created by a version that already has it
    }
  }
  tryAlter('ALTER TABLE evenements ADD COLUMN modifie_par TEXT')
  tryAlter('ALTER TABLE evenements ADD COLUMN supprime INTEGER DEFAULT 0')
  tryAlter('ALTER TABLE evenements ADD COLUMN supprime_le TEXT')
  tryAlter('ALTER TABLE evenements ADD COLUMN supprime_par TEXT')
  tryAlter('ALTER TABLE evenements ADD COLUMN motif_suppression TEXT')
  tryAlter('ALTER TABLE evenements ADD COLUMN ferme_le TEXT')
  tryAlter('ALTER TABLE evenements ADD COLUMN farpopq_avise INTEGER DEFAULT 0')
  tryAlter('ALTER TABLE evenements ADD COLUMN farpopq_avise_le TEXT')
  tryAlter('ALTER TABLE evenements ADD COLUMN farpopq_avise_par TEXT')
  tryAlter('ALTER TABLE evenements ADD COLUMN farpopq_resume TEXT')
  tryAlter('ALTER TABLE evenement_personnes ADD COLUMN signature_data TEXT')
  tryAlter('ALTER TABLE evenement_personnes ADD COLUMN signe_le TEXT')
}

export async function initDatabase(): Promise<void> {
  const wasmBinary = await fetchWasmBytes()
  const SQL = await initSqlJs({ wasmBinary })
  const existing = await persistence.load()
  db = existing ? new SQL.Database(existing) : new SQL.Database()
  db.run(SCHEMA_SQL)
  migrateSchema()
  seedDefaultOptions()
  persistNow()
}

function persistNow(): void {
  if (!db) return
  const bytes = db.export()
  lastSavePromise = persistence.save(bytes).catch((err) => {
    console.error('Échec de la sauvegarde du registre :', err)
  })
}

/** Awaited on app close so a quit right after the last edit never races the write to disk. */
export function waitForPendingSave(): Promise<void> {
  return lastSavePromise
}

export function exportDbBytes(): Uint8Array {
  if (!db) throw new Error('DB non initialisée')
  return db.export()
}

export async function replaceDatabaseFromBytes(bytes: Uint8Array): Promise<void> {
  const wasmBinary = await fetchWasmBytes()
  const SQL = await initSqlJs({ wasmBinary })
  db = new SQL.Database(bytes)
  db.run(SCHEMA_SQL)
  migrateSchema()
  seedDefaultOptions()
  persistNow()
}

function rowsToObjects<T = Record<string, unknown>>(sql: string, params: unknown[] = []): T[] {
  if (!db) throw new Error('DB non initialisée')
  const stmt = db.prepare(sql)
  stmt.bind(params as any)
  const out: T[] = []
  while (stmt.step()) {
    out.push(stmt.getAsObject() as T)
  }
  stmt.free()
  return out
}

// ---------- Personnel ----------

export function listPersonnel(includeInactifs = true): PersonnelMembre[] {
  const sql = includeInactifs
    ? 'SELECT * FROM personnel ORDER BY actif DESC, nom ASC'
    : 'SELECT * FROM personnel WHERE actif = 1 ORDER BY nom ASC'
  return rowsToObjects<PersonnelMembre>(sql)
}

export function upsertPersonnel(p: Partial<PersonnelMembre> & { nom: string; role: string }): PersonnelMembre {
  if (!db) throw new Error('DB non initialisée')
  if (p.id) {
    db.run('UPDATE personnel SET nom=?, role=?, actif=?, notes=? WHERE id=?', [p.nom, p.role, p.actif ?? 1, p.notes ?? null, p.id])
    persistNow()
    return { id: p.id, nom: p.nom, role: p.role, actif: p.actif ?? 1, notes: p.notes ?? null, cree_le: p.cree_le ?? nowIso() }
  }
  const id = uid()
  const cree_le = nowIso()
  db.run('INSERT INTO personnel (id, nom, role, actif, notes, cree_le) VALUES (?,?,?,?,?,?)', [id, p.nom, p.role, p.actif ?? 1, p.notes ?? null, cree_le])
  persistNow()
  return { id, nom: p.nom, role: p.role, actif: p.actif ?? 1, notes: p.notes ?? null, cree_le }
}

export function setPersonnelActif(id: string, actif: boolean): void {
  if (!db) throw new Error('DB non initialisée')
  db.run('UPDATE personnel SET actif=? WHERE id=?', [actif ? 1 : 0, id])
  persistNow()
}

// ---------- Options (listes déroulantes personnalisables) ----------

export function listOptions(categorie: string): OptionListe[] {
  return rowsToObjects<OptionListe>('SELECT * FROM listes_options WHERE categorie=? AND actif=1 ORDER BY ordre ASC, valeur ASC', [categorie])
}

/** Distinct medication names already used in this pharmacy's own registre — grows the autocomplete suggestions with real, locally-relevant history. */
export interface MedicamentConnu {
  label: string
  concentrationForme: string | null
  classe: string | null
  din: string | null
}

/** Medications already used in this pharmacy's own registre, with whichever DIN/classe/concentration was on the most recent entry — grows the autocomplete with real, locally-relevant history and lets picking one auto-fill the rest of the form. */
export function listMedicamentsConnus(): MedicamentConnu[] {
  const rows = rowsToObjects<{ medicament_nom: string; medicament_din: string | null; classe_therapeutique: string | null; concentration_forme: string | null }>(
    `SELECT medicament_nom, medicament_din, classe_therapeutique, concentration_forme, MAX(cree_le) as cree_le
     FROM evenements WHERE medicament_nom IS NOT NULL AND trim(medicament_nom) != ''
     GROUP BY medicament_nom ORDER BY medicament_nom ASC`
  )
  return rows.map((r) => ({
    label: r.medicament_nom,
    concentrationForme: r.concentration_forme,
    classe: r.classe_therapeutique,
    din: r.medicament_din
  }))
}

export function listAllOptions(): OptionListe[] {
  return rowsToObjects<OptionListe>('SELECT * FROM listes_options ORDER BY categorie ASC, ordre ASC, valeur ASC')
}

export function addOption(categorie: string, valeur: string): void {
  if (!db) throw new Error('DB non initialisée')
  const maxRow = rowsToObjects<{ m: number }>('SELECT COALESCE(MAX(ordre),0) as m FROM listes_options WHERE categorie=?', [categorie])
  const ordre = (maxRow[0]?.m ?? 0) + 1
  db.run('INSERT OR REPLACE INTO listes_options (categorie, valeur, actif, ordre) VALUES (?,?,1,?)', [categorie, valeur, ordre])
  persistNow()
}

export function setOptionActive(categorie: string, valeur: string, actif: boolean): void {
  if (!db) throw new Error('DB non initialisée')
  db.run('UPDATE listes_options SET actif=? WHERE categorie=? AND valeur=?', [actif ? 1 : 0, categorie, valeur])
  persistNow()
}

// ---------- Paramètres ----------

export function getParametre(cle: string, defaut = ''): string {
  const rows = rowsToObjects<{ valeur: string }>('SELECT valeur FROM parametres WHERE cle=?', [cle])
  return rows[0]?.valeur ?? defaut
}

export function setParametre(cle: string, valeur: string): void {
  if (!db) throw new Error('DB non initialisée')
  db.run('INSERT OR REPLACE INTO parametres (cle, valeur) VALUES (?,?)', [cle, valeur])
  persistNow()
}

// ---------- Utilisateurs (comptes et connexion) ----------

export function compterUtilisateurs(): number {
  const rows = rowsToObjects<{ c: number }>('SELECT COUNT(*) as c FROM utilisateurs')
  return rows[0]?.c ?? 0
}

export function listUtilisateurs(): Utilisateur[] {
  return rowsToObjects<Utilisateur>('SELECT id, nom, nom_utilisateur, role, actif, cree_le, dernier_acces FROM utilisateurs ORDER BY actif DESC, nom ASC')
}

interface UtilisateurAvecHash extends Utilisateur {
  salt: string
  hash: string
}

export function getUtilisateurParNomUtilisateur(nomUtilisateur: string): UtilisateurAvecHash | null {
  const rows = rowsToObjects<UtilisateurAvecHash>('SELECT * FROM utilisateurs WHERE lower(nom_utilisateur) = lower(?) AND actif = 1', [nomUtilisateur])
  return rows[0] ?? null
}

export function creerUtilisateur(input: { nom: string; nom_utilisateur: string; role: RoleUtilisateur; salt: string; hash: string }): Utilisateur {
  if (!db) throw new Error('DB non initialisée')
  const existing = rowsToObjects('SELECT id FROM utilisateurs WHERE lower(nom_utilisateur) = lower(?)', [input.nom_utilisateur])
  if (existing.length > 0) throw new Error("Ce nom d'utilisateur existe déjà.")
  const id = uid()
  const cree_le = nowIso()
  db.run('INSERT INTO utilisateurs (id, nom, nom_utilisateur, role, salt, hash, actif, cree_le) VALUES (?,?,?,?,?,?,1,?)', [
    id,
    input.nom,
    input.nom_utilisateur,
    input.role,
    input.salt,
    input.hash,
    cree_le
  ])
  persistNow()
  return { id, nom: input.nom, nom_utilisateur: input.nom_utilisateur, role: input.role, actif: 1, cree_le, dernier_acces: null }
}

export function setUtilisateurActif(id: string, actif: boolean): void {
  if (!db) throw new Error('DB non initialisée')
  db.run('UPDATE utilisateurs SET actif=? WHERE id=?', [actif ? 1 : 0, id])
  persistNow()
}

export function reinitialiserMotDePasse(id: string, salt: string, hash: string): void {
  if (!db) throw new Error('DB non initialisée')
  db.run('UPDATE utilisateurs SET salt=?, hash=? WHERE id=?', [salt, hash, id])
  persistNow()
}

export function enregistrerConnexion(id: string): void {
  if (!db) throw new Error('DB non initialisée')
  db.run('UPDATE utilisateurs SET dernier_acces=? WHERE id=?', [nowIso(), id])
  persistNow()
}

// ---------- Journal d'audit ----------

export interface NouvelAuditInput {
  utilisateur_id: string | null
  utilisateur_nom: string
  action: string
  cible_type: string
  cible_id?: string | null
  cible_libelle?: string | null
  details?: string | null
}

export function ajouterAudit(entry: NouvelAuditInput): void {
  if (!db) throw new Error('DB non initialisée')
  db.run('INSERT INTO audit_log (id, horodatage, utilisateur_id, utilisateur_nom, action, cible_type, cible_id, cible_libelle, details) VALUES (?,?,?,?,?,?,?,?,?)', [
    uid(),
    nowIso(),
    entry.utilisateur_id,
    entry.utilisateur_nom,
    entry.action,
    entry.cible_type,
    entry.cible_id ?? null,
    entry.cible_libelle ?? null,
    entry.details ?? null
  ])
  persistNow()
}

export interface FiltresAudit {
  utilisateur_nom?: string
  action?: string
  cible_type?: string
  cible_id?: string
  dateDebut?: string
  dateFin?: string
}

export function listAuditLog(filtres: FiltresAudit = {}, limite = 500): AuditEntry[] {
  const clauses: string[] = []
  const params: unknown[] = []
  if (filtres.utilisateur_nom) {
    clauses.push('utilisateur_nom = ?')
    params.push(filtres.utilisateur_nom)
  }
  if (filtres.action) {
    clauses.push('action = ?')
    params.push(filtres.action)
  }
  if (filtres.cible_type) {
    clauses.push('cible_type = ?')
    params.push(filtres.cible_type)
  }
  if (filtres.cible_id) {
    clauses.push('cible_id = ?')
    params.push(filtres.cible_id)
  }
  if (filtres.dateDebut) {
    clauses.push('horodatage >= ?')
    params.push(filtres.dateDebut)
  }
  if (filtres.dateFin) {
    clauses.push('horodatage <= ?')
    params.push(filtres.dateFin + 'T23:59:59.999Z')
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
  params.push(limite)
  return rowsToObjects<AuditEntry>(`SELECT * FROM audit_log ${where} ORDER BY horodatage DESC LIMIT ?`, params)
}

// ---------- Événements ----------

function nextNumero(): number {
  const rows = rowsToObjects<{ m: number }>('SELECT COALESCE(MAX(numero),0) as m FROM evenements')
  return (rows[0]?.m ?? 0) + 1
}

export interface NouvelEvenementInput {
  date_evenement: string
  heure_evenement?: string | null
  milieu: string
  succursale?: string | null
  etape_circuit: string
  type_erreur: string
  types_erreur_secondaires?: string[]
  gravite: string
  statut?: string
  patient_identifiant?: string | null
  medicament_nom?: string | null
  medicament_din?: string | null
  classe_therapeutique?: string | null
  concentration_forme?: string | null
  description: string
  cause_probable?: string[]
  mesures_correctives?: string | null
  divulgue_patient?: boolean
  divulgue_le?: string | null
  divulgue_par?: string | null
  farpopq_avise?: boolean
  farpopq_avise_le?: string | null
  farpopq_avise_par?: string | null
  cree_par?: string | null
  personnes?: { personnel_id?: string | null; nom_libre?: string | null; role_evenement: string }[]
}

export function creerEvenement(input: NouvelEvenementInput): string {
  if (!db) throw new Error('DB non initialisée')
  const id = uid()
  const cree_le = nowIso()
  const numero = nextNumero()
  db.run(
    `INSERT INTO evenements (
      id, numero, date_evenement, heure_evenement, date_declaration, milieu, succursale,
      etape_circuit, type_erreur, types_erreur_secondaires, gravite, statut,
      patient_identifiant, medicament_nom, medicament_din, classe_therapeutique, concentration_forme,
      description, cause_probable, mesures_correctives, divulgue_patient, divulgue_le, divulgue_par,
      farpopq_avise, farpopq_avise_le, farpopq_avise_par,
      cree_par, cree_le, modifie_le
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      id,
      numero,
      input.date_evenement,
      input.heure_evenement ?? null,
      cree_le,
      input.milieu,
      input.succursale ?? null,
      input.etape_circuit,
      input.type_erreur,
      JSON.stringify(input.types_erreur_secondaires ?? []),
      input.gravite,
      input.statut ?? 'Ouvert',
      input.patient_identifiant ?? null,
      input.medicament_nom ?? null,
      input.medicament_din ?? null,
      input.classe_therapeutique ?? null,
      input.concentration_forme ?? null,
      input.description,
      JSON.stringify(input.cause_probable ?? []),
      input.mesures_correctives ?? null,
      input.divulgue_patient ? 1 : 0,
      input.divulgue_le ?? null,
      input.divulgue_par ?? null,
      input.farpopq_avise ? 1 : 0,
      input.farpopq_avise_le ?? null,
      input.farpopq_avise_par ?? null,
      input.cree_par ?? null,
      cree_le,
      null
    ]
  )
  for (const p of input.personnes ?? []) {
    db.run('INSERT INTO evenement_personnes (id, evenement_id, personnel_id, nom_libre, role_evenement) VALUES (?,?,?,?,?)', [
      uid(),
      id,
      p.personnel_id ?? null,
      p.nom_libre ?? null,
      p.role_evenement
    ])
  }
  ajouterAudit({
    utilisateur_id: null,
    utilisateur_nom: input.cree_par || 'Inconnu',
    action: 'creation',
    cible_type: 'evenement',
    cible_id: id,
    cible_libelle: `Signalement #${numero}`,
    details: `Gravité ${input.gravite} — ${input.type_erreur}`
  })
  persistNow()
  return id
}

const CHAMPS_SUIVIS: { cle: keyof NouvelEvenementInput; label: string }[] = [
  { cle: 'date_evenement', label: 'Date' },
  { cle: 'milieu', label: 'Milieu' },
  { cle: 'etape_circuit', label: 'Étape' },
  { cle: 'type_erreur', label: "Type d'erreur" },
  { cle: 'gravite', label: 'Gravité' },
  { cle: 'statut', label: 'Statut' },
  { cle: 'medicament_nom', label: 'Médicament' },
  { cle: 'description', label: 'Description' },
  { cle: 'mesures_correctives', label: 'Mesures correctives' },
  { cle: 'divulgue_patient', label: 'Divulgation' },
  { cle: 'farpopq_avise', label: 'Avis FARPOPQ' }
]

const CHAMPS_BOOLEENS: (keyof NouvelEvenementInput)[] = ['divulgue_patient', 'farpopq_avise']

function diffEvenement(avant: Evenement, apres: NouvelEvenementInput): string {
  const changements: string[] = []
  for (const { cle, label } of CHAMPS_SUIVIS) {
    const estBooleen = CHAMPS_BOOLEENS.includes(cle)
    const avantVal = estBooleen ? ((avant as any)[cle] ? 'Oui' : 'Non') : String((avant as any)[cle] ?? '')
    const apresValRaw = (apres as any)[cle]
    const apresVal = estBooleen ? (apresValRaw ? 'Oui' : 'Non') : String(apresValRaw ?? '')
    if (avantVal !== apresVal) {
      if (cle === 'description' || cle === 'mesures_correctives') {
        changements.push(`${label} modifiée`)
      } else {
        changements.push(`${label} : ${avantVal || '—'} → ${apresVal || '—'}`)
      }
    }
  }
  return changements.length ? changements.join('; ') : 'Aucun changement de champ suivi'
}

export function mettreAJourEvenement(id: string, input: NouvelEvenementInput, utilisateur: string): void {
  if (!db) throw new Error('DB non initialisée')
  const avantRows = rowsToObjects<Evenement>('SELECT * FROM evenements WHERE id=?', [id])
  const avant = avantRows[0]
  db.run(
    `UPDATE evenements SET
      date_evenement=?, heure_evenement=?, milieu=?, succursale=?, etape_circuit=?, type_erreur=?,
      types_erreur_secondaires=?, gravite=?, statut=?, patient_identifiant=?, medicament_nom=?,
      medicament_din=?, classe_therapeutique=?, concentration_forme=?, description=?, cause_probable=?,
      mesures_correctives=?, divulgue_patient=?, divulgue_le=?, divulgue_par=?,
      farpopq_avise=?, farpopq_avise_le=?, farpopq_avise_par=?, modifie_le=?, modifie_par=?
    WHERE id=?`,
    [
      input.date_evenement,
      input.heure_evenement ?? null,
      input.milieu,
      input.succursale ?? null,
      input.etape_circuit,
      input.type_erreur,
      JSON.stringify(input.types_erreur_secondaires ?? []),
      input.gravite,
      input.statut ?? 'Ouvert',
      input.patient_identifiant ?? null,
      input.medicament_nom ?? null,
      input.medicament_din ?? null,
      input.classe_therapeutique ?? null,
      input.concentration_forme ?? null,
      input.description,
      JSON.stringify(input.cause_probable ?? []),
      input.mesures_correctives ?? null,
      input.divulgue_patient ? 1 : 0,
      input.divulgue_le ?? null,
      input.divulgue_par ?? null,
      input.farpopq_avise ? 1 : 0,
      input.farpopq_avise_le ?? null,
      input.farpopq_avise_par ?? null,
      nowIso(),
      utilisateur,
      id
    ]
  )
  // Merge rather than replace: a matched person keeps their row (and any electronic signature already collected on it).
  const existantes = rowsToObjects<PersonneImpliquee>('SELECT * FROM evenement_personnes WHERE evenement_id=?', [id])
  const conservees = new Set<string>()
  for (const p of input.personnes ?? []) {
    const match = existantes.find(
      (e) =>
        !conservees.has(e.id) &&
        (p.personnel_id ? e.personnel_id === p.personnel_id : !e.personnel_id && (e.nom_libre ?? '').trim().toLowerCase() === (p.nom_libre ?? '').trim().toLowerCase())
    )
    if (match) {
      conservees.add(match.id)
      db.run('UPDATE evenement_personnes SET personnel_id=?, nom_libre=?, role_evenement=? WHERE id=?', [p.personnel_id ?? null, p.nom_libre ?? null, p.role_evenement, match.id])
    } else {
      db.run('INSERT INTO evenement_personnes (id, evenement_id, personnel_id, nom_libre, role_evenement) VALUES (?,?,?,?,?)', [
        uid(),
        id,
        p.personnel_id ?? null,
        p.nom_libre ?? null,
        p.role_evenement
      ])
    }
  }
  const retirees = existantes.filter((e) => !conservees.has(e.id))
  for (const e of retirees) {
    db.run('DELETE FROM evenement_personnes WHERE id=?', [e.id])
  }
  if (avant) {
    ajouterAudit({
      utilisateur_id: null,
      utilisateur_nom: utilisateur,
      action: 'modification',
      cible_type: 'evenement',
      cible_id: id,
      cible_libelle: `Signalement #${avant.numero}`,
      details: diffEvenement(avant, input)
    })
  }
  persistNow()
}

export function setStatutEvenement(id: string, statut: string, utilisateur: string): void {
  if (!db) throw new Error('DB non initialisée')
  const rows = rowsToObjects<Evenement>('SELECT numero, statut FROM evenements WHERE id=?', [id])
  const avant = rows[0]
  const fermeLe = statut === 'Fermé' ? (avant?.statut === 'Fermé' ? undefined : nowIso()) : null
  if (fermeLe === undefined) {
    db.run('UPDATE evenements SET statut=?, modifie_le=?, modifie_par=? WHERE id=?', [statut, nowIso(), utilisateur, id])
  } else {
    db.run('UPDATE evenements SET statut=?, modifie_le=?, modifie_par=?, ferme_le=? WHERE id=?', [statut, nowIso(), utilisateur, fermeLe, id])
  }
  if (avant) {
    ajouterAudit({
      utilisateur_id: null,
      utilisateur_nom: utilisateur,
      action: 'changement_statut',
      cible_type: 'evenement',
      cible_id: id,
      cible_libelle: `Signalement #${avant.numero}`,
      details: `Statut : ${avant.statut} → ${statut}`
    })
  }
  persistNow()
}

/**
 * Marks the FARPOPQ notice as validated by the reviewing pharmacist (admin only, enforced in the UI) and
 * keeps a permanent copy of the exact summary they reviewed — the app never transmits anything itself,
 * this only records that a licensed professional signed off before sending it through FARPOPQ's own portal.
 */
export function validerAvisFarpopq(id: string, input: { avise_le: string; avise_par: string; resume: string }, utilisateur: string): void {
  if (!db) throw new Error('DB non initialisée')
  const rows = rowsToObjects<Evenement>('SELECT numero FROM evenements WHERE id=?', [id])
  const avant = rows[0]
  db.run('UPDATE evenements SET farpopq_avise=1, farpopq_avise_le=?, farpopq_avise_par=?, farpopq_resume=? WHERE id=?', [input.avise_le, input.avise_par, input.resume, id])
  ajouterAudit({
    utilisateur_id: null,
    utilisateur_nom: utilisateur,
    action: 'declaration_farpopq_validee',
    cible_type: 'evenement',
    cible_id: id,
    cible_libelle: avant ? `Signalement #${avant.numero}` : id,
    details: `Résumé validé par ${input.avise_par} — transmis via l'espace membre FARPOPQ`
  })
  persistNow()
}

/** Incidents are never hard-deleted — archiving is the only removal path, always logged and reversible. */
export function archiverEvenement(id: string, utilisateur: string, motif: string): void {
  if (!db) throw new Error('DB non initialisée')
  const rows = rowsToObjects<Evenement>('SELECT numero FROM evenements WHERE id=?', [id])
  const avant = rows[0]
  db.run('UPDATE evenements SET supprime=1, supprime_le=?, supprime_par=?, motif_suppression=? WHERE id=?', [nowIso(), utilisateur, motif, id])
  ajouterAudit({
    utilisateur_id: null,
    utilisateur_nom: utilisateur,
    action: 'archivage',
    cible_type: 'evenement',
    cible_id: id,
    cible_libelle: avant ? `Signalement #${avant.numero}` : id,
    details: `Motif : ${motif}`
  })
  persistNow()
}

export function restaurerEvenement(id: string, utilisateur: string): void {
  if (!db) throw new Error('DB non initialisée')
  const rows = rowsToObjects<Evenement>('SELECT numero FROM evenements WHERE id=?', [id])
  const avant = rows[0]
  db.run('UPDATE evenements SET supprime=0, supprime_le=NULL, supprime_par=NULL, motif_suppression=NULL WHERE id=?', [id])
  ajouterAudit({
    utilisateur_id: null,
    utilisateur_nom: utilisateur,
    action: 'restauration',
    cible_type: 'evenement',
    cible_id: id,
    cible_libelle: avant ? `Signalement #${avant.numero}` : id,
    details: null
  })
  persistNow()
}

function personnesForEvenement(evenementId: string): PersonneImpliquee[] {
  return rowsToObjects<PersonneImpliquee>(
    `SELECT ep.*, COALESCE(p.nom, ep.nom_libre, 'Inconnu') as nom_affiche
     FROM evenement_personnes ep LEFT JOIN personnel p ON p.id = ep.personnel_id
     WHERE ep.evenement_id=?`,
    [evenementId]
  )
}

export function getEvenement(id: string): EvenementAvecPersonnes | null {
  const rows = rowsToObjects<Evenement>('SELECT * FROM evenements WHERE id=?', [id])
  if (!rows[0]) return null
  return { ...rows[0], personnes: personnesForEvenement(id) }
}

/** Records an involved person's electronic signature (drawn image) as acknowledgment of the signalement — timestamped, never overwritten once set. */
export function signerPersonneImpliquee(personneId: string, signatureData: string, utilisateur: string): void {
  if (!db) throw new Error('DB non initialisée')
  const rows = rowsToObjects<PersonneImpliquee & { evenement_id: string }>(
    `SELECT ep.*, COALESCE(p.nom, ep.nom_libre, 'Inconnu') as nom_affiche FROM evenement_personnes ep LEFT JOIN personnel p ON p.id = ep.personnel_id WHERE ep.id=?`,
    [personneId]
  )
  const personne = rows[0]
  if (!personne) throw new Error('Personne introuvable')
  const signeLe = nowIso()
  db.run('UPDATE evenement_personnes SET signature_data=?, signe_le=? WHERE id=?', [signatureData, signeLe, personneId])
  const evtRows = rowsToObjects<Evenement>('SELECT numero FROM evenements WHERE id=?', [personne.evenement_id])
  ajouterAudit({
    utilisateur_id: null,
    utilisateur_nom: utilisateur,
    action: 'signature_personne',
    cible_type: 'evenement',
    cible_id: personne.evenement_id,
    cible_libelle: evtRows[0] ? `Signalement #${evtRows[0].numero}` : personne.evenement_id,
    details: `${personne.nom_affiche} (${personne.role_evenement}) a signé électroniquement`
  })
  persistNow()
}

export function listEvenements(filtres: FiltresRegistre = {}): EvenementAvecPersonnes[] {
  const clauses: string[] = []
  const params: unknown[] = []

  if (filtres.dateDebut) {
    clauses.push('e.date_evenement >= ?')
    params.push(filtres.dateDebut)
  }
  if (filtres.dateFin) {
    clauses.push('e.date_evenement <= ?')
    params.push(filtres.dateFin)
  }
  if (filtres.milieu) {
    clauses.push('e.milieu = ?')
    params.push(filtres.milieu)
  }
  if (filtres.etapeCircuit) {
    clauses.push('e.etape_circuit = ?')
    params.push(filtres.etapeCircuit)
  }
  if (filtres.typeErreur) {
    clauses.push('e.type_erreur = ?')
    params.push(filtres.typeErreur)
  }
  if (filtres.gravite) {
    clauses.push('e.gravite = ?')
    params.push(filtres.gravite)
  }
  if (filtres.statut) {
    clauses.push('e.statut = ?')
    params.push(filtres.statut)
  }
  if (filtres.succursale) {
    clauses.push('e.succursale = ?')
    params.push(filtres.succursale)
  }
  if (filtres.medicament) {
    clauses.push('e.medicament_nom LIKE ?')
    params.push(`%${filtres.medicament}%`)
  }
  if (filtres.recherche) {
    clauses.push('(e.description LIKE ? OR e.medicament_nom LIKE ? OR e.patient_identifiant LIKE ?)')
    params.push(`%${filtres.recherche}%`, `%${filtres.recherche}%`, `%${filtres.recherche}%`)
  }
  if (filtres.personnelId) {
    clauses.push('e.id IN (SELECT evenement_id FROM evenement_personnes WHERE personnel_id = ?)')
    params.push(filtres.personnelId)
  }
  if (filtres.archivesSeulement) {
    clauses.push('e.supprime = 1')
  } else if (!filtres.inclureArchives) {
    clauses.push('(e.supprime = 0 OR e.supprime IS NULL)')
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
  const rows = rowsToObjects<Evenement>(`SELECT e.* FROM evenements e ${where} ORDER BY e.date_evenement DESC, e.numero DESC`, params)
  return rows.map((r) => ({ ...r, personnes: personnesForEvenement(r.id) }))
}

export function countEvenements(): number {
  const rows = rowsToObjects<{ c: number }>('SELECT COUNT(*) as c FROM evenements WHERE supprime = 0 OR supprime IS NULL')
  return rows[0]?.c ?? 0
}

export function graviteLegend() {
  return GRAVITES
}

// ---------- Événements semblables (aide à la déclaration) ----------

export interface EvenementSemblable {
  id: string
  numero: number
  date_evenement: string
  type_erreur: string
  medicament_nom: string | null
  gravite: string
  memeJour: boolean
}

/** Repère les signalements récents partageant le type d'erreur ou le médicament — aide à éviter les doublons et à relier des cas similaires. */
export function listEvenementsSimilaires(input: { typeErreur?: string; medicamentNom?: string; dateEvenement?: string; excludeId?: string }, joursFenetre = 90): EvenementSemblable[] {
  if (!input.typeErreur && !input.medicamentNom) return []
  const seuil = new Date(Date.now() - joursFenetre * 86400000).toISOString().slice(0, 10)
  const clauses = ['(e.supprime = 0 OR e.supprime IS NULL)', 'e.date_evenement >= ?']
  const params: unknown[] = [seuil]
  const matchClauses: string[] = []
  if (input.typeErreur) {
    matchClauses.push('e.type_erreur = ?')
    params.push(input.typeErreur)
  }
  if (input.medicamentNom && input.medicamentNom.trim()) {
    matchClauses.push('lower(e.medicament_nom) = lower(?)')
    params.push(input.medicamentNom.trim())
  }
  clauses.push(`(${matchClauses.join(' OR ')})`)
  if (input.excludeId) {
    clauses.push('e.id != ?')
    params.push(input.excludeId)
  }
  const rows = rowsToObjects<Evenement>(
    `SELECT e.* FROM evenements e WHERE ${clauses.join(' AND ')} ORDER BY e.date_evenement DESC LIMIT 8`,
    params
  )
  return rows.map((r) => ({
    id: r.id,
    numero: r.numero,
    date_evenement: r.date_evenement,
    type_erreur: r.type_erreur,
    medicament_nom: r.medicament_nom,
    gravite: r.gravite,
    memeJour: r.date_evenement === input.dateEvenement && r.type_erreur === input.typeErreur
  }))
}

// ---------- Indicateurs de suivi ----------

export interface DossierStagnant {
  id: string
  numero: number
  statut: string
  type_erreur: string
  derniereActivite: string
  joursSansActivite: number
}

/** Dossiers actifs (non fermés, non archivés) sans mise à jour depuis plus de `seuilJours`. */
export function listDossiersStagnants(seuilJours = 14): DossierStagnant[] {
  const rows = rowsToObjects<Evenement>(
    `SELECT * FROM evenements WHERE statut != 'Fermé' AND (supprime = 0 OR supprime IS NULL) ORDER BY COALESCE(modifie_le, cree_le) ASC`
  )
  const now = Date.now()
  return rows
    .map((r) => {
      const derniereActivite = r.modifie_le ?? r.cree_le
      const jours = Math.floor((now - new Date(derniereActivite).getTime()) / 86400000)
      return { id: r.id, numero: r.numero, statut: r.statut, type_erreur: r.type_erreur, derniereActivite, joursSansActivite: jours }
    })
    .filter((d) => d.joursSansActivite >= seuilJours)
    .sort((a, b) => b.joursSansActivite - a.joursSansActivite)
}

// ---------- Actions correctives (suivi des mesures) ----------

export function listActionsCorrectives(evenementId: string): ActionCorrective[] {
  return rowsToObjects<ActionCorrective>('SELECT * FROM actions_correctives WHERE evenement_id=? ORDER BY complete ASC, echeance IS NULL, echeance ASC, cree_le ASC', [evenementId])
}

export function ajouterActionCorrective(evenementId: string, input: { description: string; responsable?: string | null; echeance?: string | null }, utilisateur: string): ActionCorrective {
  if (!db) throw new Error('DB non initialisée')
  const id = uid()
  const cree_le = nowIso()
  db.run('INSERT INTO actions_correctives (id, evenement_id, description, responsable, echeance, complete, cree_par, cree_le) VALUES (?,?,?,?,?,0,?,?)', [
    id,
    evenementId,
    input.description,
    input.responsable ?? null,
    input.echeance ?? null,
    utilisateur,
    cree_le
  ])
  const evtRows = rowsToObjects<Evenement>('SELECT numero FROM evenements WHERE id=?', [evenementId])
  ajouterAudit({
    utilisateur_id: null,
    utilisateur_nom: utilisateur,
    action: 'action_corrective_ajoutee',
    cible_type: 'evenement',
    cible_id: evenementId,
    cible_libelle: evtRows[0] ? `Signalement #${evtRows[0].numero}` : evenementId,
    details: input.description
  })
  persistNow()
  return { id, evenement_id: evenementId, description: input.description, responsable: input.responsable ?? null, echeance: input.echeance ?? null, complete: 0, complete_le: null, cree_par: utilisateur, cree_le }
}

export function toggleActionCorrective(id: string, complete: boolean, utilisateur: string): void {
  if (!db) throw new Error('DB non initialisée')
  const rows = rowsToObjects<ActionCorrective>('SELECT * FROM actions_correctives WHERE id=?', [id])
  const avant = rows[0]
  db.run('UPDATE actions_correctives SET complete=?, complete_le=? WHERE id=?', [complete ? 1 : 0, complete ? nowIso() : null, id])
  if (avant) {
    const evtRows = rowsToObjects<Evenement>('SELECT numero FROM evenements WHERE id=?', [avant.evenement_id])
    ajouterAudit({
      utilisateur_id: null,
      utilisateur_nom: utilisateur,
      action: complete ? 'action_corrective_completee' : 'action_corrective_reouverte',
      cible_type: 'evenement',
      cible_id: avant.evenement_id,
      cible_libelle: evtRows[0] ? `Signalement #${evtRows[0].numero}` : avant.evenement_id,
      details: avant.description
    })
  }
  persistNow()
}

export function supprimerActionCorrective(id: string, utilisateur: string): void {
  if (!db) throw new Error('DB non initialisée')
  const rows = rowsToObjects<ActionCorrective>('SELECT * FROM actions_correctives WHERE id=?', [id])
  const avant = rows[0]
  db.run('DELETE FROM actions_correctives WHERE id=?', [id])
  if (avant) {
    const evtRows = rowsToObjects<Evenement>('SELECT numero FROM evenements WHERE id=?', [avant.evenement_id])
    ajouterAudit({
      utilisateur_id: null,
      utilisateur_nom: utilisateur,
      action: 'action_corrective_retiree',
      cible_type: 'evenement',
      cible_id: avant.evenement_id,
      cible_libelle: evtRows[0] ? `Signalement #${evtRows[0].numero}` : avant.evenement_id,
      details: avant.description
    })
  }
  persistNow()
}
