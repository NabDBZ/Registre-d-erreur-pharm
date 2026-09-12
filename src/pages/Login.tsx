import { useEffect, useMemo, useState } from 'react'
import { ShieldPlus, LogIn, UserPlus } from 'lucide-react'
import {
  compterUtilisateurs,
  listUtilisateurs,
  getUtilisateurParNomUtilisateur,
  creerUtilisateur,
  enregistrerConnexion,
  ajouterAudit
} from '../db/database'
import { hashPassword, verifyPassword, validatePasswordStrength } from '../lib/auth'
import { Button, Input, Field, Select } from '../components/ui'
import type { SessionUtilisateur } from '../types'

export default function Login({ onLogin }: { onLogin: (session: SessionUtilisateur) => void }) {
  const [premiereFois, setPremiereFois] = useState<boolean | null>(null)
  const utilisateurs = useMemo(() => (premiereFois === false ? listUtilisateurs().filter((u) => u.actif) : []), [premiereFois])

  useEffect(() => {
    setPremiereFois(compterUtilisateurs() === 0)
  }, [])

  if (premiereFois === null) return null

  return (
    <div className="h-screen w-screen flex bg-encre relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)',
          backgroundSize: '28px 28px'
        }}
      />
      <div className="absolute top-0 bottom-0 left-1/2 w-px" style={{ background: 'rgba(14,124,116,0.3)' }} />

      <div className="m-auto w-full max-w-md px-6 relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="hazard-diamond w-16 h-16 bg-sarcelle flex items-center justify-center mb-5 shadow-pop">
            <ShieldPlus className="text-white" size={28} />
          </div>
          <h1 className="text-[20px] font-bold text-white text-center leading-tight">Registre des Incidents Pharmacie</h1>
          <p className="kicker text-ardoise-300 mt-2">Sécurité du circuit du médicament</p>
        </div>

        {premiereFois ? (
          <SetupAdmin onDone={onLogin} onRetourConnexion={() => setPremiereFois(false)} />
        ) : (
          <SeConnecter utilisateurs={utilisateurs.map((u) => ({ nom: u.nom, nom_utilisateur: u.nom_utilisateur }))} onDone={onLogin} />
        )}
      </div>

      <p className="absolute bottom-5 left-0 right-0 text-center kicker text-ardoise-300">Hors ligne · Données stockées localement</p>
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-surface rounded-xl2 shadow-pop border-t-[3px] border-sarcelle p-7" style={{ animation: 'modal-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) both' }}>
      {children}
    </div>
  )
}

function SeConnecter({ utilisateurs, onDone }: { utilisateurs: { nom: string; nom_utilisateur: string }[]; onDone: (s: SessionUtilisateur) => void }) {
  const [nomUtilisateur, setNomUtilisateur] = useState(utilisateurs[0]?.nom_utilisateur ?? '')
  const [motDePasse, setMotDePasse] = useState('')
  const [erreur, setErreur] = useState('')
  const [enCours, setEnCours] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErreur('')
    if (!nomUtilisateur || !motDePasse) {
      setErreur('Veuillez sélectionner votre nom et entrer votre mot de passe.')
      return
    }
    setEnCours(true)
    try {
      const user = getUtilisateurParNomUtilisateur(nomUtilisateur)
      const valide = user ? await verifyPassword(motDePasse, user.salt, user.hash) : false
      if (!user || !valide) {
        ajouterAudit({ utilisateur_id: null, utilisateur_nom: nomUtilisateur, action: 'connexion_echouee', cible_type: 'utilisateur', details: 'Mot de passe incorrect' })
        setErreur('Nom d\'utilisateur ou mot de passe incorrect.')
        return
      }
      enregistrerConnexion(user.id)
      ajouterAudit({ utilisateur_id: user.id, utilisateur_nom: user.nom, action: 'connexion', cible_type: 'utilisateur', cible_id: user.id })
      onDone({ id: user.id, nom: user.nom, nom_utilisateur: user.nom_utilisateur, role: user.role })
    } finally {
      setEnCours(false)
    }
  }

  if (utilisateurs.length === 0) {
    return (
      <Card>
        <p className="text-[13px] text-ardoise-500 text-center">Aucun compte actif. Contactez votre pharmacien-chef pour obtenir un accès.</p>
      </Card>
    )
  }

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        {erreur && <div className="mb-4 text-[13px] font-medium text-alerte bg-alerte/10 border-2 border-alerte/40 rounded-xl2 px-4 py-2.5">{erreur}</div>}
        <Field label="Utilisateur" required>
          <Select value={nomUtilisateur} onChange={(e) => setNomUtilisateur(e.target.value)}>
            {utilisateurs.map((u) => (
              <option key={u.nom_utilisateur} value={u.nom_utilisateur}>
                {u.nom}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Mot de passe" required>
          <Input type="password" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} autoFocus />
        </Field>
        <Button type="submit" className="w-full mt-2" disabled={enCours}>
          <LogIn size={16} /> {enCours ? 'Connexion…' : 'Se connecter'}
        </Button>
      </form>
    </Card>
  )
}

