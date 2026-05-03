"""
scan_all_roofs.py
-----------------
Extracts ALL building footprints from OpenStreetMap for Ko Phangan island,
calculates solar potential for each, and outputs buildings_all.json.

Output: public/data/buildings_all.json
"""

import json
import math
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Dict, List, Optional, Tuple

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

BOUNDING_BOX = "9.66,99.96,9.80,100.08"  # south,west,north,east

OVERPASS_ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://lz4.overpass-api.de/api/interpreter",
    "https://z.overpass-api.de/api/interpreter",
]

# Solar constants (matching solar-calc.ts in the app)
PANEL_AREA_M2 = 2.0          # m² per panel
PANEL_WATT = 550              # W per panel
PERFORMANCE_RATIO = 0.80      # system performance ratio
USABLE_PCT = 0.65             # fraction of roof area usable (obstructions + setbacks)
IRRADIANCE_DAYS = 5.1         # kWh/m²/day for Ko Phangan
TARIFF_THB = 4.50             # THB/kWh (commercial average)
EPC_COST_PER_KWP = 35000      # THB/kWp installation cost

# Filter bounds
MIN_AREA_M2 = 10
MAX_AREA_M2 = 10000

# Existing data source (GitHub Pages – optional enrichment)
EXISTING_DATA_URL = (
    "https://kaniel149.github.io/copenhagen-solar/roof-scanner/buildings_data.js"
)

OUTPUT_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "public", "data", "buildings_all.json",
)

# ---------------------------------------------------------------------------
# OSM Overpass query
# ---------------------------------------------------------------------------

OVERPASS_QUERY = f"""[out:json][timeout:120];
(
  way["building"]({BOUNDING_BOX});
  relation["building"]({BOUNDING_BOX});
);
out body;
>;
out skel qt;
"""


