import { creerEvenement, type NouvelEvenementInput } from '../db/database'
import { todayLocalIso } from './dates'

/** Parses CSV text in the exact semicolon-delimited, quoted format produced by exportCsv (lib/exports.ts). */
function parseCsv(text: string): string[][] {
  const clean = text.replace(/^﻿/, '').replace(/\r\n/g, '\n')
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i]
    if (inQuotes) {
      if (c === '"') {
        if (clean[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ';') {
      row.push(field)
      field = ''
    } else if (c === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += c
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => r.some((v) => v.trim() !== ''))
}

export interface ResultatImport {
  total: number
  importes: number
  ignores: number
  erreurs: string[]
}

/**
 * Importe un historique CSV exporté par cette application (ou respectant les mêmes en-têtes).
 * Chaque ligne valide devient un nouveau signalement — utile pour numériser un registre papier
 * déjà transcrit dans un tableur avec ces colonnes.
 */
export function importerCsv(texte: string, utilisateur: string): ResultatImport {
  const rows = parseCsv(texte)
  if (rows.length === 0) return { total: 0, importes: 0, ignores: 0, erreurs: ["Fichier vide ou illisible."] }

  const headers = rows[0].map((h) => h.trim())
  const idx = (name: string) => headers.indexOf(name)
  const iMilieu = idx('Milieu')
  const iEtape = idx('Étape du circuit')
  const iType = idx("Type d'erreur")
  const iGravite = idx('Gravité')
  const iDescription = idx('Description')
  const iDate = idx('Date événement')

  if (iMilieu < 0 || iEtape < 0 || iType < 0 || iGravite < 0 || iDescription < 0) {
    return {
      total: 0,
      importes: 0,
      ignores: 0,
      erreurs: ['Colonnes obligatoires manquantes (Milieu, Étape du circuit, Type d\'erreur, Gravité, Description). Utilisez un fichier exporté par cette application.']
    }
  }

  const iHeure = idx('Heure')
  const iSuccursale = idx('Succursale')
  const iPatient = idx('Patient (identifiant)')
  const iMed = idx('Médicament')
  const iDin = idx('DIN')
  const iClasse = idx('Classe thérapeutique')
  const iConcentration = idx('Concentration / forme')
  const iCauses = idx('Causes probables')
  const iMesures = idx('Mesures correctives')
  const iPersonnes = idx('Personnes impliquées')
  const iDivulgue = idx('Divulgué au patient')
  const iDivulgueLe = idx('Divulgué le')
  const iFarpopq = idx('FARPOPQ avisée')
  const iFarpopqLe = idx('FARPOPQ avisée le')

  const dataRows = rows.slice(1)
  const erreurs: string[] = []
  let importes = 0

  dataRows.forEach((r, i) => {
    const ligne = i + 2
    const milieu = r[iMilieu]?.trim()
    const etape = r[iEtape]?.trim()
    const type_erreur = r[iType]?.trim()
    const gravite = r[iGravite]?.trim()
    const description = r[iDescription]?.trim()
    const date_evenement = iDate >= 0 ? r[iDate]?.trim() : ''

    if (!milieu || !etape || !type_erreur || !gravite || !description) {
      erreurs.push(`Ligne ${ligne} ignorée — champ obligatoire manquant.`)
      return
    }

    const input: NouvelEvenementInput = {
      date_evenement: /^\d{4}-\d{2}-\d{2}/.test(date_evenement) ? date_evenement.slice(0, 10) : todayLocalIso(),
      heure_evenement: iHeure >= 0 ? r[iHeure]?.trim() || null : null,
      milieu,
      succursale: iSuccursale >= 0 ? r[iSuccursale]?.trim() || null : null,
      etape_circuit: etape,
      type_erreur,
      gravite,
      patient_identifiant: iPatient >= 0 ? r[iPatient]?.trim() || null : null,
      medicament_nom: iMed >= 0 ? r[iMed]?.trim() || null : null,
      medicament_din: iDin >= 0 ? r[iDin]?.trim() || null : null,
      classe_therapeutique: iClasse >= 0 ? r[iClasse]?.trim() || null : null,
      concentration_forme: iConcentration >= 0 ? r[iConcentration]?.trim() || null : null,
      description,
      cause_probable: iCauses >= 0 ? (r[iCauses]?.split(';').map((s) => s.trim()).filter(Boolean) ?? []) : [],
      mesures_correctives: iMesures >= 0 ? r[iMesures]?.trim() || null : null,
      divulgue_patient: iDivulgue >= 0 ? /oui/i.test(r[iDivulgue] ?? '') : false,
      divulgue_le: iDivulgueLe >= 0 ? r[iDivulgueLe]?.trim() || null : null,
      farpopq_avise: iFarpopq >= 0 ? /oui/i.test(r[iFarpopq] ?? '') : false,
      farpopq_avise_le: iFarpopqLe >= 0 ? r[iFarpopqLe]?.trim() || null : null,
      cree_par: utilisateur,
      personnes:
        iPersonnes >= 0 && r[iPersonnes]?.trim()
          ? r[iPersonnes]
              .split(';')
              .map((s) => s.trim().replace(/\s*\[sign[ée]\]$/i, ''))
              .filter(Boolean)
              .map((entry) => {
                const m = entry.match(/^(.*)\(([^)]+)\)$/)
                return m ? { nom_libre: m[1].trim(), role_evenement: m[2].trim() } : { nom_libre: entry, role_evenement: 'Impliqué' }
              })
          : []
    }

    try {
      creerEvenement(input)
      importes++
    } catch (err: any) {
      erreurs.push(`Ligne ${ligne} ignorée — ${err?.message ?? err}`)
    }
  })

  return { total: dataRows.length, importes, ignores: dataRows.length - importes, erreurs }
}
