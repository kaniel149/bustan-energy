# Drone Orthomosaic Improvement Plan
## KP Solar Pro — Bustan Energy (Koh Phangan)

**Date:** 2026-03-29
**Goal:** Pixel-accurate drone orthomosaic overlay on the Leaflet map with correct building alignment

---

## Current Problems

| # | Problem | Impact | Root Cause |
|---|---------|--------|------------|
| 1 | **20-30m offset** from Google Satellite | Buildings appear in wrong location | DJI GPS accuracy = 5-15m, no GCPs used |
| 2 | **Building markers misaligned** | CRM data doesn't match rooftops | Markers placed from offset orthomosaic |
| 3 | **Empty tile artifacts** | Orange/yellow squares on map | Transparent PNG tiles not filtered |
| 4 | **16GB RAM limit** | Can't process 122 photos at once | Mac Mini M2 limitation |

---

## Phase 1: Photo Recovery & Organization (30 min)

### 1.1 Download photos from Google Drive

```bash
# Create working directory
mkdir -p /tmp/drone-all-photos

# Download from 5 Google Drive folders using gdown
# Folder 1: photos 001-050
gdown --folder "1c0IqckTVC9epmlCx6X6FOt1p2kuB5x85" -O /tmp/drone-all-photos/batch1/

# Folder 2: photos 058-104
gdown --folder "1-gPBl-AQQ4sGqzfP9ZdH-4HUftIjU4eB" -O /tmp/drone-all-photos/batch2/

# Folder 3: photos 105-122
gdown --folder "1YeVoK1BleYk6-xGqLTRLnHpP7GVZQ0Kb" -O /tmp/drone-all-photos/batch3/

# Folder 4: original 26 photos
gdown --folder "1PJOnpb21w99xXkm9g37ruHf47-a7hiXM" -O /tmp/drone-all-photos/originals/

# Folder 5: 40 photos (overlap + 7 new)
gdown --folder "1nlYMCs1d1_cNsaArlUwEWNA06hsKQWUZ" -O /tmp/drone-all-photos/extra/
```

### 1.2 Deduplicate & organize

```bash
# Move all unique photos to flat directory
# Compare by filename (DJI_XXXXXXXX_XXXX_D.JPG pattern)
python3 -c "
import os, shutil
src_dirs = ['/tmp/drone-all-photos/batch1', '/tmp/drone-all-photos/batch2',
            '/tmp/drone-all-photos/batch3', '/tmp/drone-all-photos/originals',
            '/tmp/drone-all-photos/extra']
dst = '/tmp/drone-all-photos/unique'
os.makedirs(dst, exist_ok=True)
seen = set()
for d in src_dirs:
    if not os.path.exists(d): continue
    for f in sorted(os.listdir(d)):
        if f.upper().endswith('.JPG') and f not in seen:
            seen.add(f)
            shutil.copy2(os.path.join(d, f), os.path.join(dst, f))
print(f'Unique photos: {len(seen)}')
"
```

### 1.3 Extract metadata

```bash
# Extract GPS + DJI XMP for all photos
exiftool -json -GPSLatitude -GPSLongitude -GPSAltitude \
  -RelativeAltitude -GimbalYawDegree -GimbalPitchDegree \
  -ImageWidth -ImageHeight -DateTimeOriginal \
  /tmp/drone-all-photos/unique/*.JPG > /tmp/drone-metadata.json
```

---

## Phase 2: Ground Control Points (GCPs) — THE KEY FIX (1-2 hours)

> **This is what will fix the 20-30m offset.** Without GCPs, no amount of ODM tuning will help.

### 2.1 What are GCPs?

GCPs are identifiable points visible in BOTH:
- Google Earth/Maps (to get accurate GPS coordinates)
- The drone photos (to tell ODM where they actually are)

### 2.2 How to create GCPs

**Step A: Identify 8-12 reference points in Google Earth**

Good GCP candidates on Koh Phangan:
- Road intersections (T-junctions, crossroads)
- Building corners (distinctive/unique roofs)
- Pool corners (swimming pools have sharp edges)
- Temple/landmark corners
- Pier/dock endpoints

