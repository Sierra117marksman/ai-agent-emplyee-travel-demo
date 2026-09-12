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


export interface CustomerState {
  destination: string | null;
  travelDates: string | null;
  durationDays: number | null;
  travelers: number | null;
  budgetPerPerson: number | null;
  tripStyle: string | null;
  isDomesticOnly: boolean;
  excludePackageId?: string;
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  requestedUncatalogedDestination?: string;
  priceObjectionActive?: boolean;
}

// 1. Generic Price / Budget Objection detector (handles natural-language variations without hardcoded single phrases)
export function isPriceObjection(text: string): boolean {
  const lower = text.toLowerCase().trim();

  // Pattern A: Expressions stating price, cost, or budget is excessive / high / steep
  const expensivePattern = /\b(?:price|prices|rate|rates|cost|costs|pricing|quote|quotes|package|packages|it|this|that|those)\s+(?:is|are|seems?|feels?|looks?|was)?\s*(?:way\s+)?(?:too\s+(?:high|much|expensive|steep|costly|pricey)|above\s+(?:my|our)\s+budget|over\s+(?:my|our)\s+budget|beyond\s+(?:my|our)\s+budget|out\s+of\s+(?:my|our)\s+(?:budget|price\s+range)|exceeds?\s+(?:my|our)\s+budget)\b/i;

  // Pattern B: Standalone / modifier phrases for too expensive
  const tooExpensivePattern = /\b(?:way\s+|a\s+bit\s+|a\s+little\s+)?too\s+(?:expensive|costly|pricey|high|steep)\b/i;

  // Pattern C: Requests for cheaper or more affordable alternatives
  const cheaperPattern = /\b(?:cheaper|cheapest|more\s+affordable|less\s+expensive|lower\s+(?:price|cost|budget|rates?)|economical|pocket[- ]friendly|budget[- ]friendly|cut\s+the\s+cost)\b/i;

  // Pattern D: Affordability negative statements
  const cannotAffordPattern = /\b(?:can't|cannot|cant|unable\s+to)\s+afford\b|\b(?:out\s+of|beyond)\s+(?:my|our)\s+(?:budget|range|reach)\b/i;

  return (
    expensivePattern.test(lower) ||
    tooExpensivePattern.test(lower) ||
    cheaperPattern.test(lower) ||
    cannotAffordPattern.test(lower)
  );
}

// 2. Generic Trip Style Detector
function detectTripStyle(text: string): string | null {
  const lower = text.toLowerCase();
  if (/\b(?:honeymoon|romantic|couples?)\b/i.test(lower)) return 'honeymoon';
  if (/\b(?:adventure|snorkeling|trek(?:king)?|scuba|rafting|hiking)\b/i.test(lower)) return 'adventure';
  if (/\b(?:family|kids|children)\b/i.test(lower)) return 'family';
  if (/\b(?:luxury|5-star|ultra luxury|boutique villa)\b/i.test(lower)) return 'luxury';
  if (/\b(?:cold|snow|mountains?|himalayan|alpine)\b/i.test(lower)) return 'mountains';
  if (/\b(?:relax(?:ed|ing)?|peaceful|ayurveda|spa|wellness)\b/i.test(lower)) return 'relaxed';
  return null;
}

// 3. Generic New Trip Inquiry / Style Shift Detector
function isNewTripInquiry(text: string): boolean {
  const lower = text.toLowerCase();
  return /\b(?:i\s+(?:want|need|would\s+like)|we(?:'re|\s+are)\s+(?:planning|looking\s+for)|looking\s+for|plan(?:ning)?\s+(?:a|an|our)|interested\s+in)\b/i.test(lower);
}

// 4. Budget Extractor from text
function extractBudgetFromText(text: string): number | null {
  const lower = text.toLowerCase();
  const budgetMatch = lower.match(/(?:budget(?:\s*is|\s*of)?|around|under|approx\.?|max\.?|about|near|₹|rs\.?|inr)\s*(?:of\s*)?(?:₹|rs\.?|inr)?\s*([0-9]{1,3}(?:,[0-9]{3})*|\d{2,3})k?\b/i);
  if (budgetMatch) {
    const rawStr = budgetMatch[1].replace(/,/g, '');
    const num = parseInt(rawStr, 10);
    if (!isNaN(num)) {
      if (budgetMatch[0].toLowerCase().includes('k')) {
        return num * 1000;
      } else if (num >= 1000) {
        return num;
      } else if (
        budgetMatch[0].includes('₹') ||
        budgetMatch[0].toLowerCase().includes('rs') ||
        budgetMatch[0].toLowerCase().includes('inr') ||
        budgetMatch[0].toLowerCase().includes('budget')
      ) {
        return num * 1000;
      }
    }
  }
  return null;
}

// 5. Travelers Extractor
function extractTravelersFromText(text: string): number | null {
  const lower = text.toLowerCase();
  const paxNumberMatch = lower.match(/(\d+)\s*(?:people|person|pax|travellers|travelers|adults)/i);
  if (paxNumberMatch) {
    return parseInt(paxNumberMatch[1], 10);
  }
  if (/\b(?:for\s+two|couple|2\s+of\s+us|two\s+people|two\s+travelers)\b/i.test(lower)) {
    return 2;
  }
  if (/\b(?:for\s+4|4\s+people|four\s+people|four\s+travelers|family\s+of\s+4)\b/i.test(lower)) {
    return 4;
  }
  return null;
}

// 6. Duration Extractor
function extractDurationFromText(text: string): number | null {
  const lower = text.toLowerCase();
  const durationMatch = lower.match(/(\d+)\s*(?:days?|nights?|-day)/i);
  if (durationMatch) {
    return parseInt(durationMatch[1], 10);
  }
  if (/\ba\s+week\b/i.test(lower)) return 7;
  return null;
}

// 7. Destination Extractor
function extractDestinationFromText(text: string): string | null {
  const lower = text.toLowerCase();
  const destinations = getAllAvailableDestinations();
  for (const dest of destinations) {
    if (lower.includes(dest.toLowerCase())) {
      return dest;
    }
  }
  return null;
}

function extractCustomerState(messages: ChatMessage[]): CustomerState {
  const state: CustomerState = {
    destination: null,
    travelDates: null,
    durationDays: null,
    travelers: null,
    budgetPerPerson: null,
    tripStyle: null,
    isDomesticOnly: false,
    priceObjectionActive: false,
    customerName: null,
    customerPhone: null,
    customerEmail: null
  };

  const userMessages = messages.filter((m) => m.role === 'user');

  for (const msg of userMessages) {
    const text = msg.content;
    const lower = text.toLowerCase();

    // 1. Check for Price Objection in this turn
    if (isPriceObjection(text)) {
      state.priceObjectionActive = true;
      state.budgetPerPerson = null; // Clear previously rejected budget
      continue;
    }

    // 2. Trip style & New Inquiry Check
    const detectedStyle = detectTripStyle(text);
    const newInquiry = isNewTripInquiry(text);

    // If introducing a new style in an inquiry (or changing style), reset prior trip-specific constraints!
    if (detectedStyle && (newInquiry || (state.tripStyle && state.tripStyle !== detectedStyle))) {
      state.tripStyle = detectedStyle;
      state.destination = null;
      state.budgetPerPerson = null;
      state.travelers = null;
      state.durationDays = null;
      state.isDomesticOnly = false;
      state.priceObjectionActive = false;
    } else if (detectedStyle && !state.tripStyle) {
      state.tripStyle = detectedStyle;
    }

    // 3. Destination in this turn
    const turnDest = extractDestinationFromText(text);
    if (turnDest) {
      state.destination = turnDest;
    }

    // 4. Budget in this turn
    const turnBudget = extractBudgetFromText(text);
    if (turnBudget !== null) {
      state.budgetPerPerson = turnBudget;
      state.priceObjectionActive = false; // Resolved price objection with new budget
    }

    // 5. Travelers in this turn
    const turnPax = extractTravelersFromText(text);
    if (turnPax !== null) {
      state.travelers = turnPax;
    }

    // 6. Duration in this turn
    const turnDuration = extractDurationFromText(text);
    if (turnDuration !== null) {
      state.durationDays = turnDuration;
    }

    // 7. Domestic in this turn
    if (/\b(?:in\s+india|somewhere\s+in\s+india|domestic)\b/i.test(lower)) {
      state.isDomesticOnly = true;
    }

    // 8. Negative preference (e.g. "Forget Bali", "not Kashmir")
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
            state.destination = null;
          }
        }
      }
    }

    // 9. Check for uncataloged destination inquiry (e.g. "Mars", "Tokyo", "Antarctica")
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

    // 10. Contact info extraction
    const phoneMatch = text.match(/(?:\+91[\s-]?)?[6789]\d{9}/);
    if (phoneMatch) {
      state.customerPhone = phoneMatch[0];
    }
    const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch) {
      state.customerEmail = emailMatch[0];
    }
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
        extractedLead: {
          destination: null,
          budgetPerPerson: null,
          travelers: null,
          durationDays: null,
          tripStyle: null,
          isDomesticOnly: false
        }
      });
    }

    const latestUserMsg = messages[messages.length - 1]?.content || '';
    const latestLower = latestUserMsg.toLowerCase();

    // Extract state dynamically turn-by-turn
    const state = extractCustomerState(messages);

    // Rule 1: Special case for unauthorized custom token requests
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
        extractedLead: {
          destination: state.destination,
          budgetPerPerson: state.budgetPerPerson,
          travelers: state.travelers,
          durationDays: state.durationDays,
          tripStyle: state.tripStyle,
          isDomesticOnly: state.isDomesticOnly
        }
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
        extractedLead: {
          destination: state.destination,
          budgetPerPerson: state.budgetPerPerson,
          travelers: state.travelers,
          durationDays: state.durationDays,
          tripStyle: state.tripStyle,
          isDomesticOnly: state.isDomesticOnly
        }
      });
    }

    // Rule 3: Destination requested does not exist in catalog (e.g. "Mars", "Paris")
    if (state.requestedUncatalogedDestination && !state.destination) {
      return NextResponse.json({
        success: true,
        message: `We do not currently offer travel packages for ${state.requestedUncatalogedDestination}. Our official 2026 portfolio is curated exclusively for: ${availableDestinations.join(', ')}. Would you like to explore any of these destinations, or should I connect you with our bespoke private charter desk?`,
        suggestedPackages: [],
        extractedLead: {
          destination: state.destination,
          budgetPerPerson: state.budgetPerPerson,
          travelers: state.travelers,
          durationDays: state.durationDays,
          tripStyle: state.tripStyle,
          isDomesticOnly: state.isDomesticOnly
        }
      });
    }

    // Rule 4: Price / Budget Objection Handling (BUG 2)
    // When the customer states that the price is too high or asks for cheaper options:
    // - Do not repeat the same recommendations automatically.
    // - Ask the customer what budget they would be comfortable with per person.
    // - Set suggestedPackages = []
    if (state.priceObjectionActive) {
      const objectionPrompt = `You are Arjun Patel, Senior Travel Sales Specialist at Wanderlust Journeys.
The traveler has stated that the pricing / packages offered are too high, too expensive, or beyond their budget.
YOUR DIRECTIVES:
1. Acknowledge their price sensitivity with warmth, consultative empathy, and respect.
2. Emphasize that Wanderlust Journeys can tailor experiences and explore diverse luxury price points.
3. Explicitly ask what budget per person they would be comfortable with for this journey.
4. DO NOT repeat, list, or suggest any package recommendations in this turn (suggestedPackages = []).
Keep your response warm, concise, and helpful (1-2 short paragraphs).`;

      const assistantReply = await queryGroq(objectionPrompt, messages);
      const fallbackReply = `I completely understand! We want to make sure your journey offers exceptional luxury while remaining comfortably within your budget. What budget per person would you be comfortable with for this trip? Once you share your target budget, I will immediately review our catalog to recommend options that align with your financial comfort.`;

      return NextResponse.json({
        success: true,
        message: assistantReply || fallbackReply,
        suggestedPackages: [],
        extractedLead: {
          tripStyle: state.tripStyle,
          destination: state.destination,
          budgetPerPerson: null,
          travelers: state.travelers,
          durationDays: state.durationDays,
          isDomesticOnly: state.isDomesticOnly
        }
      });
    }

    // Rule 5: Strict Qualification Gate (BUG 1)
    // The qualification gate must execute BEFORE recommendation generation.
    // Recommendation generation is permitted ONLY when the minimum required qualification state is satisfied.
    // If destination is null AND budgetPerPerson is null -> NOT qualified!
    // (e.g. "I want a honeymoon trip." -> tripStyle=honeymoon, destination=null, budget=null, travelers=null, duration=null)
    const hasSufficientQualification = Boolean(
      (state.destination && state.budgetPerPerson) ||
      (state.destination && (state.travelers || state.durationDays || state.tripStyle)) ||
      (state.budgetPerPerson && (state.destination || state.tripStyle || state.travelers || state.durationDays))
    );

    if (!hasSufficientQualification) {
      const styleWord = state.tripStyle ? ` ${state.tripStyle}` : '';
      const askMissingPrompt = `You are Arjun Patel, Senior Travel Sales Specialist at Wanderlust Journeys.
The traveler is inquiring about travel, but key qualification details are missing.
- If inquiring about Wanderlust Journeys, introduce Wanderlust Journeys warmly as a premier luxury travel atelier curating private villa escapes across: ${availableDestinations.join(', ')}.
- If inquiring about a trip, warmly acknowledge their interest in a${styleWord} journey.
- Inquire about their missing preferences:
  1. Preferred destination or region (or whether domestic India or international)
  2. Approximate budget per person
  3. Number of travelers and trip duration
CRITICAL RULES:
- DO NOT assume any destination (do NOT assume Bali or Kashmir).
- DO NOT assume any budget (do NOT assume ₹44,999 or ₹45,000).
- DO NOT assume 2 travelers.
- DO NOT recommend or list catalog packages until qualified (suggestedPackages = []).
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
        extractedLead: {
          tripStyle: state.tripStyle,
          destination: state.destination,
          budgetPerPerson: state.budgetPerPerson,
          travelers: state.travelers,
          durationDays: state.durationDays,
          isDomesticOnly: state.isDomesticOnly
        }
      });
    }

    // Rule 6: Deterministic Catalog Query using verified qualification constraints
    const matchedPackages = queryCatalog({
      text: latestUserMsg,
      destination: state.destination || undefined,
      maxBudget: state.budgetPerPerson || undefined,
      tripType: state.tripStyle || undefined,
      durationDays: state.durationDays || undefined,
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
      extractedLead: {
        tripStyle: state.tripStyle,
        destination: state.destination,
        budgetPerPerson: state.budgetPerPerson,
        travelers: state.travelers,
        durationDays: state.durationDays,
        isDomesticOnly: state.isDomesticOnly
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Chat processing failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
