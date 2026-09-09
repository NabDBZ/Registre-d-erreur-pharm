import React from 'react'
import { AlertTriangle } from 'lucide-react'

interface Props {
  children: React.ReactNode
}

interface State {
  error: Error | null
}

/**
 * Catches render-time crashes in any page so one broken screen never takes down
 * the whole app — the pharmacist can always get back to a working view.
 */
export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Erreur non interceptée dans l\'interface :', error, info.componentStack)
  }

  handleReset = () => {
    this.setState({ error: null })
    window.location.hash = '#/'
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center px-6">
          <div className="max-w-md text-center">
            <div className="hazard-diamond w-12 h-12 mx-auto mb-4 bg-hazard-h flex items-center justify-center">
              <AlertTriangle className="text-white" size={20} />
            </div>
            <h1 className="text-[18px] font-bold text-ink mb-2">Une erreur inattendue est survenue</h1>
            <p className="text-[13px] text-steel mb-1">
              Cet écran a rencontré un problème et n'a pas pu s'afficher. Vos données déjà enregistrées ne sont pas affectées.
            </p>
            <p className="num text-[11px] text-silver mb-5">{this.state.error.message}</p>
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 justify-center font-semibold rounded-md bg-brand-500 text-white hover:bg-brand-600 text-[14px] px-5 py-2.5"
            >
              Retour au tableau de bord
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
