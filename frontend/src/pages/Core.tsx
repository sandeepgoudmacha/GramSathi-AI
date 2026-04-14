import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { motion } from 'framer-motion'
import { Plus, Search, Loader2, CheckCircle, TrendingUp, ExternalLink } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { StatCard, CreditGauge, ProgressBar, DataTable, EmptyState, Spinner, Modal, Tabs, Timeline, Field, InfoBanner } from '@/components/ui/index'
import { api, dashboardApi, loansApi, savingsApi, schemesApi, skillsApi, trainingApi, aiApi, creditApi } from '@/services/api'
import { inr, fdate, ago, loanStatusBadge, schemeStatusBadge, creditColor } from '@/utils/helpers'
import { useAuthStore } from '@/store/index'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

/* ════════════════════════════════════════
   DASHBOARD
════════════════════════════════════════ */
export function DashboardPage() {
  const { user } = useAuthStore()
  const nav = useNavigate()
  const { data: d, isLoading } = useQuery({ queryKey:['dashboard','member'], queryFn:()=>dashboardApi.member().then(r=>r.data), staleTime:30000, refetchInterval:60000 })
  const { data: cs } = useQuery({ queryKey:['credit-score'], queryFn:()=>creditApi.score().then(r=>r.data), staleTime:300000 })

  if (isLoading) return <AppShell title="Dashboard"><Spinner text="Loading dashboard…"/></AppShell>

  const savingsChart = (d?.savings||[]).slice(0,10).reverse().map((s: any) => ({
    label: s.transaction_date?.slice(5,10)||'', amount: s.balance_after||0
  }))

  const activeLoan = d?.loans?.[0]
  const loanSteps = activeLoan ? [
    { title:'Application Submitted', date:fdate(activeLoan.created_at), done:true },
    { title:'Coordinator Review', date:'Reviewed', done:['coordinator_review','officer_review','approved','disbursed'].includes(activeLoan.status) },
    { title:'Bank Officer Review', date:'Pending', done:['officer_review','approved','disbursed'].includes(activeLoan.status), current:activeLoan.status==='officer_review' },
    { title:'Loan Decision', date:activeLoan.status==='approved'?'✅ Approved!':'Awaiting', done:['approved','disbursed'].includes(activeLoan.status) },
  ] : []

  return (
    <AppShell title="Dashboard" subtitle={`Welcome back, ${user?.full_name.split(' ')[0]}! 👋`}>
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <StatCard label="Total Savings" value={inr(d?.total_savings||0)} icon="💰" change="View history" trend="up" color="green" onClick={()=>nav('/app/financial')}/>
        <StatCard label="Credit Score" value={`${Math.round(cs?.score||d?.credit_score||50)}/100`} icon="📊" change={cs?.grade} trend="up" color="blue" onClick={()=>nav('/app/financial')}/>
        <StatCard label="Eligible Schemes" value="8+" icon="📋" change="Click to apply" trend="up" color="purple" onClick={()=>nav('/app/schemes')}/>
        <StatCard label="Marketplace Sales" value={inr(d?.marketplace_sales||0)} icon="🛒" change="View orders" trend="up" color="amber" onClick={()=>nav('/app/marketplace')}/>
      </div>

      <div className="grid lg:grid-cols-3 gap-5 mb-5">
        {/* Savings chart */}
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <div><h3 className="section-title">Savings Growth</h3><p className="text-xs text-gray-400 mt-0.5">Running balance</p></div>
            <span className="badge badge-green flex items-center gap-1"><TrendingUp size={10}/>Growing</span>
          </div>
          {savingsChart.length > 1 ? (
            <ResponsiveContainer width="100%" height={190}>
              <AreaChart data={savingsChart}>
                <defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#1a7a4a" stopOpacity={0.15}/><stop offset="95%" stopColor="#1a7a4a" stopOpacity={0}/></linearGradient></defs>
                <XAxis dataKey="label" tick={{fontSize:10,fill:'#9ca3af'}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fontSize:10,fill:'#9ca3af'}} axisLine={false} tickLine={false} tickFormatter={v=>`₹${Math.round(v/1000)}K`}/>
                <Tooltip formatter={(v:number)=>inr(v)} contentStyle={{fontSize:11,borderRadius:8,border:'1px solid #f3f4f6'}}/>
                <Area type="monotone" dataKey="amount" stroke="#1a7a4a" strokeWidth={2.5} fill="url(#sg)" dot={{fill:'#1a7a4a',r:2.5}}/>
              </AreaChart>
            </ResponsiveContainer>
          ) : <EmptyState icon="📈" title="No savings data yet" message="Start depositing to see your growth chart"/>}
        </div>

        {/* Credit Score */}
        <div className="card p-5">
          <h3 className="section-title mb-1">Credit Score</h3>
          <p className="text-xs text-gray-400 mb-3">AI-powered assessment</p>
          <CreditGauge score={cs?.score||d?.credit_score||50}/>
          {cs?.breakdown && (
            <div className="mt-4 space-y-2">
              {Object.entries(cs.breakdown).map(([k,v]:any) => (
                <ProgressBar key={k} label={k} value={v} color={v>=70?'green':'amber'}/>
              ))}
            </div>
          )}
          <button onClick={()=>nav('/app/financial')} className="btn-primary w-full mt-4 btn-sm">View Full Report →</button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Active Loan */}
        {activeLoan && (
          <div className="card p-5">
            <div className="flex justify-between items-center mb-3">
              <h3 className="section-title">Active Loan</h3>
              <span className={`badge ${loanStatusBadge(activeLoan.status)}`}>{activeLoan.status.replace(/_/g,' ')}</span>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-600 mb-4">
              <span className="font-semibold font-mono">{activeLoan.loan_number}</span> · {inr(activeLoan.amount)} · {activeLoan.purpose?.slice(0,45)}…
            </div>
            <Timeline steps={loanSteps}/>
          </div>
        )}

        {/* Notifications */}
        <div className="card p-5">
          <h3 className="section-title mb-4">Recent Notifications</h3>
          {(d?.notifications||[]).length === 0
            ? <EmptyState icon="🔔" title="All caught up!" message="New notifications will appear here"/>
            : (d?.notifications||[]).slice(0,5).map((n: any, i: number) => (
              <div key={i} className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${n.is_read?'bg-gray-200':'bg-brand-500'}`}/>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 leading-tight">{n.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                  <p className="text-[10px] text-gray-400 mt-1">{ago(n.created_at)}</p>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* My products if any */}
      {(d?.my_products||[]).length > 0 && (
        <div className="card p-5 mt-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="section-title">My Products ({d.my_products.length})</h3>
            <button onClick={()=>nav('/app/marketplace')} className="text-xs text-brand-600 hover:underline">Manage →</button>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
            {d.my_products.slice(0,5).map((p: any) => {
                const firstImg = (() => { try { return JSON.parse(p.images||'[]')[0] } catch { return null } })()
                return (
                <div key={p.id} className="text-center">
                  <div className="text-3xl mb-1">
                    {firstImg && typeof firstImg === 'string' && firstImg.startsWith('/uploads')
                      ? <img src={firstImg} className="mx-auto w-20 h-20 object-cover rounded" alt={p.name} />
                      : (firstImg || '📦')
                    }
                  </div>
                  <p className="text-xs font-medium truncate">{p.name}</p>
                  <p className="text-xs text-brand-600 font-bold">{inr(p.price)}</p>
                  <p className="text-[10px] text-gray-400">Stock: {p.stock}</p>
                </div>
              )})}
          </div>
        </div>
      )}
    </AppShell>
  )
}

/* ════════════════════════════════════════
   FINANCIAL
════════════════════════════════════════ */
export function FinancialPage() {
  const [tab, setTab] = useState('savings')
  const [loanModal, setLoanModal] = useState(false)
  const [loanDetail, setLoanDetail] = useState<any>(null)
  const [savingsOpen, setSavingsOpen] = useState(false)
  const [svAmount, setSvAmount] = useState('')
  const [svDate, setSvDate] = useState('')
  const [svType, setSvType] = useState('deposit')
  const [svNotes, setSvNotes] = useState('')
  const qc = useQueryClient()
  const { register, handleSubmit, reset, formState:{errors} } = useForm()

  const { data: savings } = useQuery({ queryKey:['savings'], queryFn:()=>savingsApi.get().then(r=>r.data), staleTime:30000 })
  const { data: loans, isLoading:loansLoading } = useQuery({ queryKey:['my-loans'], queryFn:()=>loansApi.my().then(r=>r.data) })
  const { data: cs } = useQuery({ queryKey:['credit-score'], queryFn:()=>creditApi.score().then(r=>r.data) })

  const applyMutation = useMutation({
    mutationFn: (d:any) => {
      const formData = new FormData();
      formData.append('amount', d.amount);
      formData.append('purpose', d.purpose);
      formData.append('duration_months', d.duration_months || 12);
      formData.append('collateral', d.collateral || 'None');
      if (d.bank_passbook?.[0]) formData.append('bank_passbook', d.bank_passbook[0]);
      if (d.aadhaar?.[0]) formData.append('aadhaar', d.aadhaar[0]);
      return api.post('/loans/apply', formData, { headers: { 'Content-Type': 'multipart/form-data', 'Authorization': `Bearer ${localStorage.getItem('access_token')}` } });
    },
    onSuccess: () => { toast.success('Loan application submitted!'); setLoanModal(false); reset(); qc.invalidateQueries({queryKey:['my-loans']}); qc.invalidateQueries({queryKey:['dashboard']}) },
    onError: (e:any) => toast.error(e.response?.data?.detail || 'Failed to apply'),
  })

  const chartData = (savings?.savings||[]).slice(0,8).reverse().map((s:any) => ({ month:s.transaction_date?.slice(0,7)||'', amount:s.amount }))

  return (
    <AppShell title="Financial" subtitle="Savings, loans and credit management">
      <Tabs tabs={[{id:'savings',label:'Savings'},{id:'loans',label:'My Loans'},{id:'repayment',label:'Repayment'}]} active={tab} onChange={setTab}/>

      {tab==='savings' && (
        <div className="space-y-5">
          <div className="flex justify-end"><button onClick={()=>setSavingsOpen(true)} className="btn-primary btn-sm">Add Savings</button></div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Savings" value={inr(savings?.total_savings||0)} icon="💰" trend="up" color="green"/>
            <StatCard label="Total Deposits" value={inr(savings?.total_deposits||0)} icon="📥" color="blue"/>
            <StatCard label="Withdrawals" value={inr(savings?.total_withdrawals||0)} icon="📤" color="amber"/>
            <StatCard label="Net Balance" value={inr(savings?.total_savings||0)} icon="🏦" trend="up" color="purple"/>
          </div>
          {chartData.length > 1 && (
            <div className="card p-5">
              <h3 className="section-title mb-4">Monthly Deposits</h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartData}>
                  <XAxis dataKey="month" tick={{fontSize:10,fill:'#9ca3af'}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fontSize:10,fill:'#9ca3af'}} axisLine={false} tickLine={false}/>
                  <Tooltip formatter={(v:number)=>inr(v)} contentStyle={{fontSize:11,borderRadius:8}}/>
                  <Bar dataKey="amount" fill="#1a7a4a" radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="card">
            <div className="px-5 py-4 border-b border-gray-100"><h3 className="section-title">Transaction History</h3></div>
            <DataTable
              headers={['Date','Type','Amount','Balance','Notes']}
              rows={(savings?.savings||[]).map((s:any) => [
                fdate(s.transaction_date),
                <span className={`badge ${s.transaction_type==='deposit'?'badge-green':'badge-amber'}`}>{s.transaction_type}</span>,
                <span className="font-semibold">{inr(s.amount)}</span>,
                inr(s.balance_after),
                s.notes||'—',
              ])}
              emptyMsg="No transactions yet"
            />
          </div>
        </div>
      )}

      <Modal open={savingsOpen} onClose={()=>setSavingsOpen(false)} title="Add Savings">
        <form onSubmit={async (e)=>{ e.preventDefault(); try{ await savingsApi.recordSelf({ amount: Number(svAmount), transaction_type: svType, notes: svNotes, transaction_date: svDate||undefined }); toast.success('Saved'); qc.invalidateQueries(['savings']); qc.invalidateQueries(['dashboard']); setSavingsOpen(false); setSvAmount(''); setSvDate(''); setSvNotes(''); }catch(e:any){ toast.error(e.response?.data?.detail||'Failed to save') } }} className="space-y-4">
          <div>
            <label className="label">Amount</label>
            <input type="number" min={1} value={svAmount} onChange={e=>setSvAmount(e.target.value)} className="input" required />
          </div>
          <div>
            <label className="label">Date</label>
            <input type="date" value={svDate} onChange={e=>setSvDate(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">Savings type</label>
            <select value={svType} onChange={e=>setSvType(e.target.value)} className="input">
              <option value="deposit">Deposit</option>
              <option value="withdrawal">Withdrawal</option>
            </select>
          </div>
          <div>
            <label className="label">Notes</label>
            <input type="text" value={svNotes} onChange={e=>setSvNotes(e.target.value)} className="input" />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary">Save</button>
            <button type="button" onClick={()=>setSavingsOpen(false)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </Modal>

      {tab==='loans' && (
        <div className="space-y-5">
          <div className="grid lg:grid-cols-3 gap-5">
            <div className="card p-5">
              <h3 className="section-title mb-1">AI Credit Score</h3>
              <p className="text-xs text-gray-400 mb-4">Based on savings, attendance & repayment</p>
              {cs ? (
                <>
                  <CreditGauge score={cs.score}/>
                  <div className="mt-4 p-3 bg-brand-50 rounded-xl text-xs text-brand-700">
                    <p className="font-semibold">Max Eligible: {inr(cs.eligible_amount)}</p>
                    <p className="text-brand-600 mt-0.5">{cs.recommendation}</p>
                  </div>
                  <div className="mt-3 space-y-2">
                    {Object.entries(cs.breakdown).map(([k,v]:any) => (
                      <ProgressBar key={k} label={k} value={v} color={v>=70?'green':'amber'}/>
                    ))}
                  </div>
                </>
              ) : <Spinner/>}
            </div>
            <div className="lg:col-span-2">
              <div className="flex justify-between items-center mb-4">
                <h3 className="section-title">My Applications</h3>
                <button onClick={()=>setLoanModal(true)} className="btn-primary btn-sm gap-1"><Plus size={13}/>Apply for Loan</button>
              </div>
              <div className="card">
                <DataTable loading={loansLoading} emptyMsg="No loan applications yet"
                  headers={['Loan #','Amount','Purpose','AI Score','Status','Date']}
                  rows={(loans||[]).map((l:any) => [
                    <button onClick={()=>setLoanDetail(l)} className="font-mono text-xs text-blue-600 hover:underline cursor-pointer">{l.loan_number}</button>,
                    <span className="font-bold text-brand-600">{inr(l.amount)}</span>,
                    <span className="text-xs text-gray-600 max-w-[120px] truncate block">{l.purpose}</span>,
                    <span className={`font-bold ${creditColor(l.ai_credit_score||0).text}`}>{l.ai_credit_score?.toFixed(0)||'—'}</span>,
                    <span className={`badge ${loanStatusBadge(l.status)}`}>{l.status.replace(/_/g,' ')}</span>,
                    fdate(l.created_at),
                  ])}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {tab==='repayment' && (
        <div className="space-y-5">
          {(loans||[]).filter((l:any)=>['approved','disbursed'].includes(l.status)).length===0
            ? <EmptyState icon="📅" title="No active loans" message="Approved loans will show repayment schedule here"/>
            : (loans||[]).filter((l:any)=>['approved','disbursed'].includes(l.status)).map((loan:any) => (
              <LoanRepayments key={loan.id} loan={loan}/>
            ))}
        </div>
      )}

      <Modal open={loanModal} onClose={()=>setLoanModal(false)} title="Apply for Loan">
        <form onSubmit={handleSubmit(d=>applyMutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Loan Amount (₹)" required>
              <input {...register('amount',{required:'Required',min:{value:1000,message:'Min ₹1,000'}})} type="number" className="input" placeholder="25000"/>
              {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount.message as string}</p>}
            </Field>
            <Field label="Duration (months)">
              <select {...register('duration_months')} className="input">
                {[6,12,18,24,36].map(m=><option key={m} value={m}>{m} months</option>)}
              </select>
            </Field>
          </div>
          <Field label="Purpose" required>
            <textarea {...register('purpose',{required:'Required',minLength:{value:10,message:'Min 10 characters'}})} className="input" rows={2} placeholder="Describe how you will use this loan…"/>
            {errors.purpose && <p className="text-xs text-red-500 mt-1">{errors.purpose.message as string}</p>}
          </Field>
          <Field label="Collateral (optional)">
            <select {...register('collateral')} className="input">
              <option value="">None (SHG guarantee)</option>
              <option>Land / Property documents</option>
              <option>Gold ornaments</option>
              <option>Fixed Deposit receipt</option>
            </select>
          </Field>
          <div className="border-t pt-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">📄 Required Documents</h4>
            <Field label="Bank Passbook" required>
              <input {...register('bank_passbook',{required:'Bank passbook required'})} type="file" accept=".pdf,.jpg,.jpeg,.png" className="input"/>
              <p className="text-xs text-gray-500 mt-1">PDF or image (JPG/PNG)</p>
              {errors.bank_passbook && <p className="text-xs text-red-500 mt-1">{errors.bank_passbook.message}</p>}
            </Field>
            <Field label="Aadhaar Card" required>
              <input {...register('aadhaar',{required:'Aadhaar card required'})} type="file" accept=".pdf,.jpg,.jpeg,.png" className="input"/>
              <p className="text-xs text-gray-500 mt-1">PDF or image (JPG/PNG)</p>
              {errors.aadhaar && <p className="text-xs text-red-500 mt-1">{errors.aadhaar.message}</p>}
            </Field>
          </div>
          {cs && <div className="bg-brand-50 border border-brand-200 rounded-xl p-3 text-xs text-brand-700"><p className="font-semibold">Your eligibility: up to {inr(cs.eligible_amount)}</p><p className="text-brand-600 mt-0.5">Interest: 7% p.a. · Processing: 3-5 business days</p></div>}
          <button type="submit" disabled={applyMutation.isPending} className="btn-primary w-full">
            {applyMutation.isPending?<><Loader2 size={15} className="animate-spin"/>Submitting…</>:'Submit Application'}
          </button>
        </form>
      </Modal>

      {/* Loan Detail Modal */}
      <Modal open={!!loanDetail} onClose={()=>setLoanDetail(null)} title={`Loan Details - ${loanDetail?.loan_number}`}>
        {loanDetail && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-500">Amount</p>
                  <p className="font-bold text-lg text-brand-600">{inr(loanDetail.amount)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Duration</p>
                  <p className="font-bold text-lg">{loanDetail.duration_months} months</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500">Purpose</p>
                <p className="text-sm text-gray-700 mt-1">{loanDetail.purpose}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <p className="text-xs text-gray-500">AI Credit Score</p>
                  <p className={`font-bold text-sm ${creditColor(loanDetail.ai_credit_score||0).text}`}>{loanDetail.ai_credit_score?.toFixed(0)||'—'}/100</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Status</p>
                  <span className={`badge ${loanStatusBadge(loanDetail.status)}`}>{loanDetail.status.replace(/_/g,' ')}</span>
                </div>
              </div>
            </div>

            {loanDetail.status === 'approved' && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-green-800 mb-2">✅ Loan Approved!</p>
                <p className="text-xs text-green-700">Your loan has been approved. Disbursement will be processed within 1-2 business days.</p>
                {loanDetail.officer_remarks && <p className="text-xs text-green-600 mt-2"><strong>Officer Notes:</strong> {loanDetail.officer_remarks}</p>}
              </div>
            )}

            {loanDetail.status === 'rejected' && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-red-800 mb-2">❌ Application Not Approved</p>
                {loanDetail.rejection_reason ? (
                  <p className="text-xs text-red-700"><strong>Reason:</strong> {loanDetail.rejection_reason}</p>
                ) : (
                  <p className="text-xs text-red-700">Your application does not meet the current criteria. Please contact your coordinator for guidance.</p>
                )}
              </div>
            )}

            {['pending','coordinator_review','officer_review'].includes(loanDetail.status) && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-blue-800 mb-2">⏳ Application Under Review</p>
                <p className="text-xs text-blue-700">Your application is being reviewed. You will be notified once a decision is made.</p>
              </div>
            )}

            <button onClick={()=>setLoanDetail(null)} className="btn-secondary w-full">Close</button>
          </div>
        )}
      </Modal>
    </AppShell>
  )
}

function LoanRepayments({ loan }: { loan: any }) {
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey:['loan',loan.id], queryFn:()=>loansApi.get(loan.id).then(r=>r.data) })
  const payMutation = useMutation({
    mutationFn: (month:number) => loansApi.payEmi(loan.id, month),
    onSuccess: () => { toast.success('EMI recorded!'); qc.invalidateQueries({queryKey:['loan',loan.id]}) },
    onError: (e:any) => toast.error(e.response?.data?.detail||'Failed'),
  })
  const { user } = useAuthStore()
  const canMarkPaid = !!user && ['coordinator','admin'].includes(user.role)
  return (
    <div className="card">
      <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
        <div>
          <h3 className="section-title text-sm">{loan.loan_number}</h3>
          <p className="text-xs text-gray-400">{inr(loan.amount)} @ {loan.interest_rate}% · {loan.duration_months} months · EMI: {inr(loan.amount * 7/100/12 * Math.pow(1+7/100/12,loan.duration_months) / (Math.pow(1+7/100/12,loan.duration_months)-1))}/mo</p>
        </div>
        <span className="badge badge-green">{loan.status}</span>
      </div>
      <DataTable
        headers={['#','Due Date','EMI','Principal','Interest','Status','Action']}
        rows={(data?.repayments||[]).map((r:any) => [
          `#${r.month_number}`,
          fdate(r.due_date),
          <span className="font-semibold">{inr(r.emi_amount)}</span>,
          inr(r.principal_component),
          inr(r.interest_component),
          r.is_paid ? <span className="badge badge-green">✓ Paid</span> : <span className="badge badge-amber">Due</span>,
          !r.is_paid && canMarkPaid && <button onClick={()=>payMutation.mutate(r.month_number)} disabled={payMutation.isPending} className="btn-primary btn-sm text-xs">Mark Paid</button>
        ])}
      />
    </div>
  )
}

