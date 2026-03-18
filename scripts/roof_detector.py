#!/usr/bin/env python3
"""
roof_detector.py — Self-validating satellite roof detection pipeline

4-Phase pipeline:
  1. DEDUP     — Remove duplicate buildings (spatial proximity)
  2. VALIDATE  — Confirm each building against satellite imagery
  3. DISCOVER  — Find missing buildings in satellite tiles
  4. SCORE     — Re-score all buildings and output cleaned dataset

Usage:
  python scripts/roof_detector.py [--phase all|dedup|validate|discover]
  python scripts/roof_detector.py --region koh_phangan --bbox 99.9,9.65,100.1,9.82
  python scripts/roof_detector.py --phase dedup   # just deduplication
"""

import argparse
import json
import math
import os
import sys
import time
from collections import defaultdict
from io import BytesIO
from pathlib import Path
from typing import List, Dict, Tuple, Optional, Set

import cv2
import numpy as np
import requests
from PIL import Image

# ═══════════════════════════════════════════════════════
# Configuration
# ═══════════════════════════════════════════════════════

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "public" / "data"
CACHE_DIR = PROJECT_ROOT / "scripts" / "tile_cache"
INPUT_FILE = DATA_DIR / "buildings_all.json"
OUTPUT_FILE = DATA_DIR / "buildings_validated.json"
REPORT_FILE = PROJECT_ROOT / "scripts" / "validation_report.json"

# Deduplication
DUPLICATE_DISTANCE_M = 12       # Buildings closer than this = duplicate
DUPLICATE_GRID_DEG = 0.0002     # ~22m grid cells for spatial indexing

# Satellite tiles
TILE_ZOOM = 19                  # Google satellite zoom (19 = ~0.3m/pixel)
TILE_SIZE = 256
TILE_SERVERS = [
    "https://mt0.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
    "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
    "https://mt2.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
    "https://mt3.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
]
REQUEST_DELAY = 0.05            # Rate limit (seconds between requests)
MAX_CONCURRENT_TILES = 500      # Max tiles to fetch per run

# Validation thresholds
ROOF_WINDOW_PX = 16             # Check 16x16 pixel window around building center
WATER_BLUE_THRESHOLD = 1.25     # Blue channel > 1.25x mean(R,G) = water
VEGETATION_GREEN_THRESHOLD = 1.15
ROOF_MIN_BRIGHTNESS = 60        # Minimum average brightness for roof
ROOF_MIN_VARIANCE = 100         # Minimum color variance (flat color = road/water)
ROOF_MAX_VARIANCE = 8000        # Maximum variance (too noisy = vegetation/forest)

# Gap detection
SCAN_ZOOM = 18                  # Zoom for gap scanning (slightly lower for coverage)
EDGE_THRESHOLD_LOW = 50
EDGE_THRESHOLD_HIGH = 150
MIN_CONTOUR_AREA_PX = 80        # Min building area in pixels at zoom 18
MAX_CONTOUR_AREA_PX = 15000     # Max building area in pixels
MIN_BUILDING_SOLIDITY = 0.6     # Rectangularity of detected shapes
GAP_DISTANCE_M = 20             # Flag if no existing building within this distance

# Solar constants (Thailand)
IRRADIANCE_KWH_M2_DAY = 4.8
PERFORMANCE_RATIO = 0.80
USABLE_AREA_RATIO = 0.65
WATTS_PER_M2 = 180
TARIFF_THB = 4.5
EPC_COST_PER_KWP = 32000
PANEL_WATT = 550
PANEL_AREA_M2 = 2.0

# ═══════════════════════════════════════════════════════
# Geo math
# ═══════════════════════════════════════════════════════

