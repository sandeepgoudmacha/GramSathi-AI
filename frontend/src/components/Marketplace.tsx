import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { marketplaceApi } from '@/services/api'
import { Modal, Spinner, EmptyState } from '@/components/ui'
import { inr } from '@/utils/helpers'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store'

export default function Marketplace() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const { data, isLoading } = useQuery({ queryKey: ['marketplace-products'], queryFn: () => marketplaceApi.products().then(r => r.data), staleTime: 60000 })
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedDetail, setSelectedDetail] = useState<any>(null)
  const [qty, setQty] = useState(1)
  const [buyerName, setBuyerName] = useState(user?.full_name || '')
  const [buyerPhone, setBuyerPhone] = useState(user?.phone || '')
  const [buyerAddress, setBuyerAddress] = useState('')
  const [notes, setNotes] = useState('')

  const placeOrder = useMutation({
    mutationFn: (payload: any) => marketplaceApi.placeOrder(payload).then(r => r.data),
    onSuccess: () => {
      toast.success('Order placed — seller will contact you soon')
      setOpen(false)
      qc.invalidateQueries(['marketplace-products'])
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Could not place order')
  })

  function RecommendedList({ category, currentId, onView }: any) {
    const { data: recsData, isLoading: recLoading } = useQuery({
      queryKey: ['marketplace-recs', category, currentId],
      queryFn: () => marketplaceApi.recommendations({ buyer_id: user?.id, category }).then(r => r.data),
      enabled: Boolean(category),
      staleTime: 60000,
    })
    const allItems = Array.isArray(recsData) ? recsData : (recsData?.items || [])
    const items = allItems.filter((it: any) => it && it.id !== currentId)
    if (recLoading) return <div className="p-3"><Spinner text="Finding recommendations…"/></div>
    if (!items?.length) return <div className="text-sm text-gray-500">No recommendations available.</div>
    return (
      <div className="grid grid-cols-2 gap-3">
        {items.map((r: any) => {
          const img = (() => { try { return r.images ? (Array.isArray(r.images)?r.images[0]:JSON.parse(r.images||'[]')[0]) : (r.image||r.image_emoji) } catch { return r.image||r.image_emoji } })()
          return (
            <div key={r.id} className="p-2 border rounded-lg bg-gray-50">
              <div className="h-20 mb-2 overflow-hidden flex items-center justify-center">{img ? <img src={img} className="w-full h-full object-cover" alt={r.name}/> : <div className="text-sm">No image</div>}</div>
              <div className="text-sm font-semibold truncate">{r.name}</div>
              <div className="text-sm text-brand-600 font-bold">{inr(r.price)}</div>
              <div className="mt-2 flex gap-2">
                <button onClick={()=>onView(r)} className="btn-secondary btn-xs">View</button>
                <button onClick={()=>{ setSelected(r); setOpen(true); setDetailOpen(false) }} className="btn-primary btn-xs">Buy</button>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const onBuy = (p: any) => {
    // allow guest checkout — prefill buyer info if logged in
    setSelected(p)
    setQty(1)
    setBuyerName(user?.full_name || '')
    setBuyerPhone(user?.phone || '')
    setBuyerAddress('')
    setNotes('')
    setOpen(true)
  }

  const openDetail = (p: any) => {
    setSelectedDetail(p)
    setDetailOpen(true)
  }

  const confirmBuy = () => {
    if (!selected) return
    const payload = {
      buyer_name: buyerName,
      buyer_phone: buyerPhone,
      buyer_address: buyerAddress,
      payment_method: 'cod',
      notes: notes || '',
      items: [{ product_id: selected.id, quantity: qty }],
      buyer_id: user?.id || null,
    }
    placeOrder.mutate(payload)
  }

  if (isLoading) return <div className="card p-6"><Spinner text="Loading marketplace…"/></div>

  const products = Array.isArray(data) ? data : (data?.items || [])
  if (!products.length) return <div className="card p-6"><EmptyState icon="🛍️" title="No products" message="No marketplace products available right now." action={null}/></div>

  return (
    <section className="py-12">
      <div className="max-w-6xl mx-auto px-5">
        <h3 className="font-display text-2xl font-bold mb-4">Marketplace — Local Products</h3>
        <p className="text-sm text-white/60 mb-6">Buy authentic SHG-made products from across villages.</p>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          {products.map((p: any) => {
            // resolve image safely
            let img = null
            try { if (p.images) img = Array.isArray(p.images) ? p.images[0] : JSON.parse(p.images||'[]')[0] } catch {}
            img = img || p.image || p.image_emoji || null
            return (
            <div key={p.id} className="bg-white/5 border border-white/8 rounded-2xl p-4 flex flex-col">
              <div onClick={()=>openDetail(p)} className="h-40 mb-3 bg-gray-100/10 rounded-lg flex items-center justify-center text-sm overflow-hidden cursor-pointer">
                {img ? <img src={img} alt={p.title||p.name} className="w-full h-full object-cover"/> : <div className="text-xs text-white/50">No image</div>}
              </div>
              <div className="flex-1">
                <div onClick={()=>openDetail(p)} className="font-semibold text-white truncate mb-1 cursor-pointer">{p.title || p.name}</div>
                <div className="text-sm text-white/60 mb-3">{p.short_description || p.description || ''}</div>
              </div>
              <div className="flex items-center justify-between mt-3">
                <div className="text-lg font-bold text-brand-400">{inr(p.price || p.amount || 0)}</div>
                <div className="flex gap-2">
                  <button onClick={() => onBuy(p)} className="btn-primary btn-sm">Buy</button>
                </div>
              </div>
            </div>
            )
          })}
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={selected?.title || selected?.name || 'Buy product'} size="sm">
          <div className="space-y-4">
          <div className="text-sm text-black">{selected?.description || selected?.short_description}</div>
          <div className="flex items-center gap-3">
            <label className="text-sm text-black">Quantity</label>
            <input type="number" min={1} value={qty} onChange={e=>setQty(Number(e.target.value))} className="input w-24 text-black" />
          </div>
          <div className="space-y-2">
            <input value={buyerName} onChange={e=>setBuyerName(e.target.value)} placeholder="Your name" className="input" />
            <input value={buyerPhone} onChange={e=>setBuyerPhone(e.target.value)} placeholder="Mobile number" className="input" />
            <textarea value={buyerAddress} onChange={e=>setBuyerAddress(e.target.value)} placeholder="Delivery address" className="input h-24" />
            <input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Notes (optional)" className="input" />
          </div>
          <div className="flex items-center justify-between">
            <div className="text-sm text-black">Total</div>
            <div className="font-bold text-lg text-black">{inr((selected?.price || selected?.amount || 0) * qty)}</div>
          </div>
          <div className="flex gap-2">
            <button onClick={confirmBuy} disabled={placeOrder.isLoading} className="btn-primary flex-1">{placeOrder.isLoading ? 'Placing…' : 'Place Order'}</button>
            <button onClick={() => setOpen(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </Modal>

      {/* Product Detail Modal with recommendations */}
      <Modal open={detailOpen} onClose={() => { setDetailOpen(false); setSelectedDetail(null) }} title={selectedDetail?.title || selectedDetail?.name || 'Product details'} size="lg">
        {!selectedDetail ? <Spinner text="Loading…"/> : (
          <div className="grid md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <div className="h-64 bg-gray-100 rounded-lg overflow-hidden mb-3 flex items-center justify-center">
                {(() => { try { const imgs = selectedDetail.images ? (Array.isArray(selectedDetail.images)?selectedDetail.images:JSON.parse(selectedDetail.images||'[]')) : []; const m = imgs[0] || selectedDetail.image || selectedDetail.image_emoji; return m ? <img src={m} className="w-full h-full object-cover" alt={selectedDetail.name}/> : <div className="text-black">No image</div> } catch { return <div className="text-black">No image</div> } })()}
              </div>
              <div className="space-y-2 text-sm text-black">
                <div><strong>Seller:</strong> {selectedDetail.seller_name || '—'}</div>
                <div><strong>Category:</strong> {selectedDetail.category || '—'}</div>
                <div><strong>Stock:</strong> {selectedDetail.stock ?? '—'}</div>
                <div className="text-2xl font-bold text-black mt-2">{inr(selectedDetail.price || selectedDetail.amount || 0)}</div>
                <div className="mt-3"><button onClick={()=>{ setSelected(selectedDetail); setOpen(true); setDetailOpen(false) }} className="btn-primary w-full">Buy this product</button></div>
              </div>
            </div>
            <div className="md:col-span-2">
              <div className="prose max-w-none text-sm text-black mb-4">{selectedDetail.description || selectedDetail.ai_description || ''}</div>
              <h4 className="text-sm font-semibold text-black mb-2">Recommended for you</h4>
              <RecommendedList category={selectedDetail.category} currentId={selectedDetail.id} onView={(p:any)=>{ setSelectedDetail(p) }} />
            </div>
          </div>
        )}
      </Modal>
    </section>
  )
}
