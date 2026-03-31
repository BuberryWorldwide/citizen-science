/**
 * Import Ushahidi tree observations into Citizen Science database.
 *
 * Usage: npx tsx scripts/import-ushahidi.ts [path-to-csv]
 * Default CSV: ~/projects/buberry/data/citizen-science/ushahidi-raw-backup-20230317.csv
 */

import { readFileSync } from 'fs';
import { Pool } from 'pg';

const CSV_PATH = process.argv[2] ||
  '/home/nhac/projects/buberry/data/citizen-science/ushahidi-raw-backup-20230317.csv';

const SURVEY_SPECIES_MAP: Record<string, string> = {
  'Mulberry Trees of Tennessee': 'Mulberry',
  'Mulberry Trees Survey': 'Mulberry',
  'Bradford Pear Locations Survey': 'Bradford Pear',
  'The Great Bradford Pear Debate': 'Bradford Pear',
  'Plum Tree Survey': 'Plum',
  'Chestnut Tree Survey': 'Chestnut',
  'Pawpaw Patch Survey': 'Pawpaw',
};

// Skip non-tree surveys
const SKIP_SURVEYS = new Set(['Service Request', 'Service Response', 'Community Spaces Survey']);

interface ParsedRow {
  post_id: number;
  survey: string;
  species: string;
  lat: number;
  lon: number;
  title: string | null;
  description: string | null;
  health: string | null;
  growth_stage: string | null;
  variety: string | null;
  accessibility: string | null;
  size: string | null;
  trunk_width: string | null;
  photo_url: string | null;
  created_at: string;
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(field.trim());
      field = '';
    } else {
      field += ch;
    }
  }
  fields.push(field.trim());
  return fields;
}

function parseRows(csv: string): ParsedRow[] {
  const lines = csv.split('\n').filter(l => l.trim());
  // Skip header + empty row
  const dataLines = lines.slice(2);
  const rows: ParsedRow[] = [];

  for (const line of dataLines) {
    const cols = parseCSVLine(line);
    const postId = parseInt(cols[0]);
    if (isNaN(postId)) continue;

    const survey = cols[1];
    if (SKIP_SURVEYS.has(survey)) continue;

    const species = SURVEY_SPECIES_MAP[survey];
    if (!species) {
      console.log(`Skipping unknown survey: "${survey}" (post ${postId})`);
      continue;
    }

    // Try multiple lat/lon column positions (different survey types use different columns)
    let lat = 0, lon = 0;
    // Mulberry: cols 17,18; Bradford/others may use cols 28,29 (Tree Location) or 34,35
    const latLonPairs = [
      [parseFloat(cols[17]), parseFloat(cols[18])],
      [parseFloat(cols[28]), parseFloat(cols[29])],
      [parseFloat(cols[34]), parseFloat(cols[35])],
      [parseFloat(cols[47]), parseFloat(cols[48])],
    ];

    for (const [tryLat, tryLon] of latLonPairs) {
      if (!isNaN(tryLat) && !isNaN(tryLon) && tryLat !== 0 && tryLon !== 0) {
        lat = tryLat;
        lon = tryLon;
        break;
      }
    }

    if (lat === 0 || lon === 0) {
      console.log(`No coordinates for post ${postId} (${survey}), skipping`);
      continue;
    }

    // Photo URL: check multiple image columns
    let photoUrl: string | null = null;
    for (const idx of [21, 31, 42, 49]) {
      if (cols[idx] && cols[idx].startsWith('http')) {
        photoUrl = cols[idx];
        break;
      }
    }

    rows.push({
      post_id: postId,
      survey,
      species,
      lat, lon,
      title: cols[12] || null,
      description: cols[13] || null,
      health: cols[14] || null,
      growth_stage: cols[15] || null,
      variety: cols[16] || null,
      accessibility: cols[19] || null,
      size: cols[20] || null,
      trunk_width: cols[27] || null,
      photo_url: photoUrl,
      created_at: cols[3] || new Date().toISOString(),
    });
  }

  return rows;
}

// Deduplicate: same species within 10m = same tree
function deduplicateTrees(rows: ParsedRow[]): Map<string, ParsedRow[]> {
  const treeGroups = new Map<string, ParsedRow[]>();
  const THRESHOLD_DEG = 10 / 111000; // ~10 meters in degrees

  for (const row of rows) {
    let foundKey: string | null = null;

    for (const [key, group] of treeGroups) {
      const first = group[0];
      if (first.species !== row.species) continue;
      const dlat = Math.abs(first.lat - row.lat);
      const dlon = Math.abs(first.lon - row.lon);
      if (dlat < THRESHOLD_DEG && dlon < THRESHOLD_DEG) {
        foundKey = key;
        break;
      }
    }

    if (foundKey) {
      treeGroups.get(foundKey)!.push(row);
    } else {
      const key = `${row.species}-${row.lat.toFixed(6)}-${row.lon.toFixed(6)}`;
      treeGroups.set(key, [row]);
    }
  }

  return treeGroups;
}

