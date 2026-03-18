import React from 'react'
import Marketplace from '@/components/Marketplace'
import { Link } from 'react-router-dom'

export default function MarketplacePublic() {
  return (
    <div className="min-h-screen bg-[#0b1a10] text-white">
      <header className="border-b border-white/10 bg-[#0b1a10]/92 py-4">
        <div className="max-w-6xl mx-auto px-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">🌱</div>
            <div className="font-display font-bold">GramSathi AI Marketplace</div>
          </div>
          <div>
            <Link to="/" className="text-sm text-white/60 hover:text-white">Home</Link>
          </div>
        </div>
      </header>

      <main className="py-12">
        <Marketplace />
      </main>
    </div>
  )
}
