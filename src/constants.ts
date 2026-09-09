import type { Gravite } from './types'

export const MILIEUX = [
  'Pharmacie communautaire',
  'Préparation magistrale / Fabrication',
  'Pharmacie spécialisée',
  "Pharmacie d'établissement (hôpital)"
]

export const ETAPES_CIRCUIT = [
  'Approvisionnement / réception de commande',
  "Réception et saisie de l'ordonnance",
  'Validation pharmaceutique (évaluation)',
  'Préparation (comptage, fabrication)',
  'Vérification finale / contrôle qualité',
  'Étiquetage',
  'Délivrance / remise au patient',
  'Livraison',
  'Administration',
  'Stockage / conservation / inventaire',
  'Facturation / assurance',
  'Autre'
]

export const TYPES_ERREUR = [
  'Omission (non délivré / non administré)',
  'Mauvais médicament',
  'Mauvaise dose / concentration',
  'Mauvaise forme galénique / format',
  "Mauvais patient / erreur d'identité",
  "Mauvaise voie d'administration",
  'Mauvaise posologie / fréquence',
  'Interaction médicamenteuse non détectée',
  'Allergie connue non détectée',
  "Erreur d'étiquetage",
  'Péremption',
  'Erreur de quantité',
  'Erreur de transcription / saisie',
  'Défaut de conservation / entreposage',
  'Erreur de livraison (adresse, destinataire, délai)',
  "Disparition / écart d'inventaire",
  "Non-respect d'une procédure / protocole",
  'Erreur de facturation / assurance',
  'Autre'
]

export const CAUSES_PROBABLES = [
  'Charge de travail élevée / manque de temps',
  'Interruption / distraction',
  "Ressemblance de noms ou d'emballages (LASA)",
  'Fatigue',
  "Manque de formation / nouvel employé",
  'Défaillance du système informatique',
  'Communication déficiente',
  'Étiquetage ambigu du fabricant',
  "Non-respect d'une procédure établie",
  'Absence de double vérification',
  'Éclairage / aménagement des lieux',
  'Autre'
]

export const CLASSES_THERAPEUTIQUES = [
  'Agonistes opiacés',
  'Analgésiques et antipyrétiques',
  'Benzodiazépines',
  'Antipsychotiques atypiques',
  'Insulines',
  'Anticonvulsivants',
  'Antidépresseurs',
  'Anticoagulants / héparines',
  'Nitrates',
  'Laxatifs / cathartiques',
  'Antibiotiques',
  'Anti-inflammatoires',
  'Cardiovasculaires (autres)',
  'Autre'
]

/**
 * Liste usuelle de médicaments fréquemment dispensés (noms commerciaux et génériques courants au Canada) —
 * sert uniquement de suggestion à la saisie ; non exhaustive et non liée aux DIN. L'historique du registre
 * (voir listMedicamentsConnus) complète cette liste avec les noms déjà utilisés dans cette pharmacie.
 */
export const MEDICAMENTS_COURANTS = [
  'Acétaminophène (Tylenol)',
  'Ibuprofène (Advil)',
  'Naproxène (Naprosyn / Aleve)',
  'Diclofénac (Voltaren)',
  'Célécoxib (Celebrex)',
  'Acide acétylsalicylique (Aspirin)',
  'Tramadol',
  'Morphine',
  'Hydromorphone (Dilaudid)',
  'Oxycodone (OxyNeo / Percocet)',
  'Fentanyl (timbre transdermique)',
  'Codéine',
  'Lorazépam (Ativan)',
  'Clonazépam (Rivotril)',
  'Diazépam (Valium)',
  'Zopiclone (Imovane)',
  'Gabapentine (Neurontin)',
  'Prégabaline (Lyrica)',
  'Quétiapine (Seroquel)',
  'Rispéridone (Risperdal)',
  'Olanzapine (Zyprexa)',
  'Sertraline (Zoloft)',
  'Escitalopram (Cipralex)',
  'Venlafaxine (Effexor)',
  'Trazodone',
  'Bupropion (Wellbutrin)',
  'Metformine (Apo-Metformin)',
  'Gliclazide (Diamicron)',
  'Empagliflozine (Jardiance)',
  'Sitagliptine (Januvia)',
  'Insuline Lantus',
  'Insuline NovoRapid',
  'Insuline Humalog',
  'Insuline Toujeo',
  'Lévothyroxine (Synthroid)',
  'Atorvastatine (Lipitor)',
  'Rosuvastatine (Crestor)',
  'Simvastatine (Zocor)',
  'Fénofibrate (Lipidil)',
  "Ramipril",
  'Périndopril (Coversyl)',
  'Losartan (Cozaar)',
  'Candésartan (Atacand)',
  'Valsartan (Diovan)',
  'Amlodipine (Norvasc)',
  'Métoprolol (Lopresor)',
  'Bisoprolol',
  'Carvédilol',
  'Diltiazem (Cardizem)',
  'Hydrochlorothiazide',
  'Furosémide (Lasix)',
  'Spironolactone',
  'Digoxine',
  'Amiodarone (Cordarone)',
  'Nitroglycérine (Nitro)',
  'Isosorbide mononitrate (Imdur)',
  'Warfarine (Coumadin)',
  'Apixaban (Eliquis)',
  'Rivaroxaban (Xarelto)',
  'Clopidogrel (Plavix)',
  'Salbutamol (Ventolin)',
  'Fluticasone (Flovent)',
  'Montélukast (Singulair)',
  'Oméprazole (Losec)',
  'Pantoprazole (Pantoloc / Tecta)',
  'Dompéridone',
  'Ondansétron (Zofran)',
  'Métoclopramide (Maxeran)',
  'Amoxicilline (Amoxil)',
  'Azithromycine (Zithromax)',
  'Ciprofloxacine (Cipro)',
  'Céphalexine (Keflex)',
  'Clindamycine',
  'Doxycycline',
  'Nitrofurantoïne (Macrobid)',
  'Métronidazole (Flagyl)',
  'Prednisone',
  'Tamsulosine (Flomax)',
  'Finastéride (Proscar)',
  'Sildénafil (Viagra)',
  'Tadalafil (Cialis)',
  'Allopurinol (Zyloprim)',
  'Colchicine',
  'Docusate (Colace)',
  'Séné (Senokot)',
  'Polyéthylène glycol (RestoraLAX)',
  'Bisacodyl (Dulcolax)',
  'Lopéramide (Imodium)',
  'Diphenhydramine (Benadryl)',
  'Cétirizine (Reactine)',
  'Loratadine (Claritin)',
  'Enoxaparine (Lovenox)'
]

