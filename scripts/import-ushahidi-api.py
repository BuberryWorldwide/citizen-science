#!/usr/bin/env python3
"""
Import all 416 Ushahidi posts via API JSON export into citizen science DB.
Clears existing ushahidi-imported data and re-imports fresh.
"""
import json
import os
import sys
import urllib.request
import psycopg2

DB_URL = "postgresql://buberry_app:Ilovebubies123@192.168.1.251:5432/buberry"
POSTS_FILE = "/home/nhac/projects/buberry/data/citizen-science/api-export/all-posts.json"
PHOTOS_DIR = "/home/nhac/projects/buberry/data/citizen-science/photos"

# Form ID -> species name
FORM_SPECIES = {
    2: "Mulberry", 11: "Pawpaw", 12: "Bradford Pear", 14: "Chestnut",
    15: "Plum", 16: "Persimmon", 18: "Apple", 19: "Hickory",
    20: "Pecan", 21: "Air Layering", 22: "Cherry", 23: "Citrus",
}

# Skip non-tree forms
SKIP_FORMS = {6, 7, 10, 13, 17}  # Service Request/Response, Community Spaces, Bradford Debate, Maintenance

# Form attribute keys for location fields
LOCATION_KEYS = {
    2: "0344b3c3-7a06-4bb3-bed6-1cae951443c0",
    11: "0e137fe5-d856-4ec4-bffd-d0390dcfb103",
    12: "17af8669-76ce-40d4-8476-f3a3f7a5b7f5",
    14: "d03ec1d3-e226-43d7-a8be-e94fc01bc81f",
    15: "b79d2bcc-76c4-4bbb-8c28-bab8adabd772",
    16: "f534ebd7-ba6d-4ac6-856e-fe657ee2c955",
    18: "c9b62b36-ac1d-429b-b64f-85c19dcd5d6b",
}

# Form attribute keys for image fields (list of keys per form)
IMAGE_KEYS = {
    2: ["b343e895-3943-42f0-9bf6-4b74aefe06d6"],
    11: ["c8659b2c-97b5-4e86-8248-8f54b362d4d6", "cb461c05-f9dd-4a56-be84-1a298c1cc2a3",
         "c1dcc3cb-c259-4305-a4fd-71b78e3fa48f", "be9b581f-945a-47bb-af86-d939c0b2c3bc"],
    12: ["df238ad1-b30d-4bfe-944f-5b09ae7a293b"],
    14: ["c1d03ee6-36df-4cc5-bc48-01c07d62e275"],
    15: ["bc7180d0-24ad-42c4-91e7-f384327e0ac9"],
    16: ["c5fef284-cafe-4ff2-981a-7d779f509f81", "ef68cb63-9ef5-4d62-9093-18b40627b715",
         "1dc5a6d3-a715-493b-bb70-b0830d519c8f"],
    18: ["393c41a7-dd47-4d55-8e91-8a3c8e4f1011"],
}

# Form attribute keys for various fields
HEALTH_KEYS = {
    2: "da6f2052-18b9-4f0c-969d-6b7f3fbe5188",
    14: "43f33f01-529b-4fbf-ae0b-2c860691cc9e",
    15: "f946598e-5e9e-42c5-98bc-7fd71e29c53b",
    16: "15971f4f-1e90-4973-88f5-67aff88f716a",
    18: "dc0b5d29-8d91-4547-b7e8-3df36f63c1b2",
}

TRUNK_WIDTH_KEYS = {
    12: "cfbe80eb-6af2-4aea-abd3-6eadf147fc1d",
    14: "3c1d40e7-132d-4c69-af83-35b3cd67dd89",
    15: "59b1d984-36af-455a-ba0a-321dfa88ffa7",
    16: "fb0af506-99f8-4c00-8c5c-120e9d997423",
    18: "830f9f15-c3ab-4378-8fb9-06ff2c58955f",
}

