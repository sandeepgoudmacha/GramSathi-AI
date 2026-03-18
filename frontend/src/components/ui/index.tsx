import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn, creditColor } from '@/utils/helpers'

/* ── Stat Card ── */
export function StatCard({ label, value, icon, change, trend, color='green', onClick }: any) {
  const c: any = { green:'bg-green-50 text-green-700', blue:'bg-blue-50 text-blue-700', amber:'bg-amber-50 text-amber-700', purple:'bg-purple-50 text-purple-700', red:'bg-red-50 text-red-700' }
  return (
    <motion.div whileHover={{ y:-2 }} className="card p-5 cursor-pointer" onClick={onClick}>
      <div className="flex items-start justify-between mb-3">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-xl', c[color]||c.green)}>{icon}</div>
        {change && <div className={cn('flex items-center gap-1 text-xs font-medium', trend==='up'?'text-green-600':trend==='down'?'text-red-500':'text-gray-400')}>
          {trend==='up'?<TrendingUp size={11}/>:trend==='down'?<TrendingDown size={11}/>:<Minus size={11}/>}{change}
        </div>}
      </div>
      <div className="font-display text-2xl font-bold text-gray-900 mb-0.5">{value}</div>
      <div className="text-xs text-gray-500 font-medium">{label}</div>
    </motion.div>
  )
}

/* ── Credit Gauge ── */
export function CreditGauge({ score }: { score: number }) {
  const { grade, badge } = creditColor(score)
  const pct = Math.min(score/100, 1)
  const r = 52, cx = 72, cy = 72
  const circ = Math.PI * r
  const a = (pct * 180 - 90) * Math.PI / 180
  const nx = cx + r * Math.cos(a), ny = cy + r * Math.sin(a)
  const fill = score>=65?'#16a34a':score>=50?'#d97706':'#dc2626'
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 144 82" className="w-40">
        <path d={`M${cx-r} ${cy} A${r} ${r} 0 0 1 ${cx+r} ${cy}`} fill="none" stroke="#f3f4f6" strokeWidth="11" strokeLinecap="round"/>
        <path d={`M${cx-r} ${cy} A${r} ${r} 0 0 1 ${cx+r} ${cy}`} fill="none" stroke={fill} strokeWidth="11" strokeLinecap="round" strokeDasharray={`${pct*circ} ${circ}`}/>
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#374151" strokeWidth="2.5" strokeLinecap="round"/>
        <circle cx={cx} cy={cy} r="4" fill="#374151"/>
      </svg>
      <div className="-mt-1 font-display text-3xl font-bold text-gray-900">{Math.round(score)}</div>
      <span className={cn('badge mt-1', badge)}>{grade}</span>
    </div>
  )
}

/* ── Progress Bar ── */
export function ProgressBar({ value, max=100, color='green', label, showPct=true }: any) {
  const pct = Math.min((value/max)*100, 100)
  const c: any = { green:'bg-brand-500', amber:'bg-amber-500', red:'bg-red-500', blue:'bg-blue-500' }
  return (
    <div>
      {(label||showPct) && (
        <div className="flex justify-between mb-1">
          {label && <span className="text-xs text-gray-500">{label}</span>}
          {showPct && <span className="text-xs font-semibold">{Math.round(pct)}%</span>}
        </div>
      )}
      <div className="progress">
        <motion.div className={cn('progress-fill', c[color]||'bg-brand-500')}
          initial={{width:0}} animate={{width:`${pct}%`}} transition={{duration:0.8,ease:'easeOut'}}/>
      </div>
    </div>
  )
}

/* ── Spinner ── */
export function Spinner({ size='md', text='' }: { size?:'sm'|'md'|'lg'; text?: string }) {
  const s = { sm:'w-4 h-4 border-2', md:'w-8 h-8 border-[3px]', lg:'w-12 h-12 border-4' }
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <div className={cn('border-gray-200 border-t-brand-500 rounded-full animate-spin', s[size])}/>
      {text && <p className="text-sm text-gray-500">{text}</p>}
    </div>
  )
}

