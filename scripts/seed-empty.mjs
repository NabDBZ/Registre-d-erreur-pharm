// Generates a blank .sqlite database (schema + default dropdown options only, zero users/events) —
// restoring it via Paramètres brings the app back to its out-of-the-box "Première utilisation" state.
import initSqlJs from 'sql.js'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_PATH = process.argv[2] || path.join(__dirname, '..', 'reinitialisation-vierge.sqlite')

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

  const bytes = db.export()
  fs.writeFileSync(OUT_PATH, Buffer.from(bytes))
  console.log(`Base vierge générée : ${OUT_PATH}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
