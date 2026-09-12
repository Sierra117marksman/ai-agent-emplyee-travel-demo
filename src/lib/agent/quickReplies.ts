import { TravelPackage } from '@/lib/packages';
import { AgentMemory, QuickReply, QuickReplyAction, PerceptionResult } from './types';

export interface QuickReplyContext {
  packages: TravelPackage[];
  availableDestinations: string[];
  memory: AgentMemory;
  goal: string;
  perception?: PerceptionResult;
}

const INTEREST_ICONS: Record<string, string> = {
  mountains: '🏔️',
  beaches: '🏖️',
  snow: '❄️',
  wildlife: '🌿',
  nature: '🍃',
  nightlife: '🌆',
  heritage: '🕌',
  culture: '🏛️',
  wellness: '🧘',
  houseboat: '⛵',
  adventure: '🧗',
  'tea-gardens': '🍵',
  romantic: '❤️',
  luxury: '✨',
  desert: '🐪',
  villas: '🏡',
  'sunset-cruise': '🌅',
  spa: '💆'
};

function capitalize(s: string): string {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' ');
}

export function generateQuickReplies(context: QuickReplyContext): QuickReply[] {
  // HUMAN_HANDOFF: Return handoff-specific action chips only
  if (context.goal === 'HUMAN_HANDOFF') {
    return [
      { type: 'action', label: '👤 Talk to a Travel Specialist', value: 'HANDOFF_SPECIALIST', frontendAction: 'HANDOFF_SPECIALIST' as QuickReplyAction },
      { type: 'action', label: '📞 Request a Call Back', value: 'REQUEST_CALLBACK', frontendAction: 'REQUEST_CALLBACK' as QuickReplyAction },
      { type: 'action', label: '💬 Continue with Arjun', value: 'CONTINUE_WITH_ARJUN', frontendAction: 'CONTINUE_WITH_ARJUN' as QuickReplyAction },
    ];
  }

  const replies = generateQuickRepliesInternal(context);

  // When catalog is completely empty, only return the free_text chip
  if (context.packages.length === 0 && context.availableDestinations.length === 0) {
    return replies;
  }

  // Persistent escape hatch — always visible so customer never needs to defeat the AI to find a person
  const escapeHatch: QuickReply = {
    type: 'action',
    label: '👤 Speak to a Specialist',
    value: 'HANDOFF_SPECIALIST',
    frontendAction: 'HANDOFF_SPECIALIST' as QuickReplyAction,
  };

  if (!replies.some((r) => r.frontendAction === 'HANDOFF_SPECIALIST')) {
    replies.push(escapeHatch);
  }

  return replies;
}