async function main() {
  console.log(`Reading CSV: ${CSV_PATH}`);
  const csv = readFileSync(CSV_PATH, 'utf-8');
  const rows = parseRows(csv);
  console.log(`Parsed ${rows.length} valid observations`);

  const treeGroups = deduplicateTrees(rows);
  console.log(`Deduplicated to ${treeGroups.size} unique trees`);

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  // Use citizen schema for tree tables
  await pool.query('SET search_path TO citizen, public');

  let treesCreated = 0;
  let obsCreated = 0;
  let photosCreated = 0;

  try {
    for (const [, observations] of treeGroups) {
      const first = observations[0];

      // Map accessibility values
      let accessibility = 'unknown';
      if (first.accessibility) {
        const a = first.accessibility.toLowerCase();
        if (a.includes('public')) accessibility = 'public';
        else if (a.includes('road')) accessibility = 'roadside';
        else if (a.includes('private')) accessibility = 'private';
        else if (a.includes('permission')) accessibility = 'permission_needed';
      }

      // Create tree
      const treeResult = await pool.query(
        `INSERT INTO trees (species, species_variety, location, lat, lon, accessibility, status, created_at, ushahidi_post_id, notes)
         VALUES ($1, $2, ST_SetSRID(ST_MakePoint($4, $3), 4326)::geography, $3, $4, $5, 'active', $6, $7, $8)
         RETURNING id`,
        [
          first.species,
          first.variety || null,
          first.lat, first.lon,
          accessibility,
          first.created_at,
          first.post_id,
          first.description || first.title || null,
        ]
      );
      const treeId = treeResult.rows[0].id;
      treesCreated++;

      // Create observations
      for (const obs of observations) {
        // Map health
        let health: string | null = null;
        if (obs.health) {
          const h = obs.health.toLowerCase();
          if (h.includes('good') || h.includes('healthy')) health = 'good';
          else if (h.includes('fair')) health = 'fair';
          else if (h.includes('poor')) health = 'poor';
          else if (h.includes('dead')) health = 'dead';
        }

        // Map trunk width
        let trunkWidth: string | null = null;
        if (obs.trunk_width || obs.size) {
          const tw = (obs.trunk_width || obs.size || '').toLowerCase();
          if (tw.includes('small') || tw.includes('< 2') || tw.includes('thin')) trunkWidth = 'small';
          else if (tw.includes('large') || tw.includes('6') || tw.includes('thick')) trunkWidth = 'large';
          else if (tw) trunkWidth = 'medium';
        }

        // Map growth stage to phenology
        let phenology: string | null = null;
        if (obs.growth_stage) {
          const g = obs.growth_stage.toLowerCase();
          if (g.includes('dormant')) phenology = 'dormant';
          else if (g.includes('bud')) phenology = 'bud_break';
          else if (g.includes('leaf')) phenology = 'leaf_out';
          else if (g.includes('flower')) phenology = 'flowering';
          else if (g.includes('fruit')) phenology = 'fruiting';
          else if (g.includes('ripe')) phenology = 'ripe_fruit';
        }

        const obsResult = await pool.query(
          `INSERT INTO observations (tree_id, observed_at, health, trunk_width, phenology, notes, synced, local_id)
           VALUES ($1, $2, $3, $4, $5, $6, true, $7)
           RETURNING id`,
          [
            treeId,
            obs.created_at,
            health, trunkWidth, phenology,
            [obs.title, obs.description].filter(Boolean).join(' - ') || null,
            `ushahidi-${obs.post_id}`,
          ]
        );
        obsCreated++;

        // Create photo reference
        if (obs.photo_url) {
          await pool.query(
            `INSERT INTO observation_photos (observation_id, storage_key, url, synced, local_id)
             VALUES ($1, $2, $3, true, $4)`,
            [obsResult.rows[0].id, obs.photo_url, obs.photo_url, `ushahidi-photo-${obs.post_id}`]
          );
          photosCreated++;
        }
      }
    }

    console.log(`\nImport complete:`);
    console.log(`  Trees created: ${treesCreated}`);
    console.log(`  Observations created: ${obsCreated}`);
    console.log(`  Photos referenced: ${photosCreated}`);
  } catch (err) {
    console.error('Import error:', err);
    throw err;
  } finally {
    await pool.end();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