function SetupAdmin({ onDone, onRetourConnexion }: { onDone: (s: SessionUtilisateur) => void; onRetourConnexion: () => void }) {
  const [nom, setNom] = useState('')
  const [nomUtilisateur, setNomUtilisateur] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [erreur, setErreur] = useState('')
  const [enCours, setEnCours] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErreur('')
    if (!nom.trim() || !nomUtilisateur.trim()) {
      setErreur('Veuillez remplir tous les champs.')
      return
    }
    const forceErr = validatePasswordStrength(motDePasse)
    if (forceErr) {
      setErreur(forceErr)
      return
    }
    if (motDePasse !== confirmation) {
      setErreur('Les mots de passe ne correspondent pas.')
      return
    }
    setEnCours(true)
    try {
      const { salt, hash } = await hashPassword(motDePasse)
      const user = creerUtilisateur({ nom: nom.trim(), nom_utilisateur: nomUtilisateur.trim(), role: 'Administrateur', salt, hash })
      enregistrerConnexion(user.id)
      ajouterAudit({ utilisateur_id: user.id, utilisateur_nom: user.nom, action: 'creation', cible_type: 'utilisateur', cible_id: user.id, cible_libelle: user.nom, details: 'Premier compte administrateur' })
      onDone({ id: user.id, nom: user.nom, nom_utilisateur: user.nom_utilisateur, role: user.role })
    } catch (err: any) {
      setErreur(err?.message ?? String(err))
    } finally {
      setEnCours(false)
    }
  }

  return (
    <Card>
      <h2 className="text-[16px] font-semibold text-encre mb-1.5">Créer le compte administrateur</h2>
      <p className="text-[13px] text-ardoise-500 mb-5">
        Cette personne pourra ensuite ajouter les autres membres de l'équipe et gérer les archives.
      </p>
      <form onSubmit={handleSubmit}>
        {erreur && <div className="mb-4 text-[13px] font-medium text-alerte bg-alerte/10 border-2 border-alerte/40 rounded-xl2 px-4 py-2.5">{erreur}</div>}
        <Field label="Nom complet" required>
          <Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex. : Marie Tremblay" autoFocus required />
        </Field>
        <Field label="Nom d'utilisateur" required hint="Utilisé pour se connecter — sans espace, ex. : mtremblay">
          <Input value={nomUtilisateur} onChange={(e) => setNomUtilisateur(e.target.value)} placeholder="mtremblay" required />
        </Field>
        <Field label="Mot de passe" required hint="Au moins 6 caractères">
          <Input type="password" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} required />
        </Field>
        <Field label="Confirmer le mot de passe" required>
          <Input type="password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} required />
        </Field>
        <Button type="submit" className="w-full mt-2" disabled={enCours}>
          <UserPlus size={16} /> {enCours ? 'Création…' : 'Créer le compte et démarrer'}
        </Button>
        <button type="button" onClick={onRetourConnexion} className="w-full text-center text-[12px] text-ardoise-500 hover:text-encre mt-4">
          Un compte existe déjà ? Retour à la connexion
        </button>
      </form>
    </Card>
  )
}
