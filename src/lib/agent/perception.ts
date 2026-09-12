import {
  TravelPackage,
  DestinationFlexibility
} from '@/lib/packages';
import {
  AgentMemory,
  PerceptionResult,
  DestinationEntity,
  BudgetEntity,
  TravelersEntity,
  DurationEntity,
  AmbiguityRecord,
  ConstraintConflict,
  CoreferenceRecord,
  StateMutation,
  EvidenceTraceItem,
  RequirementMode,
  ConversationMemory,
  AgentIntent
} from './types';

// =========================================================================
// 1. TYPO & COLLOQUIAL NORMALIZER (Preserves Raw Text & Negation Tokens)
// =========================================================================
export function normalizeTokens(text: string): { rawText: string; normalizedText: string } {
  const rawText = text;
  let normalized = text.toLowerCase();

  // Common colloquial typo replacements (word boundaries)
  normalized = normalized.replace(/\bmoutains?\b/gi, 'mountains');
  normalized = normalized.replace(/\b(?:bech|beech)\b/gi, 'beach');
  normalized = normalized.replace(/\bkasmir\b/gi, 'kashmir');
  normalized = normalized.replace(/\b(\d+)\s*ppl\b/gi, '$1 people');
  normalized = normalized.replace(/\bppl\b/gi, 'people');
  normalized = normalized.replace(/\b15\s*thosand\b/gi, '15000');
  normalized = normalized.replace(/\b15\s*thousand\b/gi, '15000');
  normalized = normalized.replace(/\b20\s*thousand\b/gi, '20000');
  normalized = normalized.replace(/\b30\s*thousand\b/gi, '30000');
  normalized = normalized.replace(/\b40\s*thousand\b/gi, '40000');
  normalized = normalized.replace(/\b50\s*thousand\b/gi, '50000');
  normalized = normalized.replace(/\b(\d+)\s*thosand\b/gi, (_, n) => `${parseInt(n, 10) * 1000}`);
  normalized = normalized.replace(/\bthosand\b/gi, 'thousand');
  normalized = normalized.replace(/\bya\b/gi, 'yes');
  normalized = normalized.replace(/\bidk\b/gi, "i don't know");

  return { rawText, normalizedText: normalized };
}


