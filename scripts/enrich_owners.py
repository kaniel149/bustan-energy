#!/usr/bin/env python3
"""
enrich_owners.py — Find building owners via Overture cross-reference + Google Places

1. Match buildings to Overture data by proximity (name, class, subtype)
2. For Grade A/B buildings, query Google Places API for nearby businesses
3. Update buildings_validated.json with owner info
"""

import json
import math
import os
import sys
import time
from collections import defaultdict
from pathlib import Path
from typing import List, Dict, Tuple, Optional

import requests

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "public" / "data"
BUILDINGS_FILE = DATA_DIR / "buildings_validated.json"
OVERTURE_FILE = DATA_DIR / "overture_buildings.geojson"

GOOGLE_PLACES_API_KEY = os.environ.get("GOOGLE_PLACES_API_KEY", "")
MATCH_DISTANCE_M = 20  # Max distance for Overture match
PLACES_RADIUS_M = 30   # Google Places search radius
RATE_LIMIT_DELAY = 0.1  # Seconds between API calls


def haversine_m(lat1, lng1, lat2, lng2):
    R = 6371000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def load_overture():
    """Load Overture buildings and index by grid."""
    if not OVERTURE_FILE.exists():
        print("  No Overture data found, skipping")
        return {}, []

    with open(OVERTURE_FILE) as f:
        data = json.load(f)

    features = data.get("features", [])
    print(f"  Overture: {len(features)} buildings loaded")

    # Build spatial grid index
    grid = defaultdict(list)
    grid_step = 0.0003
    named_count = 0

    for feat in features:
        props = feat["properties"]
        lat = props.get("lat")
        lng = props.get("lng")
        if lat is None or lng is None:
            # Try geometry
            geom = feat.get("geometry", {})
            if geom.get("type") == "Point":
                lng, lat = geom["coordinates"]
            elif geom.get("type") == "Polygon":
                coords = geom["coordinates"][0]
                lng = sum(c[0] for c in coords) / len(coords)
                lat = sum(c[1] for c in coords) / len(coords)
            else:
                continue

        entry = {
            "lat": lat,
            "lng": lng,
            "name": props.get("names.primary"),
            "class": props.get("class"),
            "subtype": props.get("subtype"),
            "height": props.get("height"),
            "floors": props.get("num_floors"),
        }

        if entry["name"]:
            named_count += 1

        gx = int(lng / grid_step)
        gy = int(lat / grid_step)
        grid[f"{gx},{gy}"].append(entry)

    print(f"  Overture with names: {named_count}")
    return grid, features


def match_overture(buildings, overture_grid):
    """Match buildings to nearest Overture entry."""
    print("\n=== Phase 1: Overture Cross-Reference ===")
    matched = 0
    named = 0
    categorized = 0
    grid_step = 0.0003

    for b in buildings:
        gx = int(b["lng"] / grid_step)
        gy = int(b["lat"] / grid_step)

        best_dist = MATCH_DISTANCE_M
        best_match = None

        for dx in [-1, 0, 1]:
            for dy in [-1, 0, 1]:
                key = f"{gx + dx},{gy + dy}"
                for ov in overture_grid.get(key, []):
                    dist = haversine_m(b["lat"], b["lng"], ov["lat"], ov["lng"])
                    if dist < best_dist:
                        best_dist = dist
                        best_match = ov

        if best_match:
            matched += 1
            if best_match["name"] and not b.get("ownerName"):
                b["ownerName"] = best_match["name"]
                b["title"] = best_match["name"]
                named += 1

            if best_match["subtype"] and not b.get("category"):
                b["category"] = best_match["subtype"]
                categorized += 1
            elif best_match["class"] and not b.get("category"):
                b["category"] = best_match["class"]
                categorized += 1

    print(f"  Matched: {matched}")
    print(f"  Names added: {named}")
    print(f"  Categories added: {categorized}")
    return buildings


