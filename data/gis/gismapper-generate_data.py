import json
import csv
import random
import os

ROOF_JS_PATH = '/Users/kanieltordjman/Desktop/projects/copenhagen-solar/roof-scanner/buildings_data.js'
KPG_LANDS_CSV = '/Users/kanieltordjman/.gemini/antigravity/scratch/thai_land_scraper/koh_phangan_lands_data.csv'
SAMUI_LANDS_CSV = '/Users/kanieltordjman/.gemini/antigravity/scratch/thai_land_scraper/thai_lands_data.csv'
OUTPUT_GEOJSON = '/Users/kanieltordjman/Desktop/projects/copenhagen-solar/gis-mapper/data.geojson'

# Island Bounds (approximate) for randomizing coordinates of lands
BOUNDS = {
    'kpg': {'min_lat': 9.68, 'max_lat': 9.79, 'min_lng': 99.96, 'max_lng': 100.06},
    'samui': {'min_lat': 9.42, 'max_lat': 9.57, 'min_lng': 99.93, 'max_lng': 100.06}
}

features = []

# --- 1. LOAD EXPLORATORY ROOF DATA ---
try:
    with open(ROOF_JS_PATH, 'r', encoding='utf-8') as f:
        content = f.read()
        # Find the JSON array
        start_idx = content.find('[{')
        if start_idx != -1:
            json_str = content[start_idx:]
            # it might have a semicolon at the end
            if json_str.endswith(';'):
                json_str = json_str[:-1]
            roofs = json.loads(json_str)
            for r in roofs:
                
                geometry = {
                    "type": "Point",
                    "coordinates": [r['lo'], r['la']]
                }
                
                # If it has a polygon, use it instead
                if 'poly' in r and len(r['poly']) >= 3:
                    geometry = {
                        "type": "Polygon",
                        "coordinates": [r['poly']]
                    }

                title = r.get('n')
                if not title:
                    title = r.get('c', 'Unknown Building').title()

                f = {
                    "type": "Feature",
                    "geometry": geometry,
                    "properties": {
                        "id": f"roof_{r['i']}",
                        "type": "roof",
                        "status": "private", 
                        "title": title,
                        "location": "Koh Phangan",
                        "size": f"{r.get('a', 0)} m²",
                        "price": "N/A",
                        "link": "N/A",
                        "owner": "Unknown",
                        "phone": r.get('ph', 'Unknown') or 'Unknown'
                    }
                }
                features.append(f)
    print(f"Loaded {len(roofs)} roofs.")
except Exception as e:
    print(f"Error loading roofs: {e}")

# --- 2. LOAD LAND CSV DATA ---
def process_lands(csv_path, island_key, location_str):
    if not os.path.exists(csv_path):
        print(f"CSV not found: {csv_path}")
        return
    
    with open(csv_path, newline='', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        cnt = 0
        b = BOUNDS[island_key]
        for row in reader:
            lat = random.uniform(b['min_lat'], b['max_lat'])
            lng = random.uniform(b['min_lng'], b['max_lng'])
            
            # Create a mock polygon roughly corresponding to size (just for visual representation)
            # size in m2 -> approx side length in meters
            try:
                area = float(row['Size'].replace('m²', '').replace(',', '').strip())
            except:
                area = 1000
            
            # rough conversion: 1 degree lat is ~111km. 
            side_deg = ((area ** 0.5) / 111000.0) / 2
            
            poly = [
                [lng - side_deg, lat - side_deg],
                [lng + side_deg, lat - side_deg],
                [lng + side_deg, lat + side_deg],
                [lng - side_deg, lat + side_deg],
                [lng - side_deg, lat - side_deg]
            ]
            
            f = {
                "type": "Feature",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [poly]
                },
                "properties": {
                    "id": f"land_{island_key}_{cnt}",
                    "type": "land",
                    "status": "sale",
                    "title": row.get('Title', 'Land Plot'),
                    "location": location_str,
                    "size": row.get('Size', 'N/A'),
                    "price": row.get('Price', 'N/A'),
                    "link": row.get('Link', 'N/A'),
                    "owner": "Agent",
                    "phone": "See Listing"
                }
            }
            features.append(f)
            cnt += 1
        print(f"Loaded {cnt} lands for {island_key}.")

process_lands(KPG_LANDS_CSV, 'kpg', 'Koh Phangan')
process_lands(SAMUI_LANDS_CSV, 'samui', 'Koh Samui')

# --- 3. SAVE GEOJSON ---
geojson = {
    "type": "FeatureCollection",
    "features": features
}

with open(OUTPUT_GEOJSON, 'w', encoding='utf-8') as f:
    json.dump(geojson, f)
print(f"Saved {len(features)} total features to {OUTPUT_GEOJSON}")
