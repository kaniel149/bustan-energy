#!/usr/bin/env python3
"""
download_osm_buildings.py — Download Ko Samui building footprints from OpenStreetMap (free)

Uses the Overpass API (no API key required).  The query uses `out geom` so that
polygon coordinates are embedded directly in each element — no secondary node
lookup needed.  The bounding box is split into a 3×3 grid to keep each sub-tile
request fast enough to avoid Overpass 504 timeouts.

Usage:
    python scripts/download_osm_buildings.py
Output:
    scripts/osm_samui_buildings.json
"""

import json
import math
import random
import string
import sys
import time
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import requests

# ═══════════════════════════════════════════════════════
# Configuration
# ═══════════════════════════════════════════════════════

OUTPUT_FILE = Path(__file__).resolve().parent / "osm_samui_buildings.json"

# Primary and fallback Overpass mirrors
OVERPASS_MIRRORS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
]

# Ko Samui bounding box: (south, west, north, east)
BBOX = (9.42, 99.90, 9.58, 100.10)

REGION = "koh_samui"
LOCATION_LABEL = "Koh Samui"

# Solar calculation constants (matching existing platform values)
USABLE_RATIO = 0.65        # usableArea = area * 0.65
EFFICIENCY_KWP = 0.18      # kWp per m² of usable area
PANEL_WATT_PEAK = 550      # Each panel is 550Wp
PEAK_SUN_HOURS = 4.8       # Thailand average
PERFORMANCE_RATIO = 0.80   # System losses
THB_PER_KWH = 4.5          # THB electricity rate
COST_PER_KWP = 32_000      # THB per kWp installed

# ═══════════════════════════════════════════════════════
# OSM building type → platform category mapping
# ═══════════════════════════════════════════════════════

CATEGORY_MAP: Dict[str, str] = {
    "hotel": "hospitality",
    "hostel": "hospitality",
    "motel": "hospitality",
    "resort": "hospitality",
    "guest_house": "hospitality",
    "commercial": "commercial",
    "office": "commercial",
    "retail": "commercial",
    "supermarket": "commercial",
    "shop": "commercial",
    "mall": "commercial",
    "marketplace": "commercial",
    "store": "commercial",
    "public": "commercial",
    "civic": "commercial",
    "government": "commercial",
    "service": "commercial",
    "transportation": "commercial",
    "parking": "commercial",
    "sports_hall": "commercial",
    "stadium": "commercial",
    "residential": "residential",
    "house": "residential",
    "apartments": "residential",
    "apartment": "residential",
    "detached": "residential",
    "semidetached_house": "residential",
    "terrace": "residential",
    "bungalow": "residential",
    "dormitory": "residential",
    "yes": "residential",
    "roof": "residential",
    "construction": "residential",
    "industrial": "industrial",
    "warehouse": "industrial",
    "factory": "industrial",
    "shed": "industrial",
    "garage": "industrial",
    "school": "education",
    "university": "education",
    "college": "education",
    "kindergarten": "education",
    "hospital": "health",
    "clinic": "health",
    "pharmacy": "health",
    "temple": "temple",
    "church": "temple",
    "mosque": "temple",
    "shrine": "temple",
    "cathedral": "temple",
    "chapel": "temple",
    "restaurant": "restaurant",
    "cafe": "restaurant",
    "bar": "restaurant",
    "fast_food": "restaurant",
    "food_court": "restaurant",
}

DEFAULT_CATEGORY = "residential"


# ═══════════════════════════════════════════════════════
# Utilities
# ═══════════════════════════════════════════════════════

def random_id() -> str:
    """roof_<8hex>-<4hex>-<4hex>-<1digit>  (matches existing platform format)"""
    h = string.hexdigits[:16]
    s1 = "".join(random.choices(h, k=8))
    s2 = "".join(random.choices(h, k=4))
    s3 = "".join(random.choices(h, k=4))
    return f"roof_{s1}-{s2}-{s3}-{random.randint(0, 9)}"


def shoelace_area_m2(geom: List[Dict]) -> float:
    """
    Area in m² from an Overpass `geometry` list of {lat, lon} dicts.
    Uses the Shoelace formula on a local equirectangular projection.
    """
    coords = [(g["lat"], g["lon"]) for g in geom]
    if len(coords) < 3:
        return 0.0

    avg_lat = sum(c[0] for c in coords) / len(coords)
    lat_m = 111_320.0
    lng_m = 111_320.0 * math.cos(math.radians(avg_lat))

    pts = [(c[1] * lng_m, c[0] * lat_m) for c in coords]
    n = len(pts)
    area = 0.0
    for i in range(n):
        x1, y1 = pts[i]
        x2, y2 = pts[(i + 1) % n]
        area += x1 * y2 - x2 * y1
    return abs(area) / 2.0


