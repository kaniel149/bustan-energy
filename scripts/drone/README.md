# Drone Pipeline — TM Energy Koh Phangan

End-to-end pipeline for turning DJI photos into a pixel-accurate orthomosaic on KP Solar Pro v2.

## Stack
- **Capture:** DJI Air 2S (current) · DJI Mini 4 Pro (legacy)
- **Storage:** Google Drive (originals) → `drone-imagery/raw/` → `drone-imagery/clean/`
- **Processing:** OpenDroneMap via Docker (local, 14GB RAM)
- **Georef correction:** GCPs from `tools/drone/gcp-marker.html`
- **Output:** PMTiles on Supabase Storage → MapLibre layer in KP Solar Pro v2
- **Spatial DB:** Supabase Postgres + PostGIS (future)

## Run order

```bash
# 0. Install deps (once)
pip3 install --break-system-packages --user google-api-python-client \
  google-auth-oauthlib imagehash Pillow
brew install exiftool gdal

# 1. Download drone folder from Google Drive
python3 01_fetch_from_drive.py 1c0IqckTVC9epmlCx6X6FOt1p2kuB5x85
# → drone-imagery/raw/<folder_name>/

# 2. Dedup + filter + EXIF → clean folder + manifest
python3 02_process_batch.py "תמונות רחפן קופנגן"
# → drone-imagery/clean/<batch>/
# → drone-imagery/clean/<batch>.manifest.json

# 3. Create GCPs using the interactive tool
open ../../tools/drone/gcp-marker.html
# Mark 8-12 landmarks (road junctions, building corners) per area
# → Export gcp_list.txt

# 4. Run ODM (split into batches if >30 photos, 14GB Docker)
docker run -ti --rm -v /path/to/batch:/datasets opendronemap/odm \
  --project-path /datasets --gcp /datasets/code/gcp_list.txt \
  --orthophoto-resolution 3 --feature-quality high --force-gps

# 5. Reproject + generate PMTiles
gdalwarp -t_srs EPSG:4326 -r bilinear odm_orthophoto.tif ortho_wgs84.tif
# (convert to Cloud Optimized GeoTIFF then PMTiles — see 05_build_pmtiles.sh)

# 6. Upload to Supabase Storage
# 7. Update KP Solar Pro v2 to use pmtiles:// source
```

## Key lessons (what broke last time)

1. **DJI Mini 4 Pro GPS drift = 20-30m offset** → always use GCPs. Air 2S is better (1.5m) but still needs GCPs for sub-meter.
2. **ODM 16GB RAM ceiling** → process in batches of <40 photos.
3. **TMS vs XYZ** — gdal2tiles outputs TMS by default; use `--xyz` for Leaflet/MapLibre.
4. **UTM vs WGS84** — ODM outputs UTM (EPSG:32647); always `gdalwarp -t_srs EPSG:4326`.
5. **pngquant destroys tiles** → use `optipng` only for compression.
6. **Google Drive flat-copy = disaster** → dedup + bbox filter before ODM.
7. **XYZ dir with 10k files breaks Git** → use PMTiles single file.

## Coverage (legacy state, April 2026)

- 122 photos from 5 Drive folders (~1.5 GB)
- 2 ODM runs with 20-30m alignment error
- 118 tiles in `drone-imagery/tiles-legacy/` (zoom 18-19 only)
- Migration to Air 2S + GCP-corrected pipeline in progress
