// Generates a self-contained demo .sqlite database — fictional users, personnel and signalements
// covering every feature (signatures, actions correctives, FARPOPQ, archivage, récurrences, etc.)
// so the app can be shown in a live presentation without touching real data.
// Usage: node scripts/seed-demo.mjs [output-path]
import initSqlJs from 'sql.js'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_PATH = process.argv[2] || path.join(__dirname, '..', 'demo-presentation.sqlite')

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS personnel (
  id TEXT PRIMARY KEY, nom TEXT NOT NULL, role TEXT NOT NULL, actif INTEGER NOT NULL DEFAULT 1,
  notes TEXT, cree_le TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS evenements (
  id TEXT PRIMARY KEY, numero INTEGER, date_evenement TEXT NOT NULL, heure_evenement TEXT,
  date_declaration TEXT NOT NULL, milieu TEXT NOT NULL, succursale TEXT, etape_circuit TEXT NOT NULL,
  type_erreur TEXT NOT NULL, types_erreur_secondaires TEXT, gravite TEXT NOT NULL,
  statut TEXT NOT NULL DEFAULT 'Ouvert', patient_identifiant TEXT, medicament_nom TEXT,
  medicament_din TEXT, classe_therapeutique TEXT, concentration_forme TEXT, description TEXT NOT NULL,
  cause_probable TEXT, mesures_correctives TEXT, divulgue_patient INTEGER DEFAULT 0, divulgue_le TEXT,
  divulgue_par TEXT, cree_par TEXT, cree_le TEXT NOT NULL, modifie_le TEXT, modifie_par TEXT,
  supprime INTEGER DEFAULT 0, supprime_le TEXT, supprime_par TEXT, motif_suppression TEXT,
  ferme_le TEXT, farpopq_avise INTEGER DEFAULT 0, farpopq_avise_le TEXT, farpopq_avise_par TEXT
);
CREATE TABLE IF NOT EXISTS evenement_personnes (
  id TEXT PRIMARY KEY, evenement_id TEXT NOT NULL, personnel_id TEXT, nom_libre TEXT,
  role_evenement TEXT NOT NULL, signature_data TEXT, signe_le TEXT,
  FOREIGN KEY (evenement_id) REFERENCES evenements(id) ON DELETE CASCADE,
  FOREIGN KEY (personnel_id) REFERENCES personnel(id)
);
CREATE TABLE IF NOT EXISTS parametres (cle TEXT PRIMARY KEY, valeur TEXT);
CREATE TABLE IF NOT EXISTS listes_options (
  categorie TEXT NOT NULL, valeur TEXT NOT NULL, actif INTEGER DEFAULT 1, ordre INTEGER,
  PRIMARY KEY (categorie, valeur)
);
CREATE TABLE IF NOT EXISTS utilisateurs (
  id TEXT PRIMARY KEY, nom TEXT NOT NULL, nom_utilisateur TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'Utilisateur', salt TEXT NOT NULL, hash TEXT NOT NULL,
  actif INTEGER NOT NULL DEFAULT 1, cree_le TEXT NOT NULL, dernier_acces TEXT
);
CREATE TABLE IF NOT EXISTS actions_correctives (
  id TEXT PRIMARY KEY, evenement_id TEXT NOT NULL, description TEXT NOT NULL, responsable TEXT,
  echeance TEXT, complete INTEGER NOT NULL DEFAULT 0, complete_le TEXT, cree_par TEXT, cree_le TEXT NOT NULL,
  FOREIGN KEY (evenement_id) REFERENCES evenements(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY, horodatage TEXT NOT NULL, utilisateur_id TEXT, utilisateur_nom TEXT NOT NULL,
  action TEXT NOT NULL, cible_type TEXT NOT NULL, cible_id TEXT, cible_libelle TEXT, details TEXT
);
CREATE INDEX IF NOT EXISTS idx_audit_horodatage ON audit_log(horodatage);
CREATE INDEX IF NOT EXISTS idx_audit_cible ON audit_log(cible_type, cible_id);
CREATE INDEX IF NOT EXISTS idx_evenements_date ON evenements(date_evenement);
CREATE INDEX IF NOT EXISTS idx_evenement_personnes_evt ON evenement_personnes(evenement_id);
CREATE INDEX IF NOT EXISTS idx_actions_correctives_evt ON actions_correctives(evenement_id);
`

const MILIEUX = ['Pharmacie communautaire', 'Préparation magistrale / Fabrication', 'Pharmacie spécialisée', "Pharmacie d'établissement (hôpital)"]
const ETAPES_CIRCUIT = [
  'Approvisionnement / réception de commande', "Réception et saisie de l'ordonnance", 'Validation pharmaceutique (évaluation)',
  'Préparation (comptage, fabrication)', 'Vérification finale / contrôle qualité', 'Étiquetage',
  'Délivrance / remise au patient', 'Livraison', 'Administration', 'Stockage / conservation / inventaire',
  'Facturation / assurance', 'Autre'
]
const TYPES_ERREUR = [
  'Omission (non délivré / non administré)', 'Mauvais médicament', 'Mauvaise dose / concentration',
  'Mauvaise forme galénique / format', "Mauvais patient / erreur d'identité", "Mauvaise voie d'administration",
  'Mauvaise posologie / fréquence', 'Interaction médicamenteuse non détectée', 'Allergie connue non détectée',
  "Erreur d'étiquetage", 'Péremption', 'Erreur de quantité', 'Erreur de transcription / saisie',
  'Défaut de conservation / entreposage', 'Erreur de livraison (adresse, destinataire, délai)',
  "Disparition / écart d'inventaire", "Non-respect d'une procédure / protocole", 'Erreur de facturation / assurance', 'Autre'
]
const CAUSES_PROBABLES = [
  'Charge de travail élevée / manque de temps', 'Interruption / distraction', "Ressemblance de noms ou d'emballages (LASA)",
  'Fatigue', 'Manque de formation / nouvel employé', 'Défaillance du système informatique', 'Communication déficiente',
  'Étiquetage ambigu du fabricant', "Non-respect d'une procédure établie", 'Absence de double vérification',
  'Éclairage / aménagement des lieux', 'Autre'
]
const CLASSES_THERAPEUTIQUES = [
  'Agonistes opiacés', 'Analgésiques et antipyrétiques', 'Benzodiazépines', 'Antipsychotiques atypiques', 'Insulines',
  'Anticonvulsivants', 'Antidépresseurs', 'Anticoagulants / héparines', 'Nitrates', 'Laxatifs / cathartiques',
  'Antibiotiques', 'Anti-inflammatoires', 'Cardiovasculaires (autres)', 'Autre'
]

function uid() {
  return crypto.randomUUID()
}
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return { salt, hash }
}
function daysAgo(n, hour = 9, minute = 30) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(hour, minute, 0, 0)
  return d
}
function iso(d) {
  return d.toISOString()
}
function ymd(d) {
  return d.toISOString().slice(0, 10)
}
function signatureSvg(pathD) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="90"><path d="${pathD}" fill="none" stroke="#14201c" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`
  return 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64')
}
const SIGNATURES = [
  signatureSvg('M10 60 C 30 20, 45 20, 55 45 S 80 75, 95 40 S 120 15, 135 50 S 160 70, 175 35 T 210 45'),
  signatureSvg('M8 50 Q 25 15, 45 50 T 85 50 C 100 30, 110 65, 125 45 S 150 20, 165 55 T 205 40'),
  signatureSvg('M12 40 C 25 60, 40 15, 55 45 S 75 65, 90 30 Q 105 55, 120 40 T 160 45 Q 180 30, 205 50')
]

async function main() {
  const wasmBinary = fs.readFileSync(path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'))
  const SQL = await initSqlJs({ wasmBinary })
  const db = new SQL.Database()
  db.run(SCHEMA_SQL)

  const seed = (categorie, values) => values.forEach((v, i) => db.run('INSERT OR IGNORE INTO listes_options (categorie, valeur, actif, ordre) VALUES (?,?,1,?)', [categorie, v, i]))
  seed('milieu', MILIEUX)
  seed('etape_circuit', ETAPES_CIRCUIT)
  seed('type_erreur', TYPES_ERREUR)
  seed('cause_probable', CAUSES_PROBABLES)
  seed('classe_therapeutique', CLASSES_THERAPEUTIQUES)

  db.run('INSERT INTO parametres (cle, valeur) VALUES (?,?)', ['nom_pharmacie', 'Pharmacie Tremblay et Associés'])

  function audit({ horodatage, utilisateur_nom, action, cible_type, cible_id = null, cible_libelle = null, details = null }) {
    db.run('INSERT INTO audit_log (id, horodatage, utilisateur_id, utilisateur_nom, action, cible_type, cible_id, cible_libelle, details) VALUES (?,?,?,?,?,?,?,?,?)', [
      uid(), horodatage, null, utilisateur_nom, action, cible_type, cible_id, cible_libelle, details
    ])
  }

  // ---------- Utilisateurs (comptes de connexion) ----------
  const DEMO_PASSWORD = 'Demo1234'
  const utilisateurs = [
    { nom: 'Marie Tremblay', nom_utilisateur: 'mtremblay', role: 'Administrateur' },
    { nom: 'Philippe Gagnon', nom_utilisateur: 'pgagnon', role: 'Utilisateur' },
    { nom: 'Sarah Bouchard', nom_utilisateur: 'sbouchard', role: 'Utilisateur' }
  ]
  const uCreated = daysAgo(90, 8, 0)
  for (const u of utilisateurs) {
    const { salt, hash } = hashPassword(DEMO_PASSWORD)
    const id = uid()
    db.run('INSERT INTO utilisateurs (id, nom, nom_utilisateur, role, salt, hash, actif, cree_le, dernier_acces) VALUES (?,?,?,?,?,?,1,?,?)', [
      id, u.nom, u.nom_utilisateur, u.role, salt, hash, iso(uCreated), iso(daysAgo(1, 8, 15))
    ])
    audit({ horodatage: iso(uCreated), utilisateur_nom: 'Marie Tremblay', action: 'creation', cible_type: 'utilisateur', cible_id: id, cible_libelle: u.nom, details: u.role === 'Administrateur' ? 'Premier compte administrateur' : null })
  }
  audit({ horodatage: iso(daysAgo(1, 8, 15)), utilisateur_nom: 'Marie Tremblay', action: 'connexion', cible_type: 'utilisateur' })
  audit({ horodatage: iso(daysAgo(0, 7, 50)), utilisateur_nom: 'Philippe Gagnon', action: 'connexion', cible_type: 'utilisateur' })

  // ---------- Personnel (répertoire, distinct des comptes de connexion) ----------
  const personnelDef = [
    { nom: 'Marie Tremblay', role: 'Pharmacien' },
    { nom: 'Philippe Gagnon', role: 'Pharmacien' },
    { nom: 'Sarah Bouchard', role: 'ATP (Assistant technique)' },
    { nom: 'Éric Lavoie', role: 'Livreur' },
    { nom: 'Camille Roy', role: 'Étudiant / Stagiaire' }
  ]
  const personnel = {}
  for (const p of personnelDef) {
    const id = uid()
    const cree_le = iso(daysAgo(88, 8, 30))
    db.run('INSERT INTO personnel (id, nom, role, actif, notes, cree_le) VALUES (?,?,?,1,NULL,?)', [id, p.nom, p.role, cree_le])
    personnel[p.nom] = id
    audit({ horodatage: cree_le, utilisateur_nom: 'Marie Tremblay', action: 'creation_personnel', cible_type: 'personnel', cible_id: id, cible_libelle: p.nom })
  }

  // ---------- Signalements ----------
  let numero = 0
  function creerEvenement(input) {
    numero += 1
    const id = uid()
    const cree_le = iso(input.creeLe)
    db.run(
      `INSERT INTO evenements (
        id, numero, date_evenement, heure_evenement, date_declaration, milieu, succursale, etape_circuit,
        type_erreur, types_erreur_secondaires, gravite, statut, patient_identifiant, medicament_nom, medicament_din,
        classe_therapeutique, concentration_forme, description, cause_probable, mesures_correctives,
        divulgue_patient, divulgue_le, divulgue_par, cree_par, cree_le, modifie_le, modifie_par,
        supprime, supprime_le, supprime_par, motif_suppression, ferme_le, farpopq_avise, farpopq_avise_le, farpopq_avise_par
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        id, numero, ymd(input.creeLe), input.heure ?? null, cree_le, input.milieu, input.succursale ?? null, input.etape,
        input.typeErreur, JSON.stringify([]), input.gravite, input.statut ?? 'Ouvert', input.patientId ?? null,
        input.medicamentNom ?? null, input.medicamentDin ?? null, input.classe ?? null, input.concentration ?? null,
        input.description, JSON.stringify(input.causes ?? []), input.mesures ?? null,
        input.divulgue ? 1 : 0, input.divulgueLe ?? null, input.divulguePar ?? null,
        input.creePar, cree_le, input.modifieLe ? iso(input.modifieLe) : null, input.modifiePar ?? null,
        input.archive ? 1 : 0, input.archiveLe ? iso(input.archiveLe) : null, input.archivePar ?? null, input.motifArchive ?? null,
        input.fermeLe ? iso(input.fermeLe) : null, input.farpopq ? 1 : 0, input.farpopqLe ?? null, input.farpopqPar ?? null
      ]
    )
    audit({ horodatage: cree_le, utilisateur_nom: input.creePar, action: 'creation', cible_type: 'evenement', cible_id: id, cible_libelle: `Signalement #${numero}`, details: `Gravité ${input.gravite} — ${input.typeErreur}` })

    const personneIds = {}
    for (const p of input.personnes ?? []) {
      const pid = uid()
      personneIds[p.nom] = pid
      db.run('INSERT INTO evenement_personnes (id, evenement_id, personnel_id, nom_libre, role_evenement, signature_data, signe_le) VALUES (?,?,?,?,?,?,?)', [
        pid, id, personnel[p.nom] ?? null, personnel[p.nom] ? null : p.nom, p.role, p.signature ?? null, p.signeLe ? iso(p.signeLe) : null
      ])
      if (p.signature && p.signeLe) {
        audit({ horodatage: iso(p.signeLe), utilisateur_nom: input.creePar, action: 'signature_personne', cible_type: 'evenement', cible_id: id, cible_libelle: `Signalement #${numero}`, details: `${p.nom} (${p.role}) a signé électroniquement` })
      }
    }

    if (input.modifieLe) {
      audit({ horodatage: iso(input.modifieLe), utilisateur_nom: input.modifiePar ?? input.creePar, action: 'modification', cible_type: 'evenement', cible_id: id, cible_libelle: `Signalement #${numero}`, details: 'Description modifiée' })
    }
    if (input.fermeLe) {
      audit({ horodatage: iso(input.fermeLe), utilisateur_nom: input.creePar, action: 'changement_statut', cible_type: 'evenement', cible_id: id, cible_libelle: `Signalement #${numero}`, details: `Statut : ${input.statutAvantFermeture ?? 'En analyse'} → Fermé` })
    }
    if (input.archive) {
      audit({ horodatage: iso(input.archiveLe), utilisateur_nom: input.archivePar, action: 'archivage', cible_type: 'evenement', cible_id: id, cible_libelle: `Signalement #${numero}`, details: `Motif : ${input.motifArchive}` })
    }

    for (const a of input.actions ?? []) {
      const aid = uid()
      const aCreeLe = iso(a.creeLe)
      db.run('INSERT INTO actions_correctives (id, evenement_id, description, responsable, echeance, complete, complete_le, cree_par, cree_le) VALUES (?,?,?,?,?,?,?,?,?)', [
        aid, id, a.description, a.responsable ?? null, a.echeance ?? null, a.complete ? 1 : 0, a.completeLe ? iso(a.completeLe) : null, input.creePar, aCreeLe
      ])
      audit({ horodatage: aCreeLe, utilisateur_nom: input.creePar, action: 'action_corrective_ajoutee', cible_type: 'evenement', cible_id: id, cible_libelle: `Signalement #${numero}`, details: a.description })
      if (a.complete && a.completeLe) {
        audit({ horodatage: iso(a.completeLe), utilisateur_nom: a.responsable ?? input.creePar, action: 'action_corrective_completee', cible_type: 'evenement', cible_id: id, cible_libelle: `Signalement #${numero}`, details: a.description })
      }
    }
    return id
  }

  creerEvenement({
    creeLe: daysAgo(50, 10, 15), etape: 'Vérification finale / contrôle qualité', milieu: MILIEUX[0],
    typeErreur: "Non-respect d'une procédure / protocole", gravite: 'B', medicamentNom: 'Apo-Metformin 850mg',
    description: "Un comprimé de 850 mg a été préparé au lieu de la dose prescrite de 500 mg. Détecté par l'ATP lors du contrôle de qualité, avant la remise au patient.",
    causes: ["Ressemblance de noms ou d'emballages (LASA)"], creePar: 'Sarah Bouchard', statut: 'Fermé',
    fermeLe: daysAgo(48, 14, 0), statutAvantFermeture: 'En analyse',
    personnes: [{ nom: 'Sarah Bouchard', role: 'A détecté' }, { nom: 'Philippe Gagnon', role: 'A commis' }],
    actions: [{ description: 'Affichage d\'un rappel au poste de vérification sur le double contrôle des doses de metformine', responsable: 'Sarah Bouchard', creeLe: daysAgo(49, 9, 0), complete: true, completeLe: daysAgo(47, 16, 0) }]
  })

  creerEvenement({
    creeLe: daysAgo(45, 13, 40), etape: 'Délivrance / remise au patient', milieu: MILIEUX[0],
    typeErreur: 'Mauvaise dose / concentration', gravite: 'D', medicamentNom: 'Apo-Metformin 850mg', patientId: 'J.T. — dossier 48213',
    description: 'Le patient a reçu 30 comprimés à 850 mg au lieu de 500 mg prescrits. Erreur remarquée par le patient lui-même trois jours plus tard ; retour à la pharmacie pour vérification.',
    causes: ['Charge de travail élevée / manque de temps'], creePar: 'Philippe Gagnon', statut: 'Fermé',
    fermeLe: daysAgo(40, 11, 0), statutAvantFermeture: 'Mesures en cours',
    divulgue: true, divulgueLe: ymd(daysAgo(45)), divulguePar: 'Philippe Gagnon',
    personnes: [{ nom: 'Philippe Gagnon', role: 'A commis', signature: SIGNATURES[0], signeLe: daysAgo(44, 9, 5) }, { nom: 'Sarah Bouchard', role: 'A détecté' }],
    mesures: "Appel au patient pour confirmer l'état clinique ; ajustement immédiat de la médication."
  })

  creerEvenement({
    creeLe: daysAgo(40, 15, 0), etape: 'Livraison', milieu: MILIEUX[0],
    typeErreur: "Non-respect d'une procédure / protocole", gravite: 'A',
    description: 'Livraison déposée à une mauvaise adresse (numéro civique voisin) ; récupérée le jour même, aucun impact sur le patient.',
    causes: ['Interruption / distraction'], creePar: 'Éric Lavoie', statut: 'Ouvert',
    personnes: [{ nom: 'Éric Lavoie', role: 'A commis' }]
  })

  creerEvenement({
    creeLe: daysAgo(35, 10, 30), etape: 'Validation pharmaceutique (évaluation)', milieu: MILIEUX[0],
    typeErreur: 'Allergie connue non détectée', gravite: 'E2', medicamentNom: 'Amoxicilline 500mg', classe: 'Antibiotiques',
    description: "Une allergie connue à la pénicilline, consignée au dossier, n'a pas été relevée lors de la validation. Le patient a présenté une réaction cutanée légère quelques heures après la prise ; dirigé vers une clinique sans hospitalisation.",
    causes: ['Communication déficiente'], creePar: 'Philippe Gagnon', statut: 'Fermé',
    fermeLe: daysAgo(32, 9, 30), statutAvantFermeture: 'Mesures en cours',
    divulgue: true, divulgueLe: ymd(daysAgo(35)), divulguePar: 'Philippe Gagnon',
    farpopq: true, farpopqLe: ymd(daysAgo(34)), farpopqPar: 'Marie Tremblay',
    personnes: [{ nom: 'Philippe Gagnon', role: 'A commis', signature: SIGNATURES[1], signeLe: daysAgo(34, 8, 45) }, { nom: 'Marie Tremblay', role: 'A corrigé' }],
    mesures: "Rencontre avec le pharmacien concerné ; rappel sur la consultation systématique du profil d'allergies avant validation."
  })

  creerEvenement({
    creeLe: daysAgo(30, 11, 10), etape: 'Préparation (comptage, fabrication)', milieu: MILIEUX[0],
    typeErreur: 'Mauvais médicament', gravite: 'B', medicamentNom: 'Apo-Metformin 850mg',
    description: "Une plaquette d'Apo-Metformin 850 mg a été saisie au lieu de la 500 mg en raison de la ressemblance des emballages. Détecté à la vérification finale.",
    causes: ["Ressemblance de noms ou d'emballages (LASA)"], creePar: 'Sarah Bouchard', statut: 'En analyse',
    personnes: [{ nom: 'Sarah Bouchard', role: 'A commis' }]
  })

  creerEvenement({
    creeLe: daysAgo(25, 9, 50), etape: 'Validation pharmaceutique (évaluation)', milieu: MILIEUX[3],
    typeErreur: 'Interaction médicamenteuse non détectée', gravite: 'F', medicamentNom: 'Warfarine 5mg', classe: 'Anticoagulants / héparines',
    description: "Une interaction significative entre warfarine et un anti-inflammatoire nouvellement prescrit n'a pas été détectée lors de la validation. Le patient a été hospitalisé 2 jours pour surveillance de l'INR.",
    causes: ['Défaillance du système informatique', 'Charge de travail élevée / manque de temps'], creePar: 'Philippe Gagnon', statut: 'Mesures en cours',
    divulgue: true, divulgueLe: ymd(daysAgo(25)), divulguePar: 'Marie Tremblay',
    farpopq: true, farpopqLe: ymd(daysAgo(24)), farpopqPar: 'Marie Tremblay',
    personnes: [{ nom: 'Philippe Gagnon', role: 'A commis' }, { nom: 'Marie Tremblay', role: 'A détecté' }],
    mesures: "Révision de la configuration des alertes d'interactions dans le système ; formation d'appoint pour l'équipe.",
    actions: [
      { description: 'Formation complémentaire sur les interactions à risque élevé (anticoagulants)', responsable: 'Philippe Gagnon', creeLe: daysAgo(24, 10, 0), echeance: ymd(daysAgo(5)), complete: false },
      { description: "Reconfigurer le seuil d'alerte système pour warfarine + AINS", responsable: 'Marie Tremblay', creeLe: daysAgo(24, 10, 5), echeance: ymd(daysAgo(-10)), complete: false }
    ]
  })

  creerEvenement({
    creeLe: daysAgo(20, 14, 20), etape: 'Vérification finale / contrôle qualité', milieu: MILIEUX[0],
    typeErreur: "Non-respect d'une procédure / protocole", gravite: 'A',
    description: 'Étape de double vérification omise sur une préparation à faible risque ; repéré lors de la révision hebdomadaire des dossiers.',
    causes: ["Non-respect d'une procédure établie"], creePar: 'Camille Roy', statut: 'Ouvert',
    personnes: [{ nom: 'Camille Roy', role: 'A commis' }]
  })

  creerEvenement({
    creeLe: daysAgo(18, 16, 0), etape: 'Étiquetage', milieu: MILIEUX[0],
    typeErreur: "Erreur d'étiquetage", gravite: 'B',
    description: "La posologie inscrite sur l'étiquette ne correspondait pas à l'ordonnance (fréquence). Détectée par le patient à la maison ; aucune dose prise avant correction.",
    causes: ['Interruption / distraction'], creePar: 'Sarah Bouchard', statut: 'Ouvert',
    personnes: [{ nom: 'Sarah Bouchard', role: 'A commis' }]
  })

  creerEvenement({
    creeLe: daysAgo(14, 10, 45), etape: "Réception et saisie de l'ordonnance", milieu: MILIEUX[0],
    typeErreur: 'Erreur de quantité', gravite: 'C', medicamentNom: 'Lorazépam 1mg', classe: 'Benzodiazépines',
    description: "Quantité saisie de 90 comprimés au lieu de 30. Remarqué à la délivrance ; quantité corrigée avant remise au patient.",
    causes: ['Fatigue'], creePar: 'Philippe Gagnon', statut: 'Ouvert',
    personnes: [{ nom: 'Philippe Gagnon', role: 'A détecté' }]
  })

  creerEvenement({
    creeLe: daysAgo(10, 13, 15), etape: 'Délivrance / remise au patient', milieu: MILIEUX[0],
    typeErreur: "Mauvais patient / erreur d'identité", gravite: 'D', patientId: 'S.L. — dossier 51820',
    description: "Une prescription a été remise à un patient portant un nom similaire à celui du destinataire prévu. L'erreur a été identifiée avant toute prise grâce à la double vérification d'identité à la caisse.",
    causes: ["Ressemblance de noms ou d'emballages (LASA)", 'Communication déficiente'], creePar: 'Sarah Bouchard', statut: 'En analyse',
    divulgue: true, divulgueLe: ymd(daysAgo(10)), divulguePar: 'Marie Tremblay',
    personnes: [{ nom: 'Marie Tremblay', role: 'A détecté' }, { nom: 'Sarah Bouchard', role: 'A commis', signature: SIGNATURES[2], signeLe: daysAgo(9, 8, 30) }]
  })

  creerEvenement({
    creeLe: daysAgo(6, 15, 40), etape: 'Livraison', milieu: MILIEUX[0],
    typeErreur: 'Erreur de livraison (adresse, destinataire, délai)', gravite: 'B',
    description: 'Retard de livraison de 24 heures pour un renouvellement de médication de maintien. Client avisé ; aucune rupture de traitement.',
    causes: ['Autre'], creePar: 'Éric Lavoie', statut: 'Ouvert',
    personnes: [{ nom: 'Éric Lavoie', role: 'A commis' }]
  })

  creerEvenement({
    creeLe: daysAgo(3, 9, 0), etape: 'Stockage / conservation / inventaire', milieu: MILIEUX[0],
    typeErreur: 'Défaut de conservation / entreposage', gravite: 'E1', medicamentNom: 'Insuline Lantus', classe: 'Insulines',
    description: "Une panne du réfrigérateur no 2 pendant la nuit a exposé plusieurs stylos d'insuline à une température hors normes. Un patient a reçu une dose d'un stylo potentiellement compromis avant que l'écart ne soit détecté ; suivi clinique léger requis.",
    causes: ['Défaillance du système informatique'], creePar: 'Camille Roy', statut: 'Ouvert',
    personnes: [{ nom: 'Camille Roy', role: 'A détecté' }, { nom: 'Marie Tremblay', role: 'A corrigé' }],
    actions: [{ description: 'Vérifier et documenter la chaîne de froid du réfrigérateur no 2 (rapport technicien)', responsable: 'Camille Roy', creeLe: daysAgo(3, 9, 30), echeance: ymd(daysAgo(-3)), complete: false }]
  })

  creerEvenement({
    creeLe: daysAgo(60, 11, 0), etape: 'Facturation / assurance', milieu: MILIEUX[0],
    typeErreur: 'Erreur de transcription / saisie', gravite: 'B',
    description: "Signalement créé en double lors d'une saisie initiale ; conservé à titre de preuve, retiré du registre actif.",
    causes: ['Autre'], creePar: 'Philippe Gagnon', statut: 'Fermé',
    fermeLe: daysAgo(58, 10, 0), statutAvantFermeture: 'Ouvert',
    archive: true, archiveLe: daysAgo(57, 9, 0), archivePar: 'Marie Tremblay', motifArchive: 'Doublon avec le signalement #2 (test de démonstration)',
    personnes: [{ nom: 'Philippe Gagnon', role: 'A commis' }]
  })

  const bytes = db.export()
  fs.writeFileSync(OUT_PATH, Buffer.from(bytes))
  console.log(`Base de démonstration générée : ${OUT_PATH}`)
  console.log(`${numero} signalements, ${personnelDef.length} membres du personnel, ${utilisateurs.length} comptes utilisateurs.`)
  console.log(`Mot de passe pour tous les comptes de démonstration : ${DEMO_PASSWORD}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
