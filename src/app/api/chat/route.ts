import { NextResponse } from 'next/server';
import { TRAVEL_PACKAGES, TravelPackage } from '@/lib/packages';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ExtractedLead {
  destination?: string;
  budgetPerPerson?: number;
  travelers?: number;
  tripStyle?: string;
  travelDates?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
}

function parseLeadHeuristically(messages: ChatMessage[]): ExtractedLead {
  const fullText = messages.map((m) => m.content.toLowerCase()).join(' ');
  const lead: ExtractedLead = {};

  if (fullText.includes('bali')) lead.destination = 'Bali, Indonesia';
  else if (fullText.includes('kashmir')) lead.destination = 'Kashmir, India';
  else if (fullText.includes('dubai')) lead.destination = 'Dubai, UAE';
  else if (fullText.includes('kerala')) lead.destination = 'Kerala, India';
  else if (fullText.includes('thailand') || fullText.includes('phuket')) lead.destination = 'Thailand';
  else if (fullText.includes('maldives')) lead.destination = 'Maldives';

  if (fullText.includes('honeymoon')) lead.tripStyle = 'honeymoon';
  else if (fullText.includes('adventure')) lead.tripStyle = 'adventure';
  else if (fullText.includes('luxury')) lead.tripStyle = 'luxury';
  else if (fullText.includes('family')) lead.tripStyle = 'family';
  else if (fullText.includes('relaxed') || fullText.includes('relax')) lead.tripStyle = 'relaxed';

  const budgetMatch = fullText.match(/(?:budget|around|under|₹|rs\.?)\s*(\d{2,3})[k|000]/i);
  if (budgetMatch) {
    const rawVal = parseInt(budgetMatch[1], 10);
    lead.budgetPerPerson = rawVal < 1000 ? rawVal * 1000 : rawVal;
  }

  const paxMatch = fullText.match(/(\d+)\s*(?:people|person|pax|travellers|travelers|adults)/i);
  if (paxMatch) {
    lead.travelers = parseInt(paxMatch[1], 10);
  } else if (fullText.includes('couple') || fullText.includes('two') || lead.tripStyle === 'honeymoon') {
    lead.travelers = 2;
  }

  const phoneMatch = fullText.match(/(?:\+91[\s-]?)?[6789]\d{9}/);
  if (phoneMatch) {
    lead.customerPhone = phoneMatch[0];
  }

  const emailMatch = fullText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) {
    lead.customerEmail = emailMatch[0];
  }

  return lead;
}

function findMatchingPackages(lead: ExtractedLead): TravelPackage[] {
  let matched = TRAVEL_PACKAGES.filter((p) => {
    if (lead.destination && p.destination.toLowerCase().includes(lead.destination.toLowerCase().split(',')[0])) {
      return true;
    }
    if (lead.tripStyle && p.category === lead.tripStyle) {
      return true;
    }
    return false;
  });

  if (lead.budgetPerPerson) {
    const withinBudget = matched.filter((p) => p.pricePerPerson <= (lead.budgetPerPerson || 100000) * 1.15);
    if (withinBudget.length > 0) matched = withinBudget;
  }

  if (matched.length === 0) {
    matched = TRAVEL_PACKAGES.slice(0, 2);
  }

  return matched.slice(0, 2);
}

async function callGroqLLM(systemPrompt: string, messages: ChatMessage[]): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  try {
    const groqMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content }))
    ];

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: groqMessages,
        temperature: 0.3,
        max_tokens: 500
      })
    });

    if (!res.ok) {
      // Try fallback model if first model is throttled
      const resFallback = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: groqMessages,
          temperature: 0.3,
          max_tokens: 500
        })
      });
      if (resFallback.ok) {
        const data = await resFallback.json();
        return data.choices?.[0]?.message?.content || null;
      }
      return null;
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const messages: ChatMessage[] = Array.isArray(body.messages) ? body.messages : [];

    if (messages.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Namaste! 🙏 Welcome to Wanderlust Journeys. I am Arjun, your senior travel concierge. Where are you thinking of traveling next, and what kind of experience are you dreaming of?',
        suggestedPackages: [],
        extractedLead: {}
      });
    }

    const extractedLead = parseLeadHeuristically(messages);
    const matchedPackages = findMatchingPackages(extractedLead);

    const catalogContext = TRAVEL_PACKAGES.map(
      (p) => `- ID: ${p.id} | ${p.title} (${p.destination}) | ${p.duration} | ₹${p.pricePerPerson.toLocaleString('en-IN')}/person | Category: ${p.category} | Highlights: ${p.highlights.join(', ')}`
    ).join('\n');

    const systemPrompt = `You are Arjun Patel, Senior Travel Sales Specialist at Wanderlust Journeys.
Your mission:
1. Warm, professional, consultative Indian hospitality ("Namaste", "delighted to assist you").
2. Qualify the traveler: Destination, Dates/Month, Number of Travelers, Budget per person, Trip Style (honeymoon, adventure, family, relaxed).
3. Recommend ONLY official packages from our catalog below. NEVER invent packages or prices.
4. When recommending, mention the package title and price clearly.
5. Remind the traveler: "You can lock in your dates with a ₹2,000 booking token, and our senior travel designer will contact you to finalize the custom itinerary and flights."
6. NEVER fabricate fake availability or claim payment is completed on your own.
7. Keep responses concise (2-4 short paragraphs maximum), polished, and encouraging.

OFFICIAL PACKAGE CATALOG:
${catalogContext}
`;

    let assistantText = await callGroqLLM(systemPrompt, messages);

    // Fallback if LLM API is unavailable
    if (!assistantText) {
      if (extractedLead.destination || extractedLead.tripStyle) {
        const pkgNames = matchedPackages.map((p) => `• **${p.title}** (${p.duration} — ₹${p.pricePerPerson.toLocaleString('en-IN')}/person)`).join('\n');
        assistantText = `Wonderful choice! Based on your preference for ${extractedLead.destination || extractedLead.tripStyle}, here are our highest-rated hand-crafted packages:\n\n${pkgNames}\n\nBoth include boutique accommodations, private chauffeur transfers, and guided sightseeing. You can secure your reservation with a **₹2,000 booking token**, and our senior advisor will contact you to finalize the custom flight timings. Which package would you like to explore?`;
      } else {
        assistantText = `I'd love to curate the perfect getaway for you! Could you share roughly what budget you have in mind per person, how many travelers will be joining, and when you are planning to travel?`;
      }
    }

    const shouldShowPackages =
      Boolean(extractedLead.destination || extractedLead.tripStyle || extractedLead.budgetPerPerson) &&
      messages.length >= 2;

    return NextResponse.json({
      success: true,
      message: assistantText,
      suggestedPackages: shouldShowPackages ? matchedPackages : [],
      extractedLead
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Chat processing failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
