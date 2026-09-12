import { NextResponse } from 'next/server';
import { getLeadById, saveLead, recordPaymentAudit } from '@/lib/crm';
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

    // 1. Cryptographic HMAC-SHA256 Signature Verification
    const isValidSignature = verifyRazorpaySignature(orderId, paymentId, signature);

    if (!isValidSignature) {
      const existingLead = getLeadById(leadId);
      if (existingLead) {
        existingLead.status = 'PAYMENT_FAILED';
        existingLead.updatedAt = new Date().toISOString();
        saveLead(existingLead);
      }

      return NextResponse.json(
        {
          success: false,
          error: 'Cryptographic signature verification failed. Potential tampering detected.',
          status: 'PAYMENT_FAILED'
        },
        { status: 400 }
      );
    }

    // 2. Signature is cryptographically authentic -> Look up existing lead
    const lead = getLeadById(leadId);

    // Integrity Rule: NEVER manufacture an unknown confirmed lead out of thin air.
    // Record payment for reconciliation and return structured status.
    if (!lead) {
      recordPaymentAudit({
        orderId,
        paymentId,
        leadId,
        signature,
        status: 'PAYMENT_VERIFIED_BUT_LEAD_MISSING',
        recordedAt: new Date().toISOString()
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Payment verified cryptographically, but original booking lead is missing. Flagged for manual reconciliation.',
          code: 'PAYMENT_VERIFIED_BUT_LEAD_MISSING'
        },
        { status: 422 }
      );
    }

    // 3. Verify order ID matches if recorded on lead
    if (lead.razorpayOrderId && lead.razorpayOrderId !== orderId) {
      return NextResponse.json(
        { success: false, error: 'Order ID mismatch between payment payload and CRM lead record.' },
        { status: 400 }
      );
    }

    // 4. Idempotency: Check if already verified
    if (lead.status === 'BOOKING_CONFIRMED' && lead.razorpayPaymentId === paymentId) {
      return NextResponse.json({
        success: true,
        status: 'BOOKING_CONFIRMED',
        message: 'Payment was previously verified and confirmed',
        lead
      });
    }

    // 5. Authentic and validated -> Transition state to BOOKING_CONFIRMED
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