def fetch_overpass(query: str) -> Dict:
    """POST query to Overpass API, trying multiple endpoints."""
    data = urllib.parse.urlencode({"data": query}).encode()
    for endpoint in OVERPASS_ENDPOINTS:
        try:
            print(f"  Trying {endpoint} …")
            req = urllib.request.Request(
                endpoint,
                data=data,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            with urllib.request.urlopen(req, timeout=180) as resp:
                raw = resp.read()
                return json.loads(raw)
        except urllib.error.HTTPError as e:
            print(f"  HTTP {e.code} from {endpoint}: {e.reason}")
        except urllib.error.URLError as e:
            print(f"  URL error from {endpoint}: {e.reason}")
        except Exception as e:
            print(f"  Error from {endpoint}: {e}")
        time.sleep(2)
    raise RuntimeError("All Overpass endpoints failed")


# ---------------------------------------------------------------------------
# Geometry helpers
# ---------------------------------------------------------------------------

def polygon_area_m2(coords: List[List[float]]) -> float:
    """Calculate area in m² from [[lng, lat], ...] polygon using Shoelace formula."""
    n = len(coords)
    if n < 3:
        return 0.0
    center_lat = sum(c[1] for c in coords) / n
    lat_m = 111320.0
    lng_m = 111320.0 * math.cos(math.radians(center_lat))

    area = 0.0
    for i in range(n):
        j = (i + 1) % n
        xi = coords[i][0] * lng_m
        yi = coords[i][1] * lat_m
        xj = coords[j][0] * lng_m
        yj = coords[j][1] * lat_m
        area += xi * yj - xj * yi
    return abs(area) / 2.0


def centroid(coords: List[List[float]]) -> Tuple[float, float]:
    """Return (lat, lng) centroid of a polygon."""
    lat = sum(c[1] for c in coords) / len(coords)
    lng = sum(c[0] for c in coords) / len(coords)
    return lat, lng


# ---------------------------------------------------------------------------
# Solar calculations (mirrors solar-calc.ts logic)
# ---------------------------------------------------------------------------

def calc_solar(area_m2: float) -> Dict[str, Any]:
    usable_area = round(area_m2 * USABLE_PCT, 2)
    panel_count = math.floor(usable_area / PANEL_AREA_M2)
    capacity_kwp = round((panel_count * PANEL_WATT) / 1000.0, 3)
    annual_kwh = round(capacity_kwp * IRRADIANCE_DAYS * 365 * PERFORMANCE_RATIO, 1)
    annual_savings_thb = round(annual_kwh * TARIFF_THB, 0)
    epc_cost = round(capacity_kwp * EPC_COST_PER_KWP, 0)

    # Solar score: based on absolute capacity (kWp).
    # Reference: 20 kWp ≈ score 100 (large commercial rooftop).
    # This produces a realistic distribution:
    # Small homes (<5 kWp): score 25-50, commercial (15+ kWp): score 75-100.
    score = min(100.0, (capacity_kwp / 20.0) * 100.0)
    solar_score = round(score, 1)

    if solar_score >= 70:
        priority = "A"
    elif solar_score >= 50:
        priority = "B"
    elif solar_score >= 30:
        priority = "C"
    else:
        priority = "D"

    return {
        "usableArea": usable_area,
        "panelCount": panel_count,
        "capacityKwp": capacity_kwp,
        "annualKwh": annual_kwh,
        "annualSavingsTHB": int(annual_savings_thb),
        "epcCost": int(epc_cost),
        "solarScore": solar_score,
        "priority": priority,
    }


# ---------------------------------------------------------------------------
# Category detection from OSM tags
# ---------------------------------------------------------------------------

CATEGORY_MAP = [
    (["hotel", "motel", "hostel", "guest_house", "resort"], "hospitality"),
    (["restaurant", "cafe", "bar", "fast_food", "food_court", "pub"], "food_beverage"),
    (["supermarket", "convenience", "mall", "shop", "retail", "kiosk", "marketplace"], "retail"),
    (["school", "university", "college", "kindergarten", "library", "education"], "education"),
    (["hospital", "clinic", "doctors", "pharmacy", "health"], "healthcare"),
    (["industrial", "warehouse", "factory", "shed", "storage"], "industrial"),
    (["commercial", "office", "bank", "bureau_de_change"], "commercial"),
    (["temple", "church", "mosque", "shrine", "place_of_worship", "chapel"], "religious"),
    (["government", "public", "community_centre", "post_office", "fire_station", "police"], "government"),
    (["apartments", "residential", "house", "detached", "semidetached_house", "terrace",
      "bungalow", "cabin", "dormitory"], "residential"),
]


def detect_category(tags: Dict[str, str]) -> str:
    """Determine building category from OSM tags."""
    combined = " ".join([
        tags.get("building", ""),
        tags.get("amenity", ""),
        tags.get("shop", ""),
        tags.get("tourism", ""),
        tags.get("landuse", ""),
        tags.get("leisure", ""),
    ]).lower()

    for keywords, category in CATEGORY_MAP:
        if any(kw in combined for kw in keywords):
            return category

    # Default: if building=yes or building=* without match
    return "residential"  # majority of unknown buildings on Ko Phangan are residential


def extract_name(tags: Dict[str, str]) -> str:
    """Extract best available name from OSM tags."""
    for key in ("name:en", "name", "name:th", "brand", "operator"):
        val = tags.get(key, "").strip()
        if val:
            return val
    return ""


# ---------------------------------------------------------------------------
# Load existing buildings for enrichment
# ---------------------------------------------------------------------------

def load_existing_buildings() -> Dict[int, Dict]:
    """Download the existing buildings_data.js and index by OSM ID."""
    print("Loading existing buildings data for enrichment …")
    try:
        req = urllib.request.Request(
            EXISTING_DATA_URL,
            headers={"User-Agent": "solar-intelligence-scanner/1.0"},
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            js_text = resp.read().decode("utf-8")
    except Exception as e:
        print(f"  Could not load existing data ({e}), skipping enrichment")
        return {}

    json_start = js_text.find("[")
    json_end = js_text.rfind("]")
    if json_start == -1 or json_end == -1:
        print("  Could not parse existing buildings JS, skipping enrichment")
        return {}

    try:
        buildings = json.loads(js_text[json_start : json_end + 1])
    except json.JSONDecodeError as e:
        print(f"  JSON parse error: {e}, skipping enrichment")
        return {}

    index: Dict[int, Dict] = {}
    for b in buildings:
        osm_id = b.get("i")
        if osm_id is not None:
            index[int(osm_id)] = b

    print(f"  Loaded {len(index):,} existing buildings for enrichment")
    return index


# ---------------------------------------------------------------------------
# Main pipeline
# ---------------------------------------------------------------------------

def build_property(
    osm_id: int,
    tags: Dict[str, str],
    coords: List[List[float]],
    existing: Dict[int, Dict],
) -> Optional[Dict[str, Any]]:
    """Convert OSM building to a property record. Returns None if filtered out."""
    if len(coords) < 3:
        return None

    area = polygon_area_m2(coords)
    if area < MIN_AREA_M2 or area > MAX_AREA_M2:
        return None

    lat, lng = centroid(coords)
    solar = calc_solar(area)
    category = detect_category(tags)
    name = extract_name(tags)

    # Try to enrich from existing dataset
    ex = existing.get(osm_id, {})

    record: Dict[str, Any] = {
        "id": f"roof_{osm_id}",
        "type": "roof",
        "status": "private",
        "region": "koh_phangan",
        "title": name or ex.get("n") or "Unknown Building",
        "location": "Ko Phangan",
        "lat": round(lat, 7),
        "lng": round(lng, 7),
        "area": round(area, 1),
        "usableArea": solar["usableArea"],
        "capacityKwp": solar["capacityKwp"],
        "panelCount": solar["panelCount"],
        "annualKwh": solar["annualKwh"],
        "annualSavings": solar["annualSavingsTHB"],
        "epcCost": solar["epcCost"],
        "solarScore": solar["solarScore"],
        "priority": solar["priority"],
        "category": category,
        # Enrich from existing data if available
        "phone": ex.get("ph") or None,
        "website": ex.get("w") or None,
        "email": ex.get("em") or None,
        # OSM metadata
        "_osmId": osm_id,
        "_osmTags": {k: v for k, v in tags.items() if k not in ("building",)},
    }

    # Remove None values for cleaner output
    record = {k: v for k, v in record.items() if v is not None}

    return record


def main():
    print("=" * 60)
    print("Bustan Energy Roof Scanner")
    print("=" * 60)

    # Step 1: Load existing buildings for enrichment
    existing = load_existing_buildings()

    # Step 2: Query Overpass API
    print(f"\nQuerying Overpass API for buildings in {BOUNDING_BOX} …")
    osm_data = fetch_overpass(OVERPASS_QUERY)

    elements = osm_data.get("elements", [])
    print(f"  Received {len(elements):,} OSM elements")

    # Step 3: Build node lookup map (node id → [lng, lat])
    print("Building node coordinate lookup …")
    node_coords: Dict[int, List[float]] = {}
    ways: List[Dict] = []
    relations: List[Dict] = []

    for el in elements:
        etype = el.get("type")
        if etype == "node":
            node_coords[el["id"]] = [el["lon"], el["lat"]]
        elif etype == "way":
            ways.append(el)
        elif etype == "relation":
            relations.append(el)

    print(f"  Nodes: {len(node_coords):,}  Ways: {len(ways):,}  Relations: {len(relations):,}")

    # Build a way_id → coords lookup for relations
    way_lookup: Dict[int, List[List[float]]] = {}
    for way in ways:
        wid = way["id"]
        coords = [node_coords[n] for n in way.get("nodes", []) if n in node_coords]
        way_lookup[wid] = coords

    # Step 4: Process ways (buildings)
    print("\nProcessing building footprints …")
    properties: List[Dict[str, Any]] = []
    filtered_small = 0
    filtered_large = 0
    filtered_no_coords = 0
    processed_count = 0

    all_buildings = list(ways) + list(relations)

    for idx, el in enumerate(all_buildings):
        if idx > 0 and idx % 500 == 0:
            print(f"  … {idx:,}/{len(all_buildings):,} processed ({len(properties):,} kept)")

        # Only process elements tagged as buildings
        tags = el.get("tags", {})
        if not tags.get("building"):
            continue

        osm_id = el["id"]
        etype = el["type"]

        # Get polygon coordinates
        if etype == "way":
            node_ids = el.get("nodes", [])
            coords = [node_coords[n] for n in node_ids if n in node_coords]
        elif etype == "relation":
            # Use the outer ring of the first member way
            coords = []
            for member in el.get("members", []):
                if member.get("type") == "way" and member.get("role") in ("outer", ""):
                    wid = member.get("ref")
                    if wid and wid in way_lookup:
                        coords = way_lookup[wid]
                        break
        else:
            continue

        if len(coords) < 3:
            filtered_no_coords += 1
            continue

        area = polygon_area_m2(coords)
        if area < MIN_AREA_M2:
            filtered_small += 1
            continue
        if area > MAX_AREA_M2:
            filtered_large += 1
            continue

        prop = build_property(osm_id, tags, coords, existing)
        if prop:
            properties.append(prop)
            processed_count += 1

    print(f"\n  Total kept:         {len(properties):,}")
    print(f"  Filtered (small):   {filtered_small:,}")
    print(f"  Filtered (large):   {filtered_large:,}")
    print(f"  Filtered (no geo):  {filtered_no_coords:,}")

    # Step 5: Statistics
    print("\n--- Priority breakdown ---")
    priority_counts: Dict[str, int] = {"A": 0, "B": 0, "C": 0, "D": 0}
    for p in properties:
        priority_counts[p.get("priority", "D")] += 1
    for grade, count in sorted(priority_counts.items()):
        pct = count / max(len(properties), 1) * 100
        print(f"  {grade}: {count:,} ({pct:.1f}%)")

    print("\n--- Category breakdown ---")
    category_counts: Dict[str, int] = {}
    for p in properties:
        cat = p.get("category", "unknown")
        category_counts[cat] = category_counts.get(cat, 0) + 1
    for cat, count in sorted(category_counts.items(), key=lambda x: -x[1]):
        pct = count / max(len(properties), 1) * 100
        print(f"  {cat}: {count:,} ({pct:.1f}%)")

    # Enrichment stats
    enriched = sum(1 for p in properties if p.get("phone") or p.get("website"))
    print(f"\n  Enriched from existing data: {enriched:,} buildings")

    # Step 6: Write output
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(properties, f, ensure_ascii=False, separators=(",", ":"))

    size_kb = os.path.getsize(OUTPUT_PATH) / 1024
    print(f"\nOutput written: {OUTPUT_PATH}")
    print(f"  File size: {size_kb:.1f} KB")
    print(f"  Buildings: {len(properties):,}")

    # Capacity summary
    total_kwp = sum(p.get("capacityKwp", 0) for p in properties)
    total_kwh = sum(p.get("annualKwh", 0) for p in properties)
    total_savings = sum(p.get("annualSavings", 0) for p in properties)
    print(f"\n--- Island-wide solar potential ---")
    print(f"  Total capacity: {total_kwp:,.1f} kWp")
    print(f"  Annual generation: {total_kwh:,.0f} kWh/yr")
    print(f"  Annual savings: {total_savings:,.0f} THB/yr")
    print(f"  (≈ {total_kwh / 1_000_000:.2f} GWh/yr)")

    print("\nDone.")


if __name__ == "__main__":
    main()
