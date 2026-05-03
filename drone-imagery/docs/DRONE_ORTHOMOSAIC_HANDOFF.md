# Drone Orthomosaic Project — Handoff Document

## Project Goal
Turn 122 DJI drone photos from Koh Phangan into a pixel-accurate orthomosaic overlay on a Leaflet web map, with building detection.

## Current State (March 29, 2026)

### What Works
- **KP Solar Pro platform**: https://index.energy-tm.com/platform/pro/ (PIN: 2626)
- **122 drone photos** downloaded and available at `/tmp/drone-all-photos/` (1.5GB)
- **OpenDroneMap** installed via Docker on Mac Mini M2 (16GB RAM)
- **2 ODM orthomosaics** generated (but with alignment issues)
- **Supabase database** with 2835+ buildings

### What Doesn't Work Yet
1. **Orthomosaic alignment** — ODM output is offset ~20-30m from Google Satellite
2. **Building markers** — not precisely on rooftops
3. **Empty tile artifacts** — orange/yellow squares from transparent tiles
4. **Memory limit** — 16GB RAM not enough for 122 photos at full res in ODM

---

## Architecture

### Repository
- **GitHub**: https://github.com/kaniel149/copenhagen-solar
- **Hosted**: GitHub Pages → https://index.energy-tm.com
- **Platform**: `/platform/pro/index.html` — Leaflet map with dark UI

### Map Layers (in index.html)
```javascript
// Base layers
- Google Satellite (default)
- Google Hybrid
- CartoDB Dark

// Overlay layers
- 📸 Drone Photos — clickable markers showing photo in popup
- 🛸 Drone HD — tile layer from drone-tiles/ directory (TMS scheme)
```

### Tile Structure
```
drone-tiles/
  odm_area1/    — ODM orthomosaic from photos 001-030
  odm_area2/    — ODM orthomosaic from photos 060-122
  odm_area3/    — Small area (Thong Nai Pan)
  odm_area4/    — Small area (northern coast)
  odm_area6/    — Small area (southern)
```
Tiles are TMS scheme (Y-flipped from Google/OSM), zoom levels 15-19.

### Supabase Database
- **Project**: trvgpgpsqvvdsudpgwpm (Bustan Energy)
- **Table**: `buildings`
- **Key columns**: name, lat, lng, roof_area_sqm, building_type, roof_type, potential_kwp, source, status
- **Valid enums**:
  - source: 'drone'
  - status: 'identified'
  - building_type: residential, hotel, restaurant, shop, office, hospital
  - roof_type: metal, concrete, tile

---

## Drone Photos

### Source
- **Camera**: DJI Mini 4 Pro (FC9113)
- **Sensor**: 1/1.3" CMOS, 9.728×7.296mm
- **Focal length**: 8.67mm (24mm equiv)
- **Resolution**: 4096×3072 (12.5MP)
- **Dates**: March 27-28, 2026

### Metadata Extraction
```bash
# GPS from EXIF
exiftool -GPSLatitude -GPSLongitude -GPSAltitude photo.JPG

# DJI-specific XMP data (crucial!)
exiftool -RelativeAltitude -GimbalYawDegree -GimbalPitchDegree photo.JPG
```
- `RelativeAltitude` = height above ground (AGL), NOT above sea level
- `GimbalPitchDegree` ≈ -90° = nadir (straight down)
- `GimbalYawDegree` = compass direction camera top points

### Photo Locations (4 survey areas)
| Area | Photos | Lat Range | Lon Range | Notes |
|------|--------|-----------|-----------|-------|
| Main | 001-025, 045-057 | 9.723-9.730 | 99.991-100.001 | Best coverage, ~80m AGL |
| North | 026-031 | 9.756-9.758 | 100.007 | Small cluster |
| Thong Nai Pan | 032-044 | 9.783-9.789 | 100.009-100.014 | Mixed altitudes |
| New survey | 060-122 | 9.710-9.720 | 99.982-99.989 | March 28, systematic grid |

---

## What Needs to Be Done

