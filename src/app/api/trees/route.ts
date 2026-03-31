import { NextRequest, NextResponse } from 'next/server';
import { TreeManager, ObservationManager } from '@/lib/db/trees';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const filters: Parameters<typeof TreeManager.search>[0] = {};

    if (searchParams.get('species')) filters.species = searchParams.get('species')!;
    if (searchParams.get('accessibility')) filters.accessibility = searchParams.get('accessibility')!;

    const south = searchParams.get('south');
    const west = searchParams.get('west');
    const north = searchParams.get('north');
    const east = searchParams.get('east');
    if (south && west && north && east) {
      filters.bbox = {
        south: parseFloat(south), west: parseFloat(west),
        north: parseFloat(north), east: parseFloat(east),
      };
    }

    const lat = searchParams.get('lat');
    const lon = searchParams.get('lon');
    if (lat && lon) {
      filters.lat = parseFloat(lat);
      filters.lon = parseFloat(lon);
      if (searchParams.get('radius')) filters.radius = parseInt(searchParams.get('radius')!);
    }

    const trees = await TreeManager.search(filters);
    return NextResponse.json({ success: true, data: trees });
  } catch (error) {
    console.error('Error fetching trees:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch trees' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.lat || !body.lon) {
      return NextResponse.json({ success: false, error: 'lat and lon are required' }, { status: 400 });
    }

    const tree = await TreeManager.create({
      species: body.species,
      species_variety: body.species_variety,
      lat: body.lat,
      lon: body.lon,
      accessibility: body.accessibility,
      status: body.status,
      use_potential: body.use_potential,
      notes: body.notes,
    });

    // Create first observation if observation data provided
    if (body.health || body.trunk_width || body.phenology || body.observation_notes) {
      await ObservationManager.create({
        tree_id: tree.id,
        health: body.health,
        trunk_width: body.trunk_width,
        phenology: body.phenology,
        notes: body.observation_notes,
      });
    }

    return NextResponse.json({ success: true, data: tree }, { status: 201 });
  } catch (error) {
    console.error('Error creating tree:', error);
    return NextResponse.json({ success: false, error: 'Failed to create tree' }, { status: 500 });
  }
}
