import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { graviteInfo } from '../constants'
import { useCountUp } from '../lib/useCountUp'

export function Card({ children, className = '', accent, hoverable = false }: { children: React.ReactNode; className?: string; accent?: string; hoverable?: boolean }) {
  return (
    <div
      className={`relative bg-surface rounded-xl2 shadow-card border border-fog transition-all duration-200 ${
        hoverable ? 'hover:-translate-y-[2px] hover:shadow-pop cursor-pointer' : ''
      } ${className}`}
    >
      {accent && <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl2" style={{ backgroundColor: accent }} />}
      {children}
    </div>
  )
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' | 'secondary'; size?: 'sm' | 'md' }) {
  const base =
    'inline-flex items-center gap-2 justify-center font-semibold rounded-md transition-all duration-150 active:scale-[0.96] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 whitespace-nowrap tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas'
  const sizes = size === 'sm' ? 'text-[13px] px-3 py-1.5' : 'text-[14px] px-5 py-2.5'
  const variants: Record<string, string> = {
    primary: 'bg-brand-500 text-white hover:bg-brand-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] hover:shadow-[0_4px_14px_-4px_rgba(15,157,83,0.5)]',
    secondary: 'bg-console text-console-text hover:bg-console-raised border border-console-line',
    ghost: 'bg-transparent text-graphite hover:bg-mist',
    danger: 'bg-white text-hazard-h border-2 border-hazard-h hover:bg-hazard-h hover:text-white'
  }
  return (
    <button className={`${base} ${sizes} ${variants[variant]} ${className}`} {...rest}>
      {children}
    </button>
  )
}

export function Badge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'brand' | 'warn' | 'critical' | 'success' }) {
  const tones: Record<string, string> = {
    neutral: 'bg-mist text-graphite border border-fog',
    brand: 'bg-brand-50 text-brand-700 border border-brand-100',
    warn: 'bg-signal-amber/15 text-[#8a5c07] border border-signal-amber/40',
    critical: 'bg-signal-red/10 text-hazard-h border border-signal-red/30',
    success: 'bg-brand-50 text-brand-700 border border-brand-100'
  }
  return <span className={`inline-flex items-center px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wide ${tones[tone]}`}>{children}</span>
}

/** Hazard-diamond severity marker — the incident scale rendered as a safety pictogram, not a soft pill. */
export function GraviteBadge({ code, size = 'md' }: { code: string; size?: 'sm' | 'md' }) {
  const gi = graviteInfo(code)
  const dim = size === 'sm' ? 22 : 28
  return (
    <span className="inline-flex items-center gap-2" title={gi.description}>
      <span
        className="hazard-diamond inline-flex items-center justify-center shrink-0 font-mono font-bold text-white transition-transform hover:scale-110"
        style={{ width: dim, height: dim, backgroundColor: gi.couleur, fontSize: size === 'sm' ? 9 : 10, boxShadow: `0 2px 6px -1px ${gi.couleur}66` }}
      >
        {gi.code}
      </span>
    </span>
  )
}

export function StatutBadge({ statut }: { statut: string }) {
  const tone = statut === 'Fermé' ? 'success' : statut === 'Ouvert' ? 'warn' : 'brand'
  return <Badge tone={tone as any}>{statut}</Badge>
}

export function Field({ label, children, hint, required }: { label: string; children: React.ReactNode; hint?: string; required?: boolean }) {
  return (
    <label className="block mb-4">
      <span className="kicker block text-steel mb-2">
        {label} {required && <span className="text-hazard-h">*</span>}
      </span>
      {children}
      {hint && <span className="block text-[12px] text-steel mt-1">{hint}</span>}
    </label>
  )
}

const inputBase =
  'w-full bg-white border-2 border-fog rounded-md px-3.5 py-2.5 text-[14px] text-ink placeholder:text-silver focus:outline-none focus:ring-2 focus:ring-brand-400/40 focus:border-brand-500 transition-colors'

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputBase} ${props.className ?? ''}`} />
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputBase} resize-y min-h-[90px] ${props.className ?? ''}`} />
}

export function Select({ children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...rest}
      className={`${inputBase} appearance-none bg-white bg-[length:16px] bg-[right_0.75rem_center] bg-no-repeat pr-9 ${rest.className ?? ''}`}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2342544d' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")"
      }}
    >
      {children}
    </select>
  )
}

export interface Suggestion {
  label: string
  /** Shown as a small hint next to the label (e.g. therapeutic class) — display only, not matched against. */
  detail?: string | null
}

/**
 * Free-text input with a filtered suggestion dropdown — never restricts entry to the list, just speeds
 * up the common case. Picking a suggestion always fills the text via onChange; onSelect additionally
 * hands back the full matched record, so a caller can auto-fill related fields (dose, class, DIN...).
 */
