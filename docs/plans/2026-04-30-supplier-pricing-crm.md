# Supplier Pricing + CRM Proposal Builder Plan

## Goal

Use supplier price inputs as the costing backbone for TM Energy proposals, BOM, and procurement. The proposal generator should keep its current admin design language, while exposing enough price provenance for operations to know what can be trusted and what must be reconfirmed before PO.

## Implemented Now

- Added a supplier catalog in `src/data/supplier-prices.ts` from QES PDF and Integra portal capture.
- Added supplier price resolution in `src/lib/supplier-pricing.ts`.
- Connected `/api/admin-bom` to resolve BOM rows against supplier prices before falling back to benchmark prices.
- Added row-level supplier fields: supplier, supplier SKU, source, validity date, status, benchmark price, and notes.
- Added BOM supplier summary: live rows, expired rows, benchmark rows, catalog item count, supplier materials total, benchmark materials total.
- Updated the internal BOM screen to show supplier status and to group by actual supplier.
- Updated the new proposal auto-price action to show whether the BOM cost came from live supplier prices, expired prices, or benchmark prices.
- Added `/admin/suppliers` for supplier catalog visibility, expiry filtering, and BOM-to-supplier mappings.
- Stored BOM pricing snapshots in proposal metadata and procurement `price_snapshot`.
- Added a proposal creation warning when the latest BOM contains expired supplier prices or benchmark rows.
- Added PEA readiness checks and made PEA documents explicitly preliminary until owner documents and licensed engineer approval are attached.

## Current Price Rules

- `live`: supplier price is matched and still valid as of the current date.
- `expired`: supplier price is matched but valid_until is before the current date.
- `benchmark`: no reliable supplier match yet; internal template benchmark is used.

QES prices from `QES_Price_list_March.pdf` are marked expired because the PDF is valid until 2026-03-31. Integra prices captured from the portal are valid through 2026-04-30.

## Next Improvements

1. Supplier admin screen
   - Add upload/review flows for CSV/PDF extracts. The visibility page exists; editing and approval workflow are still next.

2. Mapping approval workflow
   - Add an approval flag per BOM-to-supplier mapping so substitutions like roof feet, rails, and smart meters can be signed off once and reused safely.

3. Procurement snapshots
   - Store the exact supplier price snapshot on `procurement_orders` so every PO has an audit trail of the prices used at creation time.

4. CRM feedback loop
   - Show proposal gross margin and supplier confidence on proposal detail and lead detail pages.
   - Warn before sending proposals when too many rows are benchmark or expired.

5. Supplier refresh automation
   - Add a scheduled refresh/check for Integra portal pricing and a reminder when QES PDF pricing expires.

## PEA Readiness Notes

PEA package generation is now treated as a preliminary engineering package. The app checks and flags:

- Owner ID/passport, house registration, and power of attorney/consent when the applicant is not the registered owner.
- Inverter/product certificate evidence and PEA/authority acceptance.
- 1,000 kWp generation-license threshold.
- 200 kVA total inverter threshold for controlled energy production license review.
- Roof area/load thresholds of 160 m2 and 20 kg/m2 for local building permit/notification handling.
- Export/buyback as subject to active PEA/ERC program approval, not assumed.
- Licensed engineer review/stamp before submission.

References used:

- PEA Solar FAQ: https://peasolar.pea.co.th/faq/
- PEA Smart List documents: https://smartlist.pea.co.th/documents
- PEA PPIM residential solar project: https://ppim.pea.co.th/project/solar/detail/62885d055bdc7f264c5edcdd/
- PEA/VST engineering-certification notice: https://www.pea.co.th/news/corporate-news/1573