def enrich_with_google_places(buildings, max_queries=500):
    """Query Google Places Nearby Search for Grade A/B buildings without owners."""
    if not GOOGLE_PLACES_API_KEY:
        print("\n=== Phase 2: Google Places (SKIPPED — no API key) ===")
        print("  Set GOOGLE_PLACES_API_KEY env var to enable")
        return buildings

    print(f"\n=== Phase 2: Google Places Enrichment ===")

    # Filter to A/B grade without owner
    targets = [b for b in buildings
                if b.get("priority") in ("A", "B")
                and not b.get("ownerName")]

    print(f"  Grade A/B without owner: {len(targets)}")
    print(f"  Max queries: {max_queries}")

    session = requests.Session()
    enriched = 0
    errors = 0

    for i, b in enumerate(targets[:max_queries]):
        if i % 50 == 0 and i > 0:
            print(f"  ... {i}/{min(len(targets), max_queries)} ({enriched} enriched)")

        try:
            url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
            params = {
                "location": f"{b['lat']},{b['lng']}",
                "radius": PLACES_RADIUS_M,
                "key": GOOGLE_PLACES_API_KEY,
            }
            resp = session.get(url, params=params, timeout=10)
            resp.raise_for_status()
            data = resp.json()

            results = data.get("results", [])
            if results:
                place = results[0]  # Closest/most relevant
                name = place.get("name")
                if name:
                    b["ownerName"] = name
                    b["title"] = name
                    enriched += 1

                    # Get details for phone number
                    place_id = place.get("place_id")
                    if place_id:
                        detail_url = "https://maps.googleapis.com/maps/api/place/details/json"
                        detail_params = {
                            "place_id": place_id,
                            "fields": "formatted_phone_number,website,type",
                            "key": GOOGLE_PLACES_API_KEY,
                        }
                        detail_resp = session.get(detail_url, params=detail_params, timeout=10)
                        if detail_resp.ok:
                            detail = detail_resp.json().get("result", {})
                            if detail.get("formatted_phone_number"):
                                b["phone"] = detail["formatted_phone_number"]
                            if detail.get("website"):
                                b["website"] = detail["website"]
                            types = detail.get("types", [])
                            if types and not b.get("category"):
                                type_map = {
                                    "lodging": "hospitality",
                                    "restaurant": "restaurant",
                                    "store": "retail",
                                    "school": "education",
                                    "hospital": "health",
                                    "gym": "commercial",
                                    "bar": "restaurant",
                                    "cafe": "restaurant",
                                }
                                for t in types:
                                    if t in type_map:
                                        b["category"] = type_map[t]
                                        break

            time.sleep(RATE_LIMIT_DELAY)

        except Exception as e:
            errors += 1
            if errors > 10:
                print(f"  ⚠ Too many errors, stopping. Last: {e}")
                break

    print(f"  Enriched: {enriched}")
    print(f"  Errors: {errors}")
    return buildings


def main():
    print("╔══════════════════════════════════════════════╗")
    print("║  Owner Enrichment Pipeline                   ║")
    print("╚══════════════════════════════════════════════╝")

    # Load buildings
    print(f"\nLoading: {BUILDINGS_FILE}")
    with open(BUILDINGS_FILE) as f:
        buildings = json.load(f)
    print(f"  {len(buildings)} buildings")

    before_owners = sum(1 for b in buildings if b.get("ownerName"))
    before_phones = sum(1 for b in buildings if b.get("phone"))

    # Phase 1: Overture cross-reference
    overture_grid, _ = load_overture()
    if overture_grid:
        buildings = match_overture(buildings, overture_grid)

    # Phase 2: Google Places
    max_q = int(sys.argv[1]) if len(sys.argv) > 1 else 500
    buildings = enrich_with_google_places(buildings, max_queries=max_q)

    # Stats
    after_owners = sum(1 for b in buildings if b.get("ownerName"))
    after_phones = sum(1 for b in buildings if b.get("phone"))

    print(f"\n=== Results ===")
    print(f"  Owners: {before_owners} → {after_owners} (+{after_owners - before_owners})")
    print(f"  Phones: {before_phones} → {after_phones} (+{after_phones - before_phones})")

    # Save
    with open(BUILDINGS_FILE, "w") as f:
        json.dump(buildings, f, ensure_ascii=False)
    print(f"  Saved: {BUILDINGS_FILE}")
    print(f"  File size: {os.path.getsize(BUILDINGS_FILE) / 1024 / 1024:.1f} MB")


if __name__ == "__main__":
    main()