SIZE_KEYS = {
    2: "e99910cf-2aad-4399-8750-c034cb702063",
}

ACCESSIBILITY_KEYS = {
    2: "faee0127-8b5c-42ad-bc20-fbe283fff76a",
    12: "39cbae08-e547-4b01-8796-faa6386843e8",
    14: "a5db08c9-fb17-466b-9cb0-3e397a6fa023",
    15: "48512153-7475-47f8-a214-a92cd8488872",
    18: "5207253b-1b6a-4739-a078-402eef6787fc",
}

PHENOLOGY_KEYS = {
    2: "6a53049c-cef1-4bbc-a3c9-c826042897d8",
    12: "d836ea96-0edf-4a41-be05-bedbe0d6715c",
    14: "4acac400-734f-46ea-b6ae-76d08f7e52fd",
    15: "80ecd859-fd5f-4225-8e5c-b889558bfc66",
    16: "cd69ce48-8505-4a43-9644-8e85f1161e8f",
    18: "2cafad46-9db2-4584-a5db-be61dc6ab790",
}

VARIETY_KEYS = {
    2: "824e9f64-df0c-41a8-91eb-8a930c950dee",
    11: "ec2b9e90-cdf9-4fc3-93f8-fe0f7a54640c",
    14: "4dcf2f8d-747c-4b7b-8000-1cde97673c7b",
    15: "a55eb41d-91a0-4803-8679-c5b3e2e05185",
    16: "669c3ccf-cc85-4601-9761-b38cd1f6584c",
    18: "48f62384-b729-4e43-baab-f0614b838fb6",
}


def get_val(values, key, default=None):
    """Extract a value from Ushahidi's values dict."""
    if not key or key not in values:
        return default
    v = values[key]
    if isinstance(v, list) and len(v) > 0:
        return v[0]
    return default


def get_location(values, form_id):
    """Extract lat/lon from post values."""
    # Try form-specific key first
    loc_key = LOCATION_KEYS.get(form_id)
    if loc_key and loc_key in values:
        loc = get_val(values, loc_key)
        if isinstance(loc, dict) and "lat" in loc:
            return loc["lat"], loc["lon"]

    # Fallback: scan all values for location objects
    for k, v in values.items():
        if isinstance(v, list) and len(v) > 0 and isinstance(v[0], dict) and "lat" in v[0]:
            return v[0]["lat"], v[0]["lon"]

    return None, None


def get_photos(values, form_id):
    """Extract photo URLs from post values."""
    photos = []
    keys = IMAGE_KEYS.get(form_id, [])
    for key in keys:
        if key in values:
            for item in values[key]:
                if isinstance(item, str) and item.strip():
                    photos.append(item.strip())
                elif isinstance(item, dict) and "value" in item:
                    photos.append(item["value"])

    # Also scan all values for anything that looks like a URL
    for k, v in values.items():
        if k in [LOCATION_KEYS.get(form_id, "")]:
            continue
        if isinstance(v, list):
            for item in v:
                if isinstance(item, str) and ("rackcdn.com" in item or ".jpg" in item.lower() or ".png" in item.lower()):
                    if item not in photos:
                        photos.append(item)

    return photos


MEDIA_MAP_FILE = "/home/nhac/projects/buberry/data/citizen-science/api-export/media-map.json"

def load_media_map():
    try:
        with open(MEDIA_MAP_FILE) as f:
            return json.load(f)
    except:
        return {}

def resolve_photo_url(photo_id_or_url, media_map):
    """Resolve a photo reference to a local path."""
    mid = str(photo_id_or_url).strip()
    if mid in media_map:
        info = media_map[mid]
        if info.get("exists"):
            return f"/photos/{info['filename']}"
        return info.get("url")
    return None