/* ── Empty State ── */
export function EmptyState({ icon, title, message, action }: any) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center px-4">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="font-display text-base font-bold text-gray-700 mb-1">{title}</h3>
      <p className="text-sm text-gray-400 max-w-xs mb-5">{message}</p>
      {action}
    </div>
  )
}

/* ── Modal ── */
export function Modal({ open, onClose, title, children, size='md' }: any) {
  const sizes: any = { sm:'max-w-sm', md:'max-w-md', lg:'max-w-2xl', xl:'max-w-4xl' }
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}/>
          <motion.div initial={{opacity:0,scale:0.96}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.96}} transition={{duration:0.18}}
            className={cn('relative bg-white rounded-2xl shadow-xl w-full max-h-[90vh] overflow-y-auto', sizes[size])}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h2 className="font-display text-base font-bold text-black">{title}</h2>
              <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"><X size={16}/></button>
            </div>
            <div className="p-6">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

/* ── Data Table ── */
export function DataTable({ headers, rows, loading, emptyMsg='No records found' }: any) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead><tr>{headers.map((h: string) => <th key={h} className="th">{h}</th>)}</tr></thead>
        <tbody>
          {loading
            ? <tr><td colSpan={headers.length}><Spinner/></td></tr>
            : !rows?.length
              ? <tr><td colSpan={headers.length}><EmptyState icon="📭" title={emptyMsg} message=""/></td></tr>
              : rows.map((row: any[], i: number) => (
                <tr key={i} className="hover:bg-gray-50/60 transition-colors">
                  {row.map((cell, j) => <td key={j} className="td">{cell}</td>)}
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  )
}

/* ── Timeline ── */
export function Timeline({ steps }: { steps:{title:string;date:string;done:boolean;current?:boolean}[] }) {
  return (
    <div>
      {steps.map((s, i) => (
        <div key={i} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className={cn('w-3 h-3 rounded-full mt-0.5 shrink-0 ring-2',
              s.done?'bg-brand-500 ring-brand-200':s.current?'bg-amber-400 ring-amber-200':'bg-gray-200 ring-gray-100')}/>
            {i < steps.length-1 && <div className={cn('w-0.5 flex-1 my-1 min-h-[20px]', s.done?'bg-brand-300':'bg-gray-100')}/>}
          </div>
          <div className="pb-4 flex-1">
            <div className={cn('text-sm font-semibold', s.done?'text-gray-800':s.current?'text-amber-700':'text-gray-400')}>{s.title}</div>
            <div className="text-xs text-gray-400 mt-0.5">{s.date}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── Tabs ── */
export function Tabs({ tabs, active, onChange }: { tabs:{id:string;label:string}[];active:string;onChange:(id:string)=>void }) {
  return (
    <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-5 w-fit flex-wrap">
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)}
          className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-all', active===t.id?'bg-white shadow-sm text-brand-700':'text-gray-500 hover:text-gray-700')}>
          {t.label}
        </button>
      ))}
    </div>
  )
}

/* ── Form Field ── */
export function Field({ label, error, required, children }: any) {
  return (
    <div className="mb-4">
      <label className="label">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

/* ── Info Banner ── */
export function InfoBanner({ icon, title, message, color='blue' }: any) {
  const c: any = { blue:'bg-blue-50 border-blue-200 text-blue-800', green:'bg-brand-50 border-brand-200 text-brand-800', amber:'bg-amber-50 border-amber-200 text-amber-800' }
  return (
    <div className={cn('border rounded-xl p-4 flex gap-3 mb-5', c[color])}>
      <div className="text-2xl shrink-0">{icon}</div>
      <div><p className="font-semibold text-sm mb-0.5">{title}</p><p className="text-xs opacity-80">{message}</p></div>
    </div>
  )
}
