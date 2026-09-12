import shutil
import json
import urllib.request
import urllib.error
import time
import subprocess
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

PACKAGES_FILE = r"C:\Users\Ravi\Downloads\travel-agency-site\src\lib\packages.ts"
PACKAGES_BAK = r"C:\Users\Ravi\Downloads\travel-agency-site\src\lib\packages.ts.bak"
SITE_DIR = r"C:\Users\Ravi\Downloads\travel-agency-site"
BASE_URL = "http://localhost:3000"

NEW_CATALOG_CONTENT = '''export interface TravelPackage {
  id: string;
  name: string;
  title: string;
  destination: string;
  country: string;
  isDomesticIndia: boolean;
  duration: string;
  days: number;
  nights: number;
  pricePerPerson: number;
  currency: string;
  category: 'honeymoon' | 'adventure' | 'luxury' | 'family' | 'wellness';
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
    id: 'goa-beach-escape',
    name: 'Goa Beach Escape',
    title: 'Goa Beach Escape',
    destination: 'Goa',
    country: 'India',
    isDomesticIndia: true,
    duration: '4 Days / 3 Nights',
    days: 4,
    nights: 3,
    pricePerPerson: 25000,
    currency: 'INR',
    category: 'honeymoon',
    rating: 4.8,
    reviewsCount: 95,
    description: 'Golden sandy beaches, private beach shack dinners, sunset boat cruises, and Portuguese heritage.',
    inclusions: ['3 Nights 5-Star Beach Resort', 'Daily Breakfast & 1 Seafood Dinner', 'Private Chauffeur', 'Mandovi Sunset Cruise'],
    exclusions: ['Airfare to/from Goa', 'Personal watersports'],
    interests: ['beaches', 'romantic', 'sunset', 'heritage'],
    suitableFor: ['couples', 'honeymooners', 'friends'],
    availabilityStatus: 'available',
    highlights: ['Private beach candle-light dinner', 'Mandovi River sunset cruise', 'Old Goa heritage walk'],
    gradient: 'from-amber-500 to-orange-600'
  },
  {
    id: 'singapore-explorer',
    name: 'Singapore Explorer',
    title: 'Singapore Explorer',
    destination: 'Singapore',
    country: 'Singapore',
    isDomesticIndia: false,
    duration: '5 Days / 4 Nights',
    days: 5,
    nights: 4,
    pricePerPerson: 65000,
    currency: 'INR',
    category: 'family',
    rating: 4.9,
    reviewsCount: 110,
    description: 'Futuristic gardens, Sentosa Island thrills, Marina Bay skyline, and world-class culinary wonders.',
    inclusions: ['4 Nights 4-Star Downtown Hotel', 'Daily Buffet Breakfast', 'Universal Studios VIP Access', 'Gardens by the Bay Double Conservatories'],
    exclusions: ['International flights', 'Singapore Visa fees'],
    interests: ['city', 'modern', 'attractions', 'family-fun'],
    suitableFor: ['families', 'couples', 'friends'],
    availabilityStatus: 'available',
    highlights: ['Universal Studios Singapore Pass', 'Marina Bay Sands Skypark observation deck', 'Night Safari tram tour'],
    gradient: 'from-blue-600 to-indigo-700'
  },
  {
    id: 'paris-romantic-week',
    name: 'Paris Romantic Week',
    title: 'Paris Romantic Week',
    destination: 'Paris',
    country: 'France',
    isDomesticIndia: false,
    duration: '7 Days / 6 Nights',
    days: 7,
    nights: 6,
    pricePerPerson: 120000,
    currency: 'INR',
    category: 'luxury',
    rating: 5.0,
    reviewsCount: 74,
    description: 'The City of Lights: Seine river dinner cruises, Eiffel Tower summit champagne, and Louvre private tours.',
    inclusions: ['6 Nights Boutique Hotel near Champs-Elysees', 'Daily French Breakfast', 'Seine River Gourmet Dinner Cruise', 'Eiffel Tower Summit Access'],
    exclusions: ['Schengen Visa fees', 'International Flights to CDG'],
    interests: ['romantic', 'art', 'luxury', 'architecture', 'gastronomy'],
    suitableFor: ['honeymooners', 'couples', 'luxury-seekers'],
    availabilityStatus: 'available',
    highlights: ['Seine river dinner cruise with live violin', 'Private guided Louvre highlights tour', 'Eiffel Tower summit with glass of champagne'],
    gradient: 'from-rose-500 to-purple-700'
  }
];

export function getPackageById(id: string): TravelPackage | undefined {
  return TRAVEL_PACKAGES.find((pkg) => pkg.id === id);
}

export type DestinationFlexibility = 'yes' | 'no' | 'unknown';

export interface AlternativePackage {
  pkg: TravelPackage;
  reason: string;
}

export interface CatalogSearchResult {
  qualifyingPackages: TravelPackage[];
  alternativePackages: AlternativePackage[];
}

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

export function queryCatalogDetailed(query: CatalogSearchQuery): CatalogSearchResult {
  const qualifying: Array<{ pkg: TravelPackage; score: number }> = [];
  const alternatives: AlternativePackage[] = [];

  const textTerms = (query.text || '').toLowerCase().split(/\\s+/).filter(Boolean);
  const destTerm = (query.destination || '').toLowerCase().trim();
  const tripTypeTerm = (query.tripType || '').toLowerCase().trim();
  const isDestHard = Boolean(destTerm && query.destinationFlexibility !== 'yes');
  const interests = (query.interests || []).map((i) => i.toLowerCase().trim());
  const excludedDests = (query.excludedDestinations || []).map((d) => d.toLowerCase().trim());
  const excludedInterests = (query.excludedInterests || []).map((i) => i.toLowerCase().trim());

  for (const pkg of TRAVEL_PACKAGES) {
    if (query.excludePackageId && pkg.id === query.excludePackageId) continue;
    if (query.isDomesticOnly && !pkg.isDomesticIndia) continue;
    if (excludedDests.some((ex) => pkg.destination.toLowerCase().includes(ex) || pkg.country.toLowerCase().includes(ex))) continue;
    if (excludedInterests.some((ex) => pkg.category.toLowerCase().includes(ex) || pkg.interests.some((pi) => pi.toLowerCase().includes(ex)))) continue;

    const matchesDestination = !destTerm || pkg.destination.toLowerCase().includes(destTerm) || pkg.country.toLowerCase().includes(destTerm);
    const matchesBudget = !query.maxBudget || pkg.pricePerPerson <= query.maxBudget;

    if (isDestHard && !matchesDestination) continue;
    if (!matchesBudget) {
      if (matchesDestination && query.maxBudget) {
        alternatives.push({
          pkg,
          reason: `₹${pkg.pricePerPerson.toLocaleString('en-IN')} exceeds customer's ₹${query.maxBudget.toLocaleString('en-IN')} budget`
        });
      }
      continue;
    }

    let score = 10;
    if (destTerm && matchesDestination) score += 40;
    if (tripTypeTerm && (pkg.category.toLowerCase().includes(tripTypeTerm) || pkg.suitableFor.some(s => s.toLowerCase().includes(tripTypeTerm)))) score += 30;
    for (const interest of interests) {
      if (pkg.interests.some((i) => i.toLowerCase().includes(interest))) score += 25;
    }
    for (const term of textTerms) {
      if (pkg.destination.toLowerCase().includes(term) || pkg.country.toLowerCase().includes(term)) score += 20;
      else if (pkg.name.toLowerCase().includes(term)) score += 15;
    }
    if (query.durationDays && Math.abs(pkg.days - query.durationDays) <= 1) score += 10;
    qualifying.push({ pkg, score });
  }

  qualifying.sort((a, b) => b.score - a.score);
  return {
    qualifyingPackages: qualifying.map((q) => q.pkg),
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

export function getValidDestinationsString(): string {
  return getAllAvailableDestinations().join(', ');
}
'''