/* ════════════════════════════════════════
   GOVERNMENT SCHEMES
════════════════════════════════════════ */
export function SchemesPage() {
  const [search, setSearch] = useState('')
  const [cat, setCat] = useState('All')
  const [tab, setTab] = useState('browse')
  const [applyModal, setApplyModal] = useState<any>(null)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['schemes',cat,search],
    queryFn: () => schemesApi.list({ category:cat==='All'?undefined:cat, search:search||undefined }).then(r=>r.data),
    staleTime: 300000,
  })
  const { data: myApps } = useQuery({ queryKey:['scheme-apps'], queryFn:()=>schemesApi.myApplications().then(r=>r.data) })

  const applyMutation = useMutation({
    mutationFn: (d:any) => schemesApi.apply(d),
    onSuccess: () => { toast.success('Application submitted!'); setApplyModal(null); qc.invalidateQueries({queryKey:['scheme-apps']}) },
    onError: (e:any) => toast.error(e.response?.data?.detail||'Failed'),
  })

  const CATS = ['All','Finance','Business','Housing','Livelihood','Agriculture','Health','Employment']
  const CAT_BADGE: any = { Finance:'badge-purple', Business:'badge-blue', Housing:'badge-amber', Livelihood:'badge-green', Agriculture:'badge-green', Health:'badge-red', Employment:'badge-teal' }

  const [aiCheckModal, setAiCheckModal] = useState<any>(null)
  const [aiResult, setAiResult] = useState<string>('')
  const aiCheckMutation = useMutation({
    mutationFn: (id:number) => aiApi.schemeCheck({scheme_id: id}),
    onSuccess: (r) => setAiResult(r.data.reply),
    onError: (e:any) => toast.error(e.response?.data?.detail||'Failed')
  })

  const handleAiCheck = (s:any) => {
    setAiCheckModal(s)
    setAiResult('')
    aiCheckMutation.mutate(s.id)
  }

  return (
    <AppShell title="Government Schemes" subtitle="AI-matched schemes for your profile">
      <Tabs tabs={[{id:'browse',label:'All Schemes'},{id:'my',label:`My Applications${myApps?.length?` (${myApps.length})`:''}`}]} active={tab} onChange={setTab}/>

      {tab==='browse' && (
        <>
          <div className="flex gap-3 mb-5 flex-wrap items-center">
            <div className="flex-1 min-w-48 flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2.5">
              <Search size={14} className="text-gray-400 shrink-0"/>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search schemes…" className="flex-1 text-sm outline-none bg-transparent"/>
            </div>
            <div className="flex gap-2 flex-wrap">
              {CATS.map(c=><button key={c} onClick={()=>setCat(c)} className={`text-xs px-3 py-2 rounded-lg font-medium border transition-all ${cat===c?'bg-brand-500 text-white border-brand-500':'bg-white text-gray-600 border-gray-200 hover:border-brand-300'}`}>{c}</button>)}
            </div>
          </div>
          {isLoading ? <Spinner/> : (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {(data?.items||[]).map((s:any,i:number) => {
                const alreadyApplied = myApps?.some((a:any)=>a.scheme_id===s.id)
                return (
                  <motion.div key={s.id} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:i*0.04}} className="card p-5 hover:shadow-md hover:-translate-y-0.5 transition-all">
                    <div className="flex justify-between items-start mb-3">
                      <span className={`badge ${CAT_BADGE[s.category]||'badge-gray'}`}>{s.category}</span>
                      {alreadyApplied && <span className="badge badge-green">✓ Applied</span>}
                    </div>
                    <h3 className="text-sm font-bold text-gray-800 mb-1.5">{s.name}</h3>
                    <p className="text-xs text-gray-500 leading-relaxed mb-3 line-clamp-2">{s.benefits}</p>
                    {s.max_benefit_amount && <p className="text-xs font-bold text-brand-600 mb-3">Max: {inr(s.max_benefit_amount)}</p>}
                    <button onClick={()=>handleAiCheck(s)} className="btn-secondary w-full mb-2 btn-sm font-semibold text-purple-700 border-purple-200 bg-purple-50 hover:bg-purple-100 flex justify-center items-center gap-1">✨ Smart Check Eligibility</button>
                    <div className="flex gap-2">
                      {alreadyApplied
                        ? <span className="btn-secondary btn-sm w-full justify-center text-center text-xs">✓ Already Applied</span>
                        : <button onClick={()=>setApplyModal(s)} className="btn-primary btn-sm flex-1">Apply Now</button>}
                      {s.application_url && (
                        <a href={s.application_url} target="_blank" rel="noopener noreferrer" className="btn-secondary btn-sm px-2.5">
                          <ExternalLink size={13}/>
                        </a>
                      )}
                    </div>
                  </motion.div>
                )
              })}
              {!data?.items?.length && <div className="col-span-3"><EmptyState icon="📋" title="No schemes found" message="Try a different category or search term"/></div>}
            </div>
          )}
        </>
      )}

      {tab==='my' && (
        <div className="card">
          <DataTable
            headers={['Scheme','App Number','Category','Score','Status','Date']}
            rows={(myApps||[]).map((a:any) => [
              <span className="font-semibold">{a.scheme_name}</span>,
              <span className="font-mono text-xs text-gray-500">{a.application_number}</span>,
              <span className={`badge ${CAT_BADGE[a.category]||'badge-gray'}`}>{a.category}</span>,
              <span className="font-bold text-brand-600">{a.ai_eligibility_score?.toFixed(0)||'—'}%</span>,
              <span className={`badge ${schemeStatusBadge(a.status)}`}>{a.status.replace('_',' ')}</span>,
              fdate(a.submission_date),
            ])}
            emptyMsg="No scheme applications yet — apply from the All Schemes tab"
          />
        </div>
      )}

      <Modal open={!!applyModal} onClose={()=>setApplyModal(null)} title={`Apply: ${applyModal?.name}`}>
        {applyModal && (
          <div className="space-y-4">
            <div className="bg-brand-50 border border-brand-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-brand-800 mb-1">Benefits</p>
              <p className="text-xs text-brand-700">{applyModal.benefits}</p>
            </div>
            <div>
              <p className="text-sm font-semibold mb-2">Required Documents</p>
              {applyModal.required_documents && Array.isArray(JSON.parse(applyModal.required_documents||'[]')) ? (JSON.parse(applyModal.required_documents||'[]')).map((d:string) => (
                <div key={d} className="flex items-center gap-2 text-xs text-gray-600 mb-1.5"><CheckCircle size={12} className="text-brand-500 shrink-0"/>{d}</div>
              )) : null}
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
              ⚠️ Ensure you have all documents ready. You can only apply once per scheme.
            </div>
            <button onClick={()=>applyMutation.mutate({scheme_id:applyModal.id,form_data:{}})} disabled={applyMutation.isPending} className="btn-primary w-full">
              {applyMutation.isPending?<><Loader2 size={15} className="animate-spin"/>Submitting…</>:'Submit Application'}
            </button>
          </div>
        )}
      </Modal>

      <Modal open={!!aiCheckModal} onClose={()=>{setAiCheckModal(null);setAiResult('')}} title={`AI Assessment: ${aiCheckModal?.name}`}>
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-2 pb-3 border-b border-gray-100">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-xl">✨</div>
            <div>
              <p className="text-sm font-bold text-gray-800">GramSathi Smart Assistant</p>
              <p className="text-xs text-gray-400">Personalized matched for you</p>
            </div>
          </div>
          {aiCheckMutation.isPending && !aiResult && (
             <div className="flex flex-col items-center justify-center py-8 text-purple-600 text-center">
               <Loader2 size={34} className="animate-spin mb-3 mx-auto"/>
               <p className="text-sm font-semibold animate-pulse">Analyzing your profile & scheme constraints...</p>
               <p className="text-xs mt-1 text-purple-400">This checks your income, occupation, and district against the data.</p>
             </div>
          )}
          {aiResult && (
             <div className="bg-gradient-to-r from-purple-50 to-brand-50 border border-purple-100 shadow-inner p-5 rounded-xl text-sm leading-relaxed text-gray-800 whitespace-pre-wrap">
               {aiResult}
             </div>
          )}
        </div>
      </Modal>
    </AppShell>
  )
}

