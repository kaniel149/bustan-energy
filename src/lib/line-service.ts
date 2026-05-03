// LINE messaging integration for Thailand market
// LINE has 54M MAU in Thailand (85% of internet users)

const LINE_OA_ID = import.meta.env.VITE_LINE_OA_ID || ''  // e.g. '@tmenergy'

// Open LINE chat with pre-filled message (client-side, no API key needed)
export function openLineChat(message: string): void {
  const encodedId = encodeURIComponent(LINE_OA_ID)
  const encodedMsg = encodeURIComponent(message)
  window.open(`https://line.me/R/oaMessage/${encodedId}/?${encodedMsg}`, '_blank')
}

// Build LINE share URL (share text with any LINE contact)
export function getLineShareUrl(text: string): string {
  return `https://line.me/R/share?text=${encodeURIComponent(text)}`
}

// Build proposal message for LINE
export function buildProposalMessage(params: {
  clientName: string
  capacityKwp: number
  annualSavings: number
  paybackYears: number
  proposalRef: string
  proposalUrl?: string
}): string {
  const { clientName, capacityKwp, annualSavings, paybackYears, proposalRef } = params
  return [
    `☀️ Solar Proposal for ${clientName}`,
    ``,
    `⚡ System: ${capacityKwp} kWp`,
    `💰 Annual Savings: ฿${annualSavings.toLocaleString()}`,
    `📊 Payback: ${paybackYears.toFixed(1)} years`,
    `📋 Ref: ${proposalRef}`,
    ``,
    params.proposalUrl ? `📄 View Proposal: ${params.proposalUrl}` : '',
    ``,
    `Bustan Energy — Koh Phangan`,
  ].filter(Boolean).join('\n')
}

// Check if LINE OA is configured
export function isLineConfigured(): boolean {
  return !!LINE_OA_ID
}

// LINE Add Friend URL (for QR codes / buttons)
export function getLineAddFriendUrl(): string {
  return `https://line.me/R/ti/p/${LINE_OA_ID}`
}
