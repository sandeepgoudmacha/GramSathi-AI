import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, X, Loader2 } from 'lucide-react'
import { aiApi, usersApi } from '@/services/api'
import { cn, detectLanguage } from '@/utils/helpers'
import { useAuthStore } from '@/store/index'
import { useQuery } from '@tanstack/react-query'
import ParlerTTSModal, { loadParlerTTS, playTTS } from '@/components/ui/ParlerTTSModal'

interface Msg { role: 'user'|'assistant'; content: string }

const CHIPS = ['What schemes am I eligible for?','How can I apply for MUDRA loan?','Best income for my skills','Nutrition during pregnancy','How to sell on marketplace?']
const WELCOME = `Namaste! 🙏 I'm GramSathi AI.\n\nI can help with:\n• 🏛️ Government schemes & eligibility\n• 💰 Loans & credit score improvement\n• 🎓 Free skill training programs\n• 💼 Livelihood opportunities\n• 🏥 Health & nutrition guidance\n• 🛒 Marketplace tips\n\nWhat would you like to know?`

export function AIAssistant() {
  const { user } = useAuthStore()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([{ role:'assistant', content:WELCOME }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)
  const [recording, setRecording] = useState(false)
  const [useServerTTS, setUseServerTTS] = useState<boolean>(()=>{
    try{ const v = localStorage.getItem('use_server_tts'); if(v!==null) return v==='1'; return (import.meta as any).env?.VITE_USE_SERVER_TTS==='1' }catch(e){return false}
  })
  const [ttsSpeaker, setTtsSpeaker] = useState<string>(()=>{ try{ return localStorage.getItem('tts_speaker') || 'Divya' }catch(e){return 'Divya'} })
  const [ttsEmotion, setTtsEmotion] = useState<string>(()=>{ try{ return localStorage.getItem('tts_emotion') || 'Neutral' }catch(e){return 'Neutral'} })

  // Load conversation history once when opened
  const { data: history } = useQuery({
    queryKey: ['ai-history'],
    queryFn: () => aiApi.chatHistory().then(r => r.data),
    enabled: open && !initialized,
    staleTime: Infinity,
  })

  useEffect(() => {
    if (history?.length && !initialized) {
      const msgs = history.slice(-20).map((h: any) => ({ role: h.role as 'user'|'assistant', content: h.content }))
      if (msgs.length > 0) setMessages([{ role:'assistant', content:WELCOME }, ...msgs])
      setInitialized(true)
    }
  }, [history])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior:'smooth' }) }, [messages, loading])

  useEffect(()=>{ // init optional parler tts loader
    try{ loadParlerTTS() }catch(e){}
    // setup speech recognition if supported
    try{
      const w:any = window as any
      const Rec = w.SpeechRecognition || w.webkitSpeechRecognition
      if (Rec) {
        const r = new Rec()
        r.interimResults = false
        r.maxAlternatives = 1
        r.onresult = (e:any) => {
          const t = e.results?.[0]?.[0]?.transcript
          if (t) { setInput(t); send(t) }
          setRecording(false)
        }
        r.onend = () => setRecording(false)
        recognitionRef.current = r
      }
    }catch(e){}
  },[])

  // small helper to generate descriptive caption for Parler-TTS
  function makeDescription(text:string){
    try{
      const hasDevanagari = /[\u0900-\u097F]/.test(text)
      const lang = hasDevanagari ? 'Hindi' : 'Indian English'
      const speaker = ttsSpeaker || (hasDevanagari ? 'Divya' : 'Thoma')
      const emotion = ttsEmotion || 'Neutral'
      return `${speaker} speaks in ${lang} with a ${emotion.toLowerCase()} tone. Very clear audio, close-up recording, moderate speed and balanced pitch.`
    }catch(e){ return 'Very clear audio, close-up, moderate speed.' }
  }

  const send = async (text?: string) => {
    const msg = (text || input).trim()
    if (!msg || loading) return
    setMessages(p => [...p, { role:'user', content:msg }])
    setInput('')
    setLoading(true)
    try {
      const recentHistory = messages.slice(-8)
      const detected = detectLanguage(msg)
      const langHint = detected?.code || 'en'
      const { data } = await aiApi.chat({ message: msg, language: langHint })
      const reply = data.reply
      setMessages(p => [...p, { role:'assistant', content: reply }])
      // Prefer server-side Parler-TTS if enabled, else fall back to Parler/browser
      try {
        const useServer = useServerTTS || (import.meta as any).env?.VITE_USE_SERVER_TTS === '1'
        if (useServer) {
          try {
            const description = makeDescription(reply)
            const arr = await aiApi.tts({ text: reply, description, speaker: ttsSpeaker, language: langHint, emotion: ttsEmotion })
            const blob = new Blob([arr.data || arr], { type: 'audio/wav' })
            const url = URL.createObjectURL(blob)
            const a = new Audio(url)
            a.onended = () => { URL.revokeObjectURL(url) }
            await a.play()
          } catch (e) {
            console.warn('server TTS failed, falling back to client', e)
            const hasDevanagari = /[\u0900-\u097F]/.test(reply)
            const locale = hasDevanagari ? 'hi-IN' : (navigator.language || 'en-US')
            playTTS(reply, locale)
          }
        } else {
          const hasDevanagari = /[\u0900-\u097F]/.test(reply)
          const locale = hasDevanagari ? 'hi-IN' : (navigator.language || 'en-US')
          playTTS(reply, locale)
        }
      } catch (e) { console.warn('TTS play failed', e) }
    } catch {
      setMessages(p => [...p, { role:'assistant', content:'Sorry, I had trouble connecting. Please try again.' }])
    } finally { setLoading(false) }
  }

  const toggleRecording = () => {
    const r = recognitionRef.current
    if (!r) return
    if (recording) { try{ r.stop() }catch(e){}; setRecording(false); }
    else { try{ r.lang = navigator.language || 'hi-IN'; r.start(); setRecording(true) }catch(e){ console.warn('start recog',e); setRecording(false) } }
  }

  // helper to map short language codes to SpeechRecognition locale (e.g., 'hi' -> 'hi-IN')
  function langCodeToLocale(code: string) {
    const m: Record<string,string> = { hi: 'hi-IN', en: 'en-IN', te: 'te-IN', ta: 'ta-IN', kn: 'kn-IN', ml: 'ml-IN', bn: 'bn-IN', gu: 'gu-IN', pa: 'pa-IN', or: 'or-IN' }
    return m[code] || (navigator.language || 'en-IN')
  }

  // Start/stop recording but ensure recognition.lang matches detected language
  const startRecordingWithLang = (preferredCode?: string) => {
    const r = recognitionRef.current
    if (!r) return
    try {
      const locale = langCodeToLocale(preferredCode || (detectLanguage(input || '').code))
      r.lang = locale
      r.start()
      setRecording(true)
    } catch (e) { console.warn('start recog', e); setRecording(false) }
  }

  if (!user) return null

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      <AnimatePresence>
        {open && (
          <motion.div initial={{opacity:0,scale:0.95,y:10}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.95,y:10}} transition={{duration:0.18}}
            className="bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden" style={{width:320,height:480}}>
            {/* Header */}
            <div className="bg-gradient-to-r from-brand-600 to-brand-500 px-4 py-3 flex items-center gap-2.5">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">🤖</div>
              <div className="flex-1">
                <p className="text-white text-sm font-semibold">GramSathi AI</p>
                <p className="text-white/60 text-xs">Powered by Groq LLaMA 3</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"/>
                <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white"><X size={15}/></button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {messages.map((m, i) => {
                // Skip rendering completely empty or whitespace-only messages
                if (!m?.content || (typeof m.content === 'string' && m.content.trim().length === 0)) return null
                return (
                  <div key={i} className={cn('flex', m.role==='user'?'justify-end':'justify-start')}>
                    {m.role==='assistant' && <div className="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center text-xs mr-1.5 mt-0.5 shrink-0">🌱</div>}
                    <div className={cn('max-w-[82%] px-3 py-2 rounded-xl text-xs leading-relaxed whitespace-pre-wrap break-words',
                      m.role==='user'?'bg-brand-500 text-white rounded-br-sm':'bg-gray-100 text-gray-800 rounded-bl-sm')}>
                      {m.content}
                    </div>
                  </div>
                )
              })}
              {loading && (
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center text-xs">🌱</div>
                  <div className="bg-gray-100 rounded-xl rounded-bl-sm px-4 py-2.5 flex gap-1">
                    {[0,.2,.4].map((d,i) => <div key={i} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay:`${d}s`}}/>)}
                  </div>
                </div>
              )}
              <div ref={endRef}/>
            </div>

            {/* Quick chips */}
            <div className="px-3 pb-1.5 flex gap-1.5 overflow-x-auto" style={{scrollbarWidth:'none'}}>
              {CHIPS.slice(0,3).map(c => (
                <button key={c} onClick={() => send(c)}
                  className="text-[10px] bg-brand-50 text-brand-700 border border-brand-200 rounded-full px-2.5 py-1 whitespace-nowrap hover:bg-brand-100 transition-colors shrink-0">
                  {c}
                </button>
              ))}
            </div>

            {/* Input */}
            <div className="p-2.5 border-t border-gray-100 flex gap-2">
              <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&send()}
                placeholder="Ask anything..." className="flex-1 text-xs border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-brand-400 bg-gray-50"/>
              <button onClick={() => { if (recognitionRef.current && !recording) startRecordingWithLang(); else toggleRecording() }} title="Speak" className={cn('w-8 h-8 rounded-xl flex items-center justify-center transition-colors shrink-0', recording ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-700') }>
                {recording ? '●' : '🎤'}
              </button>
              <button onClick={() => send()} disabled={!input.trim()||loading}
                className="w-8 h-8 bg-brand-500 text-white rounded-xl flex items-center justify-center disabled:opacity-50 hover:bg-brand-600 transition-colors shrink-0">
                {loading ? <Loader2 size={13} className="animate-spin"/> : <Send size={13}/>}
              </button>
            </div>
            <ParlerTTSModal />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button whileHover={{scale:1.05}} whileTap={{scale:0.95}}
        onClick={() => setOpen(o => !o)}
        className="w-14 h-14 bg-brand-500 text-white rounded-full shadow-lg shadow-brand-500/40 flex items-center justify-center hover:bg-brand-600 transition-colors text-2xl">
        {open ? <X size={22}/> : '🤖'}
      </motion.button>
    </div>
  )
}
