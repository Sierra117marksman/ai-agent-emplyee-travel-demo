export interface TravelPackage {
  id: string;
  name: string;
  title: string; // compatibility alias for name
  destination: string;
  country: string;
  isDomesticIndia: boolean;
  duration: string;
  days: number;
  nights: number;
  pricePerPerson: number;
  currency: string;
  category: string;
  rating: number;
  reviewsCount: number;
  description: string;
  inclusions: string[];
  exclusions: string[];
  interests: string[];
  suitableFor: string[];
  availabilityStatus: 'available' | 'limited' | 'sold_out';
  highlights: string[];
  gradient?: string;
}

export const TRAVEL_PACKAGES: TravelPackage[] = [
  {
    id: 'bali-romantic-villa',
    name: 'Bali Romantic Villa Escape',
    title: 'Bali Romantic Villa Escape',
    destination: 'Bali',
    country: 'Indonesia',
    isDomesticIndia: false,
    duration: '5 Days / 4 Nights',
    days: 5,
    nights: 4,
    pricePerPerson: 44999,
    currency: 'INR',
    category: 'honeymoon',
    rating: 4.9,
    reviewsCount: 128,
    description: 'Designed for couples, blending the mist-shrouded jungle serenity of Ubud with vibrant beachfront sunsets in Seminyak.',
    inclusions: [
      '4 Nights 5-Star Luxury Villa with Private Pool',
      'Daily Floating Breakfast & 1 Candlelight Dinner at Jimbaran',
      'Private Chauffeur & English Speaking Guide throughout',
      'Nusa Penida Catamaran Sunset Cruise with Fast Boat Transfers'
    ],
    exclusions: [
      'International Flight Airfare',
      'Indonesia Visa on Arrival fee (~$35 USD)',
      'Personal laundry, tips, and optional water-sport rentals'
    ],
    interests: ['romantic', 'beaches', 'villas', 'culture', 'sunset-cruise', 'spa'],
    suitableFor: ['couples', 'honeymooners'],
    availabilityStatus: 'available',
    highlights: [
      'Private pool villa in Ubud & Seminyak beachfront resort',
      'Nusa Penida sunset catamaran cruise with champagne',
      'Couples Balinese aromatherapy spa session',
      'Candlelight dinner at Jimbaran Bay'
    ],
    gradient: 'from-emerald-500 to-teal-700'
  },
  {
    id: 'kashmir-heaven-valleys',
    name: 'Kashmir Valley & Houseboat Bliss',
    title: 'Kashmir Valley & Houseboat Bliss',
    destination: 'Kashmir',
    country: 'India',
    isDomesticIndia: true,
    duration: '6 Days / 5 Nights',
    days: 6,
    nights: 5,
    pricePerPerson: 38500,
    currency: 'INR',
    category: 'honeymoon',
    rating: 4.8,
    reviewsCount: 210,
    description: 'Snow-capped Himalayan peaks, fragrant pine meadows, Gulmarg alpine gondolas, and timeless Dal Lake romance.',
    inclusions: [
      '1 Night Heritage Houseboat on Dal Lake + 4 Nights Boutique Valley Resorts',
      'Breakfast & Gourmet Kashmiri Multi-Course Dinners included',
      'Dedicated Private SUV (Innova/Crysta) for entire valley tour',
      'Gondola Priority Booking Assistance & 1-hour Shikara Ride'
    ],
    exclusions: [
      'Flight tickets to/from Srinagar',
      'Pony rides or local union sledges in Gulmarg/Pahalgam',
      'Chain-cab transfers in heavy snow conditions'
    ],
    interests: ['mountains', 'snow', 'romantic', 'nature', 'houseboat', 'adventure'],
    suitableFor: ['couples', 'honeymooners', 'families', 'nature-lovers'],
    availabilityStatus: 'available',
    highlights: [
      'Handcrafted heritage houseboat stay on Dal Lake',
      'Gulmarg Gondola Phase 1 & 2 alpine snow excursion',
      'Pahalgam Betaab Valley & Aru Valley private exploration',
      'Shikara ride at golden sunset with Kashmiri Kahwa'
    ],
    gradient: 'from-blue-600 to-indigo-800'
  },
  {
    id: 'dubai-luxury-desert',
    name: 'Dubai Ultra Luxury & Desert Dunes',
    title: 'Dubai Ultra Luxury & Desert Dunes',
    destination: 'Dubai',
    country: 'UAE',
    isDomesticIndia: false,
    duration: '5 Days / 4 Nights',
    days: 5,
    nights: 4,
    pricePerPerson: 54999,
    currency: 'INR',
    category: 'luxury',
    rating: 4.9,
    reviewsCount: 94,
    description: 'Cosmopolitan glamour, iconic sky lounges, private desert safaris, and 5-star Arabian hospitality.',
    inclusions: [
      '4 Nights at 5-Star Downtown Dubai Hotel',
      'Daily international buffet breakfast',
      'VIP Desert Safari in 4x4 Land Cruiser with BBQ dinner & show',
      'Burj Khalifa 124th + 125th Floor Sky Lounge admission',
      'Private luxury sedan airport & excursion transfers'
    ],
    exclusions: [
      'UAE Tourist Visa fees',
      'Tourism Dirham tax (payable directly at hotel checkout)',
      'Optional skydiving or helicopter tours'
    ],
    interests: ['luxury', 'shopping', 'desert', 'architecture', 'family-fun'],
    suitableFor: ['families', 'luxury-seekers', 'couples'],
    availabilityStatus: 'available',
    highlights: [
      'Burj Khalifa 124th + 125th Floor Sky Lounge admission',
      'Private VIP Desert Safari with dune bashing & barbecue',
      'Marina Yacht sunset cruise with international buffet',
      'Aquaventure Waterpark at Atlantis The Palm'
    ],
    gradient: 'from-amber-500 to-orange-700'
  },
  {
    id: 'kerala-backwaters-munnar',
    name: 'Kerala Backwaters & Munnar Mist',
    title: 'Kerala Backwaters & Munnar Mist',
    destination: 'Kerala',
    country: 'India',
    isDomesticIndia: true,
    duration: '5 Days / 4 Nights',
    days: 5,
    nights: 4,
    pricePerPerson: 29999,
    currency: 'INR',
    category: 'relaxed',
    rating: 4.7,
    reviewsCount: 165,
    description: 'Rolling tea estates, cool hill station breezes, tranquil palm backwaters, and Ayurvedic wellness.',
    inclusions: [
      '3 Nights Luxury Tea Estate Resort in Munnar + 1 Night Deluxe Houseboat',
      'Houseboat all meals included (traditional Kerala culinary spread)',
      'Dedicated AC Chauffeur sedan throughout tour with tolls included',
      'Ayurvedic spice garden discovery tour & tea tasting'
    ],
    exclusions: [
      'Train or air tickets to/from Kochi',
      'Optional Kathakali or Kalaripayattu cultural performance tickets',
      'Personal expenses and extra safari jeeps'
    ],
    interests: ['nature', 'tea-gardens', 'houseboat', 'wellness', 'relaxation'],
    suitableFor: ['families', 'couples', 'elderly-friendly'],
    availabilityStatus: 'available',
    highlights: [
      'Munnar tea gardens & Mattupetty dam nature trek',
      'Private AC Alleppey houseboat cruise with onboard chef',
      'Spice plantation discovery walk in Thekkady',
      'Traditional Ayurvedic rejuvenation session'
    ],
    gradient: 'from-teal-600 to-emerald-800'
  },
  {
    id: 'thailand-island-hop',
    name: 'Thailand Island Hopping & Phuket',
    title: 'Thailand Island Hopping & Phuket',
    destination: 'Phuket & Krabi',
    country: 'Thailand',
    isDomesticIndia: false,
    duration: '6 Days / 5 Nights',
    days: 6,
    nights: 5,
    pricePerPerson: 39999,
    currency: 'INR',
    category: 'adventure',
    rating: 4.8,
    reviewsCount: 142,
    description: 'Speedboat island expeditions, turquoise snorkeling lagoons, dramatic limestone karsts, and nightlife.',
    inclusions: [
      '3 Nights Phuket Beachfront Hotel + 2 Nights Krabi Cliffside Resort',
      'Daily buffet breakfast + 2 full-day island excursion lunches',
      'Phi Phi Islands & Maya Bay VIP Speedboat tour with snorkeling gear',
      'All national marine park entrance fees and private van transfers'
    ],
    exclusions: [
      'International flights to/from Phuket',
      'Thailand Visa fees (or VOA queue fees if applicable)',
      'Scuba diving certifications or motorized water sports'
    ],
    interests: ['adventure', 'islands', 'snorkeling', 'beaches', 'nightlife'],
    suitableFor: ['adventure-seekers', 'friends', 'couples'],
    availabilityStatus: 'available',
    highlights: [
      'Phi Phi Islands speedboat tour with Maya Bay snorkeling',
      'Krabi 4-Island sunset cruise with bioluminescent plankton',
      'James Bond Island sea canoe expedition',
      'Patong nightlife & cultural Old Town walking tour'
    ],
    gradient: 'from-cyan-500 to-blue-700'
  },
  {
    id: 'maldives-all-inclusive',
    name: 'Maldives Overwater Lagoon Sanctuary',
    title: 'Maldives Overwater Lagoon Sanctuary',
    destination: 'Maldives',
    country: 'Maldives',
    isDomesticIndia: false,
    duration: '4 Days / 3 Nights',
    days: 4,
    nights: 3,
    pricePerPerson: 79999,
    currency: 'INR',
    category: 'luxury',
    rating: 5.0,
    reviewsCount: 78,
    description: 'Private overwater villa with direct coral lagoon access, all-inclusive gourmet dining, and sunsets.',
    inclusions: [
      '3 Nights Luxury Overwater Villa with Glass-Floor Lagoon Viewing',
      'All-Inclusive Dine-Around Meals, Afternoon Snacks & Premium Beverages',
      'Roundtrip Speedboat / Seaplane Airport Transfers included',
      'Sunset Dolphin Safari cruise & complimentary snorkeling gear'
    ],
    exclusions: [
      'International flights to/from Male (MLE)',
      'Spa treatments (unless specified in package voucher)',
      'Motorized water sports (jet ski, parasailing)'
    ],
    interests: ['luxury', 'overwater-villa', 'coral-reef', 'romantic', 'ocean'],
    suitableFor: ['honeymooners', 'couples', 'luxury-retreats'],
    availabilityStatus: 'available',
    highlights: [
      'Overwater bungalow with glass floor viewing & direct ocean access',
      'All-inclusive premium beverages & multi-cuisine dining',
      'Sunset dolphin safari cruise on a traditional dhoni',
      'Complimentary non-motorized watersports and coral reef snorkel'
    ],
    gradient: 'from-sky-500 to-indigo-700'
  }
];