export const ROLES_PERSONNEL = ['Pharmacien', 'ATP (Assistant technique)', 'Étudiant / Stagiaire', 'Livreur', 'Commis', 'Autre']

export const ROLES_EVENEMENT = ['A commis', 'A détecté', 'A corrigé', 'Impliqué'] as const

export const STATUTS = ['Ouvert', 'En analyse', 'Mesures en cours', 'Fermé']

export interface GraviteInfo {
  code: Gravite
  categorie: 'Incident' | 'Accident'
  label: string
  description: string
  couleur: string
  poids: number
}

export const GRAVITES: GraviteInfo[] = [
  { code: 'A', categorie: 'Incident', label: 'A — Situation à risque', description: "Circonstance ou situation à risque de provoquer un événement indésirable (le patient n'est pas touché).", couleur: '#0f9d53', poids: 1 },
  { code: 'B', categorie: 'Incident', label: 'B — Échappée belle', description: "Événement survenu, mais le patient n'a pas été touché (détecté à temps).", couleur: '#4f9d2f', poids: 2 },
  { code: 'C', categorie: 'Accident', label: 'C — Sans conséquence', description: 'A touché le patient, sans conséquence ni surveillance additionnelle requise.', couleur: '#a8a415', poids: 3 },
  { code: 'D', categorie: 'Accident', label: 'D — Surveillance requise', description: 'A touché le patient ; des vérifications additionnelles sont requises. Divulgation obligatoire.', couleur: '#d99a06', poids: 4 },
  { code: 'E1', categorie: 'Accident', label: 'E1 — Conséquence mineure', description: 'Conséquence temporaire mineure, interventions non spécialisées, sans hospitalisation.', couleur: '#e2790a', poids: 5 },
  { code: 'E2', categorie: 'Accident', label: 'E2 — Soins spécialisés', description: 'Conséquence temporaire nécessitant des soins spécialisés, sans impact sur la durée d\'hospitalisation.', couleur: '#e35f0e', poids: 6 },
  { code: 'F', categorie: 'Accident', label: 'F — Hospitalisation', description: 'Conséquence temporaire exigeant des soins spécialisés avec impact sur la durée d\'hospitalisation.', couleur: '#dc3d1f', poids: 7 },
  { code: 'G', categorie: 'Accident', label: 'G — Conséquence permanente', description: 'Conséquences permanentes sur les fonctions physiologiques, motrices, sensorielles ou cognitives.', couleur: '#c0201f', poids: 8 },
  { code: 'H', categorie: 'Accident', label: 'H — Danger vital', description: 'Conséquences nécessitant des interventions de maintien de la vie.', couleur: '#8f0f1e', poids: 9 },
  { code: 'I', categorie: 'Accident', label: 'I — Décès', description: "Conséquences ayant contribué au décès de l'usager.", couleur: '#3b0a10', poids: 10 }
]

export function graviteInfo(code: string): GraviteInfo {
  return GRAVITES.find((g) => g.code === code) ?? GRAVITES[0]
}

export const SEASON_LABELS: Record<string, string> = {
  Hiver: 'Hiver (déc.–fév.)',
  Printemps: 'Printemps (mars–mai)',
  Été: 'Été (juin–août)',
  Automne: 'Automne (sept.–nov.)'
}

export function seasonForMonth(monthIndex0: number): string {
  if ([11, 0, 1].includes(monthIndex0)) return 'Hiver'
  if ([2, 3, 4].includes(monthIndex0)) return 'Printemps'
  if ([5, 6, 7].includes(monthIndex0)) return 'Été'
  return 'Automne'
}

export function trimestreForMonth(monthIndex0: number): string {
  return `T${Math.floor(monthIndex0 / 3) + 1}`
}