**Distribute across all 4 survey areas:**
| Area | Photos | GCPs Needed |
|------|--------|-------------|
| Main (001-025, 045-057) | ~37 | 3-4 |
| North (026-031) | 6 | 2 |
| Thong Nai Pan (032-044) | 13 | 2-3 |
| New survey (060-122) | 63 | 3-4 |

**Step B: Record coordinates from Google Earth**

1. Open Google Earth Pro (free desktop app)
2. Navigate to each GCP location
3. Place a pin — record Lat, Lon (WGS84, decimal degrees)
4. Estimate altitude (use Google Earth terrain elevation)

**Step C: Find the same points in drone photos**

For each GCP, identify which drone photo(s) show that point, and record the pixel X,Y coordinates.

### 2.3 GCP file format (for ODM)

Create `/tmp/gcp_list.txt`:
```
EPSG:4326
99.99720 9.72950 43 2048 1536 DJI_20260327112710_0009_D.JPG
99.99720 9.72950 43 1800 1200 DJI_20260327112730_0010_D.JPG
99.99850 9.72480 38 3000 2000 DJI_20260327113000_0015_D.JPG
# lon   lat    alt  px   py   filename
```

Each GCP should appear in 2-3 photos for best accuracy.

### 2.4 Semi-automated GCP tool (Python)

```python
# We can build a simple tool to help:
# 1. Show each drone photo
# 2. User clicks the GCP point
# 3. Tool records pixel coordinates
# 4. Generates gcp_list.txt
```

---

## Phase 3: ODM Processing (2-4 hours compute time)

### Strategy: Process in 4 batches by area (solves RAM issue)

The 16GB RAM limit means we CAN'T process all 122 photos at once.
But we CAN process each area separately and merge the results.

### 3.1 Increase Docker resources

```
Docker Desktop → Settings → Resources:
  Memory: 14 GB (leave 2GB for macOS)
  CPUs: All available
  Swap: 4 GB
```

### 3.2 Process each batch

```bash
# === BATCH 1: Main area (37 photos) ===
mkdir -p /tmp/odm-main/code
# Copy photos 001-025 + 045-057 to /tmp/odm-main/code/
# Copy gcp_list.txt (only lines for these photos)

docker run -ti --rm \
  -v /tmp/odm-main:/datasets \
  opendronemap/odm \
  --project-path /datasets \
  --gcp /datasets/code/gcp_list.txt \
  --dsm \
  --dtm \
  --orthophoto-resolution 5 \
  --mesh-octree-depth 11 \
  --feature-quality high \
  --pc-quality high \
  --min-num-features 10000 \
  --matcher-type flann \
  --force-gps \
  --use-3dmesh

# === BATCH 2: North (6 photos) ===
# Same pattern, different photos + GCP subset

# === BATCH 3: Thong Nai Pan (13 photos) ===
# Same pattern

# === BATCH 4: New survey (63 photos) ===
# This is the largest — may need --orthophoto-resolution 8 to fit in RAM
# Or split into 2 sub-batches of ~30 photos each
```

### 3.3 ODM Key Parameters

| Parameter | Value | Why |
|-----------|-------|-----|
| `--gcp` | gcp_list.txt | **THE FIX** for alignment |
| `--orthophoto-resolution 5` | 5 cm/pixel | Good balance of detail vs file size |
| `--feature-quality high` | Better matching | More tie points between photos |
| `--force-gps` | Use EXIF GPS | Helps initial alignment |
| `--dsm` | Digital Surface Model | Helps with building heights |
| `--min-num-features 10000` | More features | Better stitching in tropical areas |

### 3.4 Alternative: WebODM Cloud ($35/month)

If local processing fails or quality is insufficient:

1. Sign up at https://webodm.net (Pro plan)
2. Create task → Upload all 122 photos + GCP file
3. Select "High Quality" preset
4. Process (runs on powerful cloud servers, no RAM limit)
5. Download the GeoTIFF

**Advantage:** No RAM limits, professional-grade processing
**Cost:** $35/month (cancel after 1 month)

