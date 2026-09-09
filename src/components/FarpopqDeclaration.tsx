import { useState } from 'react'
import { Copy, Check, ExternalLink, ShieldAlert } from 'lucide-react'
import { Modal, Button, Field, Input } from './ui'
import { genererResumeFarpopq } from '../lib/farpopq'
import { todayLocalIso } from '../lib/dates'
import type { EvenementAvecPersonnes } from '../types'

/** Prepares the FARPOPQ notice: generates a copy-ready summary, requires an explicit professional sign-off, then hands off to FARPOPQ's own member portal — the app never transmits anything itself. */
export default function FarpopqDeclaration({
  open,
  onClose,
  onValider,
  evenement,
  pharmacyName,
  nomParDefaut
}: {
  open: boolean
  onClose: () => void
  onValider: (input: { avise_le: string; avise_par: string; resume: string }) => void
  evenement: EvenementAvecPersonnes
  pharmacyName: string
  nomParDefaut: string
}) {
  return (
    <Modal open={open} onClose={onClose} title="Préparer la déclaration FARPOPQ" width="max-w-2xl">
      {open && <Body onClose={onClose} onValider={onValider} evenement={evenement} pharmacyName={pharmacyName} nomParDefaut={nomParDefaut} />}
    </Modal>
  )
}

function Body({
  onClose,
  onValider,
  evenement,
  pharmacyName,
  nomParDefaut
}: {
  onClose: () => void
  onValider: (input: { avise_le: string; avise_par: string; resume: string }) => void
  evenement: EvenementAvecPersonnes
  pharmacyName: string
  nomParDefaut: string
}) {
  const resume = genererResumeFarpopq(evenement, pharmacyName)
  const [aviseLe, setAviseLe] = useState(todayLocalIso())
  const [avisePar, setAvisePar] = useState(nomParDefaut)
  const [confirme, setConfirme] = useState(false)
  const [copie, setCopie] = useState(false)

  async function copier() {
    try {
      await navigator.clipboard.writeText(resume)
      setCopie(true)
      setTimeout(() => setCopie(false), 2000)
    } catch {
      // presse-papier indisponible — l'utilisateur peut toujours sélectionner le texte manuellement
    }
  }

  function valider() {
    if (!confirme || !avisePar.trim()) return
    onValider({ avise_le: aviseLe, avise_par: avisePar.trim(), resume })
  }

  return (
    <div>
      <p className="text-[13px] text-graphite mb-3">
        Ce résumé est généré à partir du signalement #{evenement.numero}. Relisez-le, corrigez-le au besoin dans le dossier, puis copiez-le dans le
        formulaire de déclaration de l'espace membre du FARPOPQ.
      </p>

      <div className="relative">
        <pre className="text-[12px] text-ink bg-mist border border-fog rounded-md p-3.5 max-h-[280px] overflow-y-auto whitespace-pre-wrap font-mono leading-relaxed">
          {resume}
        </pre>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="absolute top-2 right-2"
          onClick={copier}
        >
          {copie ? <Check size={13} /> : <Copy size={13} />} {copie ? 'Copié' : 'Copier'}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4">
        <Field label="Avisé par" required>
          <Input value={avisePar} onChange={(e) => setAvisePar(e.target.value)} placeholder="Nom du pharmacien" />
        </Field>
        <Field label="Date de l'avis" required>
          <Input type="date" value={aviseLe} onChange={(e) => setAviseLe(e.target.value)} />
        </Field>
      </div>

      <label className="flex items-start gap-2.5 mt-3 cursor-pointer">
        <input type="checkbox" checked={confirme} onChange={(e) => setConfirme(e.target.checked)} className="mt-0.5" />
        <span className="text-[13px] text-graphite">
          Je confirme avoir vérifié l'exactitude de ce résumé et j'assume la responsabilité de sa transmission au FARPOPQ.
        </span>
      </label>

      <div className="flex items-start gap-2.5 mt-4 px-3.5 py-2.5 rounded-md border-2 border-signal-amber/40 bg-signal-amber/10">
        <ShieldAlert size={16} className="text-[#8a5c07] shrink-0 mt-0.5" />
        <p className="text-[12px] text-[#8a5c07]">
          L'application ne transmet rien automatiquement — la déclaration se fait vous-même, dans l'espace membre du FARPOPQ, avec vos propres
          identifiants professionnels.
        </p>
      </div>

      <div className="flex justify-end gap-2 mt-5">
        <Button type="button" variant="secondary" onClick={onClose}>
          Annuler
        </Button>
        <Button type="button" onClick={valider} disabled={!confirme || !avisePar.trim()}>
          <ExternalLink size={15} /> Valider et ouvrir l'espace membre
        </Button>
      </div>
    </div>
  )
}
