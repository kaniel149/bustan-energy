#!/usr/bin/env python3
"""
02 — Process raw drone photos: dedup → filter → EXIF extract → manifest.

Usage:
  python3 02_process_batch.py [RAW_SUBDIR]
  python3 02_process_batch.py "תמונות רחפן קופנגן"

Pipeline:
  1) Walk raw photos
  2) For each: extract EXIF+XMP (GPS, altitude, heading, camera model)
  3) Filter: must have GPS, inside Koh Phangan bbox, AGL >= 25m
  4) Dedup: perceptual hash (pHash) — skip >98% similar to existing
  5) Copy survivors to drone-imagery/clean/<batch>/
  6) Write manifest.json with all metadata + GSD + footprint bounds
"""
import os, sys, json, subprocess, shutil
from pathlib import Path
from datetime import datetime

ROOT = Path(__file__).resolve().parents[2]
RAW_DIR = ROOT / "drone-imagery" / "raw"
CLEAN_DIR = ROOT / "drone-imagery" / "clean"
CAMERAS = json.loads((ROOT / "drone-imagery" / "cameras.json").read_text())["cameras"]

# Koh Phangan bounding box (generous)
KP_BBOX = {"lat_min": 9.65, "lat_max": 9.83, "lon_min": 99.94, "lon_max": 100.12}
MIN_AGL_M = 25.0           # below this = not an aerial
DEDUP_HAMMING_MAX = 4      # pHash bits differing; <=4 ≈ >94% similar

# ---------- EXIF ----------
EXIF_TAGS = [
    "-GPSLatitude", "-GPSLongitude", "-GPSAltitude", "-AbsoluteAltitude",
    "-RelativeAltitude", "-GimbalYawDegree", "-GimbalPitchDegree", "-GimbalRollDegree",
    "-FlightYawDegree", "-FocalLength", "-FocalLengthIn35mmFormat",
    "-ImageWidth", "-ImageHeight", "-Model", "-DateTimeOriginal",
    "-FNumber", "-ExposureTime", "-ISO", "-Orientation"
]

def run_exif(paths):
    if not paths: return []
    cmd = ["exiftool", "-j", "-n"] + EXIF_TAGS + [str(p) for p in paths]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0 and not r.stdout:
        print(f"[EXIF ERR] {r.stderr[:200]}")
        return []
    return json.loads(r.stdout) if r.stdout else []

def camera_profile(model_str):
    """Match exif Model to cameras.json entry."""
    if not model_str: return None, None
    m = model_str.upper()
    for key, cam in CAMERAS.items():
        if cam["exif_model"].upper() in m:
            return key, cam
    return None, None

def compute_gsd(alt_m, focal_mm, sensor_w_mm, img_w_px):
    if not all([alt_m, focal_mm, sensor_w_mm, img_w_px]): return None
    return round((alt_m * sensor_w_mm * 100) / (focal_mm * img_w_px), 3)  # cm/px

def compute_footprint_bounds(lat, lon, alt_m, yaw_deg, cam):
    """Rough nadir footprint bounds assuming gimbal pitch ≈ -90°."""
    if not all([lat, lon, alt_m, cam]): return None
    sensor = cam["sensor_mm"]
    res = cam["resolution_px"]
    focal = cam["focal_mm"]
    # footprint size in meters
    footprint_w = alt_m * sensor["w"] / focal
    footprint_h = alt_m * sensor["h"] / focal
    # convert m → degrees (approx)
    dlat = (footprint_h / 2) / 111_000
    dlon = (footprint_w / 2) / (111_000 * max(0.3, abs(__import__('math').cos(__import__('math').radians(lat)))))
    return {
        "center": [lat, lon],
        "size_m": [round(footprint_w, 1), round(footprint_h, 1)],
        "bounds": [[lat - dlat, lon - dlon], [lat + dlat, lon + dlon]],
        "yaw_deg": yaw_deg
    }

# ---------- pHash dedup ----------
def phash(path):
    try:
        from PIL import Image
        import imagehash
    except ImportError:
        return None
    try:
        return str(imagehash.phash(Image.open(path)))
    except Exception:
        return None

def hamming(a, b):
    if not a or not b or len(a) != len(b): return 99
    return sum(c1 != c2 for c1, c2 in zip(a, b))

