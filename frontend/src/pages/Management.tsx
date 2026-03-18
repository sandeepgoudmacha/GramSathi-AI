import React, { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { motion } from 'framer-motion'
import { Search, Plus, Send, Loader2, ShoppingCart, X, CheckCircle } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { StatCard, DataTable, EmptyState, Spinner, Modal, ProgressBar, Tabs, CreditGauge, InfoBanner, Timeline, Field } from '@/components/ui/index'
import { aiApi, marketplaceApi, loansApi, savingsApi, dashboardApi, usersApi, trainingApi, meetingsApi, schemesApi, creditApi, uploadApi, adminApi } from '@/services/api'
import { inr, fdate, ago, loanStatusBadge, orderStatusBadge, schemeStatusBadge, creditColor, initials } from '@/utils/helpers'
import { useAuthStore } from '@/store/index'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'

/* ════════════════════════════════════════
   HEALTH GUIDANCE
════════════════════════════════════════ */
export function HealthPage() {
  const [query, setQuery] = useState('')
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const { data: history, refetch } = useQuery({ queryKey:['health-history'], queryFn:()=>aiApi.healthHistory().then(r=>r.data), staleTime:60000 })

  const TOPICS = [
    { icon:'🥗', label:'Nutrition',       q:'How to eat healthy on a low budget? What iron-rich foods are available locally in Indian villages?' },
    { icon:'🤰', label:'Maternal Health', q:'What care is needed during pregnancy? What government schemes help pregnant women in India?' },
    { icon:'🧼', label:'Hygiene',         q:'Best hygiene practices to prevent disease spread in rural areas. Safe drinking water tips.' },
    { icon:'💊', label:'Medicines',       q:'What essential medicines should rural households keep at home for common illnesses?' },
    { icon:'🧒', label:'Child Health',    q:'What vaccinations does a child need? How to ensure proper nutrition in first 2 years of life?' },
    { icon:'🧠', label:'Mental Health',   q:'How to deal with stress, anxiety and mental health challenges in rural everyday life?' },
  ]

  const ask = async (q?: string) => {
    const question = q || query
    if (!question.trim() || loading) return
    setLoading(true); setAnswer('')
    try {
      const { data } = await aiApi.health({ query: question.trim() })
      setAnswer(data.response)
      refetch()
    } catch { setAnswer('Unable to get response. Please try again or contact your ASHA worker.') }
    finally { setLoading(false) }
  }

  return (
    <AppShell title="Health Guidance" subtitle="AI-powered health information and nearby facilities">
      {/* Topic cards */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
        {TOPICS.map(t => (
          <button key={t.label} onClick={()=>{ setQuery(t.q); ask(t.q) }}
            className="card p-4 text-center hover:border-brand-300 hover:bg-brand-50 transition-all cursor-pointer group">
            <div className="text-3xl mb-2">{t.icon}</div>
            <div className="text-xs font-medium text-gray-600 group-hover:text-brand-700">{t.label}</div>
          </button>
        ))}
      </div>

      {/* AI Query */}
      <div className="card p-5 mb-5">
        <h3 className="section-title mb-1">Ask Health Question</h3>
        <p className="text-xs text-gray-400 mb-4">Get AI-powered guidance. For emergencies call <strong className="text-red-600">108</strong> (free ambulance)</p>
        <div className="flex gap-3">
          <input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&ask()}
            placeholder="Type your health question…" className="input flex-1"/>
          <button onClick={()=>ask()} disabled={!query.trim()||loading} className="btn-primary px-4 gap-2">
            {loading?<Loader2 size={15} className="animate-spin"/>:<Send size={15}/>}Ask AI
          </button>
        </div>
        {loading && (
          <div className="mt-4 flex gap-2 items-center text-sm text-gray-400">
            <div className="flex gap-1">{[0,.15,.3].map((d,i)=><div key={i} className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce" style={{animationDelay:`${d}s`}}/>)}</div>
            AI is thinking…
          </div>
        )}
        {answer && (
          <motion.div initial={{opacity:0,y:5}} animate={{opacity:1,y:0}} className="mt-4 bg-brand-50 border border-brand-200 rounded-xl p-4 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
            {answer}
          </motion.div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Facilities */}
        <div className="card">
          <div className="px-5 py-4 border-b border-gray-100"><h3 className="section-title">Nearby Health Facilities</h3></div>
          <DataTable headers={['Facility','Type','Distance','Timings']}
            rows={[
              ['Nalgonda PHC', <span className="badge badge-green">Govt PHC</span>, '2.1 km', 'Mon–Sat 9am–4pm'],
              ['District Hospital', <span className="badge badge-blue">Govt Hospital</span>, '12 km', '24×7 Emergency'],
              ['ASHA Health Camp', <span className="badge badge-amber">Mobile Camp</span>, '0.5 km', 'March 20, 10–2pm'],
              ['Jan Aushadhi Store', <span className="badge badge-purple">Pharmacy</span>, '3 km', 'Mon–Sat 9–7pm'],
            ]}
          />
        </div>

        {/* Query history */}
        <div className="card p-5">
          <h3 className="section-title mb-4">Recent Queries</h3>
          {!history?.length
            ? <EmptyState icon="🏥" title="No queries yet" message="Click a topic above or type a question"/>
            : (
              <div className="space-y-2.5">
                {history.slice(0,6).map((q:any) => (
                  <div key={q.id} onClick={()=>{setQuery(q.query);setAnswer(q.response)}}
                    className="p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-brand-50 transition-colors">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="badge badge-blue text-[10px]">{q.category}</span>
                      <span className="text-[10px] text-gray-400">{ago(q.created_at)}</span>
                    </div>
                    <p className="text-xs font-medium text-gray-700 line-clamp-2">{q.query}</p>
                  </div>
                ))}
              </div>
            )}
        </div>
      </div>
    </AppShell>
  )
}

/* ════════════════════════════════════════
   MARKETPLACE
════════════════════════════════════════ */
export function MarketplacePage() {
  const { user } = useAuthStore()
  const [cat, setCat] = useState('All')
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<any[]>([])
  const [tab, setTab] = useState('browse')
  const [addModal, setAddModal] = useState(false)
  const [cartModal, setCartModal] = useState(false)
  const qc = useQueryClient()
  const { register: reg, handleSubmit: hSubmit, reset: resetForm } = useForm()
  const { register: orderReg, handleSubmit: orderHSubmit, reset: resetOrder } = useForm()
  const [imagesFiles, setImagesFiles] = useState<File[]>([])

  const { data: products, isLoading } = useQuery({
    queryKey: ['products',cat,search],
    queryFn: () => marketplaceApi.products({category:cat==='All'?undefined:cat,search:search||undefined}).then(r=>r.data),
    staleTime: 30000,
  })
  const { data: myOrders } = useQuery({
    queryKey: ['my-orders'],
    queryFn: () => marketplaceApi.orders().then(r=>r.data),
    enabled: tab === 'orders',
    staleTime: 20000,
    refetchInterval: tab==='orders' ? 30000 : false,
  })

  const createMutation = useMutation({
    mutationFn: async (d:any) => {
      const payload: any = { ...d, price: parseFloat(d.price), stock: parseInt(d.stock)||0, tags: [] }
      if (imagesFiles && imagesFiles.length) {
        const urls: string[] = []
        for (const f of imagesFiles) {
          const res = await uploadApi.file(f)
          urls.push(res.data.url)
        }
        payload.images = urls
      }
      return marketplaceApi.createProduct(payload)
    },
    onSuccess: () => { toast.success('Product listed! AI description generated.'); setAddModal(false); resetForm(); setImagesFiles([]); qc.invalidateQueries({queryKey:['products']}) },
    onError: (e:any) => toast.error(e.response?.data?.detail||'Failed'),
  })
  const orderMutation = useMutation({
    mutationFn: (d:any) => marketplaceApi.placeOrder({ ...d, buyer_id:user?.id, items:cart.map(i=>({product_id:i.id,quantity:i.qty})) }),
    onSuccess: () => { toast.success('Order placed!'); setCart([]); setCartModal(false); resetOrder(); qc.invalidateQueries({queryKey:['my-orders']}); qc.invalidateQueries({queryKey:['products']}) },
    onError: (e:any) => toast.error(e.response?.data?.detail||'Failed'),
  })
  const statusMutation = useMutation({
    mutationFn: ({id,status}:any) => marketplaceApi.updateStatus(id,status),
    onSuccess: () => { toast.success('Status updated!'); qc.invalidateQueries({queryKey:['my-orders']}) },
    onError: (e:any) => toast.error(e.response?.data?.detail||'Order update failed'),
  })

  const CATS = ['All','Textiles','Food','Crafts','Wellness','Agriculture']
  const cartTotal = cart.reduce((s,i)=>s+i.price*i.qty,0)
  const addToCart = (p:any) => {
    if (p.stock <= 0) { toast.error('Out of stock'); return }
    setCart(c=>{const idx=c.findIndex(i=>i.id===p.id);return idx>=0?c.map((i,j)=>j===idx?{...i,qty:i.qty+1}:i):[...c,{...p,qty:1}]})
    toast.success(`${p.name} added!`,{duration:1500})
  }

  const STATUS_ACTIONS: any = { placed:['confirmed'], confirmed:['shipped'], shipped:['delivered'], delivered:[], cancelled:[] }

  return (
    <AppShell title="Marketplace" subtitle="Buy and sell SHG products across India">
      <Tabs tabs={[{id:'browse',label:'Browse Products'},{id:'my-products',label:'My Products'},{id:'orders',label:'Seller Orders'}]} active={tab} onChange={setTab}/>

      {tab==='browse' && (
        <>
          <div className="flex gap-3 mb-5 flex-wrap items-center">
            <div className="flex-1 min-w-48 flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2.5">
              <Search size={14} className="text-gray-400 shrink-0"/>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search products…" className="flex-1 text-sm outline-none"/>
            </div>
            <div className="flex gap-2 flex-wrap">
              {CATS.map(c=><button key={c} onClick={()=>setCat(c)} className={`text-xs px-3 py-2 rounded-lg font-medium border transition-all ${cat===c?'bg-brand-500 text-white border-brand-500':'bg-white text-gray-600 border-gray-200 hover:border-brand-300'}`}>{c}</button>)}
            </div>
            <button onClick={()=>setAddModal(true)} className="btn-primary btn-sm gap-1 shrink-0"><Plus size={13}/>List Product</button>
            {cart.length>0&&<button onClick={()=>setCartModal(true)} className="btn-secondary btn-sm gap-1.5 shrink-0 relative">
              <ShoppingCart size={14}/> Cart ({cart.length}) · {inr(cartTotal)}
            </button>}
          </div>

          {isLoading ? <Spinner/> : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {(products?.items||[]).map((p:any,i:number) => {
                const img = JSON.parse(p.images||'[]')[0]
                return (
                  <motion.div key={p.id} initial={{opacity:0,scale:0.97}} animate={{opacity:1,scale:1}} transition={{delay:i*0.03}} className="card overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all group">
                    <div className="h-32 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center text-4xl group-hover:scale-105 transition-transform">
                      {img?.startsWith('/uploads') ? <img src={img} className="w-full h-full object-cover" alt={p.name}/> : img||'📦'}
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-semibold text-gray-800 truncate">{p.name}</p>
                      <p className="text-base font-bold text-brand-600">{inr(p.price)}</p>
                      <p className="text-xs text-gray-400 mb-2">by {p.seller_name} · {p.stock} left</p>
                      <button onClick={()=>addToCart(p)} disabled={p.stock<=0} className="btn-primary btn-sm w-full text-xs">
                        {p.stock>0?'Add to Cart':'Out of Stock'}
                      </button>
                    </div>
                  </motion.div>
                )
              })}
              {!products?.items?.length && <div className="col-span-4"><EmptyState icon="🛒" title="No products found" message="Try a different category or search"/></div>}
            </div>
          )}
        </>
      )}

      {tab==='my-products' && (
        <div className="space-y-4">
          <div className="flex justify-end"><button onClick={()=>setAddModal(true)} className="btn-primary btn-sm gap-1"><Plus size={13}/>List New Product</button></div>
          <div className="card">
            <DataTable
              headers={['Product','Price','Stock','Sold','Rating','Status','Action']}
              rows={(products?.items||[]).filter((p:any)=>p.seller_id===user?.id).map((p:any) => {
                const firstImg = (() => { try { return JSON.parse(p.images||'[]')[0] } catch { return null } })()
                return [
                  <div className="flex items-center gap-2">
                    {firstImg && typeof firstImg === 'string' && firstImg.startsWith('/uploads')
                      ? <img src={firstImg} className="w-10 h-10 object-cover rounded" alt={p.name} />
                      : <span className="text-xl">{firstImg || '📦'}</span>
                    }
                    <span className="font-semibold text-sm">{p.name}</span>
                  </div>,
                  <span className="font-bold text-brand-600">{inr(p.price)}</span>,
                  <span className={p.stock<=5?'text-red-500 font-semibold':''}>{p.stock}</span>,
                  p.total_sold||0,
                  p.rating_count>0 ? `⭐ ${p.rating?.toFixed(1)}` : '—',
                  <span className={`badge ${p.is_active?'badge-green':'badge-gray'}`}>{p.is_active?'Active':'Inactive'}</span>,
                  <div className="flex gap-2">
                    <button onClick={()=>marketplaceApi.updateProduct(p.id,{is_active:p.is_active?0:1}).then(()=>{toast.success('Updated!');qc.invalidateQueries({queryKey:['products']})})} className="btn-secondary btn-sm">
                      {p.is_active?'Deactivate':'Activate'}
                    </button>
                    <button onClick={()=>marketplaceApi.deleteProduct(p.id).then(()=>{toast.success('Deleted');qc.invalidateQueries({queryKey:['products']})})} className="btn-danger btn-sm">Delete</button>
                  </div>,
                ]
              })}
              emptyMsg="No products listed yet — click 'List New Product'"
            />
          </div>
        </div>
      )}

      {tab==='orders' && (
        <div className="space-y-4">
          {!myOrders?.length
            ? <EmptyState icon="📦" title="No orders yet" message="Orders for your products will appear here"/>
            : myOrders.map((o:any) => (
              <div key={o.id} className="card p-5">
                <div className="flex justify-between items-start mb-3 flex-wrap gap-2">
                  <div>
                    <p className="font-bold text-sm font-mono">{o.order_number}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{o.buyer_name} · {o.buyer_phone} · {ago(o.created_at)}</p>
                    <p className="text-xs text-gray-400 mt-0.5 max-w-xs truncate">{o.buyer_address}</p>
                  </div>
                  <div className="text-right">
                    <span className={`badge ${orderStatusBadge(o.status)}`}>{o.status}</span>
                    <p className="font-bold text-brand-600 mt-1">{inr(o.total_amount)}</p>
                  </div>
                </div>
                <div className="space-y-1 mb-3 bg-gray-50 rounded-xl p-3">
                  {(o.items||[]).map((item:any) => (
                    <div key={item.id} className="flex justify-between text-xs text-gray-600">
                      <span>{item.product_name} ×{item.quantity}</span>
                      <span className="font-semibold">{inr(item.total_price)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 flex-wrap">
                  {(STATUS_ACTIONS[o.status]||[]).map((nextStatus:string) => (
                    <button key={nextStatus} onClick={()=>statusMutation.mutate({id:o.id,status:nextStatus})} disabled={statusMutation.isPending}
                      className={`btn-sm ${nextStatus==='delivered'?'btn-success':'btn-primary'}`}>
                      {nextStatus==='confirmed'?'✓ Confirm':nextStatus==='shipped'?'🚚 Mark Shipped':'✅ Mark Delivered'}
                    </button>
                  ))}
                  {!['delivered','cancelled'].includes(o.status) && (
                    <button onClick={()=>statusMutation.mutate({id:o.id,status:'cancelled'})} className="btn-danger btn-sm">✗ Cancel</button>
                  )}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Add Product Modal */}
      <Modal open={addModal} onClose={()=>setAddModal(false)} title="List New Product">
        <form onSubmit={hSubmit(d=>createMutation.mutate(d))} className="space-y-4">
          <Field label="Product Name" required>
            <input {...reg('name',{required:true})} className="input" placeholder="e.g. Handwoven Silk Scarf"/>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Price (₹)" required>
              <input {...reg('price',{required:true})} type="number" min="1" className="input" placeholder="350"/>
            </Field>
            <Field label="Stock Quantity">
              <input {...reg('stock')} type="number" min="0" className="input" placeholder="10"/>
            </Field>
          </div>
          <Field label="Category" required>
            <select {...reg('category',{required:true})} className="input">
              <option value="">Select category</option>
              {['Textiles','Food','Crafts','Wellness','Agriculture','Other'].map(c=><option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Description">
            <textarea {...reg('description')} className="input" rows={2} placeholder="Describe your product…"/>
          </Field>
          <Field label="Images (optional)">
            <input type="file" multiple accept="image/*" onChange={(e)=>{ const f = e.target.files ? Array.from(e.target.files) : []; setImagesFiles(f) }} className="input" />
            <div className="text-xs text-gray-500 mt-1">You can upload multiple images; they will be displayed on the product card.</div>
          </Field>
          <div className="bg-brand-50 border border-brand-200 rounded-xl p-3 text-xs text-brand-700">
            🤖 AI will automatically generate an optimized product description for better visibility on the marketplace
          </div>
          <button type="submit" disabled={createMutation.isPending} className="btn-primary w-full">
            {createMutation.isPending?<><Loader2 size={15} className="animate-spin"/>Listing…</>:'List Product on Marketplace'}
          </button>
        </form>
      </Modal>

      {/* Cart Modal */}
      <Modal open={cartModal} onClose={()=>setCartModal(false)} title={`Cart (${cart.length} items)`}>
        <div className="space-y-2 mb-4">
          {cart.map(item => (
            <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="text-3xl">{JSON.parse(item.images||'[]')[0]||'📦'}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{item.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <button onClick={()=>setCart(c=>c.map(i=>i.id===item.id&&i.qty>1?{...i,qty:i.qty-1}:i))} className="w-5 h-5 bg-gray-200 rounded text-xs flex items-center justify-center hover:bg-gray-300">−</button>
                  <span className="text-xs font-semibold">{item.qty}</span>
                  <button onClick={()=>setCart(c=>c.map(i=>i.id===item.id&&i.qty<i.stock?{...i,qty:i.qty+1}:i))} className="w-5 h-5 bg-gray-200 rounded text-xs flex items-center justify-center hover:bg-gray-300">+</button>
                </div>
              </div>
              <p className="font-bold text-brand-600">{inr(item.price*item.qty)}</p>
              <button onClick={()=>setCart(c=>c.filter(i=>i.id!==item.id))} className="text-gray-300 hover:text-red-500 transition-colors"><X size={15}/></button>
            </div>
          ))}
          <div className="flex justify-between items-center pt-2 border-t border-gray-100">
            <span className="font-semibold">Total</span>
            <span className="text-xl font-bold text-brand-600">{inr(cartTotal)}</span>
          </div>
        </div>
        <form onSubmit={orderHSubmit(d=>orderMutation.mutate(d))} className="space-y-3">
          <input {...orderReg('buyer_name',{required:true})} className="input" placeholder="Full name *"/>
          <input {...orderReg('buyer_phone',{required:true,pattern:/^[6-9]\d{9}$/})} className="input" placeholder="10-digit mobile *"/>
          <textarea {...orderReg('buyer_address',{required:true})} className="input" rows={2} placeholder="Delivery address *"/>
          <select {...orderReg('payment_method')} className="input">
            <option value="cod">Cash on Delivery</option>
            <option value="upi">UPI</option>
            <option value="bank">Bank Transfer</option>
          </select>
          <button type="submit" disabled={orderMutation.isPending} className="btn-primary w-full">
            {orderMutation.isPending?<><Loader2 size={15} className="animate-spin"/>Placing Order…</>:`Place Order · ${inr(cartTotal)}`}
          </button>
        </form>
      </Modal>
    </AppShell>
  )
}

/* ════════════════════════════════════════
   COORDINATOR PAGE
════════════════════════════════════════ */
export function CoordinatorPage() {
  const [tab, setTab] = useState('members')
  const [savingsModal, setSavingsModal] = useState<any>(null)
  const [selectedLoan, setSelectedLoan] = useState<any>(null)
  const [action, setAction] = useState<'approve'|'reject'|'forward'>('approve')
  const [trainingModal, setTrainingModal] = useState(false)
  const qc = useQueryClient()
  const { register, handleSubmit, reset } = useForm()
  const { register: tReg, handleSubmit: tSubmit, reset: tReset } = useForm()

  const { data: d } = useQuery({ queryKey:['dashboard','coordinator'], queryFn:()=>dashboardApi.coordinator().then(r=>r.data), staleTime:30000, refetchInterval:60000 })

  const savingsMutation = useMutation({
    mutationFn: (d:any) => savingsApi.record({...d, amount:parseFloat(d.amount), member_id:parseInt(d.member_id)}),
    onSuccess: () => { toast.success('Savings recorded!'); setSavingsModal(null); reset(); qc.invalidateQueries({queryKey:['dashboard','coordinator']}) },
    onError: (e:any) => toast.error(e.response?.data?.detail||'Failed'),
  })
  const reviewMutation = useMutation({
    mutationFn: ({id,action,remarks,interest_rate}:any) => loansApi.review(id,{action,remarks,interest_rate}),
    onSuccess: (_,vars) => { toast.success(`Loan ${vars.action}d!`); setSelectedLoan(null); qc.invalidateQueries({queryKey:['dashboard','coordinator']}) },
    onError: (e:any) => toast.error(e.response?.data?.detail||'Action failed'),
  })
  const forwardMutation = useMutation({
    mutationFn: ({id,action}:any) => loansApi.review(id,{action,remarks:'Forwarded for bank officer review'}),
    onSuccess: () => { toast.success('Loan forwarded!'); qc.invalidateQueries({queryKey:['dashboard','coordinator']}) },
    onError: (e:any) => toast.error(e.response?.data?.detail||'Failed'),
  })
  const trainingMutation = useMutation({
    mutationFn: (d:any) => trainingApi.create({...d, duration_days:parseInt(d.duration_days), max_participants:parseInt(d.max_participants)||20}),
    onSuccess: () => { toast.success('Training program created!'); setTrainingModal(false); tReset(); qc.invalidateQueries({queryKey:['training']}) },
    onError: (e:any) => toast.error(e.response?.data?.detail||'Failed'),
  })
  const schemeReviewMutation = useMutation({
    mutationFn: ({id,status}:any) => schemesApi.review(id,{status}),
    onSuccess: () => { toast.success('Application reviewed!'); qc.invalidateQueries({queryKey:['dashboard','coordinator']}) },
    onError: (e:any) => toast.error(e.response?.data?.detail||'Failed'),
  })

  const pendingLoans = (d?.loans||[]).filter((l:any)=>l.status==='pending')
  const allLoans = (d?.loans||[])

  return (
    <AppShell title="Group Management" subtitle="Manage SHG members, savings, loans and training">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <StatCard label="Total Members" value={d?.total_members||0} icon="👥" trend="up" color="green"/>
        <StatCard label="Total Savings" value={inr(d?.total_savings||0)} icon="💰" trend="up" color="blue"/>
        <StatCard label="Pending Reviews" value={d?.pending_loans||0} icon="📋" color="amber"/>
        <StatCard label="Training Programs" value={d?.trainings?.length||0} icon="🎓" color="purple"/>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-5">
        <div className="lg:col-span-2 card">
          <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
            <h3 className="section-title">Member Savings Summary</h3>
            <span className="text-sm text-gray-500">Top balances</span>
          </div>
          <DataTable
            headers={['Member','Balance','Last Tx']}
            rows={(d?.member_savings||[]).map((s:any)=>[
              <div className="font-semibold">{s.full_name}</div>,
              <span className="font-bold text-brand-600">{inr(s.balance||0)}</span>,
              s.last_tx?fdate(s.last_tx):'—',
            ])}
            emptyMsg="No savings records"
          />
        </div>
        <div className="card">
          <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
            <h3 className="section-title">Group Loan Performance</h3>
            <span className="text-sm text-gray-500">By SHG</span>
          </div>
          <DataTable
            headers={['Group','Loans','Total','Avg Score']}
            rows={(d?.group_loan_performance||[]).map((g:any)=>[
              g.shg_name||'Unassigned',
              <span className="font-semibold">{g.loan_count}</span>,
              <span className="font-bold text-brand-600">{inr(g.total_amount)}</span>,
              <span className="text-sm font-medium">{(g.avg_score||0).toFixed(1)}</span>,
            ])}
            emptyMsg="No group data"
          />
        </div>
      </div>

      <Tabs tabs={[{id:'members',label:'Members'},{id:'loans',label:`Loans (${allLoans.length})`},{id:'savings',label:'Record Savings'},{id:'training',label:'Training'}]} active={tab} onChange={setTab}/>

      {tab==='members' && (
        <div className="card">
          <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
            <h3 className="section-title">SHG Members ({d?.total_members||0})</h3>
            <button onClick={()=>setSavingsModal({})} className="btn-primary btn-sm gap-1"><Plus size={13}/>Record Savings</button>
          </div>
          <DataTable
            headers={['Member','Location','Credit Score','Occupation','Status','Action']}
            rows={(d?.members||[]).map((m:any) => [
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-xs font-bold text-brand-700">{initials(m.full_name)}</div>
                <div><p className="font-semibold text-sm">{m.full_name}</p><p className="text-xs text-gray-400">{m.phone}</p></div>
              </div>,
              <span className="text-xs">{[m.village,m.district].filter(Boolean).join(', ')||'—'}</span>,
              <div className="flex items-center gap-2">
                <div className="w-14"><ProgressBar value={m.credit_score||0} showPct={false} color={m.credit_score>=65?'green':'amber'}/></div>
                <span className={`text-xs font-bold ${creditColor(m.credit_score||0).text}`}>{Math.round(m.credit_score||0)}</span>
              </div>,
              m.occupation||'—',
              <span className={`badge ${m.is_active?'badge-green':'badge-gray'}`}>{m.is_active?'Active':'Inactive'}</span>,
              <button onClick={()=>setSavingsModal({member_id:m.id,name:m.full_name})} className="btn-secondary btn-sm">Record Savings</button>,
            ])}
            emptyMsg="No members found"
          />
        </div>
      )}

      {tab==='loans' && (
        <div className="card">
          <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
            <h3 className="section-title">Loan Applications</h3>
            <span className="badge badge-amber">{pendingLoans.length} pending review</span>
          </div>
          <DataTable
            headers={['Loan #','Applicant','Amount','Purpose','AI Score','Status','Action']}
            rows={allLoans.map((l:any) => [
              <span className="font-mono text-xs text-gray-500">{l.loan_number}</span>,
              <div><p className="font-semibold text-sm">{l.applicant_name}</p><p className="text-xs text-gray-400">{l.village||l.district||'—'}</p></div>,
              <span className="font-bold text-brand-600">{inr(l.amount)}</span>,
              <span className="text-xs text-gray-600 max-w-[100px] truncate block">{l.purpose}</span>,
              <span className={`font-bold text-sm ${creditColor(l.ai_credit_score||0).text}`}>{l.ai_credit_score?.toFixed(0)||'—'}</span>,
              <span className={`badge ${loanStatusBadge(l.status)}`}>{l.status.replace(/_/g,' ')}</span>,
              (['pending','coordinator_review','officer_review'].includes(l.status)) ? (
                <div className="flex gap-1.5">
                  <button onClick={()=>{setSelectedLoan(l);setAction('approve')}} className="btn-primary btn-sm">✓ Approve</button>
                  <button onClick={()=>{setSelectedLoan(l);setAction('reject')}} className="btn-danger btn-sm">✗ Reject</button>
                  <button onClick={()=>forwardMutation.mutate({id:l.id,action:'forward'})} disabled={forwardMutation.isPending} className="btn-secondary btn-sm">Forward</button>
                </div>
              ) : <span className="text-xs text-gray-400">—</span>,
            ])}
            emptyMsg="No loan applications"
          />
        </div>
      )}

      {tab==='marketplace' && (
        <div className="card">
          <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
            <h3 className="section-title">Marketplace Products</h3>
            <span className="text-sm text-gray-500">Manage product visibility and moderate listings</span>
          </div>
          <AdminMarketplace />
        </div>
      )}

      {tab==='ai' && (
        <div className="card p-5">
          <h3 className="section-title mb-3">AI Keys Configuration</h3>
          <AIKeyManager />
        </div>
      )}

      {tab==='savings' && (
        <div className="grid lg:grid-cols-2 gap-5">
          <div className="card p-5">
            <h3 className="section-title mb-4">Record Savings Transaction</h3>
            <form onSubmit={handleSubmit(d=>savingsMutation.mutate(d))} className="space-y-4">
              <Field label="Select Member" required>
                <select {...register('member_id',{required:true})} className="input">
                  <option value="">— Select member —</option>
                  {(d?.members||[]).map((m:any)=><option key={m.id} value={m.id}>{m.full_name} ({m.phone})</option>)}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Amount (₹)" required>
                  <input {...register('amount',{required:true,min:1})} type="number" className="input" placeholder="1200"/>
                </Field>
                <Field label="Transaction Type">
                  <select {...register('transaction_type')} className="input">
                    <option value="deposit">Deposit</option>
                    <option value="withdrawal">Withdrawal</option>
                  </select>
                </Field>
              </div>
              <Field label="Notes (optional)">
                <input {...register('notes')} className="input" placeholder="Optional notes…"/>
              </Field>
              <button type="submit" disabled={savingsMutation.isPending} className="btn-primary w-full">
                {savingsMutation.isPending?<><Loader2 size={15} className="animate-spin"/>Recording…</>:'Record Savings'}
              </button>
            </form>
          </div>
          <div className="card">
            <div className="px-5 py-4 border-b border-gray-100"><h3 className="section-title">Recent Transactions</h3></div>
            <DataTable
              headers={['Member','Type','Amount','Date']}
              rows={(d?.recent_savings||[]).map((s:any)=>[
                s.member_name,
                <span className={`badge ${s.transaction_type==='deposit'?'badge-green':'badge-amber'}`}>{s.transaction_type}</span>,
                <span className="font-semibold">{inr(s.amount)}</span>,
                fdate(s.transaction_date),
              ])}
              emptyMsg="No transactions yet"
            />
          </div>
        </div>
      )}

      {tab==='training' && (
        <div className="space-y-4">
          <div className="flex justify-end"><button onClick={()=>setTrainingModal(true)} className="btn-primary btn-sm gap-1"><Plus size={13}/>Create Program</button></div>
          <div className="card">
            <DataTable
              headers={['Program','Provider','Duration','Mode','Enrolled','Start Date','Status']}
              rows={(d?.trainings||[]).map((t:any)=>[
                <span className="font-semibold">{t.title}</span>,
                t.provider||'—',
                `${t.duration_days} days`,
                <span className={`badge ${t.mode==='online'?'badge-blue':'badge-green'}`}>{t.mode}</span>,
                `${t.enrolled_count}/${t.max_participants}`,
                t.start_date?fdate(t.start_date):'Flexible',
                t.is_active?<span className="badge badge-green">Active</span>:<span className="badge badge-gray">Inactive</span>,
              ])}
              emptyMsg="No training programs"
            />
          </div>
        </div>
      )}

      {/* Savings Modal */}
      <Modal open={!!savingsModal} onClose={()=>setSavingsModal(null)} title="Record Savings">
        <form onSubmit={handleSubmit(d=>savingsMutation.mutate(d))} className="space-y-4">
          <Field label="Member" required>
            <select {...register('member_id',{required:true})} className="input" defaultValue={savingsModal?.member_id||''}>
              <option value="">— Select member —</option>
              {(d?.members||[]).map((m:any)=><option key={m.id} value={m.id}>{m.full_name} ({m.phone})</option>)}
            </select>
            {savingsModal?.name&&<p className="text-xs text-brand-600 mt-1">Pre-selected: {savingsModal.name}</p>}
          </Field>
          <Field label="Amount (₹)" required>
            <input {...register('amount',{required:true,min:1})} type="number" className="input" placeholder="1200"/>
          </Field>
          <Field label="Type">
            <select {...register('transaction_type')} className="input"><option value="deposit">Deposit</option><option value="withdrawal">Withdrawal</option></select>
          </Field>
          <Field label="Notes"><input {...register('notes')} className="input" placeholder="Optional…"/></Field>
          <button type="submit" disabled={savingsMutation.isPending} className="btn-primary w-full">
            {savingsMutation.isPending?<><Loader2 size={15} className="animate-spin"/>Recording…</>:'Record Savings'}
          </button>
        </form>
      </Modal>

      {/* Training Modal */}
      <Modal open={trainingModal} onClose={()=>setTrainingModal(false)} title="Create Training Program">
        <form onSubmit={tSubmit(d=>trainingMutation.mutate(d))} className="space-y-4">
          <Field label="Program Title" required><input {...tReg('title',{required:true})} className="input" placeholder="e.g. Advanced Tailoring"/></Field>
          <Field label="Description"><textarea {...tReg('description')} className="input" rows={2} placeholder="Program details…"/></Field>
          <Field label="Provider"><input {...tReg('provider')} className="input" placeholder="e.g. NRLM Telangana"/></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Duration (days)" required><input {...tReg('duration_days',{required:true})} type="number" min="1" className="input" placeholder="5"/></Field>
            <Field label="Max Participants"><input {...tReg('max_participants')} type="number" min="1" className="input" placeholder="20"/></Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Mode"><select {...tReg('mode')} className="input"><option value="offline">Offline</option><option value="online">Online</option><option value="hybrid">Hybrid</option></select></Field>
            <Field label="Start Date"><input {...tReg('start_date')} type="date" className="input"/></Field>
          </div>
          <Field label="Location (for offline)"><input {...tReg('location')} className="input" placeholder="Venue address"/></Field>
          <button type="submit" disabled={trainingMutation.isPending} className="btn-primary w-full">
            {trainingMutation.isPending?<><Loader2 size={15} className="animate-spin"/>Creating…</>:'Create & Notify Members'}
          </button>
        </form>
      </Modal>
      {/* Loan Review Modal (Coordinator) */}
      <Modal open={!!selectedLoan} onClose={()=>{setSelectedLoan(null);}} title={action==='approve'?'✅ Approve Loan':'❌ Reject Loan'}>
        {selectedLoan && (
          <form onSubmit={handleSubmit(d=>reviewMutation.mutate({id:selectedLoan.id,action,...d}))} className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex justify-between items-start">
                <div><p className="font-semibold">{selectedLoan.applicant_name}</p><p className="text-xs text-gray-500 mt-0.5">{selectedLoan.applicant_phone}</p></div>
                <span className="font-bold text-brand-600 text-lg">{inr(selectedLoan.amount)}</span>
              </div>
              <p className="text-xs text-gray-600 mt-2">{selectedLoan.purpose}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-gray-500">AI Score:</span>
                <span className={`font-bold text-sm ${creditColor(selectedLoan.ai_credit_score||0).text}`}>{selectedLoan.ai_credit_score?.toFixed(0)||'—'}/100</span>
                <span className="text-xs text-gray-400">— {selectedLoan.ai_recommendation}</span>
              </div>
            </div>
            {action==='approve' && (
              <Field label="Interest Rate Override (optional)">
                <input {...register('interest_rate')} type="number" step="0.1" className="input" placeholder={`${selectedLoan.interest_rate} (default)`}/>
              </Field>
            )}
            <Field label={action==='approve'?'Approval Remarks (optional)':'Rejection Reason *'}>
              <textarea {...register('remarks',{required:action==='reject'})} className="input" rows={3} placeholder={action==='approve'?'Optional notes for the member…':'Reason for rejection (member will be notified)…'}/>
            </Field>
            <div className="flex gap-3">
              <button type="button" onClick={()=>{setSelectedLoan(null);}} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={reviewMutation.isPending} className={`flex-1 ${action==='approve'?'btn-primary':'btn-danger'}`}>
                {reviewMutation.isPending?<Loader2 size={15} className="animate-spin"/>:action==='approve'?'✓ Approve Loan':'✗ Reject Loan'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </AppShell>
  )
}

/* ════════════════════════════════════════
   BANK OFFICER PAGE
════════════════════════════════════════ */
export function BankPage() {
  const [selectedLoan, setSelectedLoan] = useState<any>(null)
  const [action, setAction] = useState<'approve'|'reject'>('approve')
  const qc = useQueryClient()
  const { register, handleSubmit, reset } = useForm()

  const { data: d, isLoading } = useQuery({ queryKey:['dashboard','bank'], queryFn:()=>dashboardApi.bank().then(r=>r.data), staleTime:30000, refetchInterval:30000 })

  const reviewMutation = useMutation({
    mutationFn: ({id,action,remarks,interest_rate}:any) => loansApi.review(id,{action,remarks,interest_rate}),
    onSuccess: (_,vars) => {
      toast.success(`Loan ${vars.action}d!`)
      setSelectedLoan(null); reset()
      qc.invalidateQueries({queryKey:['dashboard','bank']})
    },
    onError: (e:any) => toast.error(e.response?.data?.detail||'Action failed'),
  })

  const pendingLoans = (d?.loans||[]).filter((l:any)=>['pending','coordinator_review','officer_review'].includes(l.status))

  return (
    <AppShell title="Loan Approvals" subtitle="Review and approve loan applications with AI credit analysis">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <StatCard label="Pending Approvals" value={d?.pending_approvals||0} icon="⏳" color="amber"/>
        <StatCard label="Approved" value={d?.approved_count||0} icon="✅" trend="up" color="green"/>
        <StatCard label="High Risk" value={d?.high_risk||0} icon="⚠️" color="red"/>
        <StatCard label="Repayment Rate" value={`${d?.repayment_rate||0}%`} icon="📊" trend="up" color="blue"/>
      </div>

      <div className="card">
        <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="section-title">All Loan Applications</h3>
          <span className="badge badge-amber">{pendingLoans.length} awaiting review</span>
        </div>
        <DataTable loading={isLoading}
          headers={['Loan #','Applicant','Amount','Purpose','AI Score','Risk','Status','Actions']}
          rows={(d?.loans||[]).map((l:any) => {
            const score = l.ai_credit_score||0
            const { grade, text, badge } = creditColor(score)
            const risk = score>=65?'Low':score>=50?'Medium':'High'
            const riskBadge = score>=65?'badge-green':score>=50?'badge-amber':'badge-red'
            const pending = ['pending','coordinator_review','officer_review'].includes(l.status)
            return [
              <span className="font-mono text-xs text-gray-500">{l.loan_number}</span>,
              <div><p className="font-semibold">{l.applicant_name}</p><p className="text-xs text-gray-400">{l.applicant_phone}</p></div>,
              <span className="font-bold text-brand-600">{inr(l.amount)}</span>,
              <span className="text-xs text-gray-600 max-w-[100px] truncate block">{l.purpose}</span>,
              <div className="flex items-center gap-2">
                <div className="w-14"><ProgressBar value={score} showPct={false} color={score>=65?'green':'amber'}/></div>
                <span className={`text-xs font-bold ${text}`}>{score.toFixed(0)}</span>
              </div>,
              <span className={`badge ${riskBadge}`}>{risk}</span>,
              <span className={`badge ${loanStatusBadge(l.status)}`}>{l.status.replace(/_/g,' ')}</span>,
              pending ? (
                <div className="flex gap-1.5">
                  <button onClick={()=>{setSelectedLoan(l);setAction('approve')}} className="btn-primary btn-sm">✓ Approve</button>
                  <button onClick={()=>{setSelectedLoan(l);setAction('reject')}} className="btn-danger btn-sm">✗ Reject</button>
                </div>
              ) : <span className="text-xs text-gray-400">Done</span>,
            ]
          })}
          emptyMsg="No loan applications"
        />
      </div>

      <Modal open={!!selectedLoan} onClose={()=>{setSelectedLoan(null);reset()}} title={action==='approve'?'✅ Approve Loan':'❌ Reject Loan'}>
        {selectedLoan && (
          <form onSubmit={handleSubmit(d=>reviewMutation.mutate({id:selectedLoan.id,action,...d}))} className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex justify-between items-start">
                <div><p className="font-semibold">{selectedLoan.applicant_name}</p><p className="text-xs text-gray-500 mt-0.5">{selectedLoan.applicant_phone}</p></div>
                <span className="font-bold text-brand-600 text-lg">{inr(selectedLoan.amount)}</span>
              </div>
              <p className="text-xs text-gray-600 mt-2">{selectedLoan.purpose}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-gray-500">AI Score:</span>
                <span className={`font-bold text-sm ${creditColor(selectedLoan.ai_credit_score||0).text}`}>{selectedLoan.ai_credit_score?.toFixed(0)||'—'}/100</span>
                <span className="text-xs text-gray-400">— {selectedLoan.ai_recommendation}</span>
              </div>
            </div>
            {action==='approve' && (
              <Field label="Interest Rate Override (optional)">
                <input {...register('interest_rate')} type="number" step="0.1" className="input" placeholder={`${selectedLoan.interest_rate} (default)`}/>
              </Field>
            )}
            <Field label={action==='approve'?'Approval Remarks (optional)':'Rejection Reason *'}>
              <textarea {...register('remarks',{required:action==='reject'})} className="input" rows={3} placeholder={action==='approve'?'Optional notes for the member…':'Reason for rejection (member will be notified)…'}/>
            </Field>
            <div className="flex gap-3">
              <button type="button" onClick={()=>{setSelectedLoan(null);reset()}} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={reviewMutation.isPending} className={`flex-1 ${action==='approve'?'btn-primary':'btn-danger'}`}>
                {reviewMutation.isPending?<Loader2 size={15} className="animate-spin"/>:action==='approve'?'✓ Approve Loan':'✗ Reject Loan'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </AppShell>
  )
}

/* ════════════════════════════════════════
   ADMIN PAGE
════════════════════════════════════════ */
export function AdminPage() {
  const [tab, setTab] = useState('overview')
  const qc = useQueryClient()
  const { data: d, isLoading } = useQuery({ queryKey:['dashboard','admin'], queryFn:()=>dashboardApi.admin().then(r=>r.data), staleTime:30000, refetchInterval:60000 })

  const roleMutation = useMutation({
    mutationFn: ({id,role}:any) => usersApi.assignRole(id,role),
    onSuccess: () => { toast.success('Role updated!'); qc.invalidateQueries({queryKey:['dashboard','admin']}) },
    onError: (e:any) => toast.error(e.response?.data?.detail||'Failed'),
  })
  const toggleMutation = useMutation({
    mutationFn: (id:number) => usersApi.toggle(id),
    onSuccess: () => { toast.success('User status updated!'); qc.invalidateQueries({queryKey:['dashboard','admin']}) },
    onError: (e:any) => toast.error(e.response?.data?.detail||'Failed'),
  })

  const ML_MODELS = [
    { name:'Credit Risk (Rule-based XGBoost)', accuracy:91, status:'active' },
    { name:'Livelihood Recommender (Hybrid)', accuracy:87, status:'active' },
    { name:'Scheme Matching (NLP)', accuracy:94, status:'active' },
    { name:'Health Classifier (DistilBERT)', accuracy:89, status:'active' },
    { name:'AI Chat (Groq LLaMA 3)', accuracy:96, status:'active' },
  ]

  return (
    <AppShell title="Admin Dashboard" subtitle="Platform-wide management, monitoring and control">
      <Tabs tabs={[{id:'overview',label:'Overview'},{id:'users',label:`Users (${d?.total_users||0})`},{id:'loans',label:'All Loans'},{id:'marketplace',label:'Marketplace'},{id:'ai',label:'AI Keys'},{id:'security',label:'Audit Logs'}]} active={tab} onChange={setTab}/>

      {tab==='overview' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
            <StatCard label="Total Users" value={(d?.total_users||0).toLocaleString()} icon="👥" trend="up" color="green"/>
            <StatCard label="Active SHGs" value={(d?.total_shgs||0).toLocaleString()} icon="🏘️" trend="up" color="blue"/>
            <StatCard label="Loans Disbursed" value={inr(d?.total_loans_disbursed||0)} icon="💰" trend="up" color="amber"/>
            <StatCard label="Marketplace GMV" value={inr(d?.marketplace_gmv||0)} icon="🛒" trend="up" color="purple"/>
          </div>

          <div className="grid lg:grid-cols-2 gap-5">
            <div className="card p-5">
              <h3 className="section-title mb-4">AI / ML Model Status</h3>
              <div className="space-y-3">
                {ML_MODELS.map(m => (
                  <div key={m.name} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{m.name}</p>
                      <ProgressBar value={m.accuracy} showPct={false} color="green"/>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-brand-600">{m.accuracy}%</p>
                      <span className="badge badge-green text-[10px]">{m.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-5">
              <h3 className="section-title mb-4">Users by Role</h3>
              {(d?.users_by_role||[]).length > 0 && (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={d.users_by_role}>
                    <XAxis dataKey="role" tick={{fontSize:11,fill:'#9ca3af'}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fontSize:11,fill:'#9ca3af'}} axisLine={false} tickLine={false}/>
                    <Tooltip contentStyle={{fontSize:11,borderRadius:8}}/>
                    <Bar dataKey="count" fill="#1a7a4a" radius={[4,4,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </>
      )}

      {tab==='users' && (
        <div className="card">
          <DataTable loading={isLoading}
            headers={['User','Phone','Role','Location','Status','Change Role','Toggle']}
            rows={(d?.users||[]).map((u:any) => [
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-xs font-bold text-brand-700">{initials(u.full_name)}</div>
                <span className="font-semibold text-sm">{u.full_name}</span>
              </div>,
              u.phone,
              <span className={`badge ${u.role==='admin'?'badge-red':u.role==='bank_officer'?'badge-purple':u.role==='coordinator'?'badge-blue':'badge-green'}`}>{u.role.replace('_',' ')}</span>,
              u.village||u.district||'—',
              <span className={`badge ${u.is_active?'badge-green':'badge-gray'}`}>{u.is_active?'Active':'Inactive'}</span>,
              <select defaultValue={u.role} onChange={e=>roleMutation.mutate({id:u.id,role:e.target.value})} className="input text-xs py-1 px-2 w-28">
                <option value="member">Member</option>
                <option value="coordinator">Coordinator</option>
                <option value="bank_officer">Bank Officer</option>
                <option value="admin">Admin</option>
              </select>,
              <button onClick={()=>toggleMutation.mutate(u.id)} className={`btn-sm ${u.is_active?'btn-danger':'btn-success'}`}>
                {u.is_active?'Deactivate':'Activate'}
              </button>,
            ])}
            emptyMsg="No users found"
          />
        </div>
      )}

      {tab==='loans' && (
        <div className="card">
          <DataTable loading={isLoading}
            headers={['Loan #','Applicant','Amount','AI Score','Status','Date']}
            rows={(d?.loans||[]).map((l:any) => [
              <span className="font-mono text-xs">{l.loan_number}</span>,
              l.applicant_name,
              <span className="font-bold text-brand-600">{inr(l.amount)}</span>,
              <span className={`font-bold ${creditColor(l.ai_credit_score||0).text}`}>{l.ai_credit_score?.toFixed(0)||'—'}</span>,
              <span className={`badge ${loanStatusBadge(l.status)}`}>{l.status.replace(/_/g,' ')}</span>,
              fdate(l.created_at),
            ])}
          />
        </div>
      )}

      {tab==='security' && (
        <div className="card">
          <DataTable loading={isLoading}
            headers={['Time','User','Action','Resource','Details']}
            rows={(d?.audit_logs||[]).map((l:any) => [
              <span className="text-xs text-gray-400 whitespace-nowrap">{ago(l.created_at)}</span>,
              l.full_name||'System',
              <span className="badge badge-blue text-[10px]">{l.action}</span>,
              l.resource||'—',
              <span className="text-xs text-gray-500 truncate max-w-[150px] block">{l.details||'—'}</span>,
            ])}
          />
        </div>
      )}
    </AppShell>
  )
}

/* ════════════════════════════════════════
   PROFILE PAGE
════════════════════════════════════════ */
export function ProfilePage() {
  const { user, refreshUser } = useAuthStore()
  const { register, handleSubmit, formState:{isSubmitting} } = useForm({ defaultValues: {
    full_name: user?.full_name,
    email: user?.email||'',
    village: user?.profile?.village||'',
    district: user?.profile?.district||'',
    state: user?.profile?.state||'Telangana',
    occupation: user?.profile?.occupation||'',
    bank_account: user?.profile?.bank_account||'',
    bank_name: user?.profile?.bank_name||'',
    bank_ifsc: user?.profile?.bank_ifsc||'',
    bio: user?.profile?.bio||'',
  }})

  const onSubmit = async (d: any) => {
    try {
      await usersApi.update(d)
      await refreshUser()
      toast.success('Profile updated!')
    } catch(e:any) { toast.error(e.response?.data?.detail||'Update failed') }
  }

  return (
    <AppShell title="My Profile" subtitle="Manage your account and personal details">
      <div className="max-w-2xl">
        {/* Avatar section */}
        <div className="card p-5 mb-5 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-brand-500 flex items-center justify-center text-2xl font-bold text-white">{user?initials(user.full_name):'?'}</div>
          <div>
            <h2 className="font-display text-lg font-bold">{user?.full_name}</h2>
            <p className="text-sm text-gray-500">{user?.phone} · {user?.role?.replace('_',' ')}</p>
            <div className="flex gap-2 mt-1">
              <span className={`badge ${user?.is_verified?'badge-green':'badge-amber'}`}>{user?.is_verified?'✓ Verified':'Pending Verification'}</span>
              <span className="badge badge-blue capitalize">{user?.role?.replace('_',' ')}</span>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <h3 className="section-title mb-4">Edit Profile</h3>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Full Name">
                <input {...register('full_name')} className="input"/>
              </Field>
              <Field label="Email">
                <input {...register('email')} type="email" className="input" placeholder="optional"/>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Village">
                <input {...register('village')} className="input"/>
              </Field>
              <Field label="District">
                <input {...register('district')} className="input"/>
              </Field>
            </div>
            <Field label="Occupation">
              <input {...register('occupation')} className="input"/>
            </Field>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Bank Name">
                <input {...register('bank_name')} className="input" placeholder="SBI"/>
              </Field>
              <Field label="Account Number">
                <input {...register('bank_account')} className="input"/>
              </Field>
              <Field label="IFSC Code">
                <input {...register('bank_ifsc')} className="input" placeholder="SBIN0001234"/>
              </Field>
            </div>
            <Field label="Bio">
              <textarea {...register('bio')} className="input" rows={2} placeholder="About yourself…"/>
            </Field>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting?<><Loader2 size={15} className="animate-spin"/>Saving…</>:'Save Changes'}
            </button>
          </form>
        </div>
      </div>
    </AppShell>
  )
}

/* Admin helpers */
function AdminMarketplace() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['admin-products'], queryFn: () => marketplaceApi.products({ limit: 200 }).then(r => r.data), staleTime: 30000 })
  const [view, setView] = useState<any>(null)
  const updateMutation = useMutation({ mutationFn: ({id,d}:any)=>marketplaceApi.updateProduct(id,d), onSuccess:()=>qc.invalidateQueries({queryKey:['admin-products']}) })
  const deleteMutation = useMutation({ mutationFn: (id:number)=>marketplaceApi.deleteProduct(id), onSuccess:()=>qc.invalidateQueries({queryKey:['admin-products']}) })

  if (isLoading) return <Spinner />
  const items = Array.isArray(data) ? data : (data?.items || [])
  return (
    <div>
      <DataTable
        headers={['Product','Seller','Price','Stock','Status','Action']}
        rows={items.map((p:any)=>[
          <div className="flex items-center gap-2"><div className="text-xl">{(() => { try { return p.images? (Array.isArray(p.images)?p.images[0]:JSON.parse(p.images||'[]')[0]) : p.image || p.image_emoji } catch { return p.image||p.image_emoji } })()}</div><div className="font-semibold text-sm">{p.name}</div></div>,
          p.seller_name||'—',
          <span className="font-bold text-brand-600">{inr(p.price)}</span>,
          p.stock,
          <span className={`badge ${p.is_active?'badge-green':'badge-gray'}`}>{p.is_active?'Active':'Inactive'}</span>,
          <div className="flex gap-2">
            <button onClick={()=>setView(p)} className="btn-secondary btn-sm">View</button>
            <button onClick={()=>updateMutation.mutate({id:p.id,d:{is_active:p.is_active?0:1}})} className="btn-sm">{p.is_active?'Deactivate':'Activate'}</button>
            <button onClick={()=>deleteMutation.mutate(p.id)} className="btn-danger btn-sm">Delete</button>
          </div>
        ])}
        emptyMsg="No products"
      />

      <Modal open={!!view} onClose={()=>setView(null)} title={view?.name||'Product'}>
        {view && (
          <div>
            <div className="h-48 mb-3 overflow-hidden rounded-lg">{(() => { try { const imgs = view.images ? (Array.isArray(view.images)?view.images:view.images?JSON.parse(view.images||'[]'):[]) : []; const m = imgs[0] || view.image || view.image_emoji; return m ? <img src={m} className="w-full h-full object-cover" alt={view.name}/> : <div className="text-gray-400">No image</div> } catch { return <div className="text-gray-400">No image</div> } })()}</div>
            <p className="font-semibold mb-2">{view.name}</p>
            <p className="text-sm text-gray-600 mb-2">{view.description}</p>
            <div className="flex gap-2"><button onClick={()=>updateMutation.mutate({id:view.id,d:{is_active:view.is_active?0:1}})} className="btn-primary btn-sm">{view.is_active?'Deactivate':'Activate'}</button><button onClick={()=>{deleteMutation.mutate(view.id); setView(null)}} className="btn-danger btn-sm">Delete</button></div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function AIKeyManager() {
  const { data, isLoading } = useQuery({ queryKey:['admin','ai-keys'], queryFn: ()=>adminApi.aiKeys().then(r=>r.data), staleTime: 60000 })
  const qc = useQueryClient()
  const [groq, setGroq] = useState('')
  const [gemini, setGemini] = useState('')
  const setMutation = useMutation({ mutationFn: (d:any)=>adminApi.setAiKeys(d), onSuccess:()=>{ toast.success('Saved'); qc.invalidateQueries({queryKey:['admin','ai-keys']}) } })

  React.useEffect(()=>{ if (data) { setGroq(''); setGemini('') } },[data])

  return (
    <div>
      <p className="text-sm text-gray-600 mb-3">Current status: <strong>{isLoading? 'Loading...' : (data?.groq? 'Groq: configured' : 'Groq: missing')}</strong>, <strong>{data?.gemini? 'Gemini: configured' : 'Gemini: missing'}</strong></p>
      <div className="grid grid-cols-1 gap-3">
        <div>
          <label className="text-xs">Groq API key (paste to set)</label>
          <input value={groq} onChange={e=>setGroq(e.target.value)} className="input" placeholder="sk-..." />
        </div>
        <div>
          <label className="text-xs">Gemini API key (paste to set)</label>
          <input value={gemini} onChange={e=>setGemini(e.target.value)} className="input" placeholder="AIza... or key" />
        </div>
        <div className="flex gap-2">
          <button onClick={()=>setMutation.mutate({groq_key:groq||null,gemini_key:gemini||null})} className="btn-primary">Save Keys</button>
          <button onClick={()=>{ setGroq(''); setGemini('') }} className="btn-secondary">Clear</button>
        </div>
        <div className="text-xs text-gray-500">Note: Keys are stored in the server under <strong>ai_keys.json</strong> and loaded into the running process. For production, set environment variables instead.</div>
      </div>
    </div>
  )
}
