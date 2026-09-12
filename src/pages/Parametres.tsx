import { useEffect, useRef, useState } from 'react'
import { Save, DownloadCloud, UploadCloud, Plus, X, FolderOpen, ShieldCheck, History, FileUp } from 'lucide-react'
import { getParametre, setParametre, listAllOptions, addOption, setOptionActive, exportDbBytes, replaceDatabaseFromBytes } from '../db/database'
import { Card, PageHeader, Button, Input, Field } from '../components/ui'
import { useToast } from '../lib/toast'
import { importerCsv, type ResultatImport } from '../lib/importCsv'
import { useAuth } from '../lib/AuthContext'
import { todayLocalIso } from '../lib/dates'

const CATEGORIES: { key: string; label: string }[] = [
  { key: 'milieu', label: 'Milieux de pharmacie' },
  { key: 'etape_circuit', label: 'Étapes du circuit du médicament' },
  { key: 'type_erreur', label: "Types d'erreur" },
  { key: 'cause_probable', label: 'Causes probables' },
  { key: 'classe_therapeutique', label: 'Classes thérapeutiques' }
]

export default function Parametres({ onPharmacyNameChange }: { onPharmacyNameChange: (nom: string) => void }) {
  const { session } = useAuth()
  const { push } = useToast()
  const [nomPharmacie, setNomPharmacie] = useState(getParametre('nom_pharmacie', ''))
  const [savedMsg, setSavedMsg] = useState('')
  const [version, setVersion] = useState(0)
  const [restoring, setRestoring] = useState(false)
  const [restoreMsg, setRestoreMsg] = useState('')
  const [appInfo, setAppInfo] = useState<{ version: string; dbPath: string } | null>(null)
  const [importing, setImporting] = useState(false)
  const [resultatImport, setResultatImport] = useState<ResultatImport | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const csvInputRef = useRef<HTMLInputElement>(null)

  const options = listAllOptions()

  useEffect(() => {
    window.api?.getAppInfo().then(setAppInfo)
  }, [])

  function handleSaveInfo(e: React.FormEvent) {
    e.preventDefault()
    setParametre('nom_pharmacie', nomPharmacie)
    onPharmacyNameChange(nomPharmacie)
    setSavedMsg('Enregistré')
    push('Informations de la pharmacie enregistrées.')
    setTimeout(() => setSavedMsg(''), 2000)
  }

  async function handleBackup() {
    const bytes = exportDbBytes()
    const filename = `sauvegarde-registre-${todayLocalIso()}.sqlite`
    if (window.api) {
      await window.api.exportFile(filename, [{ name: 'Base de données', extensions: ['sqlite'] }], bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer)
    } else {
      const blob = new Blob([bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer], { type: 'application/octet-stream' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 2000)
    }
    push('Copie de sauvegarde enregistrée.')
  }

  function handleRestoreClick() {
    fileInputRef.current?.click()
  }

  async function handleFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setRestoring(true)
    setRestoreMsg('')
    try {
      const buffer = await file.arrayBuffer()
      await replaceDatabaseFromBytes(new Uint8Array(buffer))
      setRestoreMsg('Restauration réussie. Rechargement…')
      setTimeout(() => window.location.reload(), 1200)
    } catch (err: any) {
      setRestoreMsg(`Erreur : fichier invalide (${err?.message ?? err})`)
    } finally {
      setRestoring(false)
      e.target.value = ''
    }
  }

  function handleImportClick() {
    setResultatImport(null)
    csvInputRef.current?.click()
  }

  async function handleCsvChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setResultatImport(null)
    try {
      const texte = await file.text()
      const resultat = importerCsv(texte, session.nom)
      setResultatImport(resultat)
      setVersion((v) => v + 1)
      if (resultat.importes > 0) push(`${resultat.importes} signalement${resultat.importes > 1 ? 's' : ''} importé${resultat.importes > 1 ? 's' : ''}.`)
      if (resultat.erreurs.length > 0) push(`${resultat.erreurs.length} ligne(s) ignorée(s) — voir le détail.`, 'warn')
    } catch (err: any) {
      setResultatImport({ total: 0, importes: 0, ignores: 0, erreurs: [`Échec de la lecture du fichier : ${err?.message ?? err}`] })
    } finally {
      setImporting(false)
      e.target.value = ''
    }
  }

  return (
    <div>
      <PageHeader kicker="Configuration" title="Paramètres" subtitle="Configurez la pharmacie, les listes personnalisées et vos sauvegardes." />

      <div className="grid grid-cols-2 gap-5 mb-5">
        <Card className="p-6">
          <h3 className="kicker text-ardoise-500 mb-4">Informations de la pharmacie</h3>
          <form onSubmit={handleSaveInfo}>
            <Field label="Nom de la pharmacie" hint="Affiché dans la barre latérale et les exports.">
              <Input value={nomPharmacie} onChange={(e) => setNomPharmacie(e.target.value)} placeholder="Ex. : Pharmacie Tremblay et associés" />
            </Field>
            <div className="flex items-center gap-3">
              <Button type="submit" size="sm">
                <Save size={15} /> Enregistrer
              </Button>
              {savedMsg && <span className="text-[13px] text-sarcelle-600">{savedMsg}</span>}
            </div>
          </form>
        </Card>

        <Card className="p-6">
          <h3 className="kicker text-ardoise-500 mb-2">Sauvegarde et restauration</h3>
          <p className="text-[13px] text-ardoise-500 mb-4">
            Toutes les données sont stockées localement sur cet ordinateur. Faites des copies de sauvegarde régulières sur une clé USB ou un lecteur réseau.
          </p>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={handleBackup}>
              <DownloadCloud size={15} /> Sauvegarder une copie
            </Button>
            <Button variant="secondary" size="sm" onClick={handleRestoreClick} disabled={restoring}>
              <UploadCloud size={15} /> Restaurer depuis un fichier
            </Button>
            <input ref={fileInputRef} type="file" accept=".sqlite,.db" className="hidden" onChange={handleFileChosen} />
          </div>
          {restoreMsg && <p className="text-[12px] text-ardoise-500 mt-3">{restoreMsg}</p>}
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-ligne">
            <History size={14} className="text-ardoise-500 shrink-0" />
            <p className="text-[12px] text-ardoise-500 flex-1">
              Une copie automatique est aussi conservée à chaque ouverture de l'application (10 dernières copies gardées).
            </p>
            {window.api && (
              <Button variant="ghost" size="sm" onClick={() => window.api?.revealBackupsFolder()}>
                <FolderOpen size={13} /> Ouvrir le dossier
              </Button>
            )}
          </div>
        </Card>
      </div>

      <Card className="p-6 mb-5">
        <h3 className="kicker text-ardoise-500 mb-1">Importer un historique (CSV)</h3>
        <p className="text-[13px] text-ardoise-500 mb-4">
          Numérisez un registre papier déjà transcrit dans un tableur : utilisez le même format qu'un fichier <strong>Exporter CSV</strong> de cette application
          (mêmes colonnes), et chaque ligne valide devient un nouveau signalement.
        </p>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handleImportClick} disabled={importing}>
            <FileUp size={15} /> {importing ? 'Importation…' : 'Choisir un fichier CSV'}
          </Button>
          <input ref={csvInputRef} type="file" accept=".csv" className="hidden" onChange={handleCsvChosen} />
        </div>
        {resultatImport && (
          <div className="mt-4 text-[13px]">
            <p className="text-ardoise-700">
              <strong className="text-encre">{resultatImport.importes}</strong> importé{resultatImport.importes > 1 ? 's' : ''} sur {resultatImport.total} ligne
              {resultatImport.total > 1 ? 's' : ''}
              {resultatImport.ignores > 0 && <span className="text-alerte"> · {resultatImport.ignores} ignorée{resultatImport.ignores > 1 ? 's' : ''}</span>}
            </p>
            {resultatImport.erreurs.length > 0 && (
              <ul className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                {resultatImport.erreurs.map((e, i) => (
                  <li key={i} className="text-[12px] text-ardoise-500">
                    {e}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h3 className="kicker text-ardoise-500 mb-1">Listes personnalisées</h3>
        <p className="text-[13px] text-ardoise-500 mb-5">
          Adaptez les options des menus déroulants du formulaire de signalement selon votre pratique (communautaire, préparation, spécialisée, hôpital).
        </p>
        <div className="grid grid-cols-2 gap-6">
          {CATEGORIES.map((cat) => (
            <ListeCategorie
              key={cat.key}
              categorie={cat.key}
              label={cat.label}
              options={options.filter((o) => o.categorie === cat.key)}
              onChanged={() => setVersion((v) => v + 1)}
            />
          ))}
        </div>
        <div className="hidden">{version}</div>
      </Card>

      <Card className="p-6 mt-5">
        <h3 className="kicker text-ardoise-500 mb-4">À propos</h3>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl2 bg-sarcelle-100 flex items-center justify-center text-sarcelle-600 shrink-0">
              <ShieldCheck size={20} />
            </div>
            <div>
              <p className="text-[14px] font-bold text-encre">Registre des Incidents Pharmacie</p>
              <p className="num text-[12px] text-ardoise-500">
                Version {appInfo?.version ?? '1.0.0'} · {window.api ? 'Application de bureau' : 'Mode navigateur (développement)'}
              </p>
            </div>
          </div>
          {appInfo?.dbPath && (
            <div className="text-right">
              <p className="text-[12px] text-ardoise-500 mb-1.5">Fichier de données local</p>
              <Button variant="secondary" size="sm" onClick={() => window.api?.revealDbFile()}>
                <FolderOpen size={14} /> Localiser le fichier
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

function ListeCategorie({ categorie, label, options, onChanged }: { categorie: string; label: string; options: ReturnType<typeof listAllOptions>; onChanged: () => void }) {
  const [nouveau, setNouveau] = useState('')

  function ajouter(e: React.FormEvent) {
    e.preventDefault()
    if (!nouveau.trim()) return
    addOption(categorie, nouveau.trim())
    setNouveau('')
    onChanged()
  }

  return (
    <div>
      <h4 className="text-[13px] font-semibold text-encre mb-2">{label}</h4>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {options.map((o) => (
          <span
            key={o.valeur}
            className={`inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full text-[12px] ${
              o.actif ? 'bg-ligne text-ardoise-700' : 'bg-white text-ardoise-300 border border-ligne line-through'
            }`}
          >
            {o.valeur}
            <button
              type="button"
              onClick={() => {
                setOptionActive(categorie, o.valeur, !o.actif)
                onChanged()
              }}
              className="hover:text-alerte"
              title={o.actif ? 'Désactiver' : 'Réactiver'}
            >
              <X size={12} />
            </button>
          </span>
        ))}
      </div>
      <form onSubmit={ajouter} className="flex gap-2">
        <Input value={nouveau} onChange={(e) => setNouveau(e.target.value)} placeholder="Ajouter une option…" className="py-1.5 text-[13px]" />
        <Button type="submit" variant="secondary" size="sm">
          <Plus size={14} />
        </Button>
      </form>
    </div>
  )
}
