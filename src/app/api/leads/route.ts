import { NextResponse } from 'next/server';
import { getAllLeads, saveLead, LeadRecord } from '@/lib/crm';

export async function GET() {
  try {
    const leads = getAllLeads();
    return NextResponse.json({ success: true, leads });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch leads';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid JSON payload' }, { status: 400 });
    }

    const leadId = body.id || `lead_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const record: LeadRecord = {
      id: leadId,
      customerName: body.customerName?.trim() || 'Prospective Traveler',
      customerPhone: body.customerPhone?.trim() || '',
      customerEmail: body.customerEmail?.trim() || '',
      destination: body.destination?.trim() || 'Exploring Options',
      travelDates: body.travelDates?.trim() || 'Flexible',
      travelers: typeof body.travelers === 'number' && body.travelers > 0 ? body.travelers : 0,
      budgetPerPerson: typeof body.budgetPerPerson === 'number' && body.budgetPerPerson > 0 ? body.budgetPerPerson : 0,
      tripStyle: body.tripStyle?.trim() || 'General',
      packageId: body.packageId,
      packageName: body.packageName,
      packagePrice: body.packagePrice,
      tokenAmount: typeof body.tokenAmount === 'number' ? body.tokenAmount : 0,
      currency: 'INR',
      status: body.status || 'NEW',
      agentName: 'Arjun Patel (AI Travel Specialist)',
      chatTranscript: Array.isArray(body.chatTranscript) ? body.chatTranscript : [],
      createdAt: body.createdAt || now,
      updatedAt: now
    };

    const saved = saveLead(record);
    return NextResponse.json({ success: true, lead: saved });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save lead';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
