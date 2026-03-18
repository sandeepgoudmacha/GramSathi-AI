import { useEffect } from 'react'

declare global {
  interface Window { IndicParlerTTS?: any }
}

// Try to load external Parler TTS script if VITE_PARLER_TTS_CDN is set
export function loadParlerTTS() {
  try {
    const url = (import.meta as any).env?.VITE_PARLER_TTS_CDN
    if (!url) return
    if (document.querySelector(`script[data-parler-tts]`)) return
    const s = document.createElement('script')
    s.src = url
    s.setAttribute('data-parler-tts', '1')
    s.async = true
    document.head.appendChild(s)
  } catch (e) { console.warn('loadParlerTTS failed', e) }
}

// Play text using loaded Parler TTS (if available) or fallback to SpeechSynthesis
export async function playTTS(text: string, lang?: string) {
  if (!text) return
  try {
    if (window.IndicParlerTTS && typeof window.IndicParlerTTS.speak === 'function') {
      // library-specific API: try best-effort invocation
      try {
        await window.IndicParlerTTS.speak({ text, lang })
        return
      } catch (e) {
        console.warn('ParlerTTS.speak failed, falling back', e)
      }
    }

    // Browser fallback
    if ('speechSynthesis' in window) {
      const synth = window.speechSynthesis
      synth.cancel()
      const ut = new SpeechSynthesisUtterance(text)
      if (lang) ut.lang = lang
      // Try to pick a matching voice
      try {
        const voices = synth.getVoices()
        if (voices && voices.length) {
          const preferred = voices.find(v => (lang && v.lang && v.lang.startsWith(lang.split('-')[0])) ) || voices[0]
          if (preferred) ut.voice = preferred
        }
      } catch (e) {}
      synth.speak(ut)
      return
    }
  } catch (e) { console.warn('playTTS error', e) }
}

export default function ParlerTTSModal() { useEffect(()=>{ loadParlerTTS() },[]); return null }