---

## Phase 4: Post-Processing & Tile Generation (1 hour)

### 4.1 Reproject to WGS84

```bash
# ODM outputs EPSG:32647 (UTM Zone 47N) — must convert to WGS84
gdalwarp -t_srs EPSG:4326 -r bilinear \
  /tmp/odm-main/code/odm_orthophoto/odm_orthophoto.tif \
  /tmp/ortho-main-wgs84.tif

# Check alignment
gdalinfo /tmp/ortho-main-wgs84.tif
# Verify Corner Coordinates match expected lat/lon for Koh Phangan
```

### 4.2 Validate alignment

```python
# Quick visual check: overlay on Google tiles
import rasterio
from rasterio.plot import show
import matplotlib.pyplot as plt

with rasterio.open('/tmp/ortho-main-wgs84.tif') as src:
    bounds = src.bounds
    print(f"Bounds: {bounds}")
    # Compare with known building at:
    # e.g., road intersection at 9.7250, 99.9970
    # The pixel at that coordinate should show the same intersection
```

### 4.3 Merge orthomosaics (if processed in batches)

```bash
# Merge all area orthomosaics into one
gdal_merge.py -o /tmp/ortho-merged-wgs84.tif \
  /tmp/ortho-main-wgs84.tif \
  /tmp/ortho-north-wgs84.tif \
  /tmp/ortho-tnp-wgs84.tif \
  /tmp/ortho-survey-wgs84.tif \
  -co COMPRESS=LZW
```

### 4.4 Generate tiles

```bash
# Generate XYZ tiles (not TMS!) for Leaflet
gdal2tiles.py \
  -z 15-20 \
  -w none \
  -r bilinear \
  --xyz \
  /tmp/ortho-merged-wgs84.tif \
  /tmp/drone-tiles-new/

# Remove empty/tiny tiles (< 500 bytes = transparent)
find /tmp/drone-tiles-new -name "*.png" -size -500c -delete

# Optimize tile size with optipng (not pngquant!)
find /tmp/drone-tiles-new -name "*.png" -exec optipng -o2 {} \;
```

**Important:** Use `--xyz` flag (NOT TMS) so tiles work with Leaflet without `tms: true`.

### 4.5 Tile size estimate

| Zoom | Tiles (approx) | Size |
|------|----------------|------|
| 15 | ~20 | Tiny |
| 16 | ~80 | ~1 MB |
| 17 | ~320 | ~5 MB |
| 18 | ~1,200 | ~20 MB |
| 19 | ~5,000 | ~80 MB |
| 20 | ~20,000 | ~300 MB |

Total: ~400 MB. GitHub Pages limit = 1GB repo → OK, but consider zoom 15-19 only.

---

## Phase 5: Map Integration (1 hour)

### 5.1 Deploy tiles

```bash
# Copy tiles to repo
cd ~/Desktop/projects/solar/solar-intelligence
# Or the copenhagen-solar repo if that's still the deployment target

# Replace old tiles
rm -rf drone-tiles/
cp -r /tmp/drone-tiles-new/ drone-tiles/

# Git push (tiles are large — may need Git LFS or split commits)
git add drone-tiles/
git commit -m "Replace drone tiles with GCP-corrected orthomosaic"
git push
```

### 5.2 Update Leaflet tile layer

In `platform/pro/index.html`, update the drone layer:

```javascript
// BEFORE (TMS scheme, misaligned):
L.tileLayer('drone-tiles/odm_area1/{z}/{x}/{y}.png', {
    tms: true, maxZoom: 19, opacity: 0.85
})

// AFTER (XYZ scheme, GCP-corrected):
L.tileLayer('drone-tiles/{z}/{x}/{y}.png', {
    maxZoom: 20,
    opacity: 0.85,
    bounds: [[9.710, 99.982], [9.789, 100.014]], // Koh Phangan coverage
    errorTileUrl: '' // Hide missing tiles instead of showing errors
})
```

### 5.3 Fix building markers

After orthomosaic is correctly aligned, re-run building detection:

