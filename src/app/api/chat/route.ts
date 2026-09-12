import { NextResponse } from 'next/server';
import {
  TRAVEL_PACKAGES,
  queryCatalog,
  getAllAvailableDestinations
} from '@/lib/packages';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface CustomerState {
  destination?: string;
  travelDates?: string;
  durationDays?: number;
  travelers?: number;
  budgetPerPerson?: number;
  tripStyle?: string;
  isDomesticOnly?: boolean;
  excludePackageId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  requestedUncatalogedDestination?: string;
}

function extractCustomerState(messages: ChatMessage[]): CustomerState {
  const state: CustomerState = {};
  const userMessages = messages.filter((m) => m.role === 'user');
  const fullText = userMessages.map((m) => m.content).join(' ');
  const lower = fullText.toLowerCase();

  // 1. Budget extraction (handles 35k, 50k, 80,000, ₹35,000, rs 60k, around 50,000)
  const budgetMatch = lower.match(/(?:budget(?:\s*is|\s*of)?|around|under|approx\.?|max\.?|₹|rs\.?|inr)\s*(?:of\s*)?(?:₹|rs\.?|inr)?\s*([0-9]{1,3}(?:,[0-9]{3})*|\d{2,3})k?\b/i);
  if (budgetMatch) {
    const rawStr = budgetMatch[1].replace(/,/g, '');
    const num = parseInt(rawStr, 10);
    if (!isNaN(num)) {
      if (budgetMatch[0].toLowerCase().includes('k')) {
        state.budgetPerPerson = num * 1000;
      } else if (num >= 1000) {
        state.budgetPerPerson = num;
      } else if (
        budgetMatch[0].includes('₹') ||
        budgetMatch[0].toLowerCase().includes('rs') ||
        budgetMatch[0].toLowerCase().includes('inr') ||
        budgetMatch[0].toLowerCase().includes('budget')
      ) {
        state.budgetPerPerson = num * 1000;
      }
    }
  }

  // 2. Travelers count (handles "4 people", "for two", "couple", "family of 5", "2 pax")
  // NOTE: "honeymoon" must NEVER assume 2 travelers automatically
  const paxNumberMatch = lower.match(/(\d+)\s*(?:people|person|pax|travellers|travelers|adults)/i);
  if (paxNumberMatch) {
    state.travelers = parseInt(paxNumberMatch[1], 10);
  } else if (lower.includes('for two') || lower.includes('couple') || lower.includes('2 of us') || lower.includes('two people') || lower.includes('two travelers')) {
    state.travelers = 2;
  } else if (lower.includes('for 4') || lower.includes('4 people') || lower.includes('four people') || lower.includes('four travelers')) {
    state.travelers = 4;
  }

  // 3. Duration extraction (handles "5-day", "6 days", "4 nights")
  const durationMatch = lower.match(/(\d+)\s*(?:days?|nights?|-day)/i);
  if (durationMatch) {
    state.durationDays = parseInt(durationMatch[1], 10);
  }

  // 4. Trip Style & Interests (handles honeymoon, adventure, family, luxury, cold, nature)
  if (lower.includes('honeymoon') || lower.includes('romantic')) {
    state.tripStyle = 'honeymoon';
  } else if (lower.includes('adventure') || lower.includes('snorkeling') || lower.includes('trek')) {
    state.tripStyle = 'adventure';
  } else if (lower.includes('family')) {
    state.tripStyle = 'family';
  } else if (lower.includes('luxury') || lower.includes('5-star') || lower.includes('villa')) {
    state.tripStyle = 'luxury';
  } else if (lower.includes('cold') || lower.includes('snow') || lower.includes('mountain')) {
    state.tripStyle = 'mountains';
  } else if (lower.includes('relax') || lower.includes('peaceful') || lower.includes('ayurveda')) {
    state.tripStyle = 'relaxed';
  }

  // 5. Domestic restriction
  if (lower.includes('in india') || lower.includes('somewhere in india') || lower.includes('domestic')) {
    state.isDomesticOnly = true;
  }

  // 6. Dynamic destination extraction by testing all words against active catalog destinations
  const destinations = getAllAvailableDestinations();
  for (const dest of destinations) {
    if (lower.includes(dest.toLowerCase())) {
      state.destination = dest;
      break;
    }
  }

  // 7. Check for uncataloged destination inquiry (e.g. "Mars", "Tokyo", "Antarctica")
  const destRegex = /(?:visit(?:ing)?|trip\s+to|travel(?:ing)?\s+to|packages?\s+(?:for|to|in|of)|holiday\s+in|vacation\s+(?:in|to)|tours?\s+(?:in|of|to)|flights?\s+to|going\s+to)\s+([a-zA-Z]{3,20})/i;
  const matchDest = lower.match(destRegex);
  if (matchDest && !state.destination) {
    const candidate = matchDest[1].trim().toLowerCase();
    const commonStopwords = new Set([
      'wanderlust', 'journeys', 'wanderlustjourneys', 'arjun', 'patel',
      'agency', 'company', 'concierge', 'advisor', 'team', 'service', 'website',
      'honeymoon', 'family', 'budget', 'couple', 'adventure', 'luxury', 'relaxed',
      'vacation', 'holiday', 'trip', 'travel', 'tour', 'journey', 'destination',
      'place', 'location', 'spot', 'package', 'packages', 'itinerary', 'itineraries',
      'option', 'options', 'deal', 'deals', 'offer', 'resort', 'hotel', 'villa',
      'flight', 'flights', 'booking', 'reservation', 'token', 'payment', 'money',
      'pax', 'person', 'people', 'adult', 'adults', 'child', 'children', 'kid', 'kids',
      'somewhere', 'anywhere', 'nowhere', 'everywhere', 'here', 'there',
      'india', 'domestic', 'international', 'abroad', 'overseas',
      'january', 'february', 'march', 'april', 'may', 'june', 'july',
      'august', 'september', 'october', 'november', 'december',
      'summer', 'winter', 'spring', 'autumn', 'monsoon',
      'month', 'months', 'year', 'years', 'week', 'weeks', 'day', 'days', 'night', 'nights',
      'next', 'upcoming', 'future', 'soon', 'today', 'tomorrow', 'tonight',
      'know', 'see', 'book', 'plan', 'explore', 'help', 'find', 'get', 'make', 'check', 'take',
      'mind', 'advance', 'detail', 'details', 'someone', 'anyone', 'something', 'anything',
      'what', 'which', 'where', 'when', 'who', 'how', 'why', 'this', 'that', 'them', 'these', 'those'
    ]);
    const isKnownCountryOrDest = TRAVEL_PACKAGES.some(
      (p) =>
        p.country.toLowerCase() === candidate ||
        p.destination.toLowerCase().includes(candidate)
    );
    if (!commonStopwords.has(candidate) && !isKnownCountryOrDest) {
      state.requestedUncatalogedDestination = candidate.charAt(0).toUpperCase() + candidate.slice(1);
    }
  }

  // 8. Negative preference (e.g. "Forget Bali", "show me something else", "not Kashmir")
  for (const pkg of TRAVEL_PACKAGES) {
    const destKeywords = pkg.destination.toLowerCase().split(/[\s,&]+/);
    for (const kw of destKeywords) {
      if (kw.length < 3) continue;
      if (
        lower.includes(`forget ${kw}`) ||
        lower.includes(`not ${kw}`) ||
        lower.includes(`other than ${kw}`) ||
        lower.includes(`leave ${kw}`) ||
        lower.includes(`anything but ${kw}`)
      ) {
        state.excludePackageId = pkg.id;
        if (state.destination && state.destination.toLowerCase().includes(kw)) {
          delete state.destination;
        }
      }
    }
  }

  // 9. Contact info extraction
  const phoneMatch = fullText.match(/(?:\+91[\s-]?)?[6789]\d{9}/);
  if (phoneMatch) {
    state.customerPhone = phoneMatch[0];
  }
  const emailMatch = fullText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) {
    state.customerEmail = emailMatch[0];
  }

  return state;
}