/* ════════════════════════════════════════
   SKILLS & TRAINING
════════════════════════════════════════ */
export function SkillsPage() {
  const [tab, setTab] = useState('my')
  const [addModal, setAddModal] = useState(false)
  const qc = useQueryClient()
  const { register, handleSubmit, reset } = useForm()

  const { data: mySkills } = useQuery({ queryKey:['my-skills'], queryFn:()=>skillsApi.my().then(r=>r.data) })
  const { data: allSkills } = useQuery({ queryKey:['all-skills'], queryFn:()=>skillsApi.all().then(r=>r.data) })
  const { data: training } = useQuery({ queryKey:['training'], queryFn:()=>trainingApi.list().then(r=>r.data), staleTime:30000 })
  const { data: myEnrollments } = useQuery({ queryKey:['my-enrollments'], queryFn:()=>trainingApi.myEnrollments().then(r=>r.data), staleTime:30000 })

  const addMutation = useMutation({
    mutationFn: (d:any) => skillsApi.add({ skill_id:parseInt(d.skill_id), proficiency:d.proficiency, years_experience:parseFloat(d.years_experience)||0 }),
    onSuccess: () => { toast.success('Skill added!'); setAddModal(false); reset(); qc.invalidateQueries({queryKey:['my-skills']}) },
    onError: (e:any) => toast.error(e.response?.data?.detail||'Failed'),
  })
  const removeMutation = useMutation({
    mutationFn: (id:number) => skillsApi.remove(id),
    onSuccess: () => { toast.success('Skill removed'); qc.invalidateQueries({queryKey:['my-skills']}); qc.invalidateQueries({queryKey:['livelihoods']}) },
  })
  const enrollMutation = useMutation({
    mutationFn: (id:number) => trainingApi.enroll(id),
    onSuccess: (_, id) => { 
      toast.success('Enrolled successfully! 🎓');
      qc.invalidateQueries({queryKey:['training']});
      qc.invalidateQueries({queryKey:['my-enrollments']});
    },
    onError: (e:any) => toast.error(e.response?.data?.detail||'Failed to enroll'),
  })

  const profBadge: any = { advanced:'badge-green', intermediate:'badge-blue', beginner:'badge-amber' }

  return (
    <AppShell title="Skills & Training" subtitle="Manage your skills and discover free training programs">
      <Tabs tabs={[{id:'my',label:'My Skills'},{id:'training',label:'Training Programs'},{id:'my-enrollments',label:'My Enrollments'}]} active={tab} onChange={setTab}/>

      {tab==='my' && (
        <div className="grid lg:grid-cols-2 gap-5">
          <div className="card p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="section-title">My Skills</h3>
              <button onClick={()=>setAddModal(true)} className="btn-primary btn-sm gap-1"><Plus size={13}/>Add Skill</button>
            </div>
            {!mySkills?.length
              ? <EmptyState icon="🎓" title="No skills yet" message="Add your skills to get personalized livelihood recommendations" action={<button onClick={()=>setAddModal(true)} className="btn-primary btn-sm">Add First Skill</button>}/>
              : (
                <div className="space-y-2.5">
                  {(mySkills||[]).map((s:any) => (
                    <div key={s.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl group">
                      <div className="w-9 h-9 bg-brand-100 rounded-lg flex items-center justify-center text-brand-600 font-bold text-sm shrink-0">{s.name[0]}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">{s.name}</p>
                        <p className="text-xs text-gray-400">{s.category} · {s.years_experience}yr exp</p>
                      </div>
                      <span className={`badge ${profBadge[s.proficiency]||'badge-gray'} capitalize`}>{s.proficiency}</span>
                      <button onClick={()=>removeMutation.mutate(s.id)} className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 text-lg leading-none">×</button>
                    </div>
                  ))}
                </div>
              )}
          </div>
          <div className="card p-5">
            <h3 className="section-title mb-1">AI Skill Recommendations</h3>
            <p className="text-xs text-gray-400 mb-4">High-demand skills in your region</p>
            {['Digital Payments & UPI','Mushroom Cultivation','Organic Food Processing','Bamboo Craft & Design','GST Basics & Accounting'].map(s => (
              <div key={s} className="flex items-center justify-between p-3 border border-dashed border-gray-200 rounded-xl mb-2 hover:border-brand-300 hover:bg-brand-50 transition-all cursor-pointer" onClick={()=>setAddModal(true)}>
                <div><p className="text-sm font-semibold">{s}</p><p className="text-xs text-gray-400">Free training available · High demand</p></div>
                <button className="btn-primary btn-sm text-xs">Add Skill</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab==='training' && (
        <div className="space-y-4">
          <InfoBanner icon="🎓" title="All training programs are FREE for SHG members" message="Enroll now to receive a confirmation notification and training materials." color="green"/>
          <div className="card">
            <DataTable
              headers={['Program','Provider','Duration','Mode','Seats Left','Start Date','Action']}
              rows={(training||[]).map((t:any) => [
                <div className="font-semibold"><span>{t.title}</span>{t.description && <p className="text-xs text-gray-400 mt-0.5">{t.description.slice(0,50)}</p>}</div>,
                <span className="text-gray-600 text-sm">{t.provider||'NRLM'}</span>,
                <span className="text-sm font-medium">{t.duration_days} days</span>,
                <span className={`badge ${t.mode==='online'?'badge-blue':t.mode==='hybrid'?'badge-purple':'badge-green'}`}>{t.mode}</span>,
                <span className={`font-semibold ${(t.seats_left || (t.max_participants - t.enrolled_count)) <= 3 ? 'text-red-500' : 'text-green-600'}`}>{t.seats_left || (t.max_participants - t.enrolled_count)} left</span>,
                <span className="text-sm">{t.start_date ? fdate(t.start_date) : 'Flexible'}</span>,
                t.is_enrolled
                  ? <span className="badge badge-green text-xs">✓ Enrolled</span>
                  : ((t.seats_left || (t.max_participants - t.enrolled_count)) <= 0
                    ? <span className="text-xs text-gray-400">Full</span>
                    : <button 
                        onClick={()=>enrollMutation.mutate(t.id)} 
                        disabled={enrollMutation.isPending} 
                        className="btn-primary btn-sm text-xs"
                      >
                        {enrollMutation.isPending?<><Loader2 size={11} className="animate-spin"/>Enrolling</>:'Enroll'}
                      </button>
                  ),
              ])}
              emptyMsg="🎓 No training programs available at the moment"
            />
          </div>
        </div>
      )}

      {tab==='my-enrollments' && (
        <div className="space-y-4">
          {(!myEnrollments || myEnrollments.length === 0) ? (
            <EmptyState 
              icon="🎓" 
              title="No enrollments yet" 
              message="Explore training programs and enroll to get started"
              action={<button onClick={()=>setTab('training')} className="btn-primary btn-sm">Explore Programs</button>}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {(myEnrollments||[]).map((e:any) => (
                <div key={e.id} className="card p-5 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-bold text-gray-900">{e.title}</h4>
                      <p className="text-xs text-gray-400 mt-1">{e.provider}</p>
                    </div>
                    <span className={`badge ${e.status==='completed'?'badge-green':e.status==='cancelled'?'badge-red':'badge-blue'}`}>{e.status}</span>
                  </div>
                  <div className="space-y-2.5 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="text-base">📅</span>
                      <span>{e.start_date ? fdate(e.start_date) : 'Flexible schedule'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="text-base">⏱️</span>
                      <span>{e.duration_days} days</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="text-base">{e.mode==='online'?'💻':e.mode==='hybrid'?'🔀':'📍'}</span>
                      <span>{e.mode.charAt(0).toUpperCase() + e.mode.slice(1)} {e.location && `- ${e.location}`}</span>
                    </div>
                  </div>
                  {e.description && (
                    <p className="text-xs text-gray-500 mb-3 leading-relaxed">{e.description}</p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-gray-400 pt-3 border-t border-gray-50">
                    <span>Enrolled: {new Date(e.enrolled_at).toLocaleDateString('en-IN')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Modal open={addModal} onClose={()=>setAddModal(false)} title="Add New Skill">
        <form onSubmit={handleSubmit(d=>addMutation.mutate(d))} className="space-y-4">
          <Field label="Select Skill" required>
            <select {...register('skill_id',{required:true})} className="input">
              <option value="">— Choose a skill —</option>
              {Object.entries(((allSkills||[]).reduce((acc:any,s:any)=>{if(!acc[s.category])acc[s.category]=[];acc[s.category].push(s);return acc},{})))
                .map(([cat,skills]:any) => (
                  <optgroup key={cat} label={cat}>
                    {skills.map((s:any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </optgroup>
                ))}
            </select>
          </Field>
          <Field label="Proficiency Level">
            <select {...register('proficiency')} className="input">
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </Field>
          <Field label="Years of Experience">
            <input {...register('years_experience')} type="number" step="0.5" min="0" max="50" className="input" placeholder="0"/>
          </Field>
          <button type="submit" disabled={addMutation.isPending} className="btn-primary w-full">
            {addMutation.isPending?<><Loader2 size={15} className="animate-spin"/>Adding…</>:'Add Skill'}
          </button>
        </form>
      </Modal>
    </AppShell>
  )
}

/* ════════════════════════════════════════
   LIVELIHOOD AI PLANNER
════════════════════════════════════════ */
export function LivelihoodPage() {
  const [selected, setSelected] = useState<any>(null)
  const { data, isLoading } = useQuery({ queryKey:['livelihoods'], queryFn:()=>aiApi.livelihoods().then(r=>r.data), staleTime:60000 })
  const nav = useNavigate()

  return (
    <AppShell title="Livelihood AI Planner" subtitle="AI-matched income opportunities based on your skills">
      <InfoBanner icon="🤖" title="AI Livelihood Recommendations"
        message={`Ranked by match score from your skills${data?.user_skills?.length?` (${data.user_skills.join(', ')})`:' — add skills for better matching'} and location. Click any card to explore.`}
        color="green"/>
      {!data?.user_skills?.length && (
        <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
          <div><p className="text-sm font-semibold text-amber-800">Add your skills for better matching!</p><p className="text-xs text-amber-700">Go to Skills tab and add your skills to get personalized recommendations.</p></div>
          <button onClick={()=>nav('/app/skills')} className="btn-primary btn-sm shrink-0">Add Skills →</button>
        </div>
      )}
      {isLoading ? <Spinner text="Analyzing your profile…"/> : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {(data?.recommendations||[]).map((l:any,i:number) => (
            <motion.div key={l.id} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:i*0.06}}
              className="card p-5 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer" onClick={()=>setSelected(l)}>
              <div className="flex items-start justify-between mb-3">
                <div className="text-4xl">{l.icon}</div>
                <div className="text-right">
                  <span className="text-xs font-bold text-brand-600 bg-brand-50 px-2 py-1 rounded-lg block">{l.match_score}% match</span>
                </div>
              </div>
              <h3 className="font-display font-bold text-gray-900 mb-1">{l.title}</h3>
              <p className="text-base font-bold text-brand-600">₹{l.income_min.toLocaleString()}–₹{l.income_max.toLocaleString()}<span className="text-xs font-normal text-gray-500">/mo</span></p>
              <p className="text-xs text-gray-500 mt-1 mb-3">Investment: ₹{l.investment.toLocaleString()} · Profit in {l.months_to_profit}mo</p>
              <ProgressBar value={l.match_score} showPct={false} color="green"/>
              <div className="flex gap-2 mt-3">
                <span className={`badge ${l.training_mode==='online'?'badge-blue':'badge-green'} text-[10px]`}>{l.training_available?'✓ Training Available':'Self-learn'}</span>
              </div>
              <button className="btn-primary btn-sm w-full mt-3">Explore Opportunity →</button>
            </motion.div>
          ))}
        </div>
      )}

      <Modal open={!!selected} onClose={()=>setSelected(null)} title={selected?.title||''}>
        {selected && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <div className="text-5xl mb-2">{selected.icon}</div>
              <h3 className="font-display text-xl font-bold">{selected.title}</h3>
              <p className="text-lg font-bold text-brand-600 mt-1">₹{selected.income_min.toLocaleString()}–₹{selected.income_max.toLocaleString()}/month</p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              {[['Investment',`₹${selected.investment.toLocaleString()}`],['Break-even',`${selected.months_to_profit} months`],['Training',selected.training_available?'Available':'Self-learn']].map(([k,v]) => (
                <div key={String(k)} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">{k}</p>
                  <p className="text-sm font-bold text-gray-800 mt-0.5">{v}</p>
                </div>
              ))}
            </div>
            <div className="space-y-3">
              <button onClick={()=>{nav('/app/financial');setSelected(null)}} className="btn-primary w-full">Apply for MUDRA Loan to Fund This →</button>
              <button onClick={()=>{nav('/app/skills');setSelected(null)}} className="btn-secondary w-full">Find Related Training Programs</button>
            </div>
          </div>
        )}
      </Modal>
    </AppShell>
  )
}
