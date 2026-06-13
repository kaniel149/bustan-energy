#!/bin/bash
# Smooth assembly frames: 63 JPEG → ~123 via ffmpeg minterpolate → WebP q80
# Spec: docs/superpowers/specs/2026-06-12-assembly-scroll-smooth-design.md
set -euo pipefail
cd "$(dirname "$0")/.."

SRC="public/frames"
OUT="public/frames-smooth"
TYPES=(concrete villa tropical)

manifest="{"
for type in "${TYPES[@]}"; do
  tmp=$(mktemp -d)
  echo "── $type: interpolating…"
  nice -n 15 ffmpeg -y -loglevel error -framerate 25 -i "$SRC/$type/%03d.jpg" \
    -vf "minterpolate=fps=50:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1:scd=fdiff:scd_threshold=4" \
    -q:v 2 "$tmp/%03d.jpg"
  mkdir -p "$OUT/$type"
  echo "── $type: webp…"
  for f in "$tmp"/*.jpg; do
    n=$(basename "$f" .jpg)
    nice -n 15 cwebp -quiet -q 80 "$f" -o "$OUT/$type/$n.webp"
  done
  count=$(ls "$OUT/$type" | grep -c '.webp')
  manifest="$manifest\"$type\":$count,"
  rm -rf "$tmp"
  echo "── $type: $count frames ($(du -sh "$OUT/$type" | cut -f1))"
done
echo "${manifest%,}}" | sed 's/{/{"ext":"webp",/' > "$OUT/manifest.json"
cat "$OUT/manifest.json"
echo "DONE"
