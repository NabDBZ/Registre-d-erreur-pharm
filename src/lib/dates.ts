/** Human-readable French dates for display. Raw ISO strings stay in exports and inputs. */

/** `new Date('YYYY-MM-DD')` parses as UTC midnight; reading it back with local getters
 * (getFullYear/getMonth/getDate) in a timezone west of UTC — all of Canada — can land on
 * the previous day. Appending a local time-of-day avoids that shift for date-only values. */
export function parseDateLocale(iso: string): Date {
  return new Date(iso && iso.length === 10 ? `${iso}T00:00:00` : iso)
}

/** Today's calendar date in the user's local timezone, as 'YYYY-MM-DD'. `new Date().toISOString()`
 * gives the UTC date instead, which in any timezone west of UTC (all of Canada) is already
 * tomorrow's date for several hours every evening — wrong for a pre-filled "date of the event". */
export function todayLocalIso(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function formatDateLongue(iso: string): string {
  if (!iso) return '—'
  const d = parseDateLocale(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function formatDateCourte(iso: string): string {
  if (!iso) return '—'
  const d = parseDateLocale(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('fr-CA', { day: 'numeric', month: 'short', year: 'numeric' }).replace('.', '')
}

export function formatHeure(heure: string | null | undefined): string {
  if (!heure) return ''
  return heure
}

/** Full date + time for timestamped records (signatures, notifications) — always from an ISO datetime, never a date-only string. */
export function formatDateHeureLongue(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
