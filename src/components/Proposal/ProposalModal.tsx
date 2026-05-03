import { X, Zap, DollarSign, Calendar, Phone, Send, Check } from 'lucide-react'
import { useState } from 'react'
import type { Property } from '../../types'
import type { FinancialAnalysis } from '../../lib/financial-calc'
import { logProposalSent } from '../../lib/crm-service'
import { useAppStore } from '../../lib/store'
import { getCrmProjects } from '../../lib/crm-service'

interface ProposalModalProps {
  property: Property
  financial: FinancialAnalysis
  onClose: () => void
}

export function ProposalModal({ property, financial, onClose }: ProposalModalProps) {
  const [activeTab, setActiveTab] = useState<'epc' | 'ppa' | 'lease'>('epc')
  const [copied, setCopied] = useState(false)
  const [crmStatus, setCrmStatus] = useState<'idle' | 'logging' | 'done'>('idle')
  const setCrmProjects = useAppStore((s) => s.setCrmProjects)
  const user = useAppStore((s) => s.user)

  const logToCrm = async (channel: 'whatsapp' | 'copy') => {
    if (!user) return
    setCrmStatus('logging')
    try {
      await logProposalSent(property, activeTab, channel, {
        capacityKwp: financial.capacityKwp,
        annualSavings: financial.annualSavingsYear1,
        paybackYears: financial.paybackYears,
        dealValue: financial.epcCost,
      })
      // Refresh CRM projects in store
      const projects = await getCrmProjects()
      setCrmProjects(projects)
      setCrmStatus('done')
    } catch {
      setCrmStatus('idle')
    }
  }

  const proposalRef = `BU-${property.id.slice(0, 6).toUpperCase()}`

  // PPA rate: 20% above LCOE but still below grid (~4.5 THB/kWh)
  const ppaRate = (financial.lcoe * 1.2).toFixed(2)
  const gridRate = 4.5
  const ppaSavings = ((gridRate - parseFloat(ppaRate)) / gridRate * 100).toFixed(0)

  // Lease: 10-year term, 15% markup over EPC
  const leaseTerm = 10
  const monthlyLease = Math.round(financial.epcCost * 1.15 / (leaseTerm * 12))
  const monthlySavings = Math.round(financial.annualSavingsYear1 / 12)

  const shareText = [
    `☀️ Solar Proposal — ${proposalRef}`,
    `📍 ${property.title}`,
    `⚡ System: ${financial.capacityKwp.toFixed(1)} kWp`,
    `💰 Annual Savings: ฿${(financial.annualSavingsYear1 / 1000).toFixed(0)}K`,
    `📈 Payback: ${financial.paybackYears.toFixed(1)} years`,
    `🌱 CO₂ Avoided: ${financial.co2Avoided.toFixed(0)} tons/25yr`,
  ].join('\n')

  const handleWhatsApp = () => {
    const phone = property.phone?.replace(/[^0-9]/g, '') || ''
    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(shareText)}`
      : `https://wa.me/?text=${encodeURIComponent(shareText)}`
    window.open(url, '_blank')
    logToCrm('whatsapp')
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(shareText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    logToCrm('copy')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#0D2137] border border-white/10 rounded-2xl w-[560px] max-w-[95vw] max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div>
            <h2 className="text-sm font-semibold text-white">Solar Proposal Options</h2>
            <p className="text-[10px] text-white/40 mt-0.5">{proposalRef} · {property.title}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* System Summary */}
        <div className="px-5 py-3 bg-white/[0.02] border-b border-white/10">
          <div className="grid grid-cols-4 gap-3">
            <MiniStat label="System" value={`${financial.capacityKwp.toFixed(1)} kWp`} />
            <MiniStat label="Annual Output" value={`${(financial.annualKwhYear1 / 1000).toFixed(0)} MWh`} />
            <MiniStat label="Annual Savings" value={`฿${(financial.annualSavingsYear1 / 1000).toFixed(0)}K`} color="#2ED89A" />
            <MiniStat label="CO₂ Avoided" value={`${financial.co2Avoided.toFixed(0)} tons`} color="#22C55E" />
          </div>
        </div>

        {/* Option Tabs */}
        <div className="flex border-b border-white/10">
          {([
            { id: 'epc' as const, label: 'EPC Purchase', icon: DollarSign },
            { id: 'ppa' as const, label: 'PPA', icon: Zap },
            { id: 'lease' as const, label: 'Lease', icon: Calendar },
          ]).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-medium transition-colors border-b-2 ${
                activeTab === id
                  ? 'border-[#E8A820] text-[#E8A820] bg-[#E8A820]/5'
                  : 'border-transparent text-white/40 hover:text-white/70'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* Option Content */}
        <div className="p-5">
          {activeTab === 'epc' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Option 1: EPC Purchase</h3>
                <p className="text-xs text-white/50 mt-1">Full system ownership. Pay upfront, save for 25+ years.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <ProposalStat label="System Cost" value={`฿${(financial.epcCost / 1000000).toFixed(2)}M`} />
                <ProposalStat label="Monthly Savings" value={`฿${(financial.annualSavingsYear1 / 12000).toFixed(0)}K`} color="#2ED89A" />
                <ProposalStat label="Payback Period" value={`${financial.paybackYears.toFixed(1)} years`} color={financial.paybackYears < 7 ? '#2ED89A' : '#E8A820'} />
                <ProposalStat label="25-Year ROI" value={`${financial.roi25Year.toFixed(0)}%`} color="#E8A820" />
                <ProposalStat label="IRR" value={`${(financial.irr * 100).toFixed(1)}%`} />
                <ProposalStat label="Lifetime Savings" value={`฿${(financial.lifetimeSavings / 1000000).toFixed(1)}M`} color="#2ED89A" />
              </div>
            </div>
          )}

          {activeTab === 'ppa' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Option 2: Power Purchase Agreement</h3>
                <p className="text-xs text-white/50 mt-1">Zero upfront cost. Buy solar power at a rate below grid utility.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <ProposalStat label="Upfront Cost" value="฿0" color="#2ED89A" />
                <ProposalStat label="PPA Rate" value={`฿${ppaRate}/kWh`} color="#E8A820" />
                <ProposalStat label="Grid Rate" value={`฿${gridRate.toFixed(2)}/kWh`} />
                <ProposalStat label="Day-1 Savings" value={`${ppaSavings}%`} color="#2ED89A" />
                <ProposalStat label="Contract Term" value="25 years" />
                <ProposalStat label="Escalation" value="2% / year" />
              </div>
            </div>
          )}

          {activeTab === 'lease' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Option 3: Solar Lease</h3>
                <p className="text-xs text-white/50 mt-1">Fixed monthly payment. Own the system after the lease term.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <ProposalStat label="Monthly Payment" value={`฿${monthlyLease.toLocaleString()}`} color="#E8A820" />
                <ProposalStat label="Monthly Savings" value={`฿${monthlySavings.toLocaleString()}`} color="#2ED89A" />
                <ProposalStat label="Lease Term" value={`${leaseTerm} years`} />
                <ProposalStat label="Net Monthly" value={`฿${(monthlySavings - monthlyLease).toLocaleString()}`} color={monthlySavings > monthlyLease ? '#2ED89A' : '#FF3D00'} />
                <ProposalStat label="Buyout at End" value="฿1" color="#2ED89A" />
                <ProposalStat label="Total Lease Cost" value={`฿${(monthlyLease * leaseTerm * 12 / 1000000).toFixed(2)}M`} />
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-5 pt-0 space-y-3">
          <div className="flex gap-3">
            <button
              onClick={handleWhatsApp}
              className="flex-1 py-2.5 rounded-xl bg-[#25D366]/20 border border-[#25D366]/30 text-[#25D366] text-xs font-semibold flex items-center justify-center gap-2 hover:bg-[#25D366]/30 transition-colors"
            >
              <Phone size={14} />
              WhatsApp
            </button>
            <button
              onClick={handleCopy}
              className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 text-xs font-semibold flex items-center justify-center gap-2 hover:bg-white/10 transition-colors"
            >
              {copied ? <><Check size={14} /> Copied!</> : <><Send size={14} /> Copy Summary</>}
            </button>
          </div>

          {/* CRM status feedback */}
          {crmStatus === 'logging' && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#6366f1]/10 border border-[#6366f1]/20 text-[#6366f1] text-[11px]">
              <div className="w-3 h-3 border-2 border-[#6366f1] border-t-transparent rounded-full animate-spin" />
              Logging to CRM pipeline...
            </div>
          )}
          {crmStatus === 'done' && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#2ED89A]/10 border border-[#2ED89A]/20 text-[#2ED89A] text-[11px]">
              <Check size={12} />
              Saved to CRM — auto-advanced to Proposal stage
            </div>
          )}
          {!user && (
            <p className="text-[10px] text-white/30 text-center">Sign in to auto-log proposals to CRM</p>
          )}
        </div>
      </div>
    </div>
  )
}

function MiniStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <p className="text-[9px] text-white/40 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-bold" style={color ? { color } : { color: '#fff' }}>{value}</p>
    </div>
  )
}

function ProposalStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-white/5 rounded-xl p-3">
      <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm font-bold" style={color ? { color } : { color: '#fff' }}>{value}</p>
    </div>
  )
}
