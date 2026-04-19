#!/usr/bin/env bash
# 05 — Build PMTiles from ODM orthomosaic + upload to Supabase Storage.
#
# Usage:
#   ./05_build_pmtiles.sh /path/to/odm_orthophoto.tif batch_name
#
# Outputs:
#   drone-imagery/pmtiles/<batch_name>.pmtiles     (cloud-optimized, single file)
#   Uploaded to Supabase Storage bucket: drone-imagery
#   URL: https://<supabase>.supabase.co/storage/v1/object/public/drone-imagery/<batch>.pmtiles
set -euo pipefail

INPUT_TIF="${1:?usage: $0 <input.tif> <batch_name>}"
BATCH="${2:?need batch name}"

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT_DIR="$ROOT/drone-imagery/pmtiles"
mkdir -p "$OUT_DIR"

WGS_TIF="$OUT_DIR/${BATCH}_wgs84.tif"
COG_TIF="$OUT_DIR/${BATCH}_cog.tif"
MBTILES="$OUT_DIR/${BATCH}.mbtiles"
PMTILES="$OUT_DIR/${BATCH}.pmtiles"

echo "▶ 1/5 Reproject UTM → WGS84"
gdalwarp -overwrite -t_srs EPSG:4326 -r bilinear \
  -co COMPRESS=LZW -co TILED=YES \
  "$INPUT_TIF" "$WGS_TIF"

echo "▶ 2/5 Convert to Cloud Optimized GeoTIFF"
gdal_translate "$WGS_TIF" "$COG_TIF" \
  -of COG -co COMPRESS=WEBP -co QUALITY=85 \
  -co BLOCKSIZE=512 -co OVERVIEWS=AUTO

echo "▶ 3/5 Generate MBTiles (zoom 14-22)"
gdal_translate "$COG_TIF" "$MBTILES" \
  -of MBTILES -co TILE_FORMAT=WEBP -co QUALITY=85
gdaladdo -r average "$MBTILES" 2 4 8 16 32 64

echo "▶ 4/5 Convert MBTiles → PMTiles"
if ! command -v pmtiles &> /dev/null; then
  echo "  installing pmtiles CLI..."
  # macOS: brew install pmtiles   |   or download from https://github.com/protomaps/go-pmtiles/releases
  brew install pmtiles || {
    echo "brew install pmtiles failed. Download from github.com/protomaps/go-pmtiles/releases"
    exit 1
  }
fi
pmtiles convert "$MBTILES" "$PMTILES"

echo "▶ 5/5 Upload to Supabase Storage"
: "${SUPABASE_URL:?set SUPABASE_URL in env}"
: "${SUPABASE_SERVICE_ROLE_KEY:?set SUPABASE_SERVICE_ROLE_KEY in env}"

# Ensure bucket exists (idempotent — will 409 if exists, harmless)
curl -sS -X POST "$SUPABASE_URL/storage/v1/bucket" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"id":"drone-imagery","name":"drone-imagery","public":true,"file_size_limit":5368709120}' \
  -o /dev/null -w "bucket create: %{http_code}\n"

# Upload the PMTiles file
SIZE=$(stat -f%z "$PMTILES" 2>/dev/null || stat -c%s "$PMTILES")
echo "  uploading $(du -h "$PMTILES" | cut -f1)..."
curl -sS -X POST "$SUPABASE_URL/storage/v1/object/drone-imagery/${BATCH}.pmtiles" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/octet-stream" \
  -H "x-upsert: true" \
  --data-binary "@$PMTILES"

PUBLIC_URL="$SUPABASE_URL/storage/v1/object/public/drone-imagery/${BATCH}.pmtiles"
echo ""
echo "✅ PMTiles uploaded:"
echo "   $PUBLIC_URL"
echo ""
echo "Use in MapLibre (KP Solar Pro v2):"
echo "   map.addSource('drone-${BATCH}', {"
echo "     type: 'raster',"
echo "     url: 'pmtiles://$PUBLIC_URL',"
echo "     tileSize: 512"
echo "   });"
