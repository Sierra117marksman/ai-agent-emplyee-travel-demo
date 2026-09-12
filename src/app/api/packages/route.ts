import { NextResponse } from 'next/server';
import { TRAVEL_PACKAGES, searchPackages } from '@/lib/packages';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const maxBudgetParam = searchParams.get('maxBudget');
    const maxBudget = maxBudgetParam ? parseInt(maxBudgetParam, 10) : undefined;

    const packages = query || maxBudget ? searchPackages(query, maxBudget) : TRAVEL_PACKAGES;
    return NextResponse.json({ success: true, packages });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch packages';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
