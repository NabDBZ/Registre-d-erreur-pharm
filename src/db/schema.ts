export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS personnel (
  id TEXT PRIMARY KEY,
  nom TEXT NOT NULL,
  role TEXT NOT NULL,
  actif INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  cree_le TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS evenements (
  id TEXT PRIMARY KEY,
  numero INTEGER,
  date_evenement TEXT NOT NULL,
  heure_evenement TEXT,
  date_declaration TEXT NOT NULL,
  milieu TEXT NOT NULL,
  succursale TEXT,
  etape_circuit TEXT NOT NULL,
  type_erreur TEXT NOT NULL,
  types_erreur_secondaires TEXT,
  gravite TEXT NOT NULL,
  statut TEXT NOT NULL DEFAULT 'Ouvert',
  patient_identifiant TEXT,
  medicament_nom TEXT,
  medicament_din TEXT,
  classe_therapeutique TEXT,
  concentration_forme TEXT,
  description TEXT NOT NULL,
  cause_probable TEXT,
  mesures_correctives TEXT,
  divulgue_patient INTEGER DEFAULT 0,
  divulgue_le TEXT,
  divulgue_par TEXT,
  cree_par TEXT,
  cree_le TEXT NOT NULL,
  modifie_le TEXT
);

CREATE TABLE IF NOT EXISTS evenement_personnes (
  id TEXT PRIMARY KEY,
  evenement_id TEXT NOT NULL,
  personnel_id TEXT,
  nom_libre TEXT,
  role_evenement TEXT NOT NULL,
  FOREIGN KEY (evenement_id) REFERENCES evenements(id) ON DELETE CASCADE,
  FOREIGN KEY (personnel_id) REFERENCES personnel(id)
);

CREATE TABLE IF NOT EXISTS parametres (
  cle TEXT PRIMARY KEY,
  valeur TEXT
);

CREATE TABLE IF NOT EXISTS listes_options (
  categorie TEXT NOT NULL,
  valeur TEXT NOT NULL,
  actif INTEGER DEFAULT 1,
  ordre INTEGER,
  PRIMARY KEY (categorie, valeur)
);

CREATE TABLE IF NOT EXISTS utilisateurs (
  id TEXT PRIMARY KEY,
  nom TEXT NOT NULL,
  nom_utilisateur TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'Utilisateur',
  salt TEXT NOT NULL,
  hash TEXT NOT NULL,
  actif INTEGER NOT NULL DEFAULT 1,
  cree_le TEXT NOT NULL,
  dernier_acces TEXT
);

CREATE TABLE IF NOT EXISTS actions_correctives (
  id TEXT PRIMARY KEY,
  evenement_id TEXT NOT NULL,
  description TEXT NOT NULL,
  responsable TEXT,
  echeance TEXT,
  complete INTEGER NOT NULL DEFAULT 0,
  complete_le TEXT,
  cree_par TEXT,
  cree_le TEXT NOT NULL,
  FOREIGN KEY (evenement_id) REFERENCES evenements(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  horodatage TEXT NOT NULL,
  utilisateur_id TEXT,
  utilisateur_nom TEXT NOT NULL,
  action TEXT NOT NULL,
  cible_type TEXT NOT NULL,
  cible_id TEXT,
  cible_libelle TEXT,
  details TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_horodatage ON audit_log(horodatage);
CREATE INDEX IF NOT EXISTS idx_audit_cible ON audit_log(cible_type, cible_id);
CREATE INDEX IF NOT EXISTS idx_evenements_date ON evenements(date_evenement);
CREATE INDEX IF NOT EXISTS idx_evenements_gravite ON evenements(gravite);
CREATE INDEX IF NOT EXISTS idx_evenements_milieu ON evenements(milieu);
CREATE INDEX IF NOT EXISTS idx_evenements_type ON evenements(type_erreur);
CREATE INDEX IF NOT EXISTS idx_evenement_personnes_evt ON evenement_personnes(evenement_id);
CREATE INDEX IF NOT EXISTS idx_actions_correctives_evt ON actions_correctives(evenement_id);
`