async function queryGroq(systemPrompt: string, messages: ChatMessage[]): Promise<string | null> {
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
        temperature: 0.2,
        max_tokens: 500
      })
    });

    if (res.ok) {
      const data = await res.json();
      return data.choices?.[0]?.message?.content || null;
    }
  } catch {
    // Falls back gracefully
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const messages: ChatMessage[] = Array.isArray(body.messages) ? body.messages : [];

    const availableDestinations = getAllAvailableDestinations();

    if (messages.length === 0) {
      return NextResponse.json({
        success: true,
        message: `Namaste! 🙏 Welcome to Wanderlust Journeys. I am Arjun Patel, your senior travel concierge. Where are you thinking of traveling, and what kind of trip are you dreaming of? We currently offer curated journeys across ${availableDestinations.join(', ')}.`,
        suggestedPackages: [],
        extractedLead: {}
      });
    }

    const latestUserMsg = messages[messages.length - 1]?.content || '';
    const latestLower = latestUserMsg.toLowerCase();

    // Extract state dynamically
    const state = extractCustomerState(messages);

    // Rule 1: Special case for unauthorized token requests (e.g. "I want to pay ₹500 instead of ₹2,000")
    const tokenAmount = process.env.BOOKING_TOKEN_AMOUNT_INR || '2000';
    const isCustomTokenAttempt =
      (latestLower.includes('instead') && (latestLower.includes('pay') || latestLower.includes('token') || latestLower.includes('give') || latestLower.includes('₹') || latestLower.includes('rs'))) ||
      (/pay\s*(?:₹|rs\.?|inr)?\s*(\d+)/i.test(latestLower) && !latestLower.includes(tokenAmount) && (latestLower.includes('token') || latestLower.includes('instead') || latestLower.includes('deposit') || latestLower.includes('advance'))) ||
      (latestLower.includes('500') && latestLower.includes('instead')) ||
      latestLower.includes('charge me 10000') ||
      latestLower.includes('pay 10000');

    if (isCustomTokenAttempt) {
      return NextResponse.json({
        success: true,
        message: `Our booking reservation token is fixed at ₹${tokenAmount} per our standard agency policy. This token is 100% refundable and serves to lock in your private villa allocation and chauffeur slots while our travel designer customizes your flights. The system cannot accept custom token amounts. Would you like to proceed with the standard ₹${tokenAmount} booking token?`,
        suggestedPackages: [],
        extractedLead: state
      });
    }

    // Rule 2: Special case for unverified payment assertions (e.g. "I already paid")
    const isUnverifiedPaymentClaim =
      latestLower.includes('already paid') ||
      latestLower.includes('i have paid') ||
      latestLower.includes('payment done') ||
      latestLower.includes('transferred the money') ||
      latestLower.includes('sent the money');

    if (isUnverifiedPaymentClaim) {
      return NextResponse.json({
        success: true,
        message: `I cannot independently confirm your booking without automated verification from our payment gateway. If you completed a transaction, our backend will receive the cryptographic confirmation shortly and update your CRM dossier. Please ensure you have finalized the checkout modal or share your transaction reference ID so our human travel desk can assist.`,
        suggestedPackages: [],
        extractedLead: state
      });
    }

    // Rule 3: Destination requested does not exist in catalog (e.g. "Mars", "Paris")
    if (state.requestedUncatalogedDestination && !state.destination) {
      return NextResponse.json({
        success: true,
        message: `We do not currently offer travel packages for ${state.requestedUncatalogedDestination}. Our official 2026 portfolio is curated exclusively for: ${availableDestinations.join(', ')}. Would you like to explore any of these destinations, or should I connect you with our bespoke private charter desk?`,
        suggestedPackages: [],
        extractedLead: state
      });
    }

    // Check if the user has provided enough qualification details to recommend packages.
    // If they only expressed an abstract wish (e.g. "I want a honeymoon trip" or "Looking for a vacation")
    // without destination, budget, or pax/duration, Arjun MUST ask for the missing details first.
    const hasSufficientQualification = Boolean(
      state.destination ||
      state.budgetPerPerson ||
      (state.travelers && state.durationDays)
    );

    if (!hasSufficientQualification) {
      const styleWord = state.tripStyle ? ` ${state.tripStyle}` : '';
      const askMissingPrompt = `You are Arjun Patel, Senior Travel Sales Specialist at Wanderlust Journeys.
The traveler has contacted you.
- If they are inquiring about Wanderlust Journeys, introduce Wanderlust Journeys warmly as a premier luxury travel atelier curating private villa escapes, mountain sanctuaries, and bespoke journeys across: ${availableDestinations.join(', ')}.
- If they are exploring a journey, warmly acknowledge their interest (e.g. in a${styleWord} getaway).
- Inquire about their missing preferences:
  1. Preferred destination or region (or whether they prefer domestic India or international)
  2. Approximate budget per person
  3. Number of travelers and trip duration
CRITICAL RULES:
- DO NOT assume any destination (do NOT assume Bali or Kashmir).
- DO NOT assume any budget (do NOT assume ₹44,999 or ₹45,000).
- DO NOT assume 2 travelers.
- NEVER claim that Wanderlust is an uncataloged destination (Wanderlust Journeys is your agency!).
Keep your response warm, concise, and helpful (1-2 short paragraphs).`;

      const assistantReply = await queryGroq(askMissingPrompt, messages);
      let fallbackPrompt = `Namaste! 🙏 A${styleWord} getaway is a truly wonderful milestone. To help our travel designers curate the perfect experience for you from our official portfolio (${availableDestinations.join(', ')}), could you kindly share:
1. Do you have a preferred destination in mind, or are you open to domestic and international journeys?
2. What is your approximate budget per person?
3. How many travelers will be joining and for how many days?`;

      if (latestLower.includes('wanderlust') || latestLower.includes('who are you') || latestLower.includes('about you') || latestLower.includes('company')) {
        fallbackPrompt = `Namaste! 🙏 Wanderlust Journeys is a premier bespoke travel atelier. We craft ultra-luxury private villa escapes, mountain retreats, and cultural journeys with dedicated chauffeurs, 5-star boutique stays, and VIP concierge access. Our official 2026 portfolio features hand-crafted journeys across ${availableDestinations.join(', ')}. How may I assist with your travel dreams today?`;
      }

      return NextResponse.json({
        success: true,
        message: assistantReply || fallbackPrompt,
        suggestedPackages: [],
        extractedLead: state
      });
    }

    // 4. Query the dynamic catalog using extracted constraints
    const matchedPackages = queryCatalog({
      text: latestUserMsg,
      destination: state.destination,
      maxBudget: state.budgetPerPerson,
      tripType: state.tripStyle,
      durationDays: state.durationDays,
      isDomesticOnly: state.isDomesticOnly,
      excludePackageId: state.excludePackageId
    });

    const catalogSummary = TRAVEL_PACKAGES.map(
      (p) =>
        `- [${p.id}] ${p.name} | Dest: ${p.destination} (${p.country}) | ₹${p.pricePerPerson.toLocaleString('en-IN')}/pax | ${p.duration} | Suitable: ${p.suitableFor.join(', ')} | Highlights: ${p.highlights[0]}`
    ).join('\n');

    const systemPrompt = `You are Arjun Patel, Senior Travel Sales Specialist at Wanderlust Journeys.
PERSONALITY & STANDARDS:
- Warm, consultative, professional Indian hospitality.
- Never invent packages, prices, or destinations not in our official catalog.
- If the traveler's budget is lower than all packages, honestly inform them of our starting package rates.
- Do NOT match fixed scripts. Analyze what the traveler needs and answer dynamically.
- Mention: "You can secure your departure with a refundable ₹2,000 booking token, and our senior travel designer will contact you to finalize flights and custom details."
- If the traveler asks to book an option (e.g., "Can I book the second option?", "let's book option 2"): Confirm their choice warmly, ask for their name and mobile number, and invite them to click "Pay ₹2,000 Booking Token".
- Keep your response to 2-3 focused paragraphs.

CURRENT OFFICIAL CATALOG:
${catalogSummary}

CURRENT CUSTOMER REQUIREMENTS (EXTRACTED):
- Destination: ${state.destination || 'Not specified yet'}
- Budget: ${state.budgetPerPerson ? '₹' + state.budgetPerPerson.toLocaleString('en-IN') + '/pax' : 'Not specified'}
- Travelers: ${state.travelers || 'Not specified'}
- Duration: ${state.durationDays ? state.durationDays + ' days' : 'Not specified'}
- Style: ${state.tripStyle || 'Not specified'}
- India Domestic Only: ${state.isDomesticOnly ? 'Yes' : 'No'}
- Exclude: ${state.excludePackageId || 'None'}
`;

    let assistantText = await queryGroq(systemPrompt, messages);

    // Dynamic data-driven fallback if LLM is unreachable
    if (!assistantText) {
      if (
        latestLower.includes('book the second') ||
        latestLower.includes('second option') ||
        latestLower.includes('option 2') ||
        latestLower.includes('book the first') ||
        latestLower.includes("let's book") ||
        latestLower.includes('can i book')
      ) {
        const chosenPkg =
          latestLower.includes('second') || latestLower.includes('2')
            ? matchedPackages[1] || matchedPackages[0]
            : matchedPackages[0];
        const pkgName = chosenPkg ? `**${chosenPkg.name}**` : 'your selected package';
        assistantText = `Wonderful decision! ${pkgName} is an extraordinary journey. You can confirm your dates by clicking the **Pay ₹2,000 Booking Token** button below. Once your token is confirmed via our secure Razorpay gateway, our senior concierge will connect with you to personalize flights and luxury inclusions. Please also share your full name and mobile number if you haven't already!`;
      } else if (matchedPackages.length > 0) {
        const topMatches = matchedPackages.slice(0, 2);
        const listText = topMatches
          .map((p) => `• **${p.name}** (${p.duration} — ₹${p.pricePerPerson.toLocaleString('en-IN')}/person)\n  *${p.description}*`)
          .join('\n\n');

        assistantText = `Based on your preferences, here are our recommended itineraries from our catalog:\n\n${listText}\n\nBoth include private accommodations and chauffeur transfers. You can reserve your departure with a refundable **₹2,000 booking token**, and our senior advisor will contact you to finalize flights and custom details. Which one would you prefer?`;
      } else {
        assistantText = `I would love to help you plan your journey! To find the best options in our portfolio (${availableDestinations.join(', ')}), could you share your approximate budget per person, number of travelers, and preferred style of trip?`;
      }
    }

    return NextResponse.json({
      success: true,
      message: assistantText,
      suggestedPackages: matchedPackages.slice(0, 2),
      extractedLead: state
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Chat processing failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