function generateQuickRepliesInternal(context: QuickReplyContext): QuickReply[] {
  const { packages, availableDestinations, memory, goal, perception } = context;
  const prefs = memory.customer.preferences;

  // 1. Ambiguity clarification with competing candidates (Cat U)
  const amb = memory.conversation.lastAmbiguity || (perception?.ambiguity && perception.ambiguity[0]);
  if (goal === 'CLARIFY_AMBIGUITY' && amb?.candidates && amb.candidates.length > 0) {
    return [
      ...amb.candidates.map((cand) => ({
        type: 'action' as const,
        label: cand,
        value: cand
      })),
      { type: 'free_text' as const, label: '💬 Clarify something else', value: 'type_own' }
    ];
  }

  // 2. Active package recommendations / Booking action chips
  const surfaced = memory.conversation.lastSurfacedPackages || [];
  if (goal === 'RECOMMEND_PACKAGES' || (surfaced.length > 0 && prefs.destination && prefs.budgetPerPerson)) {
    if (surfaced.length > 0) {
      const replies: QuickReply[] = [];
      surfaced.slice(0, 2).forEach((pkg) => {
        replies.push({
          type: 'action',
          label: 'Pay ₹2,000 Token for ' + pkg.name,
          value: 'Can I book ' + pkg.name + '?'
        });
      });
      replies.push({
        type: 'action',
        label: 'Explore other options',
        value: 'Show me other options'
      });
      replies.push({
        type: 'action',
        label: 'Ask a question',
        value: 'Can you tell me more about the itinerary?'
      });
      return replies;
    } else {
      // Zero qualifying packages matched
      const replies: QuickReply[] = [];
      if (prefs.destination) {
        const destPkg = packages.find(
          (p) => p.destination.toLowerCase().includes(prefs.destination!.toLowerCase())
        );
        if (destPkg) {
          replies.push({
            type: 'budget',
            label: 'Adjust budget to ₹' + (destPkg.pricePerPerson / 1000).toFixed(0) + 'k',
            value: destPkg.pricePerPerson + ' per person'
          });
        }
      }
      replies.push({
        type: 'action',
        label: 'Explore other destinations',
        value: 'Show me packages for other destinations'
      });
      replies.push({
        type: 'free_text',
        label: '💬 Adjust requirements',
        value: 'type_own'
      });
      return replies;
    }
  }

  // 3. Price objection active -> Suggest budget options
  if (goal === 'HANDLE_PRICE_OBJECTION' || memory.conversation.isPriceObjectionActive) {
    const prices = packages.map((p) => p.pricePerPerson).filter(Boolean);
    if (prices.length > 0) {
      const minPrice = Math.min(...prices);
      const roundedMin = Math.floor(minPrice / 5000) * 5000;
      const lowerTiers = [
        Math.max(10000, roundedMin - 10000),
        Math.max(15000, roundedMin - 5000),
        roundedMin
      ];
      const uniqueLower = Array.from(new Set(lowerTiers)).sort((a, b) => a - b);
      return [
        ...uniqueLower.map((amt) => ({
          type: 'budget' as const,
          label: '₹' + (amt / 1000).toFixed(0) + 'k / person',
          value: amt + ' per person'
        })),
        { type: 'free_text' as const, label: '💬 Type your comfortable budget', value: 'type_budget' }
      ];
    }
    return [{ type: 'free_text' as const, label: '💬 Type your comfortable budget', value: 'type_budget' }];
  }

  // 4. Unsupported destination -> Offer available catalog destinations
  if (goal === 'HANDLE_UNSUPPORTED_DESTINATION') {
    const candidateDests = availableDestinations.length > 0
      ? availableDestinations
      : Array.from(new Set(packages.map((p) => p.destination).filter(Boolean)));
    const destChips: QuickReply[] = candidateDests.map((dest) => ({
      type: 'destination',
      label: dest,
      value: dest
    }));
    destChips.push({
      type: 'action',
      label: '📞 Charter Desk',
      value: 'Connect me with your private charter desk'
    });
    destChips.push({
      type: 'free_text',
      label: '💬 Other destination',
      value: 'type_destination'
    });
    return destChips;
  }

  // 5. Informational queries -> Relevant suggestions or portfolio exploration
  if (goal === 'ANSWER_INFO_QUERY') {
    const dest = perception?.destination?.destination?.value;
    const isAvail = dest && availableDestinations.some((d) => d.toLowerCase() === dest.toLowerCase());
    const replies: QuickReply[] = [];
    if (isAvail && dest) {
      replies.push({
        type: 'action',
        label: 'Explore ' + dest + ' packages',
        value: 'Show me curated packages for ' + dest
      });
    } else {
      availableDestinations.slice(0, 3).forEach((d) => {
        replies.push({
          type: 'destination',
          label: d,
          value: d
        });
      });
    }
    replies.push({
      type: 'free_text',
      label: '💬 Ask another question',
      value: 'type_own'
    });
    return replies;
  }

  // 6. Constraint conflict -> Portfolio options
  if (goal === 'EXPLAIN_CONFLICT') {
    const replies: QuickReply[] = [];
    availableDestinations.slice(0, 3).forEach((d) => {
      replies.push({
        type: 'destination',
        label: d,
        value: d
      });
    });
    replies.push({
      type: 'free_text',
      label: '💬 Adjust preferences',
      value: 'type_own'
    });
    return replies;
  }

  // 7. Booking token / Payment inquiry
  if (goal === 'PREPARE_BOOKING_TOKEN') {
    return [
      {
        type: 'action',
        label: 'Pay ₹2,000 Booking Token',
        value: 'I would like to pay the ₹2,000 booking token'
      },
      {
        type: 'free_text',
        label: '💬 Ask a question',
        value: 'type_own'
      }
    ];
  }

  if (goal === 'RESOLVE_PAYMENT_INQUIRY') {
    return [
      {
        type: 'action',
        label: 'Check payment status',
        value: 'I completed payment, please check reference'
      },
      {
        type: 'action',
        label: '📞 Connect with travel desk',
        value: 'Connect me with human booking desk'
      },
      {
        type: 'free_text',
        label: '💬 Share payment details',
        value: 'type_own'
      }
    ];
  }

  // 4. Missing fields progressive discovery
  const hasInterests = prefs.interests.length > 0;
  const hasDestination = Boolean(prefs.destination || prefs.destinationFlexibility === 'yes');
  const hasBudget = Boolean(prefs.budgetPerPerson);
  const hasTravelers = Boolean(prefs.travelers);
  const hasDuration = Boolean(prefs.durationDays);

  // Step A: If no interests and no destination -> Offer dynamic interest chips derived from catalog
  if (!hasInterests && !hasDestination && !prefs.tripStyle) {
    const rawCatalogInterests = Array.from(
      new Set(packages.flatMap((p) => p.interests || []))
    ).filter((i) => !prefs.excludedInterests.includes(i));

    if (rawCatalogInterests.length > 0) {
      const interestChips: QuickReply[] = rawCatalogInterests.slice(0, 6).map((interest) => {
        const icon = INTEREST_ICONS[interest] || '✨';
        return {
          type: 'interest',
          label: icon + ' ' + capitalize(interest),
          value: interest
        };
      });

      interestChips.push({
        type: 'interest',
        label: '🤷 Surprise Me',
        value: 'open to any destination or experience'
      });

      interestChips.push({
        type: 'free_text',
        label: '💬 Type your own',
        value: 'type_own'
      });

      return interestChips;
    }
  }

  // Step B: If destination is missing -> Offer dynamic destination chips derived from catalog
  if (!hasDestination) {
    const candidateDests = Array.from(
      new Set(
        availableDestinations.length > 0
          ? availableDestinations
          : packages.map((p) => p.destination).filter(Boolean)
      )
    ).filter((d) => !prefs.excludedDestinations.some((ex) => ex.toLowerCase() === d.toLowerCase()));

    if (candidateDests.length === 0) {
      // Empty catalog: NEVER use fake/fallback destinations!
      return [
        { type: 'free_text', label: '💬 Type a destination', value: 'type_destination' }
      ];
    }

    if (prefs.interests.length > 0) {
      const matchingDests = new Set(
        packages
          .filter((p) => p.interests && p.interests.some((i) => prefs.interests.includes(i)))
          .map((p) => p.destination.toLowerCase())
      );
      candidateDests.sort((a, b) => {
        const aMatch = matchingDests.has(a.toLowerCase()) ? 1 : 0;
        const bMatch = matchingDests.has(b.toLowerCase()) ? 1 : 0;
        return bMatch - aMatch;
      });
    }

    const destChips: QuickReply[] = candidateDests.map((dest) => ({
      type: 'destination',
      label: dest,
      value: dest
    }));

    destChips.push({
      type: 'destination',
      label: '🌎 Anywhere',
      value: 'open to any destination'
    });

    destChips.push({
      type: 'free_text',
      label: '💬 Type a destination',
      value: 'type_destination'
    });

    return destChips;
  }

  // Step C: If budget is missing -> Offer dynamic budget tiers computed from catalog pricing
  if (!hasBudget) {
    // Filter packages matching chosen destination if specified
    const relevantPackages = prefs.destination
      ? packages.filter((p) => p.destination.toLowerCase() === prefs.destination!.toLowerCase())
      : packages;

    const sourcePackages = relevantPackages.length > 0 ? relevantPackages : packages;
    const prices = sourcePackages.map((p) => p.pricePerPerson).filter(Boolean).sort((a, b) => a - b);

    if (prices.length === 0) {
      return [{ type: 'free_text', label: '💬 Type your budget', value: 'type_budget' }];
    }

    // Derive 3-4 clean rounded price tiers
    const minP = prices[0];
    const medP = prices[Math.floor(prices.length / 2)];
    const maxP = prices[prices.length - 1];

    const roundK = (n: number) => Math.round(n / 5000) * 5000;
    const tiers = Array.from(
      new Set([
        roundK(minP),
        roundK(medP),
        roundK(maxP)
      ])
    ).filter((t) => t > 0).sort((a, b) => a - b);

    const budgetChips: QuickReply[] = tiers.map((tier) => ({
      type: 'budget',
      label: '₹' + (tier / 1000).toFixed(0) + 'k / person',
      value: tier + ' per person'
    }));

    budgetChips.push({
      type: 'free_text',
      label: '💬 Other budget',
      value: 'type_budget'
    });

    return budgetChips;
  }

  // Step D: If travelers count is missing -> Offer semantic traveler options
  if (!hasTravelers) {
    return [
      { type: 'traveler_group', label: '🙋 Solo', value: '1 traveler' },
      { type: 'traveler_group', label: '❤️ Couple', value: '2 travelers' },
      { type: 'traveler_group', label: '👨‍👩‍👧 Family', value: 'Family of 4' },
      { type: 'traveler_group', label: '👥 Friends', value: 'Group of 4 friends' },
      { type: 'free_text', label: '💬 Other group', value: 'type_travelers' }
    ];
  }

  // Step E: If duration is missing -> Offer dynamic duration options derived from catalog
  if (!hasDuration) {
    const days = Array.from(new Set(packages.map((p) => p.days).filter(Boolean))).sort((a, b) => a - b);
    if (days.length > 0) {
      const durationChips: QuickReply[] = days.slice(0, 4).map((d) => ({
        type: 'duration',
        label: d + ' Days',
        value: d + ' days'
      }));

      durationChips.push({
        type: 'duration',
        label: '🗓️ Flexible dates',
        value: 'flexible dates'
      });

      durationChips.push({
        type: 'free_text',
        label: '💬 Other duration',
        value: 'type_duration'
      });

      return durationChips;
    }
  }

  // Default fallback if all fields are qualified or unhandled
  return [
    { type: 'free_text', label: '💬 Type your message', value: 'type_own' }
  ];
}