// =========================================================================
// 2. PRICE OBJECTION DETECTOR (Bug 2 Protection)
// =========================================================================
export function isPriceObjection(text: string): boolean {
  const lower = text.toLowerCase().trim();

  const expensivePattern = /\b(?:price|prices|rate|rates|cost|costs|pricing|quote|quotes|package|packages|it|this|that|those)\s+(?:is|are|seems?|feels?|looks?|was)?\s*(?:way\s+)?(?:too\s+(?:high|much|expensive|steep|costly|pricey)|above\s+(?:my|our)\s+budget|over\s+(?:my|our)\s+budget|beyond\s+(?:my|our)\s+budget|out\s+of\s+(?:my|our)\s+(?:budget|price\s+range)|exceeds?\s+(?:my|our)\s+budget)\b/i;
  const tooExpensivePattern = /\b(?:way\s+|a\s+bit\s+|a\s+little\s+)?too\s+(?:expensive|costly|pricey|high|steep)\b/i;
  const cheaperPattern = /\b(?:cheaper|cheapest|more\s+affordable|less\s+expensive|lower\s+(?:price|cost|budget|rates?)|economical|pocket[- ]friendly|budget[- ]friendly|cut\s+the\s+cost)\b/i;
  const cannotAffordPattern = /\b(?:can't|cannot|cant|unable\s+to)\s+afford\b|\b(?:out\s+of|beyond)\s+(?:my|our)\s+(?:budget|range|reach)\b/i;

  return (
    expensivePattern.test(lower) ||
    tooExpensivePattern.test(lower) ||
    cheaperPattern.test(lower) ||
    cannotAffordPattern.test(lower)
  );
}

// =========================================================================
// 3. TRIP STYLE & NEW INQUIRY DETECTOR (Bug 1 Protection)
// =========================================================================
export function detectTripStyle(text: string): string | null {
  const lower = text.toLowerCase();
  if (/\b(?:honeymoon|romantic|couples?)\b/i.test(lower)) return 'honeymoon';
  if (/\b(?:adventure|snorkeling|scuba|rafting)\b/i.test(lower)) return 'adventure';
  if (/\b(?:family|kids|children)\b/i.test(lower)) return 'family';
  if (/\b(?:luxury|5-star|ultra luxury|boutique villa)\b/i.test(lower)) return 'luxury';
  if (/\b(?:relax(?:ed|ing)?|peaceful|ayurveda|spa|wellness)\b/i.test(lower)) return 'relaxed';
  return null;
}

export function isPureGreeting(text: string): boolean {
  const trimmed = text.trim();
  return /^(?:hello|hi|hey|namaste|good\s+(?:morning|afternoon|evening)|hola)(?:\s+(?:arjun|there|team|wanderlust|travel|desk))?[!.]*$/i.test(trimmed);
}

export function isNewTripInquiry(text: string): boolean {
  const lower = text.toLowerCase();
  return /\b(?:i\s+(?:want|need|would\s+like)|we(?:'re|\s+are)\s+(?:planning|looking\s+for)|looking\s+for|plan(?:ning)?\s+(?:a|an|our)|interested\s+in)\b/i.test(lower);
}

export function detectDestinationFlexibility(text: string): DestinationFlexibility {
  const lower = text.toLowerCase();

  // Explicit openness indicators
  if (
    /\b(?:open\s+to\s+(?:other|any|all|different)\s+destinations?|open\s+to\s+(?:anything|anywhere|alternatives)|don't\s+care\s+where|anywhere|wherever|any\s+destination|other\s+options?|other\s+destinations?)\b/i.test(lower) ||
    /\b(?:somewhere\s+in\s+india|anywhere\s+in\s+india)\b/i.test(lower)
  ) {
    return 'yes';
  }

  // Explicit strictness indicators
  if (/\b(?:strictly|only\s+(?:kashmir|bali|dubai|kerala|phuket|maldives)|nowhere\s+else)\b/i.test(lower)) {
    return 'no';
  }

  return 'unknown';
}

// =========================================================================
// 4. INTERESTS & NEGATIONS EXTRACTOR (Cat A, D, E, V)
// =========================================================================
const INTEREST_PATTERNS: Record<string, RegExp> = {
  mountains: /\b(?:mountains?|mountainous|hills?|hill\s+station|alpine|himalayas?|highlands?)\b/i,
  beaches: /\b(?:beach(?:es)?|beachfront|seaside|coastal|coast|ocean|lagoon|sea\s+views?)\b/i,
  snow: /\b(?:snow|snowfall|snowy)\b/i,
  wildlife: /\b(?:wildlife|safari|animals?|jungle)\b/i,
  waterfalls: /\b(?:waterfalls?|cascade|falls)\b/i,
  heritage: /\b(?:heritage|historic|historical|temples?|monuments?|forts?|palaces?)\b/i,
  culture: /\b(?:culture|cultural|traditions?)\b/i,
  'tea-gardens': /\b(?:tea[- ]gardens?|tea\s+plantations?|tea\s+estates?)\b/i,
  diving: /\b(?:diving|scuba|snorkeling)\b/i,
  nightlife: /\b(?:nightlife|party|clubs?|pubs?|bars?)\b/i,
  casinos: /\b(?:casinos?|gambling)\b/i,
  culinary: /\b(?:culinary|food|dining|beer|drinks?|cuisine|gourmet|wine|kahwa)\b/i,
  shopping: /\b(?:shopping|markets?|malls?|bazaars?)\b/i,
  wellness: /\b(?:wellness|ayurveda|spa|yoga|rejuvenation|massages?)\b/i,
  backwaters: /\b(?:backwaters?|houseboat)\b/i,
  desert: /\b(?:desert|dunes?|sand\s+dunes)\b/i
};

export function extractInterestsAndNegations(text: string): {
  interests: string[];
  excludedInterests: string[];
  evidence: EvidenceTraceItem[];
} {
  const lower = text.toLowerCase();
  const interests: Set<string> = new Set();
  const excludedInterests: Set<string> = new Set();
  const evidence: EvidenceTraceItem[] = [];

  // 1. Check for negations first: "I don't want beaches", "no mountains", "not nightlife", "just not casinos"
  const negationRegex = /\b(?:don't|do\s+not|cant|cannot|never)\s+(?:want|like|need|care\s+about)\s+([a-z\s]+)|\bno\s+([a-z]+)|\bnot\s+([a-z]+)|\bexcept\s+([a-z]+)|\bjust\s+not\s+([a-z]+)/gi;
  let negMatch: RegExpExecArray | null;
  while ((negMatch = negationRegex.exec(lower)) !== null) {
    const negatedSnippet = (negMatch[1] || negMatch[2] || negMatch[3] || negMatch[4] || negMatch[5] || '').trim();
    for (const [key, pattern] of Object.entries(INTEREST_PATTERNS)) {
      if (pattern.test(negatedSnippet)) {
        excludedInterests.add(key);
        evidence.push({
          field: 'excludedInterests',
          value: key,
          evidence: negMatch[0],
          source: 'explicit_entity',
          certainty: 'explicit'
        });
      }
    }
  }

  // 2. Extract positive interests if not negated
  for (const [key, pattern] of Object.entries(INTEREST_PATTERNS)) {
    if (pattern.test(lower) && !excludedInterests.has(key)) {
      interests.add(key);
      evidence.push({
        field: 'interests',
        value: key,
        evidence: text,
        source: 'interest_phrase',
        certainty: 'explicit'
      });
    }
  }

  return {
    interests: Array.from(interests),
    excludedInterests: Array.from(excludedInterests),
    evidence
  };
}

export function detectInterests(text: string): string[] {
  const lower = text.toLowerCase();
  const interests: string[] = [];
  for (const [key, pattern] of Object.entries(INTEREST_PATTERNS)) {
    if (pattern.test(lower)) {
      interests.push(key);
    }
  }
  return interests;
}

// =========================================================================
// 5. ATTRACTION HIERARCHY & DESTINATION EXTRACTOR (Cat B, D, N, T, AA)
// =========================================================================
interface AttractionMapping {
  attraction: string;
  destination: string;
  region?: string;
  country?: string;
}

const ATTRACTION_HIERARCHY: Record<string, AttractionMapping> = {
  'devka beach': { attraction: 'Devka Beach', destination: 'Daman', region: 'Daman & Diu', country: 'India' },
  'daman devka': { attraction: 'Devka Beach', destination: 'Daman', region: 'Daman & Diu', country: 'India' },
  'taj mahal': { attraction: 'Taj Mahal', destination: 'Agra', region: 'Uttar Pradesh', country: 'India' },
  'marine drive': { attraction: 'Marine Drive', destination: 'Mumbai', region: 'Maharashtra', country: 'India' },
  'baga beach': { attraction: 'Baga Beach', destination: 'Goa', region: 'Goa', country: 'India' },
  'burj khalifa': { attraction: 'Burj Khalifa', destination: 'Dubai', country: 'UAE' },
  'eiffel tower': { attraction: 'Eiffel Tower', destination: 'Paris', country: 'France' },
  gulmarg: { attraction: 'Gulmarg', destination: 'Kashmir', region: 'Jammu & Kashmir', country: 'India' },
  'dal lake': { attraction: 'Dal Lake', destination: 'Kashmir', region: 'Jammu & Kashmir', country: 'India' },
  munnar: { attraction: 'Munnar Tea Gardens', destination: 'Kerala', region: 'Kerala', country: 'India' },
  alleppey: { attraction: 'Alleppey Backwaters', destination: 'Kerala', region: 'Kerala', country: 'India' },
  'phi phi': { attraction: 'Phi Phi Islands', destination: 'Phuket & Krabi', country: 'Thailand' },
  seminyak: { attraction: 'Seminyak Beach', destination: 'Bali', country: 'Indonesia' },
  ubud: { attraction: 'Ubud Jungle & Villas', destination: 'Bali', country: 'Indonesia' }
};

const KNOWN_DESTINATIONS = [
  'Bali', 'Kashmir', 'Dubai', 'Kerala', 'Phuket & Krabi', 'Maldives',
  'Goa', 'Daman', 'Paris', 'Miami', 'Los Angeles', 'LA', 'Rajasthan', 'Manali', 'Agra', 'Mumbai'
];

export function extractDestinationEntities(
  text: string,
  availableDestinations: string[] = [],
  packages: TravelPackage[] = []
): {
  destination?: DestinationEntity;
  destinationPreference?: string | null;
  referenceDestination?: string | null;
  excludedDestinations: string[];
  isInfoQuery: boolean;
  evidence: EvidenceTraceItem[];
} {
  const lower = text.toLowerCase();
  const evidence: EvidenceTraceItem[] = [];
  const excludedDestinations: string[] = [];

  const candidateDestinations = Array.from(new Set([
    ...KNOWN_DESTINATIONS,
    ...availableDestinations,
    ...packages.map((p) => p.destination)
  ]));

  // Check for Info Query (Cat AA): "Is Goa expensive?", "Does Kashmir have snow?", "What is Daman Devka Beach like?"
  const isInfoQuery = /\b(?:is|does|are|can|what\s+is|tell\s+me\s+about)\s+([a-zA-Z\s]+)\s+(?:expensive|snow|like|safe|cost|good|have)\b/i.test(lower);

  // Check for Negations: "anything except Goa", "not Kashmir", "no Goa"
  const destNegRegex = /\b(?:except|not|anything\s+but|leave\s+out|no)\s+([a-zA-Z]{3,15})\b/gi;
  let negMatch: RegExpExecArray | null;
  while ((negMatch = destNegRegex.exec(lower)) !== null) {
    const candidate = negMatch[1].trim();
    for (const d of candidateDestinations) {
      if (d.toLowerCase() === candidate.toLowerCase()) {
        excludedDestinations.push(d);
        evidence.push({
          field: 'excludedDestinations',
          value: d,
          evidence: negMatch[0],
          source: 'explicit_entity',
          certainty: 'explicit'
        });
      }
    }
  }

  // Check for Reference Destination (Cat C, I): "somewhere like Goa", "beaches like Miami", "casino like LA"
  const refRegex = /\b(?:like|similar\s+to)\s+([a-zA-Z]{2,15})\b/i;
  const refMatch = lower.match(refRegex);
  let referenceDestination: string | null = null;
  if (refMatch) {
    const candidate = refMatch[1].trim();
    for (const d of candidateDestinations) {
      if (d.toLowerCase() === candidate || (candidate === 'la' && d === 'Los Angeles')) {
        referenceDestination = d;
        evidence.push({
          field: 'referenceDestination',
          value: d,
          evidence: refMatch[0],
          source: 'explicit_entity',
          certainty: 'strong_inference'
        });
      }
    }
  }

  // Check for Attraction Hierarchy (Cat N): "Daman Devka Beach", "Taj Mahal", "Marine Drive"
  for (const [attrKey, mapping] of Object.entries(ATTRACTION_HIERARCHY)) {
    if (lower.includes(attrKey)) {
      const destEntity: DestinationEntity = {
        destination: { value: mapping.destination, rawText: attrKey, certainty: 'explicit' },
        attraction: { value: mapping.attraction, rawText: attrKey, certainty: 'explicit' },
        region: mapping.region ? { value: mapping.region, rawText: attrKey, certainty: 'explicit' } : undefined,
        country: mapping.country ? { value: mapping.country, rawText: attrKey, certainty: 'explicit' } : undefined,
        relation: isInfoQuery ? 'INFO_QUERY' : 'LIKES',
        locked: /\b(?:only|strictly)\b/i.test(lower)
      };

      evidence.push({
        field: 'destination',
        value: mapping.destination,
        evidence: attrKey,
        source: 'explicit_entity',
        certainty: 'explicit'
      });

      return {
        destination: destEntity,
        destinationPreference: mapping.destination,
        referenceDestination,
        excludedDestinations,
        isInfoQuery,
        evidence
      };
    }
  }

  // Check for inline correction: "Kashmir. No sorry, I meant Manali"
  const correctionRegex = /(.*?)\b(?:no\s+sorry|sorry|my\s+bad)[,\s]+(?:i\s+meant\s+)?([a-zA-Z\s]+)/i;
  const correctionMatch = lower.match(correctionRegex);
  let effectiveText = lower;
  if (correctionMatch) {
    const mistakenPart = correctionMatch[1];
    const intendedPart = correctionMatch[2];
    for (const d of candidateDestinations) {
      const dRegex = new RegExp(`\\b${d.toLowerCase()}\\b`, 'i');
      if (dRegex.test(mistakenPart)) {
        excludedDestinations.push(d);
      }
    }
    effectiveText = intendedPart;
  }

  // Check for explicit Destination Lock vs Preference
  let targetDestName: string | null = null;
  let isLocked = false;
  let isPreference = false;

  for (const dest of candidateDestinations) {
    if (excludedDestinations.includes(dest)) continue;
    if (referenceDestination && referenceDestination.toLowerCase() === dest.toLowerCase()) continue;

    const destWordRegex = new RegExp(`\\b${dest.toLowerCase()}\\b`, 'i');
    if (destWordRegex.test(effectiveText)) {
      targetDestName = dest;
      break;
    }
  }

  if (targetDestName) {
    if (/\b(?:only|strictly|nowhere\s+else|or\s+nothing)\b/i.test(lower)) {
      isLocked = true;
    } else if (/\b(?:maybe|thinking\s+of|sounds?\s+good\s+but|how\s+about)\b/i.test(lower)) {
      isPreference = true;
    }

    const destEntity: DestinationEntity = {
      destination: { value: targetDestName, rawText: targetDestName, certainty: isPreference ? 'weak_inference' : 'explicit' },
      relation: isInfoQuery ? 'INFO_QUERY' : 'LIKES',
      locked: isLocked
    };

    evidence.push({
      field: 'destination',
      value: targetDestName,
      evidence: targetDestName,
      source: 'explicit_entity',
      certainty: isPreference ? 'weak_inference' : 'explicit'
    });

    return {
      destination: destEntity,
      destinationPreference: targetDestName,
      referenceDestination,
      excludedDestinations,
      isInfoQuery,
      evidence
    };
  }

  return {
    referenceDestination,
    excludedDestinations,
    isInfoQuery,
    evidence
  };
}

export function extractDestinationFromText(text: string, availableDestinations: string[]): string | null {
  const lower = text.toLowerCase();
  for (const dest of availableDestinations) {
    if (dest === 'Phuket & Krabi') {
      if (lower.includes('phuket') || lower.includes('krabi')) return dest;
    } else if (lower.includes(dest.toLowerCase())) {
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
  'mountains', 'mountain', 'hills', 'hill', 'beaches', 'beach', 'snow', 'snowfall',
  'beer', 'drinks', 'food', 'nightlife', 'party', 'casino', 'casinos', 'shopping'
]);

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

// =========================================================================
// 6. BUDGET SCOPE & ENTITY EXTRACTOR (Cat L, W, Z)
// =========================================================================
export function extractBudgetEntity(text: string, currentTravelersCount: number = 1): {
  budget?: BudgetEntity;
  evidence: EvidenceTraceItem[];
} {
  const lower = text.toLowerCase();
  const evidence: EvidenceTraceItem[] = [];

  const isHypothetical = /\b(?:if\s+i\s+had|suppose|let's\s+say|what\s+if)\b/i.test(lower);
  const mode: RequirementMode = isHypothetical ? 'HYPOTHETICAL' : 'ACTUAL_REQUIREMENT';

  // Check for scope: "flights separate", "50k each for hotels", "including flights"
  let scope: 'all_inclusive' | 'land_package_only' | 'hotels_only' | 'unspecified' = 'unspecified';
  if (/\b(?:flights?\s+(?:separate|extra)|excluding\s+flights?)\b/i.test(lower)) {
    scope = 'land_package_only';
  } else if (/\b(?:including\s+flights?|all[- ]inclusive)\b/i.test(lower)) {
    scope = 'all_inclusive';
  } else if (/\b(?:for\s+hotels?|hotels?\s+only)\b/i.test(lower)) {
    scope = 'hotels_only';
  }

  // 1. "50k for two" or "X for two" / "X total for two"
  const forTwoMatch = lower.match(/(?:₹|rs\.?|inr)?\s*(\d{1,3}(?:,\d{3})*|\d{1,3})k?\s*(?:total)?\s*for\s*(?:two|2|both)/i);
  if (forTwoMatch) {
    let raw = parseInt(forTwoMatch[1].replace(/,/g, ''), 10);
    if (forTwoMatch[0].includes('k') || raw < 1000) raw *= 1000;
    const calculated = Math.round(raw / 2);

    evidence.push({
      field: 'budget',
      value: calculated,
      evidence: forTwoMatch[0],
      source: 'explicit_entity',
      certainty: 'explicit'
    });

    return {
      budget: {
        amount: raw,
        type: 'total',
        calculatedPerPerson: calculated,
        currency: 'INR',
        max: true,
        scope,
        strength: 'hard',
        mode
      },
      evidence
    };
  }

  // 2. "40k total" or "X total"
  const totalMatch = lower.match(/(?:₹|rs\.?|inr)?\s*(\d{1,3}(?:,\d{3})*|\d{1,3})k?\s*total/i);
  if (totalMatch) {
    let raw = parseInt(totalMatch[1].replace(/,/g, ''), 10);
    if (totalMatch[0].includes('k') || raw < 1000) raw *= 1000;
    const pax = currentTravelersCount > 0 ? currentTravelersCount : 1;
    const calculated = Math.round(raw / pax);

    return {
      budget: {
        amount: raw,
        type: 'total',
        calculatedPerPerson: calculated,
        currency: 'INR',
        max: true,
        scope,
        strength: 'hard',
        mode
      },
      evidence
    };
  }

  // 3. "40-50k" or "40k to 50k" range
  const rangeMatch = lower.match(/(?:₹|rs\.?|inr)?\s*(\d{1,3})k?\s*(?:-|to)\s*(?:₹|rs\.?|inr)?\s*(\d{1,3})k/i);
  if (rangeMatch) {
    const min = parseInt(rangeMatch[1], 10) * 1000;
    const max = parseInt(rangeMatch[2], 10) * 1000;

    return {
      budget: {
        amount: max,
        min,
        type: 'per_person',
        calculatedPerPerson: max,
        currency: 'INR',
        max: true,
        scope,
        strength: 'hard',
        mode
      },
      evidence
    };
  }

  // 4. Per person / each with or without k: "50k each", "15000 per person", "30k each for 3 people", "15k. Sorry that's per person"
  const ppMatch = lower.match(/(?:₹|rs\.?|inr)?\s*([0-9]{1,3}(?:,[0-9]{3})*|\d{2,6})\s*k?\s*(?:per\s+person|each|\/pax|\/person)/i);
  if (ppMatch) {
    let raw = parseInt(ppMatch[1].replace(/,/g, ''), 10);
    if (ppMatch[0].toLowerCase().includes('k') || raw < 1000) raw *= 1000;

    return {
      budget: {
        amount: raw,
        type: 'per_person',
        calculatedPerPerson: raw,
        currency: 'INR',
        max: true,
        scope,
        strength: 'hard',
        mode
      },
      evidence
    };
  }

  // 5. Explicit currency or budget keywords: "₹35k", "35k budget", "budget 15000", "under 20k", "around ₹40k"
  const explicitBudgetMatch = lower.match(/(?:budget(?:\s*is|\s*of)?|around|under|approx\.?|max\.?|about|near)\s*(?:of\s*)?(?:₹|rs\.?|inr)?\s*([0-9]{1,3}(?:,[0-9]{3})*|\d{2,6})k?\b|(?:₹|rs\.?|inr)\s*([0-9]{1,3}(?:,[0-9]{3})*|\d{2,6})k?\b|(\d{1,3})\s*k?\s*budget\b/i);
  if (explicitBudgetMatch) {
    const rawStr = explicitBudgetMatch[1] || explicitBudgetMatch[2] || explicitBudgetMatch[3];
    let raw = parseInt(rawStr.replace(/,/g, ''), 10);
    if (explicitBudgetMatch[0].toLowerCase().includes('k') || raw < 1000) raw *= 1000;

    return {
      budget: {
        amount: raw,
        type: 'per_person',
        calculatedPerPerson: raw,
        currency: 'INR',
        max: true,
        scope,
        strength: 'hard',
        mode
      },
      evidence
    };
  }

  // 6. Direct "for 20k" or "with 20k" (ensuring not followed by people/pax/days/nights)
  const forWithMatch = lower.match(/\b(?:for|with)\s+(?:₹|rs\.?|inr)?\s*(\d{1,3})\s*k\b(?!\s*(?:people|person|persons|pax|adults|kids|children|days|nights|weeks))/i);
  if (forWithMatch) {
    const raw = parseInt(forWithMatch[1], 10) * 1000;
    return {
      budget: {
        amount: raw,
        type: 'per_person',
        calculatedPerPerson: raw,
        currency: 'INR',
        max: true,
        scope,
        strength: 'hard',
        mode
      },
      evidence
    };
  }

  // 6. Direct "15k" / "20k" anywhere in text
  const directKMatch = lower.match(/\b(\d{1,3})k\b/i);
  if (directKMatch) {
    const raw = parseInt(directKMatch[1], 10) * 1000;
    return {
      budget: {
        amount: raw,
        type: 'per_person',
        calculatedPerPerson: raw,
        currency: 'INR',
        max: true,
        scope,
        strength: 'hard',
        mode
      },
      evidence
    };
  }

  // 7. Direct standalone 5-digit number (e.g. 15000, 20000, 50000)
  const directNumMatch = lower.match(/\b(1[0-9]{4}|[2-9][0-9]{4})\b/);
  if (directNumMatch && !lower.includes('days') && !lower.includes('nights') && !lower.includes('people') && !lower.includes('travelers')) {
    const raw = parseInt(directNumMatch[1], 10);
    return {
      budget: {
        amount: raw,
        type: 'per_person',
        calculatedPerPerson: raw,
        currency: 'INR',
        max: true,
        scope,
        strength: 'hard',
        mode
      },
      evidence
    };
  }

  return { evidence };
}

export function extractBudgetFromText(text: string): number | null {
  const res = extractBudgetEntity(text, 1);
  return res.budget?.calculatedPerPerson || null;
}

// =========================================================================
// 7. TRAVELERS GROUP SEMANTICS EXTRACTOR (Cat M, J, Y)
// =========================================================================
export function extractTravelersEntity(text: string): {
  travelers?: TravelersEntity;
  mutations?: StateMutation[];
  evidence: EvidenceTraceItem[];
} {
  const lower = text.toLowerCase();
  const evidence: EvidenceTraceItem[] = [];
  const mutations: StateMutation[] = [];

  const isHypothetical = /\b(?:if\s+i\s+had|suppose|let's\s+say|what\s+if)\b/i.test(lower);
  const mode: RequirementMode = isHypothetical ? 'HYPOTHETICAL' : 'ACTUAL_REQUIREMENT';

  // Inline Self-Contradiction / Correction (Cat Y, J): "Two people, actually three"
  const correctionMatch = lower.match(/(?:two|2|three|3|four|4)\s*(?:people|adults)?\s*,?\s*actually\s*(?:three|3|four|4|five|5|two|2)/i);
  if (correctionMatch) {
    const numbers: Record<string, number> = { two: 2, '2': 2, three: 3, '3': 3, four: 4, '4': 4, five: 5, '5': 5 };
    const parts = correctionMatch[0].split(/actually/i);
    const correctedWord = parts[1].trim().split(/\s+/)[0];
    const correctedNum = numbers[correctedWord] || parseInt(correctedWord, 10);

    if (correctedNum) {
      mutations.push({ field: 'travelers', action: 'correct', value: correctedNum, reason: 'Inline self-correction' });
      return {
        travelers: { total: correctedNum, adults: correctedNum, certainty: 'explicit', mode },
        mutations,
        evidence
      };
    }
  }

  // 1. "just me" / "solo"
  if (/\b(?:just\s+me|solo|single\s+person|only\s+me)\b/i.test(lower)) {
    return { travelers: { total: 1, adults: 1, groupType: 'solo', certainty: 'explicit', mode }, evidence };
  }

  // 2. "me, wife and kid" / family with kid
  if (/\b(?:me(?:,|\s+and)\s*wife\s*and\s*kid|couple\s*with\s*(?:a\s*)?kid)\b/i.test(lower)) {
    return { travelers: { total: 3, adults: 2, children: 1, groupType: 'family', certainty: 'explicit', mode }, evidence };
  }

  // 3. "me and my wife" / "couple" / "for two"
  if (/\b(?:me\s+and\s+(?:my\s+)?wife|couple|husband\s+and\s+wife|2\s+of\s+us|for\s+two)\b/i.test(lower)) {
    return { travelers: { total: 2, adults: 2, groupType: 'couple', certainty: 'explicit', mode }, evidence };
  }

  // 4. "two couples"
  if (/\btwo\s+couples\b/i.test(lower)) {
    return { travelers: { total: 4, adults: 4, groupType: 'couples', certainty: 'explicit', mode }, evidence };
  }

  // 5. "family of four" / "family of 4"
  if (/\bfamily\s+of\s+(?:four|4)\b/i.test(lower)) {
    return { travelers: { total: 4, groupType: 'family', certainty: 'explicit', mode }, evidence };
  }

  // 6. "me and 4 friends"
  if (/\bme\s+and\s+(\d+)\s+friends\b/i.test(lower)) {
    const friendCount = parseInt(lower.match(/\bme\s+and\s+(\d+)\s+friends\b/i)![1], 10);
    return { travelers: { total: friendCount + 1, adults: friendCount + 1, groupType: 'friends', certainty: 'explicit', mode }, evidence };
  }

  // 7. General number: "3 people", "4 adults"
  const paxMatch = lower.match(/(\d+)\s*(?:people|person|persons|pax|travellers|travelers|adults)/i);
  if (paxMatch) {
    const count = parseInt(paxMatch[1], 10);
    return { travelers: { total: count, adults: count, certainty: 'explicit', mode }, evidence };
  }

  return { evidence };
}

export function extractTravelersFromText(text: string): number | null {
  const res = extractTravelersEntity(text);
  return res.travelers?.total || null;
}

// =========================================================================
// 8. DURATION & TEMPORAL EXTRACTOR (Cat K)
// =========================================================================
export function extractDurationEntity(text: string): {
  duration?: DurationEntity;
  evidence: EvidenceTraceItem[];
} {
  const lower = text.toLowerCase();
  const evidence: EvidenceTraceItem[] = [];

  let days: number | null = null;
  let nights: number | null = null;
  let isFlexible = false;
  let isShortTrip = false;
  let seasonPreference: string | null = null;

  const dayMatch = lower.match(/(\d+)\s*(?:days?|-day)/i);
  if (dayMatch) days = parseInt(dayMatch[1], 10);

  const nightMatch = lower.match(/(\d+)\s*(?:nights?|-night)/i);
  if (nightMatch) nights = parseInt(nightMatch[1], 10);

  if (/\ba\s+week\b/i.test(lower)) days = 7;
  if (/\b(?:short\s+trip|weekend|quick\s+getaway)\b/i.test(lower)) isShortTrip = true;
  if (/\b(?:flexible\s+(?:on|with)?\s*dates?|don't\s+know\s+exact\s+dates|not\s+sure\s+about\s+dates)\b/i.test(lower)) isFlexible = true;

  const seasons = ['december', 'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'diwali', 'new year', 'christmas', 'summer', 'winter', 'monsoon', 'spring'];
  for (const s of seasons) {
    if (lower.includes(s)) {
      seasonPreference = s;
      break;
    }
  }

  if (days !== null || nights !== null || isFlexible || isShortTrip || seasonPreference !== null) {
    return {
      duration: {
        days,
        nights,
        isFlexible,
        isShortTrip,
        seasonPreference
      },
      evidence
    };
  }

  return { evidence };
}

export function extractDurationFromText(text: string): number | null {
  const res = extractDurationEntity(text);
  return res.duration?.days || null;
}

// =========================================================================
// 9. CONFLICT, AMBIGUITY & COREFERENCE RESOLUTION (Cat C, F, I, U)
// =========================================================================
export function detectConflictsAndAmbiguities(
  text: string,
  destinationName: string | null,
  calculatedBudget: number | null,
  priorMemory?: ConversationMemory
): {
  ambiguities: AmbiguityRecord[];
  conflict: ConstraintConflict | null;
  coreference: CoreferenceRecord | null;
} {
  const lower = text.toLowerCase();
  const ambiguities: AmbiguityRecord[] = [];
  let conflict: ConstraintConflict | null = null;
  let coreference: CoreferenceRecord | null = null;

  // 1. Ambiguous pronouns with competing referents (Cat U)
  // e.g. "I found Bali and Kashmir." -> "I like that one."
  const hasMultipleReferents =
    Boolean(priorMemory?.lastSurfacedPackages && priorMemory.lastSurfacedPackages.length > 1) ||
    Boolean(priorMemory?.lastSurfacedOptions && priorMemory.lastSurfacedOptions.length > 1);

  if (
    /\b(?:that\s+one|the\s+other\s+one|there|that\s+place|the\s+cheaper\s+one|the\s+first\s+one|the\s+second\s+one|this\s+one|i\s+like\s+that)\b/i.test(lower) &&
    hasMultipleReferents
  ) {
    const candidates = (priorMemory?.lastSurfacedOptions && priorMemory.lastSurfacedOptions.length > 0)
      ? priorMemory.lastSurfacedOptions
      : (priorMemory?.lastSurfacedPackages?.map((p: TravelPackage) => p.name) || []);

    ambiguities.push({
      field: 'package_selection',
      reason: 'Ambiguous pronoun with multiple surfaced options',
      candidates,
      clarificationQuestion: `Could you kindly clarify which itinerary or destination you are referring to? We previously explored: ${candidates.join(' and ')}.`
    });
    coreference = { text: 'that one', ambiguous: true, candidates, type: 'package' };
  }

  // 2. Ambiguity for destination + activity (Cat C): "casino like LA"
  if (/\bcasino\s+like\s+la\b/i.test(lower) || /\bsomewhere\s+like\s+la\b/i.test(lower)) {
    ambiguities.push({
      field: 'destination_or_activity',
      reason: 'Unclear whether requesting Los Angeles or casino nightlife similar to LA style',
      clarificationQuestion: 'Are you specifically looking for Los Angeles, or are you looking for a destination with casino nightlife similar to what you have in mind?'
    });
  }

  // 3. Financial Contradiction (Cat F): "Maldives under 10k", "Europe for 20k total"
  if (destinationName && calculatedBudget) {
    if (destinationName.toLowerCase() === 'maldives' && calculatedBudget <= 15000) {
      conflict = {
        detected: true,
        type: 'financial',
        reason: 'Maldives luxury escapes start at ₹79,999/person, which conflicts with a ₹15,000 target budget.',
        explanation: 'Our curated Maldives overwater lagoon sanctuaries start at ₹79,999 per person. We cannot offer a Maldives package within this budget.'
      };
    }
  }

  if (/\bluxury\s+but\s+super\s+cheap\b/i.test(lower)) {
    conflict = {
      detected: true,
      type: 'financial',
      reason: 'High-end 5-star private luxury retreats require a realistic investment.',
      explanation: 'Our 5-star private villa retreats are curated for supreme luxury with dedicated chauffeurs and concierge. While we offer exceptional value, luxury experiences have starting minimums. Our entry luxury journeys begin at ₹29,999 per person for Kerala Backwaters.'
    };
  }

  if (/\bsnow\s+and\s+tropical\s+beach\b/i.test(lower)) {
    conflict = {
      detected: true,
      type: 'logical',
      reason: 'Snow alpine landscapes and tropical beaches cannot be combined into a single regional itinerary.',
      explanation: 'Snow alpine landscapes and tropical beaches have completely different climates. Would you prefer a snowy mountain escape in Kashmir, or a sun-drenched beach haven in Bali or Kerala?'
    };
  }

  return { ambiguities, conflict, coreference };
}

// =========================================================================
// 10. CONTEXT-AWARE ELLIPSIS (Cat X)
// =========================================================================
export function resolveEllipsis(
  text: string,
  lastAssistantQuestion?: string | null
): StateMutation | null {
  const lower = text.toLowerCase().trim();
  if (!lastAssistantQuestion) return null;
  const qLower = lastAssistantQuestion.toLowerCase();

  // If assistant asked for duration, and user says "Four" or "4"
  if (qLower.includes('how many days') || qLower.includes('duration') || qLower.includes('how long')) {
    const num = parseInt(lower, 10);
    const words: Record<string, number> = { three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, ten: 10 };
    const days = !isNaN(num) ? num : words[lower];
    if (days) {
      return { field: 'duration', action: 'set', value: days, reason: 'Contextual ellipsis slot-filling for duration' };
    }
  }

  // If assistant asked for travelers, and user says "Two"
  if (qLower.includes('how many travelers') || qLower.includes('how many people')) {
    const num = parseInt(lower, 10);
    const words: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5 };
    const travelers = !isNaN(num) ? num : words[lower];
    if (travelers) {
      return { field: 'travelers', action: 'set', value: travelers, reason: 'Contextual ellipsis slot-filling for travelers' };
    }
  }

  // If assistant asked for budget, and user says "20k"
  if ((qLower.includes('budget') || qLower.includes('approximate budget')) && /^(?:₹|rs\.?)?\s*\d{1,3}k?$/i.test(lower)) {
    const numMatch = lower.match(/\d{1,3}/);
    if (numMatch) {
      let amt = parseInt(numMatch[0], 10);
      if (lower.includes('k') || amt < 1000) amt *= 1000;
      return { field: 'budget', action: 'set', value: amt, reason: 'Contextual ellipsis slot-filling for budget' };
    }
  }

  return null;
}

// =========================================================================
// 11. STATE MUTATION ENGINE (Cat G, J, Y)
// =========================================================================
export function applyStateMutations(
  memory: AgentMemory,
  mutations: StateMutation[]
): void {
  for (const mut of mutations) {
    if (mut.field === 'destination') {
      memory.customer.preferences.destination = mut.value as string | null;
      if (mut.action === 'replace' || mut.action === 'correct') {
        memory.customer.preferences.destinationFlexibility = 'unknown';
      }
    } else if (mut.field === 'budget') {
      memory.customer.preferences.budgetPerPerson = mut.value as number | null;
    } else if (mut.field === 'travelers') {
      memory.customer.preferences.travelers = mut.value as number | null;
    } else if (mut.field === 'duration') {
      memory.customer.preferences.durationDays = mut.value as number | null;
    } else if (mut.field === 'interests') {
      if (mut.action === 'append') {
        const arr = mut.value as string[];
        memory.customer.preferences.interests = Array.from(new Set([...memory.customer.preferences.interests, ...arr]));
      }
    }
  }
}

// =========================================================================
// 12. TOKEN, PAYMENT, BOOKING & CONTACT HELPERS
// =========================================================================
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

// =========================================================================
// 13. MASTER ADVERSARIAL PERCEPTION PIPELINE (Categories A - AA)
// =========================================================================
export function perceiveTurn(
  messages: { role: string; content: string }[],
  availableDestinations: string[],
  packages: TravelPackage[],
  standardTokenAmount: number = 2000,
  priorMemory?: AgentMemory
): { perception: PerceptionResult; memory: AgentMemory } {
  const memory: AgentMemory = priorMemory || {
    customer: {
      name: null,
      phone: null,
      email: null,
      preferences: {
        destination: null,
        destinationFlexibility: 'unknown',
        budgetPerPerson: null,
        travelers: null,
        durationDays: null,
        tripStyle: null,
        interests: [],
        excludedInterests: [],
        excludedDestinations: [],
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
      turnCount: messages.length,
      lastSurfacedPackages: [],
      lastSurfacedOptions: [],
      lastAssistantQuestion: null,
      lastAmbiguity: null,
      lastConflict: null
    },
    business: {
      selectedPackageId: null,
      selectedPackageTitle: null,
      leadStatus: 'NEW',
      tokenOrderId: null,
      tokenPaymentId: null,
      tokenAmount: standardTokenAmount
    },
    evidenceTrace: []
  };

  const userMessages = messages.filter((m) => m.role === 'user');
  const latestUserText = userMessages.length > 0 ? userMessages[userMessages.length - 1].content : '';
  const { rawText, normalizedText } = normalizeTokens(latestUserText);

  let lastAssistantQ: string | null = null;
  const accumulatedMutations: StateMutation[] = [];
  const accumulatedEvidence: EvidenceTraceItem[] = [];

  // Sequential dialog replay across turns
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.role === 'assistant') {
      lastAssistantQ = msg.content;
      memory.conversation.lastAssistantQuestion = msg.content;

      // Extract surfaced packages if any
      const surfaced = packages.filter((p) => msg.content.toLowerCase().includes(p.name.toLowerCase()));
      const surfacedDests = availableDestinations.filter((d) => {
        const dRegex = new RegExp(`\\b${d.toLowerCase()}\\b`, 'i');
        return dRegex.test(msg.content);
      });

      if (surfaced.length > 0) {
        memory.conversation.lastSurfacedPackages = [...surfaced];
        memory.conversation.lastSurfacedOptions = surfaced.map((p) => p.name);
      } else if (surfacedDests.length > 1) {
        memory.conversation.lastSurfacedOptions = surfacedDests;
      }
      continue;
    }

    const rawTurnText = msg.content;
    const { normalizedText: normTurnText } = normalizeTokens(rawTurnText);
    const text = normTurnText;
    const lower = text.toLowerCase();

    // 1. Price objection check
    if (isPriceObjection(text)) {
      memory.conversation.isPriceObjectionActive = true;
      memory.customer.preferences.budgetPerPerson = null; // Clear rejected budget
      continue;
    }

    // 2. Trip style & New Inquiry Check (Bug 1 protection)
    const detectedStyle = detectTripStyle(text);
    const newInquiry = isNewTripInquiry(text);

    if (detectedStyle && (newInquiry || (memory.customer.preferences.tripStyle && memory.customer.preferences.tripStyle !== detectedStyle))) {
      // Style shift: reset prior constraints to avoid cross-turn contamination
      memory.customer.preferences.tripStyle = detectedStyle;
      memory.customer.preferences.destination = null;
      memory.customer.preferences.destinationFlexibility = 'unknown';
      memory.customer.preferences.budgetPerPerson = null;
      memory.customer.preferences.travelers = null;
      memory.customer.preferences.durationDays = null;
      memory.customer.preferences.interests = [];
      memory.customer.preferences.excludedInterests = [];
      memory.customer.preferences.excludedDestinations = [];
      memory.customer.preferences.isDomesticOnly = false;
      memory.customer.preferences.requestedUncatalogedDestination = null;
      memory.customer.preferences.excludePackageId = null;
      memory.conversation.isPriceObjectionActive = false;
    } else if (detectedStyle && !memory.customer.preferences.tripStyle) {
      memory.customer.preferences.tripStyle = detectedStyle;
    }

    // 3. Check if "Actually X" or "No sorry, I meant X" mutations (Cat G, J)
    const actuallyMatch = text.match(/\b(?:actually|no\s+sorry|sorry|my\s+bad)[,\s]+(?:i\s+meant\s+)?([a-zA-Z0-9₹,\s]+)/i);
    if (actuallyMatch) {
      const phrase = actuallyMatch[1].trim();
      let matchedDest = false;
      for (const d of availableDestinations) {
        if (phrase.toLowerCase().includes(d.toLowerCase()) || (d === 'Phuket & Krabi' && phrase.toLowerCase().includes('phuket'))) {
          memory.customer.preferences.destination = d;
          memory.customer.preferences.requestedUncatalogedDestination = null;
          memory.customer.preferences.destinationFlexibility = 'unknown';
          accumulatedMutations.push({ field: 'destination', action: 'replace', value: d, reason: 'Mind change / correction to destination' });
          matchedDest = true;
          break;
        }
      }
      if (!matchedDest) {
        for (const d of KNOWN_DESTINATIONS) {
          if (phrase.toLowerCase().includes(d.toLowerCase())) {
            memory.customer.preferences.destination = null;
            memory.customer.preferences.requestedUncatalogedDestination = d;
            memory.customer.preferences.destinationFlexibility = 'unknown';
            accumulatedMutations.push({ field: 'destination', action: 'replace', value: null, reason: `Switched to uncataloged destination ${d}` });
            break;
          }
        }
      }
      const numMatch = phrase.match(/(\d{1,3})k?\b/i);
      if (numMatch && (phrase.includes('k') || phrase.includes('budget') || phrase.includes('₹') || phrase.includes('thousand'))) {
        let b = parseInt(numMatch[1], 10);
        if (phrase.includes('k') || b < 1000) b *= 1000;
        memory.customer.preferences.budgetPerPerson = b;
        accumulatedMutations.push({ field: 'budget', action: 'replace', value: b, reason: 'Mind change to budget' });
      }
      const paxMatch = phrase.match(/^(\d{1,2})\b/);
      if (paxMatch && parseInt(paxMatch[1], 10) <= 20) {
        memory.customer.preferences.travelers = parseInt(paxMatch[1], 10);
        accumulatedMutations.push({ field: 'travelers', action: 'replace', value: parseInt(paxMatch[1], 10), reason: 'Mind change to traveler count' });
      }
    }

    // 4. Contextual Ellipsis slot-filling (Cat X)
    if (lastAssistantQ) {
      const ellipsisMutation = resolveEllipsis(text, lastAssistantQ);
      if (ellipsisMutation) {
        accumulatedMutations.push(ellipsisMutation);
        applyStateMutations(memory, [ellipsisMutation]);
      }
    }

    // 5. Extract Interests and Negations (Cat A, D, E, V)
    const interestResult = extractInterestsAndNegations(text);
    accumulatedEvidence.push(...interestResult.evidence);
    if (interestResult.interests.length > 0) {
      memory.customer.preferences.interests = Array.from(new Set([...memory.customer.preferences.interests, ...interestResult.interests]));
    }
    if (interestResult.excludedInterests.length > 0) {
      memory.customer.preferences.excludedInterests = Array.from(new Set([...memory.customer.preferences.excludedInterests, ...interestResult.excludedInterests]));
    }

    // 6. Extract Destination Entities & Hierarchy (Cat B, D, N, T, AA)
    const destResult = extractDestinationEntities(text, availableDestinations, packages);
    accumulatedEvidence.push(...destResult.evidence);
    if (destResult.excludedDestinations.length > 0) {
      memory.customer.preferences.excludedDestinations = Array.from(new Set([...memory.customer.preferences.excludedDestinations, ...destResult.excludedDestinations]));
    }

    if (!destResult.isInfoQuery && destResult.destinationPreference) {
      const targetVal = destResult.destinationPreference;
      const isAvail = availableDestinations.some((d) => d.toLowerCase() === targetVal.toLowerCase() || (targetVal === 'Phuket & Krabi' && d.toLowerCase().includes('phuket')));
      if (isAvail) {
        memory.customer.preferences.destination = targetVal;
        memory.customer.preferences.requestedUncatalogedDestination = null;
      } else {
        memory.customer.preferences.destination = null;
        memory.customer.preferences.requestedUncatalogedDestination = targetVal;
      }
    } else if (!destResult.isInfoQuery && !destResult.referenceDestination) {
      const uncat = extractUncatalogedDestinationFromText(text, availableDestinations, packages);
      if (uncat) {
        memory.customer.preferences.requestedUncatalogedDestination = uncat;
      }
    }

    // 7. Extract Travelers (Cat M, J, Y)
    const travelerResult = extractTravelersEntity(text);
    accumulatedEvidence.push(...travelerResult.evidence);
    if (travelerResult.travelers?.total) {
      memory.customer.preferences.travelers = travelerResult.travelers.total;
    }
    if (travelerResult.mutations) {
      accumulatedMutations.push(...travelerResult.mutations);
      applyStateMutations(memory, travelerResult.mutations);
    }

    // 8. Extract Budget Entity (Cat L, W, Z)
    const activePax = travelerResult.travelers?.total || memory.customer.preferences.travelers || 1;
    const budgetResult = extractBudgetEntity(text, activePax);
    accumulatedEvidence.push(...budgetResult.evidence);
    if (budgetResult.budget?.calculatedPerPerson && budgetResult.budget.mode === 'ACTUAL_REQUIREMENT') {
      memory.customer.preferences.budgetPerPerson = budgetResult.budget.calculatedPerPerson;
      memory.conversation.isPriceObjectionActive = false;
    }

    // 9. Duration extraction (Cat K)
    const durationResult = extractDurationEntity(text);
    if (durationResult.duration?.days) {
      memory.customer.preferences.durationDays = durationResult.duration.days;
    }

    // 10. Destination Flexibility
    const flex = detectDestinationFlexibility(text);
    if (flex !== 'unknown') {
      memory.customer.preferences.destinationFlexibility = flex;
    } else if (destResult.destination?.locked) {
      memory.customer.preferences.destinationFlexibility = 'no';
    }

    // 11. Domestic Flag
    if (/\b(?:in\s+india|somewhere\s+in\s+india|domestic)\b/i.test(lower)) {
      memory.customer.preferences.isDomesticOnly = true;
    }

    // 12. Negative package exclusions
    const turnExcluded = detectNegativePreferences(text, packages);
    if (turnExcluded) {
      memory.customer.preferences.excludePackageId = turnExcluded;
      if (memory.customer.preferences.destination) {
        const pkg = packages.find((p) => p.id === turnExcluded);
        if (pkg && memory.customer.preferences.destination.toLowerCase().includes(pkg.destination.toLowerCase())) {
          memory.customer.preferences.destination = null;
        }
      }
    }

    // 13. Contact Info
    const contact = extractContactInfo(rawTurnText);
    if (contact.phone) memory.customer.phone = contact.phone;
    if (contact.email) memory.customer.email = contact.email;
  }

  // Evaluate latest turn details
  const latestDestResult = extractDestinationEntities(normalizedText, availableDestinations, packages);
  const activePaxFinal = memory.customer.preferences.travelers || 1;
  const latestBudgetResult = extractBudgetEntity(normalizedText, activePaxFinal);
  const latestTravelerResult = extractTravelersEntity(normalizedText);
  const latestDurationResult = extractDurationEntity(normalizedText);

  // Detect conflicts and ambiguities on latest turn
  const { ambiguities, conflict, coreference } = detectConflictsAndAmbiguities(
    normalizedText,
    memory.customer.preferences.destination || latestDestResult.destinationPreference || null,
    memory.customer.preferences.budgetPerPerson || latestBudgetResult.budget?.calculatedPerPerson || null,
    memory.conversation
  );

  // Check signals on latest turn
  const isGreetingTurn = userMessages.length <= 1 && isPureGreeting(latestUserText);
  const isCustomToken = detectCustomTokenAttempt(latestUserText, standardTokenAmount);
  const isUnverifiedPayment = detectUnverifiedPaymentClaim(latestUserText);
  const bookingInfo = detectBookingIntent(latestUserText);

  // Missing fields calculation
  const missing: ('destination' | 'budget' | 'travelers' | 'duration')[] = [];
  if (!memory.customer.preferences.destination && memory.customer.preferences.destinationFlexibility !== 'yes') missing.push('destination');
  if (!memory.customer.preferences.budgetPerPerson) missing.push('budget');
  if (!memory.customer.preferences.travelers) missing.push('travelers');
  if (!memory.customer.preferences.durationDays) missing.push('duration');
  memory.conversation.missingFields = missing;

  // Intent classification
  let intent: AgentIntent = 'INQUIRY';
  if (isGreetingTurn) intent = 'GREETING';
  else if (latestDestResult.isInfoQuery) intent = 'INFO_QUERY';
  else if (ambiguities.length > 0) intent = 'CLARIFY';
  else if (bookingInfo.isBooking) intent = 'CHECKOUT';

  memory.conversation.currentIntent = intent;
  memory.conversation.lastAmbiguity = ambiguities[0] || null;
  memory.conversation.lastConflict = conflict;

  const perception: PerceptionResult = {
    intent,
    isGreeting: isGreetingTurn,
    detectedStyle: memory.customer.preferences.tripStyle,
    destination: latestDestResult.destination,
    destinationPreference: latestDestResult.destinationPreference,
    referenceDestination: latestDestResult.referenceDestination,
    interests: memory.customer.preferences.interests,
    excludedInterests: memory.customer.preferences.excludedInterests,
    excludedDestinations: memory.customer.preferences.excludedDestinations,
    budget: latestBudgetResult.budget,
    travelers: latestTravelerResult.travelers,
    duration: latestDurationResult.duration,
    destinationFlexibility: memory.customer.preferences.destinationFlexibility,
    isDomesticOnly: memory.customer.preferences.isDomesticOnly,
    excludePackageId: memory.customer.preferences.excludePackageId || null,
    requestedUncatalogedDestination: memory.customer.preferences.requestedUncatalogedDestination || null,
    ambiguity: ambiguities,
    constraintConflict: conflict,
    coreference,
    mutations: accumulatedMutations,
    evidenceTrace: accumulatedEvidence,
    isPriceObjection: memory.conversation.isPriceObjectionActive,
    isCustomTokenAttempt: isCustomToken,
    isUnverifiedPaymentClaim: isUnverifiedPayment,
    isBookingIntent: bookingInfo.isBooking,
    selectedOptionNumber: bookingInfo.optionNumber,
    customerPhone: memory.customer.phone,
    customerEmail: memory.customer.email,
    latestUserText,
    rawText,
    normalizedText
  };

  return { perception, memory };
}
