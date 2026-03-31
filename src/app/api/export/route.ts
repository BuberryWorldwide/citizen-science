import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/connection';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv';

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (searchParams.get('species')) {
      conditions.push(`t.species ILIKE $${paramIdx}`);
      params.push(`%${searchParams.get('species')}%`);
      paramIdx++;
    }

    if (searchParams.get('accessibility')) {
      conditions.push(`t.accessibility = $${paramIdx}`);
      params.push(searchParams.get('accessibility'));
      paramIdx++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await query(
      `SELECT
        t.id, t.species, t.species_variety, t.lat, t.lon,
        t.accessibility, t.status, t.use_potential, t.notes,
        t.created_at, t.ushahidi_post_id,
        o.observed_at, o.health, o.trunk_width, o.phenology,
        o.fruit_size, o.fruit_sweetness, o.fruit_color,
        o.yield, o.fruit_quality, o.fruiting_month_start, o.fruiting_month_end,
        o.reliability, o.notes as observation_notes
      FROM trees t
      LEFT JOIN LATERAL (
        SELECT * FROM observations WHERE tree_id = t.id ORDER BY observed_at DESC LIMIT 1
      ) o ON true
      ${where}
      ORDER BY t.created_at DESC`,
      params
    );

    if (format === 'json') {
      return NextResponse.json({ success: true, data: result.rows });
    }

    // CSV
    const headers = [
      'id', 'species', 'species_variety', 'lat', 'lon',
      'accessibility', 'status', 'use_potential', 'notes',
      'created_at', 'ushahidi_post_id',
      'last_observed_at', 'health', 'trunk_width', 'phenology',
      'fruit_size', 'fruit_sweetness', 'fruit_color',
      'yield', 'fruit_quality', 'fruiting_month_start', 'fruiting_month_end',
      'reliability', 'observation_notes',
    ];

    const csvRows = [headers.join(',')];
    for (const row of result.rows) {
      const values = [
        row.id, row.species, row.species_variety, row.lat, row.lon,
        row.accessibility, row.status,
        row.use_potential ? `"${(row.use_potential as string[]).join(';')}"` : '',
        row.notes ? `"${String(row.notes).replace(/"/g, '""')}"` : '',
        row.created_at, row.ushahidi_post_id,
        row.observed_at, row.health, row.trunk_width, row.phenology,
        row.fruit_size, row.fruit_sweetness, row.fruit_color,
        row.yield, row.fruit_quality, row.fruiting_month_start, row.fruiting_month_end,
        row.reliability,
        row.observation_notes ? `"${String(row.observation_notes).replace(/"/g, '""')}"` : '',
      ];
      csvRows.push(values.map(v => v ?? '').join(','));
    }

    return new NextResponse(csvRows.join('\n'), {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="citizen-science-export-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ success: false, error: 'Export failed' }, { status: 500 });
  }
}