### Option A: WebODM Cloud (Recommended)
1. Sign up at https://webodm.net ($35/mo Pro plan, or pay-as-you-go)
2. Upload all 122 photos
3. Add GCPs (Ground Control Points):
   - Identify 5-10 recognizable points in Google Earth
   - Record their coordinates
   - Mark the same points in the drone photos
4. Process → download GeoTIFF
5. Run `gdal2tiles.py` to generate Leaflet tiles
6. Deploy to `drone-tiles/` directory

### Option B: Fix Current ODM Setup
1. Increase Docker RAM to 14GB (Docker Desktop → Settings → Resources)
2. Reprocess with GCP file:
   ```
   # gcp_list.txt format:
   # lon lat alt px py filename
   99.99720 9.72950 43 2048 1536 DJI_20260327112710_0009_D.JPG
   ```
3. Run ODM: `docker run ... --gcp /datasets/code/gcp_list.txt`

### Option C: Professional Service
- **Pix4D Cloud**: $59/mo, upload photos, get orthomosaic
- **DroneDeploy**: $349/mo, enterprise solution
- **Local freelancer**: Any GIS professional with Pix4D/Agisoft Metashape

### Building Detection
After orthomosaic is correct:
1. Load GeoTIFF with `rasterio`
2. Split into tiles
3. Send to Gemini Vision API for building detection
4. Convert pixel coordinates to GPS using `src.xy(row, col)`
5. Insert to Supabase `buildings` table

---

## Tools Installed on Mac Mini

```bash
# Python packages
pip3 install opencv-python-headless numpy pillow rasterio scipy pyproj

# System tools
brew install gdal exiftool pngquant
pip3 install gdown  # Google Drive downloader

# Docker + ODM
/Applications/Docker.app
docker pull opendronemap/odm  # ~3GB image

# Key commands
gdal2tiles.py -z 15-20 -w none -r bilinear input.tif output_dir/
gdalwarp -t_srs EPSG:4326 input_utm.tif output_wgs84.tif
gdalinfo input.tif  # check bounds, CRS, resolution
```

---

## Files on Mac Mini

```
/tmp/drone-all-photos/           — 122 DJI JPG files (1.5GB)
/tmp/drone-122-metadata.json     — GPS + XMP metadata for all photos
/tmp/odm-batch1a/                — ODM output for photos 001-030
/tmp/odm-batch2/                 — ODM output for photos 060-122
/tmp/odm-batch1a-wgs84.tif       — Reprojected orthomosaic (WGS84)
/tmp/odm-batch2-wgs84.tif        — Reprojected orthomosaic (WGS84)
/tmp/gcp_offset.json             — Computed GPS offset correction

~/projects/copenhagen-solar/     — GitHub repo
  platform/pro/index.html        — Main map application
  drone-tiles/                   — XYZ tile pyramid (TMS scheme)
  drone-imagery/                 — Original photos (resized, WebP)
  drone-surveys/                 — Processing reports
```

---

## API Keys & Credentials
- **Supabase anon key**: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRydmdwZ3BzcXZ2ZHN1ZHBnd3BtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzOTE3OTIsImV4cCI6MjA4ODk2Nzc5Mn0.iRx9JiEo6dZL8K5sMUKLS8Sbi5QEZ_BSXvWI9rgTENw
- **Supabase URL**: https://trvgpgpsqvvdsudpgwpm.supabase.co
- **Gemini API**: AIzaSyCXoQ1be8uSmHY4CGXx-mm4-e-rqyu8NkQ
- **GitHub**: kaniel149/copenhagen-solar

---

## Lessons Learned
1. **DJI GPS has 5-15m error** — always need GCPs or satellite registration
2. **OpenCV stitching ≠ photogrammetry** — can't handle lens distortion, parallax
3. **ODM needs >16GB RAM** for 60+ photos at full resolution
4. **gdal2tiles generates empty tiles** — must delete tiles < 500 bytes
5. **pngquant destroys tiles** — reduces real tiles to palettized garbage
6. **TMS vs XYZ** — gdal2tiles outputs TMS (Y-flipped), Leaflet needs `tms:true`
7. **UTM ≠ WGS84** — ODM outputs EPSG:32647, must `gdalwarp -t_srs EPSG:4326`
