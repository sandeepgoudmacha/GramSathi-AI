import React, { useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
// Landing image provided by user
import LandingImage from '../../landing page image.png'
import { useForm } from 'react-hook-form'
import { Eye, EyeOff, Loader2, ArrowRight, Star } from 'lucide-react'
import { useAuthStore } from '@/store/index'
import { useQuery } from '@tanstack/react-query'
import { statsApi } from '@/services/api'
import { inr } from '@/utils/helpers'
import Marketplace from '@/components/Marketplace'

/* ══════════════════════════════════════════
   LANDING PAGE
══════════════════════════════════════════ */
const FEATURES = [
  { icon:'💰', title:'Financial Inclusion', desc:'AI credit scoring, loan management, and savings tracking for every SHG member.' },
  { icon:'📋', title:'Government Schemes', desc:'Discover and apply for 10+ real government schemes with AI eligibility matching.' },
  { icon:'🎓', title:'Skill Development', desc:'Personalized recommendations and free training program enrollment.' },
  { icon:'🛒', title:'Digital Marketplace', desc:'Sell SHG products nationwide. AI-generated product descriptions.' },
  { icon:'🏥', title:'Health Guidance', desc:'AI health advisor in your language. Find nearby government facilities.' },
  { icon:'👥', title:'SHG Management', desc:'Real-time group management replacing paper records.' },
]

export function LandingPage() {
  const nav = useNavigate()
  const { data: stats } = useQuery({ queryKey:['public-stats'], queryFn:()=>statsApi.public().then(r=>r.data), staleTime:60000 })
  const imgRef = useRef<HTMLDivElement | null>(null)
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 })
  const [hover, setHover] = useState(false)
  const handleMove = (e: React.MouseEvent) => {
    const el = imgRef.current as any
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const px = (x / rect.width - 0.5) * 2
    const py = (y / rect.height - 0.5) * 2
    setTilt({ rx: -py * 8, ry: px * 12 })
  }
  const handleLeave = () => setTilt({ rx: 0, ry: 0 })

  return (
    <div className="min-h-screen bg-[#0b1a10] text-white">
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#0b1a10]/92 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">🌱</div>
            <span className="font-display font-bold text-lg">GramSathi AI</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/marketplace" className="text-sm text-white/70 hover:text-white px-3 py-2 transition-colors">Marketplace</Link>
            <button onClick={() => nav('/login')} className="text-sm text-white/70 hover:text-white px-3 py-2 transition-colors">Login</button>
            <button onClick={() => nav('/register')} className="btn-primary btn-sm">Register Free →</button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-5 pt-20 pb-16">
        <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}}>
          <div className="inline-flex items-center gap-2 bg-brand-500/15 border border-brand-500/30 rounded-full px-4 py-1.5 text-sm text-brand-300 mb-6">
            <span className="w-2 h-2 bg-brand-400 rounded-full animate-pulse"/>
            AI-Powered Rural Empowerment Platform
          </div>
          <div className="flex flex-col lg:flex-row items-center gap-10">
            <div className="flex-1">
              <h1 className="font-display text-5xl md:text-6xl font-extrabold leading-tight mb-5 max-w-3xl">
                Empowering Every <span className="text-brand-400">SHG Member</span> with the Power of AI
              </h1>
              <p className="text-lg text-white/60 max-w-xl leading-relaxed mb-8">
                GramSathi connects rural Self-Help Groups with financial services, government schemes, skill training, and digital markets — all in one platform.
              </p>
              <div className="flex flex-wrap gap-3">
                <button onClick={() => nav('/register')} className="btn-primary btn-lg gap-2">Join as SHG Member <ArrowRight size={18}/></button>
                <button onClick={() => nav('/login')} className="btn btn-lg border border-white/20 text-white/80 hover:bg-white/10 rounded-xl">Sign In →</button>
              </div>
            </div>

            <div className="flex-1 flex justify-center lg:justify-end">
              <div
                ref={imgRef}
                onMouseMove={handleMove}
                onMouseEnter={() => setHover(true)}
                onMouseLeave={() => { handleLeave(); setHover(false) }}
                className="w-[480px] md:w-[520px] max-w-full rounded-3xl shadow-2xl transform-gpu"
                style={{ perspective: 1200 }}>
                <motion.img
                  src={LandingImage}
                  alt="GramSathi landing"
                  className="w-full rounded-3xl border border-white/5"
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                  style={{
                    transform: `translateX(12px) rotateY(${tilt.ry + (hover ? 6 : 0)}deg) rotateX(${tilt.rx + (hover ? -3 : 0)}deg) translateZ(20px) translateY(${hover ? -8 : 0}px)`,
                    transition: 'transform 180ms cubic-bezier(.2,.9,.2,1)',
                    boxShadow: hover ? '0 40px 80px rgba(0,0,0,0.45)' : '0 18px 36px rgba(0,0,0,0.25)'
                  }}
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Live Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mt-16 pt-12 border-t border-white/10">
          {[
            [stats?.members?.toLocaleString()||'—', 'SHG Members'],
            [stats?.loans_disbursed ? inr(stats.loans_disbursed) : '—', 'Loans Disbursed'],
            [stats?.active_products?.toLocaleString()||'—', 'Marketplace Products'],
            [stats?.active_schemes?.toLocaleString()||'—', 'Active Schemes'],
          ].map(([v,l]) => (
            <div key={String(l)}>
              <div className="font-display text-3xl font-bold text-brand-400">{v}</div>
              <div className="text-sm text-white/50 mt-1">{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="bg-[#0f2318] py-20">
        <div className="max-w-6xl mx-auto px-5">
          <h2 className="font-display text-4xl font-bold text-center mb-3">Everything Your Community Needs</h2>
          <p className="text-white/50 text-center mb-12">One platform. All services. Accessible to everyone.</p>
          <div className="grid md:grid-cols-3 gap-5">
            {FEATURES.map((f,i) => (
              <motion.div key={f.title} initial={{opacity:0,y:12}} whileInView={{opacity:1,y:0}} transition={{delay:i*0.07}} viewport={{once:true}}
                className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-brand-500/40 transition-all">
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="font-display text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Marketplace */}
      <Marketplace />

      {/* Testimonials */}
      <section className="py-20 max-w-6xl mx-auto px-5">
        <h2 className="font-display text-4xl font-bold text-center mb-12">Stories from the Ground</h2>
        <div className="grid md:grid-cols-3 gap-5">
          {[
            { t:'GramSathi helped me get a MUDRA loan in 10 days. My tailoring shop now earns ₹12,000/month.', n:'Savitha Devi', r:'SHG Member, Nalgonda', i:'SD' },
            { t:'Finding eligible government schemes was impossible before. The AI shows exactly what I qualify for and guides me through the application.', n:'Meena Kumari', r:'SHG Member, Warangal', i:'MK' },
            { t:'Managing 15 SHG groups across villages was a nightmare. GramSathi made everything digital and real-time. 3× productivity.', n:'Raju Sharma', r:'District Coordinator, Karimnagar', i:'RS' },
          ].map((t,i) => (
            <motion.div key={t.n} initial={{opacity:0,y:12}} whileInView={{opacity:1,y:0}} transition={{delay:i*0.1}} viewport={{once:true}}
              className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="flex gap-0.5 mb-4">{Array(5).fill(0).map((_,j)=><Star key={j} size={13} fill="#f59e0b" className="text-amber-400"/>)}</div>
              <p className="text-sm text-white/70 leading-relaxed italic mb-5">"{t.t}"</p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-brand-600 flex items-center justify-center text-sm font-bold">{t.i}</div>
                <div><p className="text-sm font-semibold">{t.n}</p><p className="text-xs text-white/40">{t.r}</p></div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-brand-600/15 border-t border-brand-500/20 py-20 text-center">
        <h2 className="font-display text-3xl font-bold mb-4">Ready to Transform Your Community?</h2>
        <p className="text-white/60 mb-8 max-w-md mx-auto">Join thousands of SHG members already using GramSathi AI.</p>
        <button onClick={() => nav('/register')} className="btn-primary btn-lg gap-2">Get Started Free <ArrowRight size={18}/></button>
      </section>
      <footer className="border-t border-white/10 py-6 text-center text-sm text-white/30">
        © 2026 GramSathi AI · Made with ❤️ for Rural India
      </footer>
    </div>
  )
}

/* ══════════════════════════════════════════
   LOGIN PAGE
══════════════════════════════════════════ */
export function LoginPage() {
  const nav = useNavigate()
  const { login, isLoading } = useAuthStore()
  const [showPwd, setShowPwd] = useState(false)
  const { register, handleSubmit, setValue, formState:{errors} } = useForm({ defaultValues:{phone:'9000000000',password:'Admin@123'} })

  const onSubmit = async (d: any) => { try { await login(d.phone, d.password); nav('/app/dashboard') } catch {} }

  const DEMOS = [
    { label:'👩 SHG Member',  phone:'9111111111', pwd:'Member@123', cls:'bg-green-50 border-green-200 text-green-700' },
    { label:'👨‍💼 Coordinator', phone:'9222222222', pwd:'Coord@123',  cls:'bg-blue-50 border-blue-200 text-blue-700' },
    { label:'🏦 Bank Officer', phone:'9333333333', pwd:'Bank@123',   cls:'bg-purple-50 border-purple-200 text-purple-700' },
    { label:'⚙️ Admin',        phone:'9000000000', pwd:'Admin@123',  cls:'bg-amber-50 border-amber-200 text-amber-700' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} className="w-full max-w-md">
        <div className="text-center mb-7">
          <div className="w-14 h-14 bg-brand-500 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-3">🌱</div>
          <h1 className="font-display text-2xl font-bold">Welcome back</h1>
          <p className="text-gray-500 text-sm mt-1">Sign in to GramSathi AI</p>
        </div>

        <div className="card p-6 mb-4">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Mobile Number</label>
              <input {...register('phone',{required:'Phone required'})} className="input" placeholder="10-digit mobile number"/>
              {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone.message as string}</p>}
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input {...register('password',{required:'Password required'})} type={showPwd?'text':'password'} className="input pr-10" placeholder="Password"/>
                <button type="button" onClick={()=>setShowPwd(p=>!p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPwd?<EyeOff size={15}/>:<Eye size={15}/>}
                </button>
              </div>
            </div>
            <button type="submit" disabled={isLoading} className="btn-primary w-full py-2.5">
              {isLoading?<><Loader2 size={15} className="animate-spin"/>Signing in…</>:'Sign In'}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-4">
            Don't have an account?{' '}
            <Link to="/register" className="text-brand-600 font-semibold hover:underline">Register free</Link>
          </p>
        </div>

        <div className="card p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Quick Demo Access</p>
          <div className="grid grid-cols-2 gap-2">
            {DEMOS.map(d => (
              <button key={d.label} onClick={() => {
                setValue('phone',d.phone); setValue('password',d.pwd)
                login(d.phone,d.pwd).then(()=>nav('/app/dashboard')).catch(()=>{})
              }} className={`text-xs border rounded-lg px-3 py-2 font-medium transition-all hover:shadow-sm ${d.cls}`}>
                {d.label}
              </button>
            ))}
          </div>
        </div>
        <p className="text-center mt-4"><Link to="/" className="text-sm text-gray-400 hover:text-gray-600">← Back to home</Link></p>
      </motion.div>
    </div>
  )
}

/* ══════════════════════════════════════════
   REGISTER PAGE
══════════════════════════════════════════ */
export function RegisterPage() {
  const nav = useNavigate()
  const { register: registerUser, isLoading } = useAuthStore()
  const [step, setStep] = useState(1)
  const [showPwd, setShowPwd] = useState(false)
  const { register, handleSubmit, trigger, formState:{errors} } = useForm({ defaultValues:{state:'Telangana'} })

  const STATES = ['Telangana','Andhra Pradesh','Maharashtra','Madhya Pradesh','Uttar Pradesh','Bihar','Rajasthan','Karnataka','Tamil Nadu','Odisha','Jharkhand','Chhattisgarh']
  const OCCUPATIONS = ['Agriculture','Handicrafts','Animal Husbandry','Small Business','Daily Wage Labour','Food Processing','Tailoring','Weaving','Pottery','Other']

  const next = async () => {
    const fields: any = step===1 ? ['full_name','phone','password'] : ['village','district']
    const ok = await trigger(fields)
    if (ok) setStep(s=>s+1)
  }

  const onSubmit = async (d: any) => {
    try { await registerUser(d); nav('/login') } catch {}
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-brand-500 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-3">🌱</div>
          <h1 className="font-display text-2xl font-bold">Create Account</h1>
          <p className="text-gray-500 text-sm mt-1">Join GramSathi AI for free</p>
        </div>

        {/* Step indicator */}
        <div className="flex gap-2 mb-2">
          {[1,2,3].map(s=><div key={s} className={`flex-1 h-1.5 rounded-full transition-all ${step>=s?'bg-brand-500':'bg-gray-200'}`}/>)}
        </div>
        <p className="text-xs text-gray-500 text-center mb-5">Step {step} of 3 — {['Personal Details','Location','Occupation'][step-1]}</p>

        <div className="card p-6">
          <form onSubmit={handleSubmit(onSubmit)}>
            {step===1 && (
              <div className="space-y-4">
                <div>
                  <label className="label">Full Name *</label>
                  <input {...register('full_name',{required:'Full name is required',minLength:{value:2,message:'Minimum 2 characters'}})} className="input" placeholder="Your full name"/>
                  {errors.full_name && <p className="text-xs text-red-500 mt-1">{errors.full_name.message as string}</p>}
                </div>
                <div>
                  <label className="label">Mobile Number *</label>
                  <input {...register('phone',{required:'Phone is required',pattern:{value:/^[6-9]\d{9}$/,message:'Enter valid 10-digit mobile'}})} className="input" placeholder="10-digit mobile"/>
                  {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone.message as string}</p>}
                </div>
                <div>
                  <label className="label">Email (optional)</label>
                  <input {...register('email')} type="email" className="input" placeholder="your@email.com"/>
                </div>
                <div>
                  <label className="label">Password *</label>
                  <div className="relative">
                    <input {...register('password',{required:'Password required',minLength:{value:8,message:'Minimum 8 characters'}})} type={showPwd?'text':'password'} className="input pr-10" placeholder="Min 8 characters"/>
                    <button type="button" onClick={()=>setShowPwd(p=>!p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{showPwd?<EyeOff size={15}/>:<Eye size={15}/>}</button>
                  </div>
                  {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message as string}</p>}
                </div>
              </div>
            )}
            {step===2 && (
              <div className="space-y-4">
                <div>
                  <label className="label">Village / Gram Panchayat *</label>
                  <input {...register('village',{required:'Village is required'})} className="input" placeholder="Your village name"/>
                  {errors.village && <p className="text-xs text-red-500 mt-1">{errors.village.message as string}</p>}
                </div>
                <div>
                  <label className="label">District *</label>
                  <input {...register('district',{required:'District is required'})} className="input" placeholder="Your district"/>
                  {errors.district && <p className="text-xs text-red-500 mt-1">{errors.district.message as string}</p>}
                </div>
                <div>
                  <label className="label">State</label>
                  <select {...register('state')} className="input">{STATES.map(s=><option key={s}>{s}</option>)}</select>
                </div>
              </div>
            )}
            {step===3 && (
              <div className="space-y-4">
                <div>
                  <label className="label">Primary Occupation</label>
                  <select {...register('occupation')} className="input"><option value="">Select occupation</option>{OCCUPATIONS.map(o=><option key={o}>{o}</option>)}</select>
                </div>
                <div>
                  <label className="label">Aadhaar Number (optional)</label>
                  <input {...register('aadhaar')} className="input" placeholder="XXXX XXXX XXXX"/>
                </div>
                <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 text-sm text-brand-700">
                  <p className="font-semibold mb-1">✅ Almost ready!</p>
                  <p className="text-xs text-brand-600">After registration, you can apply for loans, browse government schemes, and sell on the marketplace.</p>
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              {step>1 && <button type="button" onClick={()=>setStep(s=>s-1)} className="btn-secondary flex-1">← Back</button>}
              {step<3
                ? <button type="button" onClick={next} className="btn-primary flex-1">Continue →</button>
                : <button type="submit" disabled={isLoading} className="btn-primary flex-1">
                    {isLoading?<><Loader2 size={15} className="animate-spin"/>Creating…</>:'Create Account ✓'}
                  </button>}
            </div>
          </form>
        </div>
        <p className="text-center text-sm text-gray-500 mt-4">
          Already have an account? <Link to="/login" className="text-brand-600 font-semibold hover:underline">Sign in</Link>
        </p>
      </motion.div>
    </div>
  )
}