export function getPackageById(id: string): TravelPackage | undefined {
  return TRAVEL_PACKAGES.find((pkg) => pkg.id === id);
}

export type DestinationFlexibility = 'unknown' | 'yes' | 'no';

export interface CatalogSearchQuery {
  text?: string;
  destination?: string;
  destinationFlexibility?: DestinationFlexibility;
  maxBudget?: number;
  tripType?: string;
  interests?: string[];
  excludedDestinations?: string[];
  excludedInterests?: string[];
  durationDays?: number;
  isDomesticOnly?: boolean;
  excludePackageId?: string;
}

export interface AlternativePackage {
  pkg: TravelPackage;
  reason: string;
}

export interface CatalogSearchResult {
  qualifyingPackages: TravelPackage[];
  alternativePackages: AlternativePackage[];
}

/**
 * =========================================================================
 * QUALIFYING PACKAGE INVARIANT
 * 
 * A package may appear in `qualifyingPackages` ONLY if it satisfies
 * EVERY active hard constraint:
 * 1. Destination constraint (when destination is specified and destinationFlexibility !== 'yes')
 * 2. Budget constraint (pkg.pricePerPerson <= query.maxBudget)
 * 3. Domestic India constraint (if isDomesticOnly === true)
 * 4. Package exclusion constraint (if excludePackageId is present)
 * 5. Excluded destinations constraint (if excludedDestinations contains destination)
 * 6. Excluded interests constraint (if excludedInterests contains primary package interest)
 * 
 * The LLM cannot override, weaken, reinterpret, or bypass these constraints.
 * If zero packages satisfy the constraints:
 *   qualifyingPackages = []
 * 
 * No package may be promoted from `alternativePackages` into
 * `qualifyingPackages` by response synthesis.
 * =========================================================================
 */