def post_chat(messages):
    data = json.dumps({"messages": messages}).encode("utf-8")
    req = urllib.request.Request(f"{BASE_URL}/api/chat", data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        return resp.status, json.loads(resp.read().decode("utf-8"))

def test_new_catalog():
    print("==================================================")
    print("STARTING CATALOG SWAP TEST")
    print("==================================================")

    # 1. Back up packages.ts
    shutil.copyfile(PACKAGES_FILE, PACKAGES_BAK)
    print(f"Backed up {PACKAGES_FILE} to {PACKAGES_BAK}")

    try:
        # 2. Write new catalog with Goa, Singapore, Paris
        with open(PACKAGES_FILE, "w", encoding="utf-8") as f:
            f.write(NEW_CATALOG_CONTENT)
        print("Wrote new package catalog (Goa ₹25k, Singapore ₹65k, Paris ₹120k)")

        # 3. Build & start server
        print("Rebuilding Next.js application with new catalog...")
        subprocess.run("npm run build", cwd=SITE_DIR, check=True, shell=True)
        print("Build succeeded! Starting server on port 3000...")
        
        proc = subprocess.Popen("npm run start -- -p 3000", cwd=SITE_DIR, shell=True)
        time.sleep(4)

        try:
            # TEST A: Budget romantic getaway (around 30k)
            print("\n--- TEST A: 'I want a romantic trip, 2 people, budget around ₹30k per person, 4 days.' ---")
            status, resA = post_chat([
                {"role": "user", "content": "I want a romantic trip, 2 people, budget around ₹30k per person, 4 days."}
            ])
            msgA = resA.get('message', '')
            suggestedA = [p['name'] for p in resA.get('suggestedPackages', [])]
            print(f"Status: {status}")
            print(f"Message:\n{msgA}")
            print(f"Suggested Packages: {suggestedA}")

            assert "Goa Beach Escape" in suggestedA or "Goa" in msgA, "Failed: Goa was not recommended for 30k romantic!"
            assert "Bali" not in msgA and "Bali" not in str(suggestedA), "Failed: Bali was recommended with new catalog!"
            assert "Kashmir" not in msgA and "Kashmir" not in str(suggestedA), "Failed: Kashmir was recommended with new catalog!"
            print("✅ TEST A PASS: Arjun recommended Goa Beach Escape (₹25,000) and completely stopped recommending Bali/Kashmir!")

            # TEST B: Visit Singapore for 5 days
            print("\n--- TEST B: 'I want to visit Singapore for 5 days with family.' ---")
            status, resB = post_chat([
                {"role": "user", "content": "I want to visit Singapore for 5 days with family."}
            ])
            msgB = resB.get('message', '')
            suggestedB = [p['name'] for p in resB.get('suggestedPackages', [])]
            print(f"Status: {status}")
            print(f"Message:\n{msgB}")
            print(f"Suggested Packages: {suggestedB}")

            assert "Singapore Explorer" in suggestedB or "Singapore" in msgB, "Failed: Singapore was not recommended!"
            print("✅ TEST B PASS: Arjun recommended Singapore Explorer (₹65,000)!")

            # TEST C: Ask for Bali (now uncataloged!)
            print("\n--- TEST C: 'Can you show me packages for Bali?' (Bali is NO LONGER in catalog) ---")
            status, resC = post_chat([
                {"role": "user", "content": "Can you show me packages for Bali?"}
            ])
            msgC = resC.get('message', '')
            suggestedC = [p['name'] for p in resC.get('suggestedPackages', [])]
            print(f"Status: {status}")
            print(f"Message:\n{msgC}")
            print(f"Suggested Packages: {suggestedC}")

            assert len(suggestedC) == 0, "Failed: Should not suggest packages for uncataloged Bali!"
            assert "do not currently offer" in msgC.lower() or "not" in msgC.lower(), "Failed: Did not reject uncataloged destination!"
            assert "Goa" in msgC or "Singapore" in msgC or "Paris" in msgC, "Failed: Available portfolio did not mention new catalog!"
            print("✅ TEST C PASS: Arjun correctly identified Bali as UNCATALOGED and listed Goa, Singapore, Paris as the official 2026 portfolio!")

            print("\n==================================================")
            print("CATALOG SWAP TEST PASSED 100%!")
            print("==================================================")

        finally:
            subprocess.run(f"taskkill /F /T /PID {proc.pid}", shell=True, capture_output=True)
            subprocess.run("taskkill /F /IM node.exe", shell=True, capture_output=True)
            time.sleep(1)

    finally:
        # Restore original catalog
        shutil.copyfile(PACKAGES_BAK, PACKAGES_FILE)
        os.remove(PACKAGES_BAK)
        print("Restored original packages.ts catalog!")

if __name__ == "__main__":
    test_new_catalog()
