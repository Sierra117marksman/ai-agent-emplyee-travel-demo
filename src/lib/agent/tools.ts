import {
  TravelPackage,
  TRAVEL_PACKAGES,
  queryCatalogDetailed,
  DestinationFlexibility,
  AlternativePackage
} from '@/lib/packages';
import { AgentTool, CustomerPreferences, HandoffReason, HandoffDossier } from './types';

// Tool 1: search_packages
export interface SearchPackagesInput {
  destination?: string | null;
  destinationFlexibility?: DestinationFlexibility;
  maxBudget?: number | null;
  tripType?: string | null;
  interests?: string[];
  excludedDestinations?: string[];
  excludedInterests?: string[];
  durationDays?: number | null;
  isDomesticOnly?: boolean;
  excludePackageId?: string | null;
  text?: string;
}

export interface SearchPackagesResult {
  qualifyingPackages: TravelPackage[];
  alternativePackages: AlternativePackage[];
}

export const searchPackagesTool: AgentTool<SearchPackagesInput, SearchPackagesResult> = {
  name: 'search_packages',
  description: 'Deterministic catalog search enforcing hard constraints (destination, budget, domestic) and producing alternatives if needed.',
  execute: async (input) => {
    return queryCatalogDetailed({
      text: input.text,
      destination: input.destination || undefined,
      destinationFlexibility: input.destinationFlexibility,
      maxBudget: input.maxBudget || undefined,
      tripType: input.tripType || undefined,
      interests: input.interests,
      excludedDestinations: input.excludedDestinations,
      excludedInterests: input.excludedInterests,
      durationDays: input.durationDays || undefined,
      isDomesticOnly: input.isDomesticOnly || false,
      excludePackageId: input.excludePackageId || undefined
    });
  }
};

// Tool 2: get_package_details
export const getPackageDetailsTool: AgentTool<{ packageId: string }, TravelPackage | null> = {
  name: 'get_package_details',
  description: 'Retrieve complete itinerary, inclusions, exclusions, and pricing for a specific travel package ID.',
  execute: async ({ packageId }) => {
    return TRAVEL_PACKAGES.find((p) => p.id === packageId) || null;
  }
};

// Tool 3: qualify_lead
export interface QualifyLeadResult {
  isQualified: boolean;
  missingFields: ('destination' | 'budget' | 'travelers' | 'duration')[];
  promptQuestions: string[];
}

export const qualifyLeadTool: AgentTool<CustomerPreferences, QualifyLeadResult> = {
  name: 'qualify_lead',
  description: 'Enforce minimum qualification gates before recommendations are generated.',
  execute: async (pref, memory) => {
    const missing: ('destination' | 'budget' | 'travelers' | 'duration')[] = [];
    if (!pref.destination && pref.destinationFlexibility !== 'yes') missing.push('destination');
    if (!pref.budgetPerPerson) missing.push('budget');
    if (!pref.travelers) missing.push('travelers');
    if (!pref.durationDays) missing.push('duration');

    // If pure greeting, definitely not qualified for recommendations
    if (memory.conversation.currentIntent === 'GREETING') {
      return {
        isQualified: false,
        missingFields: missing,
        promptQuestions: ['Where are you thinking of traveling, or what kind of trip are you dreaming of?']
      };
    }

    // Minimum qualification gate:
    // Recommendation generation is permitted ONLY when the minimum required qualification state is satisfied.
    // E.g. "I want a honeymoon trip." (style only, no dest, no budget) -> false
    // E.g. "I want to see mountains." (interest only, no dest, no budget) -> false
    // E.g. "Kashmir 15000 per person and 2 person" (dest + budget + pax) -> true
    // E.g. "I don't care where, I just want mountains under ₹15k" (flexible dest + interest + budget) -> true
    const hasSufficientQualification = Boolean(
      (pref.destination && pref.budgetPerPerson) ||
      (pref.destination && (pref.durationDays || pref.tripStyle)) ||
      (pref.budgetPerPerson && (pref.destination || pref.tripStyle || pref.travelers || pref.durationDays || pref.interests.length > 0 || pref.destinationFlexibility === 'yes'))
    );

    const questions: string[] = [];
    if (!pref.destination && pref.destinationFlexibility !== 'yes') {
      questions.push('Do you have a preferred destination in mind, or are you open to exploring domestic and international journeys?');
    }
    if (!pref.budgetPerPerson) {
      questions.push('What is your approximate budget per person for this journey?');
    }
    if (!pref.travelers && !pref.durationDays) {
      questions.push('How many travelers will be joining and for how many days?');
    } else if (!pref.travelers) {
      questions.push('How many travelers will be journeying with you?');
    } else if (!pref.durationDays) {
      questions.push('How many days are you planning for this journey?');
    }

    memory.conversation.missingFields = missing;

    return {
      isQualified: hasSufficientQualification,
      missingFields: missing,
      promptQuestions: questions
    };
  }
};

// Tool 4: handle_price_objection
export interface PriceObjectionResult {
  acknowledged: boolean;
  budgetCleared: boolean;
  promptQuestion: string;
}

export const handlePriceObjectionTool: AgentTool<void, PriceObjectionResult> = {
  name: 'handle_price_objection',
  description: 'Acknowledge price/cost objections, clear prior budget, and prompt for target comfortable budget.',
  execute: async (_, memory) => {
    memory.customer.preferences.budgetPerPerson = null;
    memory.conversation.isPriceObjectionActive = true;
    memory.conversation.lastObjection = 'PRICE_TOO_HIGH';

    return {
      acknowledged: true,
      budgetCleared: true,
      promptQuestion: 'What budget per person would you be comfortable with for this journey?'
    };
  }
};