export function queryCatalogDetailed(query: CatalogSearchQuery): CatalogSearchResult {
  const qualifying: Array<{ pkg: TravelPackage; score: number }> = [];
  const alternatives: AlternativePackage[] = [];

  const textTerms = (query.text || '').toLowerCase().split(/\s+/).filter(Boolean);
  const destTerm = (query.destination || '').toLowerCase().trim();
  const tripTypeTerm = (query.tripType || '').toLowerCase().trim();
  const isDestHard = Boolean(destTerm && query.destinationFlexibility !== 'yes');
  const interests = (query.interests || []).map((i) => i.toLowerCase().trim());
  const excludedDests = (query.excludedDestinations || []).map((d) => d.toLowerCase().trim());
  const excludedInterests = (query.excludedInterests || []).map((i) => i.toLowerCase().trim());

  for (const pkg of TRAVEL_PACKAGES) {
    // Hard Constraint 1: Explicit package exclusion
    if (query.excludePackageId && pkg.id === query.excludePackageId) {
      continue;
    }

    // Hard Constraint 2: Domestic India only
    if (query.isDomesticOnly && !pkg.isDomesticIndia) {
      continue;
    }

    // Hard Constraint 3: Excluded destinations (Negation: e.g. "anything except Goa")
    if (
      excludedDests.some(
        (ex) =>
          pkg.destination.toLowerCase().includes(ex) ||
          pkg.country.toLowerCase().includes(ex)
      )
    ) {
      continue;
    }

    // Hard Constraint 4: Excluded interests (Negation: e.g. "I don't want beaches", "no mountains")
    if (
      excludedInterests.some(
        (ex) =>
          pkg.category.toLowerCase().includes(ex) ||
          pkg.interests.some((pi) => pi.toLowerCase().includes(ex))
      )
    ) {
      continue;
    }

    const matchesDestination =
      !destTerm ||
      pkg.destination.toLowerCase().includes(destTerm) ||
      pkg.country.toLowerCase().includes(destTerm);

    const matchesBudget =
      !query.maxBudget ||
      pkg.pricePerPerson <= query.maxBudget;

    // Evaluate Hard Constraints for Qualifying Packages
    if (isDestHard && !matchesDestination) {
      // Hard destination violation: disqualified from qualifyingPackages
      continue;
    }

    if (!matchesBudget) {
      // Hard budget violation: disqualified from qualifyingPackages
      // If it matched destination, record as an over-budget alternative!
      if (matchesDestination && query.maxBudget) {
        alternatives.push({
          pkg,
          reason: `₹${pkg.pricePerPerson.toLocaleString('en-IN')} exceeds customer's ₹${query.maxBudget.toLocaleString('en-IN')} budget`
        });
      }
      continue;
    }

    // If we reach here, ALL hard constraints are satisfied!
    let score = 10; // Baseline for satisfying all hard constraints

    // Soft Scoring Factor: Destination match (when destination was flexible)
    if (destTerm && matchesDestination) {
      score += 40;
    }

    // Soft Scoring Factor: Trip type match
    if (tripTypeTerm) {
      if (
        pkg.category.toLowerCase().includes(tripTypeTerm) ||
        pkg.suitableFor.some((s) => s.toLowerCase().includes(tripTypeTerm)) ||
        (tripTypeTerm === 'romantic' && (pkg.category === 'honeymoon' || pkg.suitableFor.includes('couples') || pkg.suitableFor.includes('honeymooners') || pkg.name.toLowerCase().includes('romantic')))
      ) {
        score += 30;
      }
    }

    // Soft Scoring Factor: Interests match (e.g. 'mountains', 'beaches')
    for (const interest of interests) {
      if (
        pkg.interests.some((i) => i.toLowerCase().includes(interest)) ||
        pkg.description.toLowerCase().includes(interest) ||
        pkg.highlights.some((h) => h.toLowerCase().includes(interest))
      ) {
        score += 25;
      }
    }

    // Soft Scoring Factor: Free text match
    for (const term of textTerms) {
      if (pkg.destination.toLowerCase().includes(term) || pkg.country.toLowerCase().includes(term)) {
        score += 20;
      } else if (pkg.name.toLowerCase().includes(term)) {
        score += 15;
      } else if (pkg.interests.some((i) => i.toLowerCase().includes(term))) {
        score += 10;
      } else if (pkg.description.toLowerCase().includes(term)) {
        score += 5;
      }
    }

    // Soft Scoring Factor: Duration match
    if (query.durationDays && Math.abs(pkg.days - query.durationDays) <= 1) {
      score += 10;
    }

    qualifying.push({ pkg, score });
  }

  // Sort qualifying packages by score descending
  qualifying.sort((a, b) => b.score - a.score);
  const qualifyingPackages = qualifying.map((q) => q.pkg);

  // If qualifying packages are empty, populate alternative suggestions with clear reasons
  if (qualifyingPackages.length === 0 && alternatives.length === 0) {
    for (const pkg of TRAVEL_PACKAGES) {
      if (query.excludePackageId && pkg.id === query.excludePackageId) continue;
      if (query.isDomesticOnly && !pkg.isDomesticIndia) continue;

      if (query.maxBudget && pkg.pricePerPerson > query.maxBudget) {
        alternatives.push({
          pkg,
          reason: `Starting rate of ₹${pkg.pricePerPerson.toLocaleString('en-IN')} exceeds ₹${query.maxBudget.toLocaleString('en-IN')} budget`
        });
      }
    }
  }

  // Sort alternatives by price ascending (closest to budget first)
  alternatives.sort((a, b) => a.pkg.pricePerPerson - b.pkg.pricePerPerson);

  return {
    qualifyingPackages,
    alternativePackages: alternatives
  };
}

export function queryCatalog(query: CatalogSearchQuery): TravelPackage[] {
  return queryCatalogDetailed(query).qualifyingPackages;
}

export function searchPackages(query: string, maxBudget?: number): TravelPackage[] {
  return queryCatalog({ text: query, maxBudget });
}

export function getAllAvailableDestinations(): string[] {
  return Array.from(new Set(TRAVEL_PACKAGES.map((p) => p.destination)));
}
