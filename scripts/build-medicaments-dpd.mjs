// Distills Health Canada's official Drug Product Database (marketed, human-use extract) into a
// per-product médicament suggestion list — brand + strength as the searchable label, with
// concentration/forme, therapeutic class (best-effort, from the WHO ATC code) and DIN attached so
// picking a suggestion can auto-fill the rest of the form. One-time offline build step, not a live
// API call — the app stays 100% offline.
// Source: https://www.canada.ca/en/health-canada/services/drugs-health-products/drug-products/drug-product-database/what-data-extract-drug-product-database.html
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SRC = path.join(__dirname, 'dpd-src')
const OUT = path.join(__dirname, '..', 'src', 'data', 'medicamentsDpd.json')

function parseCsvLine(line) {
  const out = []
  let field = ''
  let inQ = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (inQ) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          field += '"'
          i++
        } else inQ = false
      } else field += c
    } else if (c === '"') inQ = true
    else if (c === ',') {
      out.push(field)
      field = ''
    } else field += c
  }
  out.push(field)
  return out
}

function readRows(filename) {
  const text = fs.readFileSync(path.join(SRC, filename), 'utf-8')
  return text.split(/\r?\n/).filter(Boolean).map(parseCsvLine)
}

function capitaliserSegment(seg) {
  const m = seg.match(/^([^a-zA-Z]*)([a-zA-Z])(.*)$/)
  if (!m) return seg
  const [, prefixe, premiere, reste] = m
  return prefixe + premiere.toUpperCase() + reste.toLowerCase()
}

function capitaliserMot(tok) {
  if (/^\s+$/.test(tok) || tok === '') return tok
  if (/\d/.test(tok)) return tok
  if (tok.length <= 3 && tok === tok.toUpperCase()) return tok
  return tok.split('-').map(capitaliserSegment).join('-')
}

function normaliserNom(brut) {
  return brut
    .trim()
    .split(/(\s+)/)
    .map(capitaliserMot)
    .join('')
}

const UNITES_MINUSCULES = new Set(['MG', 'MCG', 'ML', 'G', '%', 'UNIT'])
function normaliserUnite(u) {
  if (!u) return ''
  return UNITES_MINUSCULES.has(u) ? (u === 'UNIT' ? 'unité' : u.toLowerCase()) : u
}

/** Best-effort mapping from a WHO ATC code to this app's fixed 13-option therapeutic-class dropdown.
 * Ordered most-specific first. Returns null (leave unset) rather than a guess when nothing confidently matches. */
const REGLES_CLASSE = [
  [/^A10A/, 'Insulines'],
  [/^A06A/, 'Laxatifs / cathartiques'],
  [/^N05BA|^N05CD/, 'Benzodiazépines'],
  [/^N05A/, 'Antipsychotiques atypiques'],
  [/^N06A/, 'Antidépresseurs'],
  [/^N03A/, 'Anticonvulsivants'],
  [/^N02A/, 'Agonistes opiacés'],
  [/^N02B/, 'Analgésiques et antipyrétiques'],
  [/^B01A/, 'Anticoagulants / héparines'],
  [/^C01DA/, 'Nitrates'],
  [/^J01/, 'Antibiotiques'],
  [/^M01A/, 'Anti-inflammatoires'],
  [/^C0[1-9]/, 'Cardiovasculaires (autres)']
]
function classifierAtc(atc) {
  if (!atc) return null
  for (const [re, classe] of REGLES_CLASSE) {
    if (re.test(atc)) return classe
  }
  // A known ATC code that just doesn't match one of the 13 specific buckets is a confident "Autre",
  // not an unknown — reserve null for the rare product with no classification data at all.
  return 'Autre'
}

// ---------- Charger et indexer chaque fichier source ----------

const drugRows = readRows('drug.txt')
const ingredRows = readRows('ingred.txt')
const formRows = readRows('form.txt')
const therRows = readRows('ther.txt')

const ingredParDrugCode = new Map()
for (const r of ingredRows) {
  const code = r[0]
  const strength = r[4]?.trim()
  const unit = normaliserUnite(r[5]?.trim())
  if (!strength) continue
  const liste = ingredParDrugCode.get(code) ?? []
  liste.push(`${strength} ${unit}`.trim())
  ingredParDrugCode.set(code, liste)
}

const formeParDrugCode = new Map()
for (const r of formRows) {
  const code = r[0]
  if (!formeParDrugCode.has(code)) formeParDrugCode.set(code, normaliserNom(r[2] ?? ''))
}

const atcParDrugCode = new Map()
for (const r of therRows) {
  const code = r[0]
  if (!atcParDrugCode.has(code)) atcParDrugCode.set(code, r[1]?.trim())
}

// ---------- Construire un enregistrement par produit (DRUG_CODE), usage humain seulement ----------

const vus = new Set()
const produits = []
for (const r of drugRows) {
  const [code, , classe, din, brandRaw] = r
  if (classe !== 'Human' || !brandRaw || !brandRaw.trim()) continue

  const marque = normaliserNom(brandRaw)
  const concentration = (ingredParDrugCode.get(code) ?? []).join(' / ')
  const forme = formeParDrugCode.get(code) ?? ''
  const classeTherapeutique = classifierAtc(atcParDrugCode.get(code))

  const label = concentration ? `${marque} ${concentration}` : marque
  const cle = label.toLowerCase()
  if (vus.has(cle)) continue
  vus.add(cle)

  produits.push({
    label,
    concentrationForme: [forme, concentration].filter(Boolean).join(' ').trim() || null,
    classe: classeTherapeutique,
    din: din || null
  })
}

produits.sort((a, b) => a.label.localeCompare(b.label, 'fr'))

fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, JSON.stringify(produits))
console.log(`${produits.length} produits distincts écrits dans ${OUT}`)
console.log(`Taille du fichier : ${(fs.statSync(OUT).size / 1024).toFixed(0)} Ko`)
console.log(`Avec classe thérapeutique déduite : ${produits.filter((p) => p.classe).length}`)