def centroid_from_geom(geom: List[Dict]) -> Tuple[float, float]:
    lat = sum(g["lat"] for g in geom) / len(geom)
    lng = sum(g["lon"] for g in geom) / len(geom)
    return lat, lng


def solar_score(kwp: float) -> int:
    if kwp >= 200: return 95
    if kwp >= 100: return 85
    if kwp >= 50:  return 75
    if kwp >= 20:  return 60
    if kwp >= 10:  return 50
    if kwp >= 5:   return 40
    if kwp >= 2:   return 30
    return 20


def priority(kwp: float) -> str:
    if kwp >= 50: return "A"
    if kwp >= 20: return "B"
    if kwp >= 5:  return "C"
    return "D"


def get_category(osm_tag: str) -> str:
    return CATEGORY_MAP.get((osm_tag or "yes").strip().lower(), DEFAULT_CATEGORY)


def build_record(el: Dict) -> Optional[Dict]:
    """Convert a single Overpass element (with embedded geometry) to a platform record."""
    geom = el.get("geometry", [])
    if len(geom) < 3:
        return None

    area = shoelace_area_m2(geom)
    if area < 5:        # Skip tiny artefacts
        return None

    tags = el.get("tags", {})
    lat, lng = centroid_from_geom(geom)

    usable = round(area * USABLE_RATIO, 1)
    kwp = round(usable * EFFICIENCY_KWP, 2)
    panels = max(1, round(kwp * 1000 / PANEL_WATT_PEAK))
    annual_kwh = round(kwp * PEAK_SUN_HOURS * 365 * PERFORMANCE_RATIO, 1)
    savings = round(annual_kwh * THB_PER_KWH)
    epc_cost = round(kwp * COST_PER_KWP / 1000) * 1000

    name = (
        tags.get("name:en")
        or tags.get("name")
        or tags.get("name:th")
        or None
    )
    building_tag = tags.get("building", "yes")
    category = get_category(building_tag)
    title = name if name else f"Building ({round(area)}m²)"

    osm_type = el.get("type", "way")
    osm_id = el.get("id", 0)

    # Footprint polygon (GeoJSON ring, [lng,lat], closed) — surfaced as a
    # reviewable roof candidate on the /platform map (P3).
    ring = [[round(pt["lon"], 7), round(pt["lat"], 7)] for pt in geom if "lon" in pt and "lat" in pt]
    if len(ring) >= 3 and ring[0] != ring[-1]:
        ring.append(ring[0])
    roof_geom = {"type": "Polygon", "coordinates": [ring]} if len(ring) >= 4 else None

    return {
        "id": random_id(),
        "osmId": f"{osm_type}/{osm_id}",
        "type": "roof",
        "status": "private",
        "region": REGION,
        "title": title,
        "location": LOCATION_LABEL,
        "lat": round(lat, 7),
        "lng": round(lng, 7),
        "area": round(area, 1),
        "roofGeom": roof_geom,
        "usableArea": usable,
        "capacityKwp": kwp,
        "panelCount": panels,
        "annualKwh": annual_kwh,
        "annualSavings": savings,
        "epcCost": epc_cost,
        "solarScore": solar_score(kwp),
        "priority": priority(kwp),
        "category": category,
    }


# ═══════════════════════════════════════════════════════
# Overpass API
# ═══════════════════════════════════════════════════════

def overpass_query(query: str, description: str) -> Optional[dict]:
    """POST to Overpass, trying multiple mirrors with retry."""
    headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "SolarIntelligence/1.0 (solar intelligence platform; educational use)",
    }
    for mirror in OVERPASS_MIRRORS:
        host = mirror.split("/")[2]
        for attempt in range(1, 3):
            try:
                print(f"  [{host}] attempt {attempt}: {description}", flush=True)
                resp = requests.post(
                    mirror,
                    data={"data": query},
                    headers=headers,
                    timeout=180,
                )
                resp.raise_for_status()
                return resp.json()
            except requests.exceptions.Timeout:
                print(f"  Timeout. Waiting 10s...")
                time.sleep(10)
            except requests.exceptions.HTTPError as e:
                code = e.response.status_code
                snippet = e.response.text[:100].replace("\n", " ")
                print(f"  HTTP {code}: {snippet}")
                if code == 429:
                    print("  Rate limited — sleeping 30s...")
                    time.sleep(30)
                else:
                    break   # Non-retryable — try next mirror
            except Exception as e:
                print(f"  Error: {e}")
                break
    print("  All mirrors failed.")
    return None


