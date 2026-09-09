import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../components/ui'
import EvenementForm from '../components/EvenementForm'
import { creerEvenement, type NouvelEvenementInput } from '../db/database'
import { useAuth } from '../lib/AuthContext'
import { useToast } from '../lib/toast'

export default function Declarer({ onSaved }: { onSaved: () => void }) {
  const navigate = useNavigate()
  const { session } = useAuth()
  const { push } = useToast()

  async function handleSubmit(input: NouvelEvenementInput) {
    const id = creerEvenement({ ...input, cree_par: session.nom })
    onSaved()
    push('Signalement enregistré.')
    navigate(`/evenement/${id}`)
  }

  return (
    <div>
      <PageHeader
        kicker="Formulaire AH-223 · interne"
        title="Nouveau signalement"
        subtitle="Déclarez un incident ou un accident lié à la médication, à la livraison ou à un processus de la pharmacie."
      />
      <EvenementForm onSubmit={handleSubmit} />
    </div>
  )
}