def main():
    with open(POSTS_FILE) as f:
        data = json.load(f)

    posts = data["results"]
    print(f"Loaded {len(posts)} posts from API export")

    conn = psycopg2.connect(DB_URL)
    conn.set_client_encoding('UTF8')
    cur = conn.cursor()
    cur.execute("SET search_path TO citizen, public")

    # Clear existing ushahidi imports
    cur.execute("DELETE FROM observation_photos WHERE observation_id IN (SELECT id FROM observations WHERE tree_id IN (SELECT id FROM trees WHERE ushahidi_post_id IS NOT NULL))")
    cur.execute("DELETE FROM observations WHERE tree_id IN (SELECT id FROM trees WHERE ushahidi_post_id IS NOT NULL)")
    cur.execute("DELETE FROM trees WHERE ushahidi_post_id IS NOT NULL")
    conn.commit()
    print("Cleared existing Ushahidi imports")

    media_map = load_media_map()
    print(f"Loaded media map with {len(media_map)} entries")

    stats = {"trees": 0, "observations": 0, "photos": 0, "skipped": 0, "no_location": 0}

    for post in posts:
        form_id = post.get("form", {}).get("id") if post.get("form") else None

        if form_id in SKIP_FORMS or form_id is None:
            stats["skipped"] += 1
            continue

        values = post.get("values", {})
        lat, lon = get_location(values, form_id)

        if lat is None or lon is None:
            stats["no_location"] += 1
            continue

        species = FORM_SPECIES.get(form_id, "Unknown")
        variety = get_val(values, VARIETY_KEYS.get(form_id))
        if isinstance(variety, list):
            variety = variety[0] if variety else None

        accessibility = get_val(values, ACCESSIBILITY_KEYS.get(form_id))
        if isinstance(accessibility, list):
            accessibility = accessibility[0] if accessibility else None

        health = get_val(values, HEALTH_KEYS.get(form_id))
        if isinstance(health, list):
            health = health[0] if health else None

        trunk_width = get_val(values, TRUNK_WIDTH_KEYS.get(form_id))
        size = get_val(values, SIZE_KEYS.get(form_id))

        phenology = get_val(values, PHENOLOGY_KEYS.get(form_id))
        if isinstance(phenology, list):
            phenology = phenology[0] if phenology else None

        title = post.get("title", "")
        content = post.get("content", "")
        notes = f"{title}\n{content}".strip() if content else title

        created = post.get("created", post.get("post_date"))

        # Insert tree
        cur.execute("""
            INSERT INTO trees (species, species_variety, location, lat, lon, accessibility, status,
                             ushahidi_post_id, notes, created_at)
            VALUES (%s, %s, ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography, %s, %s, %s, 'active',
                    %s, %s, %s)
            RETURNING id
        """, [species, variety, lon, lat, lat, lon, accessibility or 'unknown',
              post["id"], notes, created])

        tree_id = cur.fetchone()[0]
        stats["trees"] += 1

        # Insert observation
        cur.execute("""
            INSERT INTO observations (tree_id, observed_at, health, trunk_width, phenology, notes)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
        """, [tree_id, created, health,
              str(trunk_width) if trunk_width else (size if size else None),
              phenology, content or None])

        obs_id = cur.fetchone()[0]
        stats["observations"] += 1

        # Handle photos
        photo_refs = get_photos(values, form_id)
        for ref in photo_refs:
            local_path = resolve_photo_url(ref, media_map)
            if local_path:
                cur.execute("""
                    INSERT INTO observation_photos (observation_id, storage_key, url)
                    VALUES (%s, %s, %s)
                """, [obs_id, ref, local_path])
                stats["photos"] += 1

    conn.commit()
    cur.close()
    conn.close()

    print(f"\nImport complete:")
    print(f"  Trees: {stats['trees']}")
    print(f"  Observations: {stats['observations']}")
    print(f"  Photos: {stats['photos']}")
    print(f"  Skipped (non-tree): {stats['skipped']}")
    print(f"  No location: {stats['no_location']}")


if __name__ == "__main__":
    main()
