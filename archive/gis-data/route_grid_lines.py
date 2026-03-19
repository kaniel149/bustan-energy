"""
Route distribution lines along actual roads using OSRM public API.
Updates process_grid_data.py with road-following coordinates instead of
straight-line waypoints that cut across terrain.

OSRM endpoint: http://router.project-osrm.org/route/v1/driving/
Coordinate format: lng,lat (GeoJSON order)
"""

import json
import time
import urllib.request
import urllib.error
import os
import subprocess

OSRM_BASE = "http://router.project-osrm.org/route/v1/driving"
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROCESS_SCRIPT = os.path.join(SCRIPT_DIR, "process_grid_data.py")

# ------------------------------------------------------------------
# Waypoints for each distribution line  (lng, lat)
# ------------------------------------------------------------------

DISTRIBUTION_LINES = {
    "west_coast": {
        "label": "West Coast Feeder",
        # fragment that uniquely identifies this line's name in the source
        "name_fragment": "West Coast Feeder",
        "waypoints": [
            [99.9948, 9.7066],  # Substation
            [99.9930, 9.7085],
            [99.9914, 9.7113],  # Thongsala center
            [99.9880, 9.7145],  # Thongsala west
            [99.9840, 9.7180],  # Towards Wok Tum
            [99.9810, 9.7210],  # Wok Tum area
            [99.9795, 9.7250],  # Hin Kong
            [99.9781, 9.7284],  # Sri Thanu
            [99.9760, 9.7340],
            [99.9745, 9.7400],
            [99.9730, 9.7460],  # Approaching Mae Haad
            [99.9724, 9.7536],  # Mae Haad
            [99.9710, 9.7580],
            [99.9690, 9.7620],  # Coastal road north
            [99.9670, 9.7660],  # South Chaloklum
            [99.9651, 9.7700],  # Chaloklum
        ],
    },
    "south": {
        "label": "South Feeder",
        "name_fragment": "South Feeder",
        "waypoints": [
            [99.9948, 9.7066],  # Substation
            [99.9960, 9.7030],
            [99.9980, 9.6990],
            [100.0050, 9.6980],
            [100.0130, 9.6985],
            [100.0210, 9.6982],
            [100.0313, 9.6979],  # Ban Khai
            [100.0400, 9.6940],
            [100.0470, 9.6890],  # Leela Beach
            [100.0530, 9.6850],
            [100.0580, 9.6810],
            [100.0620, 9.6790],
            [100.0642, 9.6769],  # Haad Rin
        ],
    },
    "northeast": {
        "label": "Northeast Feeder",
        "name_fragment": "Northeast Feeder",
        "waypoints": [
            [99.9948, 9.7066],  # Substation
            [99.9970, 9.7100],
            [100.0010, 9.7150],
            [100.0080, 9.7200],
            [100.0150, 9.7250],
            [100.0220, 9.7290],
            [100.0289, 9.7329],  # East coast
            [100.0350, 9.7390],
            [100.0420, 9.7460],  # Than Sadet
            [100.0480, 9.7530],
            [100.0520, 9.7580],
            [100.0549, 9.7630],  # Thong Nai Pan
        ],
    },
}

# Submarine cable: sea portion stays straight; we route only the land
# approach on the Phangan side (last 2 waypoints of the original list).
CABLE_SEA_COORDS = [
    [100.0032039, 9.5672669],  # Samui end
    [100.0010000, 9.5900000],
    [99.9980000, 9.6200000],
    [99.9960000, 9.6500000],
    # [99.9950000, 9.6800000],  <- beach landing point, becomes start of land segment
]
CABLE_LAND_WAYPOINTS = [
    [99.9950000, 9.6800000],  # approximate beach landing / last sea point
    [99.9947557, 9.7064741],  # Phangan substation
]
CABLE_NAME_FRAGMENT = "115 kV Submarine Cable"


# ------------------------------------------------------------------
# OSRM helpers
# ------------------------------------------------------------------

def build_osrm_url(waypoints):
    """Build OSRM routing URL from list of [lng, lat] waypoints."""
    coords_str = ";".join(f"{lng},{lat}" for lng, lat in waypoints)
    return f"{OSRM_BASE}/{coords_str}?geometries=geojson&overview=full"


