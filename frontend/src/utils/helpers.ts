import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow } from 'date-fns'

export const cn = (...i: ClassValue[]) => twMerge(clsx(i))

export const inr = (n: number) => new Intl.NumberFormat('en-IN', { style:'currency', currency:'INR', maximumFractionDigits:0 }).format(n)
export const num = (n: number) => n >= 1e7 ? `${(n/1e7).toFixed(1)} Cr` : n >= 1e5 ? `${(n/1e5).toFixed(1)} L` : n >= 1000 ? `${(n/1000).toFixed(1)}K` : String(Math.round(n))
function parseDateInput(d: string|Date) {
  if (!d) return new Date()
  if (typeof d === 'string') {
    // SQLite uses "YYYY-MM-DD HH:MM:SS" (UTC); normalize to ISO UTC
    const sqliteLike = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?$/
    if (sqliteLike.test(d)) return new Date(d.replace(' ', 'T') + 'Z')
  }
  return new Date(d as any)
}

export const fdate = (d: string|Date) => { try { return format(parseDateInput(d), 'dd MMM yyyy') } catch { return '—' } }
export const ago = (d: string|Date) => { try { return formatDistanceToNow(parseDateInput(d), { addSuffix:true }) } catch { return '—' } }
export const initials = (name: string) => name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2)
export const truncate = (s: string, n=80) => s?.length > n ? s.slice(0,n)+'…' : s

export function loanStatusBadge(s: string) {
  const m: Record<string,string> = {
    pending:'badge-amber', coordinator_review:'badge-blue', officer_review:'badge-blue',
    approved:'badge-green', rejected:'badge-red', disbursed:'badge-purple', closed:'badge-gray'
  }
  return m[s] || 'badge-gray'
}

export function orderStatusBadge(s: string) {
  const m: Record<string,string> = { placed:'badge-amber', confirmed:'badge-blue', shipped:'badge-purple', delivered:'badge-green', cancelled:'badge-red' }
  return m[s] || 'badge-gray'
}

export function schemeStatusBadge(s: string) {
  const m: Record<string,string> = { pending:'badge-amber', under_review:'badge-blue', approved:'badge-green', rejected:'badge-red' }
  return m[s] || 'badge-gray'
}

export function creditColor(score: number) {
  if (score >= 80) return { grade:'Excellent', text:'text-green-600', bar:'bg-green-500', badge:'badge-green' }
  if (score >= 65) return { grade:'Good',      text:'text-green-500', bar:'bg-green-400', badge:'badge-green' }
  if (score >= 50) return { grade:'Fair',      text:'text-amber-600', bar:'bg-amber-400', badge:'badge-amber' }
  if (score >= 35) return { grade:'Poor',      text:'text-red-500',   bar:'bg-red-400',   badge:'badge-red'   }
  return               { grade:'Very Poor', text:'text-red-600',   bar:'bg-red-500',   badge:'badge-red'   }
}

// Detect likely language from input text using Unicode script heuristics
export function detectLanguage(text: string) {
  if (!text) return { code: 'en', label: 'English' };
  try {
    // Use Unicode ranges for broader compatibility (avoid \p{} which may not be supported by some bundlers)
    if (/[\u0900-\u097F]/.test(text)) return { code: 'hi', label: 'Hindi' };
    if (/[\u0C00-\u0C7F]/.test(text)) return { code: 'te', label: 'Telugu' };
    if (/[\u0B80-\u0BFF]/.test(text)) return { code: 'ta', label: 'Tamil' };
    if (/[\u0C80-\u0CFF]/.test(text)) return { code: 'kn', label: 'Kannada' };
    if (/[\u0D00-\u0D7F]/.test(text)) return { code: 'ml', label: 'Malayalam' };
    if (/[\u0980-\u09FF]/.test(text)) return { code: 'bn', label: 'Bengali' };
    if (/[\u0A80-\u0AFF]/.test(text)) return { code: 'gu', label: 'Gujarati' };
    if (/[\u0A00-\u0A7F]/.test(text)) return { code: 'pa', label: 'Punjabi' };
    if (/[\u0B00-\u0B7F]/.test(text)) return { code: 'or', label: 'Odia' };
    // fallback: check for common Indic words (romaji)
    if (/\b(kya|kaise|hai|aap|namaste|dhanyavad)\b/i.test(text)) return { code: 'hi', label: 'Hindi' };
    return { code: 'en', label: 'English' };
  } catch (e) { return { code: 'en', label: 'English' } }
}
