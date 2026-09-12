import crypto from 'crypto';
import Razorpay from 'razorpay';

function getRazorpayCredentials() {
  const rawKeyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const rawKeySecret = process.env.RAZORPAY_KEY_SECRET;

  const keyId = rawKeyId ? rawKeyId.trim() : undefined;
  const keySecret = rawKeySecret ? rawKeySecret.trim() : undefined;

  if (!keyId || !keySecret) {
    throw new Error('Razorpay credentials missing on server. Check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.');
  }

  return { keyId, keySecret };
}

export function getRazorpayClient(): Razorpay {
  const { keyId, keySecret } = getRazorpayCredentials();
  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret
  });
}

export interface RazorpayOrderResult {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

export async function createRazorpayOrder(
  amountInINR: number,
  receipt: string,
  notes?: Record<string, string>
): Promise<RazorpayOrderResult> {
  const { keyId } = getRazorpayCredentials();
  const rzp = getRazorpayClient();

  const amountInPaise = Math.round(amountInINR * 100);

  const order = await rzp.orders.create({
    amount: amountInPaise,
    currency: 'INR',
    receipt,
    notes: notes || {}
  });

  return {
    orderId: order.id,
    amount: amountInINR,
    currency: 'INR',
    keyId
  };
}

export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  try {
    const { keySecret } = getRazorpayCredentials();
    const payload = `${orderId}|${paymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'utf-8'),
      Buffer.from(signature, 'utf-8')
    );
  } catch {
    return false;
  }
}
