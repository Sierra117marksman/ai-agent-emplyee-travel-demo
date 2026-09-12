import { NextResponse } from 'next/server';
import { runAgentTurn, arjunAgentConfig, isPriceObjection } from '@/lib/agent';

export { isPriceObjection };

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const messages = Array.isArray(body.messages) ? body.messages : [];

    const result = await runAgentTurn(messages, arjunAgentConfig);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Chat processing failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
