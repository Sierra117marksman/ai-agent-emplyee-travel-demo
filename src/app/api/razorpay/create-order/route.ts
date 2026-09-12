import { NextResponse } from 'next/server';
import { getPackageById } from '@/lib/packages';
import { getLeadById, saveLead } from '@/lib/crm';
import { createRazorpayOrder } from '@/lib/razorpay';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { packageId, leadId, customerName, customerPhone, customerEmail } = body;

    if (!packageId) {
      return NextResponse.json({ success: false, error: 'packageId is required' }, { status: 400 });
    }

    // 1. Verify package exists in trusted server-side catalog
    const pkg = getPackageById(packageId);
    if (!pkg) {
      return NextResponse.json({ success: false, error: 'Package not found in official catalog' }, { status: 404 });
    }

    // 2. Server strictly determines the token amount (NEVER trust client or LLM)
    const tokenAmountEnv = process.env.BOOKING_TOKEN_AMOUNT_INR;
    const tokenAmountINR = tokenAmountEnv ? parseInt(tokenAmountEnv, 10) : 2000;

    // 3. Retrieve or initialize CRM lead
    const effectiveLeadId = leadId || `lead_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    let lead = getLeadById(effectiveLeadId);

    const now = new Date().toISOString();
    if (!lead) {
      lead = {
        id: effectiveLeadId,
        customerName: customerName || 'Valued Guest',
        customerPhone: customerPhone || '',
        customerEmail: customerEmail || '',
        destination: pkg.destination,
        travelDates: 'Upcoming Month',
        travelers: 2,
        budgetPerPerson: pkg.pricePerPerson,
        tripStyle: pkg.category,
        packageId: pkg.id,
        packageName: pkg.title,
        packagePrice: pkg.pricePerPerson,
        tokenAmount: tokenAmountINR,
        currency: 'INR',
        status: 'TOKEN_PENDING',
        agentName: 'Arjun Patel (AI Travel Specialist)',
        chatTranscript: [],
        createdAt: now,
        updatedAt: now
      };
    } else {
      lead.packageId = pkg.id;
      lead.packageName = pkg.title;
      lead.packagePrice = pkg.pricePerPerson;
      lead.tokenAmount = tokenAmountINR;
      lead.status = 'TOKEN_PENDING';
      if (customerName) lead.customerName = customerName;
      if (customerPhone) lead.customerPhone = customerPhone;
      if (customerEmail) lead.customerEmail = customerEmail;
    }

    // 4. Create official Razorpay Order
    const orderResult = await createRazorpayOrder(tokenAmountINR, effectiveLeadId, {
      leadId: effectiveLeadId,
      packageId: pkg.id,
      packageName: pkg.title
    });

    // 5. Store order ID on the lead
    lead.razorpayOrderId = orderResult.orderId;
    saveLead(lead);

    return NextResponse.json({
      success: true,
      orderId: orderResult.orderId,
      amount: orderResult.amount,
      currency: orderResult.currency,
      keyId: orderResult.keyId,
      leadId: effectiveLeadId,
      packageTitle: pkg.title
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create payment order';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
