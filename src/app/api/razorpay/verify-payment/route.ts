import { NextResponse } from 'next/server';
import { getLeadById, saveLead } from '@/lib/crm';
import { verifyRazorpaySignature } from '@/lib/razorpay';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const orderId = body.orderId || body.razorpay_order_id;
    const paymentId = body.paymentId || body.razorpay_payment_id;
    const signature = body.signature || body.razorpay_signature;
    const leadId = body.leadId;

    if (!orderId || !paymentId || !signature || !leadId) {
      return NextResponse.json(
        { success: false, error: 'Missing required payment verification parameters' },
        { status: 400 }
      );
    }

    const lead = getLeadById(leadId);
    if (!lead) {
      return NextResponse.json(
        { success: false, error: 'Referenced CRM lead not found' },
        { status: 404 }
      );
    }

    // Idempotency: Check if already verified
    if (lead.status === 'BOOKING_CONFIRMED' && lead.razorpayPaymentId === paymentId) {
      return NextResponse.json({
        success: true,
        status: 'BOOKING_CONFIRMED',
        message: 'Payment was previously verified and confirmed',
        lead
      });
    }

    // Cryptographic HMAC-SHA256 Signature Verification
    const isValidSignature = verifyRazorpaySignature(orderId, paymentId, signature);

    if (!isValidSignature) {
      lead.status = 'PAYMENT_FAILED';
      lead.updatedAt = new Date().toISOString();
      saveLead(lead);

      return NextResponse.json(
        {
          success: false,
          error: 'Cryptographic signature verification failed. Potential tampering detected.',
          status: 'PAYMENT_FAILED'
        },
        { status: 400 }
      );
    }

    // Signature is cryptographically authentic -> Transition state to BOOKING_CONFIRMED
    lead.status = 'BOOKING_CONFIRMED';
    lead.razorpayPaymentId = paymentId;
    lead.razorpayOrderId = orderId;
    lead.updatedAt = new Date().toISOString();
    const saved = saveLead(lead);

    return NextResponse.json({
      success: true,
      status: 'BOOKING_CONFIRMED',
      message: 'Booking token verified successfully',
      lead: saved
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Payment verification failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