def split_bbox(bbox: Tuple, grid: int = 3) -> List[Tuple]:
    """Split bbox into grid×grid sub-tiles."""
    south, west, north, east = bbox
    lat_step = (north - south) / grid
    lng_step = (east - west) / grid
    tiles = []
    for row in range(grid):
        for col in range(grid):
            s = round(south + row * lat_step, 6)
            n = round(s + lat_step, 6)
            w = round(west + col * lng_step, 6)
            e = round(w + lng_step, 6)
            tiles.append((s, w, n, e))
    return tiles


def fetch_tile(bbox: Tuple) -> Optional[dict]:
    """
    Fetch all building ways + relations in one Overpass call using `out geom`
    (geometry embedded per element — no secondary node lookup).
    """
    south, west, north, east = bbox
    query = (
        f"[out:json][timeout:180];\n"
        f"(\n"
        f'  way["building"]({south},{west},{north},{east});\n'
        f'  relation["building"]({south},{west},{north},{east});\n'
        f");\n"
        f"out geom;"
    )
    label = f"({south:.4f},{west:.4f}→{north:.4f},{east:.4f})"
    return overpass_query(query, label)


# ═══════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════

def print_stats(records: List[Dict]) -> None:
    total = len(records)
    if not total:
        print("  No buildings found.")
        return

    priorities: Dict[str, int] = {"A": 0, "B": 0, "C": 0, "D": 0}
    categories: Dict[str, int] = {}
    total_kwp = 0.0
    total_area = 0.0
    named = 0

    for r in records:
        priorities[r["priority"]] = priorities.get(r["priority"], 0) + 1
        categories[r["category"]] = categories.get(r["category"], 0) + 1
        total_kwp += r["capacityKwp"]
        total_area += r["area"]
        if not r["title"].startswith("Building ("):
            named += 1

    print(f"  Total buildings:     {total:,}")
    print(f"  Named buildings:     {named:,}")
    print(f"  Total roof area:     {total_area:,.0f} m²")
    print(f"  Total capacity:      {total_kwp:,.1f} kWp")
    print(f"  Average capacity:    {total_kwp / total:.1f} kWp/building")
    print()
    print("  Priority breakdown:")
    for p in ("A", "B", "C", "D"):
        pct = priorities[p] / total * 100
        print(f"    {p}: {priorities[p]:>6,}  ({pct:.1f}%)")
    print()
    print("  Category breakdown:")
    for cat, count in sorted(categories.items(), key=lambda x: -x[1]):
        pct = count / total * 100
        print(f"    {cat:<15} {count:>6,}  ({pct:.1f}%)")


def main():
    print("=" * 60)
    print("  Ko Samui OSM Building Downloader")
    print(f"  Bounding box: {BBOX}")
    print(f"  Output: {OUTPUT_FILE}")
    print("=" * 60)

    tiles = split_bbox(BBOX, grid=3)
    print(f"\n  Strategy: {len(tiles)} sub-tiles (3x3 grid), combined way+relation query")
    print(f"  Geometry embedded via 'out geom' — no node lookup needed\n")

    seen_osm_ids: set = set()
    all_records: List[Dict] = []

    for idx, tile in enumerate(tiles, start=1):
        print(f"\n--- Tile {idx}/{len(tiles)}: {tile} ---")

        response = fetch_tile(tile)
        if response is None:
            print("  Fetch failed — skipping tile.")
            continue

        elements = response.get("elements", [])
        print(f"  Raw elements: {len(elements)}")

        added = 0
        skipped_dup = 0
        skipped_small = 0

        for el in elements:
            osm_type = el.get("type", "")
            if osm_type not in ("way", "relation"):
                continue
            tags = el.get("tags", {})
            if "building" not in tags:
                continue

            osm_key = f"{osm_type}/{el.get('id', 0)}"
            if osm_key in seen_osm_ids:
                skipped_dup += 1
                continue

            rec = build_record(el)
            if rec is None:
                skipped_small += 1
                continue

            seen_osm_ids.add(osm_key)
            all_records.append(rec)
            added += 1

        print(f"  Added: {added}  |  Duplicates skipped: {skipped_dup}  |  Too small: {skipped_small}")

        if idx < len(tiles):
            time.sleep(2)   # Polite pause between tile requests

    # Write output
    print("\n" + "=" * 60)
    print("  FINAL STATS")
    print("=" * 60)
    print_stats(all_records)

    if not all_records:
        print("\n  Nothing to save. Check Overpass connectivity.")
        sys.exit(1)

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(all_records, f, ensure_ascii=False, indent=2)

    print(f"\n  Saved {len(all_records):,} buildings to:")
    print(f"  {OUTPUT_FILE}")
    print("=" * 60)


if __name__ == "__main__":
    main()
