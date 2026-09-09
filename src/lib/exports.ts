import * as XLSX from 'xlsx'
import type { EvenementAvecPersonnes } from '../types'
import { graviteInfo } from '../constants'
import { todayLocalIso } from './dates'

function triggerBrowserDownload(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

function flattenEvenement(e: EvenementAvecPersonnes) {
  const gi = graviteInfo(e.gravite)
  return {
    'N°': e.numero,
    'Date événement': e.date_evenement,
    Heure: e.heure_evenement ?? '',
    'Date déclaration': e.date_declaration.slice(0, 10),
    Milieu: e.milieu,
    Succursale: e.succursale ?? '',
    'Étape du circuit': e.etape_circuit,
    "Type d'erreur": e.type_erreur,
    Gravité: e.gravite,
    Catégorie: gi.categorie,
    Statut: e.statut,
    'Patient (identifiant)': e.patient_identifiant ?? '',
    Médicament: e.medicament_nom ?? '',
    DIN: e.medicament_din ?? '',
    'Classe thérapeutique': e.classe_therapeutique ?? '',
    'Concentration / forme': e.concentration_forme ?? '',
    Description: e.description,
    'Causes probables': (() => {
      try {
        return (JSON.parse(e.cause_probable ?? '[]') as string[]).join('; ')
      } catch {
        return ''
      }
    })(),
    'Mesures correctives': e.mesures_correctives ?? '',
    'Personnes impliquées': e.personnes.map((p) => `${p.nom_affiche} (${p.role_evenement})${p.signature_data ? ' [signé]' : ''}`).join('; '),
    'Divulgué au patient': e.divulgue_patient ? 'Oui' : 'Non',
    'Divulgué le': e.divulgue_le ?? '',
    'FARPOPQ avisée': e.farpopq_avise ? 'Oui' : 'Non',
    'FARPOPQ avisée le': e.farpopq_avise_le ?? '',
    'Créé le': e.cree_le.slice(0, 10)
  }
}

export async function exportCsv(evenements: EvenementAvecPersonnes[], filenameBase = 'registre-incidents'): Promise<void> {
  const rows = evenements.map(flattenEvenement)
  const headers = rows.length ? Object.keys(rows[0]) : []
  const escape = (v: unknown) => {
    const s = String(v ?? '')
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [headers.join(';'), ...rows.map((r) => headers.map((h) => escape((r as any)[h])).join(';'))]
  const csv = '﻿' + lines.join('\r\n')
  const filename = `${filenameBase}-${todayLocalIso()}.csv`

  if (window.api) {
    await window.api.exportFile(filename, [{ name: 'CSV', extensions: ['csv'] }], csv)
  } else {
    triggerBrowserDownload(filename, new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  }
}

export async function exportXlsx(evenements: EvenementAvecPersonnes[], filenameBase = 'registre-incidents'): Promise<void> {
  const rows = evenements.map(flattenEvenement)
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Registre')
  const filename = `${filenameBase}-${todayLocalIso()}.xlsx`

  if (window.api) {
    const arr = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
    await window.api.exportFile(filename, [{ name: 'Excel', extensions: ['xlsx'] }], arr)
  } else {
    XLSX.writeFile(wb, filename)
  }
}