```python
# The building coordinates from Supabase should now match the orthomosaic
# If they still don't, the Supabase buildings came from the old offset data
# → Need to re-detect buildings from the corrected orthomosaic
```

---

## Phase 6: Building Re-Detection (Optional, 2 hours)

Only needed if current building data is from the offset orthomosaic.

### 6.1 Tile-based detection with Gemini Vision

```python
import rasterio
import google.generativeai as genai

genai.configure(api_key="YOUR_GEMINI_KEY")
model = genai.GenerativeModel('gemini-2.0-flash')

with rasterio.open('/tmp/ortho-merged-wgs84.tif') as src:
    # Split into 500x500 pixel tiles
    # For each tile:
    #   1. Save as PNG
    #   2. Send to Gemini: "List all buildings in this aerial photo with pixel coordinates"
    #   3. Convert pixel coords → GPS using src.xy(row, col)
    #   4. Upsert to Supabase buildings table
```

---

## Decision Matrix: Which Processing Option?

| Option | Cost | Quality | Effort | RAM Issue |
|--------|------|---------|--------|-----------|
| **A: ODM local + GCPs** | Free | Good (with GCPs) | High (GCP creation) | Split into batches |
| **B: WebODM Cloud** | $35/mo | Very Good | Low (upload & wait) | No issue |
| **C: Pix4D Cloud** | $59/mo | Excellent | Low | No issue |
| **D: Hybrid** | Free/$35 | Best | Medium | Solved |

### Recommended: Option D (Hybrid)

1. **Create GCPs manually** (Step 2 — needed regardless of processing tool)
2. **Try ODM locally first** with batches of 30 photos + GCPs
3. **If alignment still off** → Upload to WebODM Cloud with same GCPs
4. **If quality still not enough** → Pix4D Cloud (1 month trial)

---

## Quick Win: Satellite Registration (No ODM needed)

If ODM orthomosaics are close but just offset, we can apply a simple transform:

```python
# Find the offset by comparing a known point
# E.g., a road intersection visible in both Google Satellite and the orthomosaic
# Calculate the delta and shift all coordinates

import rasterio
from rasterio.transform import Affine

# Measured offset (example)
dx_lon = 0.00025  # ~25m east correction
dy_lat = -0.00015  # ~15m south correction

with rasterio.open('/tmp/ortho-wgs84.tif') as src:
    profile = src.profile
    transform = src.transform
    # Apply offset
    new_transform = Affine(
        transform.a, transform.b, transform.c + dx_lon,
        transform.d, transform.e, transform.f + dy_lat
    )
    profile.update(transform=new_transform)
    with rasterio.open('/tmp/ortho-shifted.tif', 'w', **profile) as dst:
        for i in range(1, src.count + 1):
            dst.write(src.read(i), i)
```

**This is the fastest fix** — find 3-5 reference points, calculate average offset, shift the GeoTIFF.

---

## Execution Order (Priority)

```
Step 0: Download photos from Google Drive          [30 min]
Step 1: Try Quick Win — satellite registration      [1 hour]
        → If alignment < 3m → DONE, go to Step 4
Step 2: Create GCPs from Google Earth               [1-2 hours]
Step 3: Process with ODM (local) or WebODM (cloud)  [2-4 hours]
Step 4: Generate tiles + deploy                     [1 hour]
Step 5: Update map + fix building markers           [1 hour]
Step 6: (Optional) Re-run building detection        [2 hours]
```

**Total estimated time: 6-10 hours** (mostly compute/wait time)

---

## Files Reference

| What | Where |
|------|-------|
| Drone photos (download) | 5 Google Drive folders (see links above) |
| Project repo | `~/Desktop/projects/solar/solar-intelligence` |
| GitHub Pages repo | `github.com/kaniel149/copenhagen-solar` |
| Platform | `platform/pro/index.html` (Leaflet) |
| Current tiles | `drone-tiles/odm_area{1,2,3,4,6}/` |
| Supabase | `trvgpgpsqvvdsudpgwpm` (buildings table) |
| ODM Docker | `opendronemap/odm` (installed) |
