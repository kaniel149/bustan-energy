import { SUPPLIER_PRICES, SUPPLIER_PRICE_CAPTURED_AT, type SupplierPrice } from '../data/supplier-prices.js'

export type SupplierPriceStatus = 'live' | 'expired' | 'benchmark'

export interface ResolvedSupplierPrice {
  unit_price_thb: number
  benchmark_unit_price_thb: number
  price_status: SupplierPriceStatus
  supplier_name?: string
  supplier_source?: string
  supplier_sku?: string
  supplier_url?: string
  supplier_valid_until?: string
  supplier_price_name?: string
  price_note?: string
}

export interface SupplierSkuMatch {
  sku: string
  note?: string
}

const PRICE_BY_SKU = new Map(SUPPLIER_PRICES.map((price) => [price.sku.toLowerCase(), price]))

export const BOM_TO_SUPPLIER_SKU: Record<string, SupplierSkuMatch> = {
  JA_JAM72S30_555: { sku: 'JA-Solar-JAM72S30-555-MR' },
  JA_JAM72D42_650_LB: { sku: 'JA-Solar-JAM72D42-650-LB' },
  Huawei_SUN2000_50K_MC0: { sku: 'Huawei-SUN2000-50K-MC0-5Y' },
  Huawei_Smart_Dongle_WLAN_FE: { sku: 'Huawei-Smart-Dongle-WLAN-FE-A-05-APSTA' },
  Huawei_DDSU666_H_smart_meter: {
    sku: 'Huawei-DTSU666-H_2',
    note: 'Commercial 3-phase monitoring match from Integra catalog',
  },
  'Antal_Rail_4.4m': {
    sku: 'ANTAI-RAIL-4200',
    note: 'Closest supplier rail length is 4.2m; verify layout before PO',
  },
  Trapezoidal_Clamp_metal_roof: {
    sku: 'ANTAI-L-FEET-85-KLIPLOK',
    note: 'Metal roof Kliplok foot used as supplier equivalent; verify roof profile',
  },
  Mid_Clamp_35_40mm: { sku: 'ANTAI-MID-CLAMP-35' },
  End_Clamp_35_40mm: { sku: 'ANTAI-END-CLAMP-35' },
  Rail_Splice_Kit: { sku: 'ANTAI-RAIL-SPLICE' },
  DC_Fuse_15A_1100V: {
    sku: 'BENY-BR-30',
    note: 'Supplier fuse holder is 20-30A; confirm exact fuse insert rating',
  },
  DC_Fuse_15A_1100V_spare: {
    sku: 'BENY-BR-30',
    note: 'Supplier fuse holder is 20-30A; confirm exact fuse insert rating',
  },
}

const FALLBACK_SUPPLIERS_BY_CATEGORY: Record<string, string> = {
  '1. PV Modules': 'Integra Renewable Energy',
  '2. Mounting': 'QES / Antai',
  '3. DC Side': 'QES / BENY',
  '4. AC Side': 'Benchmark - confirm supplier',
  '5. Grounding & Lightning': 'Benchmark - confirm supplier',
  '6. Monitoring': 'Integra Renewable Energy',
  '7. Labels & Safety': 'Benchmark - confirm supplier',
  '8. Consumables': 'Benchmark - confirm supplier',
  Battery: 'Integra Renewable Energy',
  Inverters: 'Integra Renewable Energy',
}

function todayIsoDate(now = new Date()): string {
  return now.toISOString().slice(0, 10)
}

export function isSupplierPriceExpired(price: SupplierPrice, now = new Date()): boolean {
  return Boolean(price.valid_until && price.valid_until < todayIsoDate(now))
}

export function getSupplierPriceBySku(sku: string): SupplierPrice | undefined {
  return PRICE_BY_SKU.get(sku.toLowerCase())
}

export function preferredSupplierForCategory(category: string): string {
  return FALLBACK_SUPPLIERS_BY_CATEGORY[category] || 'Benchmark - confirm supplier'
}

export function resolveSupplierPrice(
  bomSku: string,
  category: string,
  benchmarkUnitPriceThb: number,
  now = new Date(),
): ResolvedSupplierPrice {
  const match = BOM_TO_SUPPLIER_SKU[bomSku]
  const supplierPrice = match ? getSupplierPriceBySku(match.sku) : getSupplierPriceBySku(bomSku)

  if (!supplierPrice) {
    return {
      unit_price_thb: benchmarkUnitPriceThb,
      benchmark_unit_price_thb: benchmarkUnitPriceThb,
      price_status: 'benchmark',
      supplier_name: preferredSupplierForCategory(category),
      price_note: 'No supplier catalog match yet; using internal benchmark price',
    }
  }

  const expired = isSupplierPriceExpired(supplierPrice, now)
  const notes = [match?.note, supplierPrice.notes].filter(Boolean).join(' · ')

  return {
    unit_price_thb: supplierPrice.cost_thb,
    benchmark_unit_price_thb: benchmarkUnitPriceThb,
    price_status: expired ? 'expired' : 'live',
    supplier_name: supplierPrice.supplier,
    supplier_source: supplierPrice.source,
    supplier_sku: supplierPrice.sku,
    supplier_url: supplierPrice.url,
    supplier_valid_until: supplierPrice.valid_until,
    supplier_price_name: supplierPrice.name,
    price_note: notes || undefined,
  }
}

export function supplierCatalogStats(now = new Date()) {
  const expired = SUPPLIER_PRICES.filter((price) => isSupplierPriceExpired(price, now)).length
  return {
    captured_at: SUPPLIER_PRICE_CAPTURED_AT,
    total_items: SUPPLIER_PRICES.length,
    live_items: SUPPLIER_PRICES.length - expired,
    expired_items: expired,
  }
}
