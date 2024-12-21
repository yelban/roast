import crypto from 'crypto'

export function generateHashServer(text: string): string {
  return crypto
    .createHash('sha256')
    .update(text)
    .digest('hex')
} 