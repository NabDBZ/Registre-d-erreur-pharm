import React, { createContext, useCallback, useContext, useRef, useState } from 'react'
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react'

type ToastTone = 'success' | 'warn' | 'info'

interface ToastItem {
  id: number
  message: string
  tone: ToastTone
}

interface ToastContextValue {
  push: (message: string, tone?: ToastTone) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast doit être utilisé à l\'intérieur de ToastProvider')
  return ctx
}

const TONE_STYLES: Record<ToastTone, { icon: React.ReactNode; accent: string }> = {
  success: { icon: <CheckCircle2 size={17} />, accent: '#0e7c74' },
  warn: { icon: <AlertTriangle size={17} />, accent: '#c2871e' },
  info: { icon: <Info size={17} />, accent: '#9baaaa' }
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const counter = useRef(0)

  const push = useCallback((message: string, tone: ToastTone = 'success') => {
    const id = ++counter.current
    setItems((cur) => [...cur, { id, message, tone }])
    setTimeout(() => {
      setItems((cur) => cur.filter((t) => t.id !== id))
    }, 3600)
  }, [])

  const dismiss = (id: number) => setItems((cur) => cur.filter((t) => t.id !== id))

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="no-print fixed bottom-5 right-5 z-[100] flex flex-col gap-2 items-end pointer-events-none">
        {items.map((t) => {
          const style = TONE_STYLES[t.tone]
          return (
            <div
              key={t.id}
              className="pointer-events-auto flex items-center gap-2.5 bg-encre text-white rounded-xl2 shadow-modal pl-3.5 pr-2 py-2.5 min-w-[220px] max-w-[360px]"
              style={{ animation: 'toast-in 0.28s cubic-bezier(0.16, 1, 0.3, 1) both' }}
              role="status"
            >
              <span style={{ color: style.accent }} className="shrink-0">
                {style.icon}
              </span>
              <span className="text-[13px] font-medium leading-snug flex-1">{t.message}</span>
              <button onClick={() => dismiss(t.id)} className="text-ardoise-300 hover:text-white shrink-0 p-1">
                <X size={13} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
