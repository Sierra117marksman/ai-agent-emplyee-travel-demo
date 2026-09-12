export interface TravelPackage {
  id: string;
  title: string;
  destination: string;
  duration: string;
  days: number;
  nights: number;
  pricePerPerson: number;
  currency: string;
  rating: number;
  reviewsCount: number;
  category: 'honeymoon' | 'adventure' | 'luxury' | 'family' | 'relaxed';
  highlights: string[];
  inclusions: string[];
  description: string;
  gradient: string;
}

export const TRAVEL_PACKAGES: TravelPackage[] = [
  {
    id: 'bali-romantic-villa',
    title: 'Bali Romantic Villa Escape',
    destination: 'Bali, Indonesia',
    duration: '5 Days / 4 Nights',
    days: 5,
    nights: 4,
    pricePerPerson: 44999,
    currency: 'INR',
    rating: 4.9,
    reviewsCount: 128,
    category: 'honeymoon',
    highlights: [
      'Private pool villa in Ubud & Seminyak beachfront resort',
      'Nusa Penida sunset catamaran cruise with champagne',
      'Couples Balinese aromatherapy spa session',
      'Candlelight dinner at Jimbaran Bay'
    ],
    inclusions: [
      '4 Nights 5-Star Luxury Villa Accommodation',
      'Daily Floating Breakfast & Candlelight Dinners',
      'Private Chauffeur & English Speaking Guide',
      'Airport Transfers & Nusa Penida Fast Boat'
    ],
    description: 'Designed exclusively for couples, this itinerary blends the mist-shrouded jungle serenity of Ubud with the vibrant beachfront sunsets of Seminyak.',
    gradient: 'from-emerald-500 to-teal-700'
  },
  {
    id: 'kashmir-heaven-valleys',
    title: 'Kashmir Valley & Houseboat Bliss',
    destination: 'Kashmir, India',
    duration: '6 Days / 5 Nights',
    days: 6,
    nights: 5,
    pricePerPerson: 38500,
    currency: 'INR',
    rating: 4.8,
    reviewsCount: 210,
    category: 'honeymoon',
    highlights: [
      'Handcrafted heritage houseboat stay on Dal Lake',
      'Gulmarg Gondola Phase 1 & 2 alpine snow excursion',
      'Pahalgam Betaab Valley & Aru Valley private exploration',
      'Shikara ride at golden sunset with Kashmiri Kahwa'
    ],
    inclusions: [
      '1 Night Premium Houseboat + 4 Nights Boutique Valley Resorts',
      'Breakfast & Gourmet Kashmiri Dinners included',
      'Dedicated Private SUV (Innova/Crysta) for entire tour',
      'Gondola Priority Booking Assistance & Shikara Tickets'
    ],
    description: 'Breathtaking snow-capped Himalayan peaks, fragrant pine meadows, and timeless Dal Lake romanticism curated for memorable journeys.',
    gradient: 'from-blue-600 to-indigo-800'
  },
  {
    id: 'dubai-luxury-desert',
    title: 'Dubai Ultra Luxury & Desert Dunes',
    destination: 'Dubai, UAE',
    duration: '5 Days / 4 Nights',
    days: 5,
    nights: 4,
    pricePerPerson: 54999,
    currency: 'INR',
    rating: 4.9,
    reviewsCount: 94,
    category: 'luxury',
    highlights: [
      'Burj Khalifa 124th + 125th Floor Sky Lounge admission',
      'Private VIP Desert Safari with dune bashing & barbecue',
      'Marina Yacht sunset cruise with international buffet',
      'Aquaventure Waterpark at Atlantis The Palm'
    ],
    inclusions: [
      '4 Nights at 5-Star Downtown Dubai Hotel',
      'Daily international buffet breakfast',
      'Private luxury sedan airport & excursion transfers',
      'Tourist Visa assistance & all museum entry passes'
    ],
    description: 'The pinnacle of cosmopolitan glamour and majestic Arabian desert heritage with five-star hospitality throughout.',
    gradient: 'from-amber-500 to-orange-700'
  },
  {
    id: 'kerala-backwaters-munnar',
    title: 'Kerala Backwaters & Munnar Mist',
    destination: 'Kerala, India',
    duration: '5 Days / 4 Nights',
    days: 5,
    nights: 4,
    pricePerPerson: 29999,
    currency: 'INR',
    rating: 4.7,
    reviewsCount: 165,
    category: 'relaxed',
    highlights: [
      'Munnar tea gardens & Mattupetty dam nature trek',
      'Private AC Alleppey houseboat cruise with onboard chef',
      'Spice plantation discovery walk in Thekkady',
      'Traditional Ayurvedic rejuvenation massage'
    ],
    inclusions: [
      '3 Nights Hill Resorts + 1 Night Deluxe Houseboat',
      'Houseboat all meals included (traditional Kerala cuisine)',
      'Dedicated AC Sedan throughout with toll & parking',
      'Spice garden entry & tea tasting session'
    ],
    description: 'Lush rolling tea estates, tranquil palm-fringed backwaters, and rejuvenating coastal breezes in God’s Own Country.',
    gradient: 'from-teal-600 to-emerald-800'
  },
  {
    id: 'thailand-island-hop',
    title: 'Thailand Island Hopping & Phuket',
    destination: 'Phuket & Krabi, Thailand',
    duration: '6 Days / 5 Nights',
    days: 6,
    nights: 5,
    pricePerPerson: 39999,
    currency: 'INR',
    rating: 4.8,
    reviewsCount: 142,
    category: 'adventure',
    highlights: [
      'Phi Phi Islands speedboat tour with Maya Bay snorkeling',
      'Krabi 4-Island sunset cruise with bioluminescent plankton',
      'James Bond Island sea canoe expedition',
      'Patong nightlife & cultural Old Town walking tour'
    ],
    inclusions: [
      '3 Nights Phuket Beachfront + 2 Nights Krabi Cliff Resort',
      'Daily buffet breakfast & 2 Island excursion lunches',
      'Speedboat transfers, snorkeling gear & national park fees',
      'Airport & inter-city private van transfers'
    ],
    description: 'Crystal turquoise waters, limestone karsts, and vibrant night markets designed for adventurous and youthful spirits.',
    gradient: 'from-cyan-500 to-blue-700'
  },
  {
    id: 'maldives-all-inclusive',
    title: 'Maldives Overwater Lagoon Sanctuary',
    destination: 'Maldives',
    duration: '4 Days / 3 Nights',
    days: 4,
    nights: 3,
    pricePerPerson: 79999,
    currency: 'INR',
    rating: 5.0,
    reviewsCount: 78,
    category: 'luxury',
    highlights: [
      'Overwater bungalow with glass floor viewing & direct ocean access',
      'All-inclusive premium beverages & multi-cuisine dining',
      'Sunset dolphin safari cruise on a traditional dhoni',
      'Complimentary non-motorized watersports and coral reef snorkel'
    ],
    inclusions: [
      '3 Nights Luxury Overwater Villa',
      'All-Inclusive Meals, Snacks & Premium Beverages',
      'Roundtrip Speedboat / Seaplane Resort Transfers',
      'Complimentary Snorkeling equipment & photo session'
    ],
    description: 'An idyllic private island sanctuary in the Indian Ocean where translucent lagoons meet pristine white sands.',
    gradient: 'from-sky-500 to-indigo-700'
  }
];

export function getPackageById(id: string): TravelPackage | undefined {
  return TRAVEL_PACKAGES.find((pkg) => pkg.id === id);
}

export function searchPackages(query: string, maxBudget?: number): TravelPackage[] {
  const normalizedQuery = query.toLowerCase().trim();
  return TRAVEL_PACKAGES.filter((pkg) => {
    const matchesText =
      !normalizedQuery ||
      pkg.title.toLowerCase().includes(normalizedQuery) ||
      pkg.destination.toLowerCase().includes(normalizedQuery) ||
      pkg.category.toLowerCase().includes(normalizedQuery) ||
      pkg.description.toLowerCase().includes(normalizedQuery);

    const matchesBudget = !maxBudget || pkg.pricePerPerson <= maxBudget;
    return matchesText && matchesBudget;
  });
}
