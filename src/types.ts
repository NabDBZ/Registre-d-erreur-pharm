export type Gravite = 'A' | 'B' | 'C' | 'D' | 'E1' | 'E2' | 'F' | 'G' | 'H' | 'I'

export type StatutEvenement = 'Ouvert' | 'En analyse' | 'Mesures en cours' | 'Fermé'

export interface PersonnelMembre {
  id: string
  nom: string
  role: string
  actif: number
  notes: string | null
  cree_le: string
}

export interface PersonneImpliquee {
  id: string
  evenement_id: string
  personnel_id: string | null
  nom_libre: string | null
  role_evenement: 'A commis' | 'A détecté' | 'A corrigé' | 'Impliqué'
  signature_data: string | null
  signe_le: string | null
  nom_affiche?: string
}

export interface Evenement {
  id: string
  numero: number
  date_evenement: string
  heure_evenement: string | null
  date_declaration: string
  milieu: string
  succursale: string | null
  etape_circuit: string
  type_erreur: string
  types_erreur_secondaires: string | null
  gravite: Gravite
  statut: StatutEvenement
  patient_identifiant: string | null
  medicament_nom: string | null
  medicament_din: string | null
  classe_therapeutique: string | null
  concentration_forme: string | null
  description: string
  cause_probable: string | null
  mesures_correctives: string | null
  divulgue_patient: number
  divulgue_le: string | null
  divulgue_par: string | null
  farpopq_avise: number
  farpopq_avise_le: string | null
  farpopq_avise_par: string | null
  farpopq_resume: string | null
  cree_par: string | null
  cree_le: string
  modifie_le: string | null
  modifie_par: string | null
  ferme_le: string | null
  supprime: number
  supprime_le: string | null
  supprime_par: string | null
  motif_suppression: string | null
}

export interface ActionCorrective {
  id: string
  evenement_id: string
  description: string
  responsable: string | null
  echeance: string | null
  complete: number
  complete_le: string | null
  cree_par: string | null
  cree_le: string
}

export interface EvenementAvecPersonnes extends Evenement {
  personnes: PersonneImpliquee[]
}

export interface OptionListe {
  categorie: string
  valeur: string
  actif: number
  ordre: number
}

export interface Parametre {
  cle: string
  valeur: string
}

export type RoleUtilisateur = 'Administrateur' | 'Utilisateur'

export interface Utilisateur {
  id: string
  nom: string
  nom_utilisateur: string
  role: RoleUtilisateur
  actif: number
  cree_le: string
  dernier_acces: string | null
}

export interface SessionUtilisateur {
  id: string
  nom: string
  nom_utilisateur: string
  role: RoleUtilisateur
}

export interface AuditEntry {
  id: string
  horodatage: string
  utilisateur_id: string | null
  utilisateur_nom: string
  action: string
  cible_type: string
  cible_id: string | null
  cible_libelle: string | null
  details: string | null
}

export interface FiltresRegistre {
  dateDebut?: string
  dateFin?: string
  milieu?: string
  etapeCircuit?: string
  typeErreur?: string
  gravite?: string
  statut?: string
  personnelId?: string
  medicament?: string
  succursale?: string
  recherche?: string
  inclureArchives?: boolean
  archivesSeulement?: boolean
}