def call_osrm(waypoints, label):
    """
    Call OSRM and return road-following coordinates as list of [lng, lat].
    Falls back to original waypoints on any error.
    """
    url = build_osrm_url(waypoints)
    print(f"\n  Calling OSRM for: {label}")
    print(f"  Waypoints in: {len(waypoints)}")
    print(f"  URL: {url[:120]}...")

    try:
        req = urllib.request.Request(url, headers={"User-Agent": "solar-intelligence/1.0"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode())
    except urllib.error.URLError as e:
        print(f"  OSRM request failed: {e} — keeping original waypoints")
        return waypoints
    except Exception as e:
        print(f"  Unexpected error: {e} — keeping original waypoints")
        return waypoints

    if data.get("code") != "Ok" or not data.get("routes"):
        print(f"  OSRM code={data.get('code')} — keeping original waypoints")
        return waypoints

    routed = data["routes"][0]["geometry"]["coordinates"]
    print(f"  Coords out: {len(routed)}")
    return routed


# ------------------------------------------------------------------
# Source-file patching (line-based, bracket-counting)
# ------------------------------------------------------------------

def find_coords_block(lines, name_fragment):
    """
    Find the start and end line indices (inclusive) of the 'coordinates': [...]
    block that belongs to the dict whose 'name' contains name_fragment.

    Returns (coords_open_line, coords_close_line) — 0-based line indices.
    coords_open_line is the line containing '"coordinates": ['.
    coords_close_line is the line containing the matching ']'.
    """
    # Step 1: find the line with the name fragment
    name_line = None
    for i, line in enumerate(lines):
        if '"name":' in line and name_fragment in line:
            name_line = i
            break

    if name_line is None:
        return None, None

    # Step 2: scan forward from name_line to find '"coordinates": ['
    coords_open = None
    for i in range(name_line, min(name_line + 10, len(lines))):
        if '"coordinates"' in lines[i] and "[" in lines[i]:
            coords_open = i
            break

    if coords_open is None:
        return None, None

    # Step 3: count brackets from coords_open to find matching close
    depth = 0
    for i in range(coords_open, len(lines)):
        depth += lines[i].count("[") - lines[i].count("]")
        if depth <= 0 and i > coords_open:
            return coords_open, i

    return None, None


def format_coords_lines(coords, indent=16):
    """Return list of lines (with newline) for coordinate entries."""
    pad = " " * indent
    result = []
    for c in coords:
        result.append(f"{pad}[{c[0]}, {c[1]}],\n")
    return result


def patch_coords_block(lines, name_fragment, new_coords):
    """
    Replace the coordinates list in `lines` (list of str with newlines)
    for the dict whose 'name' contains name_fragment.

    Returns updated list of lines, or original list if block not found.
    """
    open_idx, close_idx = find_coords_block(lines, name_fragment)
    if open_idx is None:
        print(f"  WARNING: Could not locate coordinates block for '{name_fragment}'")
        return lines

    # Determine indentation of the opening "coordinates" line
    open_line = lines[open_idx]
    # Count the leading spaces of the opening bracket line
    bracket_indent = len(open_line) - len(open_line.lstrip())
    coord_indent = bracket_indent + 4  # coordinates sit one level deeper

    # Build new content: keep open bracket line, replace interior, keep close bracket
    new_coord_lines = format_coords_lines(new_coords, indent=coord_indent)

    # The closing line: preserve it as-is (it contains '],' or '],')
    close_line = lines[close_idx]

    # Count original entries (lines between open+1 and close-1)
    original_count = close_idx - open_idx - 1

    updated = (
        lines[:open_idx + 1]        # up to and including "coordinates": [
        + new_coord_lines            # new coordinate entries
        + [close_line]               # the closing ],
        + lines[close_idx + 1:]      # everything after
    )

    print(f"  Patched '{name_fragment}': {original_count} lines → {len(new_coord_lines)} lines ({len(new_coords)} coords)")
    return updated


# ------------------------------------------------------------------
# Main
# ------------------------------------------------------------------

def route_all():
    results = {}

    for key, line in DISTRIBUTION_LINES.items():
        routed = call_osrm(line["waypoints"], line["label"])
        results[key] = {
            "name_fragment": line["name_fragment"],
            "original_count": len(line["waypoints"]),
            "routed_count": len(routed),
            "coordinates": routed,
        }
        time.sleep(1)

    # Cable land portion
    routed_land = call_osrm(CABLE_LAND_WAYPOINTS, "Submarine Cable land approach")
    time.sleep(1)

    cable_coords = CABLE_SEA_COORDS + routed_land
    results["cable"] = {
        "name_fragment": CABLE_NAME_FRAGMENT,
        "original_count": len(CABLE_SEA_COORDS) + len(CABLE_LAND_WAYPOINTS),
        "routed_count": len(cable_coords),
        "coordinates": cable_coords,
    }

    return results


def apply_patches(results):
    with open(PROCESS_SCRIPT) as f:
        lines = f.readlines()

    for key, data in results.items():
        lines = patch_coords_block(lines, data["name_fragment"], data["coordinates"])

    with open(PROCESS_SCRIPT, "w") as f:
        f.writelines(lines)

    print(f"\nUpdated: {PROCESS_SCRIPT}")


def verify_syntax():
    """Quick syntax check via py_compile."""
    import py_compile
    try:
        py_compile.compile(PROCESS_SCRIPT, doraise=True)
        print("Syntax check: OK")
        return True
    except py_compile.PyCompileError as e:
        print(f"Syntax check FAILED: {e}")
        return False


if __name__ == "__main__":
    print("=== OSRM Road Routing for Ko Phangan Grid Lines ===\n")

    print("Step 1: Fetching road-following routes from OSRM...")
    results = route_all()

    print("\n\nStep 2: Patching process_grid_data.py...")
    apply_patches(results)

    print("\nStep 3: Verifying Python syntax...")
    ok = verify_syntax()

    if ok:
        print("\nStep 4: Regenerating GeoJSON files...")
        proc = subprocess.run(
            ["python3", PROCESS_SCRIPT],
            capture_output=True, text=True
        )
        print(proc.stdout)
        if proc.stderr:
            print("STDERR:", proc.stderr)
        if proc.returncode == 0:
            print("\nDone. grid_all.geojson regenerated successfully.")
        else:
            print(f"\nERROR: process_grid_data.py exited with code {proc.returncode}")
    else:
        print("\nSkipping GeoJSON regeneration due to syntax error.")
        print("Restoring original file from git...")
        subprocess.run(
            ["git", "checkout", "--", "gis-mapper/grid-data/process_grid_data.py"],
            cwd=os.path.dirname(os.path.dirname(SCRIPT_DIR))
        )