// Tool 5: prepare_booking_token
export interface PrepareBookingTokenInput {
  packageId?: string | null;
  packageTitle?: string | null;
}

export interface PrepareBookingTokenResult {
  tokenAmount: number;
  currency: string;
  isRefundable: boolean;
  packageId?: string | null;
  policyEnforced: boolean;
}

export const prepareBookingTokenTool: AgentTool<PrepareBookingTokenInput, PrepareBookingTokenResult> = {
  name: 'prepare_booking_token',
  description: 'Deterministic enforcement of standard booking reservation token policy (₹2,000 refundable).',
  execute: async (input, memory) => {
    const amount = memory.business.tokenAmount || 2000;
    if (input.packageId) {
      memory.business.selectedPackageId = input.packageId;
    }
    if (input.packageTitle) {
      memory.business.selectedPackageTitle = input.packageTitle;
    }
    memory.business.leadStatus = 'TOKEN_PENDING';

    return {
      tokenAmount: amount,
      currency: 'INR',
      isRefundable: true,
      packageId: input.packageId,
      policyEnforced: true
    };
  }
};

// Tool 6: escalate_to_desk
export interface EscalateToDeskInput {
  reason: string;
  handoffReason?: HandoffReason;
  destination?: string | null;
  customerNotes?: string;
  dossierData?: {
    customerName: string | null;
    customerPhone: string | null;
    customerEmail: string | null;
    destination: string | null;
    budgetPerPerson: number | null;
    travelers: number | null;
    interests: string[];
    durationDays: number | null;
    packagesShown: string[];
    customerObjections: string[];
    chatTranscript: { role: string; content: string }[];
  };
}

export interface EscalateToDeskResult {
  escalated: boolean;
  isExistingHandoff: boolean;
  handoffId: string;
  department: string;
  referenceNotes: string;
  dossier: HandoffDossier;
}

export const escalateToDeskTool: AgentTool<EscalateToDeskInput, EscalateToDeskResult> = {
  name: 'escalate_to_desk',
  description: 'Escalate to human travel specialist. Idempotent — one active handoff per conversation.',
  execute: async (input, memory) => {
    const specialistPhone = process.env.TRAVEL_SPECIALIST_PHONE || '';

    // Idempotency guard: return existing handoff if already created
    if (memory.business.activeHandoffId) {
      const existingDossier: HandoffDossier = {
        handoffId: memory.business.activeHandoffId,
        reason: (input.handoffReason || 'unsupported_request') as HandoffReason,
        priority: 'MEDIUM',
        customerName: input.dossierData?.customerName ?? null,
        customerPhone: input.dossierData?.customerPhone ?? null,
        customerEmail: input.dossierData?.customerEmail ?? null,
        destination: input.dossierData?.destination ?? null,
        budgetPerPerson: input.dossierData?.budgetPerPerson ?? null,
        travelers: input.dossierData?.travelers ?? null,
        interests: input.dossierData?.interests ?? [],
        durationDays: input.dossierData?.durationDays ?? null,
        escalationReason: input.reason,
        packagesShown: input.dossierData?.packagesShown ?? [],
        customerObjections: input.dossierData?.customerObjections ?? [],
        chatTranscript: input.dossierData?.chatTranscript ?? [],
        specialistPhone,
        createdAt: new Date().toISOString(),
      };
      return {
        escalated: true,
        isExistingHandoff: true,
        handoffId: memory.business.activeHandoffId,
        department: 'Senior Travel Concierge & Bespoke Charters Desk',
        referenceNotes: `Existing handoff: ${memory.business.activeHandoffId}`,
        dossier: existingDossier,
      };
    }

    const handoffId = `HANDOFF-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Determine priority
    const reason = input.handoffReason || 'unsupported_request';
    const priority: 'HIGH' | 'MEDIUM' | 'LOW' =
      reason === 'customer_requested' || reason === 'payment_issue' || reason === 'refund'
        ? 'HIGH'
        : reason === 'repeated_failed_resolution' || reason === 'custom_itinerary'
        ? 'MEDIUM'
        : 'LOW';

    const dossier: HandoffDossier = {
      handoffId,
      reason,
      priority,
      customerName: input.dossierData?.customerName ?? null,
      customerPhone: input.dossierData?.customerPhone ?? null,
      customerEmail: input.dossierData?.customerEmail ?? null,
      destination: input.dossierData?.destination ?? null,
      budgetPerPerson: input.dossierData?.budgetPerPerson ?? null,
      travelers: input.dossierData?.travelers ?? null,
      interests: input.dossierData?.interests ?? [],
      durationDays: input.dossierData?.durationDays ?? null,
      escalationReason: input.reason,
      packagesShown: input.dossierData?.packagesShown ?? [],
      customerObjections: input.dossierData?.customerObjections ?? [],
      chatTranscript: input.dossierData?.chatTranscript ?? [],
      specialistPhone,
      createdAt: new Date().toISOString(),
    };

    // Mutate memory
    memory.business.leadStatus = 'HUMAN_HANDOFF';
    memory.business.activeHandoffId = handoffId;

    return {
      escalated: true,
      isExistingHandoff: false,
      handoffId,
      department: 'Senior Travel Concierge & Bespoke Charters Desk',
      referenceNotes: `Handoff #${handoffId} | Reason: ${input.reason} | Dest: ${input.destination || 'Unspecified'}`,
      dossier,
    };
  }
};

export const STANDARD_AGENT_TOOLS: AgentTool<never, unknown>[] = [
  searchPackagesTool,
  getPackageDetailsTool,
  qualifyLeadTool,
  handlePriceObjectionTool,
  prepareBookingTokenTool,
  escalateToDeskTool
] as unknown as AgentTool<never, unknown>[];