def haversine_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Distance in meters between two coordinates."""
    R = 6371000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

def lat_lng_to_tile(lat: float, lng: float, zoom: int) -> Tuple[int, int]:
    """Convert lat/lng to tile x,y at given zoom."""
    n = 2 ** zoom
    x = int((lng + 180) / 360 * n)
    lat_rad = math.radians(lat)
    y = int((1 - math.log(math.tan(lat_rad) + 1 / math.cos(lat_rad)) / math.pi) / 2 * n)
    return x, y

def lat_lng_to_pixel(lat: float, lng: float, zoom: int) -> Tuple[int, int]:
    """Convert lat/lng to absolute pixel coordinates at given zoom."""
    n = 2 ** zoom
    px = int((lng + 180) / 360 * n * TILE_SIZE)
    lat_rad = math.radians(lat)
    py = int((1 - math.log(math.tan(lat_rad) + 1 / math.cos(lat_rad)) / math.pi) / 2 * n * TILE_SIZE)
    return px, py

def pixel_to_lat_lng(px: int, py: int, zoom: int) -> Tuple[float, float]:
    """Convert absolute pixel coordinates back to lat/lng."""
    n = 2 ** zoom
    lng = px / (n * TILE_SIZE) * 360 - 180
    lat_rad = math.atan(math.sinh(math.pi * (1 - 2 * py / (n * TILE_SIZE))))
    lat = math.degrees(lat_rad)
    return lat, lng

def meters_per_pixel(lat: float, zoom: int) -> float:
    """Approximate meters per pixel at given latitude and zoom."""
    return 156543.03 * math.cos(math.radians(lat)) / (2 ** zoom)

# ═══════════════════════════════════════════════════════
# Tile fetcher with cache
# ═══════════════════════════════════════════════════════

class TileFetcher:
    def __init__(self, cache_dir: Path, zoom: int = TILE_ZOOM):
        self.cache_dir = cache_dir / str(zoom)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.zoom = zoom
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "SolarIntelligence/1.0 (roof detection pipeline)"
        })
        self.request_count = 0
        self.cache_hits = 0

    def get_tile(self, tx: int, ty: int) -> Optional[np.ndarray]:
        """Fetch a tile as numpy array (RGB). Returns None on failure."""
        cache_path = self.cache_dir / f"{tx}_{ty}.jpg"

        if cache_path.exists():
            self.cache_hits += 1
            img = cv2.imread(str(cache_path))
            return cv2.cvtColor(img, cv2.COLOR_BGR2RGB) if img is not None else None

        server = TILE_SERVERS[self.request_count % len(TILE_SERVERS)]
        url = server.format(x=tx, y=ty, z=self.zoom)

        try:
            resp = self.session.get(url, timeout=10)
            resp.raise_for_status()
            arr = np.frombuffer(resp.content, np.uint8)
            img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
            if img is None:
                return None
            # Cache as JPEG (smaller than PNG)
            cv2.imwrite(str(cache_path), img)
            self.request_count += 1
            if self.request_count % 50 == 0:
                time.sleep(REQUEST_DELAY * 5)  # Brief pause every 50 requests
            else:
                time.sleep(REQUEST_DELAY)
            return cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        except Exception as e:
            print(f"  ⚠ Tile fetch failed ({tx},{ty}): {e}")
            return None

    def get_window(self, lat: float, lng: float, radius_px: int = ROOF_WINDOW_PX) -> Optional[np.ndarray]:
        """Extract a pixel window around a lat/lng from satellite tiles."""
        tx, ty = lat_lng_to_tile(lat, lng, self.zoom)
        tile = self.get_tile(tx, ty)
        if tile is None:
            return None

        # Pixel position within this tile
        abs_px, abs_py = lat_lng_to_pixel(lat, lng, self.zoom)
        local_x = abs_px % TILE_SIZE
        local_y = abs_py % TILE_SIZE

        # Extract window (handle edge cases by padding)
        h, w = tile.shape[:2]
        x1 = max(0, local_x - radius_px)
        y1 = max(0, local_y - radius_px)
        x2 = min(w, local_x + radius_px)
        y2 = min(h, local_y + radius_px)

        window = tile[y1:y2, x1:x2]
        if window.size == 0:
            return None
        return window

    def stats(self) -> str:
        total = self.request_count + self.cache_hits
        return f"Tiles: {total} total ({self.cache_hits} cached, {self.request_count} fetched)"

# ═══════════════════════════════════════════════════════
# Phase 1: DEDUPLICATION
# ═══════════════════════════════════════════════════════

def phase_dedup(buildings: List[dict]) -> Tuple[List[dict], dict]:
    """Remove duplicate buildings using spatial proximity."""
    print("\n═══ PHASE 1: DEDUPLICATION ═══")
    print(f"  Input: {len(buildings)} buildings")

    # Step 1: Remove exact coordinate duplicates
    seen_coords: Dict[str, int] = {}
    unique = []
    exact_dupes = 0
    for b in buildings:
        key = f"{b['lat']:.6f},{b['lng']:.6f}"
        if key in seen_coords:
            exact_dupes += 1
            # Keep the one with more data
            existing = unique[seen_coords[key]]
            if _data_richness(b) > _data_richness(existing):
                unique[seen_coords[key]] = b
        else:
            seen_coords[key] = len(unique)
            unique.append(b)
    print(f"  Exact coordinate duplicates removed: {exact_dupes}")

    # Step 2: Spatial grid indexing for proximity check
    grid: Dict[str, List[int]] = defaultdict(list)
    for i, b in enumerate(unique):
        gx = int(b['lng'] / DUPLICATE_GRID_DEG)
        gy = int(b['lat'] / DUPLICATE_GRID_DEG)
        grid[f"{gx},{gy}"].append(i)

    # Step 3: Find and merge nearby buildings
    merged_into: Dict[int, int] = {}  # idx → merged_into_idx
    proximity_dupes = 0

    for cell_key, indices in grid.items():
        gx, gy = map(int, cell_key.split(','))
        # Check this cell + 8 neighbors
        neighbors = []
        for dx in [-1, 0, 1]:
            for dy in [-1, 0, 1]:
                nkey = f"{gx+dx},{gy+dy}"
                if nkey in grid:
                    neighbors.extend(grid[nkey])

        # Pairwise distance check within neighborhood
        for i, idx_a in enumerate(indices):
            if idx_a in merged_into:
                continue
            for idx_b in neighbors:
                if idx_b <= idx_a or idx_b in merged_into:
                    continue
                dist = haversine_m(
                    unique[idx_a]['lat'], unique[idx_a]['lng'],
                    unique[idx_b]['lat'], unique[idx_b]['lng']
                )
                if dist < DUPLICATE_DISTANCE_M:
                    # Merge: keep the one with more data
                    if _data_richness(unique[idx_b]) > _data_richness(unique[idx_a]):
                        merged_into[idx_a] = idx_b
                        unique[idx_b] = _merge_buildings(unique[idx_b], unique[idx_a])
                    else:
                        merged_into[idx_b] = idx_a
                        unique[idx_a] = _merge_buildings(unique[idx_a], unique[idx_b])
                    proximity_dupes += 1

    deduped = [b for i, b in enumerate(unique) if i not in merged_into]
    print(f"  Proximity duplicates merged: {proximity_dupes}")
    print(f"  Output: {len(deduped)} buildings")

    stats = {
        "input": len(buildings),
        "exact_dupes": exact_dupes,
        "proximity_dupes": proximity_dupes,
        "output": len(deduped),
        "removed_pct": round((1 - len(deduped) / len(buildings)) * 100, 1),
    }
    return deduped, stats


def _data_richness(b: dict) -> int:
    """Score how much useful data a building has."""
    score = 0
    for key in ['title', 'ownerName', 'phone', 'email', 'website', 'category']:
        if b.get(key) and str(b[key]).strip():
            score += 1
    if b.get('area', 0) > 0:
        score += 1
    if b.get('solarScore', 0) > 0:
        score += 1
    return score


def _merge_buildings(primary: dict, secondary: dict) -> dict:
    """Merge secondary data into primary (primary wins on conflicts)."""
    result = {**primary}
    for key in ['title', 'ownerName', 'phone', 'email', 'website', 'category']:
        if not result.get(key) and secondary.get(key):
            result[key] = secondary[key]
    # Average coordinates for slightly better position
    result['lat'] = (primary['lat'] + secondary['lat']) / 2
    result['lng'] = (primary['lng'] + secondary['lng']) / 2
    # Keep larger area
    if secondary.get('area', 0) > result.get('area', 0):
        result['area'] = secondary['area']
    return result

# ═══════════════════════════════════════════════════════
# Phase 2: SATELLITE VALIDATION
# ═══════════════════════════════════════════════════════

def phase_validate(buildings: List[dict], fetcher: TileFetcher, sample_limit: int = 0) -> Tuple[List[dict], dict]:
    """Validate each building against satellite imagery."""
    print("\n═══ PHASE 2: SATELLITE VALIDATION ═══")

    total = len(buildings)
    if sample_limit > 0:
        to_validate = buildings[:sample_limit]
        print(f"  Validating sample: {sample_limit}/{total} buildings")
    else:
        to_validate = buildings
        print(f"  Validating all {total} buildings")

    confirmed = 0
    rejected_water = 0
    rejected_vegetation = 0
    rejected_empty = 0
    uncertain = 0
    fetch_failed = 0

    for i, b in enumerate(to_validate):
        if i % 500 == 0 and i > 0:
            print(f"  ... {i}/{len(to_validate)} ({confirmed} confirmed, {rejected_water+rejected_vegetation+rejected_empty} rejected)")

        window = fetcher.get_window(b['lat'], b['lng'])
        if window is None:
            fetch_failed += 1
            b['_validation'] = 'fetch_failed'
            continue

        classification = _classify_window(window)
        b['_validation'] = classification

        if classification == 'building':
            confirmed += 1
        elif classification == 'water':
            rejected_water += 1
        elif classification == 'vegetation':
            rejected_vegetation += 1
        elif classification == 'empty':
            rejected_empty += 1
        else:
            uncertain += 1

    # For unvalidated buildings (beyond sample), mark as uncertain
    if sample_limit > 0:
        for b in buildings[sample_limit:]:
            b['_validation'] = 'unvalidated'

    # Filter out rejected buildings
    validated = [b for b in buildings if b.get('_validation') not in ('water', 'vegetation', 'empty')]

    total_rejected = rejected_water + rejected_vegetation + rejected_empty
    print(f"\n  Results:")
    print(f"    ✓ Confirmed buildings: {confirmed}")
    print(f"    ✗ Rejected (water):      {rejected_water}")
    print(f"    ✗ Rejected (vegetation): {rejected_vegetation}")
    print(f"    ✗ Rejected (empty/road): {rejected_empty}")
    print(f"    ? Uncertain:             {uncertain}")
    print(f"    ⚠ Fetch failed:          {fetch_failed}")
    print(f"  {fetcher.stats()}")
    print(f"  Output: {len(validated)} buildings (removed {total_rejected})")

    stats = {
        "validated": len(to_validate) - fetch_failed,
        "confirmed": confirmed,
        "rejected_water": rejected_water,
        "rejected_vegetation": rejected_vegetation,
        "rejected_empty": rejected_empty,
        "uncertain": uncertain,
        "fetch_failed": fetch_failed,
        "accuracy_pct": round(confirmed / max(1, confirmed + total_rejected) * 100, 1),
        "output": len(validated),
    }
    return validated, stats


def _classify_window(window: np.ndarray) -> str:
    """Classify a satellite image window as building/water/vegetation/empty."""
    if window.size == 0:
        return 'uncertain'

    # Average color channels
    mean_r = float(np.mean(window[:, :, 0]))
    mean_g = float(np.mean(window[:, :, 1]))
    mean_b = float(np.mean(window[:, :, 2]))
    brightness = (mean_r + mean_g + mean_b) / 3

    # Color variance (per-pixel)
    variance = float(np.var(window))

    # Water detection: blue dominant + low variance
    rg_mean = (mean_r + mean_g) / 2
    if rg_mean > 0 and mean_b / rg_mean > WATER_BLUE_THRESHOLD and brightness < 120:
        return 'water'

    # Dense vegetation: green dominant
    rb_mean = (mean_r + mean_b) / 2
    if rb_mean > 0 and mean_g / rb_mean > VEGETATION_GREEN_THRESHOLD and brightness < 100:
        return 'vegetation'

    # Very dark (shadow/forest) or very bright (overexposed)
    if brightness < 30:
        return 'vegetation'  # Likely dense canopy

    # Empty/road: very low variance (uniform color) + gray tones
    if variance < ROOF_MIN_VARIANCE and brightness > ROOF_MIN_BRIGHTNESS:
        # Could be road or parking lot — check for edges
        gray = cv2.cvtColor(window, cv2.COLOR_RGB2GRAY)
        edges = cv2.Canny(gray, 30, 100)
        edge_ratio = np.count_nonzero(edges) / edges.size
        if edge_ratio < 0.02:
            return 'empty'  # Very smooth = road/parking

    # Building: moderate variance, moderate brightness, has edges
    if brightness >= ROOF_MIN_BRIGHTNESS:
        gray = cv2.cvtColor(window, cv2.COLOR_RGB2GRAY)
        edges = cv2.Canny(gray, EDGE_THRESHOLD_LOW, EDGE_THRESHOLD_HIGH)
        edge_ratio = np.count_nonzero(edges) / edges.size
        if edge_ratio > 0.03 or variance > ROOF_MIN_VARIANCE:
            return 'building'

    return 'uncertain'

# ═══════════════════════════════════════════════════════
# Phase 3: DISCOVER MISSING BUILDINGS
# ═══════════════════════════════════════════════════════

def phase_discover(buildings: List[dict], fetcher: TileFetcher,
                   bbox: Tuple[float, float, float, float],
                   max_tiles: int = MAX_CONCURRENT_TILES,
                   region: str = "koh_phangan") -> Tuple[List[dict], dict]:
    """Scan satellite tiles to find buildings not in the dataset."""
    print("\n═══ PHASE 3: DISCOVER MISSING BUILDINGS ═══")

    min_lng, min_lat, max_lng, max_lat = bbox
    print(f"  Scanning bbox: [{min_lng:.3f},{min_lat:.3f}] → [{max_lng:.3f},{max_lat:.3f}]")

    # Use lower zoom for scanning (covers more area per tile)
    scan_fetcher = TileFetcher(CACHE_DIR, zoom=SCAN_ZOOM)

    # Build spatial index of existing buildings
    existing_grid: Dict[str, List[dict]] = defaultdict(list)
    grid_step = 0.0003  # ~33m grid
    for b in buildings:
        gx = int(b['lng'] / grid_step)
        gy = int(b['lat'] / grid_step)
        existing_grid[f"{gx},{gy}"].append(b)

    # Calculate tiles to scan
    tx_min, ty_max = lat_lng_to_tile(min_lat, min_lng, SCAN_ZOOM)
    tx_max, ty_min = lat_lng_to_tile(max_lat, max_lng, SCAN_ZOOM)

    total_tiles = (tx_max - tx_min + 1) * (ty_max - ty_min + 1)
    print(f"  Tiles to scan: {total_tiles} (at zoom {SCAN_ZOOM})")

    if total_tiles > max_tiles:
        print(f"  ⚠ Limiting to {max_tiles} tiles (use --max-tiles to increase)")
        total_tiles = max_tiles

    mpp = meters_per_pixel(min_lat, SCAN_ZOOM)
    min_area_m2 = MIN_CONTOUR_AREA_PX * mpp * mpp
    print(f"  Resolution: {mpp:.2f} m/pixel | Min building: {min_area_m2:.0f} m²")

    discovered = []
    tiles_scanned = 0

    for ty in range(ty_min, ty_max + 1):
        for tx in range(tx_min, tx_max + 1):
            if tiles_scanned >= max_tiles:
                break

            tile = scan_fetcher.get_tile(tx, ty)
            if tile is None:
                continue

            tiles_scanned += 1
            if tiles_scanned % 50 == 0:
                print(f"  ... scanned {tiles_scanned}/{min(total_tiles, max_tiles)} tiles, found {len(discovered)} candidates")

            # Detect building-like contours
            candidates = _detect_buildings_in_tile(tile, tx, ty, SCAN_ZOOM, mpp)

            for lat, lng, area_m2 in candidates:
                # Check if an existing building is nearby
                gx = int(lng / grid_step)
                gy = int(lat / grid_step)
                has_nearby = False
                for dx in [-1, 0, 1]:
                    for dy in [-1, 0, 1]:
                        for existing in existing_grid.get(f"{gx+dx},{gy+dy}", []):
                            if haversine_m(lat, lng, existing['lat'], existing['lng']) < GAP_DISTANCE_M:
                                has_nearby = True
                                break
                        if has_nearby:
                            break
                    if has_nearby:
                        break

                if not has_nearby:
                    discovered.append(_create_building(lat, lng, area_m2, region))

        if tiles_scanned >= max_tiles:
            break

    print(f"\n  Tiles scanned: {tiles_scanned}")
    print(f"  {scan_fetcher.stats()}")
    print(f"  New buildings discovered: {len(discovered)}")

    stats = {
        "tiles_scanned": tiles_scanned,
        "total_tiles": total_tiles,
        "discovered": len(discovered),
    }
    return discovered, stats


def _detect_buildings_in_tile(tile: np.ndarray, tx: int, ty: int, zoom: int, mpp: float) -> List[Tuple[float, float, float]]:
    """Detect building-like contours in a satellite tile. Returns [(lat, lng, area_m2), ...]."""
    results = []

    # Convert to grayscale
    gray = cv2.cvtColor(tile, cv2.COLOR_RGB2GRAY)

    # Adaptive threshold to handle varying brightness
    thresh = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                    cv2.THRESH_BINARY, 21, 5)

    # Edge detection
    edges = cv2.Canny(gray, EDGE_THRESHOLD_LOW, EDGE_THRESHOLD_HIGH)

    # Dilate edges to connect nearby edges
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    edges_dilated = cv2.dilate(edges, kernel, iterations=1)

    # Find contours
    contours, _ = cv2.findContours(edges_dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    for contour in contours:
        area_px = cv2.contourArea(contour)
        if area_px < MIN_CONTOUR_AREA_PX or area_px > MAX_CONTOUR_AREA_PX:
            continue

        # Check solidity (rectangularity)
        hull = cv2.convexHull(contour)
        hull_area = cv2.contourArea(hull)
        if hull_area == 0:
            continue
        solidity = area_px / hull_area
        if solidity < MIN_BUILDING_SOLIDITY:
            continue

        # Get centroid
        M = cv2.moments(contour)
        if M["m00"] == 0:
            continue
        cx = int(M["m10"] / M["m00"])
        cy = int(M["m01"] / M["m00"])

        # Check color at centroid (reject water/vegetation)
        window = tile[max(0, cy-4):cy+4, max(0, cx-4):cx+4]
        if window.size > 0:
            classification = _classify_window(window)
            if classification in ('water', 'vegetation'):
                continue

        # Convert pixel to lat/lng
        abs_px = tx * TILE_SIZE + cx
        abs_py = ty * TILE_SIZE + cy
        lat, lng = pixel_to_lat_lng(abs_px, abs_py, zoom)

        # Convert area from pixels to m²
        area_m2 = area_px * mpp * mpp

        results.append((lat, lng, area_m2))

    return results

# ═══════════════════════════════════════════════════════
# Building creation & scoring
# ═══════════════════════════════════════════════════════

def _create_building(lat: float, lng: float, area_m2: float, region: str) -> dict:
    """Create a new building entry with solar calculations."""
    import uuid
    usable = area_m2 * USABLE_AREA_RATIO
    kwp = usable * WATTS_PER_M2 / 1000
    panels = max(1, round(kwp * 1000 / PANEL_WATT))
    annual_kwh = kwp * IRRADIANCE_KWH_M2_DAY * 365 * PERFORMANCE_RATIO

    # Priority scoring
    if kwp >= 50:
        priority = 'A'
        score = min(100, 70 + kwp / 10)
    elif kwp >= 20:
        priority = 'B'
        score = min(85, 50 + kwp / 2)
    elif kwp >= 5:
        priority = 'C'
        score = min(65, 30 + kwp)
    else:
        priority = 'D'
        score = max(10, kwp * 5)

    return {
        "id": f"roof_{uuid.uuid4().hex[:12]}",
        "type": "roof",
        "status": "private",
        "region": region,
        "title": f"Detected Building ({area_m2:.0f}m²)",
        "location": region.replace('_', ' ').title(),
        "lat": round(lat, 6),
        "lng": round(lng, 6),
        "area": round(area_m2, 1),
        "usableArea": round(usable, 1),
        "capacityKwp": round(kwp, 2),
        "panelCount": panels,
        "annualKwh": round(annual_kwh),
        "annualSavings": round(annual_kwh * TARIFF_THB),
        "epcCost": round(kwp * EPC_COST_PER_KWP),
        "solarScore": round(score),
        "priority": priority,
        "_source": "satellite_detection",
    }


def recalculate_priorities(buildings: List[dict]) -> List[dict]:
    """Re-score all buildings with consistent priority distribution."""
    # Sort by capacity
    for b in buildings:
        kwp = b.get('capacityKwp', 0)
        area = b.get('area', 0)
        category = (b.get('category') or '').lower()

        # Base score from capacity
        if kwp >= 100:
            base = 85
        elif kwp >= 50:
            base = 70
        elif kwp >= 20:
            base = 55
        elif kwp >= 10:
            base = 40
        elif kwp >= 5:
            base = 30
        else:
            base = max(10, kwp * 5)

        # Category bonus
        if category in ('commercial', 'hospitality'):
            base += 10
        elif category == 'mixed':
            base += 5

        # Area bonus (larger = better)
        if area > 500:
            base += 5
        elif area > 200:
            base += 3

        score = min(100, base)
        b['solarScore'] = round(score)

        # Priority from score
        if score >= 75:
            b['priority'] = 'A'
        elif score >= 55:
            b['priority'] = 'B'
        elif score >= 35:
            b['priority'] = 'C'
        else:
            b['priority'] = 'D'

    return buildings

# ═══════════════════════════════════════════════════════
# Self-validation loop
# ═══════════════════════════════════════════════════════

def self_validate(buildings: List[dict], fetcher: TileFetcher, iterations: int = 3) -> List[dict]:
    """Run validation iteratively, adjusting thresholds until stable."""
    print("\n═══ SELF-VALIDATION LOOP ═══")

    prev_count = len(buildings)
    for i in range(iterations):
        print(f"\n--- Iteration {i+1}/{iterations} ---")

        # Sample validation (faster for large datasets)
        sample = min(2000, len(buildings))
        validated, stats = phase_validate(buildings, fetcher, sample_limit=sample)

        accuracy = stats['accuracy_pct']
        change = abs(len(validated) - prev_count) / max(1, prev_count) * 100

        print(f"  Accuracy: {accuracy}% | Change: {change:.1f}%")

        if change < 0.5:
            print(f"  ✓ Stable — converged after {i+1} iterations")
            break

        buildings = validated
        prev_count = len(buildings)

    return buildings

# ═══════════════════════════════════════════════════════
# Main pipeline
# ═══════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description="Roof detection & validation pipeline")
    parser.add_argument("--input", type=str, default=str(INPUT_FILE))
    parser.add_argument("--output", type=str, default=str(OUTPUT_FILE))
    parser.add_argument("--phase", type=str, default="all",
                        choices=["all", "dedup", "validate", "discover"],
                        help="Which phase to run")
    parser.add_argument("--region", type=str, default="koh_phangan")
    parser.add_argument("--bbox", type=str, default="99.93,9.68,100.07,9.81",
                        help="Bounding box: min_lng,min_lat,max_lng,max_lat (default: Ko Phangan land)")
    parser.add_argument("--max-tiles", type=int, default=MAX_CONCURRENT_TILES)
    parser.add_argument("--sample", type=int, default=0,
                        help="Validate only N buildings (0=all)")
    parser.add_argument("--no-discover", action="store_true",
                        help="Skip gap discovery (faster)")
    args = parser.parse_args()

    print("╔══════════════════════════════════════════════╗")
    print("║  Solar Intelligence — Roof Detection v1.0   ║")
    print("║  Self-validating satellite pipeline          ║")
    print("╚══════════════════════════════════════════════╝")

    # Load data
    print(f"\nLoading: {args.input}")
    with open(args.input) as f:
        buildings = json.load(f)
    print(f"  Loaded {len(buildings)} buildings")

    bbox = tuple(map(float, args.bbox.split(',')))
    report = {"input_count": len(buildings), "phases": {}}
    fetcher = TileFetcher(CACHE_DIR)

    # ── Phase 1: Deduplication ──
    if args.phase in ("all", "dedup"):
        buildings, dedup_stats = phase_dedup(buildings)
        report["phases"]["dedup"] = dedup_stats

    # ── Phase 2: Satellite Validation ──
    if args.phase in ("all", "validate"):
        if args.sample > 0:
            buildings, validate_stats = phase_validate(buildings, fetcher, sample_limit=args.sample)
        else:
            buildings = self_validate(buildings, fetcher)
            validate_stats = {"self_validated": True, "output": len(buildings)}
        report["phases"]["validate"] = validate_stats

    # ── Phase 3: Discover Missing ──
    if args.phase in ("all", "discover") and not args.no_discover:
        discovered, discover_stats = phase_discover(buildings, fetcher, bbox, max_tiles=args.max_tiles, region=args.region)
        if discovered:
            print(f"\n  Adding {len(discovered)} discovered buildings to dataset")
            buildings.extend(discovered)
        report["phases"]["discover"] = discover_stats

    # ── Final: Re-score & save ──
    buildings = recalculate_priorities(buildings)

    # Remove internal validation markers
    for b in buildings:
        b.pop('_validation', None)

    # Priority distribution
    dist = defaultdict(int)
    for b in buildings:
        dist[b.get('priority', '?')] += 1
    total_kwp = sum(b.get('capacityKwp', 0) for b in buildings)

    print(f"\n═══ FINAL OUTPUT ═══")
    print(f"  Total buildings: {len(buildings)}")
    print(f"  Priority: A={dist['A']} B={dist['B']} C={dist['C']} D={dist['D']}")
    print(f"  Total capacity: {total_kwp/1000:.1f} MWp")
    print(f"  Saving to: {args.output}")

    with open(args.output, 'w') as f:
        json.dump(buildings, f, ensure_ascii=False)
    print(f"  File size: {os.path.getsize(args.output) / 1024 / 1024:.1f} MB")

    report["output_count"] = len(buildings)
    report["priority_distribution"] = dict(dist)
    report["total_mwp"] = round(total_kwp / 1000, 1)

    with open(REPORT_FILE, 'w') as f:
        json.dump(report, f, indent=2)
    print(f"  Report: {REPORT_FILE}")

    print("\n✓ Pipeline complete!")


if __name__ == "__main__":
    main()
