/** Password hashing. In Electron this delegates to Node's crypto (scrypt) in the
 * main process. In plain-browser dev mode it falls back to a SubtleCrypto digest —
 * good enough for local UI iteration, never what ships to a pharmacist's machine. */

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function hashPassword(password: string): Promise<{ salt: string; hash: string }> {
  if (window.api) return window.api.hashPassword(password)
  const salt = crypto.randomUUID()
  const hash = await sha256Hex(salt + password)
  return { salt, hash }
}

export async function verifyPassword(password: string, salt: string, hash: string): Promise<boolean> {
  if (window.api) return window.api.verifyPassword(password, salt, hash)
  const check = await sha256Hex(salt + password)
  return check === hash
}

export function validatePasswordStrength(password: string): string | null {
  if (password.length < 6) return 'Le mot de passe doit contenir au moins 6 caractères.'
  return null
}
