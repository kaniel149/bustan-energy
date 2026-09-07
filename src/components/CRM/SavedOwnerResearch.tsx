import type { OwnerResearchRecord } from '../../lib/scan-owner-types'
import { safeWebsite } from '../../lib/scan-assessment'

/** Research is separate from the CRM's manually verified ownership fields. */
export function SavedOwnerResearch({ value }: { value: unknown }) {
  if (!value || typeof value !== 'object') return null
  const record = value as OwnerResearchRecord
  if (!record.candidate_id) return null
  const result = record.result
  const review = record.review
  return <section dir="rtl" className="rounded-xl border border-[#C79942]/30 bg-[#F7F1E5] p-3 text-[#27342F] space-y-2" aria-label="מחקר בעלים שמור מהסריקה">
    <h4 className="text-sm font-semibold">מחקר בעלים מהגג</h4>
    {result?.selectedBusiness && <p className="text-xs">עסק שנבחר למחקר: <strong>{result.selectedBusiness.name}</strong></p>}
    {Array.isArray(result?.findings) && result.findings.slice(0, 5).map((finding, index) => <div key={index} className="rounded-lg bg-white p-2 text-xs">
      <p className="font-medium">{finding.name} · {finding.role}</p>
      <p className="mt-1 text-[#27342F]/65">ממצא פומבי לבדיקה</p>
      {safeWebsite(finding.sourceUrl) && <a href={safeWebsite(finding.sourceUrl)!} target="_blank" rel="noopener noreferrer" className="mt-1 block text-[#24463E] underline">פתיחת הראיה</a>}
    </div>)}
    {review?.legalOwnerName && <p className="text-xs">בעלים מתועד: <strong>{review.legalOwnerName}</strong> · {review.status === 'document_verified' ? 'אומת ידנית לפי מסמך' : 'ממתין לאימות'}</p>}
    {review?.titleReference && <p className="text-xs">מסמך / חלקה: {review.titleReference}</p>}
    {review?.decisionMakerName && <p className="text-xs">איש קשר להחלטה: {review.decisionMakerName} {review.decisionMakerRole}</p>}
    {review?.evidenceNote && <p className="text-xs whitespace-pre-wrap">{review.evidenceNote}</p>}
    <p className="text-[11px] text-[#27342F]/65">תפקיד עסקי אינו מאמת בעלות בקרקע או הרשאה להתקנת מערכת.</p>
    <a href={`/admin/scan?focus=${encodeURIComponent(record.candidate_id)}`} className="inline-block text-xs font-semibold text-[#24463E] underline">המשך חקירת הבעלים בכרטיס הגג</a>
  </section>
}
