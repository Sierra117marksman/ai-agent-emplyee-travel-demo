import { TravelPackage } from '@/lib/packages';
import { AgentMemory, PerceptionResult } from './types';

// Generic Price / Budget Objection detector (handles natural-language variations without hardcoded single phrases)
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

// Generic Trip Style Detector
export function detectTripStyle(text: string): string | null {
  const lower = text.toLowerCase();
  if (/\b(?:honeymoon|romantic|couples?)\b/i.test(lower)) return 'honeymoon';
  if (/\b(?:adventure|snorkeling|trek(?:king)?|scuba|rafting|hiking)\b/i.test(lower)) return 'adventure';
  if (/\b(?:family|kids|children)\b/i.test(lower)) return 'family';
  if (/\b(?:luxury|5-star|ultra luxury|boutique villa)\b/i.test(lower)) return 'luxury';
  if (/\b(?:cold|snow|mountains?|himalayan|alpine)\b/i.test(lower)) return 'mountains';
  if (/\b(?:relax(?:ed|ing)?|peaceful|ayurveda|spa|wellness)\b/i.test(lower)) return 'relaxed';
  return null;
}

// Generic New Trip Inquiry / Style Shift Detector
export function isNewTripInquiry(text: string): boolean {
  const lower = text.toLowerCase();
  return /\b(?:i\s+(?:want|need|would\s+like)|we(?:'re|\s+are)\s+(?:planning|looking\s+for)|looking\s+for|plan(?:ning)?\s+(?:a|an|our)|interested\s+in)\b/i.test(lower);
}

// Budget Extractor from natural language
export function extractBudgetFromText(text: string): number | null {
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

// Travelers Count Extractor
export function extractTravelersFromText(text: string): number | null {
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

// Duration Extractor
export function extractDurationFromText(text: string): number | null {
  const lower = text.toLowerCase();
  const durationMatch = lower.match(/(\d+)\s*(?:days?|nights?|-day)/i);
  if (durationMatch) {
    return parseInt(durationMatch[1], 10);
  }
  if (/\ba\s+week\b/i.test(lower)) return 7;
  return null;
}

// Destination Extractor from available destinations
export function extractDestinationFromText(text: string, availableDestinations: string[]): string | null {
  const lower = text.toLowerCase();
  for (const dest of availableDestinations) {
    if (lower.includes(dest.toLowerCase())) {
      return dest;
    }
  }
  return null;
}

const COMMON_STOPWORDS = new Set([
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

// Uncataloged Destination Extractor
export function extractUncatalogedDestinationFromText(
  text: string,
  availableDestinations: string[],
  packages: TravelPackage[]
): string | null {
  const lower = text.toLowerCase();
  const destRegex = /(?:visit(?:ing)?|trip\s+to|travel(?:ing)?\s+to|packages?\s+(?:for|to|in|of)|holiday\s+in|vacation\s+(?:in|to)|tours?\s+(?:in|of|to)|flights?\s+to|going\s+to)\s+([a-zA-Z]{3,20})/i;
  const matchDest = lower.match(destRegex);
  if (matchDest) {
    const candidate = matchDest[1].trim().toLowerCase();
    const isKnown =
      availableDestinations.some((d) => d.toLowerCase().includes(candidate)) ||
      packages.some(
        (p) =>
          p.country.toLowerCase() === candidate ||
          p.destination.toLowerCase().includes(candidate)
      );

    if (!COMMON_STOPWORDS.has(candidate) && !isKnown) {
      return candidate.charAt(0).toUpperCase() + candidate.slice(1);
    }
  }
  return null;
}

export function detectCustomTokenAttempt(text: string, standardTokenAmount: number): boolean {
  const lower = text.toLowerCase();
  const tokenStr = standardTokenAmount.toString();
  return (
    (lower.includes('instead') && (lower.includes('pay') || lower.includes('token') || lower.includes('give') || lower.includes('₹') || lower.includes('rs'))) ||
    (/pay\s*(?:₹|rs\.?|inr)?\s*(\d+)/i.test(lower) && !lower.includes(tokenStr) && (lower.includes('token') || lower.includes('instead') || lower.includes('deposit') || lower.includes('advance'))) ||
    (lower.includes('500') && lower.includes('instead')) ||
    lower.includes('charge me 10000') ||
    lower.includes('pay 10000')
  );
}

export function detectUnverifiedPaymentClaim(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes('already paid') ||
    lower.includes('i have paid') ||
    lower.includes('payment done') ||
    lower.includes('transferred the money') ||
    lower.includes('sent the money')
  );
}

export function detectBookingIntent(text: string): { isBooking: boolean; optionNumber: number | null } {
  const lower = text.toLowerCase();
  const isBooking =
    lower.includes('book the second') ||
    lower.includes('second option') ||
    lower.includes('option 2') ||
    lower.includes('book the first') ||
    lower.includes("let's book") ||
    lower.includes('can i book') ||
    lower.includes('proceed to book') ||
    lower.includes('confirm this');

  let optionNumber: number | null = null;
  if (lower.includes('second') || lower.includes('2')) {
    optionNumber = 2;
  } else if (lower.includes('first') || lower.includes('1')) {
    optionNumber = 1;
  }

  return { isBooking, optionNumber };
}

export function detectNegativePreferences(text: string, packages: TravelPackage[]): string | null {
  const lower = text.toLowerCase();
  for (const pkg of packages) {
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
        return pkg.id;
      }
    }
  }
  return null;
}

export function extractContactInfo(text: string): { phone: string | null; email: string | null } {
  const phoneMatch = text.match(/(?:\+91[\s-]?)?[6789]\d{9}/);
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return {
    phone: phoneMatch ? phoneMatch[0] : null,
    email: emailMatch ? emailMatch[0] : null
  };
}

/**
 * Sequential Turn Perception Pipeline
 * Analyzes conversational history turn-by-turn to prevent state leakage
 * and updates memory and perception structures accurately.
 */
export function perceiveTurn(
  messages: { role: string; content: string }[],
  availableDestinations: string[],
  packages: TravelPackage[],
  standardTokenAmount: number = 2000
): { perception: PerceptionResult; memory: AgentMemory } {
  const userMessages = messages.filter((m) => m.role === 'user');
  const latestUserText = userMessages.length > 0 ? userMessages[userMessages.length - 1].content : '';

  const memory: AgentMemory = {
    customer: {
      name: null,
      phone: null,
      email: null,
      preferences: {
        destination: null,
        budgetPerPerson: null,
        travelers: null,
        durationDays: null,
        tripStyle: null,
        isDomesticOnly: false,
        excludePackageId: null,
        requestedUncatalogedDestination: null
      }
    },
    conversation: {
      currentIntent: 'INQUIRY',
      lastObjection: null,
      isPriceObjectionActive: false,
      missingFields: ['destination', 'budget', 'travelers', 'duration'],
      unsupportedDestination: null,
      turnCount: messages.length
    },
    business: {
      selectedPackageId: null,
      selectedPackageTitle: null,
      leadStatus: 'NEW',
      tokenOrderId: null,
      tokenPaymentId: null,
      tokenAmount: standardTokenAmount
    }
  };

  let lastTripStyle: string | null = null;
  let lastDestination: string | null = null;
  let lastBudget: number | null = null;
  let lastTravelers: number | null = null;
  let lastDuration: number | null = null;
  let isDomesticOnly = false;
  let excludePackageId: string | null = null;
  let requestedUncatalogedDestination: string | null = null;
  let priceObjectionActive = false;

  for (const msg of userMessages) {
    const text = msg.content;
    const lower = text.toLowerCase();

    // 1. Price objection check
    if (isPriceObjection(text)) {
      priceObjectionActive = true;
      lastBudget = null; // Clear previously rejected budget
      continue;
    }

    // 2. Trip style & New Inquiry Check
    const detectedStyle = detectTripStyle(text);
    const newInquiry = isNewTripInquiry(text);

    if (detectedStyle && (newInquiry || (lastTripStyle && lastTripStyle !== detectedStyle))) {
      // Style shift: reset prior constraints to avoid cross-turn contamination
      lastTripStyle = detectedStyle;
      lastDestination = null;
      lastBudget = null;
      lastTravelers = null;
      lastDuration = null;
      isDomesticOnly = false;
      priceObjectionActive = false;
    } else if (detectedStyle && !lastTripStyle) {
      lastTripStyle = detectedStyle;
    }

    // 3. Destination extraction
    const turnDest = extractDestinationFromText(text, availableDestinations);
    if (turnDest) {
      lastDestination = turnDest;
    }

    // 4. Budget extraction
    const turnBudget = extractBudgetFromText(text);
    if (turnBudget !== null) {
      lastBudget = turnBudget;
      priceObjectionActive = false; // Resolved price objection with new budget
    }

    // 5. Travelers extraction
    const turnPax = extractTravelersFromText(text);
    if (turnPax !== null) {
      lastTravelers = turnPax;
    }

    // 6. Duration extraction
    const turnDuration = extractDurationFromText(text);
    if (turnDuration !== null) {
      lastDuration = turnDuration;
    }

    // 7. Domestic flag
    if (/\b(?:in\s+india|somewhere\s+in\s+india|domestic)\b/i.test(lower)) {
      isDomesticOnly = true;
    }

    // 8. Negative preference
    const turnExcluded = detectNegativePreferences(text, packages);
    if (turnExcluded) {
      excludePackageId = turnExcluded;
      if (lastDestination) {
        const pkg = packages.find((p) => p.id === turnExcluded);
        if (pkg && lastDestination.toLowerCase().includes(pkg.destination.toLowerCase())) {
          lastDestination = null;
        }
      }
    }

    // 9. Uncataloged destination check
    if (!lastDestination) {
      const uncataloged = extractUncatalogedDestinationFromText(text, availableDestinations, packages);
      if (uncataloged) {
        requestedUncatalogedDestination = uncataloged;
      }
    }

    // 10. Contact extraction
    const contact = extractContactInfo(text);
    if (contact.phone) memory.customer.phone = contact.phone;
    if (contact.email) memory.customer.email = contact.email;
  }

  // Update memory customer preferences
  memory.customer.preferences = {
    destination: lastDestination,
    budgetPerPerson: lastBudget,
    travelers: lastTravelers,
    durationDays: lastDuration,
    tripStyle: lastTripStyle,
    isDomesticOnly,
    excludePackageId,
    requestedUncatalogedDestination
  };

  memory.conversation.isPriceObjectionActive = priceObjectionActive;
  memory.conversation.unsupportedDestination = requestedUncatalogedDestination;

  // Calculate missing fields
  const missing: ('destination' | 'budget' | 'travelers' | 'duration')[] = [];
  if (!lastDestination) missing.push('destination');
  if (!lastBudget) missing.push('budget');
  if (!lastTravelers) missing.push('travelers');
  if (!lastDuration) missing.push('duration');
  memory.conversation.missingFields = missing;

  // Signals on the latest message
  const bookingInfo = detectBookingIntent(latestUserText);
  const isCustomToken = detectCustomTokenAttempt(latestUserText, standardTokenAmount);
  const isUnverifiedPayment = detectUnverifiedPaymentClaim(latestUserText);

  const perception: PerceptionResult = {
    detectedStyle: lastTripStyle,
    isNewInquiry: isNewTripInquiry(latestUserText),
    destination: lastDestination,
    budgetPerPerson: lastBudget,
    travelers: lastTravelers,
    durationDays: lastDuration,
    isDomesticOnly,
    excludePackageId,
    requestedUncatalogedDestination,
    isPriceObjection: priceObjectionActive,
    isCustomTokenAttempt: isCustomToken,
    isUnverifiedPaymentClaim: isUnverifiedPayment,
    isBookingIntent: bookingInfo.isBooking,
    selectedOptionNumber: bookingInfo.optionNumber,
    customerPhone: memory.customer.phone,
    customerEmail: memory.customer.email,
    latestUserText
  };

  return { perception, memory };
}