export function AutocompleteInput<T extends Suggestion>({
  value,
  onChange,
  suggestions,
  onSelect,
  placeholder,
  className
}: {
  value: string
  onChange: (v: string) => void
  suggestions: T[]
  onSelect?: (item: T) => void
  placeholder?: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const q = value.trim().toLowerCase()
  const filtered = useMemo(() => {
    if (!q) return suggestions.slice(0, 8)
    const commenceParQ: T[] = []
    const contientQ: T[] = []
    for (const s of suggestions) {
      if (commenceParQ.length >= 8) break
      const bas = s.label.toLowerCase()
      if (bas.startsWith(q)) commenceParQ.push(s)
      else if (bas.includes(q) && contientQ.length < 8) contientQ.push(s)
    }
    return [...commenceParQ, ...contientQ].slice(0, 8)
  }, [q, suggestions])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function select(item: T) {
    onChange(item.label)
    onSelect?.(item)
    setOpen(false)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || filtered.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted((h) => Math.min(h + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter' && filtered[highlighted]) {
      e.preventDefault()
      select(filtered[highlighted])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-silver pointer-events-none" />
        <Input
          value={value}
          onChange={(e) => {
            onChange(e.target.value)
            setOpen(true)
            setHighlighted(0)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          className={`pl-8 ${className ?? ''}`}
        />
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border-2 border-fog rounded-md shadow-pop max-h-56 overflow-y-auto py-1">
          {filtered.map((s, i) => (
            <button
              type="button"
              key={s.label}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => select(s)}
              className={`w-full flex items-baseline gap-2 text-left px-3 py-2 text-[13px] transition-colors ${i === highlighted ? 'bg-mist text-ink' : 'text-graphite hover:bg-mist/60'}`}
            >
              <span className="flex-1 min-w-0 truncate">{s.label}</span>
              {s.detail && <span className="kicker text-silver shrink-0">{s.detail}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function PageHeader({ kicker, title, subtitle, actions }: { kicker?: string; title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-7 gap-4 flex-wrap border-b-2 border-ink pb-5">
      <div>
        {kicker && <p className="kicker text-brand-600 mb-1.5">{kicker}</p>}
        <h1 className="text-[26px] font-bold text-ink tracking-tight leading-none">{title}</h1>
        {subtitle && <p className="text-[14px] text-steel mt-2 max-w-xl">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 pt-1">{actions}</div>}
    </div>
  )
}

export function EmptyState({ icon, title, description, action }: { icon?: React.ReactNode; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      {icon && <div className="mb-4 text-silver">{icon}</div>}
      <h3 className="text-[16px] font-semibold text-ink mb-1">{title}</h3>
      {description && <p className="text-[14px] text-steel max-w-sm mb-4">{description}</p>}
      {action}
    </div>
  )
}

export function Modal({ open, onClose, children, title, width = 'max-w-lg' }: { open: boolean; onClose: () => void; children: React.ReactNode; title: string; width?: string }) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-console/70 backdrop-blur-[2px]"
      style={{ animation: 'fade-in 0.15s ease-out both' }}
      onClick={onClose}
    >
      <div
        className={`relative bg-surface rounded-xl2 shadow-pop w-full ${width} max-h-[85vh] overflow-y-auto`}
        style={{ animation: 'modal-in 0.2s cubic-bezier(0.16, 1, 0.3, 1) both' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-brand-500 rounded-t-xl2" />
        <div className="sticky top-0 bg-surface border-b border-fog px-6 py-4 flex items-center justify-between">
          <h2 className="text-[16px] font-bold text-ink">{title}</h2>
          <button onClick={onClose} className="text-steel hover:text-ink text-xl leading-none">
            ×
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

export function MultiCheck({ options, values, onChange }: { options: string[]; values: string[]; onChange: (v: string[]) => void }) {
  const toggle = (opt: string) => {
    onChange(values.includes(opt) ? values.filter((v) => v !== opt) : [...values, opt])
  }
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          type="button"
          key={opt}
          onClick={() => toggle(opt)}
          className={`px-3 py-1.5 rounded text-[13px] font-medium border-2 transition-colors ${
            values.includes(opt) ? 'bg-ink border-ink text-white' : 'bg-white border-fog text-graphite hover:border-steel'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

/** Blister-pack readout — a KPI cell shaped like a dosette bubble, numerals in mono. */
export function BlisterStat({ icon, label, value, tone = 'brand' }: { icon: React.ReactNode; label: string; value: number | string; tone?: 'brand' | 'warn' | 'neutral' }) {
  const ring = tone === 'warn' ? 'ring-signal-amber/50 bg-signal-amber/10 text-[#8a5c07]' : tone === 'neutral' ? 'ring-fog bg-mist text-graphite' : 'ring-brand-300/60 bg-brand-50 text-brand-700'
  const animated = useCountUp(typeof value === 'number' ? value : 0)
  return (
    <div className="bg-surface rounded-xl2 shadow-card border border-fog p-4 flex items-center gap-3 min-w-0 transition-shadow duration-200 hover:shadow-pop">
      <div className={`w-12 h-12 rounded-full ring-4 flex items-center justify-center shrink-0 ${ring}`}>{icon}</div>
      <div className="min-w-0">
        <div className="num text-[26px] font-bold text-ink leading-none">{typeof value === 'number' ? animated : value}</div>
        <div className="font-mono text-[10px] font-bold tracking-wide uppercase text-steel mt-1.5 whitespace-nowrap overflow-hidden text-ellipsis">{label}</div>
      </div>
    </div>
  )
}