# ---------- Main ----------
def process(batch_name):
    src = RAW_DIR / batch_name
    if not src.exists():
        sys.exit(f"not found: {src}")
    dst = CLEAN_DIR / batch_name
    dst.mkdir(parents=True, exist_ok=True)

    # Collect all images
    all_imgs = sorted([p for p in src.rglob("*") if p.suffix.lower() in (".jpg", ".jpeg", ".png", ".dng")])
    print(f"📂 {batch_name}: {len(all_imgs)} raw images")

    # EXIF in chunks
    exif_data = []
    chunk = 50
    for i in range(0, len(all_imgs), chunk):
        exif_data.extend(run_exif(all_imgs[i:i+chunk]))
    exif_by_path = {d.get("SourceFile"): d for d in exif_data}

    survivors = []
    rejected = {"no_gps": 0, "out_of_bbox": 0, "low_altitude": 0, "dup": 0}
    seen_hashes = []

    for p in all_imgs:
        e = exif_by_path.get(str(p), {})
        lat, lon = e.get("GPSLatitude"), e.get("GPSLongitude")
        alt = e.get("RelativeAltitude") or e.get("GPSAltitude") or e.get("AbsoluteAltitude")

        if lat is None or lon is None:
            rejected["no_gps"] += 1; continue
        if not (KP_BBOX["lat_min"] <= lat <= KP_BBOX["lat_max"]
                and KP_BBOX["lon_min"] <= lon <= KP_BBOX["lon_max"]):
            rejected["out_of_bbox"] += 1; continue
        if alt is not None and alt < MIN_AGL_M:
            rejected["low_altitude"] += 1; continue

        ph = phash(p)
        if ph and any(hamming(ph, h) <= DEDUP_HAMMING_MAX for h in seen_hashes):
            rejected["dup"] += 1; continue
        if ph: seen_hashes.append(ph)

        cam_key, cam = camera_profile(e.get("Model", ""))
        gsd = None
        footprint = None
        if cam:
            gsd = compute_gsd(alt, cam["focal_mm"], cam["sensor_mm"]["w"], cam["resolution_px"]["w"])
            footprint = compute_footprint_bounds(lat, lon, alt,
                                                  e.get("GimbalYawDegree") or e.get("FlightYawDegree"), cam)

        # Copy (symlink would be lighter but ODM+gdal dislike them)
        out = dst / p.name
        if not out.exists():
            shutil.copy2(p, out)

        survivors.append({
            "file": p.name,
            "src": str(p.relative_to(ROOT)),
            "clean": str(out.relative_to(ROOT)),
            "lat": lat, "lon": lon, "alt_m": alt,
            "yaw": e.get("GimbalYawDegree"),
            "pitch": e.get("GimbalPitchDegree"),
            "camera": cam_key or e.get("Model"),
            "resolution": [e.get("ImageWidth"), e.get("ImageHeight")],
            "focal_mm": e.get("FocalLength"),
            "iso": e.get("ISO"),
            "exposure_s": e.get("ExposureTime"),
            "taken_at": e.get("DateTimeOriginal"),
            "gsd_cm_px": gsd,
            "footprint": footprint,
            "phash": ph
        })

    # Manifest
    manifest = {
        "batch": batch_name,
        "processed_at": datetime.utcnow().isoformat() + "Z",
        "raw_count": len(all_imgs),
        "clean_count": len(survivors),
        "rejected": rejected,
        "bbox_used": KP_BBOX,
        "coverage_bounds": None,
        "images": survivors
    }
    if survivors:
        lats = [s["lat"] for s in survivors]
        lons = [s["lon"] for s in survivors]
        manifest["coverage_bounds"] = [[min(lats), min(lons)], [max(lats), max(lons)]]

    out_json = CLEAN_DIR / f"{batch_name}.manifest.json"
    out_json.write_text(json.dumps(manifest, indent=2, ensure_ascii=False))

    print(f"\n✅ {len(survivors)} clean / {len(all_imgs)} raw")
    print(f"   rejected: {rejected}")
    print(f"   manifest → {out_json.relative_to(ROOT)}")
    if manifest["coverage_bounds"]:
        b = manifest["coverage_bounds"]
        print(f"   coverage: lat {b[0][0]:.5f}→{b[1][0]:.5f}, lon {b[0][1]:.5f}→{b[1][1]:.5f}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("batches available:")
        for p in sorted(RAW_DIR.iterdir()) if RAW_DIR.exists() else []:
            if p.is_dir():
                n = sum(1 for _ in p.rglob("*.JPG"))
                print(f"  {p.name}  ({n} JPG)")
        sys.exit(0)
    process(sys.argv[1])
