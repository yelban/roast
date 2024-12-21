import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { SHA256 } from 'crypto-js'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateHash(text: string): string {
  return SHA256(text).toString()
}
